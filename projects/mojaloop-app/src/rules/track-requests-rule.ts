import { Rule, MojaloopRequestHandler } from '../types/rule'
import { log } from '../winston'
import { MojaloopHttpRequest, MojaloopHttpReply, isTransferPostMessage, isQuotePostMessage, isQuotePutMessage, isTransferPutMessage, isQuotePutErrorRequest, isTransferPutErrorRequest } from '../types/mojaloop-packets'
import { PeerInfo } from '../types/peer'
const logger = log.child({ component: 'track-request-rule' })

export type RequestMapEntry = {
  headers: { [k: string]: any }
  body: { [k: string]: any }
  sentPut: boolean
  sourcePeerId: string
}

export interface TrackRequestRuleOpts {
  transferRequestEntryMap: Map<string, RequestMapEntry>
  transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  quoteRequestEntryMap: Map<string, RequestMapEntry>
  quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
  peerId: string
}

export class TrackRequestsRule extends Rule {

  private _transferRequestEntryMap: Map<string, RequestMapEntry>
  private _transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  private _quoteRequestEntryMap: Map<string, RequestMapEntry>
  private _quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
  constructor ({ transferRequestEntryMap, transferErrorRequestEntryMap, quoteRequestEntryMap, quoteErrorRequestEntryMap, peerId }: TrackRequestRuleOpts) {
    super({
      processIncoming: async (request: MojaloopHttpRequest, next: MojaloopRequestHandler): Promise<MojaloopHttpReply> => {
        const requestEntry: RequestMapEntry = {
          headers: request.headers,
          body: request.body,
          sentPut: false,
          sourcePeerId: peerId
        }
        if (isTransferPostMessage(request.body)) {
          this._transferRequestEntryMap.set(request.body.transferId, requestEntry)
          logger.debug('storing transfer post request', { requestEntry })
        } else if (isQuotePostMessage(request.body)) {
          this._quoteRequestEntryMap.set(request.body.quoteId, requestEntry)
          logger.debug('storing quote post request', { requestEntry })
        } else if (isQuotePutErrorRequest(request)) {
          this._quoteErrorRequestEntryMap.set(request.objectId!, requestEntry)
          logger.debug('storing quote put error request', { requestEntry })
        } else if (isTransferPutErrorRequest(request)) {
          this._transferErrorRequestEntryMap.set(request.objectId!, requestEntry)
          logger.debug('storing transfer put error request', { requestEntry })
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
