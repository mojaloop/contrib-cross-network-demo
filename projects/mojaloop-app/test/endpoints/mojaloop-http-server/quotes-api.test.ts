import 'mocha'
import { v4 as uuid } from 'uuid'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as hapi from 'hapi'
import { MojaloopHttpEndpointManager } from '../../../src/endpoints/mojaloop/mojaloop-http-server'
import { MojaloopHttpEndpoint } from '../../../src/endpoints/mojaloop/mojaloop-http'
import { MojaloopHttpRequest, isQuotePostMessage, isQuotePutMessage } from '../../../src/types/mojaloop-packets'
import { AxiosResponse } from 'axios'
import { QuotesPostRequest, QuotesIDPutResponse } from '../../../src/types/mojaloop-models/models';

Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Mojaloop Http Endpoint Manager Quote API', function () {
  let endpointManager: MojaloopHttpEndpointManager
  let httpServer: hapi.Server

  const headers = {
    'fspiop-source': 'alice',
    'date': new Date(Date.now()).toUTCString(),
    'content-type': 'application/vnd.interoperability.quotes+json;version=1.0'
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
    quoteId: uuid(),
    transactionId: uuid(),
    transactionType: {
      initiator: 'Payee',
      initiatorType: 'test',
      scenario: 'refund'
    }
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

  beforeEach(function () {
    httpServer = new hapi.Server({
      host: '0.0.0.0',
      port: 7780
    })
    httpServer.start()
    endpointManager = new MojaloopHttpEndpointManager(httpServer)
  })

  afterEach(function () {
    httpServer.stop()
  })

  describe('post quote', function () {
    it('returns a 202 on successful post', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse })
      endpointManager.set('alice', endpoint)
  
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/quotes',
        payload: postQuoteMessage,
        headers
      })

      assert.equal(res.statusCode, 202)
    })

    it('gives the endpoint a MojaloopHttpRequest with a body of type QuotesPostRequest', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice', endpoint)
  
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/quotes',
        payload: postQuoteMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      assert.isTrue(isQuotePostMessage(endpointHttpRequest!.body))
    })

    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/quotes',
        payload: postQuoteMessage,
        headers
      })

      assert.equal(res.statusCode, 500)
    })
  })

  describe('put quote', function () {
    it('returns a 202 on successful put', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse })
      endpointManager.set('alice', endpoint)
      const quoteId = uuid()
  
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/quotes/${quoteId}`,
        payload: quotePutMessage,
        headers
      })

      assert.equal(res.statusCode, 202)
    })

    it('gives the endpoint a MojaloopHttpRequest with a body of type QuotesIdPutRequest', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice', endpoint)
      const quoteId = uuid()
  
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/quotes/${quoteId}`,
        payload: quotePutMessage,
        headers
      })

      assert.equal(res.statusCode, 202)
      assert.isTrue(isQuotePutMessage(endpointHttpRequest!.body))
      assert.equal(endpointHttpRequest!.objectId, quoteId)
    })

    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/quotes/${uuid()}`,
        payload: quotePutMessage,
        headers
      })

      assert.equal(res.statusCode, 500)
    })
  })
})