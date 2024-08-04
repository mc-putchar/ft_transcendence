from solcx import compile_standard, install_solc, get_installed_solc_versions, get_solc_version, set_solc_version
from solcx.exceptions import SolcNotInstalled
import json
from pathlib import Path

BUILD_PATH = "static/blockchain/build/"
CONTRACT_PATH = "blockchain/hardhat/contracts/"
# BUILD_PATH = "static/blockchain/build/"

def installCompiler(version='0.8.26'):
	# Install solc version 0.8.26
	print("Installing solc version", version)
	install_solc(version)
	set_solc_version(version)
	# Get the currently active solc version
	active_version = get_solc_version()
	print("Active solc version:", active_version)

# @param filename: string
# @param contractName: string
# @return tuple: (abi, bytecode)
def compileSmartContract(filename, compiled_name):
	try:
		solc_version = get_solc_version()
	except SolcNotInstalled:
		print("solc not installed")
		installCompiler()
		solc_version = get_solc_version()
	print("Compiling contract " + filename)
	with open(CONTRACT_PATH + filename , "r") as file:
		tournament_code = file.read()
	compiled_sol = compile_standard({
		"language": "Solidity", # needs capital letter, fails with "solidity"
		"sources": {filename: {"content": tournament_code}},
		"settings": {
			"outputSelection": {
				"*": {
					"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
				}
			}
		}
	}, solc_version=solc_version)
	with open("static/blockchain/build/" + compiled_name, "w") as file:
		json.dump(compiled_sol, file)
	print("Contract compiled successfully to " + BUILD_PATH + compiled_name)
	return Path(BUILD_PATH + compiled_name)

def get_contract_metadata(filename="tournament.sol", contractName="PongTournament"):
	compiled_name = filename.split(".")[0] + ".json"
	compiled_path = Path(BUILD_PATH + compiled_name)
	if not compiled_path.exists():
		compiled_path = compileSmartContract(filename, compiled_name)
	with open(compiled_path, "r") as file:
		compiled_sol = json.load(file)
	abi = compiled_sol["contracts"][filename][contractName]["abi"]
	bytecode = compiled_sol["contracts"][filename][contractName]["evm"]["bytecode"]["object"]
	return (abi, bytecode)