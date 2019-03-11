import 'mocha'
import axios from 'axios'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MojaloopHttpEndpoint } from '../../src/endpoints/mojaloop-http'
import { MojaloopHttpRequest, MessageType } from '../../src/types/mojaloop-packets';

Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('HTTP Mojaloop Endpoint', function () {

  let mojaloopHttpEndpoint = new MojaloopHttpEndpoint({ url: 'http://localhost:1080/alice' })
  let axiosStub: sinon.SinonStub

  afterEach(function () {
    if(axiosStub) axiosStub.restore()
  })

  describe('constructor', function () {
    it('should create an instance of a mojaloop http endpoint', async function () {
      const endpoint = new MojaloopHttpEndpoint({ url: 'http://localhost/alice' })
      assert.instanceOf(endpoint, MojaloopHttpEndpoint)
    })
  })

  describe('sendOutgoingRequest', function () {

    it('sends post transfer request created from MojaloopHttpRequest', async function () {
      const transferPost: MojaloopHttpRequest = {
        type: MessageType.transfer,
        method: 'post',
        headers: {'fspiop-final-destination': 'alice'},
        data: {test: 'data'}
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(transferPost)

      assert.equal(axiosStub.args[0][0].url, '/transfers')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'post')
      assert.deepEqual(axiosStub.args[0][0].data, {test: 'data'})
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends put transfer request created from MojaloopHttpRequest', async function () {
      const transferPut: MojaloopHttpRequest = {
        type: MessageType.transfer,
        objectId: 1,
        method: 'put',
        headers: {'fspiop-final-destination': 'alice'},
        data: {test: 'data'}
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(transferPut)

      assert.equal(axiosStub.args[0][0].url, '/transfers/1')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'put')
      assert.deepEqual(axiosStub.args[0][0].data, {test: 'data'})
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends post transfer error request created from MojaloopHttpRequest', async function () {
      const transferError: MojaloopHttpRequest = {
        type: MessageType.transferError,
        objectId: 1,
        method: 'post',
        headers: {'fspiop-final-destination': 'alice'},
        data: {test: 'data'}
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(transferError)

      assert.equal(axiosStub.args[0][0].url, '/transfers/1/error')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'post')
      assert.deepEqual(axiosStub.args[0][0].data, {test: 'data'})
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends post quote request created from MojaloopHttpRequest', async function () {
      const quotePost: MojaloopHttpRequest = {
        type: MessageType.quote,
        method: 'post',
        headers: {'fspiop-final-destination': 'alice'},
        data: {test: 'data'}
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(quotePost)

      assert.equal(axiosStub.args[0][0].url, '/quotes')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'post')
      assert.deepEqual(axiosStub.args[0][0].data, {test: 'data'})
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends put quotes request created from MojaloopHttpRequest', async function () {
      const quotePut: MojaloopHttpRequest = {
        type: MessageType.quote,
        objectId: 1,
        method: 'put',
        headers: {'fspiop-final-destination': 'alice'},
        data: {test: 'data'}
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(quotePut)

      assert.equal(axiosStub.args[0][0].url, '/quotes/1')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'put')
      assert.deepEqual(axiosStub.args[0][0].data, {test: 'data'})
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends post quotes error request created from MojaloopHttpRequest', async function () {
      const quoteError: MojaloopHttpRequest = {
        type: MessageType.quoteError,
        objectId: 1,
        method: 'post',
        headers: {'fspiop-final-destination': 'alice'},
        data: {test: 'data'}
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(quoteError)

      assert.equal(axiosStub.args[0][0].url, '/quotes/1/error')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'post')
      assert.deepEqual(axiosStub.args[0][0].data, {test: 'data'})
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })
  })

})