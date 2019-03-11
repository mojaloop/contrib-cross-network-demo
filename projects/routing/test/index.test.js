const assert = require('assert')

describe('index', function () {
  it('creates an instance of an initialized server', async function () {
    const server = await require('../src/index')

    assert.notStrictEqual(server.info.started, 0)

    server.stop()
  })
})
