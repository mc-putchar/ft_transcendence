require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    networks: {
        hardhat: {
            accounts: {
				initialIndex: 0,
				path: "m/44'/60'/0'/0",
				mnemonic: "test test test test test test test test test test test junk",
                count: 33,
                accountsBalance: '10000000000000000000',
            }
        }
    }
};
