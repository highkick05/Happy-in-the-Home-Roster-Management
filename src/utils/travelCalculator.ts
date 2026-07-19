// DO NOT MODIFY
import db from '../../db.js';
import { getGoogleRoutesDistance, getRecordCoordinates, formatCoords } from './mapUtils.js';

export const calculateProviderTravel = async (shift: any) => {
  if (shift.respite_booking_id) return { distance: 0, cost: 0, routeLogs: [] };
  
  // Check if this is Home Care or NDIS
  const isHomeCare = (shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE');
  if (isHomeCare) {
    // HOME CARE LOGIC MOVED TO calculateHomeCareTravel
    return { distance: 0, cost: 0, routeLogs: [] };
  }

  const staff = db.prepare('SELECT address, first_name, last_name FROM users WHERE id = ?').get(shift.staff_id) as any;
  const client = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(shift.client_id) as any;
  
  const staffName = staff ? `${staff.first_name} ${staff.last_name}`.trim() : 'Unknown Staff';
  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Unknown Client';
  
  const staffHomeCoords = await getRecordCoordinates('users', shift.staff_id, staff?.address);
  const clientCoords = await getRecordCoordinates('clients', shift.client_id, client?.address);

  const staffHomeStr = `Staff Home (${staff?.address || 'Unknown'}) ${formatCoords(staffHomeCoords)}`;
  const clientHomeStr = `Client Home (${client?.address || 'Unknown'}) ${formatCoords(clientCoords)}`;

  try {
    // Find previous shift today for staff (Consecutive NDIS shifts)
    const prevShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? 
      AND DATETIME(start_time) <= DATETIME(?) 
      AND id != ? 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
      ORDER BY start_time DESC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.id) as any;

    // Find next shift today for staff
    const nextShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? 
      AND DATETIME(start_time) >= DATETIME(?) 
      AND id != ? 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
      ORDER BY start_time ASC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.id) as any;

    let totalDist = 0;
    let totalMins = 0;
    let routeLogs: any[] = [];

    // NDIS LOGIC
    // Incoming Trip
    const prevGapMins = prevShift ? Math.abs(new Date(shift.start_time).getTime() - new Date(prevShift.end_time).getTime()) / 60000 : Infinity;
    
    if (prevShift && prevGapMins <= 60) {
      console.log(`[NDIS Travel] Chaining detected: Using Previous Client Address for Start. Gap: ${prevGapMins.toFixed(0)} mins`);
      const prevClientInfo = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(prevShift.client_id) as any;
      const prevClientCoords = await getRecordCoordinates('clients', prevShift.client_id, prevClientInfo?.address);
      const prevClientStr = `Previous Client (${prevClientInfo?.address || 'Unknown'}) ${formatCoords(prevClientCoords)}`;
      
      const { distance, minutes } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]); 
      const apportionedDist = distance / 2;
      const apportionedMins = minutes / 2;
      
      totalDist += apportionedDist;
      totalMins += apportionedMins;
      routeLogs.push({ description: `(50% Apportionment) ${prevClientStr} to ${clientHomeStr}`, distance: apportionedDist, durationMins: apportionedMins, waypoints: [prevClientCoords, clientCoords], addressStart: prevClientInfo?.address, addressEnd: client?.address });
    } else {
      console.log(`[NDIS Travel] No incoming chaining (Gap: ${prevGapMins === Infinity ? 'N/A' : prevGapMins.toFixed(0)} mins). Using Staff Home.`);
      const { distance: distHome, minutes: minsHome } = await getGoogleRoutesDistance([staffHomeCoords, clientCoords]);
      totalDist += distHome;
      totalMins += minsHome;
      routeLogs.push({ description: `(100% Allocation) ${staffHomeStr} to ${clientHomeStr}`, distance: distHome, durationMins: minsHome, waypoints: [staffHomeCoords, clientCoords], addressStart: staff?.address, addressEnd: client?.address });
    }

    // Outgoing Trip
    const nextGapMins = nextShift ? Math.abs(new Date(nextShift.start_time).getTime() - new Date(shift.end_time).getTime()) / 60000 : Infinity;
    
    if (nextShift && nextGapMins <= 60) {
      console.log(`[NDIS Travel] Chaining detected: Next shift within 60 mins. Outgoing travel split 50/50. Gap: ${nextGapMins.toFixed(0)} mins`);
      const nextClientInfo = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(nextShift.client_id) as any;
      const nextClientCoords = await getRecordCoordinates('clients', nextShift.client_id, nextClientInfo?.address);
      const nextClientStr = `Next Client (${nextClientInfo?.address || 'Unknown'}) ${formatCoords(nextClientCoords)}`;
      
      const { distance, minutes } = await getGoogleRoutesDistance([clientCoords, nextClientCoords]);
      const apportionedDist = distance / 2;
      const apportionedMins = minutes / 2;

      totalDist += apportionedDist;
      totalMins += apportionedMins;
      routeLogs.push({ description: `(50% Apportionment) ${clientHomeStr} to ${nextClientStr}`, distance: apportionedDist, durationMins: apportionedMins, waypoints: [clientCoords, nextClientCoords], addressStart: client?.address, addressEnd: nextClientInfo?.address });
    } else {
      console.log(`[NDIS Travel] No chaining for end (Gap: ${nextGapMins === Infinity ? 'N/A' : nextGapMins.toFixed(0)} mins). Using Return to Staff Home.`);
      const { distance: distReturn, minutes: minsReturn } = await getGoogleRoutesDistance([clientCoords, staffHomeCoords]);
      totalDist += distReturn;
      totalMins += minsReturn;
      routeLogs.push({ description: `(100% Allocation) ${clientHomeStr} to Staff Home (Return trip)`, distance: distReturn, durationMins: minsReturn, waypoints: [clientCoords, staffHomeCoords], addressStart: client?.address, addressEnd: staff?.address });
    }

    // Enforce MMM6 Boundary Checks (Hard cap at 60 mins)
    let billableMins = totalMins;
    if (totalMins > 60) {
       console.log(`[NDIS Travel Cap] Capping travel time from ${totalMins.toFixed(2)} mins to 60.0 mins (MMM6 rules).`);
       routeLogs.push({ description: `(Capped) Actual travel time was ${totalMins.toFixed(2)} mins, but capped at 60 mins for MMM6 compliance.`, distance: 0, durationMins: 0, waypoints: [] });
       billableMins = 60;
    }

    return { distance: totalDist, minutes: billableMins, unCappedMinutes: totalMins, cost: totalDist * 1.00, routeLogs };
  } catch (e) {
    console.error('[NDIS Travel] Error calculating provider travel:', e);
    return { distance: 0, minutes: 0, unCappedMinutes: 0, cost: 0, routeLogs: [] };
  }
};
