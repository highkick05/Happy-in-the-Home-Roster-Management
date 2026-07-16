// DO NOT MODIFY
import db from '../../db.js';
import { getGoogleRoutesDistance, getRecordCoordinates, formatCoords } from './mapUtils.js';

export const calculateHomeCareTravel = async (shift: any) => {
  try {
    if (shift.respite_booking_id) return { distance: 0, cost: 0, routeLogs: [] };
    const isHomeCare = (shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE');
    if (!isHomeCare) return { distance: 0, cost: 0, routeLogs: [] };

    // CHECK FIRST RULE: Ensure Home Care travel data is persisted and not recalculated if already present
    let hasComputedValue = false;
    let parsedLogs: any[] = [];
    if (shift.transport_route_log) {
      try {
        const tLog = JSON.parse(shift.transport_route_log);
        if (tLog && tLog.homeCareTravel) {
          hasComputedValue = true;
          if (tLog.homeCareTravel.legs) {
            parsedLogs = tLog.homeCareTravel.legs;
          }
        }
      } catch(e) {}
    }

    if (hasComputedValue && shift.home_care_travel_km !== null && shift.home_care_travel_km !== undefined) {
      console.log(`[DEBUG Home Care Travel] Using persisted value for shift ${shift.id}: ${shift.home_care_travel_km}km`);
      const dist = typeof shift.home_care_travel_km === 'string' ? parseFloat(shift.home_care_travel_km) : shift.home_care_travel_km;
      const cost = typeof shift.home_care_travel_total === 'string' ? parseFloat(shift.home_care_travel_total) : (shift.home_care_travel_total || dist);
      return { distance: dist, cost: cost, routeLogs: parsedLogs };
    }

    const client = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(shift.client_id) as any;
    const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Unknown Client';
    const clientCoords = await getRecordCoordinates('clients', shift.client_id, client?.address);

    // Find previous shift today for staff, of any type, to see the gap. Wait, the rule says "A sequence of Home Care shifts".
    const prevShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? AND start_time <= ? AND id != ? AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND (funding_type = 'HCP' OR funding_type = 'Home Care' OR funding_type = 'HOME_CARE')
      ORDER BY end_time DESC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.id) as any;

    let totalDist = 0;
    let totalMins = 0;
    let routeLogs: any[] = [];
    const rate = 1.00;

    if (!prevShift) {
      console.log(`[DEBUG Home Care Reset] Gap: Initial shift. Result: 0km`);
      routeLogs.push({ description: 'No billable provider travel for this shift (Private Commute)', distance: 0, waypoints: [], homeCareTravel: true });
    } else {
      const gapMins = (new Date(shift.start_time).getTime() - new Date(prevShift.end_time).getTime()) / 60000;
      
      if (gapMins <= 60 && gapMins >= 0) {
        const prevClientInfo = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(prevShift.client_id) as any;
        const prevClientCoords = await getRecordCoordinates('clients', prevShift.client_id, prevClientInfo?.address);
        const prevClientName = prevClientInfo ? `${prevClientInfo.first_name} ${prevClientInfo.last_name}`.trim() : 'Unknown Client';
        
        const { distance: dist, minutes: mins } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]); 
        totalDist += dist;
        totalMins += mins;
        console.log(`Home Care: [${prevClientName}] to [${clientName}] | Gap: ${gapMins}min | Result: ${dist}km | ${mins}mins`);
        
        const routeDesc = `${prevClientName} (${prevClientInfo?.address}) to ${clientName} (${client?.address})`;
        routeLogs.push({ description: routeDesc, distance: dist, durationMins: mins, waypoints: [prevClientCoords, clientCoords], addressStart: prevClientInfo?.address, addressEnd: client?.address, homeCareTravel: true });
      } else {
        console.log(`Home Care Reset: Gap of ${gapMins}min detected. Treating [${clientName}] as a new private commute.`);
        routeLogs.push({ description: 'No billable provider travel for this shift (Private Commute)', distance: 0, durationMins: 0, waypoints: [], homeCareTravel: true });
      }
    }

    // Persist the result to database
    const distToSave = Number(totalDist.toFixed(2));
    const minsToSave = Number(totalMins.toFixed(2));
    const costToSave = Number(totalDist.toFixed(2)) * rate;

    let currentLogObj: any = {};
    if (shift.transport_route_log) {
       try { currentLogObj = JSON.parse(shift.transport_route_log); } catch(e) {}
    }
    currentLogObj.homeCareTravel = {
        calculatedAt: new Date().toISOString(),
        distance: distToSave,
        minutes: minsToSave,
        cost: costToSave,
        legs: routeLogs
    };

    db.prepare(`
      UPDATE shifts 
      SET home_care_travel_km = ?, home_care_travel_total = ?, transport_route_log = ? 
      WHERE id = ?
    `).run(distToSave, costToSave, JSON.stringify(currentLogObj), shift.id);

    return { distance: distToSave, cost: costToSave, routeLogs };
  } catch (e) {
    console.error('[DEBUG Home Care Travel] Error calculating:', e);
    return { distance: 0, cost: 0, routeLogs: [] };
  }
};
