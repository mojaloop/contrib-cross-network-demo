import * as hapi from 'hapi'
import { MojaloopHttpRequest, isTransferPostMessage, MojaloopMessage, isTransferPutMessage } from '../../../types/mojaloop-packets'
import { TransfersPostRequest, TransfersIDPutResponse } from '../../../types/mojaloop-models/models'
import { MojaloopHttpEndpoint } from '../mojaloop-http'
import { log } from '../../../winston'

const logger = log.child({ component: 'Transfers-Controller' })

export function create (request: hapi.Request, reply: hapi.ResponseToolkit) {
  try {
    logger.debug('Received post from ' + request.path, { data: request.payload, headers: request.headers })
    if (!isTransferPostMessage(request.payload as MojaloopMessage)) {
      logger.error('Could not turn payload into transfer post request.')
      throw new Error('Could not turn payload into transfer post request.')
    }
    const currency = (request.payload as TransfersPostRequest).amount.currency
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId, currency)
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
    logger.debug('Received put from ' + request.path, { data: request.payload, headers: request.headers })
    if (!isTransferPutMessage(request.payload as MojaloopMessage)) {
      throw new Error('Could not turn payload into transfer put request.')
    }

    const storedTransfer = request.server.methods.getStoredTransferById(request.params.id)
    const currency = storedTransfer.body.amount.currency
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId, currency)
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
    logger.debug('Received get from ' + request.path, { data: request.payload, headers: request.headers })
    const storedTransfer = request.server.methods.getStoredTransferById(request.params.id)
    const currency = storedTransfer.body.amount.currency
    const endpoint: MojaloopHttpEndpoint = request.server.methods.getEndpoint(request.params.peerId, currency)
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
