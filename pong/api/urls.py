from django.urls import path, include

from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .views import (
    RegisterView, logout, change_password, DeleteAccountView, anonymize_user,
    ProfileViewSet, OnlineUsersView
)

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('logout/', logout, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('blockchain/', include('blockchain.urls')),
    path('change-password/', change_password, name='change_password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete_account'),
    path('anonymize/', anonymize_user, name='anonymize_user'),
    path('online-users/', OnlineUsersView.as_view(), name='online_users'),
    # Spectacular schema
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('', include(router.urls)),
]
