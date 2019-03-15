import 'mocha'
import * as sinon from 'sinon'
import * as Chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import axios from 'axios'
import { App } from '../../src/app'
import { AdminApi } from '../../src/services/admin-api'
import { PeerInfo } from '../../src/types/peer';

Chai.use(chaiAsPromised)
const assert = Object.assign(Chai.assert, sinon.assert)

describe('Admin api', async function () {
  let app: App
  let adminApi: AdminApi

  beforeEach(function () {
    app = new App() // defaults to port 3000
    adminApi = new AdminApi({ app }) // default to port 2000

    adminApi.start()
  })

  afterEach(function () {
    if(app) app.shutdown()
    if(adminApi) adminApi.shutdown()
  })

  describe('start', function () {
    it('starts the http server', async function () {
      
      const res = await axios.get('http://0.0.0.0:2000/health')

      assert.equal(res.statusText, 'status: ok')
    })
  })

  describe('shutdown', function () {
    it('stops the server', async function () {
      adminApi.shutdown()
      try {
        const res = await axios.get('http://0.0.0.0:2000/health')
      } catch (error) {
        return
      }

      assert.fail('Did not throw expected error')
    })
  })

  describe('addPeer', async function () {
    it('tells the app to add a peer', async function () {
      const appAddPeerSpy = sinon.spy(app, 'addPeer')
      const data = {
        id: 'alice',
        assetCode: 'USD',
        assetScale: '2',
        relation: 'peer',
        mojaAddress: 'moja.alice',
        url: 'http://localhost:7780',
        rules: []
      }

      const response = await axios.post('http://0.0.0.0:2000/participants', { ...data })

      assert.equal(response.status, 202)
      sinon.assert.calledWith(appAddPeerSpy, {
        id: 'alice',
        assetCode: 'USD',
        assetScale: 2,
        relation: 'peer',
        mojaAddress: 'moja.alice',
        url: 'http://localhost:7780',
        rules: []
      })
    })
  })
})