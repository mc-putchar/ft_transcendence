from web3 import Web3

def healthcheck():
    web3 = Web3(Web3.HTTPProvider('http://blockchain:8545'))
    return web3.is_connected()

def main():
    print("Connecting to blockchain for healthcheck...")
    if healthcheck():
        print("Connected")
        return 0
    print("Connection failed")
    return 1

if __name__ == "__main__":
    main()
    
