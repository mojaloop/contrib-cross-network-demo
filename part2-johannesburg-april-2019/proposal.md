# Proposal for multi-hop routing

## Use Case 1: Alice at Blue Mobile sends a fixed amount (5 USD) to Bob at Red Mobile

 - Blue Mobile and Red Mobile are on the same network and connected to the same Mojaloop switch.
 - Alice is unaware of the currencies that Bob is able to receive.
 - Bob only has an account able to receive XOF
 - There is an FX provider (FXP) on the network that can provide the FX

### Step 1.1 : Lookup

Blue Mobile issues a `/parties` lookup to the hub and gets back a response:

- `Party.Name`: Bob
- `Party.PartyIdInfo.PartyIdType`: MSISDN
- `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
- `Party.PartyIdInfo.FspId`: red-mobile
- `Party.Addresses`:
    -  `moja.network1.xof.red` : XOF
    -  `moja.network1.eur.red` : EUR

As a temporary work-around the currency and address data could be sent in the `Party.PartyIdInfo.PartySubIdOrType` as a combination of the currency and address however this limits the response to only a single available delivery currency.

- `Party.Name`: Bob
- `Party.PartyIdInfo.PartyIdType`: MSISDN
- `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
- `Party.PartyIdInfo.FspId`: red-mobile
- `Party.PartyIdInfo.PartySubIdOrType`: XOF moja.network1.xof.red

Blue Mobile does not do FX and knows that Bob can only accept XOF so it sends a quote to the switch with no `FSPIOP-Destination` header hoping the hub can route the quote via an appropriate FX provider to Red Mobile.

### Step 1.2: Quote

Blue Mobile sends a quote for payment of USD 5 to Bob to the switch with no `FSPIOP-Destination`. 

Blue Mobile specifies the `TransferCurrency` of `USD`. 

This is set by each participant to ensure the quote recipient knows what currency they will be receiving. This can't always be determined by the `Amount` as quotes may be expressed using a `RECEIVE` amount. Each intermediary will set this value before it forwards the quote onwards.

A more flexible and future-proof solution than `TransferCurrency` is discussed below in [API Changes](#api-changes)

 - Header: `FSPIOP-Source`: blue-mobile
 - `Payee.PartyIdInfo.PartyIdType`: MSISDN
 - `Payee.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Payee.PartyIdInfo.FspId`: red-mobile
 - `Payee.PartyIdInfo.PartySubIdOrType`: moja.network1.xof.red
 - `AmountType`: SEND
 - `Amount`: USD 5
 - `TransferCurrency`: USD

The switch has no `FSPIOP-Destination` header to route by so it must look at the `payee`. 
It identifies the destination FSP as Red Mobile however is also notes the presence of an address in the `Payee.PartyIdInfo.PartySubIdOrType` field.

On consulting its routing tables the switch determines that the quote must be forwarded to the FXP.

 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `Payee.PartyIdInfo.PartyIdType`: MSISDN
 - `Payee.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Payee.PartyIdInfo.FspId`: red-mobile
 - `Payee.PartyIdInfo.PartySubIdOrType`: moja.network1.xof.red
 - `AmountType`: SEND
 - `Amount`: USD 5
 - `TransferCurrency`: USD

The FXP accepts the quote and notes that it is will be receiving USD (from `transferCurrency` data element in the quote) from Blue Mobile.

The FXP needs to determine the destination currency to apply the conversion. To do this the FXP first consults its routing table to determine where to route the quote. The FXP determines that to route to `moja.network1.xof.red` it will need to send an XOF quote to Red Mobile.

The FXP converts 5 USD that it will receive from Blue Mobile to 1000 XOF.
It subtracts a 5 XOF fee.
FXP sends a quote to Red Mobile (via the switch)

 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: red-mobile
 - `Payee.PartyIdInfo.PartyIdType`: MSISDN
 - `Payee.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Payee.PartyIdInfo.FspId`: red-mobile
 - `Payee.PartyIdInfo.PartySubIdOrType`: moja.network1.xof.red
 - `AmountType`: **SEND**
 - `Amount`: **XOF 995**
 - `TransferCurrency`: XOF

Red Mobile will take a 5 XOF fee so Bob will get 990 XOF. Red Mobile constructs a `Transaction` object with the details of the payer and payee from the quote. This is used to derive the condition and fulfillment.

The quote response contains a `TransferDestination` data element telling the recipient of the quote where they must send a transfer if they wish to accept this quote.

It is likely that this will be the same information that is present in the `FSPIOP-Source` header however it is preferable that the message routing data is not mixed with data from the message body so it is specified in a new data element in the callback body.

Red Mobile sends the callback to the FXP (via the switch):
 - Header: `FSPIOP-Source`: red-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `TransferAmount`: **XOF 995**
 - `TransferDestination`: **red-mobile**
 - `PayeeReceiveAmount`: XOF 990
 - `PayeeFspFee`: XOF 5
 - `PayeeFspCommission`: XOF 0
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

The FXP will record this quote response as it needs to recall this information when it gets a corresponding transfer.

The FXP the sends the callback to Blue Mobile (via the switch):
 - Header: `FSPIOP-Source`: **fxp**
 - Header: `FSPIOP-Destination`: blue-mobile
 - `TransferAmount`: **USD 5**
 - `TransferDestination`: **fxp**
 - `PayeeReceiveAmount`: XOF 990
 - `PayeeFspFee`: XOF 3
 - `PayeeFspCommission`: XOF 2
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

**Constraint:** The FXP still has no way to provide details to Blue Mobile on the FX, fees and commissions it charges? A more sophisticated data model change is proposed below that addresses this.

### Step 1.3: Transfer

Blue Mobile prompts Alice:
"Send 5 USD to Bob who will receive 990 XOF?"

Alice proceeds and a transfer is sent by Blue Mobile to FXP
 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: **fxp**
 - `Amount`: **USD 5**
 - `PayeeFsp`: **fxp**
 - `PayerFsp`: blue-mobile
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

The FXP receives the incoming transfer and pulls the `quoteid` from the encoded `Transaction` object. 
Based on the stored quote it determines that an outgoing transfer must be made to Red Mobile.

**Constraint:** The route for the outgoing transfer and the rate to apply can only be determined by looking up the quote using the quote id which is buried in the transaction object inside the ILP packet. (There is a proposal to remove the packet from the transfer and put the `Transaction` object in its place which would solve for this).

 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: red-mobile
 - `Amount`: **XOF 995**
 - `PayeeFsp`: red-mobile
 - `PayerFsp`: fxp
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



## Use Case 2: Alice at Blue Mobile sends a fixed receive amount to Bob at Red Mobile

 - Blue Mobile and Red Mobile are on the same network and connected to the same Mojaloop switch.
 - Alice wants to send a fixed amount of XOF to Bob.
 - Bob only has an account able to receive XOF
 - There is an FX provider (FXP) on the network that can provide the FX

### Step 2.1 : Lookup

Blue Mobile issues a `/parties` lookup to the hub and gets back a response:

- `Party.Name`: Bob
- `Party.PartyIdInfo.PartyIdType`: MSISDN
- `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
- `Party.PartyIdInfo.FspId`: red-mobile
- `Party.Addresses`:
    -  `moja.network1.xof.red` : XOF
    -  `moja.network1.eur.red` : EUR

As a temporary work-around the currency and address data could be sent in the `Party.PartyIdInfo.PartySubIdOrType` as a combination of the currency and address however this limits the response to only a single available delivery currency.

- `Party.Name`: Bob
- `Party.PartyIdInfo.PartyIdType`: MSISDN
- `Party.PartyIdInfo.PartyIdentifier`: 279862387676253
- `Party.PartyIdInfo.FspId`: red-mobile
- `Party.PartyIdInfo.PartySubIdOrType`: XOF moja.network1.xof.red

Blue Mobile does not do FX and knows that Bob can only accept XOF so it sends a quote to the switch with no `FSPIOP-Destination` header hoping the hub can route the quote via an appropriate FX provider to Red Mobile.

### Step 2.2: Quote

Blue Mobile sends a quote for payment of 1000 XOF to Bob to the switch with no `FSPIOP-Destination`

 - Header: `FSPIOP-Source`: blue-mobile
 - `Payee.PartyIdInfo.PartyIdType`: MSISDN
 - `Payee.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Payee.PartyIdInfo.FspId`: red-mobile
 - `Payee.PartyIdInfo.PartySubIdOrType`: moja.network1.xof.red
 - `AmountType`: RECEIVE
 - `Amount`: XOF 1000
 - `TransferCurrency`: USD

The switch has no `FSPIOP-Destination` header to route by so it must look at the `payee`. It identifies the destination FSP as Red Mobile.
It identifies the destination FSP as Red Mobile however is also notes the presence of an address in the `Payee.PartyIdInfo.PartySubIdOrType` field.

On consulting its routing tables the switch determines that the quote must be forwarded to the FXP.

 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `Payee.PartyIdInfo.PartyIdType`: MSISDN
 - `Payee.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Payee.PartyIdInfo.FspId`: red-mobile
 - `Payee.PartyIdInfo.PartySubIdOrType`: moja.network1.xof.red
 - `AmountType`: RECEIVE
 - `Amount`: XOF 1000
 - `TransferCurrency`: USD

The FXP accepts the quote and notes that it is will be receiving USD (from `transferCurrency` data element in the quote) from Blue Mobile.

The FXP needs to determine the destination currency to apply the conversion. To do this the FXP first consults its routing table to determine where to route the quote. The FXP determines that to route to `moja.network1.xof.red` it will need to send an XOF quote to Red Mobile.

For a fixed receive amount the FXP applies no conversion until it gets back the response from Red Mobile.

FXP sends a quote to Red Mobile (via the switch)

 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: **fxp**
 - `Payee.PartyIdInfo.PartyIdType`: MSISDN
 - `Payee.PartyIdInfo.PartyIdentifier`: 279862387676253
 - `Payee.PartyIdInfo.FspId`: red-mobile
 - `Payee.PartyIdInfo.PartySubIdOrType`: moja.network1.xof.red
 - `AmountType`: RECEIVE
 - `Amount`: XOF 1000
 - `TransferCurrency`: XOF

Red Mobile constructs a `Transaction` object with the details of the payer and payee from the quote. This is used to derive the condition and fulfillment.

The quote response contains a `TransferDestination` data element telling the recipient of the quote where they must send a transfer if they wish to accept this quote.

It is likely that this will be the same information that is present in the `FSPIOP-Source` header however it is preferable that the message routing data is not mixed with data from the message body so it is specified in a new data element in the callback body.

Red Mobile sends the callback to the FXP (via the switch):
 - Header: `FSPIOP-Source`: red-mobile
 - Header: `FSPIOP-Destination`: fxp
 - `TransferAmount`: **XOF 995**
 - `TransferDestination`: **red-mobile**
 - `PayeeReceiveAmount`: XOF 1005
 - `PayeeFspFee`: XOF 5
 - `PayeeFspCommission`: XOF 0
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

The FXP converts the required send amount (1005 XOF) to 5.05 USD.
It adds fees and commission of 0.05 USD.

**Constraint:** The `Transaction` is missing the details of the FXP that is acting as an intermediary and the FX rate, commission and fees agreed in the quote. As such these are not part of the data used to generate the fulfillment and condition. Unlike in the fixed SEND case, these are only calculated on the return leg and so can't be included in the calculation of the condition and fulfillment even if they are accommodated in the data model.

The FXP sends the callback to Blue Mobile (via the switch):
 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: blue-mobile
 - `TransferAmount`: **USD 5.10**
 - `TransferDestination`: **fxp**
 - `PayeeReceiveAmount`: XOF 1000
 - `PayeeFspFee`: XOF 5
 - `PayeeFspCommission`: XOF 0
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

**Constraint:** The FXP has no way to provide details to Blue Mobile on the FX, fees and commissions?

### Step 3: Transfer

Blue Mobile prompts Alice:
"Send 5.10 USD to Bob who will receive 1000 XOF after fees and commission?"

Alice proceeds and a transfer is sent by Blue Mobile to FXP
 - Header: `FSPIOP-Source`: blue-mobile
 - Header: `FSPIOP-Destination`: **fxp**
 - `Amount`: **USD 5.10**
 - `PayeeFsp`: red-mobile
 - `PayerFsp`: blue-mobile
 - `Condition`: abcdef8uuyiuglwiyuefdouwtfdlwihevfluyf
 - `IlpPacket.Data`: &lt;JSON encoded `Transaction` object&gt;

The FXP receives the incoming transfer and pulls the `quoteid` from the encoded `Transaction` object. 
Based on the stored quote it determines that an outgoing transfer must be made to Red Mobile.

**Constraint:** The route for the outgoing transfer and the rate to apply can only be determined by looking up the quote using the quote id which is buried in the transaction object inside the ILP packet. (There is a proposal to remove the packet from the transfer and put the `Transaction` object in its place which would solve for this).

 - Header: `FSPIOP-Source`: fxp
 - Header: `FSPIOP-Destination`: red-mobile
 - `Amount`: **XOF 1005**
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


# API Changes

A more flexible approach than `TransferCurrency` and `TransferDestination` may be to use a list of participants that is appended to by each participant during the quote cycle.

 - `Participants`: 
     - `Participant`: 
        - `FspIp`: blue-mobile
        - `TransferCurrency`: USD
        - `Fee`: USD 5
        - `Commission`: USD 0
     - `Participant`: 
        - `FspIp`: fxp
        - `TransferCurrency`: XOF
        - `Fee`: XOF 5
        - `Commission`: XOF 0

This data model needs to be explored more thoroughly including the possibility of including this data in the transfer such that intermediaries can use this instead of persisting quote information.
