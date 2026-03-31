# Report: DApp for Joint-Account Routing Transactions

## 1. Problem Statement
Implemented a decentralized application on Ethereum where users form pairwise joint accounts and transfer balance through multi-hop routing if a path exists.

## 2. Contract Design
Contract: `JointAccountNetwork.sol`

### Implemented functions
- `registerUser(userId, userName)`
- `createAcc(userId1, userId2)`
- `createAcc(userId1, userId2, contribution1, contribution2)`
- `sendAmount(fromUserId, toUserId)`
- `sendAmount(fromUserId, toUserId, amount)`
- `closeAccount(userId1, userId2)`

### Routing and balance logic
- User network represented as adjacency lists.
- Joint accounts represented as channels with contributions from both endpoints.
- `sendAmount` finds shortest-hop path using BFS.
- Transaction fails if any channel on selected path lacks sender-side balance.
- On each hop, sender contribution decreases and receiver contribution increases, keeping each channel total constant.

## 3. Experimental Setup
- Local Ethereum node: `http://127.0.0.1:8545`
- Script: `scripts/run_assignment.py`
- Users registered: 100
- Network model: connected power-law (preferential attachment)
- Edge total balance distribution: exponential with mean 10, split equally
- Transactions fired: 1000, each of amount 1
- Metric reported every 100 tx: cumulative success ratio

## 4. Output Artifacts
- `results.json`: ratios after every 100 transactions
- `success_ratio.png`: plot of success ratio trend

## 5. Observations Template
Fill after execution:
- Success ratios after 100, 200, ..., 1000 transactions
- Trend explanation (why ratio rises/falls/stabilizes)
- Effect of topology and initial balances on failures

## 6. Conclusion
The implemented DApp satisfies all mandatory functional requirements and supports end-to-end deployment/testing on a local Ethereum network using the provided script.
