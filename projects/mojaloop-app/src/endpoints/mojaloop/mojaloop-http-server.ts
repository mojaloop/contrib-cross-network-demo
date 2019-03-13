import * as hapi from 'hapi'
import { MojaloopHttpEndpoint } from './mojaloop-http'
import { TransferRoutes } from './routes/transfer-routes'
import { QuotesRoutes } from './routes/quotes-routes'

export class MojaloopHttpEndpointManager extends Map<string, MojaloopHttpEndpoint> {

  constructor (server: hapi.Server) {
    super()

    server.method('getEndpoint', this.getEndpoint.bind(this))

    const routes: hapi.ServerRoute[] = [...TransferRoutes, ...QuotesRoutes]
    routes.forEach(route => server.route(route))
  }

  getEndpoint (peerId: string): MojaloopHttpEndpoint {
    const endpoint = this.get(peerId)
    if (!endpoint) {
      throw new Error(`No endpoint found for peerId=${peerId}`)
    }
    return endpoint
  }

}
