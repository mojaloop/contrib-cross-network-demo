import * as hapi from 'hapi'
import { MojaloopHttpEndpoint } from './mojaloop-http'
import { TransferRoutes } from './routes/transfer-routes'
import { QuotesRoutes } from './routes/quotes-routes'
import { RequestMapEntry } from '../../rules/track-requests-rule'

export interface EndpointManagerServices {
  getStoredTransferById: (id: string) => RequestMapEntry | undefined
  getStoredQuoteById: (id: string) => RequestMapEntry | undefined
  getStoredQuotePutById: (id: string) => RequestMapEntry | undefined
  mapOutgoingTransferToIncoming: (id: string) => RequestMapEntry
}

export class MojaloopHttpEndpointManager extends Map<string, MojaloopHttpEndpoint> {

  constructor (server: hapi.Server, services: EndpointManagerServices) {
    super()

    server.method('getEndpoint', this.getEndpoint.bind(this))
    server.method('getStoredTransferById', services.getStoredTransferById)
    server.method('getStoredQuoteById', services.getStoredQuoteById)
    server.method('getStoredQuotePutById', services.getStoredQuotePutById)
    server.method('mapOutgoingTransferToIncoming', services.mapOutgoingTransferToIncoming)

    const routes: hapi.ServerRoute[] = [...TransferRoutes, ...QuotesRoutes]
    routes.forEach(route => server.route(route))
  }

  getEndpoint (participantId: string, currency: string): MojaloopHttpEndpoint {
    const endpoint = this.get(participantId + '-' + currency.toLowerCase())
    if (!endpoint) {
      throw new Error(`No endpoint found for participantId=${participantId} and currency=${currency}`)
    }
    return endpoint
  }

}
