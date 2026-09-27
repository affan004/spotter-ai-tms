import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Play, Pause, RotateCcw, FastForward, Eye, Truck, Coffee, Moon, Fuel, MapPin, X } from 'lucide-react';

// Custom Marker Icon Generator
function createCustomMarkerIcon(type, numberLabel, isActiveDay = true) {
  let bgColor = '#06B6D4';
  let borderColor = '#FFFFFF';
  let symbol = 'T';
  let pulseClass = '';

  if (type === 'current') {
    bgColor = '#818CF8';
    symbol = 'O';
  } else if (type === 'pickup') {
    bgColor = '#06B6D4';
    symbol = 'P';
  } else if (type === 'dropoff') {
    bgColor = '#38BDF8';
    symbol = 'D';
  } else if (type === 'rest_break') {
    bgColor = '#10B981';
    symbol = '☕';
    pulseClass = 'animate-pulse';
  } else if (type === 'sleeper_reset') {
    bgColor = '#818CF8';
    symbol = '🛏';
    pulseClass = 'animate-pulse';
  } else if (type === 'fuel_stop') {
    bgColor = '#F59E0B';
    symbol = '⛽';
  }

  const opacity = isActiveDay ? '1' : '0.45';
  const scale = isActiveDay ? '1' : '0.85';

  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      background: ${bgColor};
      border: 2px solid ${borderColor};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) scale(${scale});
      opacity: ${opacity};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 ${isActiveDay ? '16px' : '4px'} ${bgColor}, 0 4px 6px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
    ">
      <div style="
        transform: rotate(45deg);
        color: #FFFFFF;
        font-size: 13px;
        font-weight: 800;
        font-family: 'Inter', sans-serif;
        text-shadow: 0 1px 2px rgba(0,0,0,0.6);
      ">
        ${symbol}
      </div>
    </div>
  `;

  return L.divIcon({
    className: `custom-leaflet-marker ${pulseClass}`,
    html: html,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

// Custom Truck Simulation Marker
function createTruckMarkerIcon() {
  const html = `
    <div style="
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px #06B6D4, 0 4px 12px rgba(0,0,0,0.7);
      transform: translate(-50%, -50%);
    ">
      <span style="font-size: 19px; line-height: 1;">🚛</span>
    </div>
  `;
  return L.divIcon({
    className: 'sim-truck-marker',
    html: html,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

export default function RouteMap({ routeData, summary, days, activeDayIndex = 0, onSelectDay }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const simLayerGroupRef = useRef(null);
  const truckMarkerRef = useRef(null);

  // Focus view mode: 'full' or 'day'
  const [viewFocus, setViewFocus] = useState('full');

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPlaying, setSimPlaying] = useState(false);
  const [simProgress, setSimProgress] = useState(0.0); // 0.0 to 1.0
  const [simSpeed, setSimSpeed] = useState(5); // 1x, 5x, 15x

  const totalDistance = summary?.total_distance_miles || 1000.0;
  const coordinates = routeData?.coordinates || [];
  const waypoints = routeData?.waypoints || [];
  const activeDay = days?.[activeDayIndex] || null;

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [39.8283, -98.5795],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // CartoDB Dark Matter authenticated tile layer
      const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_3wxe_1_a2dcc0f441c4ba4d83b419c2';
      const cartoUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`;

      L.tileLayer(cartoUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      const simLayerGroup = L.layerGroup().addTo(map);

      layerGroupRef.current = layerGroup;
      simLayerGroupRef.current = simLayerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Route Polyline & Markers when routeData, activeDayIndex, or viewFocus updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (coordinates.length > 0) {
      // 1. Base Full Route Polyline (Glow + Dim Path)
      L.polyline(coordinates, {
        color: '#164E63',
        weight: 6,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      L.polyline(coordinates, {
        color: '#0891B2',
        weight: 3,
        opacity: 0.65,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // 2. Active Day Leg Highlighting
      if (activeDay && totalDistance > 0) {
        const startFrac = Math.max(0, (activeDay.day_start_mile || 0) / totalDistance);
        const endFrac = Math.min(1, (activeDay.day_end_mile || totalDistance) / totalDistance);
        const startIdx = Math.floor(startFrac * (coordinates.length - 1));
        const endIdx = Math.ceil(endFrac * (coordinates.length - 1));
        const dayCoords = coordinates.slice(startIdx, Math.max(startIdx + 2, endIdx + 1));

        if (dayCoords.length >= 2) {
          // Glow Outer Polyline for Day
          L.polyline(dayCoords, {
            color: '#06B6D4',
            weight: 10,
            opacity: 0.4,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(layerGroup);

          // Vivid Crisp Neon Core for Day
          L.polyline(dayCoords, {
            color: '#22D3EE',
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(layerGroup);

          if (viewFocus === 'day') {
            const dayBounds = L.latLngBounds(dayCoords);
            map.fitBounds(dayBounds, { padding: [50, 50], maxZoom: 12 });
          }
        }
      }

      if (viewFocus === 'full') {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }

    // Add Waypoint Markers
    waypoints.forEach((wp, idx) => {
      if (!wp.coordinates || wp.coordinates.length < 2) return;

      const isForActiveDay = activeDay ? wp.day_number === activeDay.day_number : true;
      const icon = createCustomMarkerIcon(wp.type, idx + 1, isForActiveDay);
      const marker = L.marker(wp.coordinates, { icon });

      let popupColor = '#06B6D4';
      let titleLabel = wp.type.replace('_', ' ').toUpperCase();

      if (wp.type === 'fuel_stop') {
        popupColor = '#F59E0B';
        titleLabel = '1,000-MILE FUELING STOP';
      } else if (wp.type === 'rest_break') {
        popupColor = '#10B981';
        titleLabel = 'MANDATORY HOS REST STOP (30 MIN)';
      } else if (wp.type === 'sleeper_reset') {
        popupColor = '#818CF8';
        titleLabel = 'MANDATORY HOS SLEEPER BERTH (10 HR)';
      } else if (wp.type === 'current') {
        popupColor = '#818CF8';
        titleLabel = 'ORIGIN TERMINAL';
      } else if (wp.type === 'pickup') {
        popupColor = '#06B6D4';
        titleLabel = 'PICKUP TERMINAL';
      } else if (wp.type === 'dropoff') {
        popupColor = '#38BDF8';
        titleLabel = 'DESTINATION TERMINAL';
      }

      const popupHtml = `
        <div style="min-width: 200px; padding: 4px; font-family: 'Inter', sans-serif;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: ${popupColor};">
            ${titleLabel}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #F8FAFC; margin-bottom: 6px;">
            ${wp.name}
          </div>
          <div style="font-size: 11px; color: #94A3B8; display: flex; flex-direction: column; gap: 3px;">
            <div><strong>Scheduled Day:</strong> Day ${wp.day_number || 1}</div>
            <div><strong>Mile Marker:</strong> ${wp.mile_marker} mi</div>
            <div><strong>Duration:</strong> ${wp.duration_hours} hrs</div>
            <div><strong>Mandated Action:</strong> ${wp.action}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.addTo(layerGroup);
    });
  }, [routeData, activeDayIndex, viewFocus]);

  // Simulation Animation Loop
  useEffect(() => {
    let animTimer = null;

    if (isSimulating && simPlaying) {
      animTimer = setInterval(() => {
        setSimProgress((prev) => {
          const next = prev + 0.0008 * simSpeed;
          if (next >= 1.0) {
            setSimPlaying(false);
            return 1.0;
          }
          return next;
        });
      }, 50);
    }

    return () => {
      if (animTimer) clearInterval(animTimer);
    };
  }, [isSimulating, simPlaying, simSpeed]);

  // Update Animated Truck Marker position on Map
  useEffect(() => {
    const simGroup = simLayerGroupRef.current;
    if (!simGroup) return;

    if (!isSimulating || coordinates.length < 2) {
      simGroup.clearLayers();
      truckMarkerRef.current = null;
      return;
    }

    const N = coordinates.length;
    const k = Math.min(Math.floor(simProgress * (N - 1)), N - 2);
    const r = simProgress * (N - 1) - k;

    const lat = coordinates[k][0] + (coordinates[k + 1][0] - coordinates[k][0]) * r;
    const lng = coordinates[k][1] + (coordinates[k + 1][1] - coordinates[k][1]) * r;

    if (!truckMarkerRef.current) {
      const icon = createTruckMarkerIcon();
      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(simGroup);
      truckMarkerRef.current = marker;
    } else {
      truckMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [isSimulating, simProgress, coordinates]);

  // Compute live telemetry for simulation ticker
  const currentSimMile = Math.min(totalDistance, roundVal(simProgress * totalDistance, 1));
  const simPercent = Math.round(simProgress * 100);

  // Find next stop and current duty status
  const nextStop = waypoints.find((w) => w.mile_marker > currentSimMile) || waypoints[waypoints.length - 1];
  const distToNextStop = nextStop ? Math.max(0, roundVal(nextStop.mile_marker - currentSimMile, 1)) : 0;
  const timeToNextStop = roundVal(distToNextStop / 55.0, 1);

  // Current duty status
  let currentDutyText = 'Line 3: Interstate Driving (55 MPH)';
  let dutyBadgeColor = '#06B6D4';

  if (currentSimMile === 0) {
    currentDutyText = 'Line 4: Pre-Trip Inspection & Loading';
    dutyBadgeColor = '#F59E0B';
  } else if (currentSimMile >= totalDistance) {
    currentDutyText = 'Line 4: Cargo Unloading & Post-Trip DVIR';
    dutyBadgeColor = '#38BDF8';
  } else if (nextStop && distToNextStop < 1.0) {
    if (nextStop.type === 'rest_break') {
      currentDutyText = 'Line 1: 30-Minute Mandatory Rest Break';
      dutyBadgeColor = '#10B981';
    } else if (nextStop.type === 'sleeper_reset') {
      currentDutyText = 'Line 2: 10-Hour Sleeper Berth Reset';
      dutyBadgeColor = '#818CF8';
    } else if (nextStop.type === 'fuel_stop') {
      currentDutyText = 'Line 4: 1,000-Mile Vehicle Fueling';
      dutyBadgeColor = '#F59E0B';
    }
  }

  function roundVal(v, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(v * factor) / factor;
  }

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setSimPlaying(true);
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setSimPlaying(false);
    setSimProgress(0.0);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '540px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
      {/* Map DOM Element Container */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', backgroundColor: '#0b0f19' }}
      />

      {/* Floating Top Control Overlay: View Toggle & Simulation Launcher */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Day Leg vs Full Route Toggle */}
        <div className="glass-panel" style={{
          display: 'flex',
          padding: '3px',
          borderRadius: '8px'
        }}>
          <button
            type="button"
            onClick={() => setViewFocus('full')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewFocus === 'full' ? '#06B6D4' : 'transparent',
              color: viewFocus === 'full' ? '#0F172A' : '#94A3B8',
              transition: 'all 0.15s ease'
            }}
          >
            Full Route View
          </button>
          <button
            type="button"
            onClick={() => setViewFocus('day')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewFocus === 'day' ? '#06B6D4' : 'transparent',
              color: viewFocus === 'day' ? '#0F172A' : '#94A3B8',
              transition: 'all 0.15s ease'
            }}
          >
            Day {activeDay?.day_number || 1} Leg Focus
          </button>
        </div>

        {/* Simulate Trip Button */}
        {!isSimulating ? (
          <button
            type="button"
            onClick={handleStartSimulation}
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              color: '#38BDF8',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.25)'
            }}
          >
            <Play size={14} fill="#38BDF8" />
            <span>Simulate Trip Animation</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopSimulation}
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#F43F5E',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              backgroundColor: 'rgba(244, 63, 94, 0.15)'
            }}
          >
            <X size={14} />
            <span>Exit Simulation</span>
          </button>
        )}
      </div>

      {/* Floating Top Right Badge: Routing Engine Status */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        padding: '8px 12px',
        borderRadius: '6px',
        zIndex: 500,
        fontSize: '11px',
        color: '#94A3B8',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Navigation size={14} color="#06B6D4" />
        <span>Engine: <strong style={{ color: '#38BDF8' }}>{routeData?.routing_engine || 'OSRM Interstate Highway Corridor'}</strong></span>
      </div>

      {/* Live Simulation Telemetry HUD Overlay */}
      {isSimulating && (
        <div className="glass-panel" style={{
          position: 'absolute',
          top: '64px',
          left: '16px',
          right: '16px',
          padding: '14px 18px',
          borderRadius: '10px',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8'
              }}>
                <Truck size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: `${dutyBadgeColor}22`,
                    color: dutyBadgeColor,
                    border: `1px solid ${dutyBadgeColor}55`
                  }}>
                    {currentDutyText}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Odometer: <strong style={{ color: '#F8FAFC' }}>{currentSimMile} mi</strong> / {totalDistance} mi ({simPercent}%)
                  </span>
                </div>
                {nextStop && (
                  <p style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '3px' }}>
                    Upcoming: <strong style={{ color: '#F59E0B' }}>{nextStop.name}</strong> in {distToNextStop} mi (~{timeToNextStop} hrs)
                  </p>
                )}
              </div>
            </div>

            {/* Right Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => setSimPlaying(!simPlaying)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: simPlaying ? '#F59E0B' : '#10B981',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {simPlaying ? <Pause size={13} fill="#0F172A" /> : <Play size={13} fill="#0F172A" />}
                <span>{simPlaying ? 'Pause' : 'Resume'}</span>
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={() => { setSimProgress(0); setSimPlaying(true); }}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#94A3B8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>

              {/* Speed Multipliers */}
              <div style={{
                display: 'flex',
                backgroundColor: '#0F172A',
                borderRadius: '6px',
                border: '1px solid #334155',
                padding: '2px'
              }}>
                {[1, 5, 15].map((spd) => (
                  <button
                    key={`speed-${spd}`}
                    type="button"
                    onClick={() => setSimSpeed(spd)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: '700',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: simSpeed === spd ? '#06B6D4' : 'transparent',
                      color: simSpeed === spd ? '#0F172A' : '#94A3B8'
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#0F172A',
            borderRadius: '3px',
            overflow: 'hidden',
            border: '1px solid #334155'
          }}>
            <div style={{
              width: `${simPercent}%`,
              height: '100%',
              backgroundColor: '#06B6D4',
              borderRadius: '3px',
              transition: 'width 0.1s linear',
              boxShadow: '0 0 10px #06B6D4'
            }} />
          </div>
        </div>
      )}

      {/* Floating Glassmorphic Legend Overlay */}
      <div className="glass-panel" style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        padding: '12px 16px',
        borderRadius: '8px',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'auto',
        fontSize: '11px'
      }}>
        <div style={{ fontWeight: '700', color: '#F8FAFC', letterSpacing: '0.3px', marginBottom: '2px' }}>
          Interactive Route Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '14px', height: '4px', backgroundColor: '#22D3EE', borderRadius: '2px', boxShadow: '0 0 8px #06B6D4' }} />
          <span style={{ color: '#E2E8F0' }}>Active Day {activeDay?.day_number || 1} Corridor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#06B6D4', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>Pickup & Drop-off Terminals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>Mandatory HOS Rest Stop (30-min break)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#818CF8', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>Mandatory Sleeper Berth (10-hr reset)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#F59E0B', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>1,000-Mile Fueling Station</span>
        </div>
      </div>
    </div>
  );
}
