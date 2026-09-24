"""
Unit tests for FMCSA HOS Engine simulation rules.
"""

from datetime import datetime
from django.test import TestCase
from hos_engine.services.hos_simulator import HosSimulator, DutyStatus


class HosSimulatorTestCase(TestCase):
    def test_short_trip_under_limits(self):
        """
        Trip of 110 miles at 55 mph = 2.0 hours driving.
        1.0 hr loading (Line 4) + 2.0 hr driving (Line 3) + 1.0 hr unloading (Line 4).
        Total driving: 2.0h, Total on duty: 4.0h.
        """
        sim = HosSimulator(
            total_trip_distance=110.0,
            current_cycle_used=10.0,
            average_truck_speed=55.0,
            start_time=datetime(2026, 9, 25, 6, 0, 0)
        )
        res = sim.run_simulation()
        self.assertEqual(res["total_distance_miles"], 110.0)
        self.assertEqual(res["total_driving_hours"], 2.0)
        self.assertEqual(res["total_on_duty_hours"], 4.0)
        self.assertEqual(res["new_cycle_total"], 14.0)
        self.assertFalse(res["cycle_limit_exceeded"])

    def test_30_minute_break_after_8_hours(self):
        """
        Trip of 495 miles at 55 mph = 9.0 hours driving.
        Must insert a 30-minute break after 8.0 hours of driving.
        """
        sim = HosSimulator(
            total_trip_distance=495.0,
            current_cycle_used=0.0,
            average_truck_speed=55.0,
            start_time=datetime(2026, 9, 25, 6, 0, 0)
        )
        res = sim.run_simulation()
        self.assertEqual(res["total_driving_hours"], 9.0)
        # Check that a 30-min break waypoint and event exist
        break_waypoints = [wp for wp in res["waypoints"] if wp["type"] == "rest_break"]
        self.assertEqual(len(break_waypoints), 1)
        self.assertEqual(break_waypoints[0]["duration_hours"], 0.5)

    def test_11_hour_limit_triggers_10_hour_sleeper(self):
        """
        Trip of 660 miles at 55 mph = 12.0 hours driving.
        Driver drives 11.0 hours, then takes a 10.0-hour sleeper reset.
        """
        sim = HosSimulator(
            total_trip_distance=660.0,
            current_cycle_used=0.0,
            average_truck_speed=55.0,
            start_time=datetime(2026, 9, 25, 6, 0, 0)
        )
        res = sim.run_simulation()
        self.assertEqual(res["total_driving_hours"], 12.0)
        sleeper_waypoints = [wp for wp in res["waypoints"] if wp["type"] == "sleeper_reset"]
        self.assertTrue(len(sleeper_waypoints) >= 1)
        self.assertEqual(sleeper_waypoints[0]["duration_hours"], 10.0)

    def test_1000_mile_fueling_rule(self):
        """
        Trip of 1,025 miles.
        Must insert a 15-minute On-Duty ND fueling stop at mile 1,000.
        """
        sim = HosSimulator(
            total_trip_distance=1025.0,
            current_cycle_used=0.0,
            average_truck_speed=55.0,
            start_time=datetime(2026, 9, 25, 6, 0, 0)
        )
        res = sim.run_simulation()
        fuel_waypoints = [wp for wp in res["waypoints"] if wp["type"] == "fuel_stop"]
        self.assertEqual(len(fuel_waypoints), 1)
        self.assertEqual(fuel_waypoints[0]["mile_marker"], 1000.0)
        self.assertEqual(fuel_waypoints[0]["duration_hours"], 0.25)
