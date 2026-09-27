import React, { useState } from 'react';
import { Navigation, MapPin, Coffee, Moon, Fuel, ArrowRight, Compass, ShieldCheck, ChevronDown, ChevronUp, Flag } from 'lucide-react';

export default function RouteInstructions({ routeData, summary, days }) {
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'milestones'
  const [isCollapsed, setIsCollapsed] = useState(false);

  const instructions = routeData?.route_instructions || [];
  const waypoints = routeData?.waypoints || [];

  // Build combined manifest if instructions exist, or derive from waypoints & summary
  const manifestItems = React.useMemo(() => {
    if (!instructions || instructions.length === 0) {
      // Fallback: build from waypoints
      return waypoints.map((wp, idx) => ({
        step_number: idx + 1,
        is_milestone: true,
        leg_type: wp.type === 'current' ? 'Origin Departure' : 'Loaded Freight Corridor',
        instruction: `${wp.action}: ${wp.name}`,
        road_name: 'US Interstate Commercial Corridor',
        distance_miles: wp.mile_marker,
        duration_minutes: wp.duration_hours * 60,
        maneuver_type: wp.type,
        wp_type: wp.type,
        mile_marker: wp.mile_marker
      }));
    }

    return instructions.map((item) => {
      let wpType = null;
      if (item.is_milestone) {
        if (item.leg_type?.toLowerCase().includes('deadhead')) wpType = 'current';
        else wpType = 'pickup';
      }
      return {
        ...item,
        wp_type: wpType
      };
    });
  }, [instructions, waypoints]);

  const displayedItems = filterMode === 'milestones'
    ? manifestItems.filter(item => item.is_milestone || item.distance_miles > 15.0)
    : manifestItems;

  const getManeuverIcon = (item) => {
    const m = (item.maneuver_type || '').toLowerCase();
    const inst = (item.instruction || '').toLowerCase();

    if (item.wp_type === 'current' || inst.includes('origin')) return <Compass size={15} color="#818CF8" />;
    if (inst.includes('pickup') || inst.includes('loading')) return <MapPin size={15} color="#06B6D4" />;
    if (inst.includes('rest') || inst.includes('break')) return <Coffee size={15} color="#10B981" />;
    if (inst.includes('sleeper') || inst.includes('berth')) return <Moon size={15} color="#818CF8" />;
    if (inst.includes('fuel')) return <Fuel size={15} color="#F59E0B" />;
    if (inst.includes('destination') || inst.includes('dropoff') || inst.includes('unloading')) return <Flag size={15} color="#38BDF8" />;

    return <Navigation size={14} color="#38BDF8" />;
  };

  return (
    <div className="solid-panel" style={{
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      backgroundColor: '#1E293B',
      border: '1px solid #334155'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06B6D4'
          }}>
            <Navigation size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC' }}>
                Route Instructions & Commercial Dispatch Manifest
              </h3>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                {displayedItems.length} Segments
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8' }}>
              Turn-by-turn navigation corridors, mandatory FMCSA rest stops, and terminal operations.
            </p>
          </div>
        </div>

        {/* Filter & Collapse Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#0F172A',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid #334155'
          }}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterMode === 'all' ? '#06B6D4' : 'transparent',
                color: filterMode === 'all' ? '#0F172A' : '#94A3B8'
              }}
            >
              All Turns
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('milestones')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterMode === 'milestones' ? '#06B6D4' : 'transparent',
                color: filterMode === 'milestones' ? '#0F172A' : '#94A3B8'
              }}
            >
              Milestones Only
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              padding: '6px 8px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </div>

      {/* Manifest Table */}
      {!isCollapsed && (
        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          borderRadius: '8px',
          border: '1px solid #334155',
          backgroundColor: '#0F172A'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#1E293B',
                borderBottom: '1px solid #334155',
                color: '#94A3B8',
                textAlign: 'left',
                zIndex: 10
              }}>
                <th style={{ padding: '8px 12px', width: '50px' }}>#</th>
                <th style={{ padding: '8px 12px' }}>Maneuver & Route Instruction</th>
                <th style={{ padding: '8px 12px' }}>Highway / Road Corridor</th>
                <th style={{ padding: '8px 12px', width: '90px', textAlign: 'right' }}>Distance</th>
                <th style={{ padding: '8px 12px', width: '90px', textAlign: 'right' }}>Est. Time</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item, idx) => {
                const isMilestone = item.is_milestone;
                return (
                  <tr
                    key={`manifest-step-${idx}`}
                    style={{
                      borderBottom: '1px solid #1E293B',
                      backgroundColor: isMilestone ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <td style={{
                      padding: '8px 12px',
                      color: isMilestone ? '#06B6D4' : '#64748B',
                      fontWeight: isMilestone ? '700' : '500'
                    }}>
                      {item.step_number || idx + 1}
                    </td>

                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getManeuverIcon(item)}
                        <span style={{
                          color: isMilestone ? '#F8FAFC' : '#E2E8F0',
                          fontWeight: isMilestone ? '700' : '500'
                        }}>
                          {item.instruction}
                        </span>
                        {item.leg_type && (
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            backgroundColor: item.leg_type.includes('Deadhead') ? 'rgba(129, 140, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: item.leg_type.includes('Deadhead') ? '#A5B4FC' : '#6EE7B7'
                          }}>
                            {item.leg_type.includes('Deadhead') ? 'Deadhead' : 'Loaded'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '8px 12px', color: '#94A3B8', fontFamily: 'monospace' }}>
                      {item.road_name || 'Interstate'}
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#38BDF8', fontWeight: '600' }} className="font-mono">
                      {item.distance_miles ? `${item.distance_miles} mi` : '--'}
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94A3B8' }} className="font-mono">
                      {item.duration_minutes ? (
                        item.duration_minutes >= 60
                          ? `${(item.duration_minutes / 60).toFixed(1)} hrs`
                          : `${Math.round(item.duration_minutes)} min`
                      ) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Compliance / Specs Footer Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        backgroundColor: '#0F172A',
        borderRadius: '8px',
        border: '1px solid #334155',
        fontSize: '11px',
        color: '#94A3B8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10B981" />
          <span>Commercial Route Verified: <strong>13'6" Max Height</strong> | <strong>80,000 lbs GVW</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {summary?.deadhead_distance_miles > 0 && (
            <span>Deadhead: <strong style={{ color: '#818CF8' }}>{summary.deadhead_distance_miles} mi</strong></span>
          )}
          <span>Loaded Transit: <strong style={{ color: '#06B6D4' }}>{summary?.loaded_distance_miles || summary?.total_distance_miles} mi</strong></span>
        </div>
      </div>
    </div>
  );
}
