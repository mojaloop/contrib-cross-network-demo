import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import {v4 as uuid} from 'uuid'
import chaiAsPromised from 'chai-as-promised'
import { TransfersPostRequest, QuotesPostRequest, QuotesIDPutResponse, TransfersIDPutResponse, ErrorInformationObject } from '../../src/types/mojaloop-models/models'
import { RequestMapEntry, TrackRequestsRule } from '../../src/rules/track-requests-rule'
import { MojaloopRequestHandler, setPipelineReader } from '../../src/types/rule'
import { MojaloopHttpRequest, MojaloopHttpReply } from '../../src/types/mojaloop-packets'
Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Store post request entry', function () {

  let trackRequestRule: TrackRequestsRule
  let transferRequestEntryMap: Map<string, RequestMapEntry>
  let transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  let quoteRequestEntryMap: Map<string, RequestMapEntry>
  let quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
  let incomingHandler: MojaloopRequestHandler
  let outgoingHandler: MojaloopRequestHandler

  const transferId = uuid()
  const quoteId = uuid()
  const headers = {
    'fspiop-source': 'moja.alice',
    'date': new Date(Date.now()).toUTCString(),
    'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
  }
  const postTransferMessage: TransfersPostRequest = {
    transferId,
    payeeFsp: 'bob',
    payerFsp: 'alice',
    amount: {
      amount: '100',
      currency: 'USD'
    },
    condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
    expiration: '2016-05-24T08:38:08.699-04:00',
    ilpPacket: 'testpacket'
  }
  const postTransferRequest: MojaloopHttpRequest = {
    headers,
    body: postTransferMessage
  }

  const postQuoteMessage: QuotesPostRequest = {
    amount: {
      amount: '100',
      currency: 'USD'
    },
    amountType: 'SEND',
    payee: {
      partyIdInfo: {
        partyIdType: '1',
        partyIdentifier: '1'
      }
    },
    payer: {
      partyIdInfo: {
        partyIdType: '1',
        partyIdentifier: '1'
      }
    },
    quoteId: quoteId,
    transactionId: uuid(),
    transactionType: {
      initiator: 'Payee',
      initiatorType: 'test',
      scenario: 'refund'
    }
  }
  const postQuoteRequest: MojaloopHttpRequest = {
    headers,
    body: postQuoteMessage
  }

  const quotePutMessage: QuotesIDPutResponse = {
    condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
    expiration: '2016-05-24T08:38:08.699-04:00',
    ilpPacket: 'testpacket',
    transferAmount: {
      amount: '100',
      currency: 'USD'
    }
  }

  const putQuoteRequest: MojaloopHttpRequest = {
    objectId: quoteId,
    headers,
    body: quotePutMessage
  }

  const putTransferMessage: TransfersIDPutResponse = {
    transferState: 'COMMITTED'
  }

  const putTransferRequest: MojaloopHttpRequest = {
    objectId: transferId,
    headers,
    body: putTransferMessage
  }

  const errorMessage: ErrorInformationObject = {
    errorInformation: {
      errorCode: 'test',
      errorDescription: 'test'
    }
  }

  const putTransferErrorRequest: MojaloopHttpRequest = {
    objectId: transferId,
    objectType: 'transfer',
    headers,
    body: errorMessage
  }

  const putQuoteErrorRequest: MojaloopHttpRequest = {
    objectId: quoteId,
    objectType: 'quote',
    headers,
    body: errorMessage
  }

  beforeEach(function () {
    transferRequestEntryMap = new Map()
    transferErrorRequestEntryMap = new Map()
    quoteRequestEntryMap = new Map()
    quoteErrorRequestEntryMap = new Map()
    trackRequestRule = new TrackRequestsRule({ transferRequestEntryMap,  transferErrorRequestEntryMap, quoteRequestEntryMap, quoteErrorRequestEntryMap })
    incomingHandler = setPipelineReader('incoming', trackRequestRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { return {} as MojaloopHttpReply })
    outgoingHandler = setPipelineReader('outgoing', trackRequestRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { return {} as MojaloopHttpReply })
  })

  it('creates a RequestEntry from an incoming transfer post request', async function () {
    assert.isUndefined(transferRequestEntryMap.get(transferId))

    await incomingHandler(postTransferRequest)

    assert.deepEqual(transferRequestEntryMap.get(transferId), {
      headers,
      sentPut: false
    })    
  })

  it('creates a RequestEntry from an incoming quote post request', async function () {
    assert.isUndefined(quoteRequestEntryMap.get(quoteId))

    await incomingHandler(postQuoteRequest)

    assert.deepEqual(quoteRequestEntryMap.get(quoteId), {
      headers,
      sentPut: false
    })    
  })

  it('creates a RequestEntry from an incoming quote error put request', async function () {
    assert.isUndefined(quoteErrorRequestEntryMap.get(quoteId))

    await incomingHandler(putQuoteErrorRequest)

    assert.deepEqual(quoteErrorRequestEntryMap.get(quoteId), {
      headers,
      sentPut: false
    })    
  })

  it('creates a RequestEntry from an incoming transfer error put request', async function () {
    assert.isUndefined(transferErrorRequestEntryMap.get(transferId))

    await incomingHandler(putTransferErrorRequest)

    assert.deepEqual(transferErrorRequestEntryMap.get(transferId), {
      headers,
      sentPut: false
    })    
  })

  it('updates request entry for outgoing transfer put request', async function () {
    transferRequestEntryMap.set(transferId, {
      headers,
      sentPut: false
    })

    await outgoingHandler(putTransferRequest)

    assert.deepEqual(transferRequestEntryMap.get(transferId), {
      headers,
      sentPut: true
    })
  })

  it('updates request entry for outgoing quote put request', async function () {
    quoteRequestEntryMap.set(quoteId, {
      headers,
      sentPut: false
    })

    await outgoingHandler(putQuoteRequest)

    assert.deepEqual(quoteRequestEntryMap.get(quoteId), {
      headers,
      sentPut: true
    })
  })

  it('updates request entry for outgoing transfer put error  request', async function () {
    transferErrorRequestEntryMap.set(transferId, {
      headers,
      sentPut: false
    })

    await outgoingHandler(putTransferErrorRequest)

    assert.deepEqual(transferErrorRequestEntryMap.get(transferId), {
      headers,
      sentPut: true
    })
  })

  it('updates request entry for outgoing quote put error  request', async function () {
    quoteErrorRequestEntryMap.set(quoteId, {
      headers,
      sentPut: false
    })

    await outgoingHandler(putQuoteErrorRequest)

    assert.deepEqual(quoteErrorRequestEntryMap.get(quoteId), {
      headers,
      sentPut: true
    })
  })
})