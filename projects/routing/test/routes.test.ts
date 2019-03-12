import 'mocha'
import { expect } from 'chai'
import axios from 'axios'
import { createServer } from '../src/server'

describe('routes endpoints', function() { 
  let server: any

  beforeEach(function() {
    server = createServer(3000)
  })

  afterEach(function() {
    server.server.close()
  })


  it('can add a route', async function() {
    server.routeManager.addPeer('bob', 'child')
    const response = await axios.request({
      method: 'POST',
      url: 'http://localhost:3000/routes',
      data: {
        peer: 'bob',
        prefix: 'g.harry',
        path: []
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
      url: 'http://localhost:3000/routes',
      data: {
        peer: 'bob',
        prefix: 'g.harry'
      }
    })

    expect(response.status).to.be.equal(202)
    expect(() => server.router.nextHop('g.harry')).to.throw('Can\'t route the request due to no route found for given prefix')
  })
})
