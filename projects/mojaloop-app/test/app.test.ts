import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { App } from '../src/app'
import axios, { AxiosResponse } from 'axios'
import {v4 as uuid} from 'uuid'
import { PeerInfo } from '../src/types/peer';
import { MojaloopHttpEndpoint } from '../src/endpoints/mojaloop/mojaloop-http';
import { MojaloopHttpRequest } from '../src/types/mojaloop-packets';
Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Mojaloop CNP App', function () {

  let app: App
  const peerInfo: PeerInfo = {
    id: 'alice',
    relation: 'peer',
    mojaAddress: 'moja.alice',
    url: 'http://localhost:1081',
    assetCode: 'USD',
    assetScale: 2,
    rules: []
  }

  beforeEach(function () {
    app = new App({port: 1080})
  })

  afterEach(function () {
    app.shutdown()
  })

  describe('start', function () {
    it('starts the hapi http server', async function () {
      await app.start()

      const response = await axios.get('http://0.0.0.0:1080/health')

      assert.equal(response.data, 'status: ok')
    })
  })

  describe('shutdown', function () {
    it('stops the hapi server', async function () {
      await app.start()
      await app.shutdown()

      try{
        const response = await axios.get('http://0.0.0.0:1080/health')
      } catch (e) {
        return
      }

      assert.fail('Did not throw expected error')
    })
  })

  describe('addPeer', function () {
    it('creates and stores the mojaloop endpoint for the peer', async function () {
      await app.addPeer(peerInfo)

      assert.instanceOf(app.getPeerEndpoint(peerInfo.id), MojaloopHttpEndpoint)
    })

  })

  describe('sendOutgoingPacket', function () {
    it('uses prescribed header to get next hop from routing table', async function () {
      const getTransferRequest: MojaloopHttpRequest = {
        objectId: '1',
        objectType: 'transfer',
        headers: {'address': 'moja.alice'},
        body: {}
      }
      const newApp = new App({ port: 1079, destinationHeader: 'address' })
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as AxiosResponse)
      await newApp.addPeer(peerInfo, endpoint)

      // new app set to use address
      await newApp.sendOutgoingRequest(getTransferRequest)
      sinon.assert.calledWith(endpointSendStub, getTransferRequest)

      // app set to default to use fspiop-destination
      await app.addPeer(peerInfo, endpoint)

      try {
        await app.sendOutgoingRequest(getTransferRequest)
      } catch (error) {
        return
      }

      assert.fail('Did not throw expected error')
    })

    it('throws error if no handler is found for next hop', async function () {
      const getTransferRequest: MojaloopHttpRequest = {
        objectId: '1',
        objectType: 'transfer',
        headers: {'fspiop-destination': 'moja.bob'},
        body: {}
      }
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      await app.addPeer(peerInfo, endpoint)
      // force bob to be in routing table
      app.routeManager.addPeer('bob', 'peer')
      app.routeManager.addRoute({
        peer: 'bob',
        prefix: 'moja.bob',
        path: []
      })

      try {
        await app.sendOutgoingRequest(getTransferRequest)
      } catch (e) {
        assert.equal(e.message, 'No handler set for bob')
        return
      }

      assert.fail('Did not throw expected error.')
    })
  })

  it('can forward a packet', async function () {
    const transferId = uuid()
    const headers = {
      'fspiop-source': 'bob',
      'content-type': 'application/vnd.interoperability.transfers+json;version=1.0',
      'fspiop-destination': 'moja.alice',
      'date': "Thu, 14 Mar 2019 09:07:54 GMT"
    }
    const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
    const axios202Response: AxiosResponse = {
      data: {},
      status: 202,
      statusText: '',
      headers: {},
      config: {}
    }
    const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves(axios202Response)
    await app.start()
    await app.addPeer(peerInfo, endpoint)

    const response = await axios.get(`http://0.0.0.0:1080/alice/transfers/${transferId}`, { headers }) 

    const endpointSendArg = endpointSendStub.getCall(0).args[0]
    sinon.assert.calledOnce(endpointSendStub)
    assert.equal(endpointSendArg.objectId, transferId)
    assert.equal(endpointSendArg.objectType, 'transfer')
    assert.deepEqual(endpointSendArg.body, {})
  })

})