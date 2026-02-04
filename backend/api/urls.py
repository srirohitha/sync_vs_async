from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health_view),
    path("sync", views.sync_view),
    path("async", views.async_view),
    path("async/status", views.async_status_view),
]
