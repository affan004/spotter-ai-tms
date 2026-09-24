import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TripForm from './components/TripForm';
import TripSummaryCard from './components/TripSummaryCard';
import RouteMap from './components/RouteMap';
import EldLogSheet from './components/EldLogSheet';
import DayTabs from './components/DayTabs';
import { calculateTrip } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [tripData, setTripData] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default initial trip on startup
  useEffect(() => {
    handleRunCalculation({
      current_location: 'Indianapolis, IN',
      pickup_location: 'Indianapolis, IN',
      dropoff_location: 'Dallas, TX',
      current_cycle_used: 14.5,
      avg_speed: 55,
      custom_distance_miles: 1025.0,
      truck_height_ft: 13.5,
      truck_weight_lbs: 80000.0
    });
  }, []);

  const handleRunCalculation = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await calculateTrip(payload);
      setTripData(data);
      setActiveDayIndex(0); // Reset to Day 1
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err.message || 'Failed to simulate route and HOS compliance.');
    } finally {
      setLoading(false);
    }
  };

  const activeDay = tripData?.days?.[activeDayIndex] || null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* Neo-SaaS Header Bar */}
      <Header truckSpecs={tripData?.summary?.truck_specs} />

      {/* Main Dashboard Container */}
      <main style={{
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        flex: 1
      }}>
        {/* Error Notification */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#F43F5E',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Top Control Section: Trip Form & Telemetry Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          <TripForm
            onSubmit={handleRunCalculation}
            loading={loading}
            onSelectPreset={handleRunCalculation}
          />
          <TripSummaryCard summary={tripData?.summary} />
        </div>

        {/* Interactive Geospatial Routing Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#F8FAFC' }}>
                Commercial Interstate Corridor & Dynamic Waypoints
              </h2>
              <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                Interactive dark matter map with neon routing path, clearance checks, and mandated HOS stop locations.
              </p>
            </div>
            {tripData?.route?.truck_compliance && (
              <span style={{
                fontSize: '11px',
                color: '#38BDF8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                {tripData.route.truck_compliance.bridge_clearance_status}
              </span>
            )}
          </div>

          <RouteMap
            routeData={tripData?.route}
            summary={tripData?.summary}
          />
        </section>

        {/* FMCSA 24-Hour Digital ELD Compliance Log Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC' }}>
                Electronic Logging Device (ELD) Daily Log Sheets
              </h2>
              <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                Strict 24-hour midnight boundary partitioning adhering to 49 CFR §395.8 grid standards.
              </p>
            </div>

            {/* Day Pagination Tabs */}
            <DayTabs
              days={tripData?.days || []}
              activeDayIndex={activeDayIndex}
              onSelectDay={(idx) => setActiveDayIndex(idx)}
            />
          </div>

          {/* Active Day's ELD Sheet */}
          {activeDay ? (
            <EldLogSheet
              dayData={activeDay}
              tripSummary={tripData?.summary}
              locations={tripData?.locations}
            />
          ) : (
            <div className="solid-panel" style={{
              padding: '40px',
              textAlign: 'center',
              borderRadius: '12px',
              color: '#94A3B8'
            }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Simulating HOS log sheets...</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #334155',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748B'
      }}>
        Spotter.ai TMS &bull; FMCSA Hours of Service (HOS) Engine & 24-Hour ELD Grid Log Generator &bull; 49 CFR Part 395 Property-Carrying Standard
      </footer>
    </div>
  );
}
