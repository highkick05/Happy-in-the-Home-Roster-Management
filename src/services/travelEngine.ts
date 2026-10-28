import db from '../../db.js';
import { getGoogleRoutesDistance, getRecordCoordinates } from '../utils/mapUtils.js';
import { calculateProviderTravel } from '../utils/travelCalculator.js';

const hasNdisProviderTravelService = (shiftRow: any): boolean => {
  try {
    const servicesData = shiftRow.services_json ? JSON.parse(shiftRow.services_json) : [];
    if (Array.isArray(servicesData) && servicesData.length > 0) {
      for (const sData of servicesData) {
        let nameLower = String(sData.serviceName || sData.customName || sData.name || '').toLowerCase();
        let codeLower = String(sData.serviceCode || '').toLowerCase();
        if (!nameLower && sData.serviceId) {
          const srv = db.prepare('SELECT name, code FROM services WHERE id = ?').get(sData.serviceId) as any;
          if (srv) {
            nameLower = String(srv.name || '').toLowerCase();
            codeLower = String(srv.code || '').toLowerCase();
          }
        }
        if (nameLower.includes('provider travel') || nameLower.includes('travel - provider') || codeLower.includes('provider travel')) {
          return true;
        }
      }
      return false;
    }
    if (shiftRow.service_id) {
      const srv = db.prepare('SELECT name, code FROM services WHERE id = ?').get(shiftRow.service_id) as any;
      if (srv) {
        const nameLower = String(srv.name || '').toLowerCase();
        const codeLower = String(srv.code || '').toLowerCase();
        return nameLower.includes('provider travel') || nameLower.includes('travel - provider') || codeLower.includes('provider travel');
      }
    }
  } catch (e) {}
  return false;
};

export const recalculateDayTravelForStaff = async (staffId: number, dateStr: string) => {
  try {
    console.log(`[DEBUG CASCADE] INIT recalculateDayTravelForStaff staffId: ${staffId}, dateStr: ${dateStr}`);
    const startTimeRangeStart = new Date(new Date(dateStr).getTime() - 14 * 3600 * 1000).toISOString();
    const startTimeRangeEnd = new Date(new Date(dateStr).getTime() + 14 * 3600 * 1000).toISOString();

    const shifts = db.prepare(`
      SELECT s.*, 
             c.address as client_address
      FROM shifts s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.staff_id = ? AND s.start_time >= ? AND s.start_time <= ? AND (s.status NOT IN ('CANCELLED', 'DELETED', 'deleted') OR (s.status = 'CANCELLED' AND COALESCE(s.cancelled_pay_hours, 0) > 0))
      ORDER BY s.start_time ASC
    `).all(staffId, startTimeRangeStart, startTimeRangeEnd) as any[];

    console.log(`[DEBUG CASCADE] DB found ${shifts ? shifts.length : 0} shifts from ${startTimeRangeStart} to ${startTimeRangeEnd}`);
    if (!shifts || shifts.length === 0) return;

    const staffInfo = db.prepare('SELECT address FROM users WHERE id = ?').get(staffId) as any;
    let rawStaffHomeCoords = await getRecordCoordinates('users', staffId, staffInfo?.address);
    const staffHomeCoords = rawStaffHomeCoords ? [Number(rawStaffHomeCoords[0]), Number(rawStaffHomeCoords[1])] : [0,0];

    for (let i = 0; i < shifts.length; i++) {
      const currentShift = shifts[i];



      
      const isHomeCare = (currentShift.funding_type === 'HCP' || currentShift.funding_type === 'Home Care' || currentShift.funding_type === 'HOME_CARE');
      
      let rawCurrentShiftCoords = await getRecordCoordinates('clients', currentShift.client_id, currentShift.client_address);
      const currentShiftCoords = rawCurrentShiftCoords ? [Number(rawCurrentShiftCoords[0]), Number(rawCurrentShiftCoords[1])] : [0,0];

      const prevShift = shifts[i - 1] || null;
      const currentStart = new Date(currentShift.start_time).getTime();
      const prevEnd = prevShift ? new Date(prevShift.end_time).getTime() : 0;
      const gapToPrev = prevShift ? Math.abs((currentStart - prevEnd) / (1000 * 60)) : Infinity;

      console.log(`[DEBUG CASCADE] Shift ${currentShift.id}: prevShiftID? ${prevShift?.id}, gapToPrev: ${gapToPrev.toFixed(1)} mins, isHomeCare: ${isHomeCare}`);

      if (!isHomeCare && currentShift.is_historical === 1) {
         console.log(`[DEBUG CASCADE] Skipping recalculation for historical NDIS shift ${currentShift.id}`);
         continue;
      }
      if (isHomeCare) {
         const nextShift = shifts[i + 1] || null;

         let prevCoords = null;
         if (prevShift && prevShift.is_historical !== 1) {
            const prevAddress = db.prepare('SELECT address FROM clients WHERE id = ?').get(prevShift.client_id) as any;
            let rawPrevCoords = await getRecordCoordinates('clients', prevShift.client_id, prevAddress?.address);
            prevCoords = rawPrevCoords ? [Number(rawPrevCoords[0]), Number(rawPrevCoords[1])] : [0,0];
         }

         const currentEnd = new Date(currentShift.end_time).getTime();
         const nextStart = nextShift ? new Date(nextShift.start_time).getTime() : 0;

         const gapToNext = nextShift ? Math.abs((nextStart - currentEnd) / (1000 * 60)) : Infinity;

         let totalDistance = 0;
         let totalTravelMinutes = 0;
         let travelBreakdown: string[] = [];

         // RULE 2: FIRST SHIFT
         if (!prevShift || gapToPrev === Infinity || gapToPrev > 60) {
             totalDistance = 0;
             totalTravelMinutes = 0;
             travelBreakdown.push(`[Ignored Commute]: Home -> First Client (0km)`);
         } else {
             // RULE 3: INTER-CLIENT TRANSITION
             const res = await getGoogleRoutesDistance([prevCoords, currentShiftCoords]);
             totalDistance = res.distance;
             totalTravelMinutes = res.minutes;
             travelBreakdown.push(`[100% Inter-Client]: Prev Client to Current = ${res.distance.toFixed(2)} km (${res.minutes.toFixed(0)} mins)`);
         }

         // RULE 4: LAST SHIFT OF THE DAY
         if (!nextShift || gapToNext === Infinity) {
             // We explicitly ensure that the Client A -> Home route details are NOT computed nor saved.
             // The provider_travel_km and provider_travel_minutes for the return home leg are 0.
             travelBreakdown.push(`[Ignored Return Commute]: Client -> Home (0km)`);
         }

         // ALSO update transport_route_log with homeCareTravel
         let currentLogObj: any = {};
         if (currentShift.transport_route_log) {
             try { currentLogObj = JSON.parse(currentShift.transport_route_log); } catch(e) {}
         }
         let routeLogs: any[] = [];
         if (totalDistance > 0) {
            const prevClientInfo = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(prevShift.client_id) as any;
            const currentClientInfo = db.prepare('SELECT address, first_name, last_name FROM clients WHERE id = ?').get(currentShift.client_id) as any;
            const prevName = prevClientInfo ? `${prevClientInfo.first_name} ${prevClientInfo.last_name}`.trim() : 'Unknown';
            const currName = currentClientInfo ? `${currentClientInfo.first_name} ${currentClientInfo.last_name}`.trim() : 'Unknown';
            routeLogs.push({ description: `${prevName} (${prevClientInfo?.address}) to ${currName} (${currentClientInfo?.address})`, distance: totalDistance, durationMins: totalTravelMinutes, waypoints: [prevCoords, currentShiftCoords], addressStart: prevClientInfo?.address, addressEnd: currentClientInfo?.address, homeCareTravel: true });
         } else {
            routeLogs.push({ description: 'No billable provider travel for this shift (Private Commute)', distance: 0, durationMins: 0, waypoints: [], homeCareTravel: true });
         }
         currentLogObj.homeCareTravel = {
             calculatedAt: new Date().toISOString(),
             distance: totalDistance,
             minutes: parseFloat(totalTravelMinutes.toFixed(2)),
             cost: totalDistance,
             legs: routeLogs
         };

         db.prepare('UPDATE shifts SET provider_travel_km = ?, provider_travel_minutes = ?, home_care_travel_km = ?, home_care_travel_total = ?, travel_breakdown = ?, transport_route_log = ? WHERE id = ?').run(
            totalDistance, parseFloat(totalTravelMinutes.toFixed(2)), totalDistance, totalDistance, JSON.stringify(travelBreakdown), JSON.stringify(currentLogObj), currentShift.id
         );
      } else {
         const prevShift = shifts[i - 1] || null;
         const nextShift = shifts[i + 1] || null;

         let prevCoords = null;
         if (prevShift && prevShift.is_historical !== 1) {
            const prevAddress = db.prepare('SELECT address FROM clients WHERE id = ?').get(prevShift.client_id) as any;
            let rawPrevCoords = await getRecordCoordinates('clients', prevShift.client_id, prevAddress?.address);
            prevCoords = rawPrevCoords ? [Number(rawPrevCoords[0]), Number(rawPrevCoords[1])] : [0,0];
         }

         // NDIS CASCADE LOGIC
         console.log(`[DEBUG CASCADE] NDIS recalculating provider travel for shift ${currentShift.id}`);
         const hasCurrentPT = hasNdisProviderTravelService(currentShift);
         const pTravel = hasCurrentPT
           ? await calculateProviderTravel(currentShift)
           : { distance: 0, minutes: 0, cost: 0, routeLogs: [] };

         let combinedRouteLog: any = null;
         if (currentShift.transport_route_log) {
             try { combinedRouteLog = JSON.parse(currentShift.transport_route_log); } catch(e){}
         }
         combinedRouteLog = combinedRouteLog || {};
         if (hasCurrentPT) {
           combinedRouteLog.providerTravel = {
               calculatedAt: new Date().toISOString(),
               distance: pTravel.distance,
               minutes: pTravel.minutes,
               cost: pTravel.cost,
               legs: pTravel.routeLogs
           };
         } else {
           delete combinedRouteLog.providerTravel;
         }
         const transportRouteLogStr = Object.keys(combinedRouteLog).length > 0 ? JSON.stringify(combinedRouteLog) : null;

         const travelBreakdown = hasCurrentPT ? (pTravel.routeLogs || []).map((log: any) => log.description) : [];

         // Update services_json so the UI reflects the math
         const latestShift = db.prepare('SELECT services_json FROM shifts WHERE id = ?').get(currentShift.id) as any;
         let servicesData: any[] = [];
         if (latestShift && latestShift.services_json) {
             try { 
                 servicesData = JSON.parse(latestShift.services_json); 
             } catch(e) {
                 console.error('[DEBUG CASCADE] NDIS JSON parse error:', e);
             }
             for (const sData of servicesData) {
                 let service = db.prepare('SELECT id, name, unit, status, code, type FROM services WHERE id = ?').get(sData.serviceId) as any;
                 if (service && service.status === 'ARCHIVED') {
                     const activeSrv = db.prepare("SELECT id, name, unit, status, code, type FROM services WHERE code = ? AND type = ? AND (status IS NULL OR status != 'ARCHIVED') ORDER BY id DESC LIMIT 1").get(service.code, service.type) as any;
                     if (activeSrv) {
                         service = activeSrv;
                         sData.serviceId = activeSrv.id;
                     }
                 }
                 if (service && service.name && service.name.toLowerCase().includes('provider travel')) {
                     if (pTravel.distance > 0 || !(currentShift.status === 'CANCELLED' && Number(currentShift.cancelled_pay_hours) > 0 && Number(currentShift.provider_travel_km) > 0)) {
                       sData.qtyOverride = parseFloat(pTravel.distance.toFixed(2));
                     }
                 }
             }
         }

         console.log(`[DEBUG CASCADE] NDIS writing totalDistance: ${pTravel.distance} to shift ${currentShift.id}.`);
         const preserveCancelledPT = currentShift.status === 'CANCELLED' && Number(currentShift.cancelled_pay_hours) > 0 && Number(currentShift.provider_travel_km) > 0 && pTravel.distance === 0;
         let update_pt_km = (currentShift.is_historical === 1 || preserveCancelledPT) ? currentShift.provider_travel_km : pTravel.distance;
         let update_pt_mins = (currentShift.is_historical === 1 || preserveCancelledPT) ? currentShift.provider_travel_minutes : pTravel.minutes;
         let update_pt_cost = (currentShift.is_historical === 1 || preserveCancelledPT) ? currentShift.provider_travel_cost : pTravel.cost;

         db.prepare('UPDATE shifts SET provider_travel_km = ?, provider_travel_minutes = ?, provider_travel_cost = ?, travel_breakdown = ?, transport_route_log = ?, services_json = ? WHERE id = ?').run(
            update_pt_km, update_pt_mins, update_pt_cost, JSON.stringify(travelBreakdown), transportRouteLogStr, JSON.stringify(servicesData), currentShift.id
         );

         const prevIsHomeCare = prevShift && (prevShift.funding_type === 'HCP' || prevShift.funding_type === 'Home Care' || prevShift.funding_type === 'HOME_CARE');
         if (prevShift && !prevIsHomeCare && prevShift.is_historical !== 1) {
             console.log(`[NDIS Sync] Retroactively updating preceding shift: ${prevShift.id}`);
             const hasPrevPT = hasNdisProviderTravelService(prevShift);
             const prevPTravel = hasPrevPT
               ? await calculateProviderTravel(prevShift)
               : { distance: 0, minutes: 0, cost: 0, routeLogs: [] };
             let prevRouteLog: any = {};
             try {
                 prevRouteLog = JSON.parse(prevShift.transport_route_log || '{}');
             } catch(e) {}
             if (hasPrevPT) {
               prevRouteLog.providerTravel = {
                   calculatedAt: new Date().toISOString(),
                   distance: prevPTravel.distance,
                   minutes: prevPTravel.minutes,
                   cost: prevPTravel.cost,
                   legs: prevPTravel.routeLogs
               };
             } else {
               delete prevRouteLog.providerTravel;
             }
             const prevBreakdown = hasPrevPT ? (prevPTravel.routeLogs || []).map((log: any) => log.description) : [];
             db.prepare('UPDATE shifts SET provider_travel_km = ?, provider_travel_minutes = ?, provider_travel_cost = ?, travel_breakdown = ?, transport_route_log = ? WHERE id = ?').run(
                 prevPTravel.distance, prevPTravel.minutes, prevPTravel.cost, JSON.stringify(prevBreakdown), Object.keys(prevRouteLog).length > 0 ? JSON.stringify(prevRouteLog) : null, prevShift.id
             );
         }

         const nextIsHomeCare = nextShift && (nextShift.funding_type === 'HCP' || nextShift.funding_type === 'Home Care' || nextShift.funding_type === 'HOME_CARE');
         if (nextShift && !nextIsHomeCare && nextShift.is_historical !== 1) {
             console.log(`[NDIS Sync] Retroactively updating succeeding shift: ${nextShift.id}`);
             const hasNextPT = hasNdisProviderTravelService(nextShift);
             const nextPTravel = hasNextPT
               ? await calculateProviderTravel(nextShift)
               : { distance: 0, minutes: 0, cost: 0, routeLogs: [] };
             let nextRouteLog: any = {};
             try {
                 nextRouteLog = JSON.parse(nextShift.transport_route_log || '{}');
             } catch(e) {}
             if (hasNextPT) {
               nextRouteLog.providerTravel = {
                   calculatedAt: new Date().toISOString(),
                   distance: nextPTravel.distance,
                   minutes: nextPTravel.minutes,
                   cost: nextPTravel.cost,
                   legs: nextPTravel.routeLogs
               };
             } else {
               delete nextRouteLog.providerTravel;
             }
             const nextBreakdown = hasNextPT ? (nextPTravel.routeLogs || []).map((log: any) => log.description) : [];
             db.prepare('UPDATE shifts SET provider_travel_km = ?, provider_travel_minutes = ?, provider_travel_cost = ?, travel_breakdown = ?, transport_route_log = ? WHERE id = ?').run(
                 nextPTravel.distance, nextPTravel.minutes, nextPTravel.cost, JSON.stringify(nextBreakdown), Object.keys(nextRouteLog).length > 0 ? JSON.stringify(nextRouteLog) : null, nextShift.id
             );
         }
      }
    }
  } catch (e) {
    console.error('[DEBUG CASCADE] Error recalculating day travel:', e);
  }
};
