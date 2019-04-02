import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { App } from '../../src/app'
import axios from 'axios'
import {v4 as uuid} from 'uuid'
import { PeerInfo } from '../../src/types/peer';
import { MojaloopHttpEndpoint } from '../../src/endpoints/mojaloop/mojaloop-http'
import { MojaloopHttpRequest, MojaloopHttpReply } from '../../src/types/mojaloop-packets'
import { getHeaders, getQuotePostMessage, getQuotePutMessage, getTransferPostMessage, getTransferPutMessage } from '../helpers/messages';
Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

/* 
  Alice (USD) at BLUE-DFSP has sent a quote request to Bob (XOF) at RED-DFSP.
  Now the subsequent transfer is being performed. The section the tests are concerned with is depicted below

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
const transferId = uuid()
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

const condition = 'GRzLaTP7DJ9t4P-a_BA0WA9wzzlsugf00-Tn6kESAfM'
const ilpPacket = 'test-packet'
const serverBaseUrl = 'http://localhost:3000/mowali'
const expiry = '2016-05-24T08:38:08.699-04:00'

describe('FXP receives transfer post flowing from Alice to Bob (USD to XOF)', function () {
  beforeEach(async function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)

    // set up required quote request and response
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getHeaders('quotes', 'blue-dfsp'),
      body: getQuotePostMessage('100', 'USD', 'SEND', quoteId, 'moja.mowali.xof.bob', 'moja.mowali.usd.alice')
    }
    const putQuoteRequest: MojaloopHttpRequest = {
      objectId: quoteId,
      headers: getHeaders('quotes', 'red-dfsp', 'fxp'),
      body: getQuotePutMessage('57959', 'XOF', condition, expiry, ilpPacket, 'red-dfsp')
    }
    await axios.post(`${serverBaseUrl}/quotes`, postQuoteRequest.body, { headers: postQuoteRequest.headers })
    await axios.put(`${serverBaseUrl}/quotes/${quoteId}`, putQuoteRequest.body, { headers: putQuoteRequest.headers })
    assert.isNotNull(fxp.getStoredQuotePostById(quoteId))
    assert.isNotNull(fxp.getStoredQuotePutById(quoteId))
    usdEndpointStub.reset()
    xofEndpointStub.reset()
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('sets the payeeFsp to red-dfsp and the payerFsp to fxp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-fsp', 'fxp'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body

    assert.equal(outgoingPostBody['payeeFsp'], 'red-dfsp')
    assert.equal(outgoingPostBody['payerFsp'], 'fxp')
  })

  it('sets fspiop-source to fxp and fspiop-destination to red-dfsp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-fsp', 'fxp'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostHeaders = xofEndpointStub.getCall(0).args[0].headers
    
    assert.equal(outgoingPostHeaders['fspiop-destination'], 'red-dfsp')
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
  })

  it('sets the amount to that stored in the quote response from red-dfsp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-fsp', 'fx'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body

    assert.deepEqual(outgoingPostBody['amount'], {
      amount: '57959',
      currency: 'XOF'
    })
  })

  it('creates a new transfer and stores a map to the original transfer post', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-fsp', 'fx'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body
    const newTransferId = outgoingPostBody.transferId
    const incomingTransfer = fxp.mapOutgoingTransferToIncoming(newTransferId)
    assert.deepEqual(incomingTransfer.body, postTransferRequest.body)
    assert.notEqual(incomingTransfer.body.transferId, newTransferId)
  })

})

describe('FXP receives transfer put flowing from Bob to Alice (USD to XOF)', function () {
  let newTransferId: string
  beforeEach(async function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)

    // set up required quote request and response as well as transfer post
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getHeaders('quotes', 'blue-dfsp'),
      body: getQuotePostMessage('100', 'USD', 'SEND', quoteId, 'moja.mowali.xof.bob', 'moja.mowali.usd.alice')
    }
    const putQuoteRequest: MojaloopHttpRequest = {
      objectId: quoteId,
      headers: getHeaders('quotes', 'red-dfsp', 'fxp'),
      body: getQuotePutMessage('57959', 'XOF', condition, expiry, ilpPacket, 'red-dfsp')
    }
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-dfsp', 'fxp'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }
    await axios.post(`${serverBaseUrl}/quotes`, postQuoteRequest.body, { headers: postQuoteRequest.headers })
    await axios.put(`${serverBaseUrl}/quotes/${quoteId}`, putQuoteRequest.body, { headers: putQuoteRequest.headers })
    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })
    const outgoingTransferPost = xofEndpointStub.getCall(1).args[0]
    newTransferId = outgoingTransferPost.body.transferId
    assert.isNotNull(fxp.getStoredQuotePostById(quoteId))
    assert.isNotNull(fxp.getStoredQuotePutById(quoteId))
    assert.isNotNull(fxp.getStoredTransferPostById(transferId))
    usdEndpointStub.reset()
    xofEndpointStub.reset()
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('sets fspiop-source to fxp and fspiop-destination to blue-dfsp', async function () {
    const putTransferRequest: MojaloopHttpRequest = {
      objectId: newTransferId,
      headers: getHeaders('transfers', 'red-dfsp', 'fxp'),
      body: getTransferPutMessage('COMMITTED')
    }

    await axios.put(`${serverBaseUrl}/transfers/${newTransferId}`, putTransferRequest.body, { headers: putTransferRequest.headers })

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostHeaders = usdEndpointStub.getCall(0).args[0].headers
    
    assert.equal(outgoingPostHeaders['fspiop-destination'], 'blue-dfsp')
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
  })

  it('sets transferState to that received from the transfer put request', async function () {
    const putTransferRequest: MojaloopHttpRequest = {
      objectId: newTransferId,
      headers: getHeaders('transfers', 'red-dfsp', 'fxp'),
      body: getTransferPutMessage('ABORTED')
    }

    await axios.put(`${serverBaseUrl}/transfers/${newTransferId}`, putTransferRequest.body, { headers: putTransferRequest.headers })

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostBody = usdEndpointStub.getCall(0).args[0].body
    
    assert.equal(outgoingPostBody['transferState'], 'ABORTED')
  })
})

describe('FXP receives transfer post flowing from Bob to Alice (XOF to USD)', function () {
  beforeEach(async function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)

    // set up required quote request and response
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getHeaders('quotes', 'red-dfsp'),
      body: getQuotePostMessage('57959', 'XOF', 'SEND', quoteId, 'moja.mowali.usd.alice', 'moja.mowali.xof.bob')
    }
    const putQuoteRequest: MojaloopHttpRequest = {
      objectId: quoteId,
      headers: getHeaders('quotes', 'blue-dfsp', 'fxp'),
      body: getQuotePutMessage('100', 'USD', condition, expiry, ilpPacket, 'blue-dfsp')
    }
    await axios.post(`${serverBaseUrl}/quotes`, postQuoteRequest.body, { headers: postQuoteRequest.headers })
    await axios.put(`${serverBaseUrl}/quotes/${quoteId}`, putQuoteRequest.body, { headers: putQuoteRequest.headers })
    assert.isNotNull(fxp.getStoredQuotePostById(quoteId))
    assert.isNotNull(fxp.getStoredQuotePutById(quoteId))
    usdEndpointStub.reset()
    xofEndpointStub.reset()
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('sets the payeeFsp to blue-dfsp and the payerFsp to fxp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'red-fsp', 'fxp'),
      body: getTransferPostMessage('57959', 'XOF', 'fxp', 'red-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostBody = usdEndpointStub.getCall(0).args[0].body

    assert.equal(outgoingPostBody['payeeFsp'], 'blue-dfsp')
    assert.equal(outgoingPostBody['payerFsp'], 'fxp')
  })

  it('sets fspiop-source to fxp and fspiop-destination to red-dfsp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'red-fsp', 'fxp'),
      body: getTransferPostMessage('57959', 'XOF', 'fxp', 'red-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostHeaders = usdEndpointStub.getCall(0).args[0].headers
    
    assert.equal(outgoingPostHeaders['fspiop-destination'], 'blue-dfsp')
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
  })

  it('sets the amount to 100 USD', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'red-fsp', 'fxp'),
      body: getTransferPostMessage('57959', 'XOF', 'fxp', 'red-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostBody = usdEndpointStub.getCall(0).args[0].body

    assert.deepEqual(outgoingPostBody['amount'], {
      amount: '100',
      currency: 'USD'
    })
  })

  it('creates a new transfer and stores a map to the original transfer post', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'red-fsp', 'fxp'),
      body: getTransferPostMessage('57959', 'XOF', 'fxp', 'red-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }

    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })

    const outgoingPostBody = usdEndpointStub.getCall(0).args[0].body
    const newTransferId = outgoingPostBody.transferId
    const incomingTransfer = fxp.mapOutgoingTransferToIncoming(newTransferId)
    assert.deepEqual(incomingTransfer.body, postTransferRequest.body)
    assert.notEqual(incomingTransfer.body.transferId, newTransferId)
  })
})

describe('FXP receives transfer put flowing from Alice to Bob (XOF to USD)', function () {
  let newTransferId: string
  beforeEach(async function () {
    fxp = new App()
    fxp.start()
    fxp.addPeer(mowaliUsdPeerInfo, usdEndpoint)
    fxp.addPeer(mowaliXofPeerInfo, xofEndpoint)
    xofEndpointStub = sinon.stub(xofEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)
    usdEndpointStub = sinon.stub(usdEndpoint, 'sendOutgoingRequest').resolves({} as MojaloopHttpReply)

    // set up required quote request and response
    const postQuoteRequest: MojaloopHttpRequest = {
      headers: getHeaders('quotes', 'red-dfsp'),
      body: getQuotePostMessage('57959', 'XOF', 'SEND', quoteId, 'moja.mowali.usd.alice', 'moja.mowali.xof.bob')
    }
    const putQuoteRequest: MojaloopHttpRequest = {
      objectId: quoteId,
      headers: getHeaders('quotes', 'blue-dfsp', 'fxp'),
      body: getQuotePutMessage('100', 'USD', condition, expiry, ilpPacket, 'blue-dfsp')
    }
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'red-dfsp', 'fxp'),
      body: getTransferPostMessage('57959', 'XOF', 'fxp', 'red-dfsp', transferId, quoteId, expiry, ilpPacket, condition)
    }
    await axios.post(`${serverBaseUrl}/quotes`, postQuoteRequest.body, { headers: postQuoteRequest.headers })
    await axios.put(`${serverBaseUrl}/quotes/${quoteId}`, putQuoteRequest.body, { headers: putQuoteRequest.headers })
    await axios.post(`${serverBaseUrl}/transfers`, postTransferRequest.body, { headers: postTransferRequest.headers })
    assert.isNotNull(fxp.getStoredQuotePostById(quoteId))
    assert.isNotNull(fxp.getStoredQuotePutById(quoteId))
    assert.isNotNull(fxp.getStoredTransferPostById(transferId))
    const outgoingTransferPost = usdEndpointStub.getCall(1).args[0]
    newTransferId = outgoingTransferPost.body.transferId
    assert.notEqual(newTransferId, transferId)
    usdEndpointStub.reset()
    xofEndpointStub.reset()
  })

  afterEach(function () {
    fxp.shutdown()
    xofEndpointStub.restore()
    usdEndpointStub.restore()
  })

  it('sets fspiop-source to fxp and fspiop-destination to red-dfsp', async function () {
    const putTransferRequest: MojaloopHttpRequest = {
      objectId: newTransferId,
      headers: getHeaders('transfers', 'blue-dfsp', 'fxp'),
      body: getTransferPutMessage('COMMITTED')
    }

    await axios.put(`${serverBaseUrl}/transfers/${newTransferId}`, putTransferRequest.body, { headers: putTransferRequest.headers })

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostHeaders = xofEndpointStub.getCall(0).args[0].headers
    
    assert.equal(outgoingPostHeaders['fspiop-destination'], 'red-dfsp')
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
  })

  it('sets transferState to that received from the transfer put request', async function () {
    const putTransferRequest: MojaloopHttpRequest = {
      objectId: newTransferId,
      headers: getHeaders('transfers', 'blue-dfsp', 'fxp'),
      body: getTransferPutMessage('ABORTED')
    }

    await axios.put(`${serverBaseUrl}/transfers/${newTransferId}`, putTransferRequest.body, { headers: putTransferRequest.headers })

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body
    
    assert.equal(outgoingPostBody['transferState'], 'ABORTED')
  })
})