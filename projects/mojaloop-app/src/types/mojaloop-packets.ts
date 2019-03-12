import { AxiosResponse } from 'axios'
import { QuotesPostRequest, QuotesIDPutResponse, TransfersPostRequest, TransfersIDPutResponse, ErrorInformationObject } from './mojaloop-models/models'


export type MojaloopMessage = QuotesIDPutResponse | QuotesPostRequest | TransfersIDPutResponse | TransfersPostRequest | ErrorInformationObject

export type MojaloopHttpRequest = {
  objectId?: number
  headers: object
  body: MojaloopMessage
}
export type MojaloopHttpReply = AxiosResponse

export function isQuotePost (message: MojaloopMessage): message is QuotesPostRequest {
  return (message as QuotesPostRequest).quoteId !== undefined
}

export function isQuotePut (message: MojaloopMessage): message is QuotesIDPutResponse {
  return (message as QuotesIDPutResponse).transferAmount !== undefined
}

export function isTransferPost (message: MojaloopMessage): message is TransfersPostRequest {
  return (message as TransfersPostRequest).transferId !== undefined
}

export function isTransferPut (message: MojaloopMessage): message is TransfersIDPutResponse {
  return (message as TransfersIDPutResponse).transferState !== undefined
}
