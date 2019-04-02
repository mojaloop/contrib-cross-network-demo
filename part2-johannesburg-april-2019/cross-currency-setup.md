The following document describes setting up and performing a cross-currency transaction. The demo only supports USD-XOF conversions with a conversion rate that has been fixed @ TODO get from don. It assumes you are familiar with setting up a current Mojaloop hub on a kubernetes cluster using helm.

A cross-currency setup consists of the following components:
* Mojaloop Hub
* Mojaloop Routing Service (1 per currency)
  * USD Routing Service
  * XOF Routing Service
* FXP (FSP that handles foreign exchange)


## Deployment
All deployments of the cross-currency utilise helm in the following branch

1. Clone the following github repo `https://github.com/mojaloop/helm`
2. Checkout the `cross-network-blue` branch

### Hub
To deploy the hub run the following helm command

1. run `helm install --namespace=mojaloop --name=dev ./cross-network`

### Routing services
Currently the routing is done using a routing service per currency. It is hoped in the next iteration this is reduced to a single service to simplify deployments.

#### XOF

1. In the helm charts go into the routing folder and open the `values.yaml` file. In this file edit the hosts line to be prefixed by `xof`, ie `- host: 'xof.routing.local'` `
2. run `helm install --namespace=mojaloop --name=xof ./routing`

#### USD

1. In the helm charts go into the routing folder and open the `values.yaml` file. In this file edit the hosts line to be prefixed by `usd`, ie `- host: 'usd.routing.local'` `
2. run `helm install --namespace=mojaloop --name=usd ./routing`

### FXP

1. `helm install --name=cnp --namespace=mojaloop ./cross-network-provider`

## Setup of environment
Once all the services are deployed you can now setup the environment. Setup takes place using Postman

1. Clone the following github repo `https://github.com/mojaloop/cross-network`
2. Open Postman and click import
3. Import the environment variables from `projects/postman/Mojaloop Cross-currency.postman_environment.json`
4. Import the collection from `projects/postman/Cross Currency.postman_collection.json`
5. Run the setup folder in the `Cross Currency` collection using the `Mojaloop Cross-currency` environment variables

Once the setup has been run in postman, the environment will be fully setup to begin performing cross-currency transactions.

## Making a Cross-Currency Transaction
To perform a cross-currency transaction use the `Golden Path` folder in the `Cross Currency` collection. 

*NOTE:* Before running the the last step, `5. Transfer Fulfil Request`, you need to ensure the environment variable `transferId` is updated to reflect the `transferId` of the transfer POST request that was received at DFSP2. This is due to the fact that the transferId is unique between each leg of the transaction. IE `transferId1` for transfer from dfsp1 to fxp and `transferId2` for transfer from fxp to dfsp2