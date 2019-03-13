import * as hapi from 'hapi'
import { MojaloopHttpRequest, isTransferPostMessage, MojaloopMessage, isTransferPutMessage } from '../../../types/mojaloop-packets'
import { TransfersPostRequest, TransfersIDPutResponse } from '../../../types/mojaloop-models/models'
import { MojaloopHttpEndpoint } from '../mojaloop-http'

export function create (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    if (!isTransferPostMessage(request.payload as MojaloopMessage)) {
      throw new Error('Could not turn payload into transfer post request.')
    }
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId)
    const transferPostHttpRequest: MojaloopHttpRequest = {
      headers: request.headers,
      body: request.payload as TransfersPostRequest
    }

    // Do nothing with response
    const endpointResponse = endpoint.handleIncomingRequest(transferPostHttpRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}

export function update (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    if (!isTransferPutMessage(request.payload as MojaloopMessage)) {
      throw new Error('Could not turn payload into transfer put request.')
    }

    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId)
    const transferPutHttpRequest: MojaloopHttpRequest = {
      objectId: request.params.id,
      headers: request.headers,
      body: request.payload as TransfersIDPutResponse
    }

    // Do nothing with response
    const endpointResponse = endpoint.handleIncomingRequest(transferPutHttpRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}

export function show (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {

    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId)
    const transferGetRequest: MojaloopHttpRequest = {
      objectId: request.params.id,
      objectType: 'transfer',
      headers: request.headers,
      body: {}
    }

    // Do nothing with response
    const endpointResponse = endpoint.handleIncomingRequest(transferGetRequest)

    return reply.response().code(202)
  } catch (error) {
    return reply.response().code(500) // TODO: Give generic fail message?
  }
}
