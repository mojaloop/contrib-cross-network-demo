import { AxiosResponse } from 'axios'
import { QuotesPostRequest, QuotesIDPutResponse, TransfersPostRequest, TransfersIDPutResponse, ErrorInformationObject } from './mojaloop-models/models'

export interface GetRequest {}
export type MojaloopMessage = QuotesIDPutResponse | QuotesPostRequest | TransfersIDPutResponse | TransfersPostRequest | ErrorInformationObject | GetRequest

export type MojaloopHttpRequest = {
  objectId?: string
  objectType?: 'transfer' | 'quote'
  headers: object
  body: MojaloopMessage
}
export type MojaloopHttpReply = AxiosResponse

export function isError (message: MojaloopMessage): message is ErrorInformationObject {
  return (message as ErrorInformationObject).errorInformation !== undefined
}

export function isGet (message: MojaloopMessage): message is GetRequest {
  return Object.keys(message).length === 0
}

export function isQuotePostMessage (message: MojaloopMessage): message is QuotesPostRequest {
  return (message as QuotesPostRequest).quoteId !== undefined
}

export function isQuotePutErrorRequest (request: MojaloopHttpRequest): boolean {
  return request.objectId !== undefined && request.objectType === 'quote' && isError(request.body)
}

export function isQuotePutMessage (message: MojaloopMessage): message is QuotesIDPutResponse {
  return (message as QuotesIDPutResponse).transferAmount !== undefined
}

export function isQuoteGetRequest (request: MojaloopHttpRequest): boolean {
  return request.objectId !== undefined && request.objectType === 'quote' && isGet(request.body)
}

export function isTransferPostMessage (message: MojaloopMessage): message is TransfersPostRequest {
  return (message as TransfersPostRequest).transferId !== undefined
}

export function isTransferPutErrorRequest (request: MojaloopHttpRequest): boolean {
  return request.objectId !== undefined && request.objectType === 'transfer' && isError(request.body)
}

export function isTransferPutMessage (message: MojaloopMessage): message is TransfersIDPutResponse {
  return (message as TransfersIDPutResponse).transferState !== undefined
}

export function isTransferGetRequest (request: MojaloopHttpRequest): boolean {
  return request.objectId !== undefined && request.objectType === 'transfer' && isGet(request.body)
}
