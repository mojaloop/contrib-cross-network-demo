# Changes for Mojaloop API

This document proposes changes to the Mojaloop API that have arisen as outputs of the cross-network POC work.

> This document is a "living document" and will be updated as the cross-network POC evolves and as the impact on the API is clarified.

## Alignment with ILP version 4 and the cross-network routing headers

The current API (v1) is aligned with a legacy version of the Interledger protocol (v1). The cross-network POC uses the latest reference implementations of the protocol (v4). Therefor, it is useful to align the API to ILPv4, not only for the sake of deprecating what is an outdated implementation, but also to enable the cross-network POC to use the latest open source Interledger components.

### Mojaloop as a "Bilateral Protocol" in ILP

In an Interledger transaction ILP packets are passed between participants with a direct bilateral relationship. The ILP packets carry the details of a transfer from the one participant to the other. The payload of the packet is end-to-end data that is used to convey transaction information from the payer to the payee.

When looking at the Mojaloop API, in the context of the Interledger protocol, we consider **a transfer between two DFSPs** as analogous to **the exchange of ILP packets** between nodes.

> **NOTE**: We may wish to explore modelling a Mojaloop network such that the switch is also a node and the transfer from DFSP to DFSP is modelled as two "hops" instead of one. This would enable the switch to apply dynamic fees to the transfers.

### The ILP "packet" and the differences between v1 and v4

In ILPv1 the ILP packet was enveloped in what was called a "ledger protocol" message. Ledger protocols were used between nodes and their shared ledger and contained the details of the transfer including the condition, expiry and transfer amount. The ILPv1 packet contained the `ILP address` of the payee, the `destination amount` and the end-to-end `data` payload.

In ILPv4, the protocol was adjusted to be used directly between nodes via a "bilateral protocol". In the bilateral protocol model the detail of the transfer between the the two nodes is now included in the ILPv4 packet headers, including:

  - The `transfer amount`
  - The `execution condition`
  - The `transfer expiry`

The `destination amount` was dropped from the packet headers as this is sensitive data and is expected to be part of the end-to-end payload.

In Interledger terminology the Mojaloop `/transfer` API is therefor a bilateral protocol (carrying the details of the transfer between nodes), however it is missing the ILP address of the payee.

### Cross-network POC changes

The omission of the address is addressed in the cross-network POC, which proposes that the `FSPIOP-Destination` header in the `/transfer` API contains a Moja address.

Therefore, when considering the migration to ILPv4, in conjunction with the cross-network changes, the API maps cleanly to the ILPv4 packet.

> **NOTE:** The Interledger community is currently working on an HTTP-based bilateral protocol which has many similarities to the Mojaloop `/transaction` API. This proposal will likely bring these two parallel work streams closer to alignment.

## Proposed Changes

The concrete changes proposed are:

  1. Remove `ilpPacket` from the `transfer` object.
  1. Add the `transaction` object as a property of the `transfer` object (previously the payload of the embedded packet).
  1. Use `FSPIOP-Destination` header to hold the address of payee and remove the length restriction on the data type.

With these changes the `/transaction` API is now a direct mapping from the ILPv4 packet:

| ILP Prepare | Mojaloop `/transaction` API  |
|-------------|------------------------------|
| destination | `headers.FSPIOP-Destination` |
| amount      | `transfer.amount`            |
| expiry      | `transfer.expiry`            |
| condition   | `transfer.condition`         |
| payload     | `transfer.transaction`       |
