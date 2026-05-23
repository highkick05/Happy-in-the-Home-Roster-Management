// DO NOT MODIFY
import db from '../db.js';

export const getGoogleRoutesDistance = async (waypoints: any[]) => {
  if (waypoints.length < 2) return { distance: 0, minutes: 0 };
  try {
    const toWaypointInfo = (wp: any) => {
      // Handle string formats like "[114.65, -28.73]" or "114.65, -28.73"
      let parsedWp = wp;
      if (typeof wp === 'string') {
        try {
           parsedWp = JSON.parse(wp);
        } catch(e) {
           const parts = wp.replace(/[\[\]\s]/g, '').split(',');
           if (parts.length >= 2) {
             parsedWp = [Number(parts[0]), Number(parts[1])];
           }
        }
      }

      if (Array.isArray(parsedWp) && parsedWp.length >= 2) {
        // Explicit mapping: index 1 is latitude (e.g. -28.xx), index 0 is longitude (e.g. 114.xx)
        return { 
          location: { 
            latLng: { 
              latitude: Number(parsedWp[1]), 
              longitude: Number(parsedWp[0]) 
            } 
          } 
        };
      }
      if (parsedWp && parsedWp.placeId) {
        return { placeId: parsedWp.placeId };
      }
      return null;
    };
    
    const validWaypoints = waypoints.map(toWaypointInfo).filter(Boolean);
    if (validWaypoints.length < 2) return { distance: 0, minutes: 0 };

    const payload: any = {
      origin: validWaypoints[0],
      destination: validWaypoints[validWaypoints.length - 1],
      travelMode: 'DRIVE'
    };

    if (validWaypoints.length > 2) {
      payload.intermediates = validWaypoints.slice(1, -1);
    }

    const apiKey = process.env.Maps_API_KEY || process.env.Maps_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
    if (!apiKey) {
      console.error('[CRITICAL Routes API] Missing Maps_API_KEY. Returning 0 distance.');
      return { distance: 0, minutes: 0 };
    }

    console.log(`[DEBUG Routes API] Requesting distance for ${validWaypoints.length} waypoints.`);
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error(`[ERROR Routes API] Status: ${res.status}. Returning 0. Payload was:`, await res.text());
      return { distance: 0, minutes: 0, legs: [] };
    }
    const data = await res.json();
    const route = data.routes?.[0];
    const dist = (route?.distanceMeters || 0) / 1000;
    let mins = 0;
    const durationStr = route?.duration;
    if (durationStr && durationStr.endsWith('s')) {
      mins = parseFloat(durationStr.replace('s', '')) / 60;
    }

    const legs = (route?.legs || []).map((leg: any) => {
      let legMins = 0;
      if (leg.duration && leg.duration.endsWith('s')) {
        legMins = parseFloat(leg.duration.replace('s', '')) / 60;
      }
      return {
        distance: (leg.distanceMeters || 0) / 1000,
        minutes: legMins
      };
    });

    console.log(`[DEBUG Routes API] Distance calculated: ${dist} km, Time: ${mins} mins, Legs: ${legs.length}`);
    return { distance: dist, minutes: mins, legs };
  } catch (e) {
    console.error('[CRITICAL Routes API] Failed. Returning 0 distance.', e);
    return { distance: 0, minutes: 0 };
  }
};

export const getRecordCoordinates = async (tableName: 'clients' | 'users', recordId: string | number, addressText?: string) => {
  if (addressText) addressText = addressText.trim();
  // Return mock coordinates if no address provided
  if (!addressText) {
    console.log(`[DEBUG Geocode] No address provided for ${tableName} ID ${recordId}. Returning mock coords.`);
    return tableName === 'users' ? [153.025, -27.48] : [153.01, -27.46];
  }

  try {
    const record = db.prepare(`SELECT latitude, longitude FROM ${tableName} WHERE id = ?`).get(recordId) as any;
    if (record && record.latitude && record.longitude) {
      console.log(`[DEBUG Geocode] Found existing coordinates for ${tableName} ID ${recordId}: [${record.longitude}, ${record.latitude}]`);
      return [record.longitude, record.latitude]; // [lon, lat] compatible with GoogleRoutes logic
    }

    // Geocode via Google Geocoding API
    const apiKey = process.env.Maps_API_KEY || process.env.Maps_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressText)}&key=${apiKey}`;
    console.log(`[DEBUG Geocode] Sending address string to Google API for ${tableName} ID ${recordId}: "${addressText}"`);
    
    let res;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts <= maxAttempts) {
      try {
        res = await fetch(geoUrl);
        if (res.ok) break;
        if (res.status >= 500 || res.status === 429) {
          attempts++;
          if (attempts <= maxAttempts) {
            console.log(`[DEBUG Geocode] Google Geocoding returned ${res.status}, retrying (${attempts}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        throw new Error(`Google Geocoding responded with status ${res.status}`);
      } catch (err) {
        attempts++;
        if (attempts <= maxAttempts) {
          console.log(`[DEBUG Geocode] Fetch error, retrying (${attempts}/${maxAttempts})...`, err);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw err;
      }
    }

    if (!res || !res.ok) {
      throw new Error(`Failed to fetch from Google Geocoding after ${attempts} attempts`);
    }

    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const coords = [location.lng, location.lat];
      console.log(`[DEBUG Geocode] Google returning coordinates for ${tableName} ID ${recordId}: [${coords[0]}, ${coords[1]}]`);
      db.prepare(`UPDATE ${tableName} SET longitude = ?, latitude = ? WHERE id = ?`).run(coords[0], coords[1], recordId);
      return coords;
    } else {
      console.log(`[DEBUG Geocode] Google API returned no features for address "${addressText}"`);
    }
  } catch (e) {
    console.warn(`[DEBUG Geocode] Geocoding failed for ${tableName} ${recordId}:`, e);
  }
  
  // Fallbacks
  console.log(`[DEBUG Geocode] Fallback mock coordinates returned for ${tableName} ID ${recordId}`);
  return tableName === 'users' ? [153.025, -27.48] : [153.01, -27.46];
};

export const formatCoords = (coords: any[]) => coords && coords.length === 2 ? `[${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}]` : '';
