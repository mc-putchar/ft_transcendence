import { getCookie } from './utils.js';

/**
 * Connects to the wallet
 * @returns {Promise<string>} - The account address
 */
async function get_account() {
    const accounts = await window.ethereum
    .request({ method: "eth_requestAccounts" })
    if (!accounts) return null;
    else {
        const account = accounts[0];
        return account
    }
}

async function get_chainId() {
    return await window.ethereum.request({ method: 'eth_chainId' });
}

async function connect_wallet() { 
    // console.log("Taking a nap...");
    // await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate 5s sleep
    // console.log("Waking up...");
    const accessToken = sessionStorage.getItem('access_token') || '';
    try {
        const account = await get_account();
        if (account === null) return null;
        const chainId = await get_chainId();
        fetch('/web3/connect_wallet/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ account, chainId }),
        });
        return account;
    } catch (error) {
        console.error("Failed to connect wallet", error);
        return null;
    }
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
  // console.log("Wallet connected: ", await wallet_is_connected()); // TODO remove
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
      if (permission.length) return true;
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
        const account = await connect_wallet();
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

export { handle_wallet_button, disconnect_wallet }