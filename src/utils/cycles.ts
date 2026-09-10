import { addDays, subDays, startOfWeek, format, isBefore, isAfter, parseISO } from 'date-fns';

const DAY_MAP: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

// Anchor dates for fortnightly (just picking a week in the past)
// Week starting Jan 1, 2024 is a Monday. We can just use Jan 1, 2024 as week 0.
const ANCHOR_DATE = new Date('2024-01-01T00:00:00Z'); 

export function generateCycles(frequency: string, startDayStr: string, currentLocalTimeStr: string, count = 5) {
  const startDay = DAY_MAP[startDayStr] ?? 1;
  const now = new Date(currentLocalTimeStr); // assume it's a parseable date or just use new Date()
  
  // Find the most recent start day before or equal to now
  let currentCycleStart = now;
  // If we need to find the specific start day
  let dayOffset = now.getDay() - startDay;
  if (dayOffset < 0) dayOffset += 7;
  
  currentCycleStart = subDays(now, dayOffset);
  currentCycleStart.setHours(0, 0, 0, 0);

  if (frequency === 'Fortnightly') {
    // Determine if we are in week 1 or week 2 of the fortnight based on anchor
    const diffTime = currentCycleStart.getTime() - ANCHOR_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeksSinceAnchor = Math.floor(diffDays / 7);
    if (weeksSinceAnchor % 2 !== 0) {
      // If we are in the odd week, the fortnight actually started a week ago
      currentCycleStart = subDays(currentCycleStart, 7);
    }
  } else if (frequency === 'Monthly') {
    // Usually monthly starts on the 1st
    currentCycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const cycles = [];
  let periodLength = 7;
  if (frequency === 'Fortnightly') periodLength = 14;

  let loopStart = currentCycleStart;
  
  // Go back a few cycles
  for (let i = 0; i < 2; i++) {
    if (frequency === 'Monthly') {
      loopStart = new Date(loopStart.getFullYear(), loopStart.getMonth() - 1, 1);
    } else {
      loopStart = subDays(loopStart, periodLength);
    }
  }

  // Generate cycles (2 past, 1 current, 2 future)
  for (let i = 0; i < count; i++) {
    let loopEnd;
    if (frequency === 'Monthly') {
      loopEnd = subDays(new Date(loopStart.getFullYear(), loopStart.getMonth() + 1, 1), 1);
    } else {
      loopEnd = addDays(loopStart, periodLength - 1);
    }
    
    cycles.push({
      start: format(loopStart, 'yyyy-MM-dd'),
      end: format(loopEnd, 'yyyy-MM-dd'),
      label: `${format(loopStart, 'MMM dd, yyyy')} - ${format(loopEnd, 'MMM dd, yyyy')}`
    });

    if (frequency === 'Monthly') {
      loopStart = new Date(loopStart.getFullYear(), loopStart.getMonth() + 1, 1);
    } else {
      loopStart = addDays(loopStart, periodLength);
    }
  }

  return cycles;
}
