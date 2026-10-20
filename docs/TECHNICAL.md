# Technical documentation: Stipend Fintech

Stipend gives AI agents a spending allowance whose rules are enforced by a smart contract on Base. The owner sets the limits; the agent spends inside them; anything outside fails on-chain with a named error. Track: **Topic F, Agent Wallet**.

## Layers

1. **Smart contracts on Base**: the rules engine (`StipendVault.sol`). The core; every other layer can fail without letting money leave outside the rules.
2. **Funding**: Particle Network Universal Accounts, fund from any token on any chain. All limits are in USDC.
3. **AI agent** (`app/agent`, `app/api/agent`): does the task, pays an x402 API per call (`app/api/research`), and has a malicious-page button that shows `RecipientNotAllowed()` blocking an injected payment.
4. **Dashboard** (`app/dashboard`, `app/create`): create a stipend, set safety rules (per-payment cap, payment count, approval threshold, expiry, guardian, approved recipients), pause, approve queued payments, revoke.
5. **Alerts and monitoring**: roadmap (Telegram/email, anomaly auto-pause through the guardian role).

## One paid API call

1. The student gives the agent a task.
2. The agent requests data; the API answers 402 with a price.
3. The agent checks its budget, then calls `pay(id, to, amount)`. The rules engine checks every limit.
4. Within the rules, USDC goes to the API and the agent receives the data. Outside them, the call reverts with a named error and nothing moves. Over the approval threshold, the payment is queued for the owner.
5. Every payment and block is written to the event log.

## Contract API (additions for Stipend Fintech)

| Function | Caller | Purpose |
| --- | --- | --- |
| `setRules(id, txCap, expiry, maxPerPeriodCount, approvalThreshold, guardian, allowlistOn)` | Owner | Per-payment cap, expiry, payment count, approval threshold, guardian, allowlist switch (0 = off) |
| `setRecipientAllowed(id, to, allowed)` | Owner | Approved recipients list |
| `setPaused(id, paused)` | Owner or guardian | Freeze / unfreeze spending |
| `pay(id, to, amount)` | Agent | Pay an approved recipient; queues above the threshold |
| `approvePayment(pendingId)` | Owner | Release a queued payment (all other rules re-checked) |

Existing functions are unchanged: `createStipend`, `fund`, `claim`, `revoke`, `modify`, `approveAgent`, `available`, `getPolicy`. `claim` now also enforces the new rules.

## Test

```bash
cd contracts && forge soldeer install && forge test
```

## Demo story

Tolu's mum funds Tolu's AI study assistant: $2 per payment, $5 per week, $20 lifetime, approved data APIs only, expiring at the end of term, $1 approval threshold, herself as guardian. The assistant researches "the cheapest laptop under ₦800k that runs SolidWorks", paying per call. A malicious review page tells it to pay `0xABC…`; the chain rejects it with `RecipientNotAllowed()`. (Names are a demo story, not real users.)
