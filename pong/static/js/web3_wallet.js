/**
 * Connects to the wallet
 * @returns {Promise<string>} - The account address
 */
async function get_account() {
    const accounts = await window.ethereum
    .request({ method: "eth_requestAccounts" })
    .catch((err) => {
      if (err.code === 4001) {
        // EIP-1193 userRejectedRequest error.
        // If this happens, the user rejected the connection request.
        console.log("Please connect your wallet")
      } else {
        console.error(err)
    }
        return null
    })
    const account = accounts[0];
    return account
}

async function disconnect_wallet() {
    await window.ethereum
    .request({
        method: "wallet_revokePermissions",
        params: [
        {
            eth_accounts: {},
        },
    ],
  })
  console.log("Wallet status: ", wallet_is_connected()); // TODO remove
}

/**
 * Checks if the wallet is connected.
 * @returns {Promise<boolean>}
 */
async function wallet_is_connected() {
    const permission = await window.ethereum.request({
        "method": "wallet_getPermissions",
        "params": []
      });
      if (permission.length) {
          console.log("Wallet connected");
          return true;
      }
    console.log("Wallet disconnected");
    return false;
}

/**
 * Updates the button text and functionality to disconnect the wallet.
 * @note Using a clone to remove all previous eventListeners and update functionality
 * without reloading page
 * @param {HTMLElement} button - The button element to update.
 * @returns {void}
 */
function update_to_disconnect(button) {
    button.textContent = "Disconnect wallet";
    const connectWalletBtn = button.cloneNode(true);
    button.parentNode.replaceChild(connectWalletBtn, button);
    connectWalletBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await disconnect_wallet();
        update_to_connect(connectWalletBtn);
    });
}

/**
 * Updates the button text and functionality to connect the wallet.
 * @note Using a clone to remove all previous eventListeners and update functionality
 * without reloading page
 * @param {HTMLElement} button - The button element to update.
 * @returns {void}
 */
function update_to_connect(button) {
    
    button.textContent = "Connect Wallet";
    const connectWalletBtn = button.cloneNode(true);
    button.parentNode.replaceChild(connectWalletBtn, button);
    connectWalletBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        connectWalletBtn.disabled = true;
        const loadingWalletIndicator = document.getElementById('loading-wallet-indicator');
        if (loadingWalletIndicator) loadingWalletIndicator.style.display = 'inline';
        const account = await get_account();
        console.log("Connected to ", account);
        if (loadingWalletIndicator) loadingWalletIndicator.style.display = 'none';       
        connectWalletBtn.disabled = false;
        if (account !== null) {
            update_to_disconnect(connectWalletBtn);
        }
    });
}


async function handle_wallet_button(connectWalletBtn) {
    wallet_is_connected().then(isConnected => {
        if (isConnected) {
            update_to_disconnect(connectWalletBtn);
        } else {
            update_to_connect(connectWalletBtn);
        }
    });
}

export { handle_wallet_button }