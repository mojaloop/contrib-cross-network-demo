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
 * Below are the allowed values for the enumeration. - RECEIVED - Payee FSP has received the bulk transfer from the Payer FSP. - PENDING - Payee FSP has validated the bulk transfer. - ACCEPTED - Payee FSP has accepted to process the bulk transfer. - PROCESSING - Payee FSP has started to transfer fund to the Payees. - COMPLETED - Payee FSP has completed transfer of funds to the Payees. - REJECTED - Payee FSP has rejected to process the bulk transfer.
 */
export type BulkTransferState = 'RECEIVED' | 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'

export const BulkTransferState = {
  RECEIVED: 'RECEIVED' as BulkTransferState,
  PENDING: 'PENDING' as BulkTransferState,
  ACCEPTED: 'ACCEPTED' as BulkTransferState,
  PROCESSING: 'PROCESSING' as BulkTransferState,
  COMPLETED: 'COMPLETED' as BulkTransferState,
  REJECTED: 'REJECTED' as BulkTransferState
}
