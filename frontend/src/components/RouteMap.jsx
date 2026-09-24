import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

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
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

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
      const cartoUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`;

      L.tileLayer(cartoUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);


      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Route Polyline & Markers when routeData updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const coordinates = routeData?.coordinates || [];
    const waypoints = routeData?.waypoints || [];

    if (coordinates.length > 0) {
      // Glow polyline layer
      L.polyline(coordinates, {
        color: '#06B6D4',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Core crisp polyline layer
      L.polyline(coordinates, {
        color: '#22D3EE',
        weight: 4,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Fit map view to bounds
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    // Add Waypoint Markers
    waypoints.forEach((wp, idx) => {
      if (!wp.coordinates || wp.coordinates.length < 2) return;
      const icon = createCustomMarkerIcon(wp.type, idx + 1);
      const marker = L.marker(wp.coordinates, { icon });

      const popupColor = wp.type === 'fuel_stop' ? '#F59E0B' : (wp.type.includes('rest') || wp.type.includes('sleeper') ? '#10B981' : '#06B6D4');
      const popupHtml = `
        <div style="min-width: 180px; padding: 4px; font-family: 'Inter', sans-serif;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: ${popupColor};">
            ${wp.type.replace('_', ' ')}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #F8FAFC; margin-bottom: 6px;">
            ${wp.name}
          </div>
          <div style="font-size: 11px; color: #94A3B8; display: flex; flex-direction: column; gap: 3px;">
            <div><strong>Mile Marker:</strong> ${wp.mile_marker} mi</div>
            <div><strong>Duration:</strong> ${wp.duration_hours} hrs</div>
            <div><strong>Action:</strong> ${wp.action}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.addTo(layerGroup);
    });
  }, [routeData]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
      {/* Map DOM Element Container */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', backgroundColor: '#0b0f19' }}
      />

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
