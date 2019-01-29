# Cross-Network Transfers

*_EXPERIMENTAL_*: This repository is a WIP collection of experiments and POCs for cross-network transfers over Mojaloop.

When this work has matured it will be migrated into the core project.

## Links

 * [Proposal](./blob/master/proposal.md)
 * [POC Part 1 Report](./blob/master/part1.md) published 29 January 2019
 * [POC Part 1 Presentation](./blob/master/part1.pdf) published 30 January 2019

## Output

The following output may be incorporated into the core project. Proposed changes to the API as a result of this work are captured in this proposal:

  * [api-changes](./blob/master/api-changes.md)


### New Components
  * [Interop Switch](../interops-switch-js/)  
  A replacement for the previous Mule-based interop switch, implemented in Javascript
  * [Mock DFSP (deprecated)](../mock-dfsp/)  
  A DFSP simulator. Deprecated in favour of [simulators](../simulators/).

### Changes to Existing Components
  * [Mojaloop API Adapter (feature branch)](../ml-api-adapter/tree/feature/cross-network)  
  Changes for POC
  * [Central Ledger (feature branch)](../central-ledger/tree/feature/cross-network)  
  Changes for POC