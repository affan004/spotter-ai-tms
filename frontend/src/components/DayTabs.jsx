import React from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

export default function DayTabs({ days, activeDayIndex, onSelectDay }) {
  if (!days || days.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      overflowX: 'auto',
      paddingBottom: '4px'
    }}>
      {days.map((day, idx) => {
        const isActive = idx === activeDayIndex;
        return (
          <button
            key={`day-tab-${day.day_number}`}
            type="button"
            onClick={() => onSelectDay(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: isActive ? 'rgba(6, 182, 212, 0.15)' : '#0F172A',
              border: `1px solid ${isActive ? '#06B6D4' : '#334155'}`,
              color: isActive ? '#38BDF8' : '#94A3B8',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Calendar size={14} color={isActive ? '#06B6D4' : '#64748B'} />
            <span>Day {day.day_number}</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: isActive ? 'rgba(6, 182, 212, 0.25)' : '#1E293B',
              color: isActive ? '#FFFFFF' : '#64748B'
            }}>
              {day.daily_miles} mi
            </span>
            {day.totals.is_valid_24_hours && (
              <CheckCircle size={12} color="#10B981" />
            )}
          </button>
        );
      })}
    </div>
  );
}
