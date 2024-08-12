require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    networks: {
        hardhat: {
            accounts: {
                count: 33,
                accountsBalance: '10000000000000000000',
            }
        }
    }
};
