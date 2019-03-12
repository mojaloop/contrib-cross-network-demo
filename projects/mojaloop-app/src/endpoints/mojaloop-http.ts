import { Endpoint, RequestHandler, HttpEndpointOpts } from '@interledger/rafiki'
import axios, { AxiosInstance } from 'axios'
import { MojaloopHttpRequest, MojaloopHttpReply, isTransferPost, isTransferPut, isQuotePost, isQuotePut } from '../types/mojaloop-packets'
import { QuotesPostRequest, QuotesIDPutResponse, TransfersPostRequest, TransfersIDPutResponse, ErrorInformationObject } from '../types/mojaloop-models/models'

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
    let method: string
    if (isTransferPost(request.body)) {
      url = '/transfers'
      method = 'post'
    } else if (isTransferPut(request.body)) {
      url = `/transfers/${request.objectId}`
      method = 'put'
    } else if (isQuotePost(request.body)) {
      url = '/quotes'
      method = 'post'
    } else if (isQuotePut(request.body)) {
      url = `/quotes/${request.objectId}`
      method = 'put'
    } else {
      throw new Error('Unknown message type')
    }

    return this.client.request({
      url,
      baseURL: this.baseUrl,
      method,
      headers: request.headers,
      data: request.body
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
