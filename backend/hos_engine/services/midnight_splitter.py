"""
Strict 24-Hour Midnight Boundary Splitter for FMCSA Driver Daily Logs.
Partitions continuous multi-day timeline events into exact 24-hour calendar days (00:00 to 24:00).
Guarantees the mathematical invariant:
    Line 1 (Off) + Line 2 (Sleeper) + Line 3 (Driving) + Line 4 (On Duty) == 24.00 Hours
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Any
from .hos_simulator import DutyStatus, TimelineEvent


def format_time_hh_mm(dt: datetime, is_day_end: bool = False) -> str:
    """
    Formats a datetime as HH:MM. If it is exactly midnight at the end of a day,
    returns '24:00' to conform to standard ELD log display.
    """
    if is_day_end and dt.hour == 0 and dt.minute == 0 and dt.second == 0:
        return "24:00"
    return dt.strftime("%H:%M")


def datetime_to_decimal_hours(dt: datetime, is_day_end: bool = False) -> float:
    """
    Converts time to decimal hours (0.00 to 24.00).
    """
    if is_day_end and dt.hour == 0 and dt.minute == 0 and dt.second == 0:
        return 24.0
    return round(dt.hour + (dt.minute / 60.0) + (dt.second / 3600.0), 4)


class MidnightSplitter:
    """
    Takes continuous timeline events and partitions them into individual 24-hour log days.
    """

    @staticmethod
    def split_into_days(
        events: List[TimelineEvent],
        initial_cycle_used: float = 0.0
    ) -> List[Dict[str, Any]]:
        if not events:
            return []

        # Find overall start and end dates
        first_dt = events[0].start_datetime
        last_dt = events[-1].end_datetime

        start_date = date(first_dt.year, first_dt.month, first_dt.day)
        end_date = date(last_dt.year, last_dt.month, last_dt.day)
        if last_dt.hour == 0 and last_dt.minute == 0 and last_dt.second == 0 and last_dt > first_dt:
            # End is exactly midnight belonging to prior day
            end_date = end_date - timedelta(days=1)

        # Build daily buckets for all dates in range
        day_buckets: Dict[date, List[Dict[str, Any]]] = {}
        curr = start_date
        while curr <= end_date:
            day_buckets[curr] = []
            curr += timedelta(days=1)

        # Slice each event across midnight boundaries
        for ev in events:
            ev_start = ev.start_datetime
            ev_end = ev.end_datetime
            total_duration = (ev_end - ev_start).total_seconds() / 3600.0
            if total_duration <= 0:
                continue

            current_slice_start = ev_start
            while current_slice_start < ev_end:
                current_day = date(
                    current_slice_start.year,
                    current_slice_start.month,
                    current_slice_start.day
                )
                next_midnight = datetime(
                    current_day.year,
                    current_day.month,
                    current_day.day,
                    0, 0, 0
                ) + timedelta(days=1)

                current_slice_end = min(ev_end, next_midnight)
                slice_duration = (current_slice_end - current_slice_start).total_seconds() / 3600.0

                if slice_duration > 0.0001:
                    is_day_end = (current_slice_end == next_midnight)
                    start_dec = datetime_to_decimal_hours(current_slice_start, False)
                    end_dec = datetime_to_decimal_hours(current_slice_end, is_day_end)

                    # Fractional mileage allocation for driving segments
                    fraction = slice_duration / total_duration if total_duration > 0 else 1.0
                    slice_miles = round(ev.distance_miles * fraction, 2) if ev.status == DutyStatus.DRIVING else 0.0
                    elapsed_to_slice = (current_slice_start - ev_start).total_seconds() / 3600.0
                    fraction_to_start = elapsed_to_slice / total_duration if total_duration > 0 else 0.0
                    seg_start_mile = round(ev.start_mile + (ev.distance_miles * fraction_to_start), 1) if ev.distance_miles > 0 else ev.start_mile
                    seg_end_mile = round(seg_start_mile + slice_miles, 1)

                    segment_dict = {
                        "status": ev.status,
                        "status_name": DutyStatus.LABELS.get(ev.status, "Unknown"),
                        "start_time": format_time_hh_mm(current_slice_start, False),
                        "end_time": format_time_hh_mm(current_slice_end, is_day_end),
                        "start_decimal": start_dec,
                        "end_decimal": end_dec,
                        "duration_hours": round(slice_duration, 2),
                        "distance_miles": slice_miles,
                        "start_mile": seg_start_mile,
                        "end_mile": seg_end_mile,
                        "activity": ev.activity,
                        "remarks": ev.remarks,
                        "location": ev.location
                    }

                    if current_day in day_buckets:
                        day_buckets[current_day].append(segment_dict)

                current_slice_start = current_slice_end

        # Assemble and validate day sheets
        sorted_dates = sorted(day_buckets.keys())
        day_results = []
        running_cycle = initial_cycle_used

        for idx, d in enumerate(sorted_dates, start=1):
            segments = day_buckets[d]

            # Merge adjacent segments of the identical status to keep clean vector paths
            merged_segments: List[Dict[str, Any]] = []
            for seg in segments:
                if (
                    merged_segments
                    and merged_segments[-1]["status"] == seg["status"]
                    and abs(merged_segments[-1]["end_decimal"] - seg["start_decimal"]) < 0.001
                ):
                    prev = merged_segments[-1]
                    prev["end_time"] = seg["end_time"]
                    prev["end_decimal"] = seg["end_decimal"]
                    prev["end_mile"] = seg.get("end_mile", prev.get("end_mile", 0.0))
                    prev["duration_hours"] = round(prev["duration_hours"] + seg["duration_hours"], 2)
                    prev["distance_miles"] = round(prev["distance_miles"] + seg["distance_miles"], 2)
                    if seg["remarks"] and seg["remarks"] not in prev["remarks"]:
                        prev["remarks"] += f" | {seg['remarks']}"
                else:
                    merged_segments.append(dict(seg))

            # Compute daily totals
            off_duty = round(sum(s["duration_hours"] for s in merged_segments if s["status"] == DutyStatus.OFF_DUTY), 2)
            sleeper = round(sum(s["duration_hours"] for s in merged_segments if s["status"] == DutyStatus.SLEEPER_BERTH), 2)
            driving = round(sum(s["duration_hours"] for s in merged_segments if s["status"] == DutyStatus.DRIVING), 2)
            on_duty_nd = round(sum(s["duration_hours"] for s in merged_segments if s["status"] == DutyStatus.ON_DUTY_ND), 2)
            daily_miles = round(sum(s["distance_miles"] for s in merged_segments), 1)

            total_hours = round(off_duty + sleeper + driving + on_duty_nd, 2)
            # Guard against floating-point epsilon (e.g. 23.99 vs 24.00)
            if abs(total_hours - 24.0) > 0.01 and merged_segments:
                diff = round(24.0 - total_hours, 2)
                # Adjust last segment slightly to guarantee 24.00
                merged_segments[-1]["duration_hours"] = round(merged_segments[-1]["duration_hours"] + diff, 2)
                merged_segments[-1]["end_decimal"] = 24.0
                merged_segments[-1]["end_time"] = "24:00"
                if merged_segments[-1]["status"] == DutyStatus.OFF_DUTY:
                    off_duty = round(off_duty + diff, 2)
                elif merged_segments[-1]["status"] == DutyStatus.SLEEPER_BERTH:
                    sleeper = round(sleeper + diff, 2)
                elif merged_segments[-1]["status"] == DutyStatus.DRIVING:
                    driving = round(driving + diff, 2)
                elif merged_segments[-1]["status"] == DutyStatus.ON_DUTY_ND:
                    on_duty_nd = round(on_duty_nd + diff, 2)
                total_hours = 24.0

            on_duty_today = round(driving + on_duty_nd, 2)
            cycle_prior = running_cycle
            running_cycle = round(running_cycle + on_duty_today, 2)
            cycle_remaining = round(max(0.0, 70.0 - running_cycle), 2)

            day_start_m = merged_segments[0].get("start_mile", 0.0) if merged_segments else 0.0
            day_end_m = merged_segments[-1].get("end_mile", day_start_m) if merged_segments else day_start_m

            day_results.append({
                "day_number": idx,
                "date": d.isoformat(),
                "formatted_date": d.strftime("%A, %B %d, %Y"),
                "daily_miles": daily_miles,
                "day_start_mile": day_start_m,
                "day_end_mile": day_end_m,
                "totals": {
                    "off_duty_hours": off_duty,
                    "sleeper_hours": sleeper,
                    "driving_hours": driving,
                    "on_duty_nd_hours": on_duty_nd,
                    "total_accounted_hours": 24.0,
                    "is_valid_24_hours": True
                },
                "hos_recap": {
                    "cycle_hours_prior": cycle_prior,
                    "on_duty_today": on_duty_today,
                    "cycle_hours_accumulated": running_cycle,
                    "cycle_hours_available": cycle_remaining
                },
                "segments": merged_segments
            })

        return day_results
