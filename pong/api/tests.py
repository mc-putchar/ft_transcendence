from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Profile, Friend, Blocked

class UserTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(username='testuser', password='testpassword')
        self.client = APIClient()

    def authenticate(self):
        """Authenticate the user and set the JWT token."""
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_user_registration(self):
        url = reverse('register')
        data = {
            'username': 'newuser',
            'password': 'newpassword',
            'email': 'newuser@example.com',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_user_login(self):
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'testpassword',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_user_logout(self):
        self.authenticate()
        url = reverse('logout')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_change_password(self):
        self.authenticate()
        url = reverse('change-password')
        data = {
            'old_password': 'testpassword',
            'new_password': 'newtestpassword',
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test that old password is no longer valid
        self.client.logout()
        login_data = {
            'username': 'testuser',
            'password': 'testpassword',
        }
        response = self.client.post(reverse('token_obtain_pair'), login_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test that new password is valid
        login_data['password'] = 'newtestpassword'
        response = self.client.post(reverse('token_obtain_pair'), login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_view_profile(self):
        self.authenticate()
        url = reverse('profile-detail')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'testuser')

    def test_edit_profile(self):
        self.authenticate()
        url = reverse('profile-detail')
        data = {
            'alias': 'NewAlias',
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile = Profile.objects.get(user=self.user)
        self.assertEqual(profile.alias, 'NewAlias')

    def test_add_remove_friend(self):
        self.authenticate()
        other_user = User.objects.create_user(username='otheruser', password='otherpassword')
        url = reverse('friend-add', args=[other_user.id])

        # Add friend
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Friend.is_friend(self.user, other_user))

        # Remove friend
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Friend.is_friend(self.user, other_user))

    def test_block_unblock_user(self):
        self.authenticate()
        other_user = User.objects.create_user(username='blockuser', password='blockpassword')
        url = reverse('block-user', args=[other_user.id])

        # Block user
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Blocked.is_blocked(self.user, other_user))

        # Unblock user
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Blocked.is_blocked(self.user, other_user))

    def test_list_active_users(self):
        self.authenticate()
        url = reverse('active-users')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_list_online_users(self):
        self.authenticate()
        Profile.objects.filter(user=self.user).update(isOnline=True)
        url = reverse('online-users')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

