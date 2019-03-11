import 'mocha'
import { expect } from 'chai'
import axios from 'axios'
import { Server } from 'http'
import { createServer } from '../src/server'

describe('peer endpoints', function() { 
  let server: any

  beforeEach(function() {
    server = createServer(3000)
  })

  afterEach(function() {
    server.server.close()
  })


  it('can add a peer', async function() {
    const response = await axios.request({
      method: 'POST',
      url: 'http://localhost:3000/peers',
      data: {
        id: 'bob',
        relation: 'child'
      }
    })

    expect(response.data).to.deep.equal({
      id: 'bob',
      relation: 'child'
    })
    expect(server.routeManager.getPeer('bob')).to.not.be.undefined
  })

  it('can remove a peer', async function() {
    server.routeManager.addPeer('bob', 'child')
    expect(server.routeManager.getPeer('bob')).to.not.be.undefined

    const response = await axios.request({
      method: 'DELETE',
      url: 'http://localhost:3000/peers/bob',
    })

    expect(response.status).to.be.equal(202)
    expect(server.routeManager.getPeer('bob')).to.be.undefined
  })

  it('can get a peer', async function() {
    server.routeManager.addPeer('bob', 'child')
    expect(server.routeManager.getPeer('bob')).to.not.be.undefined

    const response = await axios.request({
      method: 'GET',
      url: 'http://localhost:3000/peers/bob',
    })

    expect(response.status).to.be.equal(200)
    expect(response.data).to.be.deep.equal({
      id: 'bob',
      relation: 'child'
    })
  })
})
