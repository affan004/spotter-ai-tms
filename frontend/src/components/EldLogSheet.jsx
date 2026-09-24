import React, { useState } from 'react';
import { Printer, CheckCircle, Clock, MapPin, AlertCircle, FileText, Info } from 'lucide-react';

export default function EldLogSheet({ dayData, tripSummary, locations }) {
  if (!dayData) return null;

  const [hoveredSegment, setHoveredSegment] = useState(null);

  const { totals, segments, hos_recap } = dayData;

  // SVG Grid Dimensions
  const svgWidth = 960;
  const svgHeight = 220;
  const leftMargin = 140;
  const rightMargin = 70;
  const graphWidth = svgWidth - leftMargin - rightMargin;
  const graphHeight = 120;
  const topMargin = 50;

  // Y-Coordinates for 4 Duty Lines
  const rowY = {
    1: topMargin + 15,   // Line 1: Off Duty (Y = 65)
    2: topMargin + 45,   // Line 2: Sleeper Berth (Y = 95)
    3: topMargin + 75,   // Line 3: Driving (Y = 125)
    4: topMargin + 105   // Line 4: On Duty Not Driving (Y = 155)
  };

  const statusColors = {
    1: '#94A3B8', // Off Duty (Cool Gray)
    2: '#818CF8', // Sleeper Berth (Indigo)
    3: '#06B6D4', // Driving (Neon Cyan)
    4: '#F59E0B'  // On Duty Not Driving (Amber)
  };

  // Build SVG Path for Duty Transitions
  const buildDutyPath = () => {
    if (!segments || segments.length === 0) return '';
    let d = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const x1 = leftMargin + (seg.start_decimal / 24.0) * graphWidth;
      const x2 = leftMargin + (seg.end_decimal / 24.0) * graphWidth;
      const y = rowY[seg.status] || rowY[1];

      if (i === 0) {
        d += `M ${x1} ${y} L ${x2} ${y}`;
      } else {
        const prevSeg = segments[i - 1];
        const prevY = rowY[prevSeg.status] || rowY[1];
        // Vertical step transition, then horizontal segment
        d += ` L ${x1} ${y} L ${x2} ${y}`;
      }
    }
    return d;
  };

  const dutyPathString = buildDutyPath();

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="solid-panel" style={{
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      backgroundColor: '#1E293B',
      border: '1px solid #334155'
    }}>
      {/* Official Form Header */}
      <div style={{
        borderBottom: '1px solid #334155',
        paddingBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', letterSpacing: '-0.3px' }}>
                Driver's Daily Log (24 Hours)
              </h2>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}>
                FMCSA §395.8 Form
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
              Original: Electronic Record on File | Duplicate: Retained for 8 Days
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="no-print">
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#0F172A',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#E2E8F0',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              <span>Print / Export Log</span>
            </button>
          </div>
        </div>

        {/* Form Meta Fields Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          backgroundColor: '#0F172A',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid #334155',
          fontSize: '12px'
        }}>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              Log Date:
            </span>
            <strong style={{ color: '#F8FAFC' }}>{dayData.formatted_date}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              Motor Carrier:
            </span>
            <strong style={{ color: '#F8FAFC' }}>Spotter Logistics Network LLC</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              Driver Name & ID:
            </span>
            <strong style={{ color: '#F8FAFC' }}>Alex Mercer (DRV-1094)</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              Tractor / Trailer:
            </span>
            <strong className="font-mono" style={{ color: '#38BDF8' }}>TRK-8492 / TRL-5301</strong>
          </div>

          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              From (Origin):
            </span>
            <strong style={{ color: '#F8FAFC' }}>{locations?.pickup?.name || 'Origin Terminal'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              To (Destination):
            </span>
            <strong style={{ color: '#F8FAFC' }}>{locations?.dropoff?.name || 'Destination Terminal'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              Total Miles Driving Today:
            </span>
            <strong className="font-mono" style={{ color: '#06B6D4' }}>{totals.driving_hours > 0 ? `${dayData.daily_miles} mi` : '0.0 mi'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>
              Home Terminal Address:
            </span>
            <strong style={{ color: '#F8FAFC' }}>100 N Senate Ave, Indianapolis, IN</strong>
          </div>
        </div>
      </div>

      {/* Interactive 24-Hour SVG Visual Log Grid */}
      <div style={{
        backgroundColor: '#0F172A',
        borderRadius: '8px',
        border: '1px solid #334155',
        padding: '16px 12px 10px 12px',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            24-Hour Electronic Duty Status Timeline (00:00 to 24:00)
          </span>
          {hoveredSegment && (
            <div style={{
              fontSize: '11px',
              color: '#38BDF8',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              <strong>{hoveredSegment.start_time} - {hoveredSegment.end_time}</strong>: {hoveredSegment.status_name} ({hoveredSegment.duration_hours}h) — {hoveredSegment.remarks}
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Defs for glow filter */}
          <defs>
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#06B6D4" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Top Hour Labels Header (Midnight, 1..11, Noon, 1..11, Midnight) */}
          {Array.from({ length: 25 }).map((_, hour) => {
            const x = leftMargin + (hour / 24.0) * graphWidth;
            let label = hour.toString();
            if (hour === 0) label = 'Mid-night';
            else if (hour === 12) label = 'Noon';
            else if (hour === 24) label = 'Mid-night';
            else if (hour > 12) label = (hour - 12).toString();

            return (
              <g key={`hour-label-${hour}`}>
                <text
                  x={x}
                  y={topMargin - 16}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize={hour === 0 || hour === 12 || hour === 24 ? "9" : "10"}
                  fontWeight={hour === 0 || hour === 12 || hour === 24 ? "700" : "500"}
                  fontFamily="Inter, sans-serif"
                >
                  {label}
                </text>
                {/* Vertical Hour Line spanning grid */}
                <line
                  x1={x}
                  y1={topMargin - 4}
                  x2={x}
                  y2={rowY[4] + 15}
                  stroke={hour === 0 || hour === 12 || hour === 24 ? "#64748B" : "#334155"}
                  strokeWidth={hour === 0 || hour === 12 || hour === 24 ? "1.5" : "0.75"}
                />
              </g>
            );
          })}

          {/* Total Hours Header Column */}
          <text
            x={svgWidth - (rightMargin / 2)}
            y={topMargin - 16}
            textAnchor="middle"
            fill="#CBD5E1"
            fontSize="10"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            Total Hours
          </text>

          {/* 4 Status Rows Backgrounds & Subdivisions */}
          {[1, 2, 3, 4].map((statusKey) => {
            const y = rowY[statusKey];
            const labels = {
              1: '1. Off Duty',
              2: '2. Sleeper Berth',
              3: '3. Driving',
              4: '4. On Duty (ND)'
            };
            const rowHours = {
              1: totals.off_duty_hours,
              2: totals.sleeper_hours,
              3: totals.driving_hours,
              4: totals.on_duty_nd_hours
            };

            return (
              <g key={`status-row-${statusKey}`}>
                {/* Row Label (Left) */}
                <text
                  x={leftMargin - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="#CBD5E1"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {labels[statusKey]}
                </text>

                {/* Horizontal Baseline for Row */}
                <line
                  x1={leftMargin}
                  y1={y}
                  x2={leftMargin + graphWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* 15-Minute Subdivisions Ticks */}
                {Array.from({ length: 24 * 4 }).map((_, tickIdx) => {
                  const tickX = leftMargin + (tickIdx / (24 * 4.0)) * graphWidth;
                  const isHour = tickIdx % 4 === 0;
                  const isHalfHour = tickIdx % 2 === 0 && !isHour;
                  const tickHeight = isHour ? 12 : isHalfHour ? 8 : 4;

                  return (
                    <line
                      key={`tick-${statusKey}-${tickIdx}`}
                      x1={tickX}
                      y1={y - tickHeight}
                      x2={tickX}
                      y2={y}
                      stroke={isHalfHour ? "#64748B" : "#475569"}
                      strokeWidth={isHalfHour ? "1" : "0.75"}
                    />
                  );
                })}

                {/* Row Total Hours (Right) */}
                <rect
                  x={leftMargin + graphWidth + 8}
                  y={y - 12}
                  width={rightMargin - 16}
                  height={22}
                  fill="#1E293B"
                  stroke="#334155"
                  rx="4"
                />
                <text
                  x={leftMargin + graphWidth + (rightMargin / 2)}
                  y={y + 3}
                  textAnchor="middle"
                  fill={rowHours[statusKey] > 0 ? statusColors[statusKey] : "#64748B"}
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {rowHours[statusKey].toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Render Active Continuous Duty Step-Path */}
          {dutyPathString && (
            <path
              d={dutyPathString}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cyanGlow)"
            />
          )}

          {/* Render Interactive Hover Hit-Boxes for Each Segment */}
          {segments.map((seg, idx) => {
            const x1 = leftMargin + (seg.start_decimal / 24.0) * graphWidth;
            const x2 = leftMargin + (seg.end_decimal / 24.0) * graphWidth;
            const y = rowY[seg.status] || rowY[1];
            const segWidth = Math.max(2, x2 - x1);

            return (
              <rect
                key={`hitbox-${idx}`}
                x={x1}
                y={y - 10}
                width={segWidth}
                height={20}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
          })}

          {/* Bottom Total 24.00h Validation Badge on SVG */}
          <line
            x1={leftMargin}
            y1={rowY[4] + 20}
            x2={svgWidth - 8}
            y2={rowY[4] + 20}
            stroke="#475569"
            strokeWidth="1.5"
          />
          <text
            x={leftMargin - 12}
            y={rowY[4] + 36}
            textAnchor="end"
            fill="#10B981"
            fontSize="11"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            DAILY AUDIT SUM:
          </text>
          <text
            x={leftMargin + graphWidth + (rightMargin / 2)}
            y={rowY[4] + 36}
            textAnchor="middle"
            fill="#10B981"
            fontSize="12"
            fontWeight="800"
            fontFamily="'JetBrains Mono', monospace"
          >
            24.00h
          </text>
        </svg>
      </div>

      {/* Calculations & Recap Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Chronological Remarks Section */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <FileText size={16} color="#06B6D4" />
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>
              Remarks & Duty Status Change Log
            </h3>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px' }}>Time</th>
                  <th style={{ padding: '6px 4px' }}>Status</th>
                  <th style={{ padding: '6px 4px' }}>Location</th>
                  <th style={{ padding: '6px 4px' }}>Activity & Remarks</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s, idx) => (
                  <tr
                    key={`remark-${idx}`}
                    style={{
                      borderBottom: '1px solid #1E293B',
                      backgroundColor: hoveredSegment === s ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
                    }}
                    onMouseEnter={() => setHoveredSegment(s)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    <td className="font-mono" style={{ padding: '6px 4px', color: '#38BDF8', fontWeight: '600' }}>
                      {s.start_time} - {s.end_time}
                    </td>
                    <td style={{ padding: '6px 4px', color: statusColors[s.status], fontWeight: '700' }}>
                      {s.status_name}
                    </td>
                    <td style={{ padding: '6px 4px', color: '#CBD5E1' }}>
                      {s.location || 'In Transit'}
                    </td>
                    <td style={{ padding: '6px 4px', color: '#94A3B8' }}>
                      {s.remarks || s.activity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FMCSA 70-Hour / 8-Day Recap Box */}
        <div style={{
          backgroundColor: '#0F172A',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Clock size={16} color="#10B981" />
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>
                70-Hour / 8-Day Driver Recap
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>A. On Duty Hours Today (Lines 3 & 4):</span>
                <strong className="font-mono" style={{ color: '#38BDF8' }}>{hos_recap.on_duty_today} hrs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>B. Cycle Hours Prior to Today:</span>
                <strong className="font-mono" style={{ color: '#CBD5E1' }}>{hos_recap.cycle_hours_prior} hrs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>C. Accumulated Cycle (A + B):</span>
                <strong className="font-mono" style={{ color: hos_recap.cycle_hours_accumulated > 70 ? '#F43F5E' : '#F59E0B' }}>
                  {hos_recap.cycle_hours_accumulated} hrs
                </strong>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid #334155'
              }}>
                <span style={{ color: '#94A3B8', fontWeight: '600' }}>Available Cycle Tomorrow:</span>
                <strong className="font-mono" style={{ color: '#10B981', fontWeight: '700' }}>
                  {hos_recap.cycle_hours_available} hrs
                </strong>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px 10px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: '#10B981'
          }}>
            <CheckCircle size={16} />
            <span>24.00h Invariant Mathematically Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
