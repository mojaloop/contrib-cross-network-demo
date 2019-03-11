import { AxiosResponse } from 'axios'

export interface MojaloopHttpRequest {
  type: MessageType
  objectId?: number
  method: 'post' | 'put'
  headers: object
  data: object
}

export interface MojaloopHttpReply extends AxiosResponse {

}

export enum MessageType {
  transfer,
  transferError,
  quote,
  quoteError
}
