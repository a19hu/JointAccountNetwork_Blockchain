# CSL7490 Assignment-2 Solution

This repository contains:
- Solidity smart contract implementing the DApp.
- Python script to deploy and test the DApp on a local Ethereum node.

## Files
- `contracts/JointAccountNetwork.sol`
- `scripts/run_assignment.py`
- `requirements.txt`
- `report.md`

## Prerequisites
1. Python 3.10+
2. Local Ethereum node running at `http://127.0.0.1:8545` with unlocked accounts
   - You can use a private geth network or Ganache for testing.
3. `pip` packages:
   ```bash
   pip install -r requirements.txt
   ```

## Run
From project root:
```bash
python3 scripts/run_assignment.py
```

The script will:
1. Compile and deploy the smart contract.
2. Register 100 users.
3. Build a connected power-law graph and create joint accounts.
4. Initialize account balances from exponential distribution (mean 10), split equally.
5. Fire 1000 unit `sendAmount` transactions on random user pairs.
6. Print success ratio after every 100 transactions.
7. Save output plot to `success_ratio.png` and raw values to `results.json`.

## Smart Contract Function Mapping
- `registerUser(userId, userName)`
- `createAcc(userId1, userId2)` and `createAcc(userId1, userId2, contribution1, contribution2)`
- `sendAmount(fromUserId, toUserId)` and `sendAmount(fromUserId, toUserId, amount)`
- `closeAccount(userId1, userId2)`

`sendAmount` uses shortest-hop path (BFS). If multiple shortest paths exist, traversal order follows neighbor insertion order and picks the first discovered path.
