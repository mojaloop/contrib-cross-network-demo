import {v4 as uuid} from 'uuid'
import { QuotesIDPutResponse, QuotesPostRequest, TransfersPostRequest, TransfersIDPutResponse } from '../../src/types/mojaloop-models/models';
export function getHeaders (resource: string, source: string, destination?: string) {
  let headers = {
    'fspiop-source': source,
    'date': new Date(Date.now()).toUTCString(),
    'content-type': `application/vnd.interoperability.${resource}+json;version=1.0`,
    'accept': `application/vnd.interoperability.${resource}+json;version=1.0`,
  }
  if (destination) headers['fspiop-destination'] = destination
  return headers
}


export function getQuotePostMessage (amount: string, currency: string, amountType: string, quoteId: string, payeeMojaAddress: string, payerMojaAddress: string, transactionId: string = uuid(), transferCurrency: string = currency): QuotesPostRequest {
  return {
    amount: {
      amount,
      currency
    },
    transferCurrency,
    amountType,
    payee: {
      partyIdInfo: {
        partyIdType: '1',
        partyIdentifier: '1',
        partySubIdOrType: payeeMojaAddress
      }
    },
    payer: {
      partyIdInfo: {
        partyIdType: '1',
        partyIdentifier: '1',
        partySubIdOrType: payerMojaAddress
      }
    },
    quoteId,
    transactionId,
    transactionType: {
      initiator: 'Payee',
      initiatorType: 'test',
      scenario: 'refund'
    }
  }
}

export function getQuotePutMessage (amount: string, currency: string, condition: string, expiration: string, ilpPacket: string, transferDestination: string): QuotesIDPutResponse {
  return {
    transferDestination,
    transferAmount: {
      amount,
      currency 
    },
    condition,
    expiration,
    ilpPacket
  }
}

export function getTransferPostMessage (amount: string, currency: string, payeeFsp: string, payerFsp: string, transferId: string, quoteId: string, expiration: string, ilpPacket: string, condition: string): TransfersPostRequest {
  return {
    transferId,
    quoteId,
    amount: {
      amount,
      currency
    },
    condition,
    expiration,
    ilpPacket,
    payeeFsp,
    payerFsp
  }
}

export function getTransferPutMessage (transferState: string, completedTimestamp?: string, fulfilment?: string): TransfersIDPutResponse {
  return {
    transferState,
    completedTimestamp,
    fulfilment
  }
}