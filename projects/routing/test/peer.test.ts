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
      relation: 'child',
      routingSecret: '',
      shouldAuth: false
    })
  })

  it('can get a route for a peer based on destinationAddress', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addPeer('alice', 'child')
    server.routeManager.addRoute({
      peer: 'bob',
      prefix: 'g.harry',
      path: [],
      weight: 100
    })
    expect(server.routeManager.getPeer('bob')).to.not.be.undefined

    const response = await axios.request({
      method: 'GET',
      url: 'http://localhost:3000/peers?destinationAddress=g.harry',
    })

    expect(response.status).to.be.equal(200)
    expect(response.data).to.be.deep.equal([{
      id: 'bob',
      relation: 'child',
      routingSecret: '',
      shouldAuth: false
    }])
  })

  // TODO Need to update ILP-routing
  it.skip('can update an existing peer', async function() {
    server.routeManager.addPeer('bob', 'child')
    expect(server.routeManager.getPeer('bob')).to.not.be.undefined
    expect(server.routeManager.getPeer('bob').getRelation()).to.equal('child')

    const response = await axios.request({
      method: 'PUT',
      url: 'http://localhost:3000/peers/bob',
      data: {
        id: 'bob',
        relation: 'peer'
      }
    })

    expect(response.status).to.be.equal(202)
  })

  it('can get a list of peers', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addPeer('roger', 'child')

    const response = await axios.request({
      method: 'GET',
      url: 'http://localhost:3000/peers',
    })

    expect(response.status).to.be.equal(200)
    expect(response.data).to.be.deep.equal([ 
      { id: 'bob', relation: 'child' , routingSecret: '', shouldAuth: false },
      { id: 'roger', relation: 'child', routingSecret: '', shouldAuth: false } 
    ])
  })
})
