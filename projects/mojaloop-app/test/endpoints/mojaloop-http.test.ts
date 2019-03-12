import 'mocha'
import axios from 'axios'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MojaloopHttpEndpoint } from '../../src/endpoints/mojaloop/mojaloop-http'
import { MojaloopHttpRequest } from '../../src/types/mojaloop-packets'
import { TransfersPostRequest, TransfersIDPutResponse, QuotesPostRequest, QuotesIDPutResponse } from '../../src/types/mojaloop-models/models'

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
      const postMessage: TransfersPostRequest = {
        transferId: '1',
        payeeFsp: 'bob',
        payerFsp: 'alice',
        amount: {
          amount: '',
          currency: ''
        },
        condition: '',
        expiration: '',
        ilpPacket: ''
      }
      const transferPost: MojaloopHttpRequest = {
        headers: {'fspiop-final-destination': 'alice'},
        body: postMessage
      }

      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(transferPost)

      assert.equal(axiosStub.args[0][0].url, '/transfers')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'post')
      assert.deepEqual(axiosStub.args[0][0].data, postMessage)
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends put transfer request created from MojaloopHttpRequest', async function () {
      const putMessage: TransfersIDPutResponse = {
        transferState: 'FULFILLED'
      }
      const transferPut: MojaloopHttpRequest = {
        objectId: '1',
        headers: {'fspiop-final-destination': 'alice'},
        body: putMessage
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(transferPut)

      assert.equal(axiosStub.args[0][0].url, '/transfers/1')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'put')
      assert.deepEqual(axiosStub.args[0][0].data, putMessage)
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends post quote request created from MojaloopHttpRequest', async function () {
      const postMessage: QuotesPostRequest = {
        amount: {
          amount: '10',
          currency: 'USD'
        },
        amountType: '',
        payee: {
          partyIdInfo: {
            partyIdType: '',
            partyIdentifier: 'bob'
          }
        },
        payer: {
          partyIdInfo: {
            partyIdType: '',
            partyIdentifier: 'alice'
          }
        },
        quoteId: '2',
        transactionId: '1',
        transactionType: {
          initiator: '',
          scenario: '',
          initiatorType: ''
        }
      }
      const quotePost: MojaloopHttpRequest = {
        headers: {'fspiop-final-destination': 'alice'},
        body: postMessage
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(quotePost)

      assert.equal(axiosStub.args[0][0].url, '/quotes')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'post')
      assert.deepEqual(axiosStub.args[0][0].data, postMessage)
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })

    it('sends put quotes request created from MojaloopHttpRequest', async function () {
      const putMessage: QuotesIDPutResponse = {
        condition: '',
        expiration: '',
        ilpPacket: 'packetpacketpacket',
        transferAmount: {
          amount: '10',
          currency: 'USD'
        }
      }
      const quotePut: MojaloopHttpRequest = {
        objectId: '1',
        headers: {'fspiop-final-destination': 'alice'},
        body: putMessage
      }
      axiosStub = sinon.stub(axios, 'request').resolves()

      await mojaloopHttpEndpoint.sendOutgoingRequest(quotePut)

      assert.equal(axiosStub.args[0][0].url, '/quotes/1')
      assert.equal(axiosStub.args[0][0].baseURL, 'http://localhost:1080/alice')
      assert.equal(axiosStub.args[0][0].method, 'put')
      assert.deepEqual(axiosStub.args[0][0].data, putMessage)
      assert.deepEqual(axiosStub.args[0][0].headers, {'fspiop-final-destination': 'alice'})
    })
  })

})