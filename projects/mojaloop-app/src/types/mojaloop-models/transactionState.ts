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
 * Below are the allowed values for the enumeration. - RECEIVED - Payee FSP has received the transaction from the Payer FSP. - PENDING - Payee FSP has validated the transaction. - COMPLETED - Payee FSP has successfully performed the transaction. - REJECTED - Payee FSP has failed to perform the transaction.
 */
export type TransactionState = 'RECEIVED' | 'PENDING' | 'COMPLETED' | 'REJECTED'

export const TransactionState = {
  RECEIVED: 'RECEIVED' as TransactionState,
  PENDING: 'PENDING' as TransactionState,
  COMPLETED: 'COMPLETED' as TransactionState,
  REJECTED: 'REJECTED' as TransactionState
}