import React from 'react';
import { Route, Clock, Calendar, ShieldCheck, Fuel, AlertCircle } from 'lucide-react';

export default function TripSummaryCard({ summary }) {
  if (!summary) return null;

  const cyclePercent = Math.min(100, Math.round((summary.new_cycle_total / 70.0) * 100));
  const isCycleExceeded = summary.cycle_limit_exceeded;

  return (
    <div className="solid-panel" style={{
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC' }}>
          Mission Telemetry & HOS Summary
        </h3>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          padding: '3px 8px',
          borderRadius: '4px',
          backgroundColor: isCycleExceeded ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: isCycleExceeded ? '#F43F5E' : '#10B981',
          border: `1px solid ${isCycleExceeded ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
        }}>
          {isCycleExceeded ? '34-Hour Restart Required' : 'HOS Compliant Shift'}
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {/* Total Distance */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}>
            <Route size={14} color="#06B6D4" />
            <span>Total Route Miles</span>
          </div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '700', color: '#06B6D4' }}>
            {summary.total_distance_miles.toLocaleString()} <span style={{ fontSize: '12px', color: '#94A3B8' }}>mi</span>
          </div>
        </div>

        {/* Driving Time */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}>
            <Clock size={14} color="#38BDF8" />
            <span>Total Drive Time</span>
          </div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '700', color: '#38BDF8' }}>
            {summary.total_driving_hours} <span style={{ fontSize: '12px', color: '#94A3B8' }}>hrs</span>
          </div>
        </div>

        {/* Total Elapsed Time */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}>
            <Calendar size={14} color="#10B981" />
            <span>Total Trip Elapsed</span>
          </div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>
            {summary.total_elapsed_hours} <span style={{ fontSize: '12px', color: '#94A3B8' }}>hrs</span>
          </div>
        </div>

        {/* Calendar Days */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}>
            <ShieldCheck size={14} color="#F59E0B" />
            <span>Log Sheets Needed</span>
          </div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '700', color: '#F59E0B' }}>
            {summary.total_days} <span style={{ fontSize: '12px', color: '#94A3B8' }}>{summary.total_days === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      </div>

      {/* 70-Hour Cycle Meter */}
      <div style={{
        backgroundColor: '#0F172A',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: '#94A3B8', fontWeight: '600' }}>
            70-Hour / 8-Day Rolling Cycle Allocation:
          </span>
          <span className="font-mono" style={{ color: isCycleExceeded ? '#F43F5E' : '#38BDF8', fontWeight: '700' }}>
            {summary.new_cycle_total}h consumed / {summary.cycle_hours_remaining}h remaining
          </span>
        </div>

        {/* Progress Bar Container */}
        <div style={{
          height: '8px',
          width: '100%',
          backgroundColor: '#1E293B',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${cyclePercent}%`,
            backgroundColor: isCycleExceeded ? '#F43F5E' : (cyclePercent > 80 ? '#F59E0B' : '#06B6D4'),
            borderRadius: '4px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>
    </div>
  );
}
