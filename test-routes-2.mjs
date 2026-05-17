import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

try {
  const envConfig = dotenv.parse(fs.readFileSync('.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (e) {}

const getGoogleRoutesDistance = async (waypoints) => {
    if (waypoints.length < 2) return 0;
    try {
      const toWaypointInfo = (wp) => {
        if (Array.isArray(wp)) {
          return { location: { latLng: { latitude: Number(wp[1]), longitude: Number(wp[0]) } } };
        }
        if (wp.placeId) {
          return { placeId: wp.placeId };
        }
        return null;
      };
      
      const validWaypoints = waypoints.map(toWaypointInfo).filter(Boolean);
      if (validWaypoints.length < 2) return 0;

      const payload = {
        origin: validWaypoints[0],
        destination: validWaypoints[validWaypoints.length - 1],
        travelMode: 'DRIVING'
      };

      if (validWaypoints.length > 2) {
        payload.intermediates = validWaypoints.slice(1, -1);
      }

      const apiKey = process.env.Maps_API_KEY || process.env.Maps_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.error(`[ERROR Routes API] Status: ${res.status}. Returning 0. Payload was:`, await res.text(), payload);
        return 0;
      }
      const data = await res.json();
      const dist = (data.routes?.[0]?.distanceMeters || 0) / 1000;
      return dist;
    } catch (e) {
      console.error('[CRITICAL Routes API] Failed. Returning 0 distance.', e);
      return 0;
    }
};

getGoogleRoutesDistance([[114.66, -28.76], [114.64, -28.72]]).then(d => console.log('dist', d)).catch(console.error);
