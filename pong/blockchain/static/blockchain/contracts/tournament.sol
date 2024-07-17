// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

contract PongTournament {

    struct Player {
        string name;
        uint32 totalScore;
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
    mapping(uint256 => Match) public matches;
    mapping(uint256 => Tournament) public tournaments;
    event tournamentCreated(uint256 id, uint256 winner, uint256 timestamp);
    event matchCreated(uint256 id, uint256 timestamp);
    event playerCreated(uint256 id, uint256 timestamp);

    function getCurrentTimestamp() public view returns(uint256) {
        return block.timestamp;
    }

    function createTournament(uint256 _tournamentId, uint256 _winner) public {
        Tournament storage tournament = tournaments[_tournamentId];
        tournament.winnerID = _winner;
        players[_winner].totalScore++;
        emit tournamentCreated(_tournamentId, _winner, getCurrentTimestamp());
    }

    function checkWinner(Match memory m) public pure returns (bool) {
        uint maxScoreIdx = 0;
        for (uint i = 0; i < m.scores.length; ++i) {
            if (m.scores[i] > m.scores[maxScoreIdx]) {
                maxScoreIdx = i;
            }
        }
        return m.winnerID == m.players[maxScoreIdx];
    }

    function addMatch(uint256 _matchId, uint256 _tournamentId, uint256[] calldata _players, uint8[] calldata _scores, uint256 _winner) public {
        Match storage newMatch = matches[_matchId];
        newMatch.tournamentId = _tournamentId;
        newMatch.players = _players;
        newMatch.scores = _scores;
        newMatch.winnerID = _winner;
        require(checkWinner(newMatch), "Winner is not correct");
        emit matchCreated(_matchId, getCurrentTimestamp());
    }

    function addPlayer(uint256 _id, string calldata _name) public {
        Player storage player = players[_id];
        player.name = _name;
    }

    function getMatchWinner(uint256 _matchId) public view returns(string memory) {
        return players[matches[_matchId].winnerID].name;
    }
}

/*
Tournament:
    id
    players[] map
    matches[] map
    winner
    All recorded by the ID of the offchain database
Match
    id
    players[] list
    score[] list
    winner
Player
    id
    name

*/