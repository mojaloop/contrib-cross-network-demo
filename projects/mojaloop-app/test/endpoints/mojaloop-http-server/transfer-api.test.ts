import 'mocha'
import { v4 as uuid } from 'uuid'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MojaloopHttpEndpointManager } from '../../../src/endpoints/mojaloop/mojaloop-http-server'
import * as hapi from 'hapi'
import { MojaloopHttpEndpoint } from '../../../src/endpoints/mojaloop/mojaloop-http';
import { TransfersPostRequest, TransfersIDPutResponse, ErrorInformationObject } from '../../../src/types/mojaloop-models/models'
import { MojaloopHttpRequest, isTransferPostMessage, isTransferPutMessage, isTransferGetRequest, isTransferPutErrorRequest } from '../../../src/types/mojaloop-packets';
import { AxiosResponse } from 'axios';
import { RequestMapEntry } from '../../../src/rules/track-requests-rule';

Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Mojaloop Http Endpoint Manager Transfer API', function () {
  
  let endpointManager: MojaloopHttpEndpointManager
  let httpServer: hapi.Server
  const postMessage: TransfersPostRequest = {
    transferId: uuid(),
    quoteId: uuid(),
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
  const headers = {
    'fspiop-source': 'alice',
    'date': new Date(Date.now()).toUTCString(),
    'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
  }

  const putMessage: TransfersIDPutResponse = {
    transferState: 'COMMITTED'
  }

  const errorMessage: ErrorInformationObject = {
    errorInformation: {
      errorCode: 'test',
      errorDescription: 'test'
    }
  }

  const getStoredTransferById = (id: string): RequestMapEntry | undefined => {
    return {
      headers,
      body: postMessage,
      sourcePeerId: 'test-peer',
      sentPut: false
    }
  }

  const getStoredQuoteById = (id: string) => {
    return {
      headers: {},
      body: {},
      sourcePeerId: 'test-peer',
      sentPut: false
    }
  }

  beforeEach(function () {
    httpServer = new hapi.Server({
      host: '0.0.0.0',
      port: 7780
    })
    httpServer.start()
    endpointManager = new MojaloopHttpEndpointManager(httpServer, { getStoredTransferById, getStoredQuoteById })
  })

  afterEach(function () {
    httpServer.stop()
  })

  describe('post transfer', function () {
    it('returns a 202 from a transfer post request', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse })
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/transfers',
        payload: postMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
    })
  
    it('gives the endpoint a MojaloopHttpRequest with a body of type TransfersPostRequest', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/transfers',
        payload: postMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      assert.isTrue(isTransferPostMessage(endpointHttpRequest!.body))
    })
  
    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/transfers',
        payload: postMessage,
        headers
      })
  
      assert.equal(res.statusCode, 500)
    })

    it('uses the currency in the amount field to choose the usd account for alice', async function () {
      const getSpy = sinon.spy(endpointManager, 'get')
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => {
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
      endpointManager.set('alice-xof', endpoint)
  
      const res = await httpServer.inject({
        method: 'post',
        url: '/alice/transfers',
        payload: postMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      sinon.assert.calledWith(getSpy, 'alice-usd')
    })
  })

  describe('put transfer', async function () {
    it('returns a 202', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse })
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
    })

    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 500)
    })

    it('gives the endpoint a MojaloopHttpRequest with a body of type TransfersIDPutResponse', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      assert.isTrue(isTransferPutMessage(endpointHttpRequest!.body))
      assert.equal(endpointHttpRequest!.objectId, postMessage.transferId)
    })

    it('uses the currency in the amount field of the stored transfer to choose the usd account for alice', async function () {
      const getSpy = sinon.spy(endpointManager, 'get')
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => {
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
      endpointManager.set('alice-xof', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      sinon.assert.calledWith(getSpy, 'alice-usd')
    })
  })

  describe('get transfers', function () {
    it('returns 202 on successful get', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse})
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'get',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: {},
        headers
      })
  
      assert.equal(res.statusCode, 202)
    })

    it('gives the endpoint a MojaloopHttpRequest of type TransferGetRequest', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'get',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: {},
        headers
      })
  
      assert.equal(res.statusCode, 202)
      assert.isTrue(isTransferGetRequest(endpointHttpRequest!))
    })

    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'get',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: {},
        headers
      })
  
      assert.equal(res.statusCode, 500)
    })

    it('uses the currency in the amount field of the stored transfer to choose the usd account for alice', async function () {
      const getSpy = sinon.spy(endpointManager, 'get')
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => {
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
      endpointManager.set('alice-xof', endpoint)
  
      const res = await httpServer.inject({
        method: 'get',
        url: '/alice/transfers/' + postMessage.transferId,
        payload: {},
        headers
      })
  
      assert.equal(res.statusCode, 202)
      sinon.assert.calledWith(getSpy, 'alice-usd')
    })
  })

  describe('put transfer error', function () {
    it('returns 202 on successful put', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse})
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/transfers/${postMessage.transferId}/error`,
        payload: errorMessage,
        headers
      })

      assert.equal(res.statusCode, 202)
    })

    it('gives the endpoint a TransferPutErrorRequest', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/transfers/${postMessage.transferId}/error`,
        payload: errorMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      assert.isTrue(isTransferPutErrorRequest(endpointHttpRequest!))
      assert.deepEqual(endpointHttpRequest!.body, errorMessage)
      assert.deepEqual(endpointHttpRequest!.objectId, postMessage.transferId)
      assert.deepEqual(endpointHttpRequest!.objectType, 'transfer')
    })

    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/transfers/${postMessage.transferId}/error`,
        payload: errorMessage,
        headers
      })
  
      assert.equal(res.statusCode, 500)
    })

    it('uses the currency in the amount field of the stored transfer to choose the usd account for alice', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      const getSpy = sinon.spy(endpointManager, 'get')
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        return {} as AxiosResponse
       })
      endpointManager.set('alice-usd', endpoint)
      endpointManager.set('alice-xof', endpoint)
      const id = uuid()
  
      const res = await httpServer.inject({
        method: 'put',
        url: `/alice/transfers/${postMessage.transferId}/error`,
        payload: errorMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      sinon.assert.calledWith(getSpy, 'alice-usd')
    })
  })
})