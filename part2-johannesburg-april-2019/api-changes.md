# Changes for Mojaloop API (Part 2)

This document proposes changes to the Mojaloop API that have arisen as outputs of the cross-network POC work.

> This document is a "living document" and will be updated as the cross-network POC evolves and as the impact on the API is clarified.

## Discovery of receiver accounts and currencies

The current API defines a flow for discovery of the payee and payee details using a combination of the `/parties` and `/participants` API.

Ultimately this results in the sending DFSP getting a `Party` response which provides details of the payee. It is anticipated that the sending DFSP will use this information (such as `Party.name`) to render appropriate options to the sender for making a payment.

It is not currently possible to determine the currency of the payee's account from the `Party` data model.

Page 80 of the API specification suggests that the API support a query string for the purposes of filtering:

> This HTTP request should support a query string (see Section 3.1.3 for more information regarding URI syntax) for filtering of currency. To use filtering of currency, the HTTP request GET /participants/<Type>/<ID>?currency=XYZ should be used, where XYZ is the requested currency.

However this only allows the sender to filter out payees that would require a cross-currency transfer, it doesn't allow the sender to determine the currency of the payee's account if they sender is willing to make a cross-currency transfer.

## Overloading of Party and Account

The current API assumes that the recipient of a transaction is defined by an instance of `Party` describing the payee entity. (There is an accommodation for a _`partyIdInfo`_ of type `ACCOUNTID`, however there is no way for this to be combined with an identifier of MSISDN. i.e. The payee can't be identified by both their MSISDN and their account.)

In the case where the identifier of the account is not universally unique it must be combined with the MSISDN or other payee identifier to provide the necessary granularity required for the payee FSP to route the funds to the correct account or at least accurately respond to quote requests.

## Privacy

The design of a mechanism for the discovery of accounts, and routing of quotes and payments to those accounts, needs to be done in a privacy preserving manner. It should not be possible during the lookup flow for a sender to discover more information about the receiver than the receiver is prepared to share or than is needed to make the payment.

## Proposal

The following updates to the API would facilitate cross-currency quotes and transfers and the necessary lookups to facilitate these.

### Update `Party`

The `Party` data model should be updated to include a new `addresses` data element:

| Data Element               | Cardinality | Type        | Description     |
|----------------------------|------------ |-------------|-----------------|
| partyIdInfo                | 1    | `PartyIdInfo` | Party Id type, id, sub ID or type, and FSP Id |
| merchantClassificationCode | 0..1 | `MerchantClassificationCode` | Used in the context of Payee Information, where the Payee happens to be a merchant accepting merchant payments |
| name                       | 0..1 | `PartyName` | Display name of the Party, could be a real name or a nickname |
| personalInfo               | 0..1 | `PartyPersonalInfo` | Personal information used to verify identity of Party such as first, middle, last name and date of birth |
| addresses                   | 0..1 | `AddressList` | A list of addresses that can be used to route payments to the party |

### Add `AddressList` and `Address` data types

The `AddressList` data model is defined as:

| Data Element               | Cardinality | Type        | Description                |
|----------------------------|------------ |-------------|----------------------------|
| address                    | 1..16       | `Address`   | Number of address elements |

The `Address` data model is defined as:

| Data Element        | Cardinality | Type             | Description                 |
|---------------------|------------ |------------------|-----------------------------|
| address             | 0..1        | `Address`        | An address of the payee     |
| currency            | 1           | `Currency`       | The currency of the account |

The `Address` data type is a variable length string with a maximum size of 1023 characters and consists of:
  - Alphanumeric characters, upper or lower case. (Addresses are case-sensitive so that they can contain data encoded in formats such as base64url.)
  - Underscore (_)
  - Tilde (~)
  - Hyphen (-)
  - Period (.)
Addresses MUST NOT end in a period (.) character

An entity providing accounts to parties (i.e. a participant) can provide any value for an `Address` that is **routable** to that entity. It does not need to provide an address that makes the account identifiable outside the entity's domain. i.e. This is an address not an identifier

For example, a participant (Blue DFSP) that controls the address space `moja.blue` might allocate a random UUID to the account and return the value:
```json
{
  "address" : "moja.blue.8f027046-b82a-4fa9-838b-70210fcf8137",
  "currency" : "ZAR" 
}
```
_This address is *routable* to Blue DFSP because it uses the prefix `moja.blue`_

Blue DFSP may also simply use their own address if that is sufficient (in combination with the remainder of the `PartyIdInfo`) to uniquely identify the payee and the destination account.
```json
{
  "address" : "moja.blue",
  "currency" : "ZAR" 
}
```

_This address is also *routable* to Blue DFSP because it uses the prefix `moja.blue`_

**IMPORTANT**: The policy for defining addresses and the life-cycle of these is at the discretion of the address space owner (the payee DFSP in this case)

### Use the address in the Party.PartyIdInfo.PartySubIdOrType to assist in multi-hop routing

If a sending DFSP has an address for the payee that they wish to include in a quote request to assist intermediaries in routing the quote they should include this in the `Party.PartyIdInfo.PartySubIdOrType` data element.

Intermediaries that need to route a quote request via FX providers or Cross-network providers/gateways will determine the next hop of the quote request by consulting their internal routing tables using the address as the lookup value.
