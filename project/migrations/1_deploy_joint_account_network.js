const JointAccountNetwork = artifacts.require("JointAccountNetwork");

module.exports = function (deployer) {
  // Provide an explicit gas ceiling so deployment is stable on local Ganache networks.
  deployer.deploy(JointAccountNetwork, {
    gas: 6500000,
  });
};
