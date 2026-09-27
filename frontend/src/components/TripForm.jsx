import React, { useState } from 'react';
import { MapPin, Gauge, Clock, Zap, ArrowRight, Truck, RefreshCw, Compass } from 'lucide-react';

export default function TripForm({ onSubmit, loading, onSelectPreset }) {
  const [currentLocation, setCurrentLocation] = useState('Indianapolis, IN');
  const [pickupLocation, setPickupLocation] = useState('Indianapolis, IN');
  const [dropoffLocation, setDropoffLocation] = useState('Dallas, TX');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [currentCycleUsed, setCurrentCycleUsed] = useState(14.5);
  const [avgSpeed, setAvgSpeed] = useState(55);
  const [customDistance, setCustomDistance] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Construct start_time with today's date and chosen departure time
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const startTimeIso = `${dateStr}T${departureTime}:00`;

    onSubmit({
      current_location: currentLocation,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      start_time: startTimeIso,
      current_cycle_used: parseFloat(currentCycleUsed) || 0,
      avg_speed: parseFloat(avgSpeed) || 55,
      custom_distance_miles: customDistance ? parseFloat(customDistance) : null,
      truck_height_ft: 13.5,
      truck_weight_lbs: 80000.0
    });
  };

  const applyPreset = (preset) => {
    setCurrentLocation(preset.current_location);
    setPickupLocation(preset.pickup_location);
    setDropoffLocation(preset.dropoff_location);
    setCurrentCycleUsed(preset.current_cycle_used);
    setAvgSpeed(preset.avg_speed || 55);
    setDepartureTime(preset.departure_time || '08:00');
    setCustomDistance(preset.custom_distance || '');

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const startTimeIso = `${dateStr}T${preset.departure_time || '08:00'}:00`;

    if (onSelectPreset) {
      onSelectPreset({
        ...preset,
        start_time: startTimeIso,
        custom_distance_miles: preset.custom_distance ? parseFloat(preset.custom_distance) : null,
        truck_height_ft: 13.5,
        truck_weight_lbs: 80000.0
      });
    }
  };

  return (
    <div className="solid-panel" style={{
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Panel Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06B6D4'
          }}>
            <MapPin size={16} />
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC' }}>
            Trip Dispatch & HOS Parameters
          </h2>
        </div>
        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>
          Property-Carrying 70hr/8day (49 CFR §395)
        </span>
      </div>

      {/* Preset Quick-Load Pills */}
      <div>
        <label style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
          1-Click Demonstration Routes:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <button
            type="button"
            onClick={() => applyPreset({
              current_location: 'Indianapolis, IN',
              pickup_location: 'Indianapolis, IN',
              dropoff_location: 'Dallas, TX',
              current_cycle_used: 14.5,
              avg_speed: 55,
              departure_time: '08:00'
            })}
            style={{
              padding: '6px 8px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#38BDF8',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            Indy → Dallas (1,025 mi)
          </button>

          <button
            type="button"
            onClick={() => applyPreset({
              current_location: 'Chicago, IL',
              pickup_location: 'Indianapolis, IN',
              dropoff_location: 'Dallas, TX',
              current_cycle_used: 14.5,
              avg_speed: 55,
              departure_time: '08:00'
            })}
            style={{
              padding: '6px 8px',
              backgroundColor: '#0F172A',
              border: '1px solid rgba(129, 140, 248, 0.4)',
              borderRadius: '6px',
              color: '#A5B4FC',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            ★ Chi → Indy → Dal (Deadhead)
          </button>

          <button
            type="button"
            onClick={() => applyPreset({
              current_location: 'Chicago, IL',
              pickup_location: 'Chicago, IL',
              dropoff_location: 'Atlanta, GA',
              current_cycle_used: 28.0,
              avg_speed: 55,
              departure_time: '08:00'
            })}
            style={{
              padding: '6px 8px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#38BDF8',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            Chi → Atlanta (715 mi)
          </button>

          <button
            type="button"
            onClick={() => applyPreset({
              current_location: 'New York, NY',
              pickup_location: 'New York, NY',
              dropoff_location: 'Los Angeles, CA',
              current_cycle_used: 0.0,
              avg_speed: 55,
              departure_time: '08:00'
            })}
            style={{
              padding: '6px 8px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#38BDF8',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            NY → LA (2,790 mi)
          </button>
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Current Location */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Current Location (Origin)
            </label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. Indianapolis, IN"
              required
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Pickup Location */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Pickup Location (Shipper)
            </label>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Indianapolis, IN"
              required
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Dropoff Location */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Dropoff Location (Receiver)
            </label>
            <input
              type="text"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="e.g. Dallas, TX"
              required
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Operational Parameters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {/* Departure Time */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Departure Time (Day 1)
            </label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Current Cycle Hours */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8' }}>
                Cycle Used (Hrs)
              </label>
              <span className="font-mono" style={{ fontSize: '11px', color: '#06B6D4', fontWeight: '600' }}>
                {currentCycleUsed} / 70.0h
              </span>
            </div>
            <input
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={currentCycleUsed}
              onChange={(e) => setCurrentCycleUsed(e.target.value)}
              required
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Average Truck Speed */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Speed (MPH)
            </label>
            <input
              type="number"
              min="35"
              max="70"
              value={avgSpeed}
              onChange={(e) => setAvgSpeed(e.target.value)}
              required
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Optional Distance Override */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Distance Override (mi)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Auto-calculated"
              value={customDistance}
              onChange={(e) => setCustomDistance(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '4px',
            padding: '12px 18px',
            backgroundColor: '#06B6D4',
            border: 'none',
            borderRadius: '8px',
            color: '#0F172A',
            fontSize: '14px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Simulating FMCSA Compliance & Building Logs...</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              <span>Calculate Compliant Route & Generate 24-Hr ELD Logs</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
