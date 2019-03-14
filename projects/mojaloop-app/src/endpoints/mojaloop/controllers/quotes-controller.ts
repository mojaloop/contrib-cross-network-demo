import * as hapi from 'hapi'
import { MojaloopHttpEndpoint } from '../mojaloop-http'
import { MojaloopHttpRequest } from '../../../types/mojaloop-packets'
import { QuotesPostRequest, QuotesIDPutResponse } from '../../../types/mojaloop-models/models'

export function create (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId)

    const quotesPostRequest: MojaloopHttpRequest = {
      headers: request.headers,
      body: request.payload as QuotesPostRequest
    }

    const endpointResponse = endpoint.handleIncomingRequest(quotesPostRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}

export function update (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId)

    const quotesIdPutRequest: MojaloopHttpRequest = {
      objectId: request.params.id,
      headers: request.headers,
      body: request.payload as QuotesIDPutResponse
    }

    const endpointResponse = endpoint.handleIncomingRequest(quotesIdPutRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}

export function show (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {

    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId)
    const quoteGetRequest: MojaloopHttpRequest = {
      objectId: request.params.id,
      objectType: 'quote',
      headers: request.headers,
      body: {}
    }

    // Do nothing with response
    const endpointResponse = endpoint.handleIncomingRequest(quoteGetRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}
