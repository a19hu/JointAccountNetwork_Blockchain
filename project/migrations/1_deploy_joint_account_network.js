const JointAccountNetwork = artifacts.require("JointAccountNetwork");

module.exports = function (deployer) {
  deployer.deploy(JointAccountNetwork);
};
