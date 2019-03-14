import { Rule, MojaloopRequestHandler } from '../types/rule'
import { MojaloopHttpRequest, MojaloopHttpReply, isTransferPostMessage, isQuotePostMessage, isQuotePutMessage, isTransferPutMessage, isQuotePutErrorRequest, isTransferPutErrorRequest } from '../types/mojaloop-packets'

export type RequestMapEntry = {
  headers: { [k: string]: any }
  sentPut: boolean
}

export interface TrackRequestRuleOpts {
  transferRequestEntryMap: Map<string, RequestMapEntry>
  transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  quoteRequestEntryMap: Map<string, RequestMapEntry>
  quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
}

export class TrackRequestsRule extends Rule {

  private _transferRequestEntryMap: Map<string, RequestMapEntry>
  private _transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  private _quoteRequestEntryMap: Map<string, RequestMapEntry>
  private _quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
  constructor ({ transferRequestEntryMap, transferErrorRequestEntryMap, quoteRequestEntryMap, quoteErrorRequestEntryMap }: TrackRequestRuleOpts) {
    super({
      processIncoming: async (request: MojaloopHttpRequest, next: MojaloopRequestHandler): Promise<MojaloopHttpReply> => {

        if (isTransferPostMessage(request.body)) {
          this._transferRequestEntryMap.set(request.body.transferId, {
            headers: request.headers,
            sentPut: false
          })
        } else if (isQuotePostMessage(request.body)) {
          this._quoteRequestEntryMap.set(request.body.quoteId, {
            headers: request.headers,
            sentPut: false
          })
        } else if (isQuotePutErrorRequest(request)) {
          this._quoteErrorRequestEntryMap.set(request.objectId!, {
            headers: request.headers,
            sentPut: false
          })
        } else if (isTransferPutErrorRequest(request)) {
          this._transferErrorRequestEntryMap.set(request.objectId!, {
            headers: request.headers,
            sentPut: false
          })
        }

        return next(request)
      },
      processOutgoing: async (request: MojaloopHttpRequest, next: MojaloopRequestHandler): Promise<MojaloopHttpReply> => {

        let requestEntry: RequestMapEntry | undefined

        if (isQuotePutMessage(request.body)) {
          requestEntry = this._quoteRequestEntryMap.get(request.objectId || '')
        } else if (isTransferPutMessage(request.body)) {
          requestEntry = this._transferRequestEntryMap.get(request.objectId || '')
        } else if (isQuotePutErrorRequest(request)) {
          requestEntry = this._quoteErrorRequestEntryMap.get(request.objectId || '')
        } else if (isTransferPutErrorRequest(request)) {
          requestEntry = this._transferErrorRequestEntryMap.get(request.objectId || '')
        }

        if (requestEntry) {
          requestEntry.sentPut = true
        }

        return next(request)
      }
    })

    this._transferErrorRequestEntryMap = transferErrorRequestEntryMap
    this._quoteErrorRequestEntryMap = quoteErrorRequestEntryMap
    this._transferRequestEntryMap = transferRequestEntryMap
    this._quoteRequestEntryMap = quoteRequestEntryMap
  }

}
