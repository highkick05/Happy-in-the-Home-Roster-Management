import { recalculateDayTravelForStaff } from '../src/services/travelEngine';
import db from '../db';
import { getGoogleRoutesDistance, getRecordCoordinates } from '../src/utils/mapUtils';

jest.mock('../db.js', () => ({
  __esModule: true,
  default: {
    prepare: jest.fn()
  }
}));

jest.mock('../src/utils/mapUtils.js', () => ({
  getGoogleRoutesDistance: jest.fn(),
  getRecordCoordinates: jest.fn()
}));

jest.mock('../src/utils/travelCalculator.js', () => ({
  calculateProviderTravel: jest.fn()
}));

describe('travelEngine - Home Care Gap Logic', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TEST A (Paid Travel): Calculates properly when gap is 30 mins', async () => {
    const mockDbRun = jest.fn();
    (db.prepare as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('SELECT s.*')) {
        return {
          all: () => [
            {
              id: 1,
              staff_id: 10,
              client_id: 100,
              start_time: '2023-10-10T09:00:00.000Z',
              end_time: '2023-10-10T10:00:00.000Z',
              funding_type: 'Home Care',
              transport_route_log: '{}'
            },
            {
              id: 2,
              staff_id: 10,
              client_id: 200,
              start_time: '2023-10-10T10:30:00.000Z', // 30 min gap
              end_time: '2023-10-10T11:30:00.000Z',
              funding_type: 'Home Care',
              transport_route_log: '{}'
            }
          ]
        };
      }
      if (query.includes('SELECT address FROM users')) {
        return { get: () => ({ address: '123 Staff Home' }) };
      }
      if (query.includes('SELECT address FROM clients') || query.includes('SELECT address, first_name, last_name FROM clients')) {
        return { get: () => ({ address: '456 Client Address', first_name: 'John', last_name: 'Doe' }) };
      }
      if (query.includes('UPDATE shifts')) {
        return { run: mockDbRun };
      }
      return { get: () => null, all: () => [], run: () => null };
    });

    (getRecordCoordinates as jest.Mock).mockResolvedValue(['-33.8688', '151.2093']);
    (getGoogleRoutesDistance as jest.Mock).mockResolvedValue({ distance: 15.5, minutes: 22 });

    await recalculateDayTravelForStaff(10, '2023-10-10T00:00:00.000Z');

    // The second shift (id: 2) should NOT have 0 distance, because gap is 30 mins (<= 60)
    // Looking at the arguments for db.prepare('UPDATE shifts...').run(totalDistance, totalTravelMinutes...)
    // The first shift has no previous shift, so it gets totalDistance = 0.
    // The second shift should get totalDistance = 15.5, totalTravelMinutes = 22.
    
    // Check call for shift id: 2
    const updateCallForShift2 = mockDbRun.mock.calls.find(call => call[6] === 2); // id is the 7th param
    expect(updateCallForShift2).toBeDefined();
    
    const [totalDist, totalMins, hcTravelKm, hcTravelTotal, travelBreakdown, transportRouteLog, id] = updateCallForShift2;
    expect(totalDist).toBe(15.5);
    expect(totalMins).toBe(22);
    expect(hcTravelKm).toBe(15.5);
    
    const parsedLog = JSON.parse(transportRouteLog);
    expect(parsedLog.homeCareTravel.distance).toBe(15.5);
    expect(parsedLog.homeCareTravel.legs[0].distance).toBe(15.5);
  });

  it('TEST B (Private Commute): Zeroes out travel when gap is 90 mins', async () => {
    const mockDbRun = jest.fn();
    (db.prepare as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('SELECT s.*')) {
        return {
          all: () => [
            {
              id: 1,
              staff_id: 10,
              client_id: 100,
              start_time: '2023-10-10T09:00:00.000Z',
              end_time: '2023-10-10T10:00:00.000Z',
              funding_type: 'Home Care',
              transport_route_log: '{}'
            },
            {
              id: 2,
              staff_id: 10,
              client_id: 200,
              start_time: '2023-10-10T11:30:00.000Z', // 90 min gap
              end_time: '2023-10-10T12:30:00.000Z',
              funding_type: 'Home Care',
              transport_route_log: '{}'
            }
          ]
        };
      }
      if (query.includes('SELECT address FROM users')) {
        return { get: () => ({ address: '123 Staff Home' }) };
      }
      if (query.includes('SELECT address FROM clients') || query.includes('SELECT address, first_name, last_name FROM clients')) {
        return { get: () => ({ address: '456 Client Address', first_name: 'John', last_name: 'Doe' }) };
      }
      if (query.includes('UPDATE shifts')) {
        return { run: mockDbRun };
      }
      return { get: () => null, all: () => [], run: () => null };
    });

    (getRecordCoordinates as jest.Mock).mockResolvedValue(['-33.8688', '151.2093']);
    (getGoogleRoutesDistance as jest.Mock).mockResolvedValue({ distance: 20, minutes: 30 }); // Should be ignored

    await recalculateDayTravelForStaff(10, '2023-10-10T00:00:00.000Z');

    const updateCallForShift2 = mockDbRun.mock.calls.find(call => call[6] === 2);
    expect(updateCallForShift2).toBeDefined();

    const [totalDist, totalMins, hcTravelKm, hcTravelTotal, travelBreakdown, transportRouteLog, id] = updateCallForShift2;
    // Over > 60 mins -> gapToPrev > 60 triggers private commute logic
    expect(totalDist).toBe(0);
    expect(totalMins).toBe(0);
    expect(hcTravelKm).toBe(0);
    
    // Check travel_breakdown contains the Private Commute reason
    const parsedBreakdown = JSON.parse(travelBreakdown);
    expect(parsedBreakdown).toContain('[Ignored Commute]: Home -> First Client (0km)');
    
    // Check transport_route_log sets homeCareTravel distance to 0
    const parsedLog = JSON.parse(transportRouteLog);
    expect(parsedLog.homeCareTravel.distance).toBe(0);
    expect(parsedLog.homeCareTravel.legs[0].distance).toBe(0);
    expect(parsedLog.homeCareTravel.legs[0].description).toBe('No billable provider travel for this shift (Private Commute)');
  });
});
