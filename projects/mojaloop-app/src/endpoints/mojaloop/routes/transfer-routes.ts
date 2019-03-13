import * as hapi from 'hapi'
import * as TransfersController from '../controllers/transfers-controller'
import { ExtensionListValidation, MoneyValidation, IlpPacketValidation, ExpirationValidation, ConditionValidation } from './validation';

const BaseJoi = require('joi-currency-code')(require('joi'))
const dateExtension = require('joi-date-extensions')
const Joi = BaseJoi.extend(dateExtension)
const tags = ['api', 'transfers']
const transferState = ['RECEIVED', 'RESERVED', 'COMMITTED', 'ABORTED', 'SETTLED']
export const TransferRoutes: hapi.ServerRoute[] = [
  {
    method: 'POST',
    path: '/{peerId}/transfers',
    handler: TransfersController.create,
    options: {
      tags,
      auth: undefined,
      description: 'Transfer API.',
      payload: {
        failAction: 'error',
        output: 'data'
      },
      validate: {
        headers: Joi.object({
          'accept': Joi.string().optional().regex(/application\/vnd.interoperability[.]/),
          'content-type': Joi.string().required().regex(/application\/vnd.interoperability[.]/),
          'content-length': Joi.number().max(5242880),
          'date': Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
          'x-forwarded-for': Joi.string().optional(),
          'fspiop-source': Joi.string().required(),
          'fspiop-destination': Joi.string().optional(),
          'fspiop-encryption': Joi.string().optional(),
          'fspiop-signature': Joi.string().optional(),
          'fspiop-uri': Joi.string().optional(),
          'fspiop-http-method': Joi.string().optional()
        }).unknown(false).options({ stripUnknown: true }),
        payload: {
          transferId: Joi.string().guid().required().description('Id of transfer').label('@ Transfer Id must be in a valid GUID format. @'),
          payeeFsp: Joi.string().required().min(1).max(32).description('Financial Service Provider of Payee').label('@ A valid Payee FSP number must be supplied. @'),
          payerFsp: Joi.string().required().min(1).max(32).description('Financial Service Provider of Payer').label('@ A valid Payer FSP number must be supplied. @'),
          amount: Joi.object().keys(MoneyValidation).required().description('Amount of the transfer').label('@ Supplied amount fails to match the required format. @'),
          ilpPacket: IlpPacketValidation,
          condition: ConditionValidation,
          expiration: ExpirationValidation,
          extensionList: Joi.object().keys(ExtensionListValidation).optional().description('Extension list')
        },
        failAction: (request, h, err) => { throw err }
      }
    }
  },
  {
    method: 'PUT',
    path: '/{peerId}/transfers/{id}',
    handler: TransfersController.update,
    options: {
      id: 'transfer_fulfilment',
      tags,
      description: 'Fulfil a transfer',
      payload: {
        failAction: 'error'
      },
      validate: {
        headers: Joi.object({
          'content-type': Joi.string().required().regex(/application\/vnd.interoperability[.]/),
          'date': Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
          'x-forwarded-for': Joi.string().optional(),
          'fspiop-source': Joi.string().required(),
          'fspiop-destination': Joi.string().optional(),
          'fspiop-encryption': Joi.string().optional(),
          'fspiop-signature': Joi.string().optional(),
          'fspiop-uri': Joi.string().optional(),
          'fspiop-http-method': Joi.string().optional()
        }).unknown(false).options({ stripUnknown: true }),
        params: {
          id: Joi.string().required().description('path'),
          peerId: Joi.string().required()
        },
        payload: {
          fulfilment: Joi.string().regex(/^[A-Za-z0-9-_]{43}$/).max(48).optional().description('fulfilment of the transfer').label('@ Invalid transfer fulfilment description. @'),
          completedTimestamp: Joi.string().regex(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:(\.\d{3}))(?:Z|[+-][01]\d:[0-5]\d)$/).optional().description('When the transfer was completed').label('@ A valid transfer completion date must be supplied. @'),
          transferState: Joi.string().required().valid(transferState).description('State of the transfer').label('@ Invalid transfer state given. @'),
          extensionList: Joi.object().keys(ExtensionListValidation).optional().description('Extension list')
        }
      }
    }
  }
]
