import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { App } from '../src/app'
import axios, { AxiosResponse } from 'axios'
import {v4 as uuid} from 'uuid'
import { PeerInfo } from '../src/types/peer';
import { MojaloopHttpEndpoint } from '../src/endpoints/mojaloop/mojaloop-http';
import { MojaloopHttpRequest, MojaloopHttpReply } from '../src/types/mojaloop-packets';
import { TransfersPostRequest, QuotesPostRequest, TransfersIDPutResponse, QuotesIDPutResponse, ErrorInformationObject } from '../src/types/mojaloop-models/models';
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

  const headers = {
    'fspiop-source': 'moja.bob',
    'fspiop-address': 'moja.fred',
    'date': new Date(Date.now()).toUTCString(),
    'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
  }
  const transferId = uuid()
  const postTransferMessage: TransfersPostRequest = {
    transferId,
    payeeFsp: 'fred',
    payerFsp: 'bob',
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

  const quoteId = uuid()
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

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing transfer post requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(postTransferRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing quote post requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(postQuoteRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing quote put error requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(putQuoteErrorRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing transfer put error requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(putTransferErrorRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing transfer get requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      const getTransferRequest: MojaloopHttpRequest = {
        objectId: '1',
        objectType: 'transfer',
        headers,
        body: {}
      }
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(getTransferRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing quote get requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      const getQuoteRequest: MojaloopHttpRequest = {
        objectId: '1',
        objectType: 'quote',
        headers,
        body: {}
      }
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(getQuoteRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('uses headers from transfer post request to update fspiop-source and fspiop-destination headers for transfer put request', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      const putTransferMessage: TransfersIDPutResponse = {
        transferState: 'COMMITTED'
      }    
      const putTransferRequest: MojaloopHttpRequest = {
        objectId: transferId,
        headers,
        body: putTransferMessage
      }
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })
      await endpoint.handleIncomingRequest({
        headers: {
          'fspiop-source': 'moja.bob',
          'fspiop-address': 'moja.fred',
          'date': new Date(Date.now()).toUTCString(),
          'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
        },
        body: postTransferMessage
      }) // to make sure that post transfer request is in transferRequestEntryMap

      await app.sendOutgoingRequest(putTransferRequest)

      assert.equal(endpointSendStub.callCount, 2)
      assert.equal(endpointSendStub.getCall(1).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(1).args[0].headers['fspiop-destination'], 'moja.bob')
    })

    it('uses headers from quote post request to update fspiop-source and fspiop-destination headers for quote put request', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
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
      app.setMojaAddress('moja.cnp')
      await app.addPeer(peerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice',
        prefix: 'moja.fred',
        path: []
      })
      console.log('post headers', test)
      await endpoint.handleIncomingRequest({
        headers: {
          'fspiop-source': 'moja.bob',
          'fspiop-address': 'moja.fred',
          'date': new Date(Date.now()).toUTCString(),
          'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
        },
        body: postQuoteMessage
      }) // to make sure that post quote request is in quoteRequestEntryMap

      await app.sendOutgoingRequest(putQuoteRequest)

      assert.equal(endpointSendStub.callCount, 2)
      assert.equal(endpointSendStub.getCall(1).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(1).args[0].headers['fspiop-destination'], 'moja.bob')
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

  it('adds track-requests rule by default', async function () {
    await app.addPeer(peerInfo)

    assert.include(app.getPeerRules(peerInfo.id).map(rule => rule.constructor.name), 'TrackRequestsRule')
  })
})