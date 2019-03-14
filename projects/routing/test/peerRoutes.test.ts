import 'mocha'
import { expect } from 'chai'
import axios from 'axios'
import { createServer } from '../src/server'

describe('peer routes endpoints', function() { 
  let server: any

  beforeEach(function() {
    server = createServer(3000)
  })

  afterEach(function() {
    server.server.close()
  })

  it('can get a list of a peers routes', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addRoute({
      peer: 'bob',
      prefix: 'g.harry',
      path: [],
      weight: 100
    })
    const response = await axios.request({
      method: 'GET',
      url: 'http://localhost:3000/peers/bob/routes'
    })

    expect(response.status).to.be.equal(200)
    expect(response.data).to.be.deep.equal([ 
      { 
        prefix: 'g.harry' , 
        path: [],
        weight: 100
      },
    ])
  })

  it('can get a route for a peer', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addRoute({
      peer: 'bob',
      prefix: 'g.harry',
      path: [],
      weight: 100
    })
    const response = await axios.request({
      method: 'GET',
      url: 'http://localhost:3000/peers/bob/routes/g.harry'
    })

    expect(response.status).to.be.equal(200)
    expect(response.data).to.be.deep.equal({ 
        prefix: 'g.harry' , 
        path: [],
        weight: 100
      })
  })

  it('can add a route for a peer', async function() {
    server.routeManager.addPeer('bob', 'child')
    const response = await axios.request({
      method: 'POST',
      url: 'http://localhost:3000/peers/bob/routes', 
      data: {
        prefix: 'g.harry',
        path: [],
        weight: 100,
        auth: ''
      }
    })

    expect(response.status).to.be.equal(201)
    expect(server.router.nextHop('g.harry')).to.be.equal('bob')
  })

  it('can remove a route', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addRoute({
      peer: 'bob',
      prefix: 'g.harry',
      path: []
    })
    expect(server.router.nextHop('g.harry')).to.not.be.undefined

    const response = await axios.request({
      method: 'DELETE',
      url: 'http://localhost:3000/peers/bob/routes/g.harry'
    })

    expect(response.status).to.be.equal(204)
    expect(() => server.router.nextHop('g.harry')).to.throw('Can\'t route the request due to no route found for given prefix')
  })

  it('can update a route', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addRoute({
      peer: 'bob',
      prefix: 'g.harry',
      path: []
    })
    const peer = server.routeManager.getPeer('bob')!
    expect(peer.getPrefix('g.harry')).to.be.deep.equal({
      peer: 'bob',
      prefix: 'g.harry',
      path: []
    })

    const response = await axios.request({
      method: 'PUT',
      url: 'http://localhost:3000/peers/bob/routes/g.harry',
      data: {
        prefix: 'g.harry',
        path: [],
        weight: 100,
        auth: ''
      }
    })

    expect(response.status).to.be.equal(202)
    expect(peer.getPrefix('g.harry')).to.be.deep.equal({
      peer: 'bob',
      prefix: 'g.harry',
      weight: 100,
      path: [],
      auth: ''
    })
  })
})
