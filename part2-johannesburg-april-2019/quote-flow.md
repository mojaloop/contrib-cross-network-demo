## WIP - Document is Work in progress to determine handling fees and commission in quote with intermediary

Todo:

- Non-Disclosing of fees structured fixed RECEIVE
- Disclosing of fees structured fixed SEND
- Disclosing of fees structured fixed RECIEVE

# Handling fees and commissions for Quote Request with intermediary (FXP) 

## Fixed Send Non Disclosing Fees

### Problem

How to handle fee and commission information when intermediaries are involved in an end-to-end quote

### Setup

Sending a quote request from `FSP pink` to `FSP Red` that is routed via an intermediary `FXP` to allow for currency conversion of a Non-Disclosing of fees structured fixed SEND

Flow: 

- Quote request to FIXED SEND of 100 USD from fsp-pink to fsp-red (XOF) via the Hub
- Hub routes request to FXP who converts to XOF and forwards to fsp-red via the Hub

Notes:

- fsp-pink adds a fee of 2 USD
- fpx adds a fee of 2 USD for conversion
- 1 USD equals 579.59 XOF
- fxp-red adds a commission of 1000 XOF (1.72) and a fee of 1500 XOF (USD 2,58)

#### Generic Quote Request 

```json
{
  "quoteId": "UUID",
 	"transactionId": "UUID",
 	"transactionRequestid": "UUID",
  "payee": {
    "partyIdInfo": {
      "partyIdType": "MSISDN",
      "partyIdentifier": "123456789",
      "partySubIdOrType": "",
      "fspId": "red"
    },
    "personalInfo": {
      "complexName": {
        "firstName": "Bob",
        "lastName": "Ruth"
      }
    }
  },
  "payer": {
    "partyIdInfo": {
      	"partyIdType": "MSISDN",
      	"partyIdentifier": "987654321",
      	"partySubIdOrType": "",
      	"fspId": "pink"
    },
    "personalInfo": {
      "complexName": {
        "firstName": "Alice",
        "lastName": "Wonder"
      }
    }
  },
  "amountType": "SEND",
  "amount": {
    "amount": "100"
    "currency": "USD"
  },
  "fees": {
    "amount": "5"
    "currency": "USD"
  },
  "transactionType": {
    "scenario": "TRANSFER",
    "initiator": "PAYER",
    "initiatorType": "CONSUMER"
  },
  "note": "Paying Bob",
  "expiration": "2019-11-15T22:17:28.985-01:00"
}
```



#### Generic Quote Response 

```json
{
  "transferAmount": {
    "amount": "100",
    "currency": "USD"
  },
  "payeeReceiveAmount": {
    "amount": "x",
    "currency": "USD"
  },
  "payeeFspFee": {
    "amount": "x",
    "currency": "USD"
  },
  "payeeFspCommission": {
    "amount": "x",
    "currency": "USD"
  },
  "expiration": "2019-11-15T22:17:28.985-01:00",
  "ilpPacket": "packetData",
  "condition": "ilpCondition"
}
```



## Option 1

Full transparent where the payer and payee will see commissions and fees of every intermediary in request and amounts are left in the 

### Flow

1. request fsp-pink to fxp

```json
{
 "amountType": "SEND",
  "amount": {
    "amount": "98",
    "currency": "USD"
  }
}
```



2. request fxp to fsp-red

   Subtract 2 USD and do conversion to XOF ( (98-2) * 579.59 = 55640.64)

```json
{
 "amountType": "SEND",
  "amount": {
    "amount": "55640.64",
    "currency": "XOF"
  }
}
```



3. response fsp-red to fxp

   transferAmount = 55640.64 - 1000 (Page 41 of Open API Docs)

   payeeReceiveAmount = 55640.64 - 1500

```json
{
  "transferAmount": {
    "amount": "54640.64",
    "currency": "XOF"
  },
  "payeeReceiveAmount": {
    "amount": "54140.64",
    "currency": "XOF"
  },
  "payeeFspFee": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1500",
    		"currency": "XOF"
      }
    }
  ],
  "payeeFspCommission": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1000",
    		"currency": "XOF"
      }
    },
  ],
}
```



4. response fxp to fsp-pink

   transferAmount in USD = 54640.64/579.59 = 94,27 USD + 2 USD of fees of self = USD 96,27

```json
{
  "transferAmount": {
    "amount": "96,27",
    "currency": "XOF"
  },
  "payeeReceiveAmount": {
    "amount": "54140.64",
    "currency": "XOF"
  },
  "payeeFspFee": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1500",
    		"currency": "XOF"
      }
     },
    {
      "fspId": "fxp",
      "amount": {
        "amount": "2",
        "currency": "USD"
      }
    }
  ],
  "payeeFspCommission": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1000",
    		"currency": "XOF"
      }
    },
  ],
}
```



#### Pros

- Both the payor and payee will only see amounts in a currency they support. 

#### Cons

- Requires modifying API to support sending an array of data

  

## Option 2

The fees and commissions are opaque to the payee and payer and the FXP provider as an intermediary aggregates the fees and commissions into a singular item and converts into the necessary currency for the payer to see

### Flow

1. request fsp-pink to fxp

```json
{
 "amountType": "SEND",
  "amount": {
    "amount": "98",
    "currency": "USD"
  }
}
```



2. request fxp to fsp-red

   Subtract 2 USD and do conversion to XOF ( (98-2) * 579.59 = 55640.64)

```json
{
 "amountType": "SEND",
  "amount": {
    "amount": "55640.64",
    "currency": "XOF"
  }
}
```



3. response fsp-red to fxp

   transferAmount = 55640.64 - 1000 (Page 41 of Open API Docs)

   payeeReceiveAmount = 55640.64 - 1500

```json
{
  "transferAmount": {
    "amount": "54640.64",
    "currency": "XOF"
  },
  "payeeReceiveAmount": {
    "amount": "54140.64",
    "currency": "XOF"
  },
  "payeeFspFee": {
    "amount": "1500",
    "currency": "XOF" 
  },
  "payeeFspCommission": {
    "amount": "1000",
    "currency": "XOF"
  }
}
```



4. response fxp to fsp-pink

   payeeFspFee = 2 USD + 1500/579.59 = 4,59

   payeeFspCommission = 1000/579.59 = 1.73

   transferAmount in USD = 54640.64/579.59 = 94,27 USD + 2 USD of fees of self = USD 96.27

```json
{
  "transferAmount": {
    "amount": "96.27",
    "currency": "USD"
  },
  "payeeReceiveAmount": {
    "amount": "56459",
    "currency": "XOF"
  },
  "payeeFspFee": {
    "amount": "4.59",
    "currency": "USD"
  },
  "payeeFspCommission": {
    "amount": "1.73",
    "currency": "USD"
  }
}
```



#### Pros

- Both the payor and payee will only see amounts in a currency of their hop
- Requires no modification to the current API's

#### Cons

- Very opaque on the source of the fees



#### Questions

- Should the payeeReceiveAmount also be in USD? Should you show an equivalent both?


## Fixed Receive Non Disclosing Fees

### Setup

Sending a quote request from `FSP pink` to `FSP Red` that is routed via an intermediary `FXP` to allow for currency conversion of a Non-Disclosing of fees structured fixed RECEIVE

Flow: 

- Quote request to FIXED RECEIVE of 10000 XOF from fsp-pink to fsp-red (XOF) via the Hub
- Hub routes request to FXP who converts to XOF and forwards to fsp-red via the Hub

Notes:
- fsp-pink adds a fee of 2 USD
- payer is using USD
- fpx adds a fee of 2 USD for conversion
- 1 USD equals 579.59 XOF
- fxp-red adds a commission of 1000 XOF (1.72) and a fee of 1500 XOF (USD 2,58)

#### Generic Quote Request 

```json
{
  "quoteId": "UUID",
 	"transactionId": "UUID",
 	"transactionRequestid": "UUID",
  "payee": {
    "partyIdInfo": {
      "partyIdType": "MSISDN",
      "partyIdentifier": "123456789",
      "partySubIdOrType": "",
      "fspId": "red"
    },
    "personalInfo": {
      "complexName": {
        "firstName": "Bob",
        "lastName": "Ruth"
      }
    }
  },
  "payer": {
    "partyIdInfo": {
      	"partyIdType": "MSISDN",
      	"partyIdentifier": "987654321",
      	"partySubIdOrType": "",
      	"fspId": "pink"
    },
    "personalInfo": {
      "complexName": {
        "firstName": "Alice",
        "lastName": "Wonder"
      }
    }
  },
  "amountType": "RECEIVE",
  "amount": {
    "amount": "10000",
    "currency": "XOF"
  },
  "transactionType": {
    "scenario": "TRANSFER",
    "initiator": "PAYER",
    "initiatorType": "CONSUMER"
  },
  "note": "Paying Bob",
  "expiration": "2019-11-15T22:17:28.985-01:00"
}
```



#### Generic Quote Response 

```json
{
  "transferAmount": {
    "amount": "100",
    "currency": "USD"
  },
  "payeeReceiveAmount": {
    "amount": "x",
    "currency": "USD"
  },
  "payeeFspFee": {
    "amount": "x",
    "currency": "USD"
  },
  "payeeFspCommission": {
    "amount": "x",
    "currency": "USD"
  },
  "expiration": "2019-11-15T22:17:28.985-01:00",
  "ilpPacket": "packetData",
  "condition": "ilpCondition"
}
```



## Option 1

Full transparent where the payer and payee will see commissions and fees of every intermediary in request and amounts are left in currencies of the actual occurrence

### Flow

1. request fsp-pink to fxp

```json
{
 "amountType": "RECEIVE",
  "amount": {
    "amount": "10000",
    "currency": "XOF"
  }
}
```


2. request fxp to fsp-red

Pass on and do nothing

```json
{
 "amountType": "RECEIVE",
  "amount": {
    "amount": "10000",
    "currency": "XOF"
  }
}
```



3. response fsp-red to fxp

   transferAmount = 55640.64 - 1000 (Page 41 of Open API Docs)

   payeeReceiveAmount = 55640.64 - 1500

```json
{
  "transferAmount": {
    "amount": "54640.64",
    "currency": "XOF"
  },
  "payeeReceiveAmount": {
    "amount": "54140.64",
    "currency": "XOF"
  },
  "payeeFspFee": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1500",
    		"currency": "XOF"
      }
    }
  ],
  "payeeFspCommission": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1000",
    		"currency": "XOF"
      }
    },
  ],
}
```



4. response fxp to fsp-pink

   transferAmount in USD = 54640.64/579.59 = 94,27 USD + 2 USD of fees of self = USD 96,27

```json
{
  "transferAmount": {
    "amount": "96,27",
    "currency": "XOF"
  },
  "payeeReceiveAmount": {
    "amount": "54140.64",
    "currency": "XOF"
  },
  "payeeFspFee": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1500",
    		"currency": "XOF"
      }
     },
    {
      "fspId": "fxp",
      "amount": {
        "amount": "2",
        "currency": "USD"
      }
    }
  ],
  "payeeFspCommission": [
     {
      "fspId": "fsp-red",
      "amount": {
       	"amount": "1000",
    		"currency": "XOF"
      }
    },
  ],
}
```



#### Pros

- Both the payor and payee will only see amounts in a currency they support. 

#### Cons

- Requires modifying API to support sending an array of data

  

## Option 2

The fees and commissions are opaque to the payee and payer and the FXP provider as an intermediary aggregates the fees and commissions into a singular item and converts into the necessary currency for the payer to see

### Flow

1. request fsp-pink to fxp

```json
{
 "amountType": "SEND",
  "amount": {
    "amount": "98",
    "currency": "USD"
  }
}
```



2. request fxp to fsp-red

   Subtract 2 USD and do conversion to XOF ( (98-2) * 579.59 = 55640.64)

```json
{
 "amountType": "SEND",
  "amount": {
    "amount": "55640.64",
    "currency": "XOF"
  }
}
```



3. response fsp-red to fxp

   transferAmount = 55640.64 - 1000 (Page 41 of Open API Docs)

   payeeReceiveAmount = 55640.64 - 1500

```json
{
  "transferAmount": {
    "amount": "54640.64",
    "currency": "XOF"
  },
  "payeeReceiveAmount": {
    "amount": "54140.64",
    "currency": "XOF"
  },
  "payeeFspFee": {
    "amount": "1500",
    "currency": "XOF" 
  },
  "payeeFspCommission": {
    "amount": "1000",
    "currency": "XOF"
  }
}
```



4. response fxp to fsp-pink

   payeeFspFee = 2 USD + 1500/579.59 = 4,59

   payeeFspCommission = 1000/579.59 = 1.73

   transferAmount in USD = 54640.64/579.59 = 94,27 USD + 2 USD of fees of self = USD 96.27

```json
{
  "transferAmount": {
    "amount": "96.27",
    "currency": "USD"
  },
  "payeeReceiveAmount": {
    "amount": "56459",
    "currency": "XOF"
  },
  "payeeFspFee": {
    "amount": "4.59",
    "currency": "USD"
  },
  "payeeFspCommission": {
    "amount": "1.73",
    "currency": "USD"
  }
}
```



#### Pros

- Both the payor and payee will only see amounts in a currency of their hop
- Requires no modification to the current API's

#### Cons

- Very opaque on the source of the fees



#### Questions

- Should the payeeReceiveAmount also be in USD? Should you show an equivalent both?





