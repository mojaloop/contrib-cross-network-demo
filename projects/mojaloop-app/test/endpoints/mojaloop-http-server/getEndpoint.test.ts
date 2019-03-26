import 'mocha'
import { v4 as uuid } from 'uuid'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MojaloopHttpEndpointManager } from '../../../src/endpoints/mojaloop/mojaloop-http-server'
import * as hapi from 'hapi'
import { MojaloopHttpEndpoint } from '../../../src/endpoints/mojaloop/mojaloop-http'
import { TransfersPostRequest, TransfersIDPutResponse, ErrorInformationObject } from '../../../src/types/mojaloop-models/models'
import { MojaloopHttpRequest, isTransferPostMessage, isTransferPutMessage, isTransferGetRequest, isTransferPutErrorRequest } from '../../../src/types/mojaloop-packets'
import { PeerInfo } from '../../../src/types/peer'
import { RequestMapEntry } from '../../../src/rules/track-requests-rule';

Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Mojaloop Http Endpoint Manager getEndpoint', function () {
  let endpointManager: MojaloopHttpEndpointManager
  let mowaliUsdEndpoint: MojaloopHttpEndpoint
  let mowaliXofEndpoint: MojaloopHttpEndpoint
  let httpServer: hapi.Server

  const mowaliUsd: PeerInfo = {
    id: 'mowali-usd',
    assetCode: 'USD',
    assetScale: 2,
    mojaAddress: 'moja.usd.mowali',
    relation: 'peer',
    rules: [],
    url: 'http://localhost:1080'
  }

  const mowaliXof: PeerInfo = {
    id: 'mowali-xof',
    assetCode: 'XOFD',
    assetScale: 2,
    mojaAddress: 'moja.xof.mowali',
    relation: 'peer',
    rules: [],
    url: 'http://localhost:1080'
  }

  const requestMapEntry: RequestMapEntry = {
    headers: {},
    body: {},
    sentPut: false
  }

  beforeEach(function () {
    httpServer = new hapi.Server({
      host: '0.0.0.0',
      port: 7780
    })
    mowaliUsdEndpoint = new MojaloopHttpEndpoint({url: mowaliUsd.url})
    mowaliXofEndpoint = new MojaloopHttpEndpoint({url: mowaliXof.url})
    httpServer.start()
    endpointManager = new MojaloopHttpEndpointManager(httpServer, { getStoredTransferById: (id: string) => requestMapEntry, getStoredQuoteById: (id: string) => requestMapEntry })
    endpointManager.set(mowaliUsd.id, mowaliUsdEndpoint)
    endpointManager.set(mowaliXof.id, mowaliXofEndpoint)
  })

  afterEach(function () {
    httpServer.stop()
  })

  it('combines the participantId and currency to get id for the endpoint', async function () {
    const getSpy = sinon.spy(endpointManager, 'get')

    const endpoint = endpointManager.getEndpoint('mowali', 'usd')

    sinon.assert.calledWith(getSpy, 'mowali-usd')
    assert.isNotNull(endpoint)
  })

  it('turns currency into lower case', async function () {
    const getSpy = sinon.spy(endpointManager, 'get')

    const endpoint = endpointManager.getEndpoint('mowali', 'USD')

    sinon.assert.calledWith(getSpy, 'mowali-usd')
    assert.isNotNull(endpoint)
  })
})