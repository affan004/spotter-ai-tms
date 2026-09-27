"""
Integration tests for HOS REST API endpoints.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class HosApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_sample_trips_endpoint(self):
        response = self.client.get('/api/hos/sample-trips/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("sample_trips", data)
        self.assertTrue(len(data["sample_trips"]) >= 3)

    def test_calculate_trip_endpoint(self):
        payload = {
            "current_location": "Indianapolis, IN",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Dallas, TX",
            "current_cycle_used": 14.5,
            "avg_speed": 55.0,
            "custom_distance_miles": 1025.0
        }
        response = self.client.post('/api/hos/calculate-trip/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Validate summary structure
        self.assertIn("summary", data)
        self.assertEqual(data["summary"]["total_distance_miles"], 1025.0)
        self.assertTrue(data["summary"]["total_days"] >= 2)

        # Validate route coordinates & waypoints
        self.assertIn("route", data)
        self.assertTrue(len(data["route"]["coordinates"]) > 0)
        self.assertTrue(len(data["route"]["waypoints"]) > 0)

        # Validate daily compliance logs
        self.assertIn("days", data)
        for day in data["days"]:
            self.assertEqual(day["totals"]["total_accounted_hours"], 24.0)
            self.assertTrue(len(day["segments"]) > 0)

        # Validate route instructions output
        self.assertIn("route_instructions", data["route"])
        self.assertTrue(len(data["route"]["route_instructions"]) > 0)

    def test_deadhead_and_route_instructions(self):
        """
        Test with current location distinct from pickup location.
        """
        payload = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Dallas, TX",
            "current_cycle_used": 0.0,
            "avg_speed": 55.0
        }
        response = self.client.post('/api/hos/calculate-trip/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreater(data["summary"]["deadhead_distance_miles"], 0)
        self.assertTrue(len(data["route"]["route_instructions"]) > 0)
        self.assertTrue(any(wp["type"] == "current" for wp in data["route"]["waypoints"]))
