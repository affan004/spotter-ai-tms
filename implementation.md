# Implementation Plan: FMCSA-Compliant Trucking Management System (TMS) & ELD Engine

## Executive Overview
This implementation plan outlines the architecture, mathematical simulation engine, API contracts, and user interface for an enterprise-grade Trucking Management System (TMS). The platform calculates multi-day commercial freight routes, enforces strict FMCSA Hours of Service (HOS) property-carrying driver regulations (49 CFR Part 395), automatically generates waypoints for mandatory rests, breaks, and fueling, and renders authentic digital 24-hour Electronic Logging Device (ELD) grid log sheets.

---

## 1. Architectural & Technology Blueprint

### 1.1 Technology Stack
- **Backend**: Python 3.14+ with Django 5.x & Django REST Framework (DRF), `django-cors-headers`.
- **Frontend**: React 18+ (Vite SPA), Tailwind CSS + Custom Vanilla CSS design tokens.
- **Mapping & Geospatial**: Leaflet + `react-leaflet` (Frontend map visualizer), CartoDB Dark Matter tile layer, OpenStreetMap Nominatim (Geocoding), Valhalla / OpenRouteService (HGV Truck Costing Profile with bridge clearance & vehicle dimensions) with OSRM & geodesic fallback.
- **Logbook Rendering**: Pure SVG vector rendering engine for high-dpi, print-ready 24-hour ELD log sheets.

### 1.2 Design System: "Neo-SaaS" Slate Dark Mode
Adhering to strict aesthetic guidelines:
- **Palette**:
  - Background Primary: Deep Slate Blue (`#0F172A` / `bg-slate-900`)
  - Content Cards & Grid Containers: Solid Dark Grey (`#1E293B` / `bg-slate-800`)
  - Borders & Dividers: Slate Border (`#334155` / `border-slate-700`)
  - Route Accent (Active Path): Neon Cyan (`#06B6D4` / `cyan-500`)
  - Rest / Safety Accents: Emerald Green (`#10B981` / `emerald-500`)
  - Fuel & Warning Accents: Amber (`#F59E0B` / `amber-500`)
  - Duty Status Visual Accents:
    - Line 1 (Off Duty): Cool Gray (`#94A3B8`)
    - Line 2 (Sleeper Berth): Indigo Violet (`#818CF8`)
    - Line 3 (Driving): Neon Cyan (`#06B6D4`)
    - Line 4 (On Duty ND): Emerald / Amber (`#F59E0B`)
- **Hybrid Glassmorphism Constraint**:
  - Glass treatment (`rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1)`) applied exclusively to:
    - Floating map control cards (zoom, layers, legend)
    - Waypoint hover popups / tooltips
    - Global application top bar
  - **Opaque High-Contrast Requirement**: Trip input parameters form and the 24-hour ELD log sheet panel remain 100% solid (`#1E293B` / `#0F172A`) for maximum contrast and audit compliance.
- **Typography**: Clean modern sans-serif (`Inter`, `system-ui`).

---

## 2. FMCSA Hours of Service (HOS) Engine Specification

### 2.1 Regulatory Rules (49 CFR §395.3 Property-Carrying Driver)
1. **11-Hour Driving Limit**: A driver may drive a maximum of 11.0 hours after 10 consecutive hours off duty/sleeper berth.
2. **14-Hour Driving Window**: A driver cannot drive beyond the 14th consecutive hour after coming on duty (following 10 consecutive hours off duty). Off-duty breaks do not pause this 14-hour clock.
3. **30-Minute Rest Break**: A driver must take at least 30 consecutive minutes of non-driving status (Off Duty - Line 1 or Sleeper - Line 2) before exceeding 8.0 cumulative hours of driving.
4. **Fueling Rule**: Must insert a 15-minute (0.25h) On-Duty Not Driving (Line 4) block for fueling every 1,000 miles.
5. **Loading / Unloading Terminals**:
   - Pickup (Origin): 1.0 hour On-Duty Not Driving (Line 4) at trip start.
   - Drop-off (Destination): 1.0 hour On-Duty Not Driving (Line 4) at trip end.
6. **10-Hour Consecutive Rest (Sleeper Berth - Line 2)**:
   - Triggered when cumulative driving in shift hits 11.0 hours OR elapsed shift window hits 14.0 hours.
   - Resets the 11-hour driving clock and the 14-hour driving window clock.
7. **70-Hour / 8-Day Cycle Limit**:
   - All driving (Line 3) and On-Duty Not Driving (Line 4) count towards the 70.0-hour limit.
   - If cumulative cycle hours reach 70.0h, a mandatory 34-hour consecutive Off Duty/Sleeper restart is inserted.

### 2.2 Simulation State Machine & Chronological Algorithm
The simulation engine runs a continuous-time queue:
```
State Variables:
  - t_current: DateTime (e.g., Day 1 06:00:00)
  - driving_in_shift: float (0.0 .. 11.0 hrs)
  - window_elapsed: float (0.0 .. 14.0 hrs)
  - driving_since_break: float (0.0 .. 8.0 hrs)
  - miles_since_fuel: float (0.0 .. 1000.0 miles)
  - cycle_hours_used: float (accumulates Line 3 + Line 4)
  - odometer_progress: float (0.0 .. total_trip_miles)
```

#### Step Simulation Sequence:
1. **Initial Status**: Day 1 from 00:00 to Start Time (e.g. 06:00) is logged as Off Duty (Line 1).
2. **Pickup Terminal**: Add 1.0 hour On-Duty Not Driving (Line 4) for loading.
   - `window_elapsed += 1.0`
   - `cycle_hours_used += 1.0`
3. **Driving Loop** (Until `odometer_progress == total_trip_miles`):
   - Determine remaining drive time available:
     `max_drive = min(11.0 - driving_in_shift, 14.0 - window_elapsed, 8.0 - driving_since_break, miles_to_next_fuel / 55.0, miles_to_dest / 55.0)`
   - If `max_drive <= 0`:
     - If `driving_in_shift >= 11.0` or `window_elapsed >= 14.0`:
       Insert 10.0-hour Sleeper Berth (Line 2). Reset shift clocks.
     - Else if `driving_since_break >= 8.0`:
       Insert 0.5-hour Off Duty (Line 1) break. Reset `driving_since_break = 0`.
       Note: `window_elapsed += 0.5` (does not pause 14h window).
     - Else if `miles_since_fuel >= 1000.0`:
       Insert 0.25-hour On-Duty ND (Line 4) fueling. Reset `miles_since_fuel = 0`.
       `window_elapsed += 0.25`, `cycle_hours_used += 0.25`.
   - If `max_drive > 0`:
     - Driver drives for `chunk_hours = max_drive`.
     - Distance covered = `chunk_hours * 55.0`.
     - Log driving event (Line 3).
     - Update all state variables.
4. **Drop-off Terminal**: Add 1.0 hour On-Duty Not Driving (Line 4) for unloading.
5. **Day Completion**: Final day is padded with Off Duty (Line 1) from final event to 24:00 (Midnight).

### 2.3 Strict 24-Hour Midnight Splitter
Real HOS log sheets must strictly represent a single 24-hour calendar day (`00:00` to `24:00`).
When a continuous segment crosses the `24:00` boundary (e.g., a 10-hour sleeper berth from 21:00 Day 1 to 07:00 Day 2):
- **Segment Part A**: Day 1 from `21:00` to `24:00` (`3.0` hours).
- **Segment Part B**: Day 2 from `00:00` to `07:00` (`7.0` hours).
- **Mathematical Invariant**:
  $$\sum (\text{Line 1} + \text{Line 2} + \text{Line 3} + \text{Line 4}) \equiv 24.0 \text{ hrs for every generated log page.}$$

### 2.4 Commercial Truck Routing Engine Architecture (Valhalla vs. OSRM vs. Leaflet & Bridge Clearances)

#### Why Leaflet is Not a Routing Engine
**Leaflet** is strictly a client-side visual mapping canvas (`leaflet.js` / `react-leaflet`). It downloads raster/vector map tiles (such as CartoDB Dark Matter) and renders SVG/Canvas overlays (polylines, markers, popups). Leaflet does not possess road network graphs, elevation models, or bridge clearance tables; it relies entirely on a backend routing engine to supply polyline coordinates and waypoint distances.

#### Routing Engines: Valhalla vs. OSRM
| Feature | Standard OSRM Demo | Valhalla / OpenRouteService (HGV) | Spotter.ai TMS Routing Strategy |
| :--- | :--- | :--- | :--- |
| **Primary Target** | Passenger Cars | Commercial Heavy Goods Vehicles (HGV) | **Hybrid Truck-Safe Engine** |
| **Truck Dimensions** | Ignored (Car profile) | Exact (Height: 13'6", Weight: 80k lbs, Length: 53') | Supported in API payload & routing models |
| **Low Bridge / Underpass** | Routes through low underpasses | Strictly penalizes & avoids bridges < clearance height | Dynamic avoidance via Valhalla/ORS + Interstate Priority |
| **HazMat / Axle Restrictions** | No | Yes | Flagged for commercial safety |
| **API Availability / Rate Limits** | Public free demo server | Requires API key / self-hosted instance | Resilient multi-tier fallback |

#### Production Routing Pipeline in `routing_service.py`:
1. **Truck Vehicle Parameters**:
   - Height: `13 ft 6 in` (4.11 meters) — standard legal US dry van / reefer height.
   - Gross Vehicle Weight: `80,000 lbs` (36.28 metric tons) — standard federal maximum without oversize permits.
   - Vehicle Width: `8 ft 6 in` (2.6 meters).
   - Trailer Length: `53 ft` (16.15 meters).
2. **Primary Tier: Valhalla / ORS Truck Routing Engine**:
   - Uses `costing: "truck"` with dimensional parameters to query OpenStreetMap clearance tags (`maxheight`, `maxweight`, `tunnel`, `bridge`).
   - Prevents infamous "can opener" bridge collisions (e.g., 11'8" bridges) by automatically routing trucks around low structures.
3. **Secondary Tier: OSRM National Network / Interstate Priority**:
   - Prioritizes US Interstate Highways (FHWA 23 CFR § 658), where federal design standards mandate a minimum vertical bridge clearance of 16 ft (rural) and 14 ft (urban), ensuring legal clearance for 13'6" trucks.
4. **Tertiary Tier: Deterministic Geodesic Great-Circle Interpolation**:
   - Ensures 100% test reliability and offline resilience if third-party web routing servers experience downtime.
5. **UI Truck Compliance Badge**:
   - Displays truck dimensions and bridge clearance verification on the dashboard header and map controls panel.

---

## 3. System Architecture & Component Design

```
+-----------------------------------------------------------------------------------------+
|                                    REACT FRONTEND                                       |
|                                                                                         |
|  +---------------------------+  +----------------------------------------------------+  |
|  |     TRIP INPUT PANEL      |  |                INTERACTIVE LEAFLET MAP             |  |
|  | - Current Location        |  | - CartoDB Dark Matter Tile Layer                   |  |
|  | - Pickup & Dropoff Locs   |  | - Neon Cyan Polyline Route                         |  |
|  | - Current Cycle Used (hrs)|  | - Custom Waypoint Markers:                         |  |
|  | - Speed (55 mph fixed)    |  |   * Pickup / Dropoff (Cyan Pins)                   |  |
|  | - Calculate Button        |  |   * 30-min Breaks & 10h Sleeper (Emerald Beds)     |  |
|  +-------------+-------------+  |   * 1,000-mi Fuel Stops (Amber Pumps)              |  |
|                |                +----------------------------------------------------+  |
|                v                                                                        |
|  +-----------------------------------------------------------------------------------+  |
|  |                       ELD 24-HOUR COMPLIANCE LOG SHEET                            |  |
|  |  +-----------------------------------------------------------------------------+  |  |
|  |  | [Day 1] [Day 2] [Day 3] ... (Pagination Tabs)                               |  |  |
|  |  +-----------------------------------------------------------------------------+  |  |
|  |  | Header: Date, Driver, Tractor #, Carrier, Home Terminal, From/To, Miles Today |  |  |
|  |  +-----------------------------------------------------------------------------+  |  |
|  |  | 24-Hour SVG Grid (4 Lines: Off Duty, Sleeper, Driving, On Duty ND)           |  |  |
|  |  | 15-minute tick marks | Vertical transitions | Active segments traced        |  |  |
|  |  +-----------------------------------------------------------------------------+  |  |
|  |  | Daily Totals Box (Line 1: Xh, Line 2: Yh, Line 3: Zh, Line 4: Wh = 24.0h)     |  |  |
|  |  | Remarks Table: Timestamp, Location, Duty Status, Odometer Miles               |  |  |
|  +-----------------------------------------------------------------------------------+  |
+--------------------------------------------^--------------------------------------------+
                                             | HTTP REST API
                                             v
+-----------------------------------------------------------------------------------------+
|                                    DJANGO BACKEND                                       |
|                                                                                         |
|  +----------------------------+  +------------------------+  +-----------------------+  |
|  |     HOS SIMULATION ENGINE  |  |   ROUTING & GEOCODING  |  |  MIDNIGHT SPLITTER    |  |
|  | - 11h Driving Limit        |  | - Nominatim Geocoding  |  | - 24.0-hr partitioning|  |
|  | - 14h Duty Window Limit    |  | - OSRM Route Geometry  |  | - Daily totals calc   |  |
|  | - 30-min Rest Break        |  | - Distance & Duration  |  | - 70h recap table     |  |
|  | - 1000-mile Fuel Stops     |  | - Waypoint coords      |  |                       |  |
|  | - 10h Sleeper Reset        |  |   interpolation        |  |                       |  |
|  +----------------------------+  +------------------------+  +-----------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Detailed Data Models & API Contracts

### 4.1 Request Payload: `POST /api/hos/calculate-trip/`
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Indianapolis, IN",
  "dropoff_location": "Dallas, TX",
  "current_cycle_used": 15.0,
  "avg_speed": 55.0,
  "start_time": "2026-09-25T06:00:00"
}
```

### 4.2 Response Payload: `POST /api/hos/calculate-trip/`
```json
{
  "summary": {
    "total_distance_miles": 1025.4,
    "total_driving_hours": 18.64,
    "total_trip_duration_hours": 30.89,
    "total_days": 2,
    "current_cycle_used": 15.0,
    "new_cycle_total": 35.64,
    "cycle_hours_remaining": 34.36
  },
  "route": {
    "coordinates": [[39.7684, -86.1581], ...],
    "waypoints": [
      {
        "type": "pickup",
        "name": "Indianapolis, IN Terminal",
        "coordinates": [39.7684, -86.1581],
        "mile_marker": 0,
        "timestamp": "2026-09-25T06:00:00",
        "duration_hours": 1.0,
        "action": "Loading Cargo (Line 4)"
      },
      {
        "type": "rest_break",
        "name": "30-Minute Mandatory Rest Stop",
        "coordinates": [37.2753, -89.5186],
        "mile_marker": 385.0,
        "timestamp": "2026-09-25T14:00:00",
        "duration_hours": 0.5,
        "action": "30-min Off Duty (Line 1)"
      },
      {
        "type": "sleeper_reset",
        "name": "10-Hour Mandatory Sleeper Berth",
        "coordinates": [36.1627, -86.7816],
        "mile_marker": 605.0,
        "timestamp": "2026-09-25T18:30:00",
        "duration_hours": 10.0,
        "action": "10-hour Sleeper Reset (Line 2)"
      },
      {
        "type": "fuel_stop",
        "name": "1,000-Mile Fueling Station",
        "coordinates": [33.5186, -94.0478],
        "mile_marker": 1000.0,
        "timestamp": "2026-09-26T12:00:00",
        "duration_hours": 0.25,
        "action": "15-min Fueling (Line 4)"
      },
      {
        "type": "dropoff",
        "name": "Dallas, TX Terminal",
        "coordinates": [32.7767, -96.7970],
        "mile_marker": 1025.4,
        "timestamp": "2026-09-26T12:45:00",
        "duration_hours": 1.0,
        "action": "Unloading Cargo (Line 4)"
      }
    ]
  },
  "days": [
    {
      "day_number": 1,
      "date": "2026-09-25",
      "daily_miles": 605.0,
      "totals": {
        "off_duty_hours": 6.5,
        "sleeper_hours": 5.5,
        "driving_hours": 11.0,
        "on_duty_nd_hours": 1.0,
        "total_accounted_hours": 24.0
      },
      "segments": [
        {
          "status": 1,
          "status_name": "Off Duty",
          "start_time": "00:00",
          "end_time": "06:00",
          "start_decimal": 0.0,
          "end_decimal": 6.0,
          "duration_hours": 6.0,
          "remarks": "Off Duty Prior to Shift",
          "location": "Indianapolis, IN"
        },
        {
          "status": 4,
          "status_name": "On Duty (Not Driving)",
          "start_time": "06:00",
          "end_time": "07:00",
          "start_decimal": 6.0,
          "end_decimal": 7.0,
          "duration_hours": 1.0,
          "remarks": "Pre-Trip Inspection & Loading",
          "location": "Indianapolis, IN"
        },
        {
          "status": 3,
          "status_name": "Driving",
          "start_time": "07:00",
          "end_time": "14:00",
          "start_decimal": 7.0,
          "end_decimal": 14.0,
          "duration_hours": 7.0,
          "remarks": "Driving Interstate En Route",
          "location": "In Transit"
        },
        {
          "status": 1,
          "status_name": "Off Duty",
          "start_time": "14:00",
          "end_time": "14:30",
          "start_decimal": 14.0,
          "end_decimal": 14.5,
          "duration_hours": 0.5,
          "remarks": "30-min Mandatory Rest Break",
          "location": "Rest Area, Mile 385"
        },
        {
          "status": 3,
          "status_name": "Driving",
          "start_time": "14:30",
          "end_time": "18:30",
          "start_decimal": 14.5,
          "end_decimal": 18.5,
          "duration_hours": 4.0,
          "remarks": "Driving Interstate En Route",
          "location": "In Transit"
        },
        {
          "status": 2,
          "status_name": "Sleeper Berth",
          "start_time": "18:30",
          "end_time": "24:00",
          "start_decimal": 18.5,
          "end_decimal": 24.0,
          "duration_hours": 5.5,
          "remarks": "10-hr Mandatory Rest (Part 1)",
          "location": "Truck Stop, Mile 605"
        }
      ]
    },
    {
      "day_number": 2,
      "date": "2026-09-26",
      "daily_miles": 420.4,
      "totals": {
        "off_duty_hours": 10.75,
        "sleeper_hours": 4.5,
        "driving_hours": 7.64,
        "on_duty_nd_hours": 1.11,
        "total_accounted_hours": 24.0
      },
      "segments": [
        {
          "status": 2,
          "status_name": "Sleeper Berth",
          "start_time": "00:00",
          "end_time": "04:30",
          "start_decimal": 0.0,
          "end_decimal": 4.5,
          "duration_hours": 4.5,
          "remarks": "10-hr Mandatory Rest (Part 2)",
          "location": "Truck Stop, Mile 605"
        },
        ...
      ]
    }
  ]
}
```

---

## 5. Frontend UI/UX & Component Engineering

### 5.1 Interactive Route Map (`RouteMap.jsx`)
- Built with `react-leaflet` and Leaflet 1.9+.
- Map Tiles: CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
- Active Path: Neon cyan polyline (`#06B6D4`, weight: 4, glow drop-shadow).
- Custom SVG Pulsing Markers:
  - Cyan Pin with warehouse icon: Pickup & Drop-off.
  - Emerald Green Pin with bed/shield icon: Mandatory 30-min breaks & 10-hr Sleeper resets.
  - Amber Pin with fuel dispenser icon: 1,000-mile Fuel Stops.
- Interactive popups with trip progress and time breakdown.
- Auto-fit bounds on route change.

### 5.2 ELD 24-Hour Compliance Grid Component (`EldLogSheet.jsx`)
Faithfully models the official FMCSA Form (as referenced in `blank-paper-log.png` and `fmsca-image.png`):
- **Log Header Block**:
  - Date, Driver Name / ID, Tractor/Trailer ID, Carrier Name, Main Office Address, Home Terminal.
  - Origin / Destination ("From: Indianapolis, IN To: Dallas, TX").
  - Total Miles Driving Today, Total Mileage Today.
- **24-Hour SVG Graph Grid**:
  - Horizontal Axis: 24 columns representing hours `0` through `24` (`Midnight`, `1`, `2`, ... `Noon`, ... `11`, `Midnight`).
  - Subdivisions: Quarter-hour (15-minute) tick marks, half-hour medium ticks, hourly vertical grid lines.
  - 4 Standard Duty Rows (Y-coordinates: Line 1 Off Duty = 30px, Line 2 Sleeper = 65px, Line 3 Driving = 100px, Line 4 On Duty ND = 135px).
  - Graph Path: A continuous vector step path (`M x1 y1 H x2 V y2 H x3 ...`) rendered with crisp SVG stroke and custom status color glow.
  - Hover Inspector: Interactive cursor showing exact time (e.g. `14:15`) and duty status.
- **Totals Column (Right Side)**:
  - Exact hours for Line 1, Line 2, Line 3, Line 4.
  - Total hours validation badge: Displays `24.0 Hours` (with green checkmark).
- **Remarks Section**:
  - Chronological timeline table directly beneath the grid noting every duty change, city/state, and activity description.
- **Recap Box**:
  - 70-Hour / 8-Day Rule summary: On-duty hours today, cycle used previously, total hours used, available hours remaining.

---

## 6. Directory Structure
```
d:/Affan Projects/Spotter.ai TMS/
│
├── implementation.md                      <-- This approved plan
├── TMS info/                             <-- Reference documents & assets
│   ├── blank-paper-log.png
│   ├── fmcsa-hos-395-drivers-guide...pdf
│   ├── fmsca-image.png
│   ├── helpfull Instructions.md
│   └── new-full-stack-dev-assessment.md
│
├── backend/                              <-- Django REST Framework Project
│   ├── manage.py
│   ├── requirements.txt
│   ├── tms_core/                         <-- Django Project Settings
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── hos_engine/                       <-- TMS / HOS Application
│       ├── __init__.py
│       ├── apps.py
│       ├── models.py                     <-- Trip & Log models (for audit persistence)
│       ├── urls.py
│       ├── views.py                      <-- API Viewsets
│       ├── serializers.py                <-- Validation & serializers
│       ├── services/
│       │   ├── __init__.py
│       │   ├── hos_simulator.py          <-- Core FMCSA simulation loop math
│       │   ├── midnight_splitter.py      <-- 24.0-hour day boundary partitioner
│       │   └── routing_service.py        <-- Nominatim + OSRM client with fallback
│       └── tests/
│           ├── __init__.py
│           ├── test_hos_rules.py         <-- Unit tests (11h, 14h, 30m break, fuel)
│           └── test_midnight_split.py    <-- Tests verifying 24.0h daily invariant
│
└── frontend/                             <-- React (Vite) Application
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx                       <-- Master Neo-SaaS Dashboard
    │   ├── index.css                     <-- Slate Dark Mode & Glassmorphism styles
    │   ├── components/
    │   │   ├── Header.jsx                <-- Glassmorphic top bar
    │   │   ├── TripForm.jsx              <-- Solid dark panel for trip inputs
    │   │   ├── RouteMap.jsx              <-- Leaflet CartoDB dark map + custom markers
    │   │   ├── EldLogSheet.jsx           <-- 24-Hour SVG compliance grid component
    │   │   ├── DayTabs.jsx               <-- Pagination for multi-day logs
    │   │   ├── TripSummaryCard.jsx       <-- HOS cycle, total miles, driving stats
    │   │   └── RemarksTimeline.jsx       <-- Chronological remarks list
    │   ├── services/
    │   │   └── api.js                    <-- Axios / Fetch client to backend
    │   └── assets/                       <-- Custom icons & markers
```

---

## 7. Execution Steps & Verification Plan

### Phase 1: Plan Submission & Approval (Current Step)
- Create `implementation.md` and present to user for feedback and approval.

### Phase 2: Backend Development (Django)
1. Initialize Django project `backend` with `tms_core` and `hos_engine`.
2. Implement `hos_simulator.py` covering:
   - 11-hour driving limit.
   - 14-hour on-duty window.
   - 30-minute rest break after 8 hours continuous driving.
   - 15-minute fueling stop every 1,000 miles.
   - 1-hour loading at start, 1-hour unloading at end.
   - 10-hour sleeper berth reset.
   - 70-hour cycle tracking.
3. Implement `midnight_splitter.py` to enforce the strict 24-hour daily boundary.
4. Implement `routing_service.py` to integrate Valhalla / OpenRouteService HGV Truck profile (with bridge clearance and dimensions) + OSRM Interstate priority + geodesic interpolation fallback for route points, miles, and waypoint locations.
5. Create DRF API endpoint `POST /api/hos/calculate-trip/` and write automated unit tests.
6. Verify backend tests pass (11h, 14h, 30m break, 1000mi fueling, 24.0h sum per day).

### Phase 3: Frontend Development (React + Leaflet + SVG)
1. Initialize Vite React project `frontend` with Tailwind CSS and Lucide icons.
2. Build the "Neo-SaaS" Slate Dark Mode theme with hybrid glassmorphism.
3. Implement `RouteMap.jsx` using `react-leaflet`, CartoDB Dark Matter tiles, Neon Cyan active path, and custom colored waypoint markers.
4. Implement `EldLogSheet.jsx` SVG grid component with 15-minute subdivisions, continuous duty paths, vertical transitions, daily totals box, remarks, and day tabs.
5. Wire up frontend `TripForm.jsx` to backend API with preset sample routes (e.g. Chicago -> Indianapolis -> Dallas, New York -> Los Angeles, etc.).
6. Test in browser for responsiveness, interactivity, and visual excellence.
