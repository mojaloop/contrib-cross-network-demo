import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { App } from '../../src/app'
import {v4 as uuid} from 'uuid'
import { PeerInfo } from '../../src/types/peer'
import { MojaloopHttpEndpoint } from '../../src/endpoints/mojaloop/mojaloop-http'
import { MojaloopHttpRequest, MojaloopHttpReply } from '../../src/types/mojaloop-packets'
import { QuotesPostRequest, QuotesIDPutResponse, ErrorInformationObject } from '../../src/types/mojaloop-models/models'
Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

function getQuoteHeaders (source: string, destination?: string) {
  let headers = {
    'fspiop-source': source,
    'date': new Date(Date.now()).toUTCString(),
    'content-type': `application/vnd.interoperability.quotes+json;version=1.0`
  }
  if (destination) headers['fspiop-destination'] = destination
  return headers
}

function getQuotePostMessage (amount: string, currency: string, amountType: string, quoteId: string, payeeMojaAddress: string, payerMojaAddress: string, transactionId: string = uuid(), transferCurrency: string = currency): QuotesPostRequest {
  return {
    amount: {
      amount,
      currency
    },
    transferCurrency,
    amountType,
    payee: {
      partyIdInfo: {
        partyIdType: '1',
        partyIdentifier: '1',
        partySubIdOrType: payeeMojaAddress
      }
    },
    payer: {
      partyIdInfo: {
        partyIdType: '1',
        partyIdentifier: '1',
        partySubIdOrType: payerMojaAddress
      }
    },
    quoteId,
    transactionId,
    transactionType: {
      initiator: 'Payee',
      initiatorType: 'test',
      scenario: 'refund'
    }
  }
}

function getQuotePutMessage (amount: string, currency: string, condition: string, expiration: string, ilpPacket: string): QuotesIDPutResponse {
  return {
    transferAmount: {
      amount,
      currency 
    },
    condition,
    expiration,
    ilpPacket
  }
}

/* 
  Alice (USD) at BLUE-DFSP sends a fixed SEND quote request to Bob (XOF) at RED-DFSP
  The section the tests are concerned with is depicted below
                  incoming                outgoing
    -------------        -------------           -------------
    |Mowali Hub | ==>    |    FXP    |    ==>    |Mowali Hub |
    -------------        |usd <=> xof|           -------------
                         -------------
*/

let fxp: App
  let usdEndpointStub: sinon.SinonStub
  let xofEndpointStub: sinon.SinonStub
  const xofEndpoint = new MojaloopHttpEndpoint({ url: 'http://mowali' })
  const usdEndpoint = new MojaloopHttpEndpoint({ url: 'http://mowali' })
  const quoteId = uuid()
  const mowaliUsdPeerInfo: PeerInfo = {
    id: 'mowali-usd',
    url: 'http://mowali',
    assetCode: 'USD',
    assetScale: 2,
    mojaAddress: 'moja.mowali.usd',
    relation: 'peer',
    rules: [
      { name: 'foreign-exchange' }
    ]
  }

  const mowaliXofPeerInfo: PeerInfo = {
    id: 'mowali-xof',
    url: 'http://mowali',
    assetCode: 'XOF',
    assetScale: 2,
    mojaAddress: 'moja.mowali.xof',
    relation: 'peer',
    rules: [
      { name: 'foreign-exchange' }
    ]
  }

describe('FXP receives fixed SEND quote post flowing from Alice to  Bob (USD to XOF)', async function () {  

  beforeEach(function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('only changes the fspiop-source header to fxp of the outgoing post quote', async function () {
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('100', 'USD', 'SEND', quoteId, 'moja.mowali.xof.bob', 'moja.mowali.usd.alice')
    }

    await usdEndpoint.handleIncomingRequest(postQuoteRequest)

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostHeaders = xofEndpointStub.getCall(0).args[0].headers
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
    assert.isUndefined(outgoingPostHeaders['fspiop-destination'])
  })

  it('changes the amount from USD to XOF', async function () {
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('100', 'USD', 'SEND', quoteId, 'moja.mowali.xof.bob', 'moja.mowali.usd.alice')
    }
    assert.deepEqual((postQuoteRequest.body as QuotesPostRequest).amount, {
      amount: '100',
      currency: 'USD'
    })

    await usdEndpoint.handleIncomingRequest(postQuoteRequest)

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body
    assert.deepEqual(outgoingPostBody.amount, {
      amount: '57959',
      currency: 'XOF'
    })
  })

  it('changes the transfer currency to XOF for outgoing quote post', async function () {
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('100', 'USD', 'SEND', quoteId, 'moja.mowali.xof.bob', 'moja.mowali.usd.alice')
    }
    assert.deepEqual((postQuoteRequest.body as QuotesPostRequest).transferCurrency, 'USD')

    await usdEndpoint.handleIncomingRequest(postQuoteRequest)

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body
    assert.deepEqual(outgoingPostBody.transferCurrency, 'XOF')
  })
})

describe('FXP receives fixed SEND quote post flowing from Bob to Alice (XOF to USD)', async function () {  

  beforeEach(function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('only changes the fspiop-source header to fxp of the outgoing post quote', async function () {
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('57959', 'XOF', 'SEND', quoteId, 'moja.mowali.usd.alice', 'moja.mowali.xof.bob')
    }

    await xofEndpoint.handleIncomingRequest(postQuoteRequest)

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostHeaders = usdEndpointStub.getCall(0).args[0].headers
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
    assert.isUndefined(outgoingPostHeaders['fspiop-destination'])
  })

  it('changes the amount from USD to XOF', async function () {
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('57959', 'XOF', 'SEND', quoteId, 'moja.mowali.usd.alice', 'moja.mowali.xof.bob')
    }
    assert.deepEqual((postQuoteRequest.body as QuotesPostRequest).amount, {
      amount: '57959',
      currency: 'XOF'
    })

    await xofEndpoint.handleIncomingRequest(postQuoteRequest)

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostBody = usdEndpointStub.getCall(0).args[0].body
    assert.deepEqual(outgoingPostBody.amount, {
      amount: '100',
      currency: 'USD'
    })
  })

  it('changes the transfer currency to USD for outgoing quote post', async function () {
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('57959', 'XOF', 'SEND', quoteId, 'moja.mowali.usd.alice', 'moja.mowali.xof.bob')
    }
    assert.deepEqual((postQuoteRequest.body as QuotesPostRequest).transferCurrency, 'XOF')

    await xofEndpoint.handleIncomingRequest(postQuoteRequest)

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostBody = usdEndpointStub.getCall(0).args[0].body
    assert.deepEqual(outgoingPostBody.transferCurrency, 'USD')
  })
})

describe('FXP receives fixed SEND quote put flowing from Bob (XOF) to Alice (USD)', async function () {
  beforeEach(async function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)

    // set up the required quote post flowing from Alice (USD) to Bob (XOF)
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getQuoteHeaders('blue-dfsp'),
      body: getQuotePostMessage('100', 'USD', 'SEND', quoteId, 'moja.mowali.xof.bob', 'moja.mowali.usd.alice')
    }
    await usdEndpoint.handleIncomingRequest(postQuoteRequest)
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('sets the fspiop-source to fxp and the destination to the fspiop-source of the stored quote', async function () {
    assert.equal(fxp.getStoredQuoteById(quoteId).headers['fspiop-source'], 'blue-dfsp')
    const putQuoteRequest: MojaloopHttpRequest = {
      objectId: quoteId,
      headers: getQuoteHeaders('red-dfsp', 'fxp'),
      body: getQuotePutMessage('57959', 'XOF', 'test-condition', 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet')
    }

    await xofEndpoint.handleIncomingRequest(putQuoteRequest)

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPutHeaders = usdEndpointStub.getCall(0).args[0].headers
    assert.equal(outgoingPutHeaders['fspiop-source'], 'fxp')
    assert.equal(outgoingPutHeaders['fspiop-destination'], 'blue-dfsp')
  })

  it('sets the transferDestination to fxp in the put quote response', async function () {
    assert.equal(fxp.getStoredQuoteById(quoteId).headers['fspiop-source'], 'blue-dfsp')
    const putQuoteRequest: MojaloopHttpRequest = {
      objectId: quoteId,
      headers: getQuoteHeaders('red-dfsp', 'fxp'),
      body: getQuotePutMessage('57959', 'XOF', 'test-condition', 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet')
    }

    await xofEndpoint.handleIncomingRequest(putQuoteRequest)

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPutBody = usdEndpointStub.getCall(0).args[0].body
    assert.equal(outgoingPutBody['transferDestination'], 'fxp')
  })
})