var Auction=artifacts.require("./Auction.sol")
module.exports = function(_deployer) {
  // Use deployer to state migration tasks.
  _deployer.deploy(Auction);
};
