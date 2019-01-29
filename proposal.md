# Transferring funds between different Mojaloop networks

## Draft Proposal

## 1. Document

### 1.1. Revision history

| Version | Date | Reason | Author |
| --- | --- | --- | --- |
| 0.1 | 23 Apr 2018 | Initial draft | Michael Richards |
| 0.2 | 16 Aug 2018 | Following Convening discussion | Michael Richards |
| 0.3 | 19 Nov 2018 | Following Convening discussion | Adrian Hope-Bailie |

### 1.2. References

The following references are used in this document

| Document | Version | Date |
| --- | --- | --- |
| Open API for FSP Interoperability Specification | 1.0 | 13 March 2018 |
| [IL-RFC 27 – Interledger Protocol v4](https://interledger.org/rfcs/0027-interledger-protocol-4/draft-5.html) | Draft 5 |   |
| [IL-RFC 15 – Interledger Addresses](https://interledger.org/rfcs/0015-ilp-addresses/draft-5.html) | Draft 5 |   |
| [ISO 3166 Country Codes](https://www.iso.org/iso-3166-country-codes.html) | 2013 |   |

### 1.3. Glossary

The following abbreviations are used in this document.

| Abbreviation | Text |
| --- | --- |
| ALS | Account Lookup System |
| CNP | Cross-Network Provider |
| FXP | Foreign-Exchange Provider |
| DFSP | Digital Financial Service Provider |
| ILP | Interledger Protocol |
| MSISDN | Mobile Station International Subscriber Directory Number: a subscription to a mobile network |
| oracle | A specialist service providing directory services for identifiers of a particular type. |


## 2. Introduction

This document describes an outline design to support transfers of funds between parties who are customers of DFSPs which belong to different Mojaloop-based networks. It represents the outcome of multiple sessions conducted at Mojaloop convening sessions during 2018.

This document is a proposal and is intended to provide a basis for further discussion and development of a final solution.

The discussions thus far have identified 2 high-level scenarios that must be addressed by this design, a payment that crosses multiple Mojaloop-based networks (where the sending and receiving currency may be the same or different) and a payment within a single Mojaloop-based network where the sending and receiving currencies are different.

Both scenarios require that multiple transfers are performed via the same or multiple Mojaloop switches to execute the complete transaction. Therefor it is necessary to document:

1. How the sending DFSP determines where to send the quote request and the first transfer
2. How the sending DFSP determines how much to send in that transfer (and therefore what to quote the sender beforehand)
3. How intermediary DFSP(s) receiving the first (and possibly later) transfer(s) determine(s) where to send the next transfer
4. How all parties to a transaction share sufficient data to satisfy their regulatory obligations

This document explores proposed answers to these questions by examining the life cycle of a transaction from discovery of the receiving DFSP to final delivery of the last transfer to that DFSP.

Given that not all transactions in the first scenario entail a currency exchange, the document proposes a new term &quot;cross-network&quot; which describes any transaction that consists of transfers on more than one Mojaloop-based implementation.

The document provides numerous recommendations and proposals but also raises some questions which need further study, such as how entities involved in a transaction identify themselves.

### 2.1. Updates in Draft 3

Following the discussions in Arusha in September 2018, the following decisions were made and have guided this version of the document:

#### 2.1.1. Use ILP Addresses as DFSP identifiers

This document explores a solution whereby the DFSP identifiers returned by the ALS take the form of an address (Moja Address) modelled after the ILP Addresses as defined in IL-RFC 15 which allows for efficient routing of messages to remote networks.

#### 2.1.2. Put routing tables at the hub

To avoid the burden of maintaining a routing table at each DFSP (as originally proposed in Arusha) this function should be centralized at the hub. When a DFSP needs to determine the possible routes for any operation that must be performed across networks they can get possible routes from the hub using the DFSP id (Moja Address) of the target DFSP.

The exception to this will be DFSPs that participate in multiple Mojaloop-based networks which must broadcast their routing table updates to the hub whenever there are changes from other networks.

#### 2.1.3. Document single-network FX scenario

As discussed already, this document will explicitly explore the case of cross-currency transactions within a network both in the case of a payment or a simple FX transaction completed by a single DFSP.

Changes to this document since draft 2 have been made to reflect the above discussions

## 3. Schematic of a cross-network solution

The following schematic shows the proposed structure of a cross-network payments system.

In this system, Alice subscribes to a DFSP which is in the same scheme as Mojaloop Implementation 1. She wants to make a payment to Bob, who subscribes to a DFSP on a different network (connected to Implementation 2.) The Mojaloop protocol means that, in the normal run of things, it would not be possible to transfer money between these systems. This proposal discusses how this could be done.

![schematic of a cross-network solution](https://raw.github.com/mojaloop/cross-network/master/images/cip-network.svg?sanitize=true)

Figure 1: schematic of a cross-network solution

## 4. Cross-network and FX providers

The proposal defines two new entity roles: the cross-network provider (CNP) and the FX provider (FXP). Either or both roles could be adopted by any member of a Mojaloop network. In other words, a DFSP could be a CNP or an FXP or both.

### 4.1. The Cross-Network Provider (CNP)

The CNP is a bridge between two Mojaloop networks, as can be seen in the schematic in Figure 1. A CNP achieves this by being a member of more than one Mojaloop network and performing the necessary business and regulatory functions to forward payments from one network to another.

In the schematic above, the CNPs are both members of two Mojaloop networks (Connected to Implementation 1 and to Implementation 2,) but there is no restriction on the number of Mojaloop networks of which a CNP can be a member.

A CNP will have a settlement account in each of the Mojaloop networks it supports and will therefore be able to transfer funds between the two systems.

The sequence of steps for transferring funds between Alice (who belongs to DFSP 1A connected to Implementation 1) and Bob (who belongs to DFSP 2A connected to Implementation 2) via CNP 1 is as follows. Note that this sequence disregards charges for the sake of simplicity.

1. Alice&#39;s account is decremented in DFSP 1A
2. DFSP 1A&#39;s settlement account is decremented
3. CNP 1&#39;s settlement account in implementation 1 is incremented.
4. CNP 1&#39;s settlement account in implementation 2 is decremented.
5. DFSP 2A&#39;s settlement account is incremented.
6. Bob&#39;s account is incremented in DFSP 2A.

It can therefore be seen that this arrangement leaves the settlement accounts in both implementations consistent, allowing the CNP to make its own arrangements in relation to rebalancing its settlement accounts in each implementation (as required).

### 4.2. The Foreign Exchange Provider (FXP)

An FXP offers currency conversion services within a Mojaloop network, either directly or as part of the flow of a payment between DFSPs within the network. The FXP achieves this by holding settlement accounts with a single implementation in more than one currency and performing the necessary business and regulatory functions to accept settlements in one currency and make settlements in another.

The sequence of steps for making a cross-currency payment within a network between Alice (who belongs to DFSP 1A connected to Implementation 1) and Chloe (who belongs to DFSP 1B connected to Implementation 1) via FXP 1 is as follows. Note that this sequence disregards charges for the sake of simplicity.

1. Alice&#39;s account is decremented in DFSP 1A by X USD
2. DFSP 1A&#39;s settlement account is decremented by X USD
3. FXP 1&#39;s USD settlement account in Implementation 1 is incremented by X USD.
4. FXP 1&#39;s TZS settlement account in Implementation 1 is decremented by Y TZS.
5. DFSP 1B&#39;s settlement account is incremented by Y TZS.
6. Chloe&#39;s account is incremented in DFSP 1B by Y TZS.

It can therefore be seen that this arrangement leaves the settlement accounts in both currencies consistent, allowing the FXP to make its own arrangements in relation to rebalancing its settlement accounts as required.

## 5. Addresses and Identifiers

As will be discussed in detail in later sections describing the transaction life cycle, the ability to direct messages to entities in the ecosystem that are not directly linked to the sender is a crucial element of a cross-network solution.

In a single network the line between **identification** and **addressing** is blurred as all participants are connected through the hub: therefore simply having the identity of the counter-party is sufficient to address messages to that counter-party.

In a multi-network ecosystem, it is necessary to define an address space that accommodates this more complex topology.

Inter-networking multiple Mojaloop-based networks results in a topology not unlike the Internet therefore a neutral addressing scheme akin to IP is proposed. This is the same logic that was applied in the design of the ILP addressing scheme and we therefore propose to use a slightly modified version of this scheme for Mojaloop (henceforth called a **Moja Address** ).

The value of a hierarchical scheme such as those used in IP and ILP is that addresses can represent individual entities but can also be used to represent a block of addresses within the space. This makes for efficient exchange, storage and evaluation of routing information.

For example, if multiple entities are accessible via a route, and all exist within the same address block, then that route can simply be linked to that block instead of requiring that every entity in the block is explicitly added to the routing data.

This also allows the network within that address space to grow and change without impacting the routing data that needs to be maintained and shared by CNPs that provide gateways into the network. This is crucial to the scaling of the network.

### 5.1. The Moja Address Scheme

The proposed addressing scheme is based upon the work done on the Interledger Address scheme but with a unique allocation prefix that identifies addresses as being part of the Mojaloop ecosystem.

Using a unique allocation scheme provides some implicit information to consumers of the address about the addressed entity, such as the protocols that are expected to be supported by that entity for quoting, data exchange and transactions.

The global allocation scheme ( **g.** ) prescribed by the Interledger protocol is reserved for entities implementing the &quot;open&quot; Interledger protocol and associated protocol stack. In other words, these entities are not part of any specific scheme or subject to any specific country legislation and are expected to support the ILP STREAM transport protocol, among others.

In contrast, Mojaloop participants operate in a regulated space and are expected to be part of at least a domestic scheme if not also a multi-national cross-network scheme that defines the rules of engagement between stakeholders. Therefore, it is important that there is an obvious differentiation between these two networks.

#### 5.1.1. Address Registry

It is recommended that a registry is established to administer the allocation of top-level address spaces within the scheme according to the following standards:

1. **1.** The allocation scheme prefix will be: **moja.**
2. **2.** Addresses within the scheme will be allocated to entities with a country specific prefix using the ISO 3166 standard country codes. For example, entities in Tanzania will get addresses in the block: **moja.tz.**

Given that Mojaloop instances are most likely to be deployed first-and-foremost as domestic hubs this is likely to be the most logical separation of addresses and allows a CNP between two jurisdictions to simply advertise routes based on the countries into which they have access.

1. **3.** The domestic address space will be further segmented by currency allowing for sub-networks of participants using different currencies. An FXP that offers multiple currencies will be allocated addresses for each of these and will allocate account addresses in these different namespaces as appropriate.

For example, an entity in Tanzania that has both USD and TZS accounts will get addresses in the blocks: **moja.tz.usd** and **moja.tz.tzs**

1. **4.** Entities that operate in multiple countries/jurisdictions will be allocated addresses in all of the blocks linked to their countries of operation. For example, a CNP called Super Remit that operates in both Tanzania and South Africa will register the addresses: **moja.tz.usd.superremit** and **moja.za.zar.superremit**

While not a technical requirement, it would be prudent to not allocate conflicting 3rd level address blocks to different entities of the same name in different countries. For example, if a different company that happens to also be called Super Remit requests an address allocation for Zimbabwe they SHOULD NOT be allocated **moja.zw..usd.superremit** but rather **moja.zw.usd.superremit1** or some other variation.

This eliminates possible confusion as the registry grows and allows the registry to be indexed by top-level entity if required.

This SHOULD NOT be relied upon in operating the network and routing messages. For the purposes of routing, **moja.tz.usd.superremit** and **moja.za.usd.superremit** are entirely different address spaces.

### 5.2. Comparison to existing addressing schemes

The ILP-based Moja Address scheme offers a number of benefits over existing schemes as it has been explicitly designed with the purpose of global routing of payment messages across numerous inter-connected networks.

The IBAN and PAN schemes, already in use between banks and card network participants, share a common property with ILP addresses in that they are hierarchical. For example, all PANs starting with a 4 are from the VISA network, further digits indicate specific network participants and ultimately the specific account holder.

Moja addresses however offer a significant advantage over PANs and IBANs which opens up numerous powerful possibilities that can only be implanted with PANs and IBANs using complex work-arounds and hacks. That advantage is that they are variable in length and support a wider character set (case sensitive, alphanumeric and a select set of other ASCII characters).

Both the PAN and IBAN schemes were invented at a time when messaging space was severely limited and processing capabilities constrained; therefore, the address schemes needed to be too.

With access to the full alphanumeric character set and an (almost) unlimited size Moja Addresses can be used to:

1. Encode small pieces of data, such as cryptographic nonces, directly in the address using base64 encoding
2. Generate unique, per transaction addresses
3. Generate separate addresses for each account held by a customer
4. Create pseudo-anonymous addresses that can only be matched to a user or account by the owner of the address space
5. Create multiple layers of address block allocation. For example, an entity with the address **moja.za.superremit** can allocate the address **moja.za.superremit.agentnetwork1** to a third party agent network who in turn can generate as many addresses as they need in that space, including addresses that are themselves used as an address-space by their customers.

### 5.3. Changes to the API

With this scheme in mind, we propose that the **FspId** data type is modified to be an address from the Moja Address scheme.

By making this change we make a subtle but important change to the transaction flow where the lookup cycle doesn&#39;t just return the identifier of a DFSP but rather their address which allows further steps in the flow to use that address to route the necessary messages.

Alternatively, a new data member should be added to the data model, **FspAddress,** which is used to express the address of a DFSP.

## 6. Cross-Network API calls

Assuming that a sender has resolved the address of the receiving DFSP they wish to communicate with, and this DFSP is not a member of the same Mojaloop-based network, it is necessary to define a mechanism by which the sender can route API requests to the other DFSP.

The API currently defines a mechanism by which the intended recipient of an API call is identified by the HTTP header: **FSPIOP-Destination**

While not explicitly documented as such, there is no reason why this value couldn't be the address of a DFSP in another network, however this does raise some issues regarding how, and by which system, the messages are routed in the sender's network.

There are two possible options; one where the hub is responsible for determining the CNP in the sending network to forward the API call to and the other where this is explicitly set by the sender.

### 6.1. Routing at the Hub

In the first scenario, the hub will accept messages that are addressed to DFSPs outside the local Mojaloop network. The hub will consult the routing tables available to it and determine which CNP in the local network is best suited to route this message onwards and will send the message to that CNP.

This is the simplest scenario as it is almost opaque to the sender that the receiver is outside the local network.

The disadvantage of this approach is that the sender is unable to choose the forwarding CNP, which in a network where there are multiple competing CNPs prevents the sending DFSP from &quot;shopping around&quot;.

### 6.2. Routing at the Sender

In this scenario the sending DFSP determines which CNPs in the local network are able to route the message to the intended recipient by consulting a new API at the hub.

**Note:** _An optimization that could be employed is to return this information along with the payee_ **FspId** _at the start of the transaction (See_ _Identifying, addressing and querying the destination party_ _for more details.)_

The sending DFSP may send the same message via multiple CNPs in order to determine the best route for the transaction. This imposes a new requirement on the API in that there is a need to specify both the intended local recipient of the message (the CNP) and the intended final recipient outside the network (the payee DFSP).

Source Routing

In some case an API call must follow a particular path such as when sending a chain of transfers that must follow the path chosen as the result of a previous quote.

In this case the sender must provide the full path in the original message.

### 6.3. Changes to the API

We propose that two new headers are defined **FSPIOP-Final-Destination** which contains the **FspId** of the intended final recipient and **FSPIOP-Route** which contains the route an API call must follow across the networks.

These new headers are mutually exclusive and should never be used together.

#### 6.3.1. FSPIOP-Final-Destination

If this header is not provided, then the value of **FSPIOP-Final-Destination** is assumed to be the same as the value of **FSPIOP-Destination** or the final address in the **FSPIOP-Route** if that header is present.

An entity that receives an API message should look first at the **FSPIOP-Destination** header and, if it is not the indicated entity, forward the message to that entity. This behaviour is the same as the definition in Section 3.2.3.5 of the Open API specification.

An entity that receives an API message where it is the entity identified by the value of the **FSPIOP-Destination** header should next consult the **FSPIOP-Final-Destination** header or **FSPIOP-Route** header.

If neither is present, then the message is intended for that entity and it should process the message.

If the value of **FSPIOP-Final-Destination** is set and is the same as the **FSPIOP-Destination** header value OR is an address that is managed by the entity, then it should process the message.

Otherwise, the entity is expected to route this message on to another DFSP.

If the entity is unable to route messages (i.e. this is not a CNP or FX provider) then the entity should reject the message with an appropriate error.

If the entity accepts the message for routing it must consult its routing tables to determine the next DFSP to forward the message to in order to ultimately deliver it to the DFSP identified in the **FSPIOP-Final-Destination** header.

This may require the DFSP to lookup the list of possible CNPs that can route to this address via a new API at the hub. (See **Routing at the Hub** above).

The DFSP will replace the value of the **FSPIOP-Destination** header with the address of this next DFSP and forward the message to them.

#### 6.3.2. FSPIOP-Route

It is also possible that the route of the API call is explicitly set by the sender. This is done by providing an ordered list of addresses in the **FSPIOP-Route** header.

When a DFSP receives a message with this header it should identify the position of its own address in the list, replace the value of the **FSPIOP-Destination** header with the next value in the list and forward the message on.

If the DFSP&#39;s address is the last address in the list, it is the intended final recipient and should process the message.

## 7. Transaction Life-cycle

The combination of using Moja Addresses as **FspIds** and also the ability to specify an out-of-network recipient in the **FSPIOP-Final-Destination** or **FSPIOP-Route** header means that the existing API can be used to execute transactions across multiple networks.

The following sections describe a general transaction life-cycle aligned with the use cases in the Mojaloop API specification and call-out the changes required and questions that arise in performing a cross-network transaction.

Further discussion is required to identify specifics of how certain new data will be transported in the API messages and how these will be secured, using either the existing API security mechanisms or an extension of these.

### 7.1. Identifying, addressing and querying the destination party

The first stage in the transfer of funds is the identification of the counter-party in the transaction: that is, the party who is to be credited (the payee) and their DFSP.

This stage is described in Section 5.2 of the Open API specification. In summary, the sending DFSP uses an identifier of the payee to query the local ALS for the **FspId** of the payee&#39;s DFSP. The specification also allows for the hub to query the payee DFSP on the payer DFSP&#39;s behalf for the details of the payee and return these, along with the **FspId** , in the response.

In other words, this process is actually an abstraction of two functions; **discovering the identity and address of the payee DFSP** followed by **querying that DFSP for the payee details**. This must be considered in discussing the remainder of the transaction life-cycle.

In order for a cross-network solution to work, the directories used by the ALS, to facilitate the discovery of the payee DFSP, will need to be modified to include information about counter-parties who are represented by DFSPs in other networks. These modifications divide into two different categories, as described below.

#### 7.1.1. Globally unique payee identifiers

There are some ways of identifying a counter-party which are reliably globally unique: for instance, an MSISDN.

In these cases, it is sufficient for the originating party&#39;s DFSP to request information from the ALS in the form used at present. The expectation is that the oracle for MSISDNs and, by extension, oracles for other globally unique identifiers, will contain information for all subscribers who are associated with a DFSP which identifies the DFSP to which they belong.

If a subscriber does not belong to a DFSP, then the search will return nothing. If, on the other hand, a subscriber does belong to a DFSP, then the ALS will return the identifier (Moja Address) of the DFSP to which the subscriber belongs, as at present.

This form of search does not require any modifications to the existing interface, although the consequences for the requesting DFSP of the information returned will be different. These differences are described in Section 7.2 below.

**Note:** As discussed in **5.3**** Changes to the API **above, the interface may be changed to return a new data element, the** FspAddress **, containing the Moja Address if it is desirable for this to be distinct from the** FspId**.

#### 7.1.2. Non-unique payee identifiers

Other ways of identifying a counter-party are not reliably unique across all possible networks. An example is a national ID number, which might be duplicated in another country&#39;s ID system. In this case, additional information must be supplied to disambiguate the ID number: to say, for instance, that this is a national ID belonging to the Kenyan or the Peruvian national ID scheme.

Disambiguation will require the inclusion of an additional piece of information to the submission to the ALS. One such additional piece of information which already exists is the Party Sub ID or Type (defined in Section 6.3.27 of the Open API Specification.) However, the addressing examples given in Section 4.2 of the Open API Specification suggest that this will not be sufficient. In one of the examples given there, an employee of a business is identified by giving the employee&#39;s name as a Sub ID, while the business name is given as the main identifier. Since a business name will not be globally unique, the Sub ID will not be available to define the context in which the non-unique identifier is to be evaluated. It will therefore be necessary to use an additional identifier (for instance, &quot;IdentifierContext&quot;) to specify the context in which a non-unique identifier is to be evaluated.

In the case of globally unique identifiers, a single instance of an oracle is assumed to be capable of including information about all members of that information type who are represented by a DFSP. Maintenance of the list therefore devolves on a central authority, and no individual implementation need assume responsibility for it. With non-unique identifiers, however this is not the case. The model for the maintenance of directories described in the Open API Specification suggests that each DFSP will be responsible for updating its local ALS (if there is one) using the **/participants** API path (see Section 5.2.) this is the only model that really makes sense, as it is hard to see how a properly segmented global directory of (for instance) business names could be created and maintained.

Two possibilities suggest themselves. These are outlined in more detail below as a stimulus to further discussion.

##### 7.1.2.1. Registration

In order to implement a cross-border model, each Mojaloop system will be registered with all other Mojaloop systems with which it will support interactions.

As part of the registration process, a Mojaloop instance could register a callback to enable it to receive directory updates for non-unique identifiers from the Mojaloop instance with which it was registering and could register a callback from the Mojaloop service with which it was registering to enable it to update that service with new directory input as it became available.

This would enable it to receive ALS updates from all the participating Mojaloop instances with which it was connected as they were made, and to broadcast changes to its own directory to all interested parties. This would require changes to be made to the operation of the ALS but would not require further API changes.

##### 7.1.2.2. Consolidation

As described above, each globally unique identifier will have an oracle service which will provide a global view of identifiers and the DFSP to which each belongs. An alternative to the distributed system of directories for non-unique identifiers described above would be to maintain a consolidated service to be accessed via an oracle, which would be updated by each subscribing ALS as it received updates from the DFSPs which used it.

This would mean that a global oracle would gradually be built up, with the advantages over the registration system described in Section 7.1.2.1 above that an update to the oracle would only need to be made once; they would then be available to any ALS whatsoever. This mechanism could also be used, of course, to keep oracles of unique identifiers up to date as well.

The detailed design for implementing the selected maintenance method(s) is left to a later stage of this document.

#### 7.1.3. Getting Payee Information

As discussed previously, the current API describes an optimization whereby the hub performs a look-up of payee data after it has resolved the payee DFSP identifier and address.

In a cross-network scenario this is still possible but will require that the hub communicates with the payee DFSP via a CNP on the local network. To do this the sending DFSP can address a **/parties** API call to a remote DFSP using one of the techniques described in Cross-Network API calls.

**Note:** _A previous proposal for the hubs to communicate with one another directly was discussed in Arusha in September 2018. This approach has been put aside in favour of a routed messaging solution._

### 7.2. Obtaining a quote

Once a payee has been identified, the next stage in the process of transferring funds is the generation of a quote.

This is a statement from the target DFSP of the charges it proposes to levy to execute the transaction requested by the originator and allows the sending DFSP to provide an accurate breakdown to the sender of the amount that they will pay and the exact amount that will be received by the payee.

It is described in Section 5.5 of the Open API Specification.

The quoting process, as described in the specification today, assumes fixed/well-known fees charged by the switch and therefore assumes that the wholesale amount (i.e. the exact amount that will be received by the payee DFSP) is known by the sending DFSP. This is critical in the case of quoting for a fixed sending amount, as the quote request will indicate to the payee DFSP exactly how much they will receive and therefore what wholesale amount to use as a basis for calculating their retail fees.

In a cross-network scenario it is important to also perform a wholesale quote whereby the sender gathers information about the fees that will be charged by all intermediaries to the transaction and therefor determines the final wholesale amount that will be or will need to be delivered to the payee DFSP.

#### 7.2.1. Fixed Receive Amount

Where the sender specifies a fixed amount they wish the payee to **receive** , the retail quote process will execute as defined today. The payer DFSP will perform a cross-network **/quotes** API request in the manner defined in Cross-Network API calls.

At this point, the payer knows the wholesale amount that must be delivered to the payee DFSP, so they can route a wholesale quote message via one or more routes to the payee DFSP to determine the wholesale amount they must send.

The wholesale quote process is defined in Obtaining a wholesale quote below.

#### 7.2.2. Fixed Send Amount

Where the sender specifies a fixed amount they wish to send, it is necessary to do the wholesale quote before the retail quote.

After accounting for their own fees, the sending DFSP determines the wholesale amount that will be delivered to the payee DFSP by obtaining a wholesale quote as described below.

Knowing the wholesale amount that will be delivered, the payer DFSP will then perform a cross-network **/quotes** API request in the manner defined in Cross-Network API calls to determine the exact amount that the payee will receive.

#### 7.2.3. Obtaining a wholesale quote

A wholesale quote calculates the fees and charges from intermediaries that route the transaction to the payee DFSP. In order to calculate these charges, it is necessary to work out available routes between the payer and payee DFSPs and to get a quote from the participants along each.

The process of obtaining a wholesale quote also raises the question of regulatory compliance. For the sake of simplicity, this is dealt with separately in Section 7.4 below.

To recap, the two possible deployment scenarios for performing Cross-Network API calls are:

1. Routing at the hub, and
2. Routing at the DFSP

The major difference between these two is most obvious when performing the wholesale quote algorithm. For other API calls the route taken by the message has little to no influence on the outcome.

For wholesale quotes, when routing is done at the hub, the payer DFSP will simply request a single wholesale quote, which the hub will route to the payee DFSP via a CNP they select.

However, where the DFSP chooses the route it may be aware of multiple options within the local network that are potential gateways to the remote DFSP and it has the option of sending multiple quote requests to determine which is best.

In both scenarios the flow is the same, however in the latter scenario the DFSP will have potentially multiple results from different routes and will select the one they wish to use before continuing.

The process begins with the payer DFSP sending a request (a new API method) for a wholesale quote which is routed via one or more CNPs to the payee DFSP who responds with an acknowledgement.

At each hop (on both the request and response legs) the intermediary is able to augment the message with data about the charges it will impose on the transaction and the data it will require in order to meet its regulatory obligations. On receiving the response, the sender is able to collate these and calculate the full cost of sending down that route and determine what data must be sent with the transaction to satisfy the intermediaries.

The specific design of this new API method is left for further discussion however it is expected to include:

1. A mechanism for intermediaries to attach the information about the fees they will charge to the request and response messages.
2. A mechanism for intermediaries to attach the data they require in order to process the transaction.
3. A mechanism for intermediaries to sign (and possibly encrypt) the data they provide
4. A mechanism for intermediaries to indicate to the next participant in a route the amount that will be sent to them and/or data requirements they have for that participant.

### 7.3. Routing

In the scenario where alternative routes are probed for a quote, it is important for the transfer that follows to carry information about what route it is intended to follow. This &quot;source specified routing&quot; will be done set by the payer DFSP in the FSPIOP-Route header.

### 7.4. Regulatory compliance

When a CNP handles a transaction between two parties, it may make itself liable to demonstrate that it has taken proper steps to assure itself that the transaction complies with the regulations in force in the jurisdiction where the CNP is implemented.

These regulations may differ widely between jurisdictions, and any solution to this problem should therefore be decentralised to the providers themselves, rather than rely on a central authority. The problem may not need to be solved solely for CNPs, since it will also apply to other participants in the execution of a transaction, such as providers of FX services; however, the term CNP is used for simplicity in the rest of this discussion. The proposal for meeting this requirement is as follows.

As a wholesale quote is being prepared, a CNP should be able to add to its response, as well as the charge described above, a statement of the information required from the parties to the transaction to meet the requirements of the provider&#39;s regulatory regime. This statement of regulatory requirements should contain a variable number of categories for which information is requested.

**Assumption** _: at some point we will need an overall definition of terms, such that participants will be able to understand each other&#39;s requests and map them onto their information. This definition will be extensible, so that new requirements from new or existing regulators can be included._

If the CNP is asking for information about the payee, then the payee DFSP will parse the information requests and fill in those for which it has information. For any items which are requested for which the payee DFSP does not have information available, the payee DFSP will make a standard response stating this.

If the CNP is asking for information about the payer, then the requests will be returned along with the route and charge information. It will be the responsibility of the payer DFSP to parse the information requests for the selected route and to fill in those for which it has the requested information.

At this point, matching regulatory requests with the information available to a DFSP may become an important part of selecting a route.

In any case, the information will be encrypted using a key provided by the CNP in question, and will be included in the information accompanying the transaction when it is executed. It will be the responsibility of each CNP through which the transaction passes to decrypt the information using its private key, check it for completeness and either forward the transaction or reject it depending on the result of the check.

### 7.5. Executing a transaction

When the payer DFSP has selected a route, it will execute the transaction. This process is described in Section 5.7 of the Open API specification.

The execution process will be the same as at present, with the following exceptions:

1. The initiator of the transaction will need to separate the definition of the ultimate recipient of a transaction (the payee DFSP) from the definition of the next recipient of the transfer request as defined in Cross-Network API calls.
2. The initiator will send an amount which is equal to the amount specified by the payee DFSP as part of the quotation process plus any charges levied by intermediates on the specified route.
3. When an intermediate receives a transaction for forwarding, it will perform the following actions:
  1. Decrypt the compliance information, if there is any, using the private key. Persist the compliance information.
  2. Check the compliance information for correctness. If the information is incorrect or insufficient, cancel the transaction and return the cancellation to the forwarder.
  3. Remove the amount of the charge it has agreed to levy from the transaction amount.
  4. Forward the transaction to the next intermediate. Reservations in the relevant ledgers will be handled by the switches through which the transfers are routed.
4. When the eventual destination DFSP has confirmed or declined the transaction, the confirm or decline message will be passed back down the chain of intermediaries.
5. When an intermediate receives a confirmation message, it will forward the confirmation to the provider before it in the chain.
6. When an intermediate receives a cancellation message, it will cancel the funds reservations in its ledgers for the charge and the residual amount and will return to the provider before it in the chain.

This concludes the changes required to support intermediate processing and charging for inter-network transfers.

## 8. Currency conversion support

This section describes how currency conversion might be supported in a single Mojaloop environment using similar techniques to a multi-network transaction. It is a hypothesis which is subject to further discussion by the wider Mojaloop community.

The question of currency conversion is separate from, though it is clearly related to, the question of cross-network support; however, it is possible for currency conversion support to be required in a single network where that implementation crosses currency boundaries.

In this case we can think of a single Mojaloop implementation as the centre of two (or more) logical networks, one for each currency. FXPs serve as the bridges between these networks in the same way that a CNP bridges two Mojaloop-based networks centred on different Mojaloop implementations.

As such, this discussion is based around the assumptions that currency conversion will be provided by DFSPs and not, for instance, by services within the switch.

The assumption is that a cross-currency payment in a single network will consist of, at least, two distinct transfers. A transfer in the sending currency to an FXP, and a subsequent transfer from the FXP to the recipient DFSP.

This also assumes that the Mojaloop system will be capable of servicing accounts in multiple currencies. It is important to note, however, that this doesn't mean the Mojaloop system must support cross-currency transfers as this adds significant complexity to the system. Rather, the clearing accounts in the system can be partitioned by currency and any single transfer will have the same sending and receiving currency.

A network participant (DFSP) may have multiple clearing accounts in different currencies.

### 8.1. Nomination of receiving currency

At present, the definition of the PartyIdInfo complex type (see Section 7.4.13 of the Open API specification) which is returned from a call to the **/parties** resource does not include any information about the currency to be used to remit funds to the party. This information can at present only be obtained by issuing a **GET** call on the **/participants** resource for a specific party and currency and seeing whether or not information is returned.

In order properly to support cross-currency transfers, the definition of the **PartyIdInfo** complex type should be extended to support the definition of the currency or currencies in which the party can receive or pay funds.

It will also be necessary to segment the address space by currency so that an entity that has multiple accounts in different currencies can allocate a different address to each of these facilitating the routing of transfers via an appropriate FXP if required.

### 8.2. Determination of currency conversion requirements

Determination that a recipient requires payment in different currency to the sending account follows similar logic to the determination that a recipient is on another Mojaloop-based network.

A sending DFSP will have a Moja Address in a country and currency specific address space. If the address of the recipient is in a different address space then the sending DFSP knows that the recipient DFSP is either in another network or accepts another currency.

In either situation the flow is the same. The sending DFSP must route API calls to the recipient using the flow described in Cross-Network API calls above.

### 8.3. Foreign exchange providers

The Mojaloop system will allow a DFSP to identify itself as a Foreign Exchange Provider (FXP). An FXP will provide the following services:

### 8.3.1. Addresses

When an FXP is registered with a scheme, it will specify the currency conversions that it wants to support. These conversions will be stored by the switch as part of the information relating to the FXP.

This means the FXP will have at least two different Moja Address, one for each currency which will be tracked by the routing table at the hub.

#### 8.3.2. Ledgers

An FXP will be required to maintain a ledger at the Mojaloop switch for each currency for which it offers conversions. This will allow the movement of funds associated with currency conversions to be tracked in the same way as other transfers. In the example given in Figure 3, this will work in the following way:

1. DFSP 1A&#39;s USD ledger at the switch will be debited by $100.
2. FXP1&#39;s USD ledger at the switch will be credited by $100.
3. FXP1&#39;s EUR ledger at the switch will be debited by €88.
4. DFSP 1B&#39;s ledger at the switch will be credited by €88.

The consequence of this architecture is that settlement with FXPs will proceed in the same way as settlement between other DFSPs in the system: FXPs will be paid, or required to pay, the net amounts in each currency of the transfers they have processed during a given settlement period.

#### 8.3.3. Quote for currency conversion

If a DFSP wants to obtain a quotation for a currency conversion, it should be able to send a request for a currency conversion. This should have a similar form to an existing quotation request, and should contain at a minimum:

1. The payer DFSP
2. The payee DFSP
3. The amount in the source currency, including a specification of the currency to be used
4. The amount in the destination currency, including a specification of the currency to be used.
5. A statement of the validity period required.

Either the source amount or the destination amount should be present, depending on whether the requester wants to specify the amount that should be sent or the amount that should be received. If both amounts are present, then the FXP should assume that the source currency is the one specified, and that the destination amount can be changed. The currency should be present for both source and destination. If one or both currencies are absent, or if they are the same, then the request for quotation should be rejected.

The FXP will assume that payee DFSP involved in the transaction is capable of receiving funds in the currency denominated. It does not need to test or confirm this assumption as the quote will be routed via other FXPs if required based upon the Moja Address of the recipient.

The recipient of a currency quotation will respond in a way analogous to the current **/queries** resource: that is, it will return the quotation request with both source and destination currencies filled in.

## 9. Security

This section proposes a way in which information could be made available to the appropriate parties in a routing chain, while also ensuring that other parties cannot read the information. It uses standard public/private key encryption techniques.

These techniques need to meet the following requirements:

1. When an intermediary attaches information to the request for quotation, that information should only be readable by the payer DFSP.
2. When an intermediary attaches a request for compliance information from the payee DFSP to a request for quotation, that information should only be readable by the payee DFSP
3. When a DFSP attaches information to the transfer request, that information should only be readable by the intermediary to which it relates.

These requirements will be met in the following way:

1. When the payer DFSP issues a request to identify a party (i.e. a **GET** command on the **/parties** resource,) the information returned should be extended to allow the return of a public key to be used for the encryption of information to be read by the payee DFSP.
2. When the payer DFSP issues a request for transfer, it will include the following information in the request:
  1. A public key to be used by intermediaries to encrypt requests for information from the payer DFSP;
  2. the public key that was returned from the payee DFSP in step 1 above and which is to be used to encrypt information requests for the payee DFSP.
3. Intermediaries will use the appropriate public key to encrypt the information on charges and regulatory requirements which they are sending back to the payer DFSP or forward to the payee DFSP. This information will only be readable by the addressee DFSP using its private key, but the DFSP will be able to read all the intermediary responses.
4. Each intermediary will include a public key for encrypting its own information in the (encrypted) information it sends back to either DFSP.
5. When a DFSP constructs the regulatory information to be sent back as part of the transfer, it will use the public key transmitted by each intermediary to encrypt that intermediary&#39;s information. This information will now be readable only by the intermediary for whom it is intended, using the intermediary&#39;s private key.

This scheme naturally requires some form of PKI infrastructure to allow participants to verify that keys belong to the entities that have requested their use. It is suggested that standard x.509 mechanisms for PKI are used and that either existing or a new dedicated CA infrastructure is established.