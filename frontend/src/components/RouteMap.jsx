import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bed, Fuel, Warehouse, Coffee, CheckCircle, Navigation } from 'lucide-react';

// Auto-fit bounds helper component
function MapBoundsUpdater({ coordinates, waypoints }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (waypoints && waypoints.length > 0) {
      const coords = waypoints.map(w => w.coordinates).filter(Boolean);
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [coordinates, waypoints, map]);

  return null;
}

// Custom Marker Icon Generator
function createCustomMarkerIcon(type, numberLabel) {
  let bgColor = '#06B6D4';
  let borderColor = '#FFFFFF';
  let symbol = 'T';

  if (type === 'pickup') {
    bgColor = '#06B6D4';
    symbol = 'P';
  } else if (type === 'dropoff') {
    bgColor = '#38BDF8';
    symbol = 'D';
  } else if (type === 'rest_break') {
    bgColor = '#10B981';
    symbol = '☕';
  } else if (type === 'sleeper_reset') {
    bgColor = '#10B981';
    symbol = '🛏';
  } else if (type === 'fuel_stop') {
    bgColor = '#F59E0B';
    symbol = '⛽';
  }

  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      background: ${bgColor};
      border: 2px solid ${borderColor};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px ${bgColor}, 0 4px 6px rgba(0,0,0,0.5);
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
    className: 'custom-leaflet-marker',
    html: html,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

export default function RouteMap({ routeData, summary }) {
  const defaultCenter = [39.8283, -98.5795]; // Center of USA
  const coordinates = routeData?.coordinates || [];
  const waypoints = routeData?.waypoints || [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
      <MapContainer
        center={defaultCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', backgroundColor: '#0b0f19' }}
      >
        {/* CartoDB Dark Matter Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Dynamic Bounds Auto-Fitter */}
        <MapBoundsUpdater coordinates={coordinates} waypoints={waypoints} />

        {/* Active Route Path: Neon Cyan Polyline with luminous styling */}
        {coordinates.length > 0 && (
          <>
            {/* Luminous Glow layer */}
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: '#06B6D4',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Crisp Core Path */}
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: '#22D3EE',
                weight: 4,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </>
        )}

        {/* Custom Waypoint Markers */}
        {waypoints.map((wp, idx) => {
          if (!wp.coordinates || wp.coordinates.length < 2) return null;
          const icon = createCustomMarkerIcon(wp.type, idx + 1);

          return (
            <Marker key={`wp-${idx}`} position={wp.coordinates} icon={icon}>
              <Popup>
                <div style={{ minWidth: '180px', padding: '4px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    color: wp.type === 'fuel_stop' ? '#F59E0B' : (wp.type.includes('rest') || wp.type.includes('sleeper') ? '#10B981' : '#06B6D4')
                  }}>
                    {wp.type.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', marginBottom: '6px' }}>
                    {wp.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div><strong>Mile Marker:</strong> {wp.mile_marker} mi</div>
                    <div><strong>Duration:</strong> {wp.duration_hours} hrs</div>
                    <div><strong>Action:</strong> {wp.action}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

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
          <div style={{ width: '14px', height: '4px', backgroundColor: '#06B6D4', borderRadius: '2px', boxShadow: '0 0 6px #06B6D4' }} />
          <span style={{ color: '#E2E8F0' }}>Active Truck Corridor (Interstate)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#06B6D4', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>Pickup & Drop-off Terminals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>Mandatory Rest (30m Break / 10h Sleeper)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#F59E0B', borderRadius: '50%', border: '1px solid #FFF' }} />
          <span style={{ color: '#E2E8F0' }}>1,000-Mile Fueling Station</span>
        </div>
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
    </div>
  );
}
