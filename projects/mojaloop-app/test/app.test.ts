import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { App } from '../src/app'
import axios from 'axios'
import { PeerInfo } from '../src/types/peer';
import { MojaloopHttpEndpoint } from '../src/endpoints/mojaloop/mojaloop-http';
Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Mojaloop CNP App', function () {

  let app: App
  const peerInfo: PeerInfo = {
    id: 'alice',
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

})