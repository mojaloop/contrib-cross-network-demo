# Cross-Network Transfers

*_EXPERIMENTAL_*: This repository is a WIP collection of experiments and POCs for cross-network transfers over Mojaloop.

When this work has matured it will be migrated into the core project.

## Links

 * [Proposal](./proposal.md)

## Part 1 - Presented in Arusha - January 2019

In Arusha we presented a working POC of a cross-network transfer and proposed some API changes required to facilitate this. We developed a new interop-switch in Javascript and a simulator which we have deprecated in favour of the simulator contributed by Mowali.

 * [POC Part 1 Report](./part1-arusha-jan-2019/part1.md) published 29 January 2019
 * [POC Part 1 Presentation](./part1-arusha-jan-2019/part1.pdf) published 30 January 2019
 * [Proposed API Changes](./part1-arusha-jan-2019/api-changes.md)

### New components

 * [Interop Switch](../interops-switch-js/)  
  A replacement for the previous Mule-based interop switch, implemented in Javascript
 * [Mock DFSP (deprecated)](../mock-dfsp/)  
  A DFSP simulator. Deprecated in favour of [simulators](../simulators/).

### Changes to Existing Components

  * [Mojaloop API Adapter (feature branch)](../ml-api-adapter/tree/feature/cross-network)  
  Changes for POC
  * [Central Ledger (feature branch)](../central-ledger/tree/feature/cross-network)  
  Changes for POC
  
## Part 2

In part 2 we will be focusing on in-network cross-currency and preparing our new components for integration into the main code base. We have also identified further API changes that are required.

 * [Proposed API Changes](./part2-johannesburg-april-2019/api-changes.md)


