"""
Unit tests for 24-hour midnight boundary partitioning and daily total invariants.
"""

from datetime import datetime
from django.test import TestCase
from hos_engine.services.hos_simulator import HosSimulator
from hos_engine.services.midnight_splitter import MidnightSplitter


class MidnightSplitterTestCase(TestCase):
    def test_24_hour_sum_invariant(self):
        """
        Verify that for every day generated, the sum of Line 1, 2, 3, 4
        strictly equals 24.0 hours.
        """
        distances = [50.0, 300.0, 605.0, 1025.0, 2500.0]
        for dist in distances:
            sim = HosSimulator(
                total_trip_distance=dist,
                current_cycle_used=15.0,
                average_truck_speed=55.0,
                start_time=datetime(2026, 9, 25, 6, 0, 0)
            )
            sim.run_simulation()
            days = MidnightSplitter.split_into_days(sim.events, initial_cycle_used=15.0)

            self.assertTrue(len(days) >= 1)
            for day in days:
                totals = day["totals"]
                calc_sum = round(
                    totals["off_duty_hours"]
                    + totals["sleeper_hours"]
                    + totals["driving_hours"]
                    + totals["on_duty_nd_hours"],
                    2
                )
                self.assertEqual(
                    calc_sum, 24.0,
                    f"Day {day['day_number']} totals do not sum to 24.0 hours! Got {calc_sum}"
                )
                self.assertTrue(totals["is_valid_24_hours"])

    def test_segment_continuity_within_day(self):
        """
        Verify that segments in a day start at 00:00 and end at 24:00 without gaps.
        """
        sim = HosSimulator(
            total_trip_distance=1025.0,
            current_cycle_used=5.0,
            average_truck_speed=55.0,
            start_time=datetime(2026, 9, 25, 6, 0, 0)
        )
        sim.run_simulation()
        days = MidnightSplitter.split_into_days(sim.events)

        for day in days:
            segs = day["segments"]
            self.assertTrue(len(segs) > 0)
            self.assertEqual(segs[0]["start_decimal"], 0.0)
            self.assertEqual(segs[-1]["end_decimal"], 24.0)

            # Check consecutive adjacency
            for i in range(len(segs) - 1):
                self.assertAlmostEqual(
                    segs[i]["end_decimal"], segs[i + 1]["start_decimal"],
                    places=2,
                    msg=f"Gap detected between segment {i} and {i+1} in day {day['day_number']}"
                )
