# QUN Core 0.1

A reproducible local prototype for the QUN ecosystem:
- local EVM token contract (Hardhat + OpenZeppelin)
- automated tests for supply, transfer, mint permissions and cap
- local LLM API scaffold (FastAPI + Ollama)

**Warning:** This is a development prototype, not an audited blockchain or a real-money token. The ERC-20 contract runs on a local development chain. It is not the native coin of an independent QUN network.

## Requirements
- Node.js 20 LTS recommended
- npm
- Python 3.11+ (only for the AI API)
- Docker (optional, for the AI service)

## A. Verify token prototype
From this directory:

```bash
npm install
npm test
npm run compile
```

Expected: four tests pass, including a user-to-user transfer and supply-cap enforcement. CI will run the same tests on GitHub Actions; check the Actions tab for the actual result.

## B. Deploy to a local EVM
Terminal 1:

```bash
npm run chain
```

Terminal 2:

```bash
npm run deploy:local
```

The deploy script prints the local chain ID, contract address, initial supply and cap. The address is local to this development chain and changes when the chain state is reset.

To use a wallet such as MetaMask, add a local network with RPC `http://127.0.0.1:8545` and the chain ID printed by the local node. Import only a throwaway Hardhat test account if needed; those keys are public and must never hold real assets.

## C. Run QUN AI API
Option 1 — Docker:

```bash
cd ai-service
docker compose up --build -d
docker compose exec ollama ollama pull qwen2.5:3b
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/chat \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Составь короткое описание товара для маркетплейса QUN","mode":"marketplace"}'
```

The first model download can be several GB. Actual performance depends on RAM, CPU/GPU and model quantization. If resources are tight, choose a smaller compatible model and update `OLLAMA_MODEL` in `ai-service/docker-compose.yml`.

Option 2 — local Python API with an already running Ollama service:

```bash
cd ai-service
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Acceptance checklist
- [ ] `npm test` passes all four tests.
- [ ] `npm run compile` completes without errors.
- [ ] Local deploy prints a contract address and supply values.
- [ ] Transfer from owner -> Alice -> Bob produces expected balances.
- [ ] `/health` returns service version.
- [ ] `/chat` returns a response from the selected local model.

## Repository map
```text
contracts/QUNToken.sol       Capped ERC-20 test contract
scripts/deploy.js            Local deployment script
test/QUNToken.test.js        Automated tests
ai-service/app/main.py       FastAPI gateway to Ollama
ai-service/docker-compose.yml Local model + API
ai-service/Dockerfile        API container
docs/ARCHITECTURE.md         Decisions, milestones and security rules
```

See `docs/ARCHITECTURE.md` for the roadmap from local prototype to an independently operated EVM testnet.
