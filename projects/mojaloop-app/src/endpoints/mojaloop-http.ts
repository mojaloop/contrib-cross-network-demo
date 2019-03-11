import { Endpoint, RequestHandler, HttpEndpointOpts } from '@interledger/rafiki'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { MojaloopHttpRequest, MojaloopHttpReply, MessageType } from '../types/mojaloop-packets'

export class MojaloopHttpEndpoint implements Endpoint<MojaloopHttpRequest, MojaloopHttpReply> {
  private client: AxiosInstance
  private baseUrl: string
  private _handler: RequestHandler<MojaloopHttpRequest, MojaloopHttpReply>

  constructor (opts: HttpEndpointOpts) {
    const url = new URL(opts.url)
    this.baseUrl = opts.url
    this.client = axios
  }

  async sendOutgoingRequest (request: MojaloopHttpRequest, sentCallback?: () => void): Promise<MojaloopHttpReply> {

    let url: string
    if (request.type === MessageType.transfer && request.method === 'post') {
      url = '/transfers'
    } else if (request.type === MessageType.transfer && request.method === 'put') {
      url = `/transfers/${request.objectId}`
    } else if (request.type === MessageType.quote && request.method === 'post') {
      url = '/quotes'
    } else if (request.type === MessageType.quote && request.method === 'put') {
      url = `/quotes/${request.objectId}`
    } else if (request.type === MessageType.transferError) {
      url = `/transfers/${request.objectId}/error`
    } else if (request.type === MessageType.quoteError) {
      url = `/quotes/${request.objectId}/error`
    } else {
      throw new Error('Unknown message type')
    }

    return this.client.request({
      url,
      baseURL: this.baseUrl,
      method: request.method,
      headers: request.headers,
      data: request.data
    })
  }

  setIncomingRequestHandler (handler: RequestHandler<MojaloopHttpRequest, MojaloopHttpReply>) {
    this._handler = handler
    return this
  }

  async handleIncomingRequest (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> {
    return this._handler(request)
  }

}
