const JointAccountNetwork = artifacts.require("JointAccountNetwork");

contract("JointAccountNetwork", function () {
  let network;

  beforeEach(async function () {
    // Deploy a fresh instance so each test runs with isolated state.
    network = await JointAccountNetwork.new();
  });

  it("registers users and creates joint accounts", async function () {
    await network.registerUser(1, "A");
    await network.registerUser(2, "B");

    await network.createAcc(1, 2, 20, 10);

    const aContribution = await network.getContribution(1, 2, 1);
    const bContribution = await network.getContribution(1, 2, 2);

    assert.equal(aContribution.toString(), "20");
    assert.equal(bContribution.toString(), "10");
  });

  it("routes on shortest path and updates every hop", async function () {
    await network.registerUser(1, "A");
    await network.registerUser(2, "B");
    await network.registerUser(3, "C");
    await network.registerUser(4, "D");

    // Build graph: 1-2-4 and 1-3-4. BFS tie-break picks first discovered path.
    await network.createAcc(1, 2, 10, 1);
    await network.createAcc(2, 4, 8, 2);
    await network.createAcc(1, 3, 10, 1);
    await network.createAcc(3, 4, 8, 2);

    const path = await network.getShortestPath(1, 4);
    assert.deepEqual(path.map((x) => x.toString()), ["1", "2", "4"]);

    await network.sendAmount(1, 4, 5);

    assert.equal((await network.getContribution(1, 2, 1)).toString(), "5");
    assert.equal((await network.getContribution(1, 2, 2)).toString(), "6");

    assert.equal((await network.getContribution(2, 4, 2)).toString(), "3");
    assert.equal((await network.getContribution(2, 4, 4)).toString(), "7");

    // Unused path remains unchanged.
    assert.equal((await network.getContribution(1, 3, 1)).toString(), "10");
    assert.equal((await network.getContribution(3, 4, 3)).toString(), "8");
  });

  it("fails when any hop has insufficient contribution", async function () {
    await network.registerUser(1, "A");
    await network.registerUser(2, "B");
    await network.registerUser(3, "C");

    await network.createAcc(1, 2, 6, 17);
    await network.createAcc(2, 3, 10, 13);

    try {
      await network.sendAmount(1, 3, 11);
      assert.fail("Expected sendAmount to revert");
    } catch (err) {
      // Truffle surfaces Solidity reverts as JavaScript errors containing the reason string.
      assert.include(err.message, "Insufficient balance on path");
    }

    // Balances unchanged on revert.
    assert.equal((await network.getContribution(1, 2, 1)).toString(), "6");
    assert.equal((await network.getContribution(2, 3, 2)).toString(), "10");
  });

  it("removes connectivity after closeAccount", async function () {
    await network.registerUser(1, "A");
    await network.registerUser(2, "B");
    await network.registerUser(3, "C");

    await network.createAcc(1, 2, 5, 5);
    await network.createAcc(2, 3, 5, 5);

    await network.closeAccount(2, 3);

    // After closing one edge, node 3 is disconnected from node 1.
    const path = await network.getShortestPath(1, 3);
    assert.equal(path.length, 0);

    try {
      await network.sendAmount(1, 3, 1);
      assert.fail("Expected sendAmount to revert");
    } catch (err) {
      assert.include(err.message, "No path found");
    }
  });
});
