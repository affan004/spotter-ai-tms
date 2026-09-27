# 🎬 Spotter.ai TMS — 5-Minute Loom Video Walkthrough Script

> **Goal:** Follow this exact script while recording your 3–5 minute Loom walkthrough. It is timed so you can comfortably read through, demonstrate the live app and code, and cover every evaluation rubric to secure top assessment marks.
>
> 🌐 **Live App URL:** [https://spotter-ai-tms.vercel.app](https://spotter-ai-tms.vercel.app)  
> 💻 **Public GitHub Repo:** [https://github.com/affan004/spotter-ai-tms](https://github.com/affan004/spotter-ai-tms)

---

## ⏱️ Video Timing & Outline

| Time | Section | Screen Action |
| :--- | :--- | :--- |
| **0:00 - 0:45** | 1. Introduction & Overview | Live App Homepage |
| **0:45 - 1:45** | 2. Trip Planning & Simulation Demo | Run Route + "Simulate Trip" HUD |
| **1:45 - 2:45** | 3. 24-Hour Digital ELD Grid & Export | Inspect SVG Log Sheet + Day Tabs |
| **2:45 - 3:45** | 4. Code Architecture & Methodology | VS Code (`hos_simulator.py` & `midnight_splitter.py`) |
| **3:45 - 4:45** | 5. Truck Routing Engine & Turn-by-Turn | VS Code (`routing_service.py`) + UI Instructions |
| **4:45 - 5:00** | 6. Wrap Up & Test Suite | Terminal (`python manage.py test`) & Conclusion |

---

## 🎙️ Section-by-Section Walkthrough Script

---

### Part 1: Introduction & System Architecture (0:00 – 0:45)
**🖥️ On Screen:** Open your browser to [https://spotter-ai-tms.vercel.app](https://spotter-ai-tms.vercel.app). Show the clean dark-mode TMS interface.

**🗣️ What to Say:**
> *"Hello everyone! My name is Affan, and this is my submission for the Spotter.ai Transportation Management System assessment.*
>
> *I’ve built a full-stack, enterprise-grade FMCSA Hours of Service and automated Electronic Logging Device engine.*
>
> *The frontend is built in React using Vite, Leaflet with high-contrast CartoDB tiles, and an interactive SVG log grid. The backend is powered by Python and Django REST Framework, running a deterministic state machine that enforces strict property 49 CFR Part 395 regulations.*
>
> *Our system is live and hosted on Vercel at `spotter-ai-tms.vercel.app`, and the complete source code is publicly accessible on GitHub."*

---

### Part 2: Trip Planning, Deadhead Routing & Live Simulation (0:45 – 1:45)
**🖥️ On Screen:** In the form on the left, click the **"Midwest to Texas"** preset button (or type *Current: Indianapolis, IN*, *Pickup: Indianapolis, IN*, *Dropoff: Dallas, TX*, *Current Cycle: 14.5 hrs*). Click **"Generate Route & HOS Log"**. Then click the **"Simulate Trip"** button above the map.

**🗣️ What to Say:**
> *"Let's test a real commercial trip: Indianapolis, Indiana down to Dallas, Texas — roughly 900 miles with 14.5 hours of cycle already consumed.*
>
> *Notice our engine automatically supports deadhead repositioning: if a truck’s current location differs from the shipper pickup, it routes the deadhead leg separately, logs a 15-minute origin pre-trip inspection, and tracks loaded miles independently.*
>
> *When we click 'Generate Route', the backend computes the truck-compliant route, geocodes waypoints, and models every mandatory stop.*
>
> *If we hit 'Simulate Trip', our custom animated truck travels along the actual highway path. Notice our live floating HUD ticker at the top-left: it shows real-time duty status, simulated road speed at 55 miles per hour, odometer progression, and a live countdown to the next mandatory 30-minute break or 10-hour sleeper reset."*

---

### Part 3: The 24-Hour Digital ELD Log Sheet & Export (1:45 – 2:45)
**🖥️ On Screen:** Scroll down to the **"Electronic Logging Device (ELD) Daily Sheet"**. Hover over grid segments. Switch between **"Day 1"** and **"Day 2"** tabs. Highlight the official header and click **"Export All 2 Days Logbook (PDF)"** (or show the print preview dialog).

**🗣️ What to Say:**
> *"Now let's examine the centerpiece of this project: the daily 24-Hour ELD Log Sheet.*
>
> *Rather than a simple static table, we developed an SVG grid with 96 discrete 15-minute increments across 4 standardized duty lines: Line 1 Off Duty, Line 2 Sleeper Berth, Line 3 Driving, and Line 4 On Duty Not Driving.*
>
> *Notice our strict compliance with FMCSA rules:*
> 1. *The shift starts Day 1 with 1 hour of on-duty inspection and cargo loading.*
> 2. *After driving reaches 8 hours, our engine automatically forces a mandatory 30-minute off-duty meal break.*
> 3. *At the 11-hour driving limit and 14-hour duty window, it inserts a 10-hour sleeper berth reset.*
> 4. *Every 1,000 miles, a 15-minute fueling stop on Line 4 is scheduled.*
>
> *Most importantly, our Midnight Splitter guarantees the fundamental FMCSA invariant: exactly 24.0 hours are accounted for on every single calendar day.*
>
> *Selecting 'Day 2' seamlessly synchronizes the map polyline with the second day's log, and drivers or dispatchers can click 'Export Logbook' to print or generate an official audit-ready multi-day PDF with full DOT headers, co-driver fields, and 70-hour recap balances."*

---

### Part 4: Backend Architecture & HOS Simulation Methodology (2:45 – 3:45)
**🖥️ On Screen:** Switch to VS Code. Open `backend/hos_engine/services/hos_simulator.py` and `midnight_splitter.py`.

**🗣️ What to Say:**
> *"Let's take a look under the hood at the backend methodology in Django.*
>
> *In `hos_simulator.py`, we implemented a chronological state machine rather than heuristic approximations. We track running clocks for continuous driving, 14-hour shift duty windows, and the 70-hour / 8-day rolling cycle.*
>
> *The biggest technical challenge in trucking compliance is midnight boundary transitions. A 10-hour sleeper berth reset might start at 8:00 PM on Day 1 and finish at 6:00 AM on Day 2.*
>
> *In `midnight_splitter.py`, our algorithm slices continuous duty segments at exactly 00:00 midnight. It calculates exact fractional hour allocations, linearly interpolates start and end mile markers, and updates cumulative duty totals so both Day 1 and Day 2 balance to precisely 24.0 hours."*

---

### Part 5: Commercial Truck Routing Engine & Turn-by-Turn Instructions (3:45 – 4:45)
**🖥️ On Screen:** Open `backend/hos_engine/services/routing_service.py` in VS Code, then switch back to browser and expand the **"Turn-by-Turn Route Instructions"** accordion below the map.

**🗣️ What to Say:**
> *"For routing, we built `RoutingService.py` using OSRM and Valhalla commercial truck corridor profiles with geodesic Haversine fallbacks.*
>
> *Unlike standard car GPS, we enforce interstate commercial clearance checks for a 13-foot 6-inch height and an 80,000-pound Gross Vehicle Weight rating.*
>
> *On the frontend, our `RouteInstructions` component translates this data into step-by-step navigation instructions: highway names, distances, maneuver turn icons, and milestone tags identifying the Deadhead Repositioning vs Loaded Freight Transit legs."*

---

### Part 6: Automated Test Suite & Conclusion (4:45 – 5:00)
**🖥️ On Screen:** Open terminal in VS Code and run `python manage.py test`. Show all 9 tests passing (`OK`). Switch to the GitHub repo tab.

**🗣️ What to Say:**
> *"Quality and test coverage were top priorities. We built a comprehensive automated test suite covering the 11-hour driving cap, 14-hour shift window, 30-minute rest breaks, 70-hour cycle depletion, and 24.0-hour midnight partitioning. All 9 unit and integration tests pass with 100% accuracy.*
>
> *Both the live Vercel application and the GitHub repository are fully documented and ready for review. Thank you for your time, and I look forward to your feedback!"*

---

## 💡 Quick Tips for a Flawless Recording
1. **Resolution:** Record in 1080p full screen so the SVG grid lines and code are crisp.
2. **Hard Refresh:** Refresh `https://spotter-ai-tms.vercel.app` before starting to make sure you have the latest production bundle loaded.
3. **Pacing:** Keep a brisk, steady pace. Don't worry about reading every word verbatim — use the bold bullet points as your anchor points.
4. **Links in Description:** When submitting your Loom video, include:
   - **Live App:** `https://spotter-ai-tms.vercel.app`
   - **GitHub Repo:** `https://github.com/affan004/spotter-ai-tms`
   - **Tech Stack:** Django REST Framework + React + Leaflet + SVG ELD Engine
