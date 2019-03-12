import * as hapi from 'hapi'
import { MojaloopHttpRequest, isTransferPost, MojaloopMessage, isTransferPut } from '../../../types/mojaloop-packets'
import { TransfersPostRequest, TransfersIDPutResponse } from '../../../types/mojaloop-models/models'
import { MojaloopHttpEndpoint } from '../mojaloop-http'

export function create (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    if (!isTransferPost(request.payload as MojaloopMessage)) {
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
    if (!isTransferPut(request.payload as MojaloopMessage)) {
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
