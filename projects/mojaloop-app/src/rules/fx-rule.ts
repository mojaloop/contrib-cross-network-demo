import { Rule, MojaloopRequestHandler } from '../types/rule'
import { log } from '../winston'
import { MojaloopHttpRequest, MojaloopHttpReply, isTransferPostMessage, isQuotePostMessage, isQuotePutMessage, isTransferPutMessage, isQuotePutErrorRequest, isTransferPutErrorRequest } from '../types/mojaloop-packets'
import { Money } from '../types/mojaloop-models/money'
import { AmountType } from '../types/mojaloop-models/models'
const logger = log.child({ component: 'fx-rule' })

export interface ForeignExchangeRuleOptions {
  convertAmount: (incomingAmount: Money, quoteId?: string) => Money
}

/**
 * Applies an FX conversion to quotes and transfers.
 *
 * TODO: Should we decode the embedded transaction object and apply a conversion there too?
 * TODO: Ensure the rate applied to a quote is re-used for the corresponding transfer
 */

export class ForeignExchangeRule extends Rule {

  constructor ({ convertAmount }: ForeignExchangeRuleOptions) {
    super({
      processOutgoing: async (request: MojaloopHttpRequest, next: MojaloopRequestHandler): Promise<MojaloopHttpReply> => {
        if (isTransferPostMessage(request.body)) {
          const incomingAmount = request.body.amount
          const convertedAmount = convertAmount(incomingAmount) // TODO: Get original QuoteID from the Transaction object
          request.body.amount = convertedAmount
          logger.debug('applied FX conversion to transfer', { incomingAmount, convertedAmount })
        } else if (isQuotePostMessage(request.body) && request.body.amountType === AmountType.SEND) {
          const incomingAmount = request.body.amount
          const convertedAmount = convertAmount(incomingAmount, request.body.quoteId)
          request.body.amount = convertedAmount
          request.body.transferCurrency = convertedAmount.currency
          logger.debug('applied FX conversion to quote', { incomingAmount, convertedAmount })
        } else if (isQuotePutMessage(request.body)) {
          const incomingAmount = request.body.transferAmount
          const convertedAmount = convertAmount(incomingAmount)
          request.body.transferAmount = convertedAmount
          logger.debug('applied FX conversion to quote response', { incomingAmount, convertedAmount })
        }

        return next(request)
      }
    })

  }

}
