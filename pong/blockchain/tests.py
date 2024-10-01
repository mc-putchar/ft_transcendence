from django.test import TestCase, Client
from django.urls import reverse
from blockchain.blockchain_api import PongBlockchain, hash_player
import os

# Create your tests here.
class AddMatchViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse('addMatch')
        self.chain = PongBlockchain()
        self.player1 = {
            'name': 'foo',
            'email': 'foo@foo.com',
            'id': '1'
        }
        self.player2 = {
            'name': 'bar',
            'email': 'bar@bar.com',
            'id': '2'
        }
        self.data = {
            'player1': self.player1['name'],
            'player2': self.player2['name'],
            'player1_hash': hash_player([self.player1['email'], self.player1['id']]),
            'player2_hash': hash_player([self.player2['email'], self.player2['id']]),
            'score1': '10',
            'score2': '8',
            'winner_hash': hash_player(['foo@foo.com', '1']),
            'tournament_id': '1',
            'match_id': '1'
        }

    def test_get_player(self):
        player = self.chain.getPlayer(hash_player([self.player1['email'], self.player1['id']]))
        self.assertEqual(player[4], self.player1['name'])

    def test_add_match_success(self):
        sender = self.chain.accounts[0]
        if 'HARDHAT_PRIVATE_KEY' in os.environ:
            pk = os.getenv('HARDHAT_PRIVATE_KEY')
        self.chain.addPlayerFull(sender, pk, hash_player([self.player1['email'], self.player1['id']]), self.player1['name'], self.chain.accounts[1])
        self.chain.addPlayerFull(sender, pk, hash_player([self.player2['email'], self.player2['id']]), self.player2['name'], self.chain.accounts[2])
        response = self.client.post(self.url, self.data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Match added successfully', response.content.decode())
    
    def test_add_match_failure(self):
        self.data['score1'] = '11'
        response = self.client.post(self.url, self.data)
        self.assertEqual(response.status_code, 400)
    
class CommitTournamentViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse('commit')
        self.chain = PongBlockchain()
        self.winner = {
            'name': 'foo',
            'email': 'foo@foo.com',
            'id': '1'
        }
        self.data = {
            'winner': hash_player(['foo@foo.com', '1']),
            'tournament_id': '1',
            'match_id': '1'
        }
    
    def test_commit_tournament_success(self):
        sender = self.chain.accounts[0]
        if 'HARDHAT_PRIVATE_KEY' in os.environ:
            pk = os.getenv('HARDHAT_PRIVATE_KEY')
        self.chain.addPlayerFull(sender, pk, hash_player([self.winner['email'], self.winner['id']]), self.winner['name'], self.chain.accounts[1])
        response = self.client.post(self.url, self.data)
        self.assertEqual(response.status_code, 200)

    def test_commit_tournament_failure(self):
        self.data['winner'] = '42'
        response = self.client.post(self.url, self.data)
        self.assertEqual(response.status_code, 400)