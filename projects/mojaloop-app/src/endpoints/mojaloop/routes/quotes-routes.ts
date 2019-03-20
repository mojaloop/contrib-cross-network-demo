import * as hapi from 'hapi'
import * as QuotesController from '../controllers/quotes-controller'
import * as QuotesErrorController from '../controllers/quotes-error-controller'
import {
  PartyValidation,
  MoneyValidation,
  TransactionTypeValidation,
  GeoCodeValidation,
  ExtensionListValidation,
  ExpirationValidation,
  IlpPacketValidation,
  ConditionValidation,
  ErrorInformationValidation, 
  Headers } from './validation'
const BaseJoi = require('joi-currency-code')(require('joi'))
const Extension = require('joi-date-extensions')
const Joi = BaseJoi.extend(Extension)
const tags = ['api', 'quotes']
export const QuotesRoutes: hapi.ServerRoute[] = [
  {
    method: 'POST',
    path: '/{peerId}/quotes',
    handler: QuotesController.create,
    options: {
      tags,
      auth: undefined,
      description: 'Quote API.',
      payload: {
        failAction: 'error',
        output: 'data'
      },
      validate: {
        headers: Joi.object().keys(Headers).unknown(false).options({ stripUnknown: true }),
        payload: {
          quoteId: Joi.string().guid().required().description('Id of transfer').label('@ Transfer Id must be in a valid GUID format. @'),
          transactionId: Joi.string().guid().required().description('Id of transaction').label('@ Transaction Id must be in a valid GUID format. @'),
          transactionRequestId: Joi.string().guid().optional().description('Id of transaction').label('@ Transaction Id must be in a valid GUID format. @'),
          payee: Joi.object().keys(PartyValidation).required(),
          payer: Joi.object().keys(PartyValidation).required(),
          amountType: Joi.string().required().valid('SEND', 'RECEIVE').description('SEND for send amount, RECEIVE for receive amount.'),
          amount: Joi.object().keys(MoneyValidation).required().description('Amount of the transfer').label('@ Supplied amount fails to match the required format. @'),
          fees: Joi.object().keys(MoneyValidation).optional().description('Fees charged to perform the transfer'),
          transactionType: Joi.object().keys(TransactionTypeValidation).required(),
          geoCode: Joi.object().keys(GeoCodeValidation).optional(),
          note: Joi.string().optional().trim().max(128).description('A memo that will be attached to the transaction.'),
          expiration: ExpirationValidation,
          extensionList: Joi.object().keys(ExtensionListValidation).optional().description('Extension list')
        },
        failAction: (request, h, err) => { throw err }
      }
    }
  },
  {
    method: 'PUT',
    path: '/{peerId}/quotes/{id}',
    handler: QuotesController.update,
    options: {
      tags,
      auth: undefined,
      description: 'Quote API.',
      payload: {
        failAction: 'error',
        output: 'data'
      },
      validate: {
        headers: Joi.object().keys(Headers).unknown(false).options({ stripUnknown: true }),
        payload: {
          transferAmount: Joi.object().required().keys(MoneyValidation).description('Amount to transfer'),
          payeeReceiveAmount: Joi.object().optional().keys(MoneyValidation).description('Amount that the payee should receive in the end'),
          payeeFspFee: Joi.object().optional().keys(MoneyValidation),
          payeeFspCommission: Joi.object().optional().keys(MoneyValidation),
          expiration: ExpirationValidation,
          geoCode: Joi.object().keys(GeoCodeValidation).optional(),
          ilpPacket: IlpPacketValidation,
          condition: ConditionValidation,
          extensionList: Joi.object().keys(ExtensionListValidation).optional().description('Extension list')
        },
        failAction: (request, h, err) => { throw err }
      }
    }
  },
  {
    method: 'GET',
    path: '/{peerId}/quotes/{id}',
    handler: QuotesController.show,
    options: {
      tags,
      description: 'Get a quote',
      validate: {
        headers: Joi.object().keys(Headers).unknown(false).options({ stripUnknown: true }),
        params: {
          id: Joi.string().required().description('Id of quote'),
          peerId: Joi.string().required()
        },
        failAction: (request, h, err) => { throw err }
      }
    }
  },
  {
    method: 'PUT',
    path: '/{peerId}/quotes/{id}/error',
    handler: QuotesErrorController.update,
    options: {
      tags,
      description: 'Put a quote error',
      payload: {
        failAction: 'error'
      },
      validate: {
        headers: Joi.object().keys(Headers).unknown(false).options({ stripUnknown: true }),
        params: {
          id: Joi.string().required().description('Id of quote'),
          peerId: Joi.string().required()
        },
        payload: {
          errorInformation: Joi.object().keys(ErrorInformationValidation).required()
        },
        failAction: (request, h, err) => { throw err }
      }
    }
  }
]
