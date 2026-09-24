"""
URL patterns for hos_engine app.
"""

from django.urls import path
from .views import CalculateTripView, SampleTripsView

urlpatterns = [
    path('calculate-trip/', CalculateTripView.as_view(), name='calculate-trip'),
    path('sample-trips/', SampleTripsView.as_view(), name='sample-trips'),
]
