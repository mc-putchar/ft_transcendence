// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

contract PongTournament {
    address public owner;

    constructor () {
        owner = msg.sender;
    }

    modifier onlyOwner () {
        require (msg.sender == owner, "Caller is not the owner");
        _;
    }

	modifier ownerOrSelf (uint256 _hash) {
		require (msg.sender == owner || msg.sender == players[_hash].addr, "Caller is not the owner");
		_;
	}

    struct Player {
        uint256 hash;
        uint32 totalScore;
        uint32 matchWon;
        uint32 tournamentWon;
        string aliasName;
        address addr;
    }

    struct Match {
        uint256 tournamentId;
        uint256[] players;
        uint8[] scores;
        uint256 winnerID;
    }

    struct Tournament {
        mapping(uint256 => Match) matches;
        uint256 winnerID;
    }

    mapping(uint256 => Player) public players;
    mapping(uint256 => bool) private playerExists;
    mapping(uint256 => Match) public matches;
    mapping(uint256 => bool) private matchExists;
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => bool) public tournamentExists;
    event tournamentCreated(uint256 hash, uint256 winner, uint256 timestamp);
    event matchCreated(uint256 hash, uint256 timestamp);
    event playerCreated(uint256 hash, uint256 timestamp);

    function getCurrentTimestamp() private view returns(uint256) {
        return block.timestamp;
    }

    function updateTotalScore(uint256 playerHash, uint8 score) public onlyOwner {
        Player storage player = players[playerHash];
        player.totalScore += score;
    }

    function createTournament(uint256 _tournamentId, uint256 _winner) public onlyOwner {
        require(playerExists[_winner], "The player does not exist");
        Tournament storage tournament = tournaments[_tournamentId];
        tournamentExists[_tournamentId] = true;
        tournament.winnerID = _winner;
        players[_winner].tournamentWon++;
        emit tournamentCreated(_tournamentId, _winner, getCurrentTimestamp());
    }
    
    function checkWinner(Match memory m) private pure returns (bool) {
        uint maxScoreIdx = 0;
        for (uint i = 0; i < m.scores.length; ++i) {
            if (m.scores[i] > m.scores[maxScoreIdx]) {
                maxScoreIdx = i;
            }
        }
        return m.winnerID == m.players[maxScoreIdx];
    }

    function max(uint32 a, uint32 b) private pure returns (uint32) {
        return a >=b ? a: b;
    }

    function updateTotalScore(uint256[] calldata _hash, uint8[] calldata _scores) private {
        for (uint256 i = 0; i < 2; i++) {
            players[_hash[i]].totalScore += _scores[i];
        }
    }

    function addMatch(uint256 _matchId, uint256 _tournamentId, uint256[] calldata _playersHash, uint8[] calldata _scores, uint256 _winner) public onlyOwner {
        require(playerExists[_playersHash[0]] && playerExists[_playersHash[1]], "Unknown player");
        require(!matchExists[_matchId], "Match already exists");
        require (_playersHash.length == 2, "Registering only 1v1 games"); // accepting matches 1v1
        require (_scores.length == 2, "Registering only 1v1 games");
        require(_scores[0] != _scores[1], "Draw games not supported"); // not accepting draw games
        Match storage newMatch = matches[_matchId];
        matchExists[_matchId] = true;
        newMatch.tournamentId = _tournamentId;
        newMatch.players = _playersHash;
        newMatch.scores = _scores;
        newMatch.winnerID = _winner;
        require(checkWinner(newMatch), "Winner is not correct");
        updateTotalScore(_playersHash, _scores);
        players[_winner].matchWon++;
        emit matchCreated(_matchId, getCurrentTimestamp());
    }

    function addPlayer(uint256 _hash, string calldata _alias) public {
        require(!playerExists[_hash], "Player already exists");
        Player storage player = players[_hash];
        playerExists[_hash] = true;
        player.totalScore = 0;
        player.matchWon = 0;
        player.tournamentWon = 0;
        player.aliasName = _alias;
    }

    function addPlayer(uint256 _hash, string calldata _alias, address _address) public {
        require(!playerExists[_hash], "Player already exists");
        Player storage player = players[_hash];
        playerExists[_hash] = true;
        player.totalScore = 0;
        player.matchWon = 0;
        player.tournamentWon = 0;
        player.aliasName = _alias;
        player.addr = _address;
    }

	function updatePlayerAddress(uint256 _hash, address _addr) public ownerOrSelf(_hash) {
		players[_hash].addr = _addr;
	}

    function getMatchWinner(uint256 _matchId) public view returns(Player memory) {
        return players[matches[_matchId].winnerID];
    }

    function getPlayerName(uint256 _hash) public view returns(string memory) {
        return players[_hash].aliasName;
    }

    function getPlayerScore(uint256 _hash) public view returns(uint32) {
        return players[_hash].totalScore;
    }

    function getMatchScore(uint256 _id) public view returns(uint8[] memory) {
        return matches[_id].scores;
    }

    function getMatchWinnerName(uint256 _id) public view returns(string memory) {
        uint256 winner = matches[_id].winnerID;
        return players[winner].aliasName; 
    }

	function getMatchPlayers(uint256 _id) public view returns(uint256[] memory) {
		return matches[_id].players;
	}

    function getTournamentWinnerName(uint256 _id) public view returns(string memory) {
        uint256 winner = tournaments[_id].winnerID;
        return players[winner].aliasName;
    }
}
