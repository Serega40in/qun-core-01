# QUN 0.1 architecture

## Decision record
- Chain direction: independent EVM-compatible network, developed only after token prototype validation.
- Token: ERC-20 prototype on local Hardhat EVM. This is not yet the native coin of an independent chain.
- AI: open-weight model served locally through Ollama, accessed through a small FastAPI service.
- Initial infrastructure: local machine first; avoid paid hosting until usage and hardware requirements are measured.

## Logical components
1. QUN Chain: EVM client / consensus, RPC, validators, explorer, monitoring. Later phase.
2. QUN Assets: audited ERC-20 / ERC-721 / ERC-1155 contracts and an indexer. Prototype only contains capped ERC-20.
3. QUN AI: Ollama model runtime -> FastAPI gateway -> future retrieval-augmented generation (RAG) over approved QUN documentation.
4. QUN Apps: marketplace, messenger, organization map and wallet UI. Apps call APIs; they must not hold server secrets.
5. Data: PostgreSQL for application state; blockchain remains source of truth for on-chain balances and events.

## Token prototype parameters (temporary test assumptions)
- Name/symbol: QUN / QUN
- Initial supply: 100,000,000 QUN
- Hard cap: 1,000,000,000 QUN
- Decimals: 18 (ERC-20 standard)
- Minting: owner-only in this prototype

These values are placeholders for local testing, not an approved tokenomics model. Production issuance should be governed by audited, transparent rules, ideally multisig/timelock and/or on-chain governance. Never use the prototype contract for real funds.

## Milestones
### M0 — Reproducible local baseline
- Install Node.js LTS and Python 3.11+.
- Install dependencies; compile and run contract tests.
- Start local EVM and deploy QUNToken.
- Verify deployment address, total supply, transfer and cap.

### M1 — Wallet interaction
- Add a simple web page using ethers.js and MetaMask.
- Add balance, transfer form, transaction receipt and explorer-like local history.
- Test chain ID / RPC mismatch and failed transaction states.

### M2 — AI local inference
- Start Ollama and pull the selected open model.
- Start FastAPI gateway and verify /health and /chat.
- Benchmark latency and memory on target hardware; choose model based on measurements, not assumptions.

### M3 — AI + marketplace
- Add structured listing-generation endpoint with JSON schema validation.
- Keep human confirmation before publishing listings or initiating transactions.
- Add RAG against curated product docs; do not train on private chats without explicit consent.

### M4 — EVM network decision and testnet
- Compare maintaining a forked EVM client versus a framework such as Polygon CDK / OP Stack / Cosmos EVM, based on current support, licensing, validator design, costs and operations.
- Define consensus, chain ID, gas token, validator admission, RPC access, upgrade governance and recovery procedures.
- Launch public testnet only after threat modelling, monitoring, backups and reproducible builds.

### M5 — Digital asset economy
- Define use cases before tokenomics: payment, service fees, rewards, governance, NFTs, tokenized assets.
- Do not imply that an on-chain token automatically represents legal ownership of off-chain assets.
- Obtain legal review for target jurisdictions before public sale, custody, exchange listing or asset tokenization.
- Security review and independent audit before mainnet or real-value use.

## Security non-negotiables
- Never commit seed phrases, private keys, service-role keys or production secrets.
- Local Hardhat private keys are public test keys; never fund them with real assets.
- Use multisig + timelock for privileged production actions; publish mint/burn rules.
- Test access control, caps, reentrancy risks in future contracts, dependencies and upgrade permissions.
- AI is advisory only: it cannot claim a transaction succeeded without chain verification and cannot receive signing keys.
- Separate app database records from authoritative chain state; indexer must be replayable from chain events.
