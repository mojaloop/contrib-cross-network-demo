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
  const aliceUsdPeerInfo: PeerInfo = {
    id: 'alice-usd',
    relation: 'peer',
    mojaAddress: 'moja.alice',
    url: 'http://localhost:1081',
    assetCode: 'USD',
    assetScale: 2,
    rules: [{
      name: 'foreign-exchange'
    }]
  }

  const aliceXofPeerInfo: PeerInfo = {
    id: 'alice-xof',
    relation: 'peer',
    mojaAddress: 'moja.alice',
    url: 'http://localhost:1080',
    assetCode: 'XOF',
    assetScale: 2,
    rules: [{
      name: 'foreign-exchange'
    }]
  }

  const headers = {
    'fspiop-source': 'moja.bob',
    'fspiop-account': 'moja.fred',
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
      await app.addPeer(aliceUsdPeerInfo)

      assert.instanceOf(app.getPeerEndpoint(aliceUsdPeerInfo.id), MojaloopHttpEndpoint)
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
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      await app.addPeer(aliceUsdPeerInfo, endpoint)
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
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(postTransferRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing quote post requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(postQuoteRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing quote put error requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(putQuoteErrorRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing transfer put error requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(putTransferErrorRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing transfer get requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      const getTransferRequest: MojaloopHttpRequest = {
        objectId: '1',
        objectType: 'transfer',
        headers,
        body: {}
      }
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(getTransferRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('sets fspiop-source as its own address and fspiop-destination to nextHop for outgoing quote get requests', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
      const endpointSendStub = sinon.stub(endpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
      const getQuoteRequest: MojaloopHttpRequest = {
        objectId: '1',
        objectType: 'quote',
        headers,
        body: {}
      }
      
      app.setMojaAddress('moja.cnp')
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await app.sendOutgoingRequest(getQuoteRequest)

      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-source'], 'moja.cnp')
      assert.equal(endpointSendStub.getCall(0).args[0].headers['fspiop-destination'], 'moja.alice')
    })

    it('uses headers from transfer post request to update fspiop-source and fspiop-destination headers for transfer put request', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
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
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })
      await endpoint.handleIncomingRequest({
        headers: {
          'fspiop-source': 'moja.bob',
          'fspiop-account': 'moja.fred',
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
      const endpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
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
      await app.addPeer(aliceUsdPeerInfo, endpoint)
      app.routeManager.addRoute({
        peer: 'alice-usd',
        prefix: 'moja.fred',
        path: []
      })

      await endpoint.handleIncomingRequest({
        headers: {
          'fspiop-source': 'moja.bob',
          'fspiop-account': 'moja.fred',
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

  it('can return a key-value mapping of peers and peer infos', async function () {
    await app.addPeer(aliceUsdPeerInfo)

    const peers = app.getPeers()

    assert.deepEqual(peers, { 'alice-usd': aliceUsdPeerInfo })
  })

  it('can forward a packet', async function () {
    const headers = {
      'fspiop-source': 'bob',
      'content-type': 'application/vnd.interoperability.transfers+json;version=1.0',
      'accept': 'application/vnd.interoperability.transfers+json;version=1.0',
      'fspiop-destination': 'moja.alice',
      'date': "Thu, 14 Mar 2019 09:07:54 GMT"
    }
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
    const usdEndpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
    const xofEndpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
    const axios202Response: AxiosResponse = {
      data: {},
      status: 202,
      statusText: '',
      headers: {},
      config: {}
    }
    const usdEndpointSendStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves(axios202Response)
    const xofEndpointSendStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves(axios202Response)
    await app.start()
    app.setMojaAddress('moja.super-remit')
    await app.addPeer(aliceUsdPeerInfo, usdEndpoint)
    await app.addPeer(aliceXofPeerInfo, xofEndpoint)

    const response = await axios.post(`http://0.0.0.0:1080/alice/transfers`, postMessage, { headers })

    const endpointSendArg = usdEndpointSendStub.getCall(0).args[0]
    sinon.assert.calledOnce(usdEndpointSendStub)
    sinon.assert.notCalled(xofEndpointSendStub)
    assert.deepEqual(endpointSendArg.body, postMessage)
    assert.deepEqual(endpointSendArg.headers['fspiop-source'], 'moja.super-remit')
    assert.deepEqual(endpointSendArg.headers['fspiop-destination'], 'moja.alice')
    assert.deepEqual(endpointSendArg.headers['date'], 'Thu, 14 Mar 2019 09:07:54 GMT')
  })

  it('adds track-requests rule by default', async function () {
    await app.addPeer(aliceUsdPeerInfo)

    assert.include(app.getPeerRules(aliceUsdPeerInfo.id).map(rule => rule.constructor.name), 'TrackRequestsRule')
  })

  describe('currency conversion', function () {
    const bobUsdPeerInfo: PeerInfo = {
      id: 'bob-usd',
      assetCode: 'USD',
      assetScale: 2,
      mojaAddress: 'moja.bob',
      relation: 'peer',
      url: 'http:localhost:1082',
      rules: [{
        name: 'foreign-exchange'
      }]
    }
    const usdEndpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
    const xofEndpoint = new MojaloopHttpEndpoint({ url: aliceUsdPeerInfo.url })
    const axios202Response: AxiosResponse = {
      data: {},
      status: 202,
      statusText: '',
      headers: {},
      config: {}
    }
    let xofEndpointSendStub: sinon.SinonStub
    let usdEndpointSendStub: sinon.SinonStub

    beforeEach(async function () {
      await app.start()
      app.setMojaAddress('moja.super-remit')
      await app.addPeer(bobUsdPeerInfo, usdEndpoint)
      await app.addPeer(aliceXofPeerInfo, xofEndpoint)

      xofEndpointSendStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves(axios202Response)
      usdEndpointSendStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves(axios202Response)
    })

    afterEach(function () {
      xofEndpointSendStub.restore()
      usdEndpointSendStub.restore()
    })

    it('converts USD to XOF using exchage rate of 579.59 for a transfer when fx rule is applied', async function () {
      const headers = {
        'fspiop-source': 'bob',
        'content-type': 'application/vnd.interoperability.transfers+json;version=1.0',
        'accept': 'application/vnd.interoperability.transfers+json;version=1.0',
        'fspiop-account': 'moja.alice.xof',
        'date': "Thu, 14 Mar 2019 09:07:54 GMT"
      }
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
      await app.start()
      app.setMojaAddress('moja.super-remit')
      await app.addPeer(bobUsdPeerInfo, usdEndpoint)
      await app.addPeer(aliceXofPeerInfo, xofEndpoint)
  
      await axios.post(`http://0.0.0.0:1080/bob/transfers`, postMessage, { headers })
  
      const endpointSendArg = xofEndpointSendStub.getCall(0).args[0]
      sinon.assert.calledOnce(xofEndpointSendStub)
      assert.deepEqual(endpointSendArg.body['amount'], {
        currency: 'XOF',
        amount: '57959'
      })
    })

    it('converts XOF to USD using exchage rate of 579.59 for a transfer when fx rule is applied', async function () {
      const headers = {
        'fspiop-source': 'alice',
        'content-type': 'application/vnd.interoperability.transfers+json;version=1.0',
        'accept': 'application/vnd.interoperability.transfers+json;version=1.0',
        'fspiop-account': 'moja.bob.usd',
        'date': "Thu, 14 Mar 2019 09:07:54 GMT"
      }
      const postMessage: TransfersPostRequest = {
        transferId: uuid(),
        payeeFsp: 'alice',
        payerFsp: 'bob',
        amount: {
          amount: '57959',
          currency: 'XOF'
        },
        condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        expiration: '2016-05-24T08:38:08.699-04:00',
        ilpPacket: 'testpacket'
      }
      await app.start()
      app.setMojaAddress('moja.super-remit')
      await app.addPeer(bobUsdPeerInfo, usdEndpoint)
      await app.addPeer(aliceXofPeerInfo, xofEndpoint)
  
      await axios.post(`http://0.0.0.0:1080/alice/transfers`, postMessage, { headers })
  
      const endpointSendArg = usdEndpointSendStub.getCall(0).args[0]
      sinon.assert.calledOnce(usdEndpointSendStub)
      assert.deepEqual(endpointSendArg.body['amount'], {
        currency: 'USD',
        amount: '100'
      })
    })
  })  
})