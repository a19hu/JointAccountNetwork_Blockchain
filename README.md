# CSL7490 Assignment-2 Solution

This repository contains a Solidity implementation of the joint account network, Truffle tests, deployment scripts, and a simulation script for generating the assignment results.

## Project Structure

- `project/contracts/JointAccountNetwork.sol` - main smart contract
- `project/migrations/1_deploy_joint_account_network.js` - deployment script
- `project/test/test.js` - Truffle test suite
- `project/scripts/simulate.js` - simulation runner
- `report.md` - assignment report

## Prerequisites

Install the required tools before running the project:

- Node.js and npm
- Truffle
- Ganache

If Truffle is not installed globally:

```bash
npm install -g truffle
```

## Start Ganache

Run Ganache locally on port `8545` before compiling, testing, or migrating:

```bash
ganache --server.port 8545
```

## Compile the Contract

From the `project` directory:

```bash
truffle compile
```

## Deploy the Contract

Deploy the contract to the local Ganache network:

```bash
truffle migrate
```

If you want to redeploy from scratch:

```bash
truffle migrate --reset
```

## Run Tests

Execute the Truffle test suite:

```bash
truffle test
```

## Run the Simulation

Execute the simulation script from inside the `project` directory:

```bash
truffle exec scripts/simulate.js
```

The simulation:

- registers 100 users
- creates a connected power-law style graph of joint accounts
- assigns initial balances
- executes 1000 random transfers
- prints a summary report with transaction and graph statistics

## Typical Command Order

```bash
cd project
ganache --server.port 8545
truffle compile
truffle migrate
truffle test
truffle exec scripts/simulate.js
```

## Notes

- The Truffle configuration expects the local blockchain at `127.0.0.1:8545`.
- Run all Truffle commands from the `project` directory.
