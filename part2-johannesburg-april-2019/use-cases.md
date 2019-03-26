# In-Network FX

## Use Case: Alice (USD) at Blue Mobile sends money to Bob (XOF) at Red Mobile

 - Blue Mobile and Red Mobile are on the same network and connected to the same Mojaloop switch.
 - Alice wishes to send money to Bob. 
 - Alice is unaware of the currencies that Bob is able to receive.

**Constraints:** 

  1. In order to give Alice a complete quote, Blue Mobile must know the currency that Bob will receive.  
i.e. Blue Mobile needs to prompt Alice:  "If you send 10 USD, Bob will receive 12 XOF after fees and commissions."
  2. In order to correctly route a quote or transfer the switch must know:
      1. if the incoming quote/transfer is the same currency and the destination account
      2. if the destination DFSP is able to perform FX

## Use Case 1: Alice sends a fixed amount (5 USD) to Bob using current API

### Lookup


Blue Mobile issues a `/parties` lookup to the hub.
Relevant response details:
- Party.PartyIdInfo.PartyIdType: `MSISDN`
- Party.PartyIdInfo.PartyIdentifier: `279862387676253`
- Party.PartyIdInfo.FspId: `red`

Through the `/participants` API Blue Mobile discovers that Red Mobile only accepts XOF.

Blue Mobile does not do FX so it sends a quote to the hub with no `FSPIOP-Destination` hoping the hub can route the quote to an appropriate FX provider.

## Quote

Alice requests Quote for payment of USD 5 to Bob by sending quote to hub with no `FSPIOP-Destination`
 - Payee: Bob
 - AmountType: SEND
 - Amount: USD 5

The hub must routes the quote to an FXP.
  - **Question 1:** How does the hub determine that this quote must go to the FXP rather than directly to Red Mobile? The only hint is the currency of the send amount but this assumes the hub knows that Red Mobile doesn't accept that currency.
  - **Question 2:** What data elements change in the quote message sent to the FXP? Does the hub add an `FSPIOP-Destination` header?

The FXP accepts the quote and note that it is receiving USD (from `amount` data element in the quote)

The FXP needs to determine the destination currency to apply the conversion.

  - **Question 3:** How does the FXP determine the destination currency? The best data it has to work with is the `payee` data element.

FXP sends quote to Red Mobile (via hub)
 - Payee: Bob
 - AmountType: SEND
 - Amount: XOF 1000 (Conversion from 5 USD with fees and commissions applied)

Red Mobile responds:
 - TransferAmount: XOF 1000
 - PayeeReceiveAmount: XOF 990
 - PayeeFspFee: XOF 3
 - PayeeFspCommission: XOF 7

FXP responds to Blue Mobile
 - TransferAmount: USD 5
 - PayeeReceiveAmount: XOF 990
 - PayeeFspFee: XOF 3
 - PayeeFspCommission: XOF 7

  - **Question 4:** How does the FXP provide details to Blue Mobile on the FX, feeds and commissions?



## Notes

- Does Alice's DFSP discover the receiving currency during the lookup or during the quote?

 - Red Mobile could return a list of supported currencies in the `/parties` response. See API change proposal [here](./api-changes.md) for details. This would allow Blue Mobile to make early UX determinations with regard to how they prompt Alice to continue with the transaction. E.g. Bob only accepts XOF, do you want to continue? Do you want to send a fixed XOF amount or a fixed USD amount?

 - If there are multiple options how does Alice's DFSP specify a fixed receive amount? 

  - If Alice's DFSP is able to send in multiple currencies should they be able to apply the FX before sending?

  - Is it sufficient to simply know which currencies **Bob's DFSP** accepts or is it necessary to know currencies Bob has accounts in?
