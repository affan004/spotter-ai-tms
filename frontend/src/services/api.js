/**
 * API client for communicating with Django HOS backend.
 */

// Clean dynamic URL: uses relative /api/hos in production (Vercel) and 127.0.0.1:8000 in local dev
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '';

const API_BASE_URL = isLocal ? 'http://127.0.0.1:8000/api/hos' : '/api/hos';


export async function calculateTrip(payload) {
  const response = await fetch(`${API_BASE_URL}/calculate-trip/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

export async function fetchSampleTrips() {
  const response = await fetch(`${API_BASE_URL}/sample-trips/`);
  if (!response.ok) {
    throw new Error(`Failed to load sample trips: ${response.status}`);
  }
  return response.json();
}
