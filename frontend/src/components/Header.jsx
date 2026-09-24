import React from 'react';
import { Truck, ShieldCheck, Navigation, AlertTriangle, Compass } from 'lucide-react';

export default function Header({ truckSpecs }) {
  return (
    <header className="glass-panel" style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
        }}>
          <Truck size={22} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: '#F8FAFC' }}>
              Spotter<span style={{ color: '#06B6D4' }}>.ai</span> TMS
            </h1>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: '#06B6D4',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              ELD Engine v2.4
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8' }}>
            Multi-Day Commercial HOS Compliance & 24-Hour Digital Log Generator
          </p>
        </div>
      </div>

      {/* Badges / Specs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Compliance Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10B981',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          <ShieldCheck size={16} />
          <span>FMCSA 49 CFR §395 Compliant</span>
        </div>

        {/* Truck Specs & Bridge Clearance Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#93C5FD',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          <Compass size={16} color="#60A5FA" />
          <span>Truck: 13'6" H | 80k lbs GVW (Interstate Clearance)</span>
        </div>
      </div>
    </header>
  );
}
