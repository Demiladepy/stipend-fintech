# Security self-assessment: Stipend Fintech

The most an attacker can take is what the owner already agreed the agent could spend. Every role gets the least power it needs.

## Roles

| Role | Who | Can | Cannot |
| --- | --- | --- | --- |
| Owner | The person funding it (the parent) | Fund, set and change rules, approve queued payments, pause, revoke, withdraw | Nothing is blocked |
| Guardian | A trusted second person or finance team | Pause and unpause (`setPaused`) | Spend, withdraw or change rules |
| Agent | The AI's own key | Call `pay` / `claim` within the rules | Withdraw, change rules, pay unlisted recipients |
| Merchant | An approved recipient or x402 service | Receive payments | Pull funds or call anything |

## Rules enforced on-chain (`contracts/src/StipendVault.sol`)

| Rule | Error when broken |
| --- | --- |
| Limit per payment | `OverTxCap()` |
| Limit per period | `OverPeriodCap()` |
| Lifetime limit | `OverTotalCap()` |
| Payment count per period | `OverPeriodCount()` |
| Approved recipients | `RecipientNotAllowed()` |
| Expiry | `StipendExpired()` |
| Approval threshold | Queued (`PaymentQueued`), not failed; owner calls `approvePayment` |
| Pause | `StipendPaused()` |

## Defences

- **On-chain enforcement.** Every limit is checked inside the contract, so off-chain code cannot bypass it.
- **Off-chain pre-checks.** The agent checks the rules before paying, so normal use never hits a revert.
- **Every action logged.** Payments, queued payments, rule changes and pauses emit events.
- **Testing.** Foundry unit tests for every rule and error (`forge test`, 51 passing).
- **Standard building blocks.** OpenZeppelin `SafeERC20` and `ReentrancyGuard`.

## Known risks

| Risk | What could happen | Mitigation |
| --- | --- | --- |
| Agent key stolen | The thief spends up to the remaining cap | Caps bound the loss; recipient allowlist; pause; instant revoke |
| Owner key stolen | The thief controls rules and funds | Recommend a hardware or multisig wallet; guardian can pause |
| Period-boundary spending | Full limit at the end of one period plus the start of the next | Documented; rolling window is a future option |
| Malicious prompts | The agent is told to pay a stranger | Recipient allowlist enforced on-chain |
| EIP-7702 phishing | A user delegates their wallet to a malicious contract | Only our published delegate address; clear signing screen |
| USDC freeze | The issuer can freeze USDC at an address | Disclosed; other stablecoins later |
| Particle Network dependency | Funding fails if their service is down | Direct USDC deposit always works |
| No external audit | Undiscovered contract bugs | Tests now; fuzzing, Slither and an audit before real users' funds |
