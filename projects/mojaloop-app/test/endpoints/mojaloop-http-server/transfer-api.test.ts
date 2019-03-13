import 'mocha'
import { v4 as uuid } from 'uuid'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MojaloopHttpEndpointManager } from '../../../src/endpoints/mojaloop/mojaloop-http-server'
import * as hapi from 'hapi'
import { MojaloopHttpEndpoint } from '../../../src/endpoints/mojaloop/mojaloop-http';
import { TransfersPostRequest, TransfersIDPutResponse } from '../../../src/types/mojaloop-models/models';
import { MojaloopHttpRequest, isTransferPostMessage, isTransferPutMessage } from '../../../src/types/mojaloop-packets';
import { AxiosResponse } from 'axios';

Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Mojaloop Http Endpoint Manager Transfer API', function () {
  
  let endpointManager: MojaloopHttpEndpointManager
  let httpServer: hapi.Server
  const postMessage: TransfersPostRequest = {
    transferId: uuid(),
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

  describe('post transfer', function () {
    it('returns a 202 from a transfer post request', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse })
      endpointManager.set('alice', endpoint)
  
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
      endpointManager.set('alice', endpoint)
  
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
  })

  describe('put transfer', async function () {
    it('returns a 202', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { return {} as AxiosResponse })
      endpointManager.set('alice', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + uuid(),
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
    })

    it('returns 500 if there is no endpoint for the participant', async function () {
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + uuid(),
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 500)
    })

    it('gives the endpoint a MojaloopHttpRequest with a body of type TransfersIDPutResponse', async function () {
      let endpointHttpRequest: MojaloopHttpRequest
      const id = uuid()
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:7781/alice' })
      endpoint.setIncomingRequestHandler(async (request: MojaloopHttpRequest) => { 
        endpointHttpRequest = request
        return {} as AxiosResponse
       })
      endpointManager.set('alice', endpoint)
  
      const res = await httpServer.inject({
        method: 'put',
        url: '/alice/transfers/' + id,
        payload: putMessage,
        headers
      })
  
      assert.equal(res.statusCode, 202)
      assert.isTrue(isTransferPutMessage(endpointHttpRequest!.body))
      assert.equal(endpointHttpRequest!.objectId, id)
    })
  })
})