# Use Cases for multi-hop routing

## Use Case 1: Alice at Blue Mobile sends a fixed amount (5 USD) to Bob at Red Mobile

 - Blue Mobile and Red Mobile are on the same network and connected to the same Mojaloop switch.
 - Alice is unaware of the currencies that Bob is able to receive.
 - Bob only has an account able to receive XOF
 - There is an FX provider (FXP) on the network that can provide the FX

### Step 1 : Lookup

Blue Mobile issues a `/parties` lookup to the hub and gets back a response:

- `Party.Name`: Bob
- `Party.PartyIdInfo.PartyIdType`: MSISDN
- `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
- `Party.PartyIdInfo.FspId`: red-mobile

**Constraint 1:** There is no way through the `/participants` or `/parties` API for Blue Mobile to discover that Red Mobile only accepts XOF.

**Constraint 2:** The best Blue Mobile can do is call the `/participants` API with a `currency` filter of `USD` to determine that Red Mobile **does not** accept USD.

Blue Mobile does not do FX so let's assume it sends a quote to the switch with no `FSPIOP-Destination` header hoping the hub can route the quote via an appropriate FX provider to Red Mobile.

### Step 2: Quote

Blue Mobile sends a quote for payment of USD 5 to Bob to the switch with no `FSPIOP-Destination`

 - Header: `FSPIOP-Source`: blue-mobile
 - `Party.PartyIdInfo.PartyIdType`: MSISDN
 - `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Party.PartyIdInfo.FspId`: red-mobile
 - `AmountType`: SEND
 - `Amount`: USD 5

The switch has no `FSPIOP-Destination` header to route by so it must look at the `payee`. It identifies the destination FSP as Red Mobile.

**Constraint 3:** In order to determine that the quote should be routed to the FXP the switch must know that Red Mobile won't accept the quote in USD (and analyse the quote to determine the sending currency). 

**Constraint 4:** In the case where there are multiple FX providers offering different conversion for different currency pairs the switch MUST know the currencies Bob can accept payment in or it is unable to determine which FX providers are suitable. 

Assuming the switch has determined correctly that the quote goes to the FXP, it sends the quote on.

 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `Party.PartyIdInfo.PartyIdType`: MSISDN
 - `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Party.PartyIdInfo.FspId`: red-mobile
 - `AmountType`: SEND
 - `Amount`: USD 5

**Constraint 5:** The payee FSP for this leg of the quote is no longer Red Mobile, it is the FXP. Should the switch set the `FSPIOP-Destination` header in the message to the FXP? Should this header value be `fxp` or `red-mobile`?

The FXP accepts the quote and notes that it is receiving USD (from `amount` data element in the quote) from Blue Mobile.

The FXP needs to determine the destination currency to apply the conversion.

**Constraint 6:** How does the FXP determine the destination currency? The best data it has to work with is the `payee` data element. As with the switch the FXP must determine the currency that Bob can accept payment in.

The FXP converts 5 USD that is will receive from Blue Mobile to 1000 XOF.

It subtracts 5 XOF commission.

FXP sends a quote to Red Mobile (via the switch)
 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: red-mobile
 - `Party.PartyIdInfo.PartyIdType`: MSISDN
 - `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Party.PartyIdInfo.FspId`: red-mobile
 - `AmountType`: **SEND**
 - `Amount`: **XOF 995**

Red Mobile constructs a `Transaction` object with the details of the payer and payee from the quote. This is used to derive the condition and fulfillment.

**Constraint 6:** The `Transaction` is missing the details of the FXP that is acting as an intermediary and the FX rate, commission and fees agreed in the quote. As such these are not part of the data used to generate the fulfillment and condition.

Red Mobile sends the callback to the FXP (via the switch):
 - Header: `FSPIOP-Source`: red-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `TransferAmount`: **XOF 995**
 - `PayeeReceiveAmount`: XOF 990
 - `PayeeFspFee`: XOF 3
 - `PayeeFspCommission`: XOF 2
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

The FXP sends the callback to Blue Mobile (via the switch):
 - Header: `FSPIOP-Source`: **fxp**
 - Header: `FSPIOP-Destination`: blue-mobile
 - `TransferAmount`: **USD 5**
 - `PayeeReceiveAmount`: XOF 990
 - `PayeeFspFee`: XOF 3
 - `PayeeFspCommission`: XOF 7
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

**Constraint 7:** The FXP has no way to provide details to Blue Mobile on the FX, fees and commissions?

### Step 3: Transfer

Blue Mobile prompts Alice:
"Send 5 USD to Bob who will receive 990 XOF after fees and commission?"

Alice proceeds and a transfer is sent by Blue Mobile to FXP
 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: **fxp**
 - `Amount`: **USD 5**
 - `PayeeFsp`: red-mobile
 - `PayerFsp`: blue-mobile
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

FXP receives the incoming transfer and determines that an outgoing transfer must be made to Red Mobile.

**Constraint 8:** The route for the outgoing transfer and the rate to apply can only be determined by looking up the quote using the quote id which is buried in the transaction object inside the ILP packet. (There is a proposal to remove the packet from the transfer and put the `Transaction` object in its place which would solve for this).

 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: red-mobile
 - `Amount`: **XOF 995**
 - `PayeeFsp`: red-mobile
 - `PayerFsp`: blue-mobile
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

Red Mobile fulfills the transfer from the FXP

 - Header: `FSPIOP-Source`: red-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `Fulfillment`: 98heygf8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `TransferState`: COMMITTED

The FXP fulfills the transfer from Blue Mobile

 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: blue-mobile
 - `Fulfillment`: 98heygf8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `TransferState`: COMMITTED


## Notes

 - Red Mobile could return a list of supported currencies in the `/parties` response. See API change proposal [here](./api-changes.md) for details. This would allow Blue Mobile to make early UX determinations with regard to how they prompt Alice to continue with the transaction. E.g. Bob only accepts XOF, do you want to continue? Do you want to send a fixed XOF amount or a fixed USD amount?

 - If there are multiple options how does Alice's DFSP specify a fixed receive amount? 

  - If Alice's DFSP is able to send in multiple currencies should they be able to apply the FX before sending?

  - Is it sufficient to simply know which currencies **Bob's DFSP** accepts or is it necessary to know currencies Bob has accounts in?

