from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .views import (
    RegisterView, LogoutView, ChangePasswordView, DeleteAccountView, AnonymizeUserView,
    FriendViewSet, BlockedViewSet, ProfileViewSet, ActiveUsersView, OnlineUsersView
)

router = DefaultRouter()
router.register(r'friends', FriendViewSet, basename='friend')
router.register(r'blocked', BlockedViewSet, basename='blocked')
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete_account'),
    path('anonymize/', AnonymizeUserView.as_view(), name='anonymize_user'),
    path('active-users/', ActiveUsersView.as_view(), name='active_users'),
    path('online-users/', OnlineUsersView.as_view(), name='online_users'),
    # Spectacular schema
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('', include(router.urls)),
]
