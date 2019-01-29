# Cross-network POC - Part 1

The document captures the details of the Proof-of-Concept done by Coil Technologies to demonstrate how ILP-style addressing and routing can be used to perform cross-network transactions across multiple Mojaloop networks.

The POC is based upon the following proposal presented to the community at the Dubai convening in November 2018:

[https://github.com/mojaloop/cross-network/blob/master/proposal.md](https://github.com/mojaloop/cross-network/blob/master/proposal.md)

For the Mojaloop community convening held in Arusha in January 2018 the team prepared part 1 of the POC which was a demonstration of an end-to-end transaction using statically configured routes and a single CNP between the two Mojaloop networks.

This part of the POC has not yet tackled the exchange of compliance related data between participants.


## Goal

The goal of the POC is to complete a p2p transfer from a sender in one network to a receiver in another network using both a fixed sending amount and a fixed receive amount. 

The POC should demonstrate scenarios where the transaction could be done via one or multiple CNPs and where the payer is therefore able to collect multiple quotes and execute the transfer via the chosen CNP.


## Setup

To perform the POC we needed to deploy two independent Mojaloop systems that were both accessible to a single Cross-Network Provider. 

The sending network needed, at least, a single sending DFSP simulator (or script) and the receiving network needed a single simulated receiver service.

We needed to then deploy a basic CNP service that is connected to both Mojaloop systems (i.e. it is a participant in both networks.)

We used Google's Cloud hosting to deploy the systems modified versions of the standard project using Kubernetes and Helm.

All services are being hosted under the DNS name **demo.openafrica.network**

We needed to develop a custom implementation of the Interop Switch to appropriately handle and route the party lookup and quote APIs.

See: [https://github.com/mojaloop/interop-switch-js](https://github.com/mojaloop/interop-switch-js)

We also developed a simple receiver simulator that was able to simulate a full transaction including generation of the quote response.

See: [https://github.com/mojaloop/mock-dfsp](https://github.com/mojaloop/mock-dfsp) \
(This will be deprecated in favour of the new simulator contributed by the community)


## Participants

To demonstrate our POC we defined a set of fictitious participants and two fictitious Mojaloop networks running in South Africa and Tanzania:

*   Mojaloop Network 1
    *   Name: Blue Moja
    *   Currency: ZAR (South African Rands)
    *   Moja address: **moja.za.blue**
    *   DNS Name: za.blue.demo.openafrica.network
    *   Environment variables are in Appendix Table 2
*   Mojaloop Network 2
    *   Name: Red Moja
    *   Currency: TZS (Tanzanian Shillings)
    *   Moja address: **moja.tz.red**
    *   DNS Name: tz.red.demo.openafrica.network
    *   Environment variables are in Appendix Table 2
*   CNP
    *   Name: Super Remit
    *   Moja address: **moja.superremit**
    *   DNS Name: super-remit.demo.openafrica.network
    *   Environment variables are in Appendix Table 1
*   DFSP 1
    *   Network: Blue Moja
    *   Name: Green Mobile
    *   Currency: ZAR
    *   Moja address: **moja.za.blue.zar.green**
    *   DNS Name: green.za.blue.demo.openafrica.network
*   DFSP 2
    *   Network: Red Mojas
    *   Name: Pink Mobile
    *   Currency: TZS
    *   Moja address: **moja.tz.red.tzs.pink**
    *   DNS Name: pink.tz.red.demo.openafrica.network
*   Alice
    *   Customer of Green Mobile
    *   Currency of account ZAR
    *   MSISDN: +27 	11 111 1111
*   Bob
    *   Customer of Pink Mobile
    *   Currency of account TZS
    *   MSISDN: +255 222 222 222

In terms of Interledger network topology, Red Moja, Blue Moja and Super Remit are peers. Green Mobile is a child of Blue Moja and Pink Mobile is a child of Red Moja.

For the POC, static routes are configured on the three systems maintaining routing tables however it should be relatively easy for the three top-level peers to exchange routes using the standard ILP routing protocol (this will be the subject of future work).

## Flow

![alt_text](images/architecture.png "architecture")

**Figure 1**: The Mojaloop architecture

Our in goal in Part 1 was for Alice to send a payment to Bob per the following flow.

### Prerequisites

1.  MySQL database has routes table. This maps local and out of network moja addresses to the corresponding participants in the Participants table. The out of network addresses are the addresses of the other moja hubs that the CNP is peered with. These addresses will correspond to the CNP's participants ID.
1.  Participants' moja addresses are de/registered from the routes table when they are created/destroyed
1.  Route updates from the CNP need to be updated accordingly

**A.1** - Green Mobile does an account lookup at Blue Moja using the identifier +255 222 222 2222.

**A.2** - Blue Moja resolves +255 222 222 2222 to an FspId outside the Blue Moja network. The response to the /participants API call will contain the Moja address of Pink Mobile (moja.tz.red.tzs.pink) as the value of the FspId in the response.

**A.3** - Blue Moja consults its routing table and resolves Super Remit as the next hop for the address moja.tz.red.tzs.pink. It then sends a /parties API call to Super Remit which it identifies as being destined for Pink Mobile based on the address and it's own routing table. It returns the response to Green Mobile.

Component:  [https://github.com/mojaloop/interop-switch-js](https://github.com/mojaloop/interop-switch-js)

**B.1** - Green Mobile sends a quote request to Blue Moja with the address moja.tz.red.tzs.pink. It again routes this to Super Remit which forwards it to Pink Mobile. When constructing the forward quote Super Remit applies a conversion from ZAR to TZS. The quote response is routed back to Green Mobile.

*NOTE 1*: Some variation here depending on if this is a fixed send or fixed receive amount. We have focused on fixed send first.

*NOTE 2*: There is a need to update the API and logic for generation for the ILP packet at the payee. This is a breaking change to the API and requires consultation with the Change Control Board.

Component: [https://github.com/mojaloop/interop-switch-js](https://github.com/mojaloop/interop-switch-js)

**C.1** - Green Mobile sends a transfer to Blue Moja in favour of Super Remit. Super Remit then sends a transfer to Pink Mobile. The fulfillments are routed back to Green Mobile.

*NOTE 3*: This transfer is in favour of Super Remit even though Green Mobile "thinks" it is sending to an FSP called Pink Mobile. We need to look at the API's and decide if it's practical for Green Mobile to do this with no API changes or if it is okay for Green Mobile to be aware they are sending out of network. (i.e. breaking API changes would be required for the sending DFSPs)

Component: [https://github.com/mojaloop/ml-api-adapter](https://github.com/mojaloop/ml-api-adapter)


### C.1 Detailed Flow 


#### Prepare

1.  Send Transfer Request from Green Mobile to Blue Moja
    1.  Green mobile sets **FSPIOP-Destination** = **moja.tz.red.tzs.pink**
    1.  Sends it to transfer endpoint on hub
1.  Moja adapter for Blue Moja receives transfer prepare request
    1.  Looks in routing table for the address specified in **FSPIOP-Destination** (because **FSPIOP-Final-Destination**) is not set
        1.  Matches address according to longest prefix - this will correspond to CNP if it is out of network. (see 1st point of prerequisites
    1.  Sets **FSPIOP-Final-Destination** = **moja.tz.red.tzs.pink**
    1.  Sets **FSPIOP-Destination** = **moja.superremit** (**nextHop**)
    1.  Sets message.payerFSP = **moja.za.blue.zar.green**  (**FSPIOP-Source**)
    1.  Sets message.payeeFSP = **moja.superremit** (**nextHop**)
    1.  Drops onto prepare topic for the CNP
    1.  _Implementation details_
        1.  _Logic lives in prepare in domain/transfer/index.js_
1.  Central Ledger for Blue Moja picks up message
    1.  decreases DFSP account and increases CNP account
    1.  Drops onto CNPs' prepared notification topic
    1.  _Implementation details:_
        1.  _Currently participants name is limited to 30 characters and is only allow alphanumeric characters (ie moja address not supported) (central-ledger)_
        1.  _await TransferService.prepare(payload) in 'handlers/transfers/handler.js' fails due to invalid name_
        1.  _Participant Current was not active by default in the database_
1.  Moja adapter for Blue Moja picks up message from CNP topic
    1.  Uses **message.payeeFSP** to get the CNP's callback endpoint
    1.  Forwards onto CNP
    1.  _Implementation details:_
        1.  _In notification/index.js_
1.  CNP Receives prepare and routes onto Red Moja
    1.  _Implementation details_
        1.  _Use a server per account. Create http-plugin_
            1.  _Must take the incoming transfer and convert to ILP packet_
                1.  _Data on ILP packet becomes the transfer object_
                1.  _Final-destination-source will be the destination_
                1.  _Other side of connectors plugin will convert back to a transfer_
        1. Set **payerFSP** and **FSPIOP-Source** to **moja.superremit**.
        1. Set **payeeFSP** and **FSPIOP-Final-Destination** to **moja.tz.red.tzs.pink**.
1.  Red Moja Receives  transfer prepare request
    1.  Looks in routing table for the address specified in **FSPIOP-Final-Destination**
        1.  Matches address according to longest prefix - this will correspond to **moja.tz.red.tzs.pink**
    1.  Sets **FSPIOP-Destination** = **moja.tz.red.tzs.pink**
    1.  Sets message.payerFSP = **moja.superremit (FSPIOP-Source)**
    1.  Sets message.payeeFSP = **moja.tz.red.tzs.pink** (**nextHop**)
    1.  Drops onto prepare topic for Pink Mobile
1.  Central Ledger for Red Moja picks up message (note: payerFSP = CNP)
    1.  decreases CNP account and increases Pink Mobile account
    1.  Drops onto Pink Mobile prepared notification topic
1.  Moja adapter for Red Moja picks up message from Pink Mobile topic
    1.  Uses message.payeeFSP to get the callback endpoint for Pink Mobile
    1.  Forwards to Pink Mobile
1.  Pink Mobile Receives transfer prepare
    1.  Sees that **FSPIOP-Destination = FSPIOP-Final-Destination **and knows that it is the intended recipient. 


#### Fulfill / Reject (assuming commit status)



1.  Pink Mobile makes a put request to Moja adapter for Red Moja
    1.  Sets transferState = COMMITTED and sets completedTimestamp
    1.  Sets **FSPIOP-Destination** = **FSPIOP-Source**, does not set **FSPIOP-Final-Destination**
1.  Moja adapter for Red Moja receives fulfill / reject
    1.  Looks in routing table for the address specified in **FSPIOP-Destination** (because **FSPIOP-Final-Destination**) is not set
        1.  Matches address according to longest prefix - this will correspond to CNP if it is out of network. (see 1st point of prerequisites)
    1.  Drops onto request to fulfill topic for the CNP
    1.  _Implementation details_
        1.  _Logic lives in prepare in domain/transfer/index.js_
1.  Central Ledger for Red Moja picks up message
    1.  Validates message (check if is a fulfill/reject, is an existing transfer, condition is correct etc.)
    1.  Commit fulfill / reject
    1.  Drop onto topic depending on result
        1.  Fulfill: use payee topic (Pink mobile)
        1.  Reject: user payer topic (CNP)
        1.  _Implementation details:_
            1.  _transfer/handlers.js line 291 and line 298_
1.  Moja adapter for Red Moja picks up message
    1.  Calls put /transfers endpoint on Pink Mobile
        1.  Sets **FSPIOP-Final-Destination **= **moja.tz.red.tzs.pink**
        1.  Sets **FSPIOP-Destination **= **moja.tz.red.tzs.pink **(result from getNextHop)
        1.  Sets **FSPIOP-Source **= **moja.tz.red**
    1.  Calls put /transfers endpoint on CNP
        1.  Sets **FSPIOP-Final-Destination** = **moja.za.blue.zar.green** (Green Mobile)
        1.  Sets **FSPIOP-Destination** = **moja.superremit** (result from getNextHop)
        1.  Sets **FSPIOP-Source** = **moja.tz.red.tzs.pink**
    1.  _Implementation details:_
        1.  _notification/index.js_
1.  CNP receives put
    1.  Commits transaction
    1.  Sets **FSPIOP-Source = moja.superremit**
    1.  Sets **FSPIOP-Final-Destination = moja.za.blue.zar.green**
    1.  Forwards fulfill onto Blue Moja.
1.  Moja adapter for Blue Moja receives fulfill / reject
    1.  Looks in routing table for the address specified in **FSPIOP-Final-Destination **
        1.  Matches address according to longest prefix - matches **moja.za.blue.zar.green**
        1.  Sets **FSPIOP-Destination = moja.za.blue.zar.green (nextHop)**
    1.  Drops onto request to fulfill topic for Green Mobile
    1.  _Implementation details_
        1.  _Logic lives in prepare in domain/transfer/index.js_
1.  Central Ledger for Red Moja picks up message
    1.  Validates message (check if is a fulfill/reject, is an existing transfer, condition is correct etc.)
    1.  Commit fulfill / reject
    1.  Drop onto topic depending on result
        1.  Fulfill: use payee topic (Green mobile)
        1.  Reject: user payer topic (CNP)
        1.  _Implementation details:_
            1.  _transfer/handlers.js line 291 and line 298_
1.  Moja adapter for Blue Moja picks up message
    1.  Calls put /transfers endpoint on CNP (does it need to??)
        1.  Sets **FSPIOP-Final-Destination **= **moja.superremit**
        1.  Sets **FSPIOP-Destination **= **moja.superremit **
        1.  Sets **FSPIOP-Source** = **moja.za.blue**
    1.  Calls put /transfers Green Mobile
        1.  Sets **FSPIOP-Final-Destination** = **moja.za.blue.zar.green** (**Green Mobile**)
        1.  Sets **FSPIOP-Destination** = **moja.za.blue.zar.green** (result from getNextHop)
        1.  Sets **FSPIOP-Source** = **moja.za.blue**
1.  Green mobile receives fulfill
    1.  Commits transaction

Notes

1.  _transferId_ is set by first sender
1.  The Moja API, Change Control Board has requested that we explore a mechanism of executing this flow without the introduction of the new **FSPIOP-Final-Destination** header. Our initial analysis suggests that this would be possible but only if routing logic is always held at the centre. We intend to update the implementation to demonstrate this in part 2.

### Cross-Network Provider

The Super Remit system runs an interledger connector which holds an account with each of the Moja hubs it is peered with (Blue Moja and Red Moja) as shown in Figure 2. 

It is run in connector mode and, for now, no middleware is loaded for either account. 

On startup, an account with a plugin that communicates using HTTP/REST is created for each Moja Hub. These plugins facilitate peer-to-peer communication by hosting an http server (express) and client (axios). The server hosts the following endpoints:

*   `http://{host}:{port}/{moja address}/parties`
*   `http://{host}:{port}/{moja address}/quotes`
*   `http://{host}:{port}/{moja address}/transfers`
*   `http://{host}:{port}/{moja address}/transfers/{transferId}`
*   `http://{host}:{port}/{moja address}/transfers/{transferId}/error`

The client is used to post to the necessary endpoints on the destination Moja hub.

![alt_text](images/cnp.png "image_tooltip")

**Figure 2**: The Super Remit cross-network provider which has an account with Blue and Red Moja. Each of these accounts has an HTTP/REST plugin (MojaHttp plugin) which facilitates with communication with the appropriate Moja Hub.

### Transfer flow

1.  Transfer request is received on the /transfers endpoint for the Blue Moja plugin
    - An Ilp-prepare packet is constructed from the transfer request according to the mappings in Table 1 below.
    - Returns 202 and closes http connection to Blue Moja.
1. The prepare packet is forwarded onto the connector for routing. Note that this starts a chain of promises indicated by the solid black lines.
    - Set payerFsp = moja.superremit (own address) in request body
    - Set payeeFsp = moja.tz.red.tzs.pink (fspiop-final-destination) in request body
    - Set request header fspiop-source = moja.superremit (own address)
    - Set request header fspiop-final-destination = fspiop-final-destination
    - Red Moja is identified as the next hop by the connector
1.  The Red Moja plugin is told to `sendData`. 
1.  The ilp-prepare packet is turned into an http request and send to Red Moja
    - A listener is set up that will resolve a promise when a fulfill is received from the `PUT transfers/{transferId}` endpoint on the Red Moja plugin.
1.  Transfer fulfill request is received on Red Moja's plugin
    - Maps fulfillment to ilp fulfillment according to the mappings in Table 2 below.
    - Emits event so that listener for transfer resolves with the constructed Ilp fulfill packet and the headers received.
    - Sends 202 to Red Moja and closes http connection
1.  The promise chain initiated by the Blue Moja plugin resolves
1.  The Blue Moja plugin now has the necessary fulfill and headers to create a put request on the Blue Moja hub.
    - Set request header fspiop-source = moja.superremit (own address)
    - Set request header fspiop-final-destination = fspiop-final-destination

<table>
  <tr>
   <th>
ILP Prepare Field
   </th>
   <th>Transfer Request Body
   </th>
   <th>Transfer Request Header
   </th>
  </tr>
  <tr>
   <td>amount
   </td>
   <td>Amount.amount <br/><em><strong>TODO</strong>: need to double check conversion</em>
   </td>
   <td>
   </td>
  </tr>
  <tr>
   <td>destination
   </td>
   <td>
   </td>
   <td>fspiop-final-destination
   </td>
  </tr>
  <tr>
   <td>executionCondition
   </td>
   <td>condition
   </td>
   <td>
   </td>
  </tr>
  <tr>
   <td>expiresAt
   </td>
   <td>expiration
   </td>
   <td>
   </td>
  </tr>
  <tr>
   <td>data
   </td>
   <td>Transfer Request body <br/><em><strong>TODO:</strong>: May change pending possible API changes.</em>
   </td>
   <td>
   </td>
  </tr>
</table>

_**Table 1**: Mapping between a transfer and an ILP Prepare packet_

<table>
  <tr>
   <th>
Ilp Fulfill Field
   </th>
   <th>Fulfill Request Body
   </th>
  </tr>
  <tr>
   <td>fulfillment
   </td>
   <td>fulfillment
   </td>
  </tr>
  <tr>
   <td>data
   </td>
   <td>Fulfill Request body.<br/><em><strong>TODO:</strong>: May change pending possible API changes.</em>
   </td>
  </tr>
</table>

_**Table 2**: Mapping between a fulfill and an ILP Fulfill packet_

# Appendix

### Ecosystem Config

<table>
  <tr>
   <td>
   </td>
   <td><strong>Blue Moja</strong>
   </td>
   <td><strong>Red Moja</strong>
   </td>
  </tr>
  <tr>
   <td>Ml-api-adapter endpoint
   </td>
   <td>http://ml-api-adapter.za.blue.demo.openafrica.network
   </td>
   <td>http://ml-api-adapter.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>Central ledger endpoint
   </td>
   <td>http://central-ledger.za.blue.demo.openafrica.network
   </td>
   <td>http://central-ledger.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>Interop Switch endpoint
   </td>
   <td>http://interop-switch-js.za.blue.demo.openafrica.network
   </td>
   <td>http://interop-switch-js.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>Green DSFP endpoint
   </td>
   <td>http://green.za.blue.demo.openafrica.network
   </td>
   <td>
   </td>
  </tr>
  <tr>
   <td>Pink DFSP endpoint
   </td>
   <td>
   </td>
   <td>http://pink.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>ILP Plugin Account endpoint
   </td>
   <td>http://super-remit.demo.openafrica.network/blue
   </td>
   <td>http://super-remit.demo.openafrica.network/red
   </td>
  </tr>
</table>

_**Table 1**: Summary of base endpoints_

<table>
  <tr>
   <td><strong>Environment variable</strong>
   </td>
   <td><strong>Value</strong>
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_PROFILE
   </td>
   <td>connector
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_BACKEND
   </td>
   <td>one-to-one
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_ILP_ADDRESS
   </td>
   <td>moja.superremit
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_STORE
   </td>
   <td>memdown
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_ACCOUNTS
   </td>
   <td>{"mojablue":{"relation":"peer","sendRoutes":false,"receiveRoutes":false,"assetScale":1,"assetCode":"USD","plugin":"ilp-plugin-moja","options":{"listener":{"port":1082,"host":"0.0.0.0","baseAddress":""},"server":{"endpoint":"http://ml-api-adapter.za.blue.demo.openafrica.network"},"endpoints":{"transfers":"http://ml-api-adapter.za.blue.demo.openafrica.network","quotes":"http://interop-switch-js.za.blue.demo.openafrica.network"},"ilpAddress":"moja.superremit"}},"mojared":{"relation":"peer","sendRoutes":false,"receiveRoutes":false,"assetScale":1,"assetCode":"USD","plugin":"ilp-plugin-moja","options":{"listener":{"port":1083,"host":"0.0.0.0","baseAddress":""},"server":{"endpoint":"http://ml-api-adapter.tz.red.demo.openafrica.network"},"endpoints":{"transfers":"http://ml-api-adapter.tz.red.demo.openafrica.network","quotes":"http://interop-switch-js.tz.red.demo.openafrica.network"},"ilpAddress":"moja.superremit"}}} \

   </td>
  </tr>
  <tr>
   <td>CONNECTOR_ROUTES
   </td>
   <td>[
<p>
{"targetPrefix":"moja.za.blue","peerId":"mojablue"},
<p>
{"targetPrefix":"moja.tz.red","peerId":"mojared"}
<p>
]
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_DISABLE_MIDDLEWARE
   </td>
   <td>["deduplicate","expire","validateFulfillment","maxPacketAmount"]
   </td>
  </tr>
</table>

_**Table 2**: ilp-connector config_

<table>
  <tr>
   <td><strong>Environment Variable</strong>
   </td>
   <td>
   </td>
  </tr>
  <tr>
   <td>IOP_ROUTING_ENDPOINT
   </td>
   <td>http://dev-centralledger-service:3001/nextHop
   </td>
  </tr>
  <tr>
   <td>IOP_DATABASE_URI
   </td>
   <td>mysql://central_ledger:oyMxgZChuu@dev-central-ledger-mysql:3306/central_ledger
   </td>
  </tr>
  <tr>
   <td>IOP_PROVISIONED_PARTIES
   </td>
   <td>[
<p>
    {
<p>
      "msisdn": "255222222222",
<p>
      "fspId": "moja.tz.red.tzs.pink",
<p>
      "currency": "USD"
<p>
    },
<p>
    {
<p>
      "msisdn": "27111111111",
<p>
      "fspId": "moja.za.blue.zar.green",
<p>
      "currency": "USD"
<p>
    }
<p>
  ]
   </td>
  </tr>
</table>

_**Table 3**: interop-switch-js config_

<table>
  <tr>
   <td>
   </td>
   <td><strong>Blue Moja</strong>
   </td>
   <td><strong>Red Moja</strong>
   </td>
  </tr>
  <tr>
   <td>CLEDG_DATABASE_URI
   </td>
   <td>mysql://central_ledger:oyMxgZChuu@dev-central-ledger-mysql:3306/central_ledger
   </td>
   <td>mysql://central_ledger:oyMxgZChuu@dev-central-ledger-mysql:3306/central_ledger
   </td>
  </tr>
  <tr>
   <td>CLEDG_MOJA_HUB_NAME
   </td>
   <td>Blue Moja
   </td>
   <td>Red Moja
   </td>
  </tr>
</table>

_**Table 4**: central-ledger config_

<table>
  <tr>
   <td>
   </td>
   <td><strong>Blue Moja</strong>
   </td>
   <td><strong>Red Moja</strong>
   </td>
  </tr>
  <tr>
   <td>MLAPI_ENDPOINT_SOURCE_URL
   </td>
   <td>http://central-ledger.za.blue.demo.openafrica.network/admin/participants/{{FSP}}/endpoints
   </td>
   <td>http://central-ledger.tz.red.demo.openafrica.network/admin/participants/{{FSP}}/endpoints
   </td>
  </tr>
  <tr>
   <td>ML_API_ROUTING_ENDPOINT
   </td>
   <td>http://central-ledger.za.blue.openafrica.network/admin/nextHop
   </td>
   <td>http://central-ledger.tz.red.openafrica.network/admin/nextHop
   </td>
  </tr>
</table>

_**Table 5**:ml-api-adapter config_

<table>
  <tr>
   <td>
   </td>
   <td><strong>Blue Moja</strong>
   </td>
   <td><strong>Red Moja</strong>
   </td>
  </tr>
  <tr>
   <td>DFSP_ID
   </td>
   <td>moja.za.blue.zar.green
   </td>
   <td>moja.tz.red.tzs.pink
   </td>
  </tr>
  <tr>
   <td>MLAPI_URL
   </td>
   <td>http://ml-api-adapter.za.blue.demo.openafrica.network
   </td>
   <td>http://ml-api-adapter.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>MLSWITCH_URL
   </td>
   <td>http://interop-switch-js.za.blue.demo.openafrica.network
   </td>
   <td>http://interop-switch-js.tz.red.demo.openafrica.network
   </td>
  </tr>
</table>

_**Table 6**: mock-dfsp config_

**Populating with test data:**

1.  This requires two files: env.sh and populateCnpPocTestData.sh.  \
These can be found at [https://github.com/mojaloop/central-ledger/tree/feature/cross-network/test/util/scripts](https://github.com/mojaloop/central-ledger/tree/feature/cross-network/test/util/scripts)
1.  Set an environment variable MOJA_HUB_COLOUR=BLUE/RED depending on which cluster you are working with.
1.  Update the variables in env.sh with the values in the below table.
1.  Run populateCnpPocTestData.sh

<table>
  <tr>
   <td><strong>Environment variable</strong>
   </td>
   <td><strong>Blue Moja</strong>
   </td>
   <td><strong>Red Moja</strong>
   </td>
  </tr>
  <tr>
   <td>MOCKSERVER_HOST
   </td>
   <td>green.za.blue.demo.openafrica.network
   </td>
   <td>pink.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>MOCKSERVER_PORT
   </td>
   <td>80
   </td>
   <td>80
   </td>
  </tr>
  <tr>
   <td>FSPList
   </td>
   <td>("moja.za.blue.zar.green")
   </td>
   <td>("moja.tz.red.tzs.pink")
   </td>
  </tr>
  <tr>
   <td>DEFAULT_NET_DEBIT_CAP
   </td>
   <td>100000
   </td>
   <td>100000
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_URI_PREFIX
   </td>
   <td>http
   </td>
   <td>http
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_HOST
   </td>
   <td>central-ledger.za.blue.demo.openafrica.network
   </td>
   <td>central-ledger.tz.red.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_PORT
   </td>
   <td>80
   </td>
   <td>80
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_BASE
   </td>
   <td>/admin/
   </td>
   <td>/admin/
   </td>
  </tr>
  <tr>
   <td>CNP_PORT
   </td>
   <td>80/blue
   </td>
   <td>80/red
   </td>
  </tr>
  <tr>
   <td>CNP_HOST
   </td>
   <td>super-remit.demo.openafrica.network
   </td>
   <td>super-remit.demo.openafrica.network
   </td>
  </tr>
  <tr>
   <td>CNP_NAME
   </td>
   <td>"moja.superremit"
   </td>
   <td>"moja.superremit"
   </td>
  </tr>
</table>

_**Table 7**: Variables to update in env.sh_

### Local Development Environment (Work In Progress)

<table>
  <tr>
   <td><strong>Environment variable</strong>
   </td>
   <td><strong>Value</strong>
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_PROFILE
   </td>
   <td>connector
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_BACKEND
   </td>
   <td>one-to-one
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_ILP_ADDRESS
   </td>
   <td>moja.superremit
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_STORE
   </td>
   <td>memdown
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_ACCOUNTS
   </td>
   <td>{"mojablue":{"relation":"peer","sendRoutes":false,"receiveRoutes":false,"assetScale":1,"assetCode":"USD","plugin":"ilp-plugin-moja","options":{"listener":{"port":1082,"host":"0.0.0.0","baseAddress":""},"server":{"endpoint":"http://localhost:3000"},"endpoints":{"transfers":"http://localhost:3000","quotes":"http://localhost:2998"},"ilpAddress":"moja.superremit"}},"mojared":{"relation":"peer","sendRoutes":false,"receiveRoutes":false,"assetScale":1,"assetCode":"USD","plugin":"ilp-plugin-moja","options":{"listener":{"port":1083,"host":"0.0.0.0","baseAddress":""},"server":{"endpoint":"http://localhost:2000"},"endpoints":{"transfers":"http://localhost:2000","quotes":"http://localhost:2999"},"ilpAddress":"moja.superremit"}}} \

   </td>
  </tr>
  <tr>
   <td>CONNECTOR_ROUTES
   </td>
   <td>[
<p>
{"targetPrefix":"moja.za.blue","peerId":"mojablue"},
<p>
{"targetPrefix":"moja.tz.red","peerId":"mojared"}
<p>
]
   </td>
  </tr>
  <tr>
   <td>CONNECTOR_DISABLE_MIDDLEWARE
   </td>
   <td>["deduplicate","expire","validateFulfillment","maxPacketAmount"]
   </td>
  </tr>
</table>

_**Table 8**: Environment variables for the Super Remit CNP_


<table>
  <tr>
   <td><strong>Environment Variable</strong>
   </td>
   <td><strong>Blue Moja Hub</strong>
   </td>
   <td><strong>Red Moja Hub</strong>
   </td>
  </tr>
  <tr>
   <td>MOJA_HUB_COLOUR
   </td>
   <td>BLUE
   </td>
   <td>RED
   </td>
  </tr>
  <tr>
   <td>DB_ID
   </td>
   <td>mysql_blue_moja
   </td>
   <td>mysql_red_moja
   </td>
  </tr>
  <tr>
   <td>DB_NAME
   </td>
   <td>central_ledger_blue_moja
   </td>
   <td>central_ledger_red_moja
   </td>
  </tr>
  <tr>
   <td>DB_PORT
   </td>
   <td>3306
   </td>
   <td>3307
   </td>
  </tr>
  <tr>
   <td>CLEDG_DATABASE_URI
   </td>
   <td>mysql://central_ledger:password@localhost:3306/central_ledger_blue_moja
   </td>
   <td>mysql://central_ledger:password@localhost:3307/central_ledger_red_moja
   </td>
  </tr>
  <tr>
   <td>CLEDG_PORT
   </td>
   <td>4000
   </td>
   <td>4001
   </td>
  </tr>
  <tr>
   <td>CLEDG_MOJA_HUB_NAME
   </td>
   <td>Blue Moja
   </td>
   <td>Red Moja
   </td>
  </tr>
  <tr>
   <td>CLEDG_ADMIN_PORT
   </td>
   <td>3001
   </td>
   <td>3002
   </td>
  </tr>
  <tr>
   <td>MOCKSERVER_PORT
   </td>
   <td>1080
   </td>
   <td>1081
   </td>
  </tr>
  <tr>
   <td>MOCKSERVER_ID
   </td>
   <td>mockserver_blue_moja
   </td>
   <td>mockserver_red_moja
   </td>
  </tr>
  <tr>
   <td>MLAPI_PORT
   </td>
   <td>3000
   </td>
   <td>2000
   </td>
  </tr>
  <tr>
   <td>MLAPI_ENDPOINT_SOURCE_URL
   </td>
   <td>http://localhost:3001/participants/{{fsp}}/endpoints
   </td>
   <td>http://localhost:3002/participants/{{fsp}}/endpoints
   </td>
  </tr>
  <tr>
   <td>ML_API_ROUTING_ENDPOINT
   </td>
   <td>http://localhost:3001/nextHop
   </td>
   <td>http://localhost:3002/nextHop
   </td>
  </tr>
  <tr>
   <td>ML-SWITCH-JS
   </td>
   <td>2998
   </td>
   <td>2999
   </td>
  </tr>
  <tr>
   <td>KAFKA_PORT
   </td>
   <td>9092
   </td>
   <td>9093
   </td>
  </tr>
  <tr>
   <td>KAFKA_ID
   </td>
   <td>kafka_blue
   </td>
   <td>kafka_red
   </td>
  </tr>
  <tr>
   <td>ZOOKEEPER_PORT
   </td>
   <td>2181
   </td>
   <td>2182
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_URI_PREFIX
   </td>
   <td>http
   </td>
   <td>http
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_HOST
   </td>
   <td>localhost
   </td>
   <td>localhost
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_PORT
   </td>
   <td>3001
   </td>
   <td>3002
   </td>
  </tr>
  <tr>
   <td>CENTRAL_LEDGER_ADMIN_BASE
   </td>
   <td>/
   </td>
   <td>/
   </td>
  </tr>
  <tr>
   <td>CNP_HOST
   </td>
   <td>localhost
   </td>
   <td>localhost
   </td>
  </tr>
  <tr>
   <td>CNP_PORT
   </td>
   <td>1082
   </td>
   <td>1082
   </td>
  </tr>
  <tr>
   <td>CNP_NAME
   </td>
   <td>moja.superremit
   </td>
   <td>moja.superremit
   </td>
  </tr>
</table>

_**Table 9**: Environment variables for running 2 Moja Hubs on the same machine._

**Populating with test data:**

This needs to be run for both the Red and Blue Moja Hub instances

1.  This requires two files: env.sh file and the populateCnpPocTestData.sh. These can be found at [https://github.com/mojaloop/central-ledger/tree/feature/cross-network/test/util/scripts](https://github.com/mojaloop/central-ledger/tree/feature/cross-network/test/util/scripts)
1.  Set an environment variable MOJA_HUB_COLOUR=BLUE/RED depending on which cluster you are working with.
1.  Update the variables in env.sh with the values in the table above.
1.  Start the admin api server for the central ledger (npm run start:api)

Run populateCnpPocTestData.sh

### Setting up a local dev environment

1.  Clone both central-ledger and ml-api-adapter
1.  Go into central-ledger
    1.  Run 'sh test/util/scripts/restart (This deploys mysql, Kafka and mock server in docker)
    1.  Export variable DATABASE_URI "mysql://central_ledger:password@localhost:3306/central_ledger " to enviroment
    1.  Run npm run migrate (migrates the mysql tables)
    1.  Run npm run start (starts central ledger api and admin)
    1.  Run 'sh test/util/scripts/populateTestData (adds dfsp etc to database)
1.  Go into ml-api-admin
    1.  Run npm run start (starts api-adapter for transfers)
1.  You can now run start making postman requests to transfers 
