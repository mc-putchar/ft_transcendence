from django.urls import path, include, re_path
from . import views
from django.contrib.auth import views as auth_views
from django.conf.urls.static import static

urlpatterns = [
    path('users/', views.ProfileListView.as_view(), name='user-list'),
    path('onlineusers/', views.OnlineListView.as_view(), name='online-user-list'),
    path('friends/', views.FriendListView.as_view(), name='friend-list'),
    path('friends/add/', views.AddFriendView.as_view(), name='add-friend'),
    path('friends/remove/', views.RemoveFriendView.as_view(), name='remove-friend'),
    path('profile/<str:user__username>/', views.ProfileDetailView.as_view(), name='profile-detail'),
]
