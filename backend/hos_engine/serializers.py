"""
Serializers for FMCSA HOS Engine API.
"""

from rest_framework import serializers


class TripCalculationRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(
        max_length=255,
        required=False,
        default="Indianapolis, IN",
        help_text="Current truck location"
    )
    pickup_location = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Shipper / Cargo Pickup location"
    )
    dropoff_location = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Receiver / Freight Delivery location"
    )
    current_cycle_used = serializers.FloatField(
        required=False,
        default=0.0,
        min_value=0.0,
        max_value=70.0,
        help_text="Current 70-hour / 8-day cycle hours already consumed (0.0 to 70.0)"
    )
    avg_speed = serializers.FloatField(
        required=False,
        default=55.0,
        min_value=25.0,
        max_value=75.0,
        help_text="Average truck speed in MPH (default: 55 mph)"
    )
    start_time = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="Trip start timestamp (defaults to today at 06:00:00)"
    )
    custom_distance_miles = serializers.FloatField(
        required=False,
        allow_null=True,
        min_value=1.0,
        help_text="Optional manual mileage override"
    )
    truck_height_ft = serializers.FloatField(
        required=False,
        default=13.5,
        help_text="Commercial vehicle height in feet (default: 13.5 ft / 13' 6\")"
    )
    truck_weight_lbs = serializers.FloatField(
        required=False,
        default=80000.0,
        help_text="Commercial gross vehicle weight in lbs (default: 80,000 lbs)"
    )
