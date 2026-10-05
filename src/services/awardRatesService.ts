import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export interface AwardSchedule {
  id: number;
  name: string;
  award_code: string;
  effective_from: string;
  effective_to?: string;
  description?: string;
  is_active: number;
  rate_count: number;
  status: 'ACTIVE' | 'UPCOMING' | 'ARCHIVED';
  timezone?: string;
  current_date?: string;
  transition_note?: string;
  created_at: string;
  updated_at: string;
}

export interface AwardPayRateRow {
  id?: number;
  schedule_id?: number;
  award_name: string;
  award_code?: string;
  stream: string;
  classification: string;
  pay_point_code?: string;
  hourly_rate: number;
  weekly_rate?: number;
  annual_rate?: number;
  casual_rate?: number;
  saturday_rate?: number;
  sunday_rate?: number;
  public_holiday_rate?: number;
  casual_saturday_rate?: number;
  casual_sunday_rate?: number;
  afternoon_shift_rate?: number;
  night_shift_rate?: number;
  effective_date?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Normalizes input date strings (ISO YYYY-MM-DD or Australian DD/MM/YYYY) into standardized YYYY-MM-DD.
 */
export function normalizeDateToYMD(dateInput: string): string {
  if (!dateInput) return '';
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const auMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (auMatch) {
    const [, d, m, y] = auMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}

/**
 * Resolves the configured business timezone from Settings > General > Localization & System > Timezone.
 * Always strips extra quotation marks, JSON packaging, or trailing whitespace.
 * Defaults strictly to 'Australia/Perth' if unconfigured.
 */
export function getBusinessTimezone(db: any): string {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (typeof parsed === 'string' && parsed.trim()) {
          return parsed.trim().replace(/^['"]+|['"]+$/g, '');
        }
      } catch {
        if (typeof row.value === 'string' && row.value.trim()) {
          return row.value.trim().replace(/^['"]+|['"]+$/g, '');
        }
      }
    }
  } catch (e) {}
  return 'Australia/Perth';
}

/**
 * Returns a clean YYYY-MM-DD date string strictly formatted in the configured business timezone.
 * Accurately parses UTC ISO shift timestamps (e.g., from shift.start_time), local dates,
 * and Australian date formats, guaranteeing midnight alignment with Settings > Localization & System > Timezone.
 */
export function getBusinessDateString(db: any, dateInput?: string | Date): string {
  const tz = getBusinessTimezone(db);
  if (!dateInput) {
    return formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Pure YYYY-MM-DD string
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // Australian DD/MM/YYYY string
    const auMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (auMatch) {
      const [, d, m, y] = auMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // If string has explicit UTC/offset designator (Z or +XX:XX), parse as UTC timestamp
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return formatInTimeZone(d, tz, 'yyyy-MM-dd');
      }
    } else {
      // Local datetime without timezone offset (e.g. "2025-07-01 10:00:00" or "2025-07-01T10:00:00")
      try {
        const cleaned = trimmed.replace(' ', 'T');
        const zoned = fromZonedTime(cleaned, tz);
        if (!isNaN(zoned.getTime())) {
          return formatInTimeZone(zoned, tz, 'yyyy-MM-dd');
        }
      } catch (e) {}
    }
  }

  const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) {
    return formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
  }

  return formatInTimeZone(dateObj, tz, 'yyyy-MM-dd');
}

export function initAwardRatesTable(db: any) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS award_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        award_code TEXT DEFAULT 'MA000100',
        effective_from TEXT NOT NULL,
        effective_to TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        rate_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_award_schedules_date 
        ON award_schedules(effective_from);

      CREATE TABLE IF NOT EXISTS award_pay_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER,
        award_name TEXT NOT NULL DEFAULT 'SCHADS Award',
        award_code TEXT DEFAULT 'MA000100',
        stream TEXT NOT NULL,
        classification TEXT NOT NULL,
        pay_point_code TEXT,
        hourly_rate REAL NOT NULL,
        weekly_rate REAL,
        annual_rate REAL,
        casual_rate REAL,
        saturday_rate REAL,
        sunday_rate REAL,
        public_holiday_rate REAL,
        casual_saturday_rate REAL,
        casual_sunday_rate REAL,
        afternoon_shift_rate REAL,
        night_shift_rate REAL,
        effective_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_award_rates_lookup 
        ON award_pay_rates(award_name, stream, classification);
    `);

    // Ensure schedule_id column exists
    try {
      db.exec('ALTER TABLE award_pay_rates ADD COLUMN schedule_id INTEGER');
    } catch (e: any) {}

    console.log('[DEBUG] award_schedules and award_pay_rates initialized.');
  } catch (e: any) {
    console.error('[AWARD] Error initializing award tables:', e);
  }
}

/**
 * Normalizes and parses raw CSV string or buffer into standardized AwardPayRateRow objects.
 */
export function parseAwardCsv(
  csvContent: string | Buffer,
  options?: { awardName?: string; awardCode?: string; effectiveDate?: string }
): AwardPayRateRow[] {
  const wb = xlsx.read(csvContent, { type: typeof csvContent === 'string' ? 'string' : 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(wb.Sheets[sheetName], { defval: '' });

  const awardName = (options?.awardName || 'SCHADS Award').trim();
  const awardCode = (options?.awardCode || 'MA000100').trim();
  const effectiveDate = options?.effectiveDate || '';

  const parsed: AwardPayRateRow[] = [];

  for (const raw of rawRows) {
    const keys = Object.keys(raw);
    const getVal = (...matchKeys: string[]): any => {
      for (const m of matchKeys) {
        const found = keys.find(k => k.trim().toLowerCase() === m.trim().toLowerCase());
        if (found !== undefined && raw[found] !== undefined && raw[found] !== '') {
          return raw[found];
        }
      }
      return undefined;
    };

    const stream = String(getVal('Stream', 'stream') || '').trim();
    const classification = String(getVal('Classification', 'classification', 'Level') || '').trim();
    if (!stream || !classification) continue;

    const parseNum = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const clean = String(val).replace(/[$,]/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? undefined : num;
    };

    const hourly = parseNum(getVal('Hourly', 'Hourly Rate', 'Base Hourly', 'Ordinary Hourly'));
    if (hourly === undefined) continue;

    const code = getVal('Code', 'pay_point_code', 'Pay Point') ? String(getVal('Code', 'pay_point_code', 'Pay Point')).trim() : undefined;

    parsed.push({
      award_name: awardName,
      award_code: awardCode,
      stream,
      classification,
      pay_point_code: code,
      hourly_rate: hourly,
      weekly_rate: parseNum(getVal('Weekly (38h)', 'Weekly', 'Weekly rate')),
      annual_rate: parseNum(getVal('Annual', 'Annual salary', 'Yearly')),
      casual_rate: parseNum(getVal('Casual', 'Casual hourly', 'Casual (25%)')),
      saturday_rate: parseNum(getVal('Saturday', 'Saturday rate')),
      sunday_rate: parseNum(getVal('Sunday', 'Sunday rate')),
      public_holiday_rate: parseNum(getVal('Public holiday', 'Public Holiday', 'PH')),
      casual_saturday_rate: parseNum(getVal('Casual Saturday', 'Casual Saturday rate')),
      casual_sunday_rate: parseNum(getVal('Casual Sunday', 'Casual Sunday rate')),
      afternoon_shift_rate: parseNum(getVal('Afternoon shift', 'Afternoon', 'Afternoon loading')),
      night_shift_rate: parseNum(getVal('Night shift', 'Night', 'Night loading')),
      effective_date: effectiveDate,
    });
  }

  return parsed;
}

/**
 * Returns all award schedules with their current operational status.
 * - 'ACTIVE': The latest schedule whose effective_from is on or before today
 * - 'UPCOMING': Schedules with effective_from in the future
 * - 'ARCHIVED': Past historical schedules
 */
export function getAwardSchedules(db: any): AwardSchedule[] {
  try {
    const rows = db.prepare(`
      SELECT s.*, 
             COALESCE((SELECT COUNT(*) FROM award_pay_rates r WHERE r.schedule_id = s.id), 0) as rate_count
      FROM award_schedules s
      ORDER BY s.effective_from DESC, s.id DESC
    `).all() as any[];

    // Evaluated strictly in the business timezone from Settings
    const tz = getBusinessTimezone(db);
    const todayStr = getBusinessDateString(db);
    let foundActive = false;

    return rows.map(row => {
      let status: 'ACTIVE' | 'UPCOMING' | 'ARCHIVED' = 'ARCHIVED';
      let transition_note = '';
      if (row.effective_from > todayStr) {
        status = 'UPCOMING';
        transition_note = `Activates at 00:00 (midnight) on ${row.effective_from} in ${tz}`;
      } else if (!foundActive) {
        status = 'ACTIVE';
        foundActive = true;
        transition_note = `Currently in effect across shifts in ${tz} (effective since ${row.effective_from})`;
      } else {
        status = 'ARCHIVED';
        transition_note = `Archived historical schedule (applied to shifts prior to newer schedules)`;
      }

      return {
        ...row,
        status,
        timezone: tz,
        current_date: todayStr,
        transition_note,
        rate_count: Number(row.rate_count || 0)
      };
    });
  } catch (e) {
    console.error('[AWARD] Error fetching award schedules:', e);
    return [];
  }
}

/**
 * Inserts or updates award rates under an archived/versioned award schedule.
 */
export function importAwardRates(
  db: any,
  rates: AwardPayRateRow[],
  options?: { 
    scheduleName?: string; 
    effectiveFrom?: string; 
    awardCode?: string; 
    description?: string; 
    overwrite?: boolean; 
    scheduleId?: number; 
  }
): { imported: number; updated: number; total: number; scheduleId: number } {
  if (!rates || rates.length === 0) return { imported: 0, updated: 0, total: 0, scheduleId: 0 };

  const rawEffective = options?.effectiveFrom || rates[0]?.effective_date || getBusinessDateString(db);
  const effectiveFrom = normalizeDateToYMD(rawEffective);
  const scheduleName = (options?.scheduleName || rates[0]?.award_name || `SCHADS Award (${effectiveFrom.substring(0, 4)})`).trim();
  const awardCode = (options?.awardCode || rates[0]?.award_code || 'MA000100').trim();
  const description = options?.description || '';

  const transaction = db.transaction(() => {
    let targetScheduleId = options?.scheduleId;

    if (!targetScheduleId) {
      // Find existing schedule matching name and effective date, or create new
      const existingSchedule = db.prepare(`
        SELECT id FROM award_schedules 
        WHERE name = ? OR effective_from = ?
      `).get(scheduleName, effectiveFrom) as any;

      if (existingSchedule) {
        targetScheduleId = existingSchedule.id;
        db.prepare(`
          UPDATE award_schedules 
          SET name = ?, award_code = ?, effective_from = ?, description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(scheduleName, awardCode, effectiveFrom, description || null, targetScheduleId);
      } else {
        const insertSch = db.prepare(`
          INSERT INTO award_schedules (name, award_code, effective_from, description, is_active)
          VALUES (?, ?, ?, ?, 1)
        `).run(scheduleName, awardCode, effectiveFrom, description);
        targetScheduleId = Number(insertSch.lastInsertRowid);
      }
    }

    if (options?.overwrite) {
      db.prepare('DELETE FROM award_pay_rates WHERE schedule_id = ?').run(targetScheduleId);
    }

    const checkStmt = db.prepare(`
      SELECT id FROM award_pay_rates 
      WHERE schedule_id = ? AND stream = ? AND classification = ?
    `);

    const updateStmt = db.prepare(`
      UPDATE award_pay_rates SET
        award_name = ?,
        award_code = ?,
        pay_point_code = ?,
        hourly_rate = ?,
        weekly_rate = ?,
        annual_rate = ?,
        casual_rate = ?,
        saturday_rate = ?,
        sunday_rate = ?,
        public_holiday_rate = ?,
        casual_saturday_rate = ?,
        casual_sunday_rate = ?,
        afternoon_shift_rate = ?,
        night_shift_rate = ?,
        effective_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO award_pay_rates (
        schedule_id, award_name, award_code, stream, classification, pay_point_code,
        hourly_rate, weekly_rate, annual_rate, casual_rate,
        saturday_rate, sunday_rate, public_holiday_rate,
        casual_saturday_rate, casual_sunday_rate,
        afternoon_shift_rate, night_shift_rate, effective_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    let updated = 0;

    for (const r of rates) {
      const existing = checkStmt.get(targetScheduleId, r.stream, r.classification) as any;
      if (existing && !options?.overwrite) {
        updateStmt.run(
          scheduleName,
          awardCode,
          r.pay_point_code || null,
          r.hourly_rate,
          r.weekly_rate || null,
          r.annual_rate || null,
          r.casual_rate || null,
          r.saturday_rate || null,
          r.sunday_rate || null,
          r.public_holiday_rate || null,
          r.casual_saturday_rate || null,
          r.casual_sunday_rate || null,
          r.afternoon_shift_rate || null,
          r.night_shift_rate || null,
          effectiveFrom,
          existing.id
        );
        updated++;
      } else {
        insertStmt.run(
          targetScheduleId,
          scheduleName,
          awardCode,
          r.stream,
          r.classification,
          r.pay_point_code || null,
          r.hourly_rate,
          r.weekly_rate || null,
          r.annual_rate || null,
          r.casual_rate || null,
          r.saturday_rate || null,
          r.sunday_rate || null,
          r.public_holiday_rate || null,
          r.casual_saturday_rate || null,
          r.casual_sunday_rate || null,
          r.afternoon_shift_rate || null,
          r.night_shift_rate || null,
          effectiveFrom
        );
        imported++;
      }
    }

    // Update total rate count on schedule
    const countRow = db.prepare('SELECT COUNT(*) as count FROM award_pay_rates WHERE schedule_id = ?').get(targetScheduleId) as any;
    db.prepare('UPDATE award_schedules SET rate_count = ? WHERE id = ?').run(countRow?.count || 0, targetScheduleId);

    return { imported, updated, total: rates.length, scheduleId: targetScheduleId };
  });

  return transaction();
}

/**
 * Gets award rates matching optional scheduleId, stream, classification, or search term.
 */
export function getAwardRates(
  db: any,
  filters?: { scheduleId?: number; awardName?: string; stream?: string; search?: string }
): AwardPayRateRow[] {
  let query = 'SELECT * FROM award_pay_rates WHERE 1=1';
  const params: any[] = [];

  if (filters?.scheduleId) {
    query += ' AND schedule_id = ?';
    params.push(filters.scheduleId);
  } else if (filters?.awardName) {
    query += ' AND award_name = ?';
    params.push(filters.awardName);
  }

  if (filters?.stream) {
    query += ' AND stream = ?';
    params.push(filters.stream);
  }

  if (filters?.search) {
    query += ' AND (stream LIKE ? OR classification LIKE ? OR pay_point_code LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY stream ASC, hourly_rate ASC';
  return db.prepare(query).all(...params) as AwardPayRateRow[];
}

/**
 * Returns the exact rate row in effect for a given shift date.
 * Automatically looks up the schedule where effective_from <= shiftDate ORDER BY effective_from DESC LIMIT 1.
 */
export function getAwardRatesForDate(
  db: any,
  shiftDateStr: string,
  filters?: { stream?: string; classification?: string }
): { schedule: AwardSchedule | null; date: string; timezone: string; rates: AwardPayRateRow[] } {
  const tz = getBusinessTimezone(db);
  const dateOnly = getBusinessDateString(db, shiftDateStr);
  const schedule = db.prepare(`
    SELECT * FROM award_schedules 
    WHERE (is_active = 1 OR is_active IS NULL) AND effective_from <= ? 
    ORDER BY effective_from DESC, id DESC 
    LIMIT 1
  `).get(dateOnly) as any;

  if (!schedule) {
    // Fallback to earliest or default schedule
    const fallback = db.prepare('SELECT * FROM award_schedules WHERE (is_active = 1 OR is_active IS NULL) ORDER BY effective_from ASC, id ASC LIMIT 1').get() as any;
    if (!fallback) return { schedule: null, date: dateOnly, timezone: tz, rates: [] };
    const rates = getAwardRates(db, { scheduleId: fallback.id, stream: filters?.stream });
    return { schedule: fallback, date: dateOnly, timezone: tz, rates };
  }

  const rates = getAwardRates(db, { scheduleId: schedule.id, stream: filters?.stream });
  return { schedule, date: dateOnly, timezone: tz, rates };
}

/**
 * Gets high-level summary of all imported schedules, awards and streams.
 */
export function getAwardSummary(db: any) {
  try {
    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM award_pay_rates').get() as any)?.count || 0;
    const timezone = getBusinessTimezone(db);
    const schedules = getAwardSchedules(db);

    const streams = db.prepare(`
      SELECT stream, COUNT(*) as count
      FROM award_pay_rates
      GROUP BY stream
      ORDER BY count DESC
    `).all() as any[];

    return {
      totalCount,
      timezone,
      schedules,
      streams,
    };
  } catch (e) {
    return { totalCount: 0, timezone: 'Australia/Perth', schedules: [], streams: [] };
  }
}
