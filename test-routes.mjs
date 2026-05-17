import fs from 'fs';
import dotenv from 'dotenv';

try {
  const envConfig = dotenv.parse(fs.readFileSync('.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (e) {}

const apiKey = process.env.Maps_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const payload = {
  origin: { location: { latLng: { latitude: -28.76, longitude: 114.66 } } },
  destination: { location: { latLng: { latitude: -28.72, longitude: 114.64 } } },
  travelMode: 'DRIVING'
};

fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'routes.distanceMeters'
  },
  body: JSON.stringify(payload)
})
.then(async r => {
  console.log(`Status: ${r.status}`);
  console.log(await r.text());
})
.catch(console.error);
