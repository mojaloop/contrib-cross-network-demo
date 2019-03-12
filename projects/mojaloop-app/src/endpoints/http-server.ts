import * as hapi from 'hapi'
import pathToRegexp from 'path-to-regexp'
import { MojaloopHttpEndpoint } from './mojaloop-http'
import { MojaloopHttpRequest } from '../types/mojaloop-packets'

export class MojaloopHttpEndpointManager extends Map<string, MojaloopHttpEndpoint> {

  private _pathRegex: RegExp

  constructor (server: hapi.Server, path: string = '/:peerId/*') {
    super()
    this._pathRegex = pathToRegexp(path)

    server.route({
      method: 'POST',
      path: '/:peerId/transfers',
      handler: this.handleTransferPost.bind(this)
    })
  }

  getPeerIdFromPath (path: string): string | undefined {
    const matches = this._pathRegex.exec(path)
    return (matches && matches.length > 1) ? matches[1] : undefined
  }

  getEndpointFromPath (path: string): MojaloopHttpEndpoint | undefined {
    const peerId = this.getPeerIdFromPath(path)
    if (!peerId) {
      throw new Error(`No peer found for path=${path}`)
    }
    return this.get(peerId)
  }

  private handleTransferPost (request: hapi.Request, reply: hapi.ResponseToolkit) {
    const endpoint = this.getEndpointFromPath(request.path)
    if (!endpoint) {
      throw new Error(`No endpoint found for path=${request.path}`)
    }

    // TODO: create mojaloop post request

    reply.response().code(202)
  }

}
