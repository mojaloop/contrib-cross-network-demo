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
 * Below are the allowed values for the enumeration. - RECEIVED - Next ledger has received the transfer. - RESERVED - Next ledger has reserved the transfer. - COMMITTED - Next ledger has successfully performed the transfer. - ABORTED - Next ledger has aborted the transfer due to a rejection or failure to perform the transfer.
 */
export type TransferState = 'RECEIVED' | 'RESERVED' | 'COMMITTED' | 'ABORTED'

export const TransferState = {
  RECEIVED: 'RECEIVED' as TransferState,
  RESERVED: 'RESERVED' as TransferState,
  COMMITTED: 'COMMITTED' as TransferState,
  ABORTED: 'ABORTED' as TransferState
}
