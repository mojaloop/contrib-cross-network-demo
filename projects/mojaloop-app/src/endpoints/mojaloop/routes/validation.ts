const BaseJoi = require('joi-currency-code')(require('joi'))
const Extension = require('joi-date-extensions')
const Joi = BaseJoi.extend(Extension)

export const ExpirationValidation = Joi.string().optional().regex(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:(\.\d{3}))(?:Z|[+-][01]\d:[0-5]\d)$/).description('When the transfer expires').label('@ A valid transfer expiry date must be supplied. @')
export const IlpPacketValidation = Joi.string().required().regex(/^[A-Za-z0-9-_]+[=]{0,2}$/).min(1).max(32768).description('ilp packet').label('@ Supplied ILPPacket fails to match the required format. @')
export const ConditionValidation = Joi.string().required().trim().max(48).regex(/^[A-Za-z0-9-_]{43}$/).description('Condition of transfer').label('@ A valid transfer condition must be supplied. @')

export const partyIdInfoValidation = {
  partyIdType: Joi.string().required().max(32),
  partyIdentifier: Joi.string().required().max(128).description('Party identifier'),
  partySubIdOrType: Joi.string().optional().max(128),
  fspId: Joi.string().optional().max(32).description('Financial Services Provider Id')
}

export const PartyComplexNameValidation = {
  firstName: Joi.string().optional().description('First Name'),
  middleName: Joi.string().optional().description('Middle Name'),
  lastName: Joi.string().optional().description('Last Name')
}

export const PartyPersonalInfoValidation = {
  complexName: Joi.object().keys(PartyComplexNameValidation).optional(),
  dateOfBirth: Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').optional()
}

export const PartyValidation = {
  partyIdInfo: Joi.object().keys(partyIdInfoValidation),
  merchantClassificationCode: Joi.string().optional().max(128).description('Merchant Classification Code'),
  name: Joi.string().optional().description('Name'),
  personalInfo: Joi.object().keys(PartyPersonalInfoValidation)
}

export const MoneyValidation = {
  currency: Joi.string().required().currency().description('Currency of the transfer').label('@ Currency needs to be a valid ISO 4217 currency code. @'),
  amount: Joi.string().required().regex(/^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/).description('Amount of the transfer')
}

export const RefundValidation = {
  originalTransactionId: Joi.string().guid().required().description('Id of transaction').label('@ Original transaction Id must be in a valid GUID format. @'),
  refundReason: Joi.string().optional().max(128).description('Free text indicating the reason for the refund.')
}

export const TransactionTypeValidation = {
  scenario: Joi.string().required().max(32).description('Deposit, withdrawal, refund, …'),
  subScenario: Joi.string().optional().max(32).description('Possible sub-scenario, defined locally within the scheme.'),
  initiator: Joi.string().required().max(32).description('Who is initiating the transaction - Payer or Payee.'),
  initiatorType: Joi.string().required().max(32).description('Consumer, agent, business, …'),
  refundInfo: Joi.object().keys(RefundValidation).optional(),
  balanceOfPayments: Joi.string().optional().regex(/^[1-9]\d{2}$/).description('Balance of Payments code.').label('@ Supplied code fails to match the required format. @')
}

export const GeoCodeValidation = {
  latitude: Joi.string().required().regex(/^(\+|-)?(?:90(?:(?:\.0{1,6})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,6})?))$/).description('Latitude').label('@ Supplied latitude fails to match the required format. @'),
  longitude: Joi.string().required().regex(/^(\+|-)?(?:180(?:(?:\.0{1,6})?)|(?:[0-9]|[1-9][0-9]|1[0-7][0-9])(?:(?:\.[0-9]{1,6})?))$/).description('Latitude').label('@ Supplied longitude fails to match the required format. @')
}

export const ExtensionListValidation = {
  extension: Joi.array().items(Joi.object().keys({
    key: Joi.string().required().min(1).max(32).description('Key').label('@ Supplied key fails to match the required format. @'),
    value: Joi.string().required().min(1).max(128).description('Value').label('@ Supplied key value fails to match the required format. @')
  })).required().min(1).max(16).description('extension')
}

export const ErrorInformationValidation = {
  errorCode: Joi.string().required().max(128).description('Specific error number.'),
  errorDescription: Joi.string().required().max(128).description('Error description string.'),
  extensionList: Joi.object().keys(ExtensionListValidation).optional()
}
