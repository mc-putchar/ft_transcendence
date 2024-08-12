from solcx import compile_standard, install_solc, get_solc_version, set_solc_version
from solcx.exceptions import SolcNotInstalled
import json
from pathlib import Path

BUILD_PATH = "blockchain/static/blockchain/build/"
CONTRACT_PATH = "blockchain/static/blockchain/contracts/"

def installCompiler(version='0.8.26'):
	# Install solc version 0.8.26
	print("Installing solc version", version)
	install_solc(version)
	set_solc_version(version)
	# Get the currently active solc version
	active_version = get_solc_version()
	print("Active solc version:", active_version)

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
	}, solc_version=get_solc_version())
	with open(BUILD_PATH + compiled_name, "w") as file:
		json.dump(compiled_sol, file)
	print("Contract compiled successfully to " + BUILD_PATH + compiled_name)
	return Path(BUILD_PATH + compiled_name)