import 'mocha'
import { expect } from 'chai'
import axios from 'axios'
import { createServer } from '../src/server'
import { doesNotReject, fail } from 'assert';

describe('nexthop endpoints', function() { 
  let server: any

  beforeEach(function() {
    server = createServer(3000)
  })

  afterEach(function() {
    server.server.close()
  })


  it('can get peer for nexthop', async function() {
    server.routeManager.addPeer('bob', 'child')
    server.routeManager.addRoute({
      peer: 'bob',
      prefix: 'g.harry',
      path: []
    })
    const response = await axios.request({
      method: 'GET',
      url: 'http://localhost:3000/nexthop/g.harry'
    })

    expect(response.data).to.deep.equal({
      peer: 'bob'
    })
  })
})
