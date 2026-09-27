"""
FMCSA Hours of Service (HOS) Simulation Engine
Implements 49 CFR Part 395 rules for Property-Carrying Commercial Drivers:
- 11-Hour Driving Limit
- 14-Hour Consecutive Duty Window Limit
- 30-Minute Rest Break after 8 Hours Continuous Driving
- 1,000-Mile Mandatory Fueling Stop (15 minutes On-Duty Not Driving)
- Pickup / Loading (1 hour On-Duty Not Driving)
- Drop-off / Unloading (1 hour On-Duty Not Driving)
- 10-Hour Consecutive Rest (Sleeper Berth)
- 70-Hour / 8-Day Rolling Duty Limit
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


class DutyStatus:
    OFF_DUTY = 1          # Line 1: Off Duty
    SLEEPER_BERTH = 2     # Line 2: Sleeper Berth
    DRIVING = 3           # Line 3: Driving
    ON_DUTY_ND = 4        # Line 4: On Duty (Not Driving)

    LABELS = {
        1: "Off Duty",
        2: "Sleeper Berth",
        3: "Driving",
        4: "On Duty (Not Driving)"
    }


class TimelineEvent:
    def __init__(
        self,
        status: int,
        start_datetime: datetime,
        end_datetime: datetime,
        start_mile: float = 0.0,
        end_mile: float = 0.0,
        activity: str = "",
        remarks: str = "",
        location: str = ""
    ):
        self.status = status
        self.start_datetime = start_datetime
        self.end_datetime = end_datetime
        self.duration_hours = round((end_datetime - start_datetime).total_seconds() / 3600.0, 4)
        self.start_mile = round(start_mile, 2)
        self.end_mile = round(end_mile, 2)
        self.distance_miles = round(max(0.0, end_mile - start_mile), 2)
        self.activity = activity
        self.remarks = remarks
        self.location = location

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "status_name": DutyStatus.LABELS.get(self.status, "Unknown"),
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "duration_hours": self.duration_hours,
            "start_mile": self.start_mile,
            "end_mile": self.end_mile,
            "distance_miles": self.distance_miles,
            "activity": self.activity,
            "remarks": self.remarks,
            "location": self.location
        }


class HosSimulator:
    """
    Simulates a commercial freight trip under strict FMCSA HOS regulations.
    """

    def __init__(
        self,
        total_trip_distance: float,
        current_cycle_used: float = 0.0,
        average_truck_speed: float = 55.0,
        start_time: Optional[datetime] = None,
        current_location: str = "Origin Terminal",
        pickup_location: str = "Shipper Terminal",
        dropoff_location: str = "Destination Terminal",
        deadhead_distance_miles: float = 0.0,
        fuel_interval_miles: float = 1000.0,
        truck_height_ft: float = 13.5,
        truck_weight_lbs: float = 80000.0
    ):
        self.total_trip_distance = float(max(1.0, total_trip_distance))
        self.current_cycle_used = float(max(0.0, current_cycle_used))
        self.average_truck_speed = float(max(20.0, average_truck_speed))
        self.deadhead_distance_miles = max(0.0, float(deadhead_distance_miles))
        self.current_location = current_location
        self.pickup_location = pickup_location
        self.dropoff_location = dropoff_location
        self.fuel_interval_miles = fuel_interval_miles
        self.truck_height_ft = truck_height_ft
        self.truck_weight_lbs = truck_weight_lbs

        # Start default at 08:00:00 on current date per FMCSA assessment instructions
        if start_time is None:
            now = datetime.now()
            self.start_time = datetime(now.year, now.month, now.day, 8, 0, 0)
        else:
            self.start_time = start_time

        # Generated raw timeline events before midnight partitioning
        self.events: List[TimelineEvent] = []
        self.waypoints: List[Dict[str, Any]] = []

    def run_simulation(self) -> Dict[str, Any]:
        """
        Executes the chronological simulation state machine.
        """
        self.events = []
        self.waypoints = []

        clock = self.start_time
        day_start = datetime(clock.year, clock.month, clock.day, 0, 0, 0)

        # 1. Prior to shift start on Day 1: Off Duty (Line 1) from 00:00 to shift start
        if clock > day_start:
            self.events.append(
                TimelineEvent(
                    status=DutyStatus.OFF_DUTY,
                    start_datetime=day_start,
                    end_datetime=clock,
                    start_mile=0.0,
                    end_mile=0.0,
                    activity="Pre-Shift Off Duty",
                    remarks="Off Duty Prior to Trip Shift",
                    location=self.current_location if self.deadhead_distance_miles > 0 else self.pickup_location
                )
            )

        miles_driven = 0.0
        miles_since_last_fuel = 0.0
        shift_driving_hours = 0.0
        shift_window_elapsed = 0.0
        continuous_driving_hours = 0.0
        running_cycle_hours = self.current_cycle_used

        # Handle Deadhead Repositioning Leg (if current != pickup)
        if self.deadhead_distance_miles > 0:
            # 2a. Pre-trip inspection at Current Location (15 mins Line 4)
            pretrip_dur = 0.25
            pretrip_end = clock + timedelta(hours=pretrip_dur)
            self.events.append(
                TimelineEvent(
                    status=DutyStatus.ON_DUTY_ND,
                    start_datetime=clock,
                    end_datetime=pretrip_end,
                    start_mile=0.0,
                    end_mile=0.0,
                    activity="Pre-Trip Inspection",
                    remarks="Pre-Trip DVIR at Origin Terminal",
                    location=self.current_location
                )
            )
            self.waypoints.append({
                "type": "current",
                "name": f"Origin Terminal - {self.current_location}",
                "mile_marker": 0.0,
                "timestamp": clock.isoformat(),
                "duration_hours": pretrip_dur,
                "action": "Pre-Trip Inspection & Dispatch (Line 4)"
            })
            clock = pretrip_end
            shift_window_elapsed += pretrip_dur
            running_cycle_hours += pretrip_dur

            # 2b. Deadhead driving to Pickup Location
            deadhead_drive_hours = self.deadhead_distance_miles / self.average_truck_speed
            drive_end = clock + timedelta(hours=deadhead_drive_hours)
            self.events.append(
                TimelineEvent(
                    status=DutyStatus.DRIVING,
                    start_datetime=clock,
                    end_datetime=drive_end,
                    start_mile=0.0,
                    end_mile=self.deadhead_distance_miles,
                    activity="Deadhead Repositioning",
                    remarks=f"Deadhead transit to shipper at {self.average_truck_speed:.0f} MPH",
                    location=f"In Transit to {self.pickup_location}"
                )
            )
            clock = drive_end
            miles_driven = self.deadhead_distance_miles
            miles_since_last_fuel = self.deadhead_distance_miles
            shift_driving_hours += deadhead_drive_hours
            shift_window_elapsed += deadhead_drive_hours
            continuous_driving_hours += deadhead_drive_hours
            running_cycle_hours += deadhead_drive_hours

            # 2c. Pickup Terminal: 1.0 hour On-Duty Not Driving (Line 4) for Loading Cargo
            pickup_duration = 1.0
            pickup_end = clock + timedelta(hours=pickup_duration)
            self.events.append(
                TimelineEvent(
                    status=DutyStatus.ON_DUTY_ND,
                    start_datetime=clock,
                    end_datetime=pickup_end,
                    start_mile=miles_driven,
                    end_mile=miles_driven,
                    activity="Pickup & Loading",
                    remarks="Cargo Loading & Securement",
                    location=self.pickup_location
                )
            )
            self.waypoints.append({
                "type": "pickup",
                "name": f"Pickup Terminal - {self.pickup_location}",
                "mile_marker": round(miles_driven, 1),
                "timestamp": clock.isoformat(),
                "duration_hours": pickup_duration,
                "action": "Cargo Loading (Line 4)"
            })
            clock = pickup_end
            shift_window_elapsed += pickup_duration
            running_cycle_hours += pickup_duration

        else:
            # Direct pickup at origin (no deadhead)
            pickup_duration = 1.0
            pickup_end = clock + timedelta(hours=pickup_duration)
            self.events.append(
                TimelineEvent(
                    status=DutyStatus.ON_DUTY_ND,
                    start_datetime=clock,
                    end_datetime=pickup_end,
                    start_mile=0.0,
                    end_mile=0.0,
                    activity="Pickup & Loading",
                    remarks="Pre-Trip Inspection & Freight Loading",
                    location=self.pickup_location
                )
            )
            self.waypoints.append({
                "type": "pickup",
                "name": f"Pickup Terminal - {self.pickup_location}",
                "mile_marker": 0.0,
                "timestamp": clock.isoformat(),
                "duration_hours": pickup_duration,
                "action": "Loading Cargo (Line 4)"
            })
            clock = pickup_end
            shift_window_elapsed = pickup_duration
            running_cycle_hours += pickup_duration

        loop_guard = 0
        max_iterations = 1000  # Avoid any infinite loop

        # 3. Driving Simulation Loop
        while miles_driven < self.total_trip_distance and loop_guard < max_iterations:
            loop_guard += 1

            # Available driving budget in current shift
            remaining_drive_limit = max(0.0, 11.0 - shift_driving_hours)
            remaining_window = max(0.0, 14.0 - shift_window_elapsed)
            available_shift_drive = min(remaining_drive_limit, remaining_window)

            # Check if driver has hit 11h driving or 14h window limit
            if available_shift_drive <= 0.001:
                # Insert 10-hour consecutive Sleeper Berth (Line 2) reset
                rest_duration = 10.0
                rest_end = clock + timedelta(hours=rest_duration)
                rest_location = f"Rest Area / Truck Stop (Mile {miles_driven:.1f})"

                self.events.append(
                    TimelineEvent(
                        status=DutyStatus.SLEEPER_BERTH,
                        start_datetime=clock,
                        end_datetime=rest_end,
                        start_mile=miles_driven,
                        end_mile=miles_driven,
                        activity="10-Hour Sleeper Berth",
                        remarks="10-Hour Mandatory HOS Rest Period",
                        location=rest_location
                    )
                )
                self.waypoints.append({
                    "type": "sleeper_reset",
                    "name": f"Mandatory HOS Sleeper Berth (Mile {miles_driven:.1f})",
                    "mile_marker": round(miles_driven, 1),
                    "timestamp": clock.isoformat(),
                    "duration_hours": rest_duration,
                    "action": "10-hr Rest Reset (Line 2)"
                })

                clock = rest_end
                # Reset shift clocks following qualifying 10-hour rest
                shift_driving_hours = 0.0
                shift_window_elapsed = 0.0
                continuous_driving_hours = 0.0
                continue

            # Check continuous driving limit (max 8 hours without 30-min break)
            drive_until_break = max(0.0, 8.0 - continuous_driving_hours)
            if drive_until_break <= 0.001:
                # Insert 30-minute Off Duty (Line 1) break
                break_duration = 0.5  # 30 minutes
                break_end = clock + timedelta(hours=break_duration)
                break_location = f"En Route Rest Facility (Mile {miles_driven:.1f})"

                self.events.append(
                    TimelineEvent(
                        status=DutyStatus.OFF_DUTY,
                        start_datetime=clock,
                        end_datetime=break_end,
                        start_mile=miles_driven,
                        end_mile=miles_driven,
                        activity="30-Minute Rest Break",
                        remarks="Mandatory 30-Minute FMCSA Rest Break",
                        location=break_location
                    )
                )
                self.waypoints.append({
                    "type": "rest_break",
                    "name": f"Mandatory HOS Rest Stop (Mile {miles_driven:.1f})",
                    "mile_marker": round(miles_driven, 1),
                    "timestamp": clock.isoformat(),
                    "duration_hours": break_duration,
                    "action": "30-min Off Duty (Line 1)"
                })

                clock = break_end
                # Reset continuous driving clock; 14h window CONTINUES running
                continuous_driving_hours = 0.0
                shift_window_elapsed += break_duration
                continue

            # Check fueling rule (every 1,000 miles)
            miles_to_fuel = max(0.0, self.fuel_interval_miles - miles_since_last_fuel)
            if miles_to_fuel <= 0.001:
                # Insert 15-minute On-Duty Not Driving (Line 4) fueling
                fuel_duration = 0.25  # 15 minutes
                fuel_end = clock + timedelta(hours=fuel_duration)
                fuel_location = f"Fuel Plaza / Travel Center (Mile {miles_driven:.1f})"

                self.events.append(
                    TimelineEvent(
                        status=DutyStatus.ON_DUTY_ND,
                        start_datetime=clock,
                        end_datetime=fuel_end,
                        start_mile=miles_driven,
                        end_mile=miles_driven,
                        activity="Fueling Vehicle",
                        remarks="1,000-Mile Mandatory Fueling & Inspection",
                        location=fuel_location
                    )
                )
                self.waypoints.append({
                    "type": "fuel_stop",
                    "name": f"1,000-Mile Fueling Station (Mile {miles_driven:.1f})",
                    "mile_marker": round(miles_driven, 1),
                    "timestamp": clock.isoformat(),
                    "duration_hours": fuel_duration,
                    "action": "15-min Fueling (Line 4)"
                })

                clock = fuel_end
                miles_since_last_fuel = 0.0
                shift_window_elapsed += fuel_duration
                running_cycle_hours += fuel_duration
                continue

            # Determine drive chunk duration:
            # Constrained by:
            # 1. 11h driving limit
            # 2. 14h duty window
            # 3. 8h continuous driving break limit
            # 4. 1,000-mile fuel interval
            # 5. Remaining trip distance
            miles_remaining = self.total_trip_distance - miles_driven
            time_to_destination = miles_remaining / self.average_truck_speed
            time_to_fuel = miles_to_fuel / self.average_truck_speed

            drive_hours = min(
                available_shift_drive,
                drive_until_break,
                time_to_fuel,
                time_to_destination
            )

            # Ensure minimum non-zero progress
            if drive_hours <= 0.0001:
                # Force limit trigger
                continue

            distance_chunk = drive_hours * self.average_truck_speed
            # Guard against exceeding total
            if miles_driven + distance_chunk > self.total_trip_distance:
                distance_chunk = self.total_trip_distance - miles_driven
                drive_hours = distance_chunk / self.average_truck_speed

            chunk_end = clock + timedelta(hours=drive_hours)

            self.events.append(
                TimelineEvent(
                    status=DutyStatus.DRIVING,
                    start_datetime=clock,
                    end_datetime=chunk_end,
                    start_mile=miles_driven,
                    end_mile=miles_driven + distance_chunk,
                    activity="Interstate Driving",
                    remarks=f"Driving at {self.average_truck_speed:.0f} MPH",
                    location="In Transit"
                )
            )

            # Advance state variables
            miles_driven += distance_chunk
            miles_since_last_fuel += distance_chunk
            shift_driving_hours += drive_hours
            shift_window_elapsed += drive_hours
            continuous_driving_hours += drive_hours
            running_cycle_hours += drive_hours
            clock = chunk_end

        # 4. Destination Terminal: 1.0 hour On-Duty Not Driving (Line 4) for Unloading
        dropoff_duration = 1.0  # 1 hour
        dropoff_end = clock + timedelta(hours=dropoff_duration)
        self.events.append(
            TimelineEvent(
                status=DutyStatus.ON_DUTY_ND,
                start_datetime=clock,
                end_datetime=dropoff_end,
                start_mile=miles_driven,
                end_mile=miles_driven,
                activity="Drop-off & Unloading",
                remarks="Freight Delivery, Unloading & Post-Trip DVIR",
                location=self.dropoff_location
            )
        )
        self.waypoints.append({
            "type": "dropoff",
            "name": f"Destination Terminal - {self.dropoff_location}",
            "mile_marker": round(miles_driven, 1),
            "timestamp": clock.isoformat(),
            "duration_hours": dropoff_duration,
            "action": "Unloading Cargo (Line 4)"
        })
        clock = dropoff_end
        running_cycle_hours += dropoff_duration

        # 5. Complete Final Day: Pad with Off Duty (Line 1) until Midnight (24:00)
        final_day_end = datetime(clock.year, clock.month, clock.day, 23, 59, 59, 999999)
        if clock < final_day_end:
            pad_end = datetime(clock.year, clock.month, clock.day, 0, 0, 0) + timedelta(days=1)
            self.events.append(
                TimelineEvent(
                    status=DutyStatus.OFF_DUTY,
                    start_datetime=clock,
                    end_datetime=pad_end,
                    start_mile=miles_driven,
                    end_mile=miles_driven,
                    activity="Post-Trip Off Duty",
                    remarks="Off Duty at Home Terminal / Destination",
                    location=self.dropoff_location
                )
            )

        total_driving_hours = sum(e.duration_hours for e in self.events if e.status == DutyStatus.DRIVING)
        total_on_duty_hours = sum(e.duration_hours for e in self.events if e.status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_ND))
        total_elapsed_hours = (self.events[-1].end_datetime - self.events[0].start_datetime).total_seconds() / 3600.0

        return {
            "total_distance_miles": round(self.total_trip_distance, 1),
            "total_driving_hours": round(total_driving_hours, 2),
            "total_on_duty_hours": round(total_on_duty_hours, 2),
            "total_elapsed_hours": round(total_elapsed_hours, 2),
            "current_cycle_used": round(self.current_cycle_used, 2),
            "new_cycle_total": round(running_cycle_hours, 2),
            "cycle_hours_remaining": round(max(0.0, 70.0 - running_cycle_hours), 2),
            "cycle_limit_exceeded": running_cycle_hours > 70.0,
            "waypoints": self.waypoints,
            "raw_events": [e.to_dict() for e in self.events]
        }
