/**
 * Open API for FSP Interoperability (FSPIOP) (Implementation Friendly Version)
 * Based on [API Definition version 1.0](https://github.com/mojaloop/mojaloop-specification/blob/develop/API%20Definition%20v1.0.pdf).  **Note:** The API supports a maximum size of 65536 bytes (64 Kilobytes) in the HTTP header.
 *
 * OpenAPI spec version: 1.0
 *
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */

/**
 * Below are the allowed values for the enumeration. - MSISDN - An MSISDN (Mobile Station International Subscriber Directory Number, that is, the phone number) is used as reference to a participant. The MSISDN identifier should be in international format according to the [ITU-T E.164 standard](https://www.itu.int/rec/T-REC-E.164/en). Optionally, the MSISDN may be prefixed by a single plus sign, indicating the international prefix. - EMAIL - An email is used as reference to a participant. The format of the email should be according to the informational [RFC 3696](https://tools.ietf.org/html/rfc3696). - PERSONAL_ID - A personal identifier is used as reference to a participant. Examples of personal identification are passport number, birth certificate number, and national registration number. The identifier number is added in the PartyIdentifier element. The personal identifier type is added in the PartySubIdOrType element. - BUSINESS - A specific Business (for example, an organization or a company) is used as reference to a participant. The BUSINESS identifier can be in any format. To make a transaction connected to a specific username or bill number in a Business, the PartySubIdOrType element should be used. - DEVICE - A specific device (for example, a POS or ATM) ID connected to a specific business or organization is used as reference to a Party. For referencing a specific device under a specific business or organization, use the PartySubIdOrType element. - ACCOUNT_ID - A bank account number or FSP account ID should be used as reference to a participant. The ACCOUNT_ID identifier can be in any format, as formats can greatly differ depending on country and FSP. - IBAN - A bank account number or FSP account ID is used as reference to a participant. The IBAN identifier can consist of up to 34 alphanumeric characters and should be entered without whitespace. - ALIAS An alias is used as reference to a participant. The alias should be created in the FSP as an alternative reference to an account owner. Another example of an alias is a username in the FSP system. The ALIAS identifier can be in any format. It is also possible to use the PartySubIdOrType element for identifying an account under an Alias defined by the PartyIdentifier.
 */
export type PartyIdType = 'MSISDN' | 'EMAIL' | 'PERSONAL_ID' | 'BUSINESS' | 'DEVICE' | 'ACCOUNT_ID' | 'IBAN' | 'ALIAS'

export const PartyIdType = {
  MSISDN: 'MSISDN' as PartyIdType,
  EMAIL: 'EMAIL' as PartyIdType,
  PERSONALID: 'PERSONAL_ID' as PartyIdType,
  BUSINESS: 'BUSINESS' as PartyIdType,
  DEVICE: 'DEVICE' as PartyIdType,
  ACCOUNTID: 'ACCOUNT_ID' as PartyIdType,
  IBAN: 'IBAN' as PartyIdType,
  ALIAS: 'ALIAS' as PartyIdType
}
