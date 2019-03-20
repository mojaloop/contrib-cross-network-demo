import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import {v4 as uuid} from 'uuid'
import chaiAsPromised from 'chai-as-promised'
import { TransfersPostRequest, QuotesPostRequest, QuotesIDPutResponse, TransfersIDPutResponse, ErrorInformationObject } from '../../src/types/mojaloop-models/models'
import { RequestMapEntry, TrackRequestsRule } from '../../src/rules/track-requests-rule'
import { MojaloopRequestHandler, setPipelineReader } from '../../src/types/rule'
import { MojaloopHttpRequest, MojaloopHttpReply } from '../../src/types/mojaloop-packets'
import { ForeignExchangeRule } from '../../src/rules/fx-rule';
Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('FX Rule', function () {

  let fxRule: ForeignExchangeRule
  let incomingHandler: MojaloopRequestHandler
  let outgoingHandler: MojaloopRequestHandler

  const transferId = uuid()
  const quoteId = uuid()
  function getHeaders(resource: string) {
    return {
      'fspiop-source': 'moja.alice',
      'date': new Date(Date.now()).toUTCString(),
      'content-type': `application/vnd.interoperability.${resource}+json;version=1.0`
    }
  }
  function getPostQuoteMessage(amountType: string, currency: string): QuotesPostRequest {
    return {
      amount: {
        amount: '100',
        currency
      },
      amountType,
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
  }
  function getPostQuoteRequest(amountType: string, currency: string): MojaloopHttpRequest {
    return {
      headers: getHeaders('quotes'),
      body: getPostQuoteMessage(amountType, currency)  
    }
  }

  function getQuotePutMessage(currency: string): QuotesIDPutResponse {
    return {
      condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      expiration: '2016-05-24T08:38:08.699-04:00',
      ilpPacket: 'testpacket',
      transferAmount: {
        amount: '100',
        currency
      }  
    }
  }

  function getPutQuoteRequest(currency: string): MojaloopHttpRequest {
    return {
      objectId: quoteId,
      headers: getHeaders('quotes'),
      body: getQuotePutMessage(currency)  
    }
  }

  function getPostTransferMessage(currency: string): TransfersPostRequest {
    return {
      transferId,
      payeeFsp: 'bobs-fsp',
      payerFsp: 'alices-fsp',
      amount: {
        amount: '100',
        currency
      },
      condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      expiration: '2016-05-24T08:38:08.699-04:00',
      ilpPacket: 'testpacket'  
    }
  }
  
  function getPostTransferRequest(currency: string): MojaloopHttpRequest {
    return {
      headers: getHeaders('transfers'),
      body: getPostTransferMessage(currency)  
    }
  }

  describe('Alice (USD) sending to Bob (XOF)', async function() {

    beforeEach(function () {
      fxRule = new ForeignExchangeRule({ convertAmount: (incoming) => {

        if(incoming.currency === 'USD') {
          return {
            currency: 'XOF',
            amount: (Number(incoming.amount) * 10).toString()
          }  
        } else {
          return {
            currency: 'USD',
            amount: (Number(incoming.amount) / 10).toString()
          }  
        }
      }})
    })

    it('quote amount is converted for fixed SEND on incoming from Alice', async function () {

      incomingHandler = setPipelineReader('incoming', fxRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { 
        assert.deepEqual((request.body as QuotesPostRequest).amount, {
          currency: 'XOF',
          amount: '1000'
        })      
        return {} as MojaloopHttpReply 
      })
      await incomingHandler(getPostQuoteRequest('SEND', 'USD'))

    })
  
    it('quote amount is not converted for fixed RECEIVE on incoming from Alice', async function () {

      incomingHandler = setPipelineReader('incoming', fxRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { 
        assert.deepEqual((request.body as QuotesPostRequest).amount, {
          currency: 'XOF',
          amount: '100'
        })      
        return {} as MojaloopHttpReply 
      })
      await incomingHandler(getPostQuoteRequest('RECEIVE', 'XOF'))

    })
  
    it('quote response amount is converted to USD for fixed SEND on outgoing to Alice', async function () {

      outgoingHandler = setPipelineReader('outgoing', fxRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { 
        assert.deepEqual((request.body as QuotesIDPutResponse).transferAmount, {
          currency: 'USD',
          amount: '10'
        })      
        return {} as MojaloopHttpReply 
      })
      await outgoingHandler(getPutQuoteRequest('XOF'))

    })
  
    it('quote response amount is converted to USD for fixed RECEIVE on outgoing to Alice', async function () {

      outgoingHandler = setPipelineReader('outgoing', fxRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { 
        assert.deepEqual((request.body as QuotesIDPutResponse).transferAmount, {
          currency: 'USD',
          amount: '10'
        })      
        return {} as MojaloopHttpReply 
      })
      await outgoingHandler(getPutQuoteRequest('XOF'))

    })
  
    it('transfer amount is converted on incoming from Alice', async function () {

      incomingHandler = setPipelineReader('incoming', fxRule, async (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => { 
        assert.deepEqual((request.body as TransfersPostRequest).amount, {
          currency: 'XOF',
          amount: '1000'
        })      
        return {} as MojaloopHttpReply 
      })
      await incomingHandler(getPostTransferRequest('USD'))

    })

  })
})
