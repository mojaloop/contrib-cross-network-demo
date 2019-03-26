import * as hapi from 'hapi'
import { MojaloopHttpRequest } from '../../../types/mojaloop-packets'
import { ErrorInformationObject } from '../../../types/mojaloop-models/models'
import { MojaloopHttpEndpoint } from '../mojaloop-http'
import { log } from '../../../winston'

const logger = log.child({ component: 'Quotes-Error-Controller' })

export function update (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    logger.debug('Received put from ' + request.path, { data: request.payload, headers: request.headers })
    const storedQuote = request.server.methods.getStoredQuoteById(request.params.id)
    const currency = storedQuote.body.amount.currency
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId, currency)
    const quoteErrorPutHttpRequest: MojaloopHttpRequest = {
      objectId: request.params.id,
      objectType: 'quote',
      headers: request.headers,
      body: request.payload as ErrorInformationObject
    }

    // Do nothing with response
    const endpointResponse = endpoint.handleIncomingRequest(quoteErrorPutHttpRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}
