# QUN 0.1 verification plan

| ID | Check | Pass condition |
|---|---|---|
| CH-01 | Contract compilation | Solidity compiler completes successfully |
| CH-02 | Initial issuance | Owner receives 100,000,000 QUN |
| CH-03 | Transfer | Alice transfers 40 QUN to Bob; balances match |
| CH-04 | Mint access | Non-owner mint attempt reverts |
| CH-05 | Cap | Mint above 1,000,000,000 QUN total supply reverts |
| AI-01 | Health | GET `/health` returns service name/version/model |
| AI-02 | Inference | POST `/chat` returns model-generated text |
| AI-03 | Backend unavailable | API returns a controlled 502 error, no secret details |

This plan does not replace a smart-contract audit, fuzz testing, static analysis, chain-level testing or legal review.
