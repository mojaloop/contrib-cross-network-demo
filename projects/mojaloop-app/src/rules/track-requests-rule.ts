import { Rule, MojaloopRequestHandler } from '../types/rule'
import { log } from '../winston'
import { MojaloopHttpRequest, MojaloopHttpReply, isTransferPostMessage, isQuotePostMessage, isQuotePutMessage, isTransferPutMessage, isQuotePutErrorRequest, isTransferPutErrorRequest } from '../types/mojaloop-packets'
import { PeerInfo } from '../types/peer'
const logger = log.child({ component: 'track-request-rule' })

export type RequestMapEntry = {
  headers: { [k: string]: any }
  body: { [k: string]: any }
  sourcePeerId: string
}

export interface TrackRequestRuleOpts {
  transferPostRequestEntryMap: Map<string, RequestMapEntry>
  transferPutRequestEntryMap: Map<string, RequestMapEntry>
  transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  quotePostRequestEntryMap: Map<string, RequestMapEntry>
  quotePutRequestEntryMap: Map<string, RequestMapEntry>
  quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
  peerId: string
}

export class TrackRequestsRule extends Rule {

  private _transferPostRequestEntryMap: Map<string, RequestMapEntry>
  private _transferPutRequestEntryMap: Map<string, RequestMapEntry>
  private _transferErrorRequestEntryMap: Map<string, RequestMapEntry>
  private _quotePostRequestEntryMap: Map<string, RequestMapEntry>
  private _quotePutRequestEntryMap: Map<string, RequestMapEntry>
  private _quoteErrorRequestEntryMap: Map<string, RequestMapEntry>
  constructor ({ transferPostRequestEntryMap, transferPutRequestEntryMap, transferErrorRequestEntryMap, quotePostRequestEntryMap, quotePutRequestEntryMap, quoteErrorRequestEntryMap, peerId }: TrackRequestRuleOpts) {
    super({
      processIncoming: async (request: MojaloopHttpRequest, next: MojaloopRequestHandler): Promise<MojaloopHttpReply> => {
        const requestEntry: RequestMapEntry = {
          headers: Object.assign({}, request.headers),
          body: Object.assign({}, request.body),
          sourcePeerId: peerId
        }
        if (isTransferPostMessage(request.body)) {
          this._transferPostRequestEntryMap.set(request.body.transferId, requestEntry)
          logger.debug('storing transfer post request', { requestEntry })
        } else if (isTransferPutMessage(request.body)) {
          this._transferPutRequestEntryMap.set(request.objectId!, requestEntry)
          logger.debug('storing transfer put request', { requestEntry })
        } else if (isQuotePostMessage(request.body)) {
          this._quotePostRequestEntryMap.set(request.body.quoteId, requestEntry)
          logger.debug('storing quote post request', { requestEntry })
        } else if (isQuotePutMessage(request.body)) {
          this._quotePutRequestEntryMap.set(request.objectId!, requestEntry)
          logger.debug('storing quote put request', { requestEntry })
        } else if (isQuotePutErrorRequest(request)) {
          this._quoteErrorRequestEntryMap.set(request.objectId!, requestEntry)
          logger.debug('storing quote put error request', { requestEntry })
        } else if (isTransferPutErrorRequest(request)) {
          this._transferErrorRequestEntryMap.set(request.objectId!, requestEntry)
          logger.debug('storing transfer put error request', { requestEntry })
        }

        return next(request)
      }
    })

    this._transferErrorRequestEntryMap = transferErrorRequestEntryMap
    this._quoteErrorRequestEntryMap = quoteErrorRequestEntryMap
    this._transferPostRequestEntryMap = transferPostRequestEntryMap
    this._transferPutRequestEntryMap = transferPutRequestEntryMap
    this._quotePostRequestEntryMap = quotePostRequestEntryMap
    this._quotePutRequestEntryMap = quotePutRequestEntryMap
  }

}
