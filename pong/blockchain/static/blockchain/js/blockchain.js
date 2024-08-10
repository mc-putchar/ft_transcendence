window.addEventListener('load', async () => {
   // Check if Web3 has been injected by the browser (Mist/MetaMask)
   if (typeof window.ethereum !== 'undefined') {
	// Use MetaMask's provider
	var web3 = new Web3(window.ethereum);
	try {
		// Request account access if needed
		window.ethereum.enable().then(function(accounts) {
			// Accounts now exposed
			console.log('Connected accounts:', accounts);
			// Now you can start your Dapp logic
		});
	} catch (e) {
		// User denied account access
		console.error('User denied account access', e);
	}
} else {
	// Fallback to localhost if no web3 injection.
	var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
	console.log('No web3 instance injected, using Local web3.');
}
});