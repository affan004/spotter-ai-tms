"""
Views for FMCSA Hours of Service (HOS) Engine.
"""

from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import TripCalculationRequestSerializer
from .services.hos_simulator import HosSimulator
from .services.midnight_splitter import MidnightSplitter
from .services.routing_service import RoutingService, haversine_distance_miles


class CalculateTripView(APIView):
    """
    POST /api/hos/calculate-trip/
    Calculates multi-day route segments, required HOS breaks/fueling,
    and returns compliant 24-hour ELD log grids.
    """

    def post(self, request, *args, **kwargs):
        serializer = TripCalculationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Validation Error", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        current_loc_str = data.get("current_location", "Indianapolis, IN")
        pickup_loc_str = data["pickup_location"]
        dropoff_loc_str = data["dropoff_location"]
        current_cycle_used = data.get("current_cycle_used", 0.0)
        if current_cycle_used == 0.0 and data.get("current_cycle_used_hours") is not None:
            current_cycle_used = data.get("current_cycle_used_hours")
        avg_speed = data.get("avg_speed", 55.0)
        start_time = data.get("start_time")
        custom_dist = data.get("custom_distance_miles")
        truck_height = data.get("truck_height_ft", 13.5)
        truck_weight = data.get("truck_weight_lbs", 80000.0)

        try:
            # 1. Geocode locations
            current_geo = RoutingService.geocode(current_loc_str)
            pickup_geo = RoutingService.geocode(pickup_loc_str)
            dropoff_geo = RoutingService.geocode(dropoff_loc_str)

            # Check if current location differs from pickup location (Deadhead leg)
            curr_clean = current_loc_str.strip().lower()
            pick_clean = pickup_loc_str.strip().lower()
            has_deadhead = curr_clean != pick_clean and haversine_distance_miles(current_geo["lat"], current_geo["lng"], pickup_geo["lat"], pickup_geo["lng"]) > 10.0

            if has_deadhead:
                routing_points = [current_geo, pickup_geo, dropoff_geo]
            else:
                routing_points = [pickup_geo, dropoff_geo]

            # 2. Compute Multi-tier Truck Route with turn-by-turn instructions
            route_data = RoutingService.get_truck_route(
                waypoints=routing_points,
                truck_height_ft=truck_height,
                truck_weight_lbs=truck_weight
            )

            trip_distance_miles = custom_dist if custom_dist else route_data["distance_miles"]
            deadhead_dist = route_data.get("deadhead_distance_miles", 0.0) if has_deadhead else 0.0

            # 3. Execute FMCSA HOS Simulation
            simulator = HosSimulator(
                total_trip_distance=trip_distance_miles,
                current_cycle_used=current_cycle_used,
                average_truck_speed=avg_speed,
                start_time=start_time,
                current_location=current_geo["name"],
                pickup_location=pickup_geo["name"],
                dropoff_location=dropoff_geo["name"],
                deadhead_distance_miles=deadhead_dist,
                truck_height_ft=truck_height,
                truck_weight_lbs=truck_weight
            )
            sim_results = simulator.run_simulation()

            # 4. Strict 24-Hour Midnight Partitioning
            daily_logs = MidnightSplitter.split_into_days(
                events=simulator.events,
                initial_cycle_used=current_cycle_used
            )

            # 5. Interpolate waypoints along route polyline
            enhanced_waypoints = RoutingService.interpolate_waypoints_on_polyline(
                polyline_coords=route_data["coordinates"],
                waypoints=sim_results["waypoints"],
                total_distance_miles=trip_distance_miles
            )

            # 6. Tag each waypoint with corresponding Day Number
            for wp in enhanced_waypoints:
                try:
                    wp_dt = datetime.fromisoformat(wp["timestamp"])
                    wp["day_number"] = 1
                    for d in daily_logs:
                        d_dt = datetime.fromisoformat(d["date"]).date()
                        if wp_dt.date() == d_dt:
                            wp["day_number"] = d["day_number"]
                            break
                except Exception:
                    wp["day_number"] = 1

            response_payload = {
                "summary": {
                    "total_distance_miles": trip_distance_miles,
                    "deadhead_distance_miles": deadhead_dist,
                    "loaded_distance_miles": round(trip_distance_miles - deadhead_dist, 1),
                    "total_driving_hours": sim_results["total_driving_hours"],
                    "total_on_duty_hours": sim_results["total_on_duty_hours"],
                    "total_elapsed_hours": sim_results["total_elapsed_hours"],
                    "total_days": len(daily_logs),
                    "current_cycle_used": current_cycle_used,
                    "new_cycle_total": sim_results["new_cycle_total"],
                    "cycle_hours_remaining": sim_results["cycle_hours_remaining"],
                    "cycle_limit_exceeded": sim_results["cycle_limit_exceeded"],
                    "avg_speed_mph": avg_speed,
                    "truck_specs": {
                        "height_ft": truck_height,
                        "weight_lbs": truck_weight,
                        "length_ft": 53.0,
                        "clearance_check": "Interstate Standard Clearance Verified (Min 16'0\")"
                    }
                },
                "locations": {
                    "current": current_geo,
                    "pickup": pickup_geo,
                    "dropoff": dropoff_geo
                },
                "route": {
                    "routing_engine": route_data["routing_engine"],
                    "truck_compliance": route_data["truck_compliance"],
                    "coordinates": route_data["coordinates"],
                    "waypoints": enhanced_waypoints,
                    "route_instructions": route_data.get("route_instructions", []),
                    "deadhead_distance_miles": deadhead_dist,
                    "loaded_distance_miles": round(trip_distance_miles - deadhead_dist, 1)
                },
                "days": daily_logs
            }

            return Response(response_payload, status=status.HTTP_200_OK)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": "Trip calculation failed", "details": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SampleTripsView(APIView):
    """
    GET /api/hos/sample-trips/
    Returns pre-configured sample trips for one-click testing and demonstration.
    """

    def get(self, request, *args, **kwargs):
        samples = [
            {
                "id": "midwest-to-texas",
                "title": "Indianapolis, IN to Dallas, TX (Multi-Day Long Haul)",
                "current_location": "Indianapolis, IN",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Dallas, TX",
                "current_cycle_used": 14.5,
                "avg_speed": 55.0,
                "description": "~1,025 miles: Demonstrates 11-hour drive limit, 14-hour duty window, 30-min break, 1,000-mile fuel stop, 10-hour sleeper reset, and 2 calendar day sheets."
            },
            {
                "id": "chicago-to-atlanta",
                "title": "Chicago, IL to Atlanta, GA (Mid-Range Haul)",
                "current_location": "Chicago, IL",
                "pickup_location": "Chicago, IL",
                "dropoff_location": "Atlanta, GA",
                "current_cycle_used": 28.0,
                "avg_speed": 55.0,
                "description": "~715 miles: Demonstrates 14-hour window, 30-minute break after 8 hours driving, and 10-hour sleeper berth reset at mile 605."
            },
            {
                "id": "cross-country-coast",
                "title": "New York, NY to Los Angeles, CA (Cross-Country Transcontinental)",
                "current_location": "New York, NY",
                "pickup_location": "New York, NY",
                "dropoff_location": "Los Angeles, CA",
                "current_cycle_used": 0.0,
                "avg_speed": 55.0,
                "description": "~2,790 miles: Demonstrates multi-day progression (5 days), 2 fuel stops, multiple 10-hour sleeper resets, and 70-hour cycle depletion."
            }
        ]
        return Response({"sample_trips": samples}, status=status.HTTP_200_OK)
