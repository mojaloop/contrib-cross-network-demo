import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { App } from '../../src/app'
import axios, { AxiosResponse } from 'axios'
import {v4 as uuid} from 'uuid'
import { PeerInfo } from '../../src/types/peer';
import { MojaloopHttpEndpoint } from '../../src/endpoints/mojaloop/mojaloop-http'
import { MojaloopHttpRequest, MojaloopHttpReply } from '../../src/types/mojaloop-packets'
import { TransfersPostRequest, QuotesPostRequest, TransfersIDPutResponse, QuotesIDPutResponse, ErrorInformationObject } from '../../src/types/mojaloop-models/models'
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
      body: getQuotePutMessage('57959', 'XOF', 'test-condition', 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet', 'red-dfsp')
    }
    await usdEndpoint.handleIncomingRequest(postQuoteRequest)
    await xofEndpoint.handleIncomingRequest(putQuoteRequest)
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
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet', 'test-condition')
    }

    await usdEndpoint.handleIncomingRequest(postTransferRequest)

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body

    assert.equal(outgoingPostBody['payeeFsp'], 'red-dfsp')
    assert.equal(outgoingPostBody['payerFsp'], 'fxp')
  })

  it('sets fspiop-source to fxp and fspiop-destination to red-dfsp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-fsp', 'fxp'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet', 'test-condition')
    }

    await usdEndpoint.handleIncomingRequest(postTransferRequest)

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostHeaders = xofEndpointStub.getCall(0).args[0].headers
    
    assert.equal(outgoingPostHeaders['fspiop-destination'], 'red-dfsp')
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
  })

  it('sets the amount to that stored in the quote response from red-dfsp', async function () {
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-fsp', 'fx'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet', 'test-condition')
    }

    await usdEndpoint.handleIncomingRequest(postTransferRequest)

    sinon.assert.calledOnce(xofEndpointStub)
    const outgoingPostBody = xofEndpointStub.getCall(0).args[0].body

    assert.deepEqual(outgoingPostBody['amount'], {
      amount: '57959',
      currency: 'XOF'
    })
  })

})

describe('FXP receives transfer put flowing from Bob to Alice (USD to XOF)', function () {
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
      body: getQuotePutMessage('57959', 'XOF', 'test-condition', 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet', 'red-dfsp')
    }
    const postTransferRequest: MojaloopHttpRequest = {
      headers: getHeaders('transfers', 'blue-dfsp', 'fxp'),
      body: getTransferPostMessage('100', 'USD', 'fxp', 'blue-dfsp', transferId, quoteId, 'Thu, 14 Mar 2019 09:07:54 GMT', 'test-packet', 'test-condition')
    }
    await usdEndpoint.handleIncomingRequest(postQuoteRequest)
    await xofEndpoint.handleIncomingRequest(putQuoteRequest)
    await usdEndpoint.handleIncomingRequest(postTransferRequest)
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
      objectId: transferId,
      headers: getHeaders('transfers', 'red-dfsp', 'fxp'),
      body: getTransferPutMessage('COMMITTED')
    }

    await xofEndpoint.handleIncomingRequest(putTransferRequest)

    sinon.assert.calledOnce(usdEndpointStub)
    const outgoingPostHeaders = usdEndpointStub.getCall(0).args[0].headers
    
    assert.equal(outgoingPostHeaders['fspiop-destination'], 'blue-dfsp')
    assert.equal(outgoingPostHeaders['fspiop-source'], 'fxp')
  })
})