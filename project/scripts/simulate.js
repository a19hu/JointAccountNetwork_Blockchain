const JointAccountNetwork = artifacts.require("JointAccountNetwork");

const NUM_USERS = 1;
const TRANSACTION_COUNT = 1000;
const MEAN_BALANCE = 10;
const ATTACHMENT_EDGES = 2;
const REGISTER_GAS_LIMIT = 200000;
const CREATE_ACCOUNT_GAS_LIMIT = 300000;
const SEND_AMOUNT_GAS_LIMIT = 3000000;
const PROGRESS_INTERVAL = 100;

function randomInt(minInclusive, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function exponentialSample(mean) {
  const u = Math.random();
  return -mean * Math.log(1 - u);
}

function pickPreferential(maxNode, degrees) {
  let total = 0;
  for (let i = 1; i <= maxNode; i++) {
    total += degrees[i];
  }

  if (total === 0) {
    return randomInt(1, maxNode);
  }

  const r = Math.random() * total;
  let acc = 0;
  for (let i = 1; i <= maxNode; i++) {
    acc += degrees[i];
    if (acc >= r) {
      return i;
    }
  }

  return maxNode;
}

function generateConnectedPowerLawEdges(nodeCount, m) {
  const degrees = Array(nodeCount + 1).fill(0);
  const edgeSet = new Set();
  const edges = [];

  const addEdge = (u, v) => {
    if (u === v) {
      return false;
    }
    const key = edgeKey(u, v);
    if (edgeSet.has(key)) {
      return false;
    }

    edgeSet.add(key);
    edges.push([u, v]);
    degrees[u] += 1;
    degrees[v] += 1;
    return true;
  };

  addEdge(1, 2);

  for (let newNode = 3; newNode <= nodeCount; newNode++) {
    const targetCount = Math.min(m, newNode - 1);
    const targets = new Set();

    while (targets.size < targetCount) {
      targets.add(pickPreferential(newNode - 1, degrees));
    }

    for (const target of targets) {
      addEdge(newNode, target);
    }
  }

  return { edges, degrees };
}

function degreeHistogram(degrees) {
  const hist = new Map();
  for (let i = 1; i < degrees.length; i++) {
    const d = degrees[i];
    hist.set(d, (hist.get(d) || 0) + 1);
  }
  return [...hist.entries()].sort((a, b) => a[0] - b[0]);
}

function approximatePowerLawGamma(hist) {
  const points = hist.filter(([k, cnt]) => k > 0 && cnt > 0);
  if (points.length < 2) {
    return null;
  }

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  for (const [k, cnt] of points) {
    const x = Math.log(k);
    const y = Math.log(cnt);
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }

  const n = points.length;
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return null;
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  return -slope;
}

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];

    const network = await JointAccountNetwork.new({ from: deployer });

    for (let i = 1; i <= NUM_USERS; i++) {
      await network.registerUser(i, `User-${i}`, {
        from: deployer,
        gas: REGISTER_GAS_LIMIT,
      });
    }

    const { edges, degrees } = generateConnectedPowerLawEdges(NUM_USERS, ATTACHMENT_EDGES);

    let totalCombinedBalance = 0;
    for (const [u, v] of edges) {
      let combined = Math.round(exponentialSample(MEAN_BALANCE));
      if (combined < 2) {
        combined = 2;
      }
      if (combined % 2 !== 0) {
        combined += 1;
      }

      const share = combined / 2;
      totalCombinedBalance += combined;

      await network.createAcc(u, v, share, share, {
        from: deployer,
        gas: CREATE_ACCOUNT_GAS_LIMIT,
      });
    }

    let successCount = 0;
    let failedCount = 0;
    let failedInsufficient = 0;
    let failedNoPath = 0;
    let totalGasUsed = 0;

    for (let i = 0; i < TRANSACTION_COUNT; i++) {
      const from = randomInt(1, NUM_USERS);
      let to = randomInt(1, NUM_USERS);
      while (to === from) {
        to = randomInt(1, NUM_USERS);
      }

      try {
        const receipt = await network.sendAmount(from, to, 1, {
          from: deployer,
          gas: SEND_AMOUNT_GAS_LIMIT,
        });
        successCount += 1;
        totalGasUsed += Number(receipt.receipt.gasUsed);
      } catch (err) {
        failedCount += 1;
        const msg = String(err.message || "");
        if (msg.includes("Insufficient balance on path")) {
          failedInsufficient += 1;
        } else if (msg.includes("No path found")) {
          failedNoPath += 1;
        }
      }

      if ((i + 1) % PROGRESS_INTERVAL === 0) {
        console.log(
          `Processed ${i + 1}/${TRANSACTION_COUNT} transfers ` +
            `(success=${successCount}, failed=${failedCount})`
        );
      }
    }

    const hist = degreeHistogram(degrees);
    const gamma = approximatePowerLawGamma(hist);

    const report = {
      usersRegistered: NUM_USERS,
      jointAccountsCreated: edges.length,
      averageDegree: (2 * edges.length) / NUM_USERS,
      degreeHistogram: hist.map(([degree, count]) => ({ degree, count })),
      approximatePowerLawGamma: gamma,
      averageCombinedBalancePerEdge: totalCombinedBalance / edges.length,
      transactionsRequested: TRANSACTION_COUNT,
      transactionsSucceeded: successCount,
      transactionsFailed: failedCount,
      failuresByReason: {
        insufficientBalanceOnPath: failedInsufficient,
        noPathFound: failedNoPath,
        other: failedCount - failedInsufficient - failedNoPath,
      },
      averageGasPerSuccessfulTx: successCount > 0 ? totalGasUsed / successCount : 0,
    };

    console.log("\\n=== Simulation Report ===");
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    console.error(err);
  }

  callback();
};
