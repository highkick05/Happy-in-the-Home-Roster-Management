// DO NOT MODIFY. Core business logic for ABT calculations. Changes here require full QA testing.
import db from '../../db.js';
import { getGoogleRoutesDistance, getRecordCoordinates, formatCoords } from './mapUtils.js';

export const calculateAbtTravel = async (shift: any, abtCoordinates: any[]) => {
  if (shift.respite_booking_id || shift.funding_type !== 'NDIS') {
    return { distance: 0, cost: 0, routeLogs: [] };
  }

  let resolvedAbtCoordinates: any[] = [];
  let abtAddresses: string[] = [];

  if (Array.isArray(abtCoordinates) && abtCoordinates.length > 0) {
    const client = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(shift.client_id) as any;
    const clientAddress = client?.address || 'Unknown';
    const clientCoords = await getRecordCoordinates('clients', shift.client_id, client?.address);

    if (clientCoords) {
      resolvedAbtCoordinates.push(clientCoords);
      abtAddresses.push(`Client Home (${clientAddress}) ${formatCoords(clientCoords)}`);
    }

    for (const coord of abtCoordinates) {
      if (coord === 'CLIENT_HOME') continue; 
      if (coord && typeof coord === 'object' && coord.address) {
        if (coord.placeId) {
          resolvedAbtCoordinates.push({ placeId: coord.placeId });
          abtAddresses.push(`Community (${coord.address})`);
        } else if (coord.coords) {
          resolvedAbtCoordinates.push(coord.coords);
          abtAddresses.push(`Community (${coord.address}) ${formatCoords(coord.coords)}`);
        }
      }
    }

    const lastAddedCoord = resolvedAbtCoordinates[resolvedAbtCoordinates.length - 1];
    const isLastWaypointClientHome = clientCoords && lastAddedCoord 
        && Array.isArray(lastAddedCoord)
        && Math.abs(clientCoords[0] - lastAddedCoord[0]) < 0.0001 
        && Math.abs(clientCoords[1] - lastAddedCoord[1]) < 0.0001;

    if (clientCoords && !isLastWaypointClientHome && abtCoordinates[abtCoordinates.length - 1] === 'CLIENT_HOME') {
        resolvedAbtCoordinates.push(clientCoords);
        abtAddresses.push(`Client Home (${clientAddress}) ${formatCoords(clientCoords)}`);
    }
  }

  if (resolvedAbtCoordinates.length >= 2) {
    const { distance, minutes, legs } = await getGoogleRoutesDistance(resolvedAbtCoordinates);
    const cost = distance * 1.00; // $1.00/km Ledger Split
    
    const routeLegs = (legs || []).map((leg: any, idx: number) => {
      const fromAddr = abtAddresses[idx] || 'Point A';
      const toAddr = abtAddresses[idx+1] || 'Point B';
      return {
        description: `${fromAddr} → ${toAddr}`,
        distance: leg.distance,
        durationMins: leg.minutes
      };
    });

    return { 
      distance, 
      cost, 
      minutes,
      routeLogs: {
        description: `Transport during shift (Total: ${distance.toFixed(2)} km)`,
        waypoints: resolvedAbtCoordinates, 
        legs: routeLegs
      }
    };
  }

  return { distance: 0, cost: 0, routeLogs: [] };
};
