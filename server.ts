import "express-async-errors";
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import morgan from 'morgan';
import winston from 'winston';
import Holidays from 'date-holidays';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});


let _filename: string;
let _dirname: string;

if (typeof __dirname !== 'undefined') {
  _dirname = __dirname;
  _filename = __filename;
} else {
  // @ts-ignore
  _filename = fileURLToPath(import.meta.url);
  _dirname = path.dirname(_filename);
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original file name, but make it unique to avoid overwriting
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit to prevent storage exhaustion
});

if (!fs.existsSync(path.join(process.cwd(), 'invoices'))) {
  fs.mkdirSync(path.join(process.cwd(), 'invoices'), { recursive: true });
}

function getSafeDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch (e: any) {
    if (e instanceof RangeError && options.timeZone) {
      console.warn(`Invalid time zone "${options.timeZone}", falling back to UTC.`);
      const fallbackOptions = { ...options, timeZone: 'UTC' };
      return new Intl.DateTimeFormat(locale, fallbackOptions);
    }
    throw e;
  }
}

// Initialize DB from module
// db initialized in db.ts

// Setup Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STAFF')),
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    dob TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    bank_name TEXT,
    bank_bsb TEXT,
    bank_acc TEXT,
    tax_number TEXT,
    super_fund_name TEXT,
    super_member_number TEXT,
    onboarding_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    ndis_number TEXT,
    care_plan_details TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    provider_id INTEGER,
    dob TEXT,
    funding_type TEXT,
    my_aged_care_id TEXT,
    address TEXT,
    representative_name TEXT,
    representative_phone TEXT,
    representative_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL CHECK(length(code) > 0), -- e.g., NDIS line item code
    name TEXT NOT NULL CHECK(length(name) > 0),
    rate REAL NOT NULL CHECK(rate >= 0),
    description TEXT,
    type TEXT NOT NULL DEFAULT 'NDIS' CHECK(type IN ('NDIS', 'HOME_CARE')),
    unit TEXT CHECK(unit IS NULL OR unit IN ('Hour', 'Each', 'Day', 'Week', 'Year', 'Month', '')),
    reg_group_number TEXT,
    reg_group_name TEXT,
    rates_json TEXT CHECK(rates_json IS NULL OR rates_json = '' OR json_valid(rates_json)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, code, name)
  );

  CREATE TABLE IF NOT EXISTS respite_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'INVOICED')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    CHECK (start_time < end_time)
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    service_id INTEGER,
    respite_booking_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'INVOICED')),
    notes TEXT,
    services_json TEXT CHECK(services_json IS NULL OR services_json = '' OR json_valid(services_json)),
    travel_breakdown TEXT,
    funding_type TEXT DEFAULT 'NDIS',
    provider_travel_km REAL DEFAULT 0,
    provider_travel_cost REAL DEFAULT 0,
    home_care_travel_km REAL DEFAULT 0,
    home_care_travel_total REAL DEFAULT 0,
    abt_km REAL DEFAULT 0,
    abt_cost REAL DEFAULT 0,
    transport_route_log TEXT,
    is_abt_approved BOOLEAN DEFAULT 0,
    actual_start_time TEXT,
    actual_finish_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    odometer_start_reading TEXT,
    odometer_start_photo TEXT,
    odometer_end_reading TEXT,
    odometer_end_photo TEXT,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE CASCADE,
    CHECK (start_time < end_time)
  );

  CREATE TABLE IF NOT EXISTS client_roster_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    staff_id INTEGER NOT NULL,
    service_id INTEGER,
    services_json TEXT CHECK(services_json IS NULL OR services_json = '' OR json_valid(services_json)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE,
    shift_id INTEGER,
    provider_id INTEGER,
    client_id INTEGER,
    amount REAL NOT NULL CHECK(amount >= 0),
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'GENERATED' CHECK(status IN ('GENERATED', 'SENT', 'PAID', 'VOID')),
    merged_into_shift_id INTEGER,
    respite_booking_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE,
    client_id INTEGER NOT NULL,
    staff_id INTEGER,
    activity_name TEXT NOT NULL,
    activity_date TEXT NOT NULL,
    services_json TEXT NOT NULL CHECK(json_valid(services_json)),
    amount REAL NOT NULL CHECK(amount >= 0),
    file_path TEXT,
    important_notes TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ACCEPTED', 'REJECTED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    system_name TEXT NOT NULL,
    size INTEGER NOT NULL CHECK(size >= 0),
    uploaded_by INTEGER NOT NULL,
    region TEXT,
    folder_path TEXT DEFAULT '/',
    date_issued TEXT,
    date_expires TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

try {
  db.exec("ALTER TABLE services ADD COLUMN type TEXT NOT NULL DEFAULT 'NDIS' CHECK(type IN ('NDIS', 'HOME_CARE'))");
} catch(e) {
  // column likely exists
}
try {
  db.exec("ALTER TABLE services ADD COLUMN unit TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE services ADD COLUMN reg_group_number TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE services ADD COLUMN reg_group_name TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE services ADD COLUMN rates_json TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN respite_booking_id INTEGER REFERENCES respite_bookings(id)");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN actual_start_time TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN actual_finish_time TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN odometer_start_reading TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN odometer_start_photo TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN odometer_end_reading TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN odometer_end_photo TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN funding_type TEXT DEFAULT 'NDIS'");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN provider_travel_km REAL DEFAULT 0");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN provider_travel_cost REAL DEFAULT 0");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN abt_km REAL DEFAULT 0");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN abt_cost REAL DEFAULT 0");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN transport_route_log TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN services_json TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN travel_breakdown TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE files ADD COLUMN region TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE invoices ADD COLUMN invoice_number TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

// --- Production-grade performance indexing ---
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_client ON shifts(client_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_respite ON shifts(respite_booking_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
    CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
    CREATE INDEX IF NOT EXISTS idx_shifts_client_start_time ON shifts(client_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_shifts_staff_start_time ON shifts(staff_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_shifts_status_start_time ON shifts(status, start_time);
    
    CREATE INDEX IF NOT EXISTS idx_respite_client ON respite_bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_respite_start_time ON respite_bookings(start_time);
    CREATE INDEX IF NOT EXISTS idx_respite_client_start_time ON respite_bookings(client_id, start_time);
    
    CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(shift_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    
    CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_staff ON quotes(staff_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
    CREATE INDEX IF NOT EXISTS idx_client_services_client ON client_services(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_services_service ON client_services(service_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_service ON shifts(service_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_funding ON shifts(funding_type);
    CREATE INDEX IF NOT EXISTS idx_respite_service ON respite_bookings(service_id);
    CREATE INDEX IF NOT EXISTS idx_respite_status ON respite_bookings(status);
    
    CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_client_roster_templates_client ON client_roster_templates(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_roster_templates_staff ON client_roster_templates(staff_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_clients_provider ON clients(provider_id);
    CREATE INDEX IF NOT EXISTS idx_client_roster_templates_service ON client_roster_templates(service_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_activity_date ON quotes(activity_date);
    CREATE INDEX IF NOT EXISTS idx_files_system_name ON files(system_name);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  `);
} catch(e) {
  console.error("Failed to create indexes:", e);
}

try {
  db.exec("ALTER TABLE quotes ADD COLUMN important_notes TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE invoices ADD COLUMN merged_into_shift_id INTEGER");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE files ADD COLUMN folder_path TEXT DEFAULT '/'");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE files ADD COLUMN date_issued TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE files ADD COLUMN date_expires TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED'))");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE clients ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED'))");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE providers ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED'))");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

// Cleanup legacy seed
try {
  db.exec("DELETE FROM services WHERE code = 'HC_001'");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try {
  db.exec("ALTER TABLE clients ADD COLUMN provider_id INTEGER REFERENCES providers(id)");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

try { db.exec("ALTER TABLE clients ADD COLUMN dob TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN funding_type TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN my_aged_care_id TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN address TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN representative_name TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN representative_phone TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN representative_email TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE shifts ADD COLUMN home_care_travel_km REAL DEFAULT 0"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE shifts ADD COLUMN home_care_travel_total REAL DEFAULT 0"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE shifts ADD COLUMN custom_rate REAL"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE client_services ADD COLUMN custom_rate REAL"); } catch(e) { /* ignore */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS client_services (
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    custom_rate REAL,
    PRIMARY KEY (client_id, service_id),
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
  );
`);

try {
  db.pragma('foreign_keys = OFF');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_services_new (
      client_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      custom_rate REAL,
      PRIMARY KEY (client_id, service_id),
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
    );
    INSERT OR IGNORE INTO client_services_new (client_id, service_id, custom_rate) SELECT client_id, service_id, custom_rate FROM client_services WHERE client_id IS NOT NULL AND service_id IS NOT NULL;
    DROP TABLE client_services;
    ALTER TABLE client_services_new RENAME TO client_services;
    
    CREATE TABLE IF NOT EXISTS services_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL CHECK(length(code) > 0),
      name TEXT NOT NULL CHECK(length(name) > 0),
      rate REAL NOT NULL CHECK(rate >= 0),
      description TEXT,
      type TEXT NOT NULL DEFAULT 'NDIS' CHECK(type IN ('NDIS', 'HOME_CARE')),
      unit TEXT CHECK(unit IS NULL OR unit IN ('Hour', 'Each', 'Day', 'Week', 'Year', 'Month', '')),
      reg_group_number TEXT,
      reg_group_name TEXT,
      rates_json TEXT CHECK(rates_json IS NULL OR rates_json = '' OR json_valid(rates_json)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, code, name)
    );
    INSERT OR IGNORE INTO services_new (id, code, name, rate, description, type, unit, reg_group_number, reg_group_name, rates_json, created_at) SELECT id, code, name, rate, description, type, unit, reg_group_number, reg_group_name, rates_json, created_at FROM services;
    DROP TABLE services;
    ALTER TABLE services_new RENAME TO services;

    CREATE TABLE IF NOT EXISTS respite_bookings_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      service_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'INVOICED')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
      CHECK (start_time < end_time)
    );
    INSERT OR IGNORE INTO respite_bookings_new (id, client_id, service_id, start_time, end_time, status, notes, created_at) SELECT id, client_id, service_id, start_time, end_time, status, notes, created_at FROM respite_bookings;
    DROP TABLE respite_bookings;
    ALTER TABLE respite_bookings_new RENAME TO respite_bookings;

    CREATE TABLE IF NOT EXISTS shifts_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      service_id INTEGER,
      respite_booking_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'INVOICED')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actual_start_time TEXT,
      actual_finish_time TEXT,
      odometer_start_reading TEXT,
      odometer_start_photo TEXT,
      odometer_end_reading TEXT,
      odometer_end_photo TEXT,
      funding_type TEXT DEFAULT 'NDIS',
      provider_travel_km REAL DEFAULT 0,
      provider_travel_cost REAL DEFAULT 0,
      home_care_travel_km REAL DEFAULT 0,
      home_care_travel_total REAL DEFAULT 0,
      abt_km REAL DEFAULT 0,
      abt_cost REAL DEFAULT 0,
      transport_route_log TEXT,
      services_json TEXT CHECK(services_json IS NULL OR services_json = '' OR json_valid(services_json)),
      travel_breakdown TEXT,
      FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
      FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE CASCADE,
      CHECK (start_time < end_time)
    );
    INSERT OR IGNORE INTO shifts_new (id, staff_id, client_id, service_id, respite_booking_id, start_time, end_time, status, notes, created_at, actual_start_time, actual_finish_time, odometer_start_reading, odometer_start_photo, odometer_end_reading, odometer_end_photo, funding_type, provider_travel_km, provider_travel_cost, home_care_travel_km, home_care_travel_total, abt_km, abt_cost, transport_route_log, services_json, travel_breakdown)
    SELECT id, staff_id, client_id, service_id, respite_booking_id, start_time, end_time, status, notes, created_at, actual_start_time, actual_finish_time, odometer_start_reading, odometer_start_photo, odometer_end_reading, odometer_end_photo, funding_type, provider_travel_km, provider_travel_cost, home_care_travel_km, home_care_travel_total, abt_km, abt_cost, transport_route_log, services_json, travel_breakdown FROM shifts;
    DROP TABLE shifts;
    ALTER TABLE shifts_new RENAME TO shifts;

    CREATE TABLE IF NOT EXISTS invoices_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      shift_id INTEGER,
      provider_id INTEGER,
      client_id INTEGER,
      amount REAL NOT NULL CHECK(amount >= 0),
      file_path TEXT,
      status TEXT NOT NULL DEFAULT 'GENERATED' CHECK(status IN ('GENERATED', 'SENT', 'PAID', 'VOID')),
      merged_into_shift_id INTEGER,
      respite_booking_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE SET NULL
    );
    INSERT OR IGNORE INTO invoices_new (id, invoice_number, shift_id, provider_id, client_id, amount, file_path, status, merged_into_shift_id, respite_booking_id, created_at) SELECT id, invoice_number, shift_id, provider_id, client_id, amount, file_path, status, merged_into_shift_id, respite_booking_id, created_at FROM invoices;
    DROP TABLE invoices;
    ALTER TABLE invoices_new RENAME TO invoices;
    CREATE TABLE IF NOT EXISTS quotes_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE,
      client_id INTEGER NOT NULL,
      staff_id INTEGER,
      activity_name TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      services_json TEXT NOT NULL CHECK(json_valid(services_json)),
      amount REAL NOT NULL CHECK(amount >= 0),
      file_path TEXT,
      important_notes TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ACCEPTED', 'REJECTED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
    );
    INSERT OR IGNORE INTO quotes_new (id, quote_number, client_id, staff_id, activity_name, activity_date, services_json, amount, file_path, important_notes, status, created_at) SELECT id, quote_number, client_id, staff_id, activity_name, activity_date, services_json, amount, file_path, important_notes, status, created_at FROM quotes;
    DROP TABLE quotes;
    ALTER TABLE quotes_new RENAME TO quotes;

    CREATE TABLE IF NOT EXISTS files_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      system_name TEXT NOT NULL,
      size INTEGER NOT NULL CHECK(size >= 0),
      uploaded_by INTEGER NOT NULL,
      region TEXT,
      folder_path TEXT DEFAULT '/',
      date_issued TEXT,
      date_expires TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
    );
    INSERT OR IGNORE INTO files_new (id, original_name, system_name, size, uploaded_by, region, folder_path, date_issued, date_expires, created_at) SELECT id, original_name, system_name, size, uploaded_by, region, folder_path, date_issued, date_expires, created_at FROM files;
    DROP TABLE files;
    ALTER TABLE files_new RENAME TO files;

    CREATE TABLE IF NOT EXISTS client_roster_templates_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      staff_id INTEGER NOT NULL,
      service_id INTEGER,
      services_json TEXT CHECK(services_json IS NULL OR services_json = '' OR json_valid(services_json)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
    );
    INSERT OR IGNORE INTO client_roster_templates_new (id, client_id, day_of_week, start_time, end_time, staff_id, service_id, services_json, created_at) SELECT id, client_id, day_of_week, start_time, end_time, staff_id, service_id, services_json, created_at FROM client_roster_templates;
    DROP TABLE client_roster_templates;
    ALTER TABLE client_roster_templates_new RENAME TO client_roster_templates;
  `);

  db.pragma('foreign_keys = ON');
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_shifts_client_id ON shifts(client_id);
      CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
      CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
      CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
      CREATE INDEX IF NOT EXISTS idx_respite_bookings_client_id ON respite_bookings(client_id);
      CREATE INDEX IF NOT EXISTS idx_respite_bookings_service_id ON respite_bookings(service_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_shift_id ON invoices(shift_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_client_roster_templates_client_id ON client_roster_templates(client_id);
      CREATE INDEX IF NOT EXISTS idx_client_roster_templates_staff_id ON client_roster_templates(staff_id);
      CREATE INDEX IF NOT EXISTS idx_client_roster_templates_day ON client_roster_templates(day_of_week);
      CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_staff_id ON quotes(staff_id);
    `);
  } catch(e) {
    logger.error('Failed to create indexes', { error: e.message });
  }
} catch(e) {
  console.error("Migration error hardening tables:", e);
}

try {
  db.exec("ALTER TABLE users ADD COLUMN address TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN dob TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN emergency_contact_name TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN emergency_contact_phone TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN bank_name TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN bank_bsb TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN bank_acc TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN tax_number TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN super_fund_name TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE users ADD COLUMN super_member_number TEXT");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try {
  db.exec("ALTER TABLE shifts ADD COLUMN is_abt_approved BOOLEAN DEFAULT 0");
} catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
try { db.exec("ALTER TABLE clients ADD COLUMN latitude REAL"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE clients ADD COLUMN longitude REAL"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE users ADD COLUMN latitude REAL"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE users ADD COLUMN longitude REAL"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE users ADD COLUMN onboarding_json TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE users ADD COLUMN reset_password_token TEXT"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE users ADD COLUMN reset_password_expires DATETIME"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE shifts ADD COLUMN home_care_travel_km REAL DEFAULT 0"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE shifts ADD COLUMN home_care_travel_total REAL DEFAULT 0"); } catch(e) { /* ignore */ }
try { db.exec("ALTER TABLE invoices ADD COLUMN respite_booking_id INTEGER REFERENCES respite_bookings(id)"); } catch(e) { /* ignore */ }

try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_client ON shifts(client_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_respite_client ON respite_bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_respite_time ON respite_bookings(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_client_templates_client ON client_roster_templates(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_templates_staff ON client_roster_templates(staff_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(shift_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_clients_provider ON clients(provider_id);
    CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
    CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
  `);
} catch(e) {
  logger.error("Error creating database indices:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.set("trust proxy", 1);

  app.use(express.json({ limit: '50mb' }));
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      logger.error('Malformed JSON received', { error: err.message, path: req.path });
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next(err);
  });
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging using Morgan and Winston
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));

  const JWT_SECRET = process.env.JWT_SECRET || 'happyinthehome-secret-key-123';

  // --- Google Routes & Travel Logic ---
  const getGoogleRoutesDistance = async (waypoints: any[]) => {
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

  const getRecordCoordinates = async (tableName: 'clients' | 'users', recordId: string | number, addressText?: string) => {
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

  const calculateScheduledProviderTravel = async (staffId: string | number, newShiftStartTime: string, newShiftEndTime: string, newShiftClientId: string | number, currentShiftId?: string | number) => {
    const staff = db.prepare('SELECT address FROM users WHERE id = ?').get(staffId) as any;
    const client = db.prepare('SELECT address, funding_type FROM clients WHERE id = ?').get(newShiftClientId) as any;
    
    const staffHomeCoords = await getRecordCoordinates('users', staffId, staff?.address);
    const clientCoords = await getRecordCoordinates('clients', newShiftClientId, client?.address);

    const fundingType = client?.funding_type || 'NDIS';
    let totalDist = 0;

    try {
      // Find previous shift today for staff
      const prevShift = db.prepare(`
        SELECT * FROM shifts 
        WHERE staff_id = ? AND end_time <= ? ${currentShiftId ? 'AND id != ?' : ''} AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
        ORDER BY end_time DESC LIMIT 1
      `).get(
        currentShiftId ? [staffId, newShiftStartTime, currentShiftId] : [staffId, newShiftStartTime]
      ) as any;

      // Find next shift today for staff (to determine if last)
      const nextShift = db.prepare(`
        SELECT * FROM shifts 
        WHERE staff_id = ? AND start_time >= ? ${currentShiftId ? 'AND id != ?' : ''} AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
        ORDER BY start_time ASC LIMIT 1
      `).get(
        currentShiftId ? [staffId, newShiftEndTime, currentShiftId] : [staffId, newShiftEndTime]
      ) as any;

      if ((fundingType === 'HCP' || fundingType === 'Home Care' || fundingType === 'HOME_CARE')) {
        // HOME CARE LOGIC
        const prevGapMins = prevShift ? (new Date(newShiftStartTime).getTime() - new Date(prevShift.end_time).getTime()) / 60000 : Infinity;
        if (!prevShift || prevGapMins > 60 || prevGapMins < 0) {
           console.log(`[DEBUG Provider Travel (Schedule)] First shift of day for staff ${staffId} (Home Care). No travel allowed (Private Commute).`);
           totalDist += 0;
        } else {
           const prevClientInfo = db.prepare('SELECT address FROM clients WHERE id = ?').get(prevShift.client_id) as any;
           const prevClientCoords = await getRecordCoordinates('clients', prevShift.client_id, prevClientInfo?.address);
           console.log(`[DEBUG Provider Travel (Schedule)] Subsequent shift (Home Care <= 60m). Dist from Client ${prevShift.client_id} to ${newShiftClientId}`);
           const { distance: dist } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]); 
           console.log(`[DEBUG Provider Travel (Schedule)] Calculated dist: ${dist} km`);
           totalDist += dist;
        }
      } else {
        // NDIS LOGIC
        let totalMins = 0;
        const prevGapMins = prevShift ? (new Date(newShiftStartTime).getTime() - new Date(prevShift.end_time).getTime()) / 60000 : Infinity;
        if (prevShift && prevGapMins >= 0 && prevGapMins <= 60) {
           const prevClientInfo = db.prepare('SELECT address FROM clients WHERE id = ?').get(prevShift.client_id) as any;
           const prevClientCoords = await getRecordCoordinates('clients', prevShift.client_id, prevClientInfo?.address);
           console.log(`[DEBUG Provider Travel (Schedule)] Subsequent shift (${fundingType}). Calculating distance from Previous Client ${prevShift.client_id} to Client ${newShiftClientId}`);
           const { distance: dist, minutes: mins } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]);
           console.log(`[DEBUG Provider Travel (Schedule)] Calculated Provider Travel from Previous Client -> Current Client: ${dist} km, ${mins} mins`);
           totalDist += (dist / 2);
           totalMins += (mins / 2);
        } else {
           console.log(`[DEBUG Provider Travel (Schedule)] First shift of sequence for staff ${staffId} (NDIS). Calculating distance from Home to Client ${newShiftClientId}`);
           const { distance: distHome, minutes: minsHome } = await getGoogleRoutesDistance([staffHomeCoords, clientCoords]);
           console.log(`[DEBUG Provider Travel (Schedule)] Calculated Provider Travel from Home -> Client: ${distHome} km, ${minsHome} mins`);
           totalDist += distHome;
           totalMins += minsHome;
        }

        const nextGapMins = nextShift ? (new Date(nextShift.start_time).getTime() - new Date(newShiftEndTime).getTime()) / 60000 : Infinity;
        if (nextShift && nextGapMins >= 0 && nextGapMins <= 60) {
           console.log(`[DEBUG Provider Travel (Schedule)] Next shift within 60 mins. Splitting outgoing trip 50/50.`);
           const nextClientInfo = db.prepare('SELECT address FROM clients WHERE id = ?').get(nextShift.client_id) as any;
           const nextClientCoords = await getRecordCoordinates('clients', nextShift.client_id, nextClientInfo?.address);
           const { distance: distNext, minutes: minsNext } = await getGoogleRoutesDistance([clientCoords, nextClientCoords]);
           totalDist += (distNext / 2);
           totalMins += (minsNext / 2);
        } else {
           console.log(`[DEBUG Provider Travel (Schedule)] Last shift of sequence for staff ${staffId} (NDIS). Appending Return Home distance: Client ${newShiftClientId} -> Staff Home`);
           const { distance: distReturn, minutes: minsReturn } = await getGoogleRoutesDistance([clientCoords, staffHomeCoords]);
           console.log(`[DEBUG Provider Travel (Schedule)] Return Home calc dist: ${distReturn} km, ${minsReturn} mins`);
           totalDist += distReturn;
           totalMins += minsReturn;
        }
        
        let billableMins = totalMins;
        if (totalMins > 60) {
           billableMins = 60; // MMM6 cap
        }
        return { distance: totalDist, minutes: billableMins }; // NDIS returns object
      }
      
      return { distance: totalDist, minutes: 0 }; // Home Care fallback
    } catch (e) {
      console.error('[DEBUG Provider Travel (Schedule)] Error calculating scheduled provider travel:', e);
      return { distance: 0, minutes: 0 };
    }
  };

  const calculateHomeCareTravel = async (shift: any) => {
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
          
          const { distance: dist } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]); 
          totalDist += dist;
          console.log(`Home Care: [${prevClientName}] to [${clientName}] | Gap: ${gapMins}min | Result: ${dist}km`);
          
          const routeDesc = `${prevClientName} (${prevClientInfo?.address}) to ${clientName} (${client?.address})`;
          routeLogs.push({ description: routeDesc, distance: dist, waypoints: [prevClientCoords, clientCoords], addressStart: prevClientInfo?.address, addressEnd: client?.address, homeCareTravel: true });
        } else {
          console.log(`Home Care Reset: Gap of ${gapMins}min detected. Treating [${clientName}] as a new private commute.`);
          routeLogs.push({ description: 'No billable provider travel for this shift (Private Commute)', distance: 0, waypoints: [], homeCareTravel: true });
        }
      }

      // Persist the result to database
      const distToSave = Number(totalDist.toFixed(2));
      const costToSave = Number(totalDist.toFixed(2)) * rate;

      let currentLogObj: any = {};
      if (shift.transport_route_log) {
         try { currentLogObj = JSON.parse(shift.transport_route_log); } catch(e) {}
      }
      currentLogObj.homeCareTravel = {
          calculatedAt: new Date().toISOString(),
          distance: distToSave,
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

  const calculateProviderTravel = async (shift: any) => {
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

    const formatCoords = (coords: any) => coords && coords.length === 2 ? `[${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}]` : '';
    const staffHomeStr = `Staff Home (${staff?.address || 'Unknown'}) ${formatCoords(staffHomeCoords)}`;
    const clientHomeStr = `Client Home (${client?.address || 'Unknown'}) ${formatCoords(clientCoords)}`;

    try {
      // Find previous shift today for staff (Consecutive NDIS shifts)
      const prevShift = db.prepare(`
        SELECT * FROM shifts 
        WHERE staff_id = ? 
        AND end_time <= ? 
        AND id != ? 
        AND status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED')
        AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
        ORDER BY end_time DESC LIMIT 1
      `).get(shift.staff_id, shift.start_time, shift.id) as any;

      // Find next shift today for staff
      const nextShift = db.prepare(`
        SELECT * FROM shifts 
        WHERE staff_id = ? 
        AND start_time >= ? 
        AND id != ? 
        AND status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED')
        AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
        ORDER BY start_time ASC LIMIT 1
      `).get(shift.staff_id, shift.end_time, shift.id) as any;

      let totalDist = 0;
      let totalMins = 0;
      let routeLogs: any[] = [];

      // NDIS LOGIC
      // Incoming Trip
      const prevGapMins = prevShift ? (new Date(shift.start_time).getTime() - new Date(prevShift.end_time).getTime()) / 60000 : Infinity;
      
      if (prevShift && prevGapMins >= 0 && prevGapMins <= 60) {
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
      const nextGapMins = nextShift ? (new Date(nextShift.start_time).getTime() - new Date(shift.end_time).getTime()) / 60000 : Infinity;
      
      if (nextShift && nextGapMins >= 0 && nextGapMins <= 60) {
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

  const recalculateDayTravelForStaff = async (staffId: number, dateStr: string) => {
    try {
      console.log(`[DEBUG CASCADE] INIT recalculateDayTravelForStaff staffId: ${staffId}, dateStr: ${dateStr}`);
      const startTimeRangeStart = new Date(new Date(dateStr).getTime() - 14 * 3600 * 1000).toISOString();
      const startTimeRangeEnd = new Date(new Date(dateStr).getTime() + 14 * 3600 * 1000).toISOString();

      const shifts = db.prepare(`
        SELECT s.*, 
               c.address as client_address
        FROM shifts s
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.staff_id = ? AND s.start_time >= ? AND s.start_time <= ? AND s.status NOT IN ('CANCELLED', 'DELETED', 'deleted')
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

        if (isHomeCare) {
           let totalDistance = 0;
           let travelBreakdown: string[] = [];
           const { distance: dist1 } = await getGoogleRoutesDistance([staffHomeCoords, currentShiftCoords]);
           const { distance: dist2 } = await getGoogleRoutesDistance([currentShiftCoords, staffHomeCoords]);
           totalDistance = Number(dist1) + Number(dist2);
           travelBreakdown.push(`[HCP Return-to-Base]: Home to Client = ${Number(dist1).toFixed(2)} km`);
           travelBreakdown.push(`[HCP Return-to-Base]: Client to Home = ${Number(dist2).toFixed(2)} km`);

           // Update services_json so the UI reflects the math
           let servicesData = [];
           if (currentShift.services_json) {
               try { servicesData = JSON.parse(currentShift.services_json); } catch(e) {}
               for (const sData of servicesData) {
                   const service = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;
                   if (service && service.name && service.name.toLowerCase().includes('provider travel')) {
                       sData.qtyOverride = parseFloat(totalDistance.toFixed(2));
                   }
               }
           }
           
           db.prepare('UPDATE shifts SET provider_travel_km = ?, travel_breakdown = ?, services_json = ? WHERE id = ?').run(
              totalDistance, JSON.stringify(travelBreakdown), JSON.stringify(servicesData), currentShift.id
           );
        } else {
           const prevShift = shifts[i - 1] || null;
           const nextShift = shifts[i + 1] || null;

           let prevCoords = null;
           if (prevShift) {
              const prevAddress = db.prepare('SELECT address FROM clients WHERE id = ?').get(prevShift.client_id) as any;
              let rawPrevCoords = await getRecordCoordinates('clients', prevShift.client_id, prevAddress?.address);
              prevCoords = rawPrevCoords ? [Number(rawPrevCoords[0]), Number(rawPrevCoords[1])] : [0,0];
           }

           const getGoogleRoutesDistanceWrapper = async (wp1: any, wp2: any) => {
               const res = await getGoogleRoutesDistance([wp1, wp2]);
               return res.distance;
           };

           await (async () => {
               const getGoogleRoutesDistance = getGoogleRoutesDistanceWrapper;
               
// --- NDIS CASCADE LOGIC ---
const currentStart = new Date(currentShift.start_time).getTime();
const currentEnd = new Date(currentShift.end_time).getTime();
const prevEnd = prevShift ? new Date(prevShift.end_time).getTime() : 0;
const nextStart = nextShift ? new Date(nextShift.start_time).getTime() : 0;

const gapToPrev = prevShift ? Math.abs((currentStart - prevEnd) / (1000 * 60)) : Infinity;
const gapToNext = nextShift ? Math.abs((nextStart - currentEnd) / (1000 * 60)) : Infinity;

console.log(`[DEBUG CASCADE] Shift ID: ${currentShift.id} | gapToPrev: ${gapToPrev} | gapToNext: ${gapToNext}`);

let totalDistance = 0;
let travelBreakdown = [];

// LEG 1 (Arrival)
if (!prevShift || gapToPrev > 60) {
    const dist = await getGoogleRoutesDistance(staffHomeCoords, currentShiftCoords);
    totalDistance += dist;
    travelBreakdown.push(`[100% Commute]: Home to Client = ${dist.toFixed(2)} km`);
} else {
    const fullDist = await getGoogleRoutesDistance(prevCoords, currentShiftCoords);
    const splitDist = fullDist / 2;
    totalDistance += splitDist;
    travelBreakdown.push(`[50% Transitional Split]: Prev Client to Current = ${splitDist.toFixed(2)} km`);
}

// LEG 2 (Departure)
if (!nextShift || gapToNext > 60) {
    const dist = await getGoogleRoutesDistance(currentShiftCoords, staffHomeCoords);
    totalDistance += dist;
    travelBreakdown.push(`[100% Return Trip]: Client to Home = ${dist.toFixed(2)} km`);
} else {
    const nextAddress = db.prepare('SELECT address FROM clients WHERE id = ?').get(nextShift.client_id) as any;
    let rawNextCoords = await getRecordCoordinates('clients', nextShift.client_id, nextAddress?.address);
    let nextCoords = rawNextCoords ? [Number(rawNextCoords[0]), Number(rawNextCoords[1])] : [0,0];

    const fullDist = await getGoogleRoutesDistance(currentShiftCoords, nextCoords);
    const splitDist = fullDist / 2;
    totalDistance += splitDist;
    travelBreakdown.push(`[50% Transitional Split]: Current Client to Next = ${splitDist.toFixed(2)} km`);
}
// --- END NDIS CASCADE LOGIC ---

               // Update services_json so the UI reflects the math
               const latestShift = db.prepare('SELECT services_json FROM shifts WHERE id = ?').get(currentShift.id) as any;
               let servicesData = [];
               if (latestShift && latestShift.services_json) {
                   try { 
                       servicesData = JSON.parse(latestShift.services_json); 
                       console.log(`[DEBUG CASCADE] NDIS services_json found ${servicesData.length} entries for shift ${currentShift.id}`);
                   } catch(e) {
                       console.error('[DEBUG CASCADE] NDIS JSON parse error:', e);
                   }
                   for (const sData of servicesData) {
                       const service = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;
                       console.log(`[DEBUG CASCADE] NDIS checking service: "${service?.name}" for sData.serviceId: ${sData.serviceId}`);
                       if (service && service.name && service.name.toLowerCase().includes('provider travel')) {
                           sData.qtyOverride = parseFloat(totalDistance.toFixed(2));
                           console.log(`[DEBUG CASCADE] NDIS UPDATED qtyOverride to ${sData.qtyOverride} for shift ${currentShift.id}`);
                       }
                   }
               }

               console.log(`[DEBUG CASCADE] NDIS writing totalDistance: ${totalDistance} to shift ${currentShift.id}. Final servicesData length: ${servicesData.length}`);
               db.prepare('UPDATE shifts SET provider_travel_km = ?, travel_breakdown = ?, services_json = ? WHERE id = ?').run(
                  totalDistance, JSON.stringify(travelBreakdown), JSON.stringify(servicesData), currentShift.id
               );
               const verify = db.prepare('SELECT services_json FROM shifts WHERE id = ?').get(currentShift.id) as any;
               console.log(`[DEBUG CASCADE] VERIFY shift ${currentShift.id} services_json after update: ${verify?.services_json}`);
           })();
        }
      }
    } catch (e) {
      console.error('[DEBUG CASCADE] Error recalculating day travel:', e);
    }
  };

  const recalculateStaffTravelForDate = async (staffId: string | number, dateIso: string) => {
    try {
      // 1. Get all remaining active shifts for staffId on dateIso
      const shifts = db.prepare(`
        SELECT * FROM shifts 
        WHERE staff_id = ? AND start_time >= datetime(?, '-14 hours') AND start_time <= datetime(?, '+14 hours') AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
        ORDER BY start_time ASC
      `).all(staffId, dateIso, dateIso) as any[];

      if (!shifts || shifts.length === 0) return;

      console.log(`[DEBUG Recalculate] Recalculating travel for staff ${staffId} on ${dateIso}. Found ${shifts.length} shift(s).`);

      for (const shift of shifts) {
        if (shift.status === 'COMPLETED') {
          // Re-calculate actual Provider Travel
          const pTravel = await calculateProviderTravel(shift);
          const hcTravel = await calculateHomeCareTravel(shift);
          
          let updatedServicesJson = shift.services_json;
          if (updatedServicesJson) {
            try {
              const servicesData = JSON.parse(updatedServicesJson);
              if (Array.isArray(servicesData)) {
                let changed = false;
                for (const sData of servicesData) {
                  const service = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;
                  if (service && service.name) {
                    const name = service.name.toLowerCase();
                    if (name.includes('provider travel')) {
                      let billableValue = pTravel.distance; // Fallback
                      if (pTravel.minutes !== undefined && !name.includes('non-labour')) {
                         const unitStr = (service.unit || 'Hour').toLowerCase();
                         billableValue = (unitStr.includes('minute') || unitStr === 'min') ? pTravel.minutes : pTravel.minutes / 60;
                      }
                      sData.qtyOverride = parseFloat(billableValue.toFixed(2));
                      changed = true;
                    } else if (name.includes('activity based transport') && shift.abt_km !== undefined) {
                      sData.qtyOverride = parseFloat(Number(shift.abt_km).toFixed(2));
                      changed = true;
                    }
                  }
                }
                if (changed) {
                  updatedServicesJson = JSON.stringify(servicesData);
                }
              }
            } catch (e) {
              console.error("Failed to parse services_json during recalculate:", e);
            }
          }
          
          db.prepare('UPDATE shifts SET provider_travel_km = ?, provider_travel_cost = ?, home_care_travel_km = ?, home_care_travel_total = ?, services_json = ? WHERE id = ?').run(pTravel.distance, pTravel.cost, hcTravel.distance, hcTravel.cost, updatedServicesJson, shift.id);
        } else {
          // Re-calculate scheduled Provider Travel (DRAFT, PUBLISHED, IN_PROGRESS)
          if (!shift.services_json) continue;
          let servicesData;
          try { servicesData = JSON.parse(shift.services_json); } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
          if (servicesData && Array.isArray(servicesData)) {
            let updated = false;
            for (const sData of servicesData) {
              const service = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;
              if (service && service.name && service.name.toLowerCase().includes('provider travel')) {
                const schedTravel = await calculateScheduledProviderTravel(shift.staff_id, shift.start_time, shift.end_time, shift.client_id, shift.id);
                let billableValue = schedTravel.distance;
                if (schedTravel.minutes !== undefined && schedTravel.minutes > 0 && !service.name.toLowerCase().includes('non-labour')) {
                   const unitStr = (service.unit || 'Hour').toLowerCase();
                   billableValue = (unitStr.includes('minute') || unitStr === 'min') ? schedTravel.minutes : schedTravel.minutes / 60;
                }
                sData.qtyOverride = parseFloat(billableValue.toFixed(2));
                updated = true;
              }
            }
            if (updated) {
               db.prepare('UPDATE shifts SET services_json = ? WHERE id = ?').run(JSON.stringify(servicesData), shift.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('[DEBUG Recalculate] Error recalculating staff travel:', e);
    }
  };

  const getInvoiceDataForShift = (shiftId: number) => {
      const shift = db.prepare(`
        SELECT s.*, 
               c.first_name as c_fn, c.last_name as c_ln, c.ndis_number, c.address as c_address, c.provider_id,
               srv.rate, srv.name as service_name, srv.code as service_code, srv.type as service_type, srv.unit as service_unit,
               u.first_name as s_fn, u.last_name as s_ln,
               p.company_name as plan_manager_name, p.email as plan_manager_email, p.address as plan_manager_address
        FROM shifts s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN services srv ON s.service_id = srv.id
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE s.id = ?
      `).get(shiftId) as any;

      if (!shift) return null;

      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: Record<string, any> = {};
      settingsRows.forEach(r => {
        try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; }
      });

      let rawTz1 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz1 === 'string' ? rawTz1.replace(/['"]+/g, '') : rawTz1;

      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const hours = Math.abs(end.getTime() - start.getTime()) / 36e5;

      const dateFormatterAPI = getSafeDateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const yyyymmdd = dateFormatterAPI.format(start).replace(/-/g, '');

      const isHC = (shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE');
      let invoicePrefix = isHC ? settingsMap.hcInvoicePrefix : settingsMap.ndisInvoicePrefix;
      if (!invoicePrefix) {
         invoicePrefix = isHC ? 'HC-' : 'INV-';
      }
      const invoiceNum = `${invoicePrefix}${yyyymmdd}-${String(shiftId).padStart(4, '0')}`;
      
      const shiftDateFormatter = getSafeDateTimeFormat('en-GB', {
        timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric'
      });
      const shiftDateStr = shiftDateFormatter.format(start);
      
      const staffName = `${shift.s_fn} ${shift.s_ln}`;
      
      const timeFormatter = getSafeDateTimeFormat('en-US', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit'
      });
      const timeStr = `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;

      const lineItems: any[] = [];
      let subtotal = 0;

      let servicesData: any[] = [];
      try {
        if (shift.services_json) {
          servicesData = JSON.parse(shift.services_json);
        }
      } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

      if (servicesData.length > 0) {
        servicesData.forEach(sd => {
          const srv = db.prepare('SELECT * FROM services WHERE id = ?').get(sd.serviceId) as any;
          if (srv) {
            let qty = (sd.qtyOverride !== undefined && sd.qtyOverride !== '') ? Number(sd.qtyOverride) : (srv.unit === 'Hour' ? hours : 1);
            if (qty > 0) {
              let baseRate = Number(srv.rate || 0);
              let dayOfWeek = start.getDay();
              let finalRate = baseRate;
              
              if (srv.type === 'HOME_CARE' && srv.rates_json) {
                 try {
                    const hd = new Holidays('AU', settingsMap.state || 'WA');
                    const localDateStr = dateFormatterAPI.format(start);
                    const isPublicHoliday = hd.getHolidays(start.getFullYear()).some((h: any) => h.type === 'public' && h.date.startsWith(localDateStr));

                    const rates = JSON.parse(srv.rates_json);
                    if (isPublicHoliday && rates['Public Holiday']) finalRate = Number(rates['Public Holiday']);
                    else if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
                    else if (dayOfWeek === 6 && rates['Saturday']) finalRate = Number(rates['Saturday']);
                    else if (rates['Weekday']) finalRate = Number(rates['Weekday']);
                 } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
              } else if (srv.type === 'NDIS' && srv.rates_json) {
                 try {
                    const rates = JSON.parse(srv.rates_json);
                    const region = settingsMap.ndisRegion || 'NSW';
                    if (rates[region] !== undefined) finalRate = Number(rates[region]);
                 } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
              }

              const amt = qty * finalRate;
              subtotal += amt;
              
              const isTravel = srv.name.toLowerCase().includes('travel') || srv.name.toLowerCase().includes('transport');
              
              let mappedUnit = srv.unit || 'H';
              if (mappedUnit === 'Hour') mappedUnit = 'H';
              if (srv.name.toLowerCase().includes('activity based transport') || srv.name.toLowerCase().includes('provider travel')) {
                mappedUnit = 'Kilometre';
              }

              lineItems.push({
                date: sd.date || shiftDateStr,
                time: sd.time || timeStr,
                serviceName: srv.name,
                code: isHC ? srv.id : srv.code,
                metadata: sd.staffName ? `Provided by ${sd.staffName}` : `Provided by ${staffName}`,
                qty: parseFloat(qty.toFixed(2)),
                unit: mappedUnit,
                rate: parseFloat(finalRate.toFixed(2)),
                amount: parseFloat(amt.toFixed(2))
              });
            }
          }
        });
      } else if (shift.rate) {
        let fallbackUnit = shift.service_unit || 'H';
        if (fallbackUnit === 'Hour') fallbackUnit = 'H';
        if (shift.service_name && (shift.service_name.toLowerCase().includes('activity based transport') || shift.service_name.toLowerCase().includes('provider travel'))) {
            fallbackUnit = 'Kilometre';
        }

        const amt = hours * shift.rate;
        subtotal += amt;
        lineItems.push({
           date: shiftDateStr,
           time: timeStr,
           serviceName: shift.service_name,
           code: shift.service_code,
           metadata: `Provided by ${staffName}`,
           qty: parseFloat(hours.toFixed(2)),
           unit: fallbackUnit,
           rate: shift.rate,
           amount: amt
        });
        
        if (shift.provider_travel_km > 0) {
           const travelCost = shift.provider_travel_cost;
           const travelRate = shift.provider_travel_km > 0 ? (travelCost / shift.provider_travel_km) : 1.00;
           subtotal += travelCost;
           lineItems.push({
             date: shiftDateStr,
             time: timeStr,
             serviceName: 'Provider travel - non-labour costs',
             code: '09_799_0117_6_3',
             metadata: `Provided by ${staffName}`,
             qty: shift.provider_travel_km,
             unit: 'Kilometre',
             rate: travelRate,
             amount: travelCost
           });
        }
        if (shift.abt_km > 0) {
           const abtCost = shift.abt_cost;
           const abtRate = shift.abt_km > 0 ? (abtCost / shift.abt_km) : 1.00;
           subtotal += abtCost;
           lineItems.push({
             date: shiftDateStr,
             time: timeStr,
             serviceName: 'Activity Based Transport',
             code: '09_591_0117_6_3',
             metadata: `Provided by ${staffName}`,
             qty: shift.abt_km,
             unit: 'Kilometre',
             rate: abtRate,
             amount: abtCost
           });
        }
      }

      const invoiceDateFormatter = getSafeDateTimeFormat('en-GB', {
        timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric'
      });

      // Try to find if an invoice already exists to use its created_at date
      let finalInvoiceDateStr = invoiceDateFormatter.format(new Date());
      try {
        const invRow = db.prepare('SELECT created_at FROM invoices WHERE shift_id = ?').get(shiftId) as any;
        if (invRow && invRow.created_at) {
          finalInvoiceDateStr = invoiceDateFormatter.format(new Date(invRow.created_at));
        } else {
          finalInvoiceDateStr = invoiceDateFormatter.format(new Date(shift.actual_finish_time || shift.end_time));
        }
      } catch(e) {
        finalInvoiceDateStr = invoiceDateFormatter.format(new Date(shift.actual_finish_time || shift.end_time));
      }

      return {
        shift,
        settingsMap,
        invoiceNum,
        invoiceDate: finalInvoiceDateStr,
        lineItems,
        subtotal
      };
  };

  const getInvoiceDataForRespiteBooking = (respiteBookingId: number) => {
      const rb = db.prepare(`
        SELECT rb.*, c.first_name as c_fn, c.last_name as c_ln, c.ndis_number, c.address as c_address, c.provider_id, c.funding_type,
               p.company_name as plan_manager_name, p.email as plan_manager_email, p.address as plan_manager_address
        FROM respite_bookings rb
        LEFT JOIN clients c ON rb.client_id = c.id
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE rb.id = ?
      `).get(respiteBookingId) as any;

      if (!rb) return null;

      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: Record<string, any> = {};
      settingsRows.forEach(r => {
        try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; }
      });
      let rawTz2 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz2 === 'string' ? rawTz2.replace(/['"]+/g, '') : rawTz2;

      const dateFormatterAPI = getSafeDateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const shiftDateFormatter = getSafeDateTimeFormat('en-GB', {
        timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric'
      });

      const start = new Date(rb.start_time);
      const end = new Date(rb.end_time);
      const yyyymmdd = dateFormatterAPI.format(start).replace(/-/g, '');

      const isHC = (rb.funding_type === 'HCP' || rb.funding_type === 'Home Care' || rb.funding_type === 'HOME_CARE');
      let invoicePrefix = isHC ? settingsMap.hcInvoicePrefix : settingsMap.ndisInvoicePrefix;
      if (!invoicePrefix) invoicePrefix = isHC ? 'HC-' : 'INV-';
      
      const invoiceNum = `${invoicePrefix}RB${yyyymmdd}-${String(respiteBookingId).padStart(4, '0')}`;

      // Fetch child shifts staff details for daily distribution
      const shifts = db.prepare(`
        SELECT s.start_time, s.end_time, s.service_id, s.services_json, u.first_name as s_fn, u.last_name as s_ln
        FROM shifts s
        LEFT JOIN users u ON s.staff_id = u.id
        WHERE s.respite_booking_id = ?
        ORDER BY s.start_time ASC
      `).all(respiteBookingId) as any[];

      const dailyMap: Record<string, { staff: Set<string>, sStart: Date, serviceId: number | null }> = {};
      
      for (const s of shifts) {
          const sStart = new Date(s.start_time);
          const shiftDateStr = shiftDateFormatter.format(sStart);
          
          if (!dailyMap[shiftDateStr]) {
              dailyMap[shiftDateStr] = { staff: new Set<string>(), sStart: sStart, serviceId: null };
          }
          if (s.s_fn) dailyMap[shiftDateStr].staff.add(`${s.s_fn} ${s.s_ln}`);
          
          if (!dailyMap[shiftDateStr].serviceId) {
             let srvId = null;
             if (s.services_json) {
                 try {
                    const pj = JSON.parse(s.services_json);
                    if (pj && pj.length > 0) srvId = pj[0].serviceId;
                 } catch(e){}
             }
             if (!srvId && s.service_id) srvId = s.service_id;
             if (srvId) dailyMap[shiftDateStr].serviceId = srvId;
          }
      }

      const allLineItems: any[] = [];
      let subtotal = 0;
      
      const hd = new Holidays('AU', settingsMap.state || 'WA');

      for (const [dateStr, dayData] of Object.entries(dailyMap)) {
         const staffList = Array.from(dayData.staff);
         const sStart = dayData.sStart;
         
         let srvId = dayData.serviceId;
         if (!srvId && rb.service_id) srvId = rb.service_id;
         
         let finalRate = 0;
         let srvName = 'STA / Respite';
         let srvCode = 'N/A';
         let dayCategory = 'Weekday';

         const dayOfWeek = sStart.getDay();
         const ymd = dateFormatterAPI.format(sStart);
         const isPubHol = hd.getHolidays(sStart.getFullYear()).some((h: any) => h.type === 'public' && h.date.startsWith(ymd));
         
         if (isPubHol) dayCategory = 'Public Holiday';
         else if (dayOfWeek === 0) dayCategory = 'Sunday';
         else if (dayOfWeek === 6) dayCategory = 'Saturday';
         
         if (srvId) {
             const srv = db.prepare('SELECT * FROM services WHERE id = ?').get(srvId) as any;
             if (srv) {
                 srvName = srv.name;
                 srvCode = isHC ? srv.id : (srv.code || 'N/A');
                 
                 let baseRate = Number(srv.rate || 0);
                 
                 // Look up custom rate for this client/service
                 const cs = db.prepare('SELECT custom_rate FROM client_services WHERE client_id = ? AND service_id = ?').get(rb.client_id, srvId) as any;
                 if (cs && cs.custom_rate !== null && cs.custom_rate !== undefined) {
                     baseRate = Number(cs.custom_rate);
                 }
                 
                 finalRate = baseRate;
                 if (srv.type === 'HOME_CARE' && srv.rates_json) {
                    try {
                        const rates = JSON.parse(srv.rates_json);
                        if (isPubHol && rates['Public Holiday']) finalRate = Number(rates['Public Holiday']);
                        else if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
                        else if (dayOfWeek === 6 && rates['Saturday']) finalRate = Number(rates['Saturday']);
                        else if (rates['Weekday']) finalRate = Number(rates['Weekday']);
                    } catch(e) {}
                 } else if (srv.type === 'NDIS' && srv.rates_json) {
                    try {
                        const rates = JSON.parse(srv.rates_json);
                        const region = settingsMap.ndisRegion || 'NSW';
                        if (rates[region] !== undefined) finalRate = Number(rates[region]);
                    } catch(e) {}
                 }
             }
         }
         
         const description = `${srvName} - ${dayCategory}`;
         
         allLineItems.push({
            date: dateStr,
            time: '24 Hours',
            serviceName: description,
            code: srvCode,
            metadata: staffList.length > 0 ? `Provided by ${staffList.join(', ')}` : '',
            qty: 1,
            unit: 'Day',
            rate: finalRate,
            amount: finalRate
         });
         subtotal += finalRate;
      }

      if (allLineItems.length === 0) return null;

      const invoiceDateFormatter = getSafeDateTimeFormat('en-GB', {
        timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric'
      });
      
      let finalInvoiceDateStr = invoiceDateFormatter.format(new Date());
      try {
        const invRow = db.prepare('SELECT created_at FROM invoices WHERE respite_booking_id = ?').get(respiteBookingId) as any;
        if (invRow && invRow.created_at) {
          finalInvoiceDateStr = invoiceDateFormatter.format(new Date(invRow.created_at));
        } else {
          finalInvoiceDateStr = invoiceDateFormatter.format(new Date(rb.end_time));
        }
      } catch(e) {
        finalInvoiceDateStr = invoiceDateFormatter.format(new Date(rb.end_time));
      }

      return {
        shift: rb,
        settingsMap,
        invoiceNum,
        invoiceDate: finalInvoiceDateStr,
        lineItems: allLineItems,
        subtotal
      };
  };

  const generateInvoiceForRespiteBooking = (respiteBookingId: number) => {
    try {
      const data = getInvoiceDataForRespiteBooking(respiteBookingId);
      if (!data) return;
      if (data.lineItems.length === 0) return;

      const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal } = data;
      const fileName = `${invoiceNum}.pdf`;

      const existing = db.prepare('SELECT id FROM invoices WHERE respite_booking_id = ?').get(respiteBookingId);
      if (existing) {
        db.prepare('UPDATE invoices SET invoice_number=?, amount=?, file_path=?, status=? WHERE respite_booking_id=?').run(
           invoiceNum, subtotal, fileName, 'GENERATED', respiteBookingId
        );
      } else {
        db.prepare('INSERT INTO invoices (invoice_number, respite_booking_id, client_id, amount, file_path, status) VALUES (?, ?, ?, ?, ?, ?)').run(
          invoiceNum,
          respiteBookingId,
          shift.client_id,
          subtotal,
          fileName,
          'GENERATED'
        );
      }
    } catch (e) {
      console.error('Failed to generate invoice for respite:', e);
    }
  };

  // Backfill existing invoices
  try {
    const existingInvoices = db.prepare('SELECT id, shift_id FROM invoices WHERE invoice_number IS NULL').all() as any[];
    if (existingInvoices.length > 0) {
      console.log(`Backfilling ${existingInvoices.length} invoices...`);
      existingInvoices.forEach(inv => {
        try {
          const data = getInvoiceDataForShift(inv.shift_id);
          if (data && data.invoiceNum) {
            db.prepare('UPDATE invoices SET invoice_number = ? WHERE id = ?').run(data.invoiceNum, inv.id);
          }
        } catch (err) {
          console.error(`Failed to backfill invoice ${inv.id}:`, err);
        }
      });
    }

    // Fix respite invoices with $0 amounts
    const zeroRespiteInvoices = db.prepare('SELECT id, respite_booking_id FROM invoices WHERE respite_booking_id IS NOT NULL AND amount = 0').all() as any[];
    if (zeroRespiteInvoices.length > 0) {
      console.log(`Recalculating ${zeroRespiteInvoices.length} respite invoices with $0.00 amount...`);
      zeroRespiteInvoices.forEach(inv => {
        try {
          const data = getInvoiceDataForRespiteBooking(inv.respite_booking_id);
          if (data && data.subtotal !== undefined) {
            db.prepare('UPDATE invoices SET amount = ? WHERE id = ?').run(data.subtotal, inv.id);
          }
        } catch (err) {
          console.error(`Failed to update respite invoice ${inv.id}:`, err);
        }
      });
    }
  } catch (e) {
    console.warn('Invoices backfill failed:', e);
  }

  const generateInvoiceForShift = (shiftId: number) => {
    try {
      const data = getInvoiceDataForShift(shiftId);
      if (!data) return;
      if (data.lineItems.length === 0) return;

      const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal } = data;
      const fileName = `${invoiceNum}.pdf`;

      // Just update DB record, no need to write to fs since it's on-the-fly now.
      const existing = db.prepare('SELECT id FROM invoices WHERE shift_id = ?').get(shiftId);
      if (existing) {
        db.prepare('UPDATE invoices SET invoice_number=?, amount=?, file_path=?, status=? WHERE shift_id=?').run(
           invoiceNum, subtotal, fileName, 'GENERATED', shiftId
        );
      } else {
        db.prepare('INSERT INTO invoices (invoice_number, shift_id, client_id, amount, file_path, status) VALUES (?, ?, ?, ?, ?, ?)').run(
          invoiceNum,
          shiftId,
          shift.client_id,
          subtotal,
          fileName,
          'GENERATED'
        );
      }
    } catch (e) {
      console.error('Failed to generate invoice:', e);
    }
  };

  // Seed default admin if table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('password123', 10);
    db.prepare('INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)').run('admin@happyinthehome.com', hash, 'ADMIN', 'System', 'Admin');
    console.log('Seeded default admin user: admin@happyinthehome.com / password123');
  }

  // Seed default settings if empty
  const populateDefaultSettings = () => {
    const defaults: Record<string, any> = {
      bankName: 'National Australia Bank',
      bankAccountName: 'Happy in the Home',
      bankBsb: '086-554',
      bankAcc: '506627847',
      ndisRegion: 'Remote'
    };
    
    const stmtInsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
      for (const [k, v] of Object.entries(defaults)) {
        stmtInsert.run(k, JSON.stringify(v));
      }
    })();
  };
  populateDefaultSettings();

  try {
    db.exec(`UPDATE files SET folder_path = '/Settings' WHERE original_name LIKE '%NDIS-Support Catalogue%' OR original_name LIKE '%Home Care pricing%'`);
  } catch (e: any) {
    logger.error('Failed to move initial files to Settings folder', e);
  }

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth Routes
  app.post('/api/login', loginRateLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    // Also attach safe settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }), {});

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
      settings
    });
  });

  // --- Notifications API ---
  app.get('/api/notifications', authenticateToken, (req: any, res: any) => {
     try {
        const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
        res.json(notifs);
     } catch (e: any) {
        logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
     }
  });

  app.put('/api/notifications/read-all', authenticateToken, (req: any, res: any) => {
     try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
        res.json({ success: true });
     } catch (e: any) {
        logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
     }
  });

  app.put('/api/notifications/:id/read', authenticateToken, (req: any, res: any) => {
     try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        res.json({ success: true });
     } catch (e: any) {
        logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
     }
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        // Return 200 to prevent email enumeration
        return res.json({ success: true, message: 'If that email exists, we have sent a reset link to it.' });
      }

      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      db.prepare('UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?').run(token, expires, email);

      const appUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
      const resetLink = `${appUrl}/reset-password/${token}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'support@happyinthehome.com',
        to: email,
        subject: 'Password Reset - Happy in the Home',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
`Please click on the following link, or paste this into your browser to complete the process. This link will expire in 1 hour:\n\n` +
`${resetLink}\n\n` +
`If you did not request this, please ignore this email and your password will remain unchanged.\n` +
`Regards,\nHappy in the Home Team`,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'If that email exists, we have sent a reset link to it.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
      const user = db.prepare('SELECT id, reset_password_expires FROM users WHERE reset_password_token = ?').get(token) as any;
      
      if (!user) {
        return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      }

      if (new Date(user.reset_password_expires) < new Date()) {
         return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      
      db.prepare('UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?').run(passwordHash, user.id);

      res.json({ success: true, message: 'Password has been successfully reset. You can now login.' });
    } catch (error) {
      console.error('Reset password error:', error);
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/me', authenticateToken, (req: any, res: any) => {
    const user = db.prepare('SELECT id, email, role, first_name, last_name FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Also attach safe settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }), {});

    res.json({
      user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
      settings
    });
  });

  app.get('/api/profile', authenticateToken, (req: any, res: any) => {
    const user = db.prepare(`
      SELECT 
        id, email, role, first_name as firstName, last_name as lastName, 
        phone, address, dob, 
        emergency_contact_name as emergencyContactName, 
        emergency_contact_phone as emergencyContactPhone, 
        bank_name as bankName, bank_bsb as bankBsb, bank_acc as bankAcc, 
        tax_number as taxNumber, super_fund_name as superFundName, 
        super_member_number as superMemberNumber 
      FROM users WHERE id = ?
    `).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  app.put('/api/profile', authenticateToken, (req: any, res: any) => {
    const { 
      firstName, lastName, phone, address, dob, 
      emergencyContactName, emergencyContactPhone, 
      bankName, bankBsb, bankAcc, taxNumber, 
      superFundName, superMemberNumber, password 
    } = req.body;

    let query = `
      UPDATE users SET 
        first_name = ?, last_name = ?, phone = ?, address = ?, dob = ?, 
        emergency_contact_name = ?, emergency_contact_phone = ?, 
        bank_name = ?, bank_bsb = ?, bank_acc = ?, tax_number = ?, 
        super_fund_name = ?, super_member_number = ?
    `;
    const params: any[] = [
      firstName, lastName, phone, address, dob, 
      emergencyContactName, emergencyContactPhone, 
      bankName, bankBsb, bankAcc, taxNumber, 
      superFundName, superMemberNumber
    ];

    if (password) {
      query += ', password_hash = ?';
      params.push(bcrypt.hashSync(password, 10));
    }

    query += ' WHERE id = ?';
    params.push(req.user.id);

    try {
      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      res.status(400).json({ error: e.message });
    }
  });

  // --- API Routes Placeholder ---
  app.get('/api/public-settings', (req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?)').all('websiteLogo', 'businessName', 'pwaIcon192', 'pwaIcon512') as any[];
      const settings: any = {};
      rows.forEach(r => {
        try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
      });
      res.json(settings);
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  const persistentAssetsDir = path.join(process.cwd(), 'uploads', 'assets');
  if (!fs.existsSync(persistentAssetsDir)) {
    fs.mkdirSync(persistentAssetsDir, { recursive: true });
  }

  // Migrate old assets if they exist (for non-docker setups)
  const oldAssetsDir = path.join(process.cwd(), 'assets');
  if (fs.existsSync(oldAssetsDir)) {
    try {
      fs.readdirSync(oldAssetsDir).forEach(file => {
        const oldPath = path.join(oldAssetsDir, file);
        const newPath = path.join(persistentAssetsDir, file);
        if (!fs.existsSync(newPath) && fs.statSync(oldPath).isFile()) {
           fs.copyFileSync(oldPath, newPath);
        }
      });
    } catch (err) {
      console.error('Error migrating old assets:', err);
    }
  }

  const assetsDir = persistentAssetsDir;

  app.get('/api/assets/:filename', (req: any, res: any) => {
    const filePath = path.join(assetsDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.post('/api/settings/upload-logo', authenticateToken, requireAdmin, upload.single('logo'), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const ext = path.extname(req.file.originalname) || '.png';
      const key = req.body.key || 'logo';
      const filename = `${key}_${Date.now()}${ext}`;
      const targetPath = path.join(assetsDir, filename);
      fs.copyFileSync(req.file.path, targetPath);
      try { fs.unlinkSync(req.file.path); } catch (e) {} // Clean up multer temp file
      res.json({ path: `/api/assets/${filename}` });
    } catch (e: any) {
      if (req.file && fs.existsSync(req.file.path)) {
         try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/holidays', authenticateToken, (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
      
      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((r) => { 
        try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; } 
      });
      
      const state = settingsMap.state || 'WA'; // Default to WA
      const hd = new Holidays('AU', state);
      
      const holidaysList = hd.getHolidays(year).filter(h => h.type === 'public');
      res.json({ holidays: holidaysList, state });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/pwa-icon/:size', async (req, res) => {
    try {
      const size = req.params.size;
      const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?)').all('pwaIcon192', 'pwaIcon512') as any[];
      const settingsMap = rows.reduce((acc, row) => {
        let val = row.value;
        try { val = JSON.parse(val); } catch (e) { /* ignore */ }
        return { ...acc, [row.key]: val };
      }, {} as any);
      let url = size === '512' ? settingsMap.pwaIcon512 : settingsMap.pwaIcon192;
      if (!url || url === '/favicon.ico') {
        url = 'https://storage.googleapis.com/a1aa/image/q5wGk6gY1A4iIpyQ4tP9CEX2uD43iP6PudN1F2cQ5B8cWcWTA.jpg';
      }
      
      if (url.startsWith('/')) {
        url = `http://localhost:${PORT}${url}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
         return res.status(response.status).send('Failed to fetch image');
      }
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(buffer));
    } catch (err) {
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get(['/api/app-manifest.json', '/manifest.webmanifest'], (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'application/manifest+json');
      
      let pwa192 = 'https://storage.googleapis.com/a1aa/image/q5wGk6gY1A4iIpyQ4tP9CEX2uD43iP6PudN1F2cQ5B8cWcWTA.jpg';
      let pwa512 = 'https://storage.googleapis.com/a1aa/image/q5wGk6gY1A4iIpyQ4tP9CEX2uD43iP6PudN1F2cQ5B8cWcWTA.jpg';
      let name = 'Happy in the Home';

      try {
        const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all('pwaIcon192', 'pwaIcon512', 'businessName') as any[];
        for (const row of rows) {
          try {
            let val = row.value;
            if (typeof val === 'string') {
               try { val = JSON.parse(val); } catch (e) {}
            }
            if (row.key === 'pwaIcon192' && typeof val === 'string' && val && val !== '/favicon.ico') pwa192 = val;
            if (row.key === 'pwaIcon512' && typeof val === 'string' && val && val !== '/favicon.ico') pwa512 = val;
            if (row.key === 'businessName' && typeof val === 'string' && val) name = val;
          } catch(e) {}
        }
      } catch(e) {
        console.error('Error fetching settings for manifest:', e);
      }
      
      const getMimeType = (url: any) => {
        if (typeof url !== 'string') return 'image/png';
        if (url.toLowerCase().endsWith('.ico')) return 'image/x-icon';
        return url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg') ? 'image/jpeg' : 'image/png';
      };

      const manifestContent = {
        name: 'HappyJob',
        short_name: 'HappyJob',
        start_url: '/',
        scope: '/',
        description: 'Roster management application',
        theme_color: '#0b1120',
        background_color: '#0b1120',
        display: 'standalone',
        icons: [
          {
            src: pwa192,
            sizes: '192x192',
            type: getMimeType(pwa192),
            purpose: 'any maskable'
          },
          {
            src: pwa512,
            sizes: '512x512',
            type: getMimeType(pwa512),
            purpose: 'any maskable'
          },
          {
            src: pwa192,
            sizes: '180x180',
            type: getMimeType(pwa192),
            purpose: 'any'
          }
        ]
      };

      res.type('application/manifest+json');
      res.send(JSON.stringify(manifestContent));
    } catch (e: any) {
      console.error('Failed to generate manifest.webmanifest:', e);
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/settings', authenticateToken, requireAdmin, (req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }), {});
      res.json(settings);
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/settings', authenticateToken, requireAdmin, (req, res) => {
    try {
      const settings = req.body;
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const insertMany = db.transaction((settingsObj) => {
        for (const [key, value] of Object.entries(settingsObj)) {
          stmt.run(key, JSON.stringify(value));
        }
      });
      insertMany(settings);
      res.json({ success: true, settings });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/awesome-quotes/daily', (req, res) => {
    try {
      const quotes = [
        { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { quote: "Act as if what you do makes a difference. It does.", author: "William James" },
        { quote: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
        { quote: "I can't change the direction of the wind, but I can adjust my sails to always reach my destination.", author: "Jimmy Dean" },
        { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
        { quote: "Limit your 'always' and your 'nevers'.", author: "Amy Poehler" },
        { quote: "Nothing is impossible. The word itself says 'I'm possible!'", author: "Audrey Hepburn" },
        { quote: "You are enough just as you are.", author: "Meghan Markle" },
        { quote: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },
        { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { quote: "You define your own life. Don't let other people write your script.", author: "Oprah Winfrey" },
        { quote: "Spread love everywhere you go.", author: "Mother Teresa" },
        { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
        { quote: "The best way to predict the future is to create it.", author: "Abraham Lincoln" },
        { quote: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
        { quote: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
        { quote: "We generate fears while we sit. We overcome them by action.", author: "Dr. Henry Link" },
        { quote: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
        { quote: "Security is mostly a superstition. Life is either a daring adventure or nothing.", author: "Helen Keller" },
        { quote: "The man who has confidence in himself gains the confidence of others.", author: "Hasidic Proverb" },
        { quote: "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.", author: "Winston Churchill" },
        { quote: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
        { quote: "You learn more from failure than from success. Don't let it stop you.", author: "Unknown" },
        { quote: "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you.", author: "Steve Jobs" },
        { quote: "People who are crazy enough to think they can change the world, are the ones who do.", author: "Rob Siltanen" },
        { quote: "Failure will never overtake me if my determination to succeed is strong enough.", author: "Og Mandino" },
        { quote: "Entrepreneurs are great at dealing with uncertainty and also very good at minimizing risk.", author: "Mohnish Pabrai" },
        { quote: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
        { quote: "Knowing is not enough; we must apply. Wishing is not enough; we must do.", author: "Johann Wolfgang Von Goethe" },
        { quote: "Imagine your life is perfect in every respect; what would it look like?", author: "Brian Tracy" }
      ];
      // Use days since epoch to pick a consistent daily quote that cycles through the array over time
      const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const dailyQuote = quotes[dayIndex % quotes.length];
      res.json(dailyQuote);
    } catch (err) {
      res.json({ quote: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/places/autocomplete', authenticateToken, async (req: any, res: any) => {
    const { input } = req.query;
    if (!input) return res.status(400).json({ error: 'Input required' });
    
    let attempts = 0;
    const maxAttempts = 2;
    
    async function attemptFetch(): Promise<any> {
      try {
        const payload = {
          input: String(input),
          includedRegionCodes: ["AU"],
          locationRestriction: {
            rectangle: {
              low: { latitude: -35.1, longitude: 112.9 },
              high: { latitude: -13.7, longitude: 129.0 }
            }
          }
        };
        const apiKey = process.env.Maps_API_KEY || process.env.Maps_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
        const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          if ((response.status >= 500 || response.status === 429) && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptFetch();
          }
          throw new Error(`Google Places API responded with status ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        if (attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch();
        }
        throw err;
      }
    }

    try {
      const data = await attemptFetch();
      res.json(data);
    } catch (e) {
      console.error('Places Autocomplete proxy error', e);
      res.status(503).json({ error: 'Search service temporarily unavailable.' });
    }
  });

  app.post('/api/transport-distance', authenticateToken, async (req: any, res: any) => {
    const { placeIds } = req.body;
    if (!placeIds || !Array.isArray(placeIds) || placeIds.length < 2) {
      return res.json({ distance: 0 });
    }
    try {
      const validWaypoints = placeIds.map((id: string) => ({ placeId: id }));
      const payload: any = {
        origin: validWaypoints[0],
        destination: validWaypoints[validWaypoints.length - 1],
        travelMode: 'DRIVE'
      };
      if (validWaypoints.length > 2) {
        payload.intermediates = validWaypoints.slice(1, -1);
      }

      const apiKey = process.env.Maps_API_KEY || process.env.Maps_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to compute route distances' });
      }
      const data = await response.json();
      const meters = data.routes?.[0]?.distanceMeters || 0;
      res.json({ distance: meters / 1000 });
    } catch (err) {
      console.error('Transport distance computation error', err);
      res.status(500).json({ error: 'Failed to compute route distances' });
    }
  });

  // --- Onboarding APIs ---
  app.get('/api/users/onboarding', authenticateToken, (req: any, res: any) => {
    try {
      const user = db.prepare('SELECT onboarding_json FROM users WHERE id = ?').get(req.user.id) as any;
      let onboardingData = user?.onboarding_json ? JSON.parse(user.onboarding_json) : {};

      let modified = false;
      const fileIdsObject: Record<number, boolean> = {};
      
      for (const stepKey in onboardingData) {
        const step = onboardingData[stepKey];
        if (step.files && Array.isArray(step.files)) {
           for (const f of step.files) {
              if (f.id) {
                 fileIdsObject[f.id] = true;
              }
           }
        } else if (step.fileId) {
           // Support legacy single file fallback
           fileIdsObject[step.fileId] = true;
        }
      }
      
      const fileIds = Object.keys(fileIdsObject).map(id => parseInt(id, 10));
      
      if (fileIds.length > 0) {
        const placeholders = fileIds.map(() => '?').join(',');
        const existingFiles = db.prepare(`SELECT id, system_name, date_issued, date_expires FROM files WHERE id IN (${placeholders})`).all(...fileIds) as any[];
        
        const validFileIds = new Set();
        const fileMetadata = new Map();
        existingFiles.forEach(f => {
          const filePath = path.join(process.cwd(), 'uploads', f.system_name);
          if (fs.existsSync(filePath)) {
            validFileIds.add(f.id);
            fileMetadata.set(f.id, f);
          }
        });
        
        for (const stepKey in onboardingData) {
          const step = onboardingData[stepKey];
          if (step.files && Array.isArray(step.files)) {
             const originalLength = step.files.length;
             step.files = step.files.filter((f: any) => validFileIds.has(f.id)).map((f: any) => {
               const meta = fileMetadata.get(f.id);
               return { ...f, date_issued: meta.date_issued, date_expires: meta.date_expires };
             });
             // Always consider modified if we are picking up metadata, or length changed
             if (step.files.length !== originalLength || step.files.some((f: any) => f.date_issued || f.date_expires)) {
                modified = true;
             }
             if (step.files.length === 0) {
                // If it became empty, remove fileId too and potentially step status
                if (step.fileId) {
                  step.fileId = null;
                  modified = true;
                }
                if (step.status === 'completed') {
                   step.status = 'pending';
                   modified = true;
                }
             } else {
                // Update fileId to the first valid file
                if (step.fileId !== step.files[0].id) {
                   step.fileId = step.files[0].id;
                   modified = true;
                }
             }
          } else if (step.fileId) {
            // Processing legacy steps without 'files' array but with 'fileId'
            if (!validFileIds.has(step.fileId)) {
               step.fileId = null;
               if (step.status === 'completed') step.status = 'pending';
               modified = true;
            } else {
               const meta = fileMetadata.get(step.fileId);
               step.files = [{ id: step.fileId, name: 'Uploaded File', date_issued: meta.date_issued, date_expires: meta.date_expires }];
               step.fileId = null;
               modified = true;
            }
          }
        }
        
        if (modified) {
          db.prepare('UPDATE users SET onboarding_json = ? WHERE id = ?').run(JSON.stringify(onboardingData), req.user.id);
        }
      }

      res.json(onboardingData);
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/users/onboarding', authenticateToken, (req: any, res: any) => {
    try {
      db.prepare('UPDATE users SET onboarding_json = ? WHERE id = ?').run(JSON.stringify(req.body), req.user.id);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Staff (Users) APIs ---
  app.get('/api/staff', authenticateToken, (req: any, res: any) => {
    if (req.user.role !== 'ADMIN') {
      const staff = db.prepare('SELECT id, first_name, last_name, role FROM users WHERE role = ?').all('STAFF');
      return res.json(staff);
    }
    const staff = db.prepare('SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at FROM users').all();
    res.json(staff);
  });

  app.post('/api/staff', authenticateToken, requireAdmin, (req, res) => {
    const { email, password, role, firstName, lastName, phone, address, dob, emergencyContactName, emergencyContactPhone, bankName, bankBsb, bankAcc, taxNumber, superFundName, superMemberNumber } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(email, hash, role || 'STAFF', firstName, lastName, phone, address, dob, emergencyContactName, emergencyContactPhone, bankName, bankBsb, bankAcc, taxNumber, superFundName, superMemberNumber);
      res.json({ id: info.lastInsertRowid, email, role, firstName, lastName, phone, address, dob, emergencyContactName, emergencyContactPhone, bankName, bankBsb, bankAcc, taxNumber, superFundName, superMemberNumber });
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      res.status(400).json({ error: 'Email already exists' });
      } else {
        logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  app.put('/api/staff/:id', authenticateToken, requireAdmin, (req, res) => {
    const { email, role, firstName, lastName, phone, address, dob, emergencyContactName, emergencyContactPhone, bankName, bankBsb, bankAcc, taxNumber, superFundName, superMemberNumber } = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare('UPDATE users SET email = ?, role = ?, first_name = ?, last_name = ?, phone = ?, address = ?, dob = ?, emergency_contact_name = ?, emergency_contact_phone = ?, bank_name = ?, bank_bsb = ?, bank_acc = ?, tax_number = ?, super_fund_name = ?, super_member_number = ? WHERE id = ?');
      stmt.run(email, role, firstName, lastName, phone, address, dob, emergencyContactName, emergencyContactPhone, bankName, bankBsb, bankAcc, taxNumber, superFundName, superMemberNumber, id);
      res.json({ id, email, role, firstName, lastName, phone, address, dob, emergencyContactName, emergencyContactPhone, bankName, bankBsb, bankAcc, taxNumber, superFundName, superMemberNumber });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/staff/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`Updating staff \${id} status to \${status}`);
    try {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
      console.log(`Success`);
      res.json({ success: true, status });
    } catch (e: any) {
      console.error(`Error updating staff status:`, e);
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/staff/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('SUSPENDED', id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Clients APIs ---
  app.get('/api/clients', authenticateToken, (req: any, res: any) => {
    if (req.user.role !== 'ADMIN') {
      const clients = db.prepare('SELECT id, first_name, last_name FROM clients').all();
      return res.json(clients);
    }

    const clients = db.prepare(`
      SELECT clients.*, providers.company_name as provider_name 
      FROM clients 
      LEFT JOIN providers ON clients.provider_id = providers.id
    `).all();

    const clientServices = db.prepare('SELECT * FROM client_services').all();

    const clientsWithServices = (clients as any[]).map(c => ({
      ...c,
      service_ids: clientServices.filter((cs: any) => cs.client_id === c.id).map((cs: any) => cs.service_id)
    }));

    res.json(clientsWithServices);
  });

  app.post('/api/clients', authenticateToken, requireAdmin, (req, res) => {
    try {
      const insertTransaction = db.transaction((reqBody) => {
        const { 
          firstName, lastName, ndisNumber, carePlanDetails, contactEmail, contactPhone, providerId,
          dob, fundingType, myAgedCareId, address, representativeName, representativePhone, representativeEmail,
          serviceIds
        } = reqBody;

        const stmt = db.prepare('INSERT INTO clients (first_name, last_name, ndis_number, care_plan_details, contact_email, contact_phone, provider_id, dob, funding_type, my_aged_care_id, address, representative_name, representative_phone, representative_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const info = stmt.run(firstName, lastName, ndisNumber, carePlanDetails, contactEmail, contactPhone, providerId || null, dob || null, fundingType || null, myAgedCareId || null, address || null, representativeName || null, representativePhone || null, representativeEmail || null);
        
        const clientId = info.lastInsertRowid;
        
        if (Array.isArray(serviceIds)) {
          const insertService = db.prepare('INSERT INTO client_services (client_id, service_id) VALUES (?, ?)');
          for (const serviceId of serviceIds) {
            insertService.run(clientId, serviceId);
          }
        }
        return clientId;
      });
      
      const clientId = insertTransaction(req.body);
      res.json({ id: clientId });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/clients/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
      const updateTransaction = db.transaction((reqBody, paramId) => {
        const { 
          firstName, lastName, ndisNumber, carePlanDetails, contactEmail, contactPhone, providerId,
          dob, fundingType, myAgedCareId, address, representativeName, representativePhone, representativeEmail,
          serviceIds
        } = reqBody;

        const stmt = db.prepare('UPDATE clients SET first_name = ?, last_name = ?, ndis_number = ?, care_plan_details = ?, contact_email = ?, contact_phone = ?, provider_id = ?, dob = ?, funding_type = ?, my_aged_care_id = ?, address = ?, representative_name = ?, representative_phone = ?, representative_email = ? WHERE id = ?');
        stmt.run(firstName, lastName, ndisNumber, carePlanDetails, contactEmail, contactPhone, providerId || null, dob || null, fundingType || null, myAgedCareId || null, address || null, representativeName || null, representativePhone || null, representativeEmail || null, paramId);
        
        if (Array.isArray(serviceIds)) {
          db.prepare('DELETE FROM client_services WHERE client_id = ?').run(paramId);
          const insertService = db.prepare('INSERT INTO client_services (client_id, service_id) VALUES (?, ?)');
          for (const serviceId of serviceIds) {
            insertService.run(paramId, serviceId);
          }
        }
      });
      
      updateTransaction(req.body, req.params.id);
      res.json({ id: req.params.id });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/clients/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare('UPDATE clients SET status = ? WHERE id = ?').run(status, id);
      res.json({ success: true, status });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/clients/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('UPDATE clients SET status = ? WHERE id = ?').run('SUSPENDED', id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Providers APIs ---
  app.get('/api/providers', authenticateToken, requireAdmin, (req, res) => {
    const providers = db.prepare('SELECT * FROM providers').all();
    res.json(providers);
  });

  app.post('/api/providers', authenticateToken, requireAdmin, (req, res) => {
    const { companyName, contactName, email, phone, address } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO providers (company_name, contact_name, email, phone, address) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(companyName, contactName, email, phone, address);
      res.json({ id: info.lastInsertRowid, companyName, contactName, email, phone, address });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/providers/:id', authenticateToken, requireAdmin, (req, res) => {
    const { companyName, contactName, email, phone, address } = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare('UPDATE providers SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ? WHERE id = ?');
      stmt.run(companyName, contactName, email, phone, address, id);
      res.json({ id, companyName, contactName, email, phone, address });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/providers/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare('UPDATE providers SET status = ? WHERE id = ?').run(status, id);
      res.json({ success: true, status });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/providers/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('UPDATE providers SET status = ? WHERE id = ?').run('SUSPENDED', id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Respite Bookings APIs ---
  app.get('/api/respite-bookings', authenticateToken, (req: any, res: any) => {
    const isAdmin = req.user.role === 'ADMIN';

    let bookingsQuery = `
      SELECT rb.*, 
             c.first_name as client_first_name, c.last_name as client_last_name
      FROM respite_bookings rb
      LEFT JOIN clients c ON rb.client_id = c.id
    `;
    let bookings = [];

    if (isAdmin) {
      bookings = db.prepare(bookingsQuery).all();
    } else {
      const staffQuery = `
        SELECT DISTINCT rb.*, 
               c.first_name as client_first_name, c.last_name as client_last_name
        FROM respite_bookings rb
        JOIN shifts s ON rb.id = s.respite_booking_id
        LEFT JOIN clients c ON rb.client_id = c.id
        WHERE s.staff_id = ? AND s.status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED')
      `;
      bookings = db.prepare(staffQuery).all(req.user.id);
    }
    
    if (bookings.length === 0) {
      return res.json([]);
    }

    const bookingIds = bookings.map((b: any) => b.id);
    const placeholders = bookingIds.map(() => '?').join(',');

    // fetch all child shifts and attach them
    let shiftsQuery = `
      SELECT s.*, 
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             srv.name as service_name, srv.code as service_code, srv.rate as service_rate, srv.unit as service_unit
      FROM shifts s
      LEFT JOIN users u ON s.staff_id = u.id
      LEFT JOIN services srv ON s.service_id = srv.id
      WHERE s.respite_booking_id IN (${placeholders})
    `;
    
    if (!isAdmin) {
      shiftsQuery += ` AND s.status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED')`;
    }

    const childShifts = db.prepare(shiftsQuery).all(...bookingIds);
    
    const mappedBookings = bookings.map((b: any) => ({
      ...b,
      shifts: childShifts.filter((s: any) => s.respite_booking_id === b.id)
    }));
    
    res.json(mappedBookings);
  });
  
  app.get('/api/respite-bookings/:id', authenticateToken, (req: any, res: any) => {
    const booking = db.prepare('SELECT * FROM respite_bookings WHERE id = ?').get(req.params.id) as any;
    if (!booking) return res.status(404).json({error: 'Not found'});
    
    const shiftsQuery = `
      SELECT s.*, 
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             srv.name as service_name, srv.code as service_code, srv.rate as service_rate, srv.unit as service_unit
      FROM shifts s
      LEFT JOIN users u ON s.staff_id = u.id
      LEFT JOIN services srv ON s.service_id = srv.id
      WHERE s.respite_booking_id = ?
    `;
    const childShifts = db.prepare(shiftsQuery).all(booking.id);
    booking.shifts = childShifts;
    res.json(booking);
  });
  
  // Create Respite Booking
  app.post('/api/respite-bookings', authenticateToken, requireAdmin, (req, res) => {
    const { clientId, startTime, endTime, notes, servicesData } = req.body;
    
    try {
        const createRespite = db.transaction((services) => {
            const rbStmt = db.prepare('INSERT INTO respite_bookings (client_id, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, ?)');
            const rbInfo = rbStmt.run(clientId, startTime, endTime, 'DRAFT', notes);
            const bookingId = rbInfo.lastInsertRowid;
            
            const insertShift = db.prepare('INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, respite_booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            
            for (const service of services) {
               for(const staff of service.staffShifts) {
                   insertShift.run(staff.staffId, clientId, service.serviceId, staff.startTime, staff.endTime, 'DRAFT', notes, bookingId);
               }
            }
            return bookingId;
        });
        const bookingId = createRespite(servicesData);
        res.json({ id: bookingId });
    } catch(e: any) {
        
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Update Respite Booking
  app.put('/api/respite-bookings/:id', authenticateToken, requireAdmin, (req, res) => {
    const bookingId = req.params.id;
    const { clientId, startTime, endTime, notes, servicesData } = req.body;
    
    try {
        db.transaction((services) => {
            db.prepare('UPDATE respite_bookings SET client_id = ?, start_time = ?, end_time = ?, notes = ? WHERE id = ?')
              .run(clientId, startTime, endTime, notes, bookingId);
              
            // delete old child shifts
            db.prepare('DELETE FROM shifts WHERE respite_booking_id = ?').run(bookingId);
            
            // create new
            const insertShift = db.prepare('INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, respite_booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            
            for (const service of services) {
               for(const staff of service.staffShifts) {
                   insertShift.run(staff.staffId, clientId, service.serviceId, staff.startTime, staff.endTime, 'DRAFT', notes, bookingId);
               }
            }
        })(servicesData);
        res.json({ success: true });
    } catch(e: any) {
        
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/respite-bookings/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;
    try {
        let childShiftIds: number[] = [];
        db.transaction(() => {
            const existing = db.prepare('SELECT status FROM respite_bookings WHERE id = ?').get(bookingId) as any;
            if (existing && existing.status !== status && status === 'COMPLETED') {
                 childShiftIds = db.prepare('SELECT id FROM shifts WHERE respite_booking_id = ?').all(bookingId).map((s:any) => s.id);
            }
            db.prepare('UPDATE respite_bookings SET status = ? WHERE id = ?').run(status, bookingId);
            db.prepare('UPDATE shifts SET status = ? WHERE respite_booking_id = ?').run(status, bookingId);
        })();

        if (status === 'COMPLETED') {
            for (const shiftId of childShiftIds) {
                generateInvoiceForShift(shiftId);
            }
        }

        res.json({ success: true });
    } catch (e: any) {
        
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/respite-bookings/:id', authenticateToken, requireAdmin, (req, res) => {
      try {
          db.transaction(() => {
              db.prepare('DELETE FROM shifts WHERE respite_booking_id = ?').run(req.params.id);
              db.prepare('DELETE FROM respite_bookings WHERE id = ?').run(req.params.id);
          })();
          res.json({ success: true });
      } catch(e: any) {
          
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
      }
  });

  // --- Client Roster Templates APIs ---
  app.get('/api/clients/:id/roster-templates', authenticateToken, (req: any, res: any) => {
    try {
      const templates = db.prepare(`
        SELECT t.*, 
               u.first_name as staff_first_name, u.last_name as staff_last_name,
               srv.name as service_name
        FROM client_roster_templates t
        LEFT JOIN users u ON t.staff_id = u.id
        LEFT JOIN services srv ON t.service_id = srv.id
        WHERE t.client_id = ?
        ORDER BY t.day_of_week, t.start_time
      `).all(req.params.id);
      
      // Parse JSON for the frontend
      templates.forEach((t: any) => {
          try {
              t.servicesData = t.services_json ? JSON.parse(t.services_json) : [];
          } catch (e) {
              t.servicesData = [];
          }
      });
      res.json(templates);
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/clients/:id/roster-templates', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { daysOfWeek = [], dayOfWeek, startTime, endTime, staffId, servicesData } = req.body;
      const stmt = db.prepare(`
        INSERT INTO client_roster_templates (client_id, day_of_week, start_time, end_time, staff_id, services_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const daysToIterate = Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : [dayOfWeek];

      db.transaction(() => {
        for (const day of daysToIterate) {
          if (day !== undefined && day !== null) {
            stmt.run(req.params.id, day, startTime, endTime, staffId || null, JSON.stringify(servicesData || []));
          }
        }
      })();
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/clients/:id/roster-templates/clear', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare('DELETE FROM client_roster_templates WHERE client_id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/client-roster-templates/:id', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare('DELETE FROM client_roster_templates WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  function getUtcTimeFromLocal(dateStr: string, timeStr: string, timeZone: string) {
    const localIso = `${dateStr}T${timeStr}:00`;
    let d = new Date(`${localIso}Z`);

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    
    function getOffsetAt(dateObj: Date) {
        const parts = formatter.formatToParts(dateObj);
        const p: any = {};
        parts.forEach(part => p[part.type] = part.value);
        let h = parseInt(p.hour, 10);
        if (h === 24) h = 0;
        const formattedLocalAsUtc = Date.UTC(p.year, parseInt(p.month, 10) - 1, p.day, h, p.minute, p.second);
        return formattedLocalAsUtc - dateObj.getTime();
    }
    
    let offset = getOffsetAt(d);
    let guess = new Date(d.getTime() - offset);
    let offset2 = getOffsetAt(guess);
    if (offset !== offset2) {
        guess = new Date(d.getTime() - offset2);
    }
    return guess;
  }

  // Generate shifts from templates
  app.post('/api/clients/:id/generate-roster', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { startDate, endDate, overwriteConflicts, dryRun } = req.body;
      const clientId = req.params.id;

      if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });

      const start = new Date(startDate + 'T00:00:00Z');
      const end = new Date(endDate + 'T00:00:00Z');

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      if (start > end) {
        return res.status(400).json({ error: 'Start date must be before or equal to end date' });
      }

      // Cap at 3 months for safety
      const msIn3Months = 90 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > msIn3Months) {
        return res.status(400).json({ error: 'Date range cannot exceed 3 months.' });
      }

      const templates = db.prepare('SELECT * FROM client_roster_templates WHERE client_id = ?').all(clientId) as any[];
      if (!templates.length) return res.status(400).json({ error: 'No templates found for this client.' });
      
      const shiftsCreated = [];
      const conflicts = [];
      const clientConflicts = [];
      let existingShiftsCount = 0;
      
      if (dryRun) {
        const countRow = db.prepare(`SELECT count(*) as count FROM shifts WHERE client_id = ? AND start_time >= ? AND start_time < ? AND status NOT IN ('COMPLETED', 'IN_PROGRESS')`).get(clientId, start.toISOString(), new Date(end.getTime() + 86400000).toISOString()) as any;
        existingShiftsCount = countRow ? countRow.count : 0;
      }

      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((r) => {
        try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; }
      });
      let rawTz3 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz3 === 'string' ? rawTz3.replace(/['"]+/g, '') : rawTz3;

      db.transaction(() => {
        if (!dryRun && overwriteConflicts === 'all') {
           db.prepare(`DELETE FROM shifts WHERE client_id = ? AND start_time >= ? AND start_time < ? AND status NOT IN ('COMPLETED', 'IN_PROGRESS')`).run(clientId, start.toISOString(), new Date(end.getTime() + 86400000).toISOString());
        }

        // Loop through dates
        for (let dt = new Date(start); dt <= end; dt.setUTCDate(dt.getUTCDate() + 1)) {
          const dayOfWeek = dt.getUTCDay(); // 0 is Sunday, 6 is Saturday
          
          const todaysTemplates = templates.filter(t => t.day_of_week === dayOfWeek);
          
          for (const tmpl of todaysTemplates) {
            // Create timestamps
            const shiftDateStr = dt.toISOString().split('T')[0];
            const startDateTime = getUtcTimeFromLocal(shiftDateStr, tmpl.start_time, timezone);
            const endDateTime = getUtcTimeFromLocal(shiftDateStr, tmpl.end_time, timezone);
            
            // No need to check client conflicts since they are wiped if overwriteConflicts === 'all'
            // We just push dummy if dryRun so UI knows there are templates processed, but actually we use existingShiftsCount now.
            if (dryRun && existingShiftsCount > 0) {
               clientConflicts.push({ existing: [] }); // Dummy to trigger UI confirmation
            }
            if (!dryRun && overwriteConflicts !== 'all') {
                // If they didn't approve wipe, we shouldn't continue, but just for safety.
            }

            // Check if there is an overlapping COMPLETED or IN_PROGRESS shift for this client
            const clientPreservedConflict = db.prepare(`
              SELECT id FROM shifts 
              WHERE client_id = ? 
              AND status IN ('COMPLETED', 'IN_PROGRESS')
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
            `).get(
              clientId, 
              endDateTime.toISOString(), startDateTime.toISOString(),
              endDateTime.toISOString(), startDateTime.toISOString(),
              startDateTime.toISOString(), endDateTime.toISOString()
            );

            if (clientPreservedConflict) {
              continue; // Skip creating this template shift because it's already fulfilled by a preserved shift
            }

            // Check conflicts for preferred staff
            let assignedStaffId = tmpl.staff_id;
            if (assignedStaffId) {
              const conflict = db.prepare(`
                SELECT id FROM shifts 
                WHERE staff_id = ? 
                AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
              `).get(
                assignedStaffId, 
                endDateTime.toISOString(), startDateTime.toISOString(),
                endDateTime.toISOString(), startDateTime.toISOString(),
                startDateTime.toISOString(), endDateTime.toISOString()
              );
              
              if (conflict) {
                const userRow = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(assignedStaffId) as any;
                const staffName = userRow ? `${userRow.first_name} ${userRow.last_name}` : `Staff ID ${assignedStaffId}`;

                conflicts.push({
                   date: shiftDateStr,
                   startTime: tmpl.start_time,
                   endTime: tmpl.end_time,
                   message: `${staffName} is already booked.`
                });
                assignedStaffId = null; // Unassigned
              }
            }
            
            if (dryRun) continue; // Do not INSERT if dry run
            if (!assignedStaffId) continue; // Skip creating shift if there is a conflict and no staff

            let servicesData = [];
            if (tmpl.services_json) {
              try {
                servicesData = JSON.parse(tmpl.services_json);
              } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
            } else if (tmpl.service_id) {
              servicesData = [{ serviceId: tmpl.service_id }];
            }
            
            let mainServiceId = null;
            if (servicesData.length > 0) mainServiceId = servicesData[0].serviceId;

            const stmt = db.prepare(`
              INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const shiftInfo = stmt.run(
              clientId, assignedStaffId, mainServiceId, JSON.stringify(servicesData),
              startDateTime.toISOString(), endDateTime.toISOString(), 
              'DRAFT' // Always set generated shifts to DRAFT so they can be reviewed
            );
            shiftsCreated.push(shiftInfo.lastInsertRowid);
          }
        }
        
        // If dryRun, we can rollback just in case, but no INSERT or DELETE was made
        if (dryRun) {
            // Throw error to rollback anything, but we already didn't modify
        }
      })();

      res.json({ success: true, createdCount: shiftsCreated.length, conflicts, clientConflicts, dryRun });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/clients/:id/resolve-roster-conflicts', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { shiftsToOverwrite } = req.body;
      const clientId = req.params.id;

      if (!shiftsToOverwrite || !Array.isArray(shiftsToOverwrite)) {
        return res.status(400).json({ error: 'shiftsToOverwrite array required' });
      }

      const templates = db.prepare('SELECT * FROM client_roster_templates WHERE client_id = ?').all(clientId) as any[];
      const templatesMap = new Map(templates.map(t => [t.id, t]));
      
      const shiftsCreated = [];
      const conflicts = [];
      
      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((r) => {
        try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; }
      });
      let rawTz4 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz4 === 'string' ? rawTz4.replace(/['"]+/g, '') : rawTz4;

      db.transaction(() => {
        for (const item of shiftsToOverwrite) {
          const tmpl = templatesMap.get(item.templateId);
          if (!tmpl) continue;

          const shiftDateStr = item.date;
          const startDateTime = getUtcTimeFromLocal(shiftDateStr, tmpl.start_time, timezone);
          const endDateTime = getUtcTimeFromLocal(shiftDateStr, tmpl.end_time, timezone);
          
          // Delete existing client shifts at this time
          const oldShifts = db.prepare(`
            SELECT id FROM shifts 
            WHERE client_id = ? 
            AND status NOT IN ('COMPLETED', 'IN_PROGRESS')
            AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
          `).all(
            clientId, 
            endDateTime.toISOString(), startDateTime.toISOString(),
            endDateTime.toISOString(), startDateTime.toISOString(),
            startDateTime.toISOString(), endDateTime.toISOString()
          ) as any[];

          for (const oldShift of oldShifts) {
              db.prepare('DELETE FROM shifts WHERE id = ?').run(oldShift.id);
          }

          // Check if there is an overlapping COMPLETED or IN_PROGRESS shift for this client
          const clientPreservedConflict = db.prepare(`
            SELECT id FROM shifts 
            WHERE client_id = ? 
            AND status IN ('COMPLETED', 'IN_PROGRESS')
            AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
          `).get(
            clientId, 
            endDateTime.toISOString(), startDateTime.toISOString(),
            endDateTime.toISOString(), startDateTime.toISOString(),
            startDateTime.toISOString(), endDateTime.toISOString()
          );

          if (clientPreservedConflict) {
            continue; // Skip creating this template shift because it's already fulfilled by a preserved shift
          }

          // Check conflicts for preferred staff
          let assignedStaffId = tmpl.staff_id;
          if (assignedStaffId) {
            const conflict = db.prepare(`
              SELECT id FROM shifts 
              WHERE staff_id = ? 
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
            `).get(
              assignedStaffId, 
              endDateTime.toISOString(), startDateTime.toISOString(),
              endDateTime.toISOString(), startDateTime.toISOString(),
              startDateTime.toISOString(), endDateTime.toISOString()
            );
            
            if (conflict) {
              const userRow = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(assignedStaffId) as any;
              const staffName = userRow ? `${userRow.first_name} ${userRow.last_name}` : `Staff ID ${assignedStaffId}`;

              conflicts.push({
                 date: shiftDateStr,
                 startTime: tmpl.start_time,
                 endTime: tmpl.end_time,
                 message: `${staffName} is already booked.`
              });
              assignedStaffId = null; // Unassigned
            }
          }
          
          if (!assignedStaffId) continue; // Skip creating shift if there is a conflict and no staff

          let servicesData = [];
          if (tmpl.services_json) {
            try {
              servicesData = JSON.parse(tmpl.services_json);
            } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
          } else if (tmpl.service_id) {
            servicesData = [{ serviceId: tmpl.service_id }];
          }
          
          let mainServiceId = null;
          if (servicesData.length > 0) mainServiceId = servicesData[0].serviceId;

          const stmt = db.prepare(`
            INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          const shiftInfo = stmt.run(
            clientId, assignedStaffId, mainServiceId, JSON.stringify(servicesData),
            startDateTime.toISOString(), endDateTime.toISOString(), 
            'DRAFT' // Always set to DRAFT so they can be reviewed before publishing
          );
          shiftsCreated.push(shiftInfo.lastInsertRowid);
        }
      })();

      res.json({ success: true, createdCount: shiftsCreated.length, conflicts });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Shifts APIs ---
  app.get('/api/shifts/:id/invoice-preview', authenticateToken, (req: any, res: any) => {
    try {
      const data = getInvoiceDataForShift(Number(req.params.id));
      if (!data) return res.status(404).json({ error: 'Invoice data not found' });
      res.json({ success: true, data });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/shifts', authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT s.*, 
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             c.first_name as client_first_name, c.last_name as client_last_name,
             srv.name as service_name, srv.code as service_code, srv.rate as service_rate, srv.unit as service_unit, srv.rates_json as service_rates_json, srv.type as service_type,
             s.respite_booking_id,
             COALESCE(c.funding_type, 'NDIS') as funding_type
      FROM shifts s
      LEFT JOIN users u ON s.staff_id = u.id
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN services srv ON s.service_id = srv.id
      WHERE (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
    `;
    // If not admin, only show their own published shifts and omit rates
    if (req.user.role !== 'ADMIN') {
       const staffQuery = `
         SELECT s.id, s.staff_id, s.client_id, s.service_id, s.respite_booking_id,
                s.start_time, s.end_time, s.status, s.notes, s.created_at, COALESCE(c.funding_type, 'NDIS') as funding_type,
                s.actual_start_time, s.actual_finish_time, s.services_json,
                s.provider_travel_km, s.provider_travel_cost, s.home_care_travel_km, s.home_care_travel_total, s.abt_km, s.abt_cost, s.transport_route_log,
                u.first_name as staff_first_name, u.last_name as staff_last_name,
                c.first_name as client_first_name, c.last_name as client_last_name,
                srv.name as service_name, srv.code as service_code, srv.unit as service_unit, srv.type as service_type
         FROM shifts s
         LEFT JOIN users u ON s.staff_id = u.id
         LEFT JOIN clients c ON s.client_id = c.id
         LEFT JOIN services srv ON s.service_id = srv.id
         WHERE s.staff_id = ? AND s.status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED')
           AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
       `;
       const shifts = db.prepare(staffQuery).all(req.user.id) as any[];
       shifts.forEach(s => {
         try {
           s.servicesData = s.services_json ? JSON.parse(s.services_json) : [];
         } catch (e) {
           s.servicesData = [];
         }
       });
       return res.json(shifts);
    }

    const shifts = db.prepare(query).all() as any[];
    shifts.forEach(s => {
      try {
        s.servicesData = s.services_json ? JSON.parse(s.services_json) : [];
      } catch (e) {
        s.servicesData = [];
      }
    });
    res.json(shifts);
  });

  app.post('/api/shifts', authenticateToken, requireAdmin, async (req, res) => {
    let { staffId, staffIds, clientId, serviceId, startTime, endTime, status, notes, servicesData } = req.body;
    try {
      const idsToProcess = Array.isArray(staffIds) && staffIds.length > 0 ? staffIds : [staffId];
      const mainServiceId = serviceId || (servicesData && servicesData.length > 0 ? servicesData[0].serviceId : null);

      const processedStaffShifts: any[] = [];
      for (const singleStaffId of idsToProcess) {
        let processedServicesData = servicesData ? JSON.parse(JSON.stringify(servicesData)) : [];
        let isAbtApproved = false;

        for (const sData of processedServicesData) {
          const srv = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;
          if (srv) {
            const name = srv.name.toLowerCase();
            if (name.includes('activity based transport')) {
              isAbtApproved = true;
              sData.qtyOverride = 0;
            }
            // Provider travel logic is deferred entirely to the async cascade hook
          }
        }
        
        processedStaffShifts.push({
          staffId: singleStaffId,
          servicesJson: JSON.stringify(processedServicesData),
          isAbtApproved
        });
      }

      const clientQ = db.prepare('SELECT funding_type FROM clients WHERE id = ?').get(clientId) as any;
      const fType = clientQ?.funding_type || 'NDIS';
      const stmt = db.prepare('INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

      if (idsToProcess.length > 1) {
        const createShifts = db.transaction((shiftsArray) => {
          return shiftsArray.map((shift: any) => {
            const info = stmt.run(shift.staffId, clientId, mainServiceId, startTime, endTime, status || 'DRAFT', notes, shift.servicesJson, shift.isAbtApproved ? 1 : 0, fType);
            return info.lastInsertRowid;
          });
        });

        const shiftIds = createShifts(processedStaffShifts);
        
        // Recalculate after batch insert
        for (const single of processedStaffShifts) {
          (async () => {
              console.log(`[DEBUG CASCADE] Calling hook for POST batch insert: staffId ${single.staffId}, time: ${startTime}`);
              await new Promise(resolve => setTimeout(resolve, 500));
              await recalculateDayTravelForStaff(single.staffId, startTime);
          })().catch(e => console.error('[DEBUG CASCADE] Ignition failed:', e));
        }
        
        res.json({ id: shiftIds[0], ids: shiftIds });
      } else {
        const single = processedStaffShifts[0];
        const info = stmt.run(single.staffId, clientId, mainServiceId, startTime, endTime, status || 'DRAFT', notes, single.servicesJson, single.isAbtApproved ? 1 : 0, fType);
        
        // Recalculate after single insert
        (async () => {
            console.log(`[DEBUG CASCADE] Calling hook for POST single insert: staffId ${single.staffId}, time: ${startTime}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            await recalculateDayTravelForStaff(single.staffId, startTime);
        })().catch(e => console.error('[DEBUG CASCADE] Ignition failed:', e));
        
        res.json({ id: info.lastInsertRowid });
      }
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/shifts/batch-action', authenticateToken, requireAdmin, async (req: any, res: any) => {
    try {
      const { action, shiftIds } = req.body;
      if (!action || !shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
        return res.status(400).json({ error: 'Valid action and shiftIds array required' });
      }

      const validActions = ['publish', 'unpublish', 'delete'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      // Filter out any IDs starting with 'rb_' (respite wrapper shifts)
      const pureShiftIds = shiftIds.filter(id => typeof id === 'number' || !String(id).startsWith('rb_'));

      if (pureShiftIds.length === 0) {
        return res.json({ success: true, message: 'No valid shifts supplied for batch action', updatedCount: 0 });
      }

      const placeholders = pureShiftIds.map(() => '?').join(',');

      let uniqueStaffDates = new Set<string>();

      db.transaction(() => {
        if (action === 'delete') {
          const shiftsToDelete = db.prepare(`SELECT staff_id, start_time FROM shifts WHERE id IN (${placeholders})`).all(...pureShiftIds);
          shiftsToDelete.forEach((s: any) => {
            uniqueStaffDates.add(`${s.staff_id}|${s.start_time}`);
          });
        }

        if (action === 'publish') {
          db.prepare(`UPDATE shifts SET status = 'PUBLISHED' WHERE id IN (${placeholders}) AND status = 'DRAFT'`).run(...pureShiftIds);
        } else if (action === 'unpublish') {
          db.prepare(`UPDATE shifts SET status = 'DRAFT' WHERE id IN (${placeholders}) AND status = 'PUBLISHED'`).run(...pureShiftIds);
        } else if (action === 'delete') {
          const invoices = db.prepare(`SELECT file_path FROM invoices WHERE shift_id IN (${placeholders})`).all(...pureShiftIds);
          invoices.forEach((inv: any) => {
            if (inv.file_path) {
              const filePath = path.join(process.cwd(), 'invoices', inv.file_path);
              if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) { logger.warn('Failed to delete file', e); } }
            }
          });
          db.prepare(`DELETE FROM invoices WHERE shift_id IN (${placeholders})`).run(...pureShiftIds);
          db.prepare(`DELETE FROM shifts WHERE id IN (${placeholders})`).run(...pureShiftIds);
        }
      })();

      if (action === 'delete' && uniqueStaffDates.size > 0) {
        uniqueStaffDates.forEach(sd => {
          const [staffId, startTime] = sd.split('|');
          (async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            await recalculateDayTravelForStaff(Number(staffId), startTime);
          })().catch(e => console.error(e));
        });
      }

      res.json({ success: true, message: `Batch ${action} completed successfully` });
    } catch (e: any) {
      console.error(e);
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/shifts/publish-all', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.transaction(() => {
        db.prepare('UPDATE shifts SET status = ? WHERE status = ?').run('PUBLISHED', 'DRAFT');
        db.prepare('UPDATE respite_bookings SET status = ? WHERE status = ?').run('PUBLISHED', 'DRAFT');
      })();
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/shifts/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const { staffId, clientId, serviceId, startTime, endTime, status, notes, fundingType, servicesData, providerTravelKm, abtKm } = req.body;
    
    try {
      const existing = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as any;
      if (!existing) return res.status(404).json({ error: 'Not found' });

      // Build old value for audit logging
      const oldValue = JSON.stringify(existing);

      const servicesJson = servicesData ? JSON.stringify(servicesData) : existing.services_json;
      const mainServiceId = serviceId || (servicesData && servicesData.length > 0 ? servicesData[0].serviceId : existing.service_id);

      const stmt = db.prepare('UPDATE shifts SET staff_id = ?, client_id = ?, service_id = ?, start_time = ?, end_time = ?, status = ?, notes = ?, funding_type = ?, services_json = ?, provider_travel_km = ?, abt_km = ? WHERE id = ?');
      stmt.run(
         staffId !== undefined ? staffId : existing.staff_id, 
         clientId !== undefined ? clientId : existing.client_id, 
         mainServiceId, 
         startTime !== undefined ? startTime : existing.start_time, 
         endTime !== undefined ? endTime : existing.end_time, 
         status !== undefined ? status : existing.status, 
         notes !== undefined ? notes : existing.notes, 
         (db.prepare('SELECT funding_type FROM clients WHERE id = ?').get(clientId !== undefined ? clientId : existing.client_id) as any)?.funding_type || 'NDIS',
         servicesJson,
         providerTravelKm !== undefined ? providerTravelKm : existing.provider_travel_km,
         abtKm !== undefined ? abtKm : existing.abt_km,
         id
      );

      // Audit Log for COMPLETED shift edits
      if (existing.status === 'COMPLETED') {
         const newRecord = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as any;
         db.prepare('INSERT INTO audit_logs (entity_type, entity_id, old_value, new_value, changed_by_user_id) VALUES (?, ?, ?, ?, ?)').run(
           'shift', id, oldValue, JSON.stringify(newRecord), req.user.id
         );
      }
      
      if ((status === 'COMPLETED' || existing.status === 'COMPLETED') && (existing.status !== status || servicesJson !== existing.services_json || providerTravelKm !== undefined || abtKm !== undefined)) {
         generateInvoiceForShift(id);
      }
      
      (async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          await recalculateDayTravelForStaff(staffId !== undefined ? staffId : existing.staff_id, startTime !== undefined ? startTime : existing.start_time);
      })().catch(e => console.error('[DEBUG CASCADE] Ignition failed:', e));
      if (staffId !== undefined && staffId !== existing.staff_id || startTime !== undefined && startTime !== existing.start_time) {
         // Recalculate old date/staff if it changed
         (async () => {
             await new Promise(resolve => setTimeout(resolve, 500));
             await recalculateDayTravelForStaff(existing.staff_id, existing.start_time);
         })().catch(e => console.error('[DEBUG CASCADE] Ignition failed:', e));
      }

      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/shifts/:id/cancel', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as any;
      if (!shift) return res.status(404).json({ error: 'Shift not found' });
      if (req.user.role !== 'ADMIN' && shift.staff_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      db.prepare('UPDATE shifts SET status = ?, notes = ? WHERE id = ?').run('CANCELLED', reason ? `Cancelled: ${reason}` : 'Cancelled by staff', id);
      res.json({ success: true });
    } catch(e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/shifts/:id/start', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    const { odometer_start_reading, odometer_start_photo } = req.body;
    try {
      const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as any;
      if (!shift) return res.status(404).json({ error: 'Shift not found' });
      if (req.user.role !== 'ADMIN' && shift.staff_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      const startTime = new Date().toISOString();
      db.prepare('UPDATE shifts SET actual_start_time = ?, status = ?, odometer_start_reading = ?, odometer_start_photo = ? WHERE id = ?').run(startTime, 'IN_PROGRESS', odometer_start_reading || null, odometer_start_photo || null, id);
      res.json({ success: true, actual_start_time: startTime });
    } catch(e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/shifts/:id/complete', authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { actual_finish_time, notes, abtCoordinates, odometer_end_reading, odometer_end_photo } = req.body; 
    
    try {
      const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as any;
      if (!shift) return res.status(404).json({ error: 'Shift not found' });
      if (req.user.role !== 'ADMIN' && shift.staff_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      // 1. Calculate Provider Travel
      const pTravel = await calculateProviderTravel(shift);
      const hcTravel = await calculateHomeCareTravel(shift);
      
      // 2. Calculate ABT if NDIS and coordinates exist
      let abt_km = 0;
      let abt_cost = 0;
      let transport_route_log = null;
      let combinedRouteLog: any = null;

      if (pTravel.routeLogs && pTravel.routeLogs.length > 0) {
        combinedRouteLog = combinedRouteLog || {};
        combinedRouteLog.providerTravel = {
          calculatedAt: new Date().toISOString(),
          distance: pTravel.distance,
          cost: pTravel.cost,
          legs: pTravel.routeLogs
        };
      }

      if (hcTravel.routeLogs && hcTravel.routeLogs.length > 0) {
        combinedRouteLog = combinedRouteLog || {};
        combinedRouteLog.homeCareTravel = {
          calculatedAt: new Date().toISOString(),
          distance: hcTravel.distance,
          cost: hcTravel.cost,
          legs: hcTravel.routeLogs
        };
      }

      let resolvedAbtCoordinates: any[] = [];
      let abtAddresses: string[] = [];
      const formatCoords = (coords: any[]) => coords && coords.length === 2 ? `[${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}]` : '';

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

      if (shift.funding_type === 'NDIS' && resolvedAbtCoordinates.length >= 2 && !shift.respite_booking_id) {
         const { distance, minutes, legs } = await getGoogleRoutesDistance(resolvedAbtCoordinates);
         abt_km = distance;
         abt_cost = abt_km * 1.00; // $1.00/km Ledger Split
         
         const routeLegs = (legs || []).map((leg: any, idx: number) => {
            const fromAddr = abtAddresses[idx] || 'Point A';
            const toAddr = abtAddresses[idx+1] || 'Point B';
            return {
               description: `${fromAddr} → ${toAddr}`,
               distance: leg.distance,
               durationMins: leg.minutes
            };
         });

         combinedRouteLog = combinedRouteLog || {};
         combinedRouteLog.abt = { 
            description: `Transport during shift (Total: ${abt_km.toFixed(2)} km)`,
            waypoints: resolvedAbtCoordinates, 
            distance: abt_km, 
            minutes: minutes,
            cost: abt_cost, 
            calculatedAt: new Date().toISOString(),
            legs: routeLegs
         };
      }

      transport_route_log = combinedRouteLog ? JSON.stringify(combinedRouteLog) : null;

      // 3. Update DB
      let updatedServicesJson = shift.services_json;
      if (updatedServicesJson) {
        try {
          const servicesData = JSON.parse(updatedServicesJson);
          if (Array.isArray(servicesData)) {
            let changed = false;
            for (const sData of servicesData) {
              const service = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;
              if (service && service.name) {
                const name = service.name.toLowerCase();
                if (name.includes('activity based transport')) {
                  sData.qtyOverride = parseFloat(abt_km.toFixed(2));
                  changed = true;
                } else if (name.includes('provider travel')) {
                  let billableValue = pTravel.distance; // Fallback
                  if (pTravel.minutes !== undefined && !name.includes('non-labour')) {
                     const unitStr = (service.unit || 'Hour').toLowerCase();
                     billableValue = (unitStr.includes('minute') || unitStr === 'min') ? pTravel.minutes : pTravel.minutes / 60;
                  }
                  sData.qtyOverride = parseFloat(billableValue.toFixed(2));
                  changed = true;
                }
              }
            }
            if (changed) {
              updatedServicesJson = JSON.stringify(servicesData);
            }
          }
        } catch (e) {
          console.error("Failed to parse services_json during completion:", e);
        }
      }

      const stmt = db.prepare(`
        UPDATE shifts SET 
          actual_finish_time = ?, 
          notes = ?, 
          status = 'COMPLETED',
          provider_travel_km = ?,
          provider_travel_cost = ?,
          home_care_travel_km = ?,
          home_care_travel_total = ?,
          abt_km = ?,
          abt_cost = ?,
          transport_route_log = ?,
          services_json = ?,
          odometer_end_reading = ?,
          odometer_end_photo = ?
        WHERE id = ?
      `);

      stmt.run(
        actual_finish_time || new Date().toISOString(),
        notes || shift.notes,
        pTravel.distance,
        pTravel.cost,
        hcTravel.distance,
        hcTravel.cost,
        abt_km,
        abt_cost,
        transport_route_log,
        updatedServicesJson,
        odometer_end_reading || null,
        odometer_end_photo || null,
        id
      );

      // Trigger notification for ADMINs
      try {
        const staff = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(shift.staff_id) as any;
        const staffName = staff ? `${staff.first_name} ${staff.last_name}` : 'A staff member';
        
        const client = db.prepare('SELECT first_name, last_name FROM clients WHERE id = ?').get(shift.client_id) as any;
        const clientName = client ? `${client.first_name} ${client.last_name}` : 'a client';
        
        const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all() as any[];
        
        const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)');
        
        for (const admin of admins) {
           insertNotif.run(
              admin.id,
              'SHIFT_COMPLETED',
              'Shift Completed',
              `${staffName} has completed their shift with ${clientName} and submitted progress notes.`,
              '/roster'
           );
        }
      } catch (err) {
        logger.error(`Failed to create notifications for shift ${id}: ${err}`);
      }

      if (shift.respite_booking_id) {
         const childShifts = db.prepare("SELECT status FROM shifts WHERE respite_booking_id = ?").all(shift.respite_booking_id);
         const allCompleted = childShifts.every((s: any) => s.status === 'COMPLETED');
         if (allCompleted) {
             db.prepare("UPDATE respite_bookings SET status = 'COMPLETED' WHERE id = ?").run(shift.respite_booking_id);
             generateInvoiceForRespiteBooking(shift.respite_booking_id);
         }
      } else {
         // Generate Invoice for normal shift
         generateInvoiceForShift(id);
      }

      res.json({ success: true, abt_km, pTravelDistance: pTravel.distance });
    } catch(e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/shifts/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      let shiftToUpdate: any;
      db.transaction(() => {
        shiftToUpdate = db.prepare('SELECT staff_id, start_time FROM shifts WHERE id = ?').get(id);
        const invoices = db.prepare('SELECT file_path FROM invoices WHERE shift_id = ?').all(id);
        invoices.forEach((inv: any) => {
          if (inv.file_path) {
            const filePath = path.join(process.cwd(), 'invoices', inv.file_path);
            if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) { logger.warn('Failed to delete file', e); } }
          }
        });
        db.prepare('DELETE FROM invoices WHERE shift_id = ?').run(id);
        db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
      })();

      if (shiftToUpdate) {
        // Run without awaiting to avoid blocking response, or wrap in async. We can just call it (fire and forget) 
        // since we want it to happen after transaction
        (async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            await recalculateDayTravelForStaff(shiftToUpdate.staff_id, shiftToUpdate.start_time);
        })().catch(e => console.error(e));
      }

      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Services APIs ---
  app.get('/api/services', authenticateToken, (req: any, res: any) => {
    const { type } = req.query;
    
    // For staff, omit rate and rates_json completely
    const isStaff = req.user.role !== 'ADMIN';
    const selectCols = isStaff 
      ? 'id, code, name, description, type, unit, reg_group_number, reg_group_name'
      : '*';

    let query = `SELECT ${selectCols} FROM services`;
    
    if (type) {
      if (type === 'NDIS') {
        query += ` WHERE type = ? ORDER BY code ASC`;
      } else {
        query += ` WHERE type = ? ORDER BY name ASC`;
      }
      const services = db.prepare(query).all(type);
      return res.json(services);
    }
    const services = db.prepare(query + ' ORDER BY name ASC').all();
    res.json(services);
  });

  app.post('/api/services', authenticateToken, requireAdmin, (req, res) => {
    const { code, name, rate, description, type } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO services (code, name, rate, description, type) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(code, name, rate, description, type || 'NDIS');
      res.json({ id: info.lastInsertRowid, code, name, rate, description, type: type || 'NDIS' });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/services/import', authenticateToken, requireAdmin, upload.single('file'), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type, region } = req.body;
    if (type !== 'NDIS' && type !== 'HOME_CARE') {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Find the correct header row (NDIS sheets often have titles in row 1)
      const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let headerRowIndex = 0;
      
      for (let i = 0; i < Math.min(20, rawRows.length); i++) {
        const row = rawRows[i] || [];
        const hasCodeHeader = row.some((cell: any) => {
          if (!cell) return false;
          const str = String(cell).toLowerCase().trim();
          return str === 'code' || str === 'support item number' || str === 'support item';
        });
        if (hasCodeHeader) {
          headerRowIndex = i;
          break;
        }
      }

      const data: any[] = xlsx.utils.sheet_to_json(sheet, { range: headerRowIndex });

      let imported = 0;
      let updated = 0;

      const REGIONS = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'Remote', 'Very Remote'];
      const insertService = db.prepare('INSERT INTO services (code, name, rate, description, reg_group_number, reg_group_name, type, rates_json, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const updateService = db.prepare('UPDATE services SET code = ?, name = ?, rate = ?, description = ?, reg_group_number = ?, reg_group_name = ?, rates_json = ?, unit = ? WHERE id = ?');

      db.transaction(() => {
        // Keep a copy of the file on fileserver for future use
        if (req.file) {
          try {
            db.exec("ALTER TABLE files ADD COLUMN region TEXT");
          } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
          db.prepare('INSERT INTO files (original_name, system_name, size, uploaded_by, region) VALUES (?, ?, ?, ?, ?)').run(
            req.file.originalname, req.file.filename, req.file.size, req.user.id, region || null
          );
        }

        for (const row of data) {
          const keys = Object.keys(row);
          const NDIS_REGIONS = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'Remote', 'Very Remote'];
          const HOME_CARE_DAY_RATES = ['Weekday', 'Weekday (Non-Standard)', 'Saturday', 'Sunday', 'Public Holiday'];
          
          let codeKey, nameKey, descKey, rateKey, regGroupNumKey, regGroupNameKey, unitKey;

          if (type === 'HOME_CARE') {
            codeKey = keys.find(k => /serv\. id/i.test(k) || /serv\.? id/i.test(k) || k.trim().toLowerCase() === 'serv. id');
            nameKey = keys.find(k => k.trim().toLowerCase() === 'service' || /service/i.test(k));
            descKey = keys.find(k => k.trim().toLowerCase() === 'description' || /description/i.test(k));
            // Default rate is Weekday if it exists
            rateKey = keys.find(k => k.trim().toLowerCase() === 'weekday' || /weekday/i.test(k) && !/non-standard/i.test(k));
            unitKey = keys.find(k => k.trim().toLowerCase() === 'unit' || k.trim().toLowerCase() === 'uom');
          } else {
            codeKey = keys.find(k => k.trim().toLowerCase() === 'support item number') || keys.find(k => /code|support item number/i.test(k));
            nameKey = keys.find(k => k.trim().toLowerCase() === 'support item name') || keys.find(k => /support item name/i.test(k)) || keys.find(k => /name/i.test(k) && !/group/i.test(k) && !/category/i.test(k));
            descKey = keys.find(k => k.trim().toLowerCase() === 'description') || keys.find(k => /description/i.test(k));
            rateKey = (region && keys.find(k => k.trim().toLowerCase() === String(region).toLowerCase())) 
                         || keys.find(k => /rate|price/i.test(k));
            regGroupNumKey = keys.find(k => k.trim().toLowerCase() === 'registration group number') || keys.find(k => /registration group number/i.test(k));
            regGroupNameKey = keys.find(k => k.trim().toLowerCase() === 'registration group name') || keys.find(k => /registration group name/i.test(k));
            unitKey = keys.find(k => k.trim().toLowerCase() === 'unit' || k.trim().toLowerCase() === 'uom');
          }

          const code = codeKey ? String(row[codeKey]).trim() : undefined;
          const name = nameKey ? String(row[nameKey]).trim() : undefined;
          const description = descKey ? String(row[descKey]).trim() : '';
          const regGroupNum = regGroupNumKey ? String(row[regGroupNumKey]).trim() : '';
          const regGroupName = regGroupNameKey ? String(row[regGroupNameKey]).trim() : '';
          
          let rawUnit = unitKey ? String(row[unitKey]).trim().toUpperCase() : '';
          let unit = rawUnit;
          if (rawUnit === 'H') unit = 'Hour';
          else if (rawUnit === 'E') unit = 'Each';
          else if (rawUnit === 'D') unit = 'Day';
          else if (rawUnit === 'WK') unit = 'Week';
          else if (rawUnit === 'YR') unit = 'Year';
          else if (rawUnit === 'MON') unit = 'Month';
          
          if (!unit && type === 'HOME_CARE') {
            if (code === 'SERV-0026') {
              unit = 'Each';
            } else {
              unit = 'Hour';
            }
          }
          
          let rate = rateKey ? row[rateKey] : undefined;

          if (!code || !name) continue;
          
          // Integrity checks
          if (code.toLowerCase().includes('serv. id') || code.toLowerCase().includes('support item')) continue;
          if (name.toLowerCase().includes('support item name')) continue;
          if (code.length < 2) continue;

          if (typeof rate === 'string') {
              rate = parseFloat(rate.replace(/[^0-9.]/g, ''));
          }
          if (isNaN(rate) || rate === undefined) rate = 0;

          const ratesObj: Record<string, number> = {};
          if (type === 'HOME_CARE') {
            for (const day of HOME_CARE_DAY_RATES) {
              // Exact match or partial match
              const rKey = keys.find(k => k.trim().toLowerCase() === day.toLowerCase() || k.replace(/[\(\)-]/g, '').trim().toLowerCase() === day.replace(/[\(\)-]/g, '').trim().toLowerCase());
              if (rKey) {
                let rVal = row[rKey];
                if (typeof rVal === 'string') rVal = parseFloat(rVal.replace(/[^0-9.]/g, ''));
                if (isNaN(rVal) || rVal == null) rVal = 0;
                ratesObj[day] = rVal;
              }
            }
          } else {
            for (const reg of NDIS_REGIONS) {
              const rKey = keys.find(k => k.trim().toLowerCase() === reg.toLowerCase());
              if (rKey) {
                let rVal = row[rKey];
                if (typeof rVal === 'string') rVal = parseFloat(rVal.replace(/[^0-9.]/g, ''));
                if (isNaN(rVal) || rVal == null) rVal = 0;
                ratesObj[reg] = rVal;
              }
            }
          }
          const ratesJson = JSON.stringify(ratesObj);

          let existing: { id: number } | undefined = undefined;
          if (type === 'HOME_CARE') {
            existing = db.prepare('SELECT id FROM services WHERE code = ? AND type = ? AND name = ?').get(code, type, name) as any;
          } else {
            existing = db.prepare('SELECT id FROM services WHERE code = ? AND type = ?').get(code, type) as any;
          }

          if (existing) {
            updateService.run(code, name, rate, description, regGroupNum, regGroupName, ratesJson, unit, existing.id);
            updated++;
          } else {
            insertService.run(code, name, rate, description, regGroupNum, regGroupName, type, ratesJson, unit);
            imported++;
          }
        }
      })();

      if (imported === 0 && updated === 0 && data.length > 0) {
        return res.json({ 
          success: false, 
          error: `No valid rows found to import from ${data.length} rows. Seen headers: ${Object.keys(data[0]).join(', ')}` 
        });
      }

      res.json({ success: true, imported, updated });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/reports/staff-activity', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { startDate, endDate, staffId } = req.query;
      const settingsMap: any = db.prepare('SELECT key, value FROM settings').all().reduce((acc: any, row: any) => {
        acc[row.key] = typeof row.value === 'string' && (row.value.startsWith('{') || row.value.startsWith('[')) ? (()=>{try{return JSON.parse(row.value)}catch{return row.value}})() : row.value;
        return acc;
      }, {});

      let rawTz5 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz5 === 'string' ? rawTz5.replace(/['"]+/g, '') : rawTz5;
      
      let query = `
        SELECT s.*, 
               u.first_name as staff_first_name, u.last_name as staff_last_name,
               c.first_name as client_first_name, c.last_name as client_last_name,
               srv.name as service_name
        FROM shifts s
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN services srv ON s.service_id = srv.id
        WHERE s.status = 'COMPLETED'
      `;
      const params: any[] = [];
      if (startDate) {
        query += ` AND s.start_time >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        const endPlusOne = new Date(new Date(endDate).getTime() + 86400000).toISOString();
        query += ` AND s.start_time < ?`;
        params.push(endPlusOne);
      }
      if (staffId) {
        query += ` AND s.staff_id = ?`;
        params.push(staffId);
      }

      query += ` ORDER BY s.start_time DESC`;

      const shifts = db.prepare(query).all(...params) as any[];

      const hd = new Holidays('AU', 'WA');

      const shiftDateFormatter = getSafeDateTimeFormat('en-AU', {
        timeZone: timezone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const ymdFormatter = getSafeDateTimeFormat('en-CA', {
         timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
      });

      const totals: any = {
        weekdayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        publicHolidayHours: 0,
        travelKm: 0,
        providerTravelKm: 0,
        abtKm: 0,
        homeCareTravelTotal: 0
      };

      const activityLog = shifts.flatMap(shift => {
        const st = new Date(shift.actual_start_time || shift.start_time);
        const et = new Date(shift.actual_finish_time || shift.end_time);
        let hours = Math.max(0, et.getTime() - st.getTime()) / 3600000;

        const ymd = ymdFormatter.format(st); 
        const isPubHol = hd.isHoliday(new Date(ymd)); 
        
        const parts = shiftDateFormatter.formatToParts(st);
        let weekdayStr = parts.find((p: any) => p.type === 'weekday')?.value || '';
        
        let dayCategory = 'Weekday';
        if (isPubHol && isPubHol.some((h: any) => h.type === 'public')) {
          dayCategory = 'Public Holiday';
          totals.publicHolidayHours += hours;
        } else if (weekdayStr === 'Saturday') {
          dayCategory = 'Saturday';
          totals.saturdayHours += hours;
        } else if (weekdayStr === 'Sunday') {
          dayCategory = 'Sunday';
          totals.sundayHours += hours;
        } else {
          totals.weekdayHours += hours;
        }

        let servicesArray: any[] = [];
        try {
          servicesArray = shift.services_json ? JSON.parse(shift.services_json) : [];
        } catch(e) {}
        
        let serviceNamesList: string[] = [];
        if (servicesArray.length > 0) {
           for (const sData of servicesArray) {
              const srv = db.prepare('SELECT name FROM services WHERE id = ?').get(sData.serviceId) as any;
              if (srv && srv.name) {
                 const nameLower = srv.name.toLowerCase();
                 // Do not list Provider Travel or ABT here; they get their own dedicated rows
                 if (!nameLower.includes('provider travel') && !nameLower.includes('activity based transport')) {
                    if (!serviceNamesList.includes(srv.name)) {
                       serviceNamesList.push(srv.name);
                    }
                 }
              }
           }
        }
        
        let serviceProvided = shift.service_name || '';
        if (serviceNamesList.length > 0) {
           serviceProvided = serviceNamesList.join(', ');
        } else if (servicesArray.length > 0) {
           const primaryId = servicesArray[0]?.serviceId;
           if (primaryId && primaryId !== shift.service_id) {
              const mainSrv = db.prepare('SELECT name FROM services WHERE id = ?').get(primaryId) as any;
              if (mainSrv) {
                 serviceProvided = mainSrv.name;
              }
           }
        }
        
        const isHomeCare = (shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE');
        const hc_travel_km = shift.respite_booking_id ? 0 : (shift.home_care_travel_km || 0);
        const hc_travel_total = shift.respite_booking_id ? 0 : (shift.home_care_travel_total || 0);
        
        const prov_km = shift.respite_booking_id ? 0 : (shift.provider_travel_km || 0);
        const prov_cost = shift.respite_booking_id ? 0 : (shift.provider_travel_cost || 0);
        const abt_km = shift.respite_booking_id ? 0 : (shift.abt_km || 0);
        const abt_cost = shift.respite_booking_id ? 0 : (shift.abt_cost || 0);
        
        totals.travelKm += isHomeCare ? hc_travel_km : (prov_km + abt_km);
        totals.providerTravelKm = (totals.providerTravelKm || 0) + (isHomeCare ? 0 : prov_km);
        totals.abtKm = (totals.abtKm || 0) + (isHomeCare ? 0 : abt_km);
        
        const shiftTravelPay = isHomeCare ? hc_travel_total : (prov_cost + abt_cost);
        totals.travelPayTotal = (totals.travelPayTotal || 0) + shiftTravelPay;

        const dayOnly = parts.find((p: any) => p.type === 'day')?.value || '';
        const monthOnly = parts.find((p: any) => p.type === 'month')?.value || '';
        const yearOnly = parts.find((p: any) => p.type === 'year')?.value || '';
        const dayStr = `${weekdayStr} ${dayOnly}/${monthOnly}/${yearOnly}`;

        const rows = [];
        
        rows.push({
          id: shift.id + '_base',
          dateAndDay: dayStr,
          serviceProvided: serviceProvided,
          hoursWorked: parseFloat(hours.toFixed(2)),
          dayCategory: dayCategory,
          travelKm: isHomeCare ? parseFloat(hc_travel_km.toFixed(2)) : 0,
          travelReimbursement: isHomeCare ? parseFloat(hc_travel_total.toFixed(2)) : undefined,
          providerTravelKm: 0,
          abtKm: 0,
          staffName: `${shift.staff_first_name} ${shift.staff_last_name}`,
          clientName: shift.client_first_name ? `${shift.client_first_name} ${shift.client_last_name || ''}`.trim() : '-'
        });

        if (!isHomeCare && prov_km > 0) {
          rows.push({
            id: shift.id + '_prov',
            dateAndDay: dayStr,
            serviceProvided: 'Provider Travel',
            hoursWorked: 0,
            dayCategory: dayCategory,
            travelKm: parseFloat(prov_km.toFixed(2)),
            travelReimbursement: parseFloat(prov_cost.toFixed(2)),
            providerTravelKm: parseFloat(prov_km.toFixed(2)),
            abtKm: 0,
            staffName: `${shift.staff_first_name} ${shift.staff_last_name}`,
            clientName: shift.client_first_name ? `${shift.client_first_name} ${shift.client_last_name || ''}`.trim() : '-'
          });
        }

        if (!isHomeCare && abt_km > 0) {
          rows.push({
            id: shift.id + '_abt',
            dateAndDay: dayStr,
            serviceProvided: 'Activity Based Transport',
            hoursWorked: 0,
            dayCategory: dayCategory,
            travelKm: parseFloat(abt_km.toFixed(2)),
            travelReimbursement: parseFloat(abt_cost.toFixed(2)),
            providerTravelKm: 0,
            abtKm: parseFloat(abt_km.toFixed(2)),
            staffName: `${shift.staff_first_name} ${shift.staff_last_name}`,
            clientName: shift.client_first_name ? `${shift.client_first_name} ${shift.client_last_name || ''}`.trim() : '-'
          });
        }

        return rows;
      });

      res.json({
        log: activityLog,
        totals: {
          weekdayHours: parseFloat(totals.weekdayHours.toFixed(2)),
          saturdayHours: parseFloat(totals.saturdayHours.toFixed(2)),
          sundayHours: parseFloat(totals.sundayHours.toFixed(2)),
          publicHolidayHours: parseFloat(totals.publicHolidayHours.toFixed(2)),
          travelKm: parseFloat(totals.travelKm.toFixed(2)),
          travelPayTotal: parseFloat((totals.travelPayTotal || 0).toFixed(2))
        }
      });
    } catch (e: any) {
      logger.error(`Staff Activity Report Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Invoices APIs ---
  app.get('/api/invoices', authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT i.*, 
             COALESCE(s.start_time, rb.start_time) as start_time, 
             COALESCE(s.end_time, rb.end_time) as end_time, 
             COALESCE(s.notes, rb.notes) as shift_notes,
             c.first_name as client_first_name, c.last_name as client_last_name,
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             (SELECT COUNT(*) FROM invoices sub WHERE sub.merged_into_shift_id = s.id) > 0 as is_merged
      FROM invoices i
      LEFT JOIN shifts s ON i.shift_id = s.id
      LEFT JOIN respite_bookings rb ON i.respite_booking_id = rb.id
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users u ON s.staff_id = u.id
      WHERE i.merged_into_shift_id IS NULL AND i.status != 'VOID'
      ORDER BY i.created_at DESC
    `;
    const invoices = db.prepare(query).all() as any[];
    
    // For respite bookings, staff_first_name and staff_last_name are null because there's no s.staff_id.
    // Fetch unique staff members from child shifts.
    for (const inv of invoices) {
       if (inv.respite_booking_id && !inv.staff_first_name) {
          const childStaff = db.prepare(`
             SELECT DISTINCT u.first_name, u.last_name
             FROM shifts s
             JOIN users u ON s.staff_id = u.id
             WHERE s.respite_booking_id = ?
          `).all(inv.respite_booking_id) as any[];
          
          if (childStaff.length > 0) {
             const names = childStaff.map(s => `${s.first_name} ${s.last_name}`).join(', ');
             // Since the table expects staff_first_name and staff_last_name to be merged, we just set `staff_first_name` to the merged string and leave `last_name` empty. 
             inv.staff_first_name = names;
             inv.staff_last_name = '';
          }
       }
    }

    res.json(invoices);
  });

  app.get('/api/invoices/form-data', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const clients = db.prepare('SELECT id, first_name, last_name FROM clients ORDER BY first_name ASC').all();
      const staff = db.prepare("SELECT id, first_name, last_name FROM users WHERE role IN ('STAFF', 'ADMIN') AND status = 'ACTIVE' ORDER BY first_name ASC").all();
      const services = db.prepare('SELECT id, name, rate, unit, code, type FROM services ORDER BY name ASC').all();
      
      const clientServices = db.prepare('SELECT * FROM client_services').all();
      const clientsWithServices = (clients as any[]).map(c => ({
        ...c,
        service_ids: clientServices.filter((cs: any) => cs.client_id === c.id).map((cs: any) => cs.service_id)
      }));
      
      res.json({ clients: clientsWithServices, staff, services });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/invoices/manual', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { clientId, staffId, services, date, startTime, endTime } = req.body;
    
    if (!clientId || !staffId || !services || !Array.isArray(services) || services.length === 0 || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields or services array' });
    }

    try {
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;

      // 1. Create a completed shift
      const mainServiceId = services[0].serviceId;
      const servicesJson = JSON.stringify(services);

      const shiftResult = db.prepare(`
        INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, actual_finish_time, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run(clientId, staffId, mainServiceId, servicesJson, startDateTime, endDateTime, endDateTime, 'Manually generated invoice');

      const shiftId = shiftResult.lastInsertRowid as number;

      // 2. Generate the invoice
      generateInvoiceForShift(shiftId);

      const invoice = db.prepare('SELECT * FROM invoices WHERE shift_id = ?').get(shiftId);
      res.json({ success: true, invoice });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/invoices/merge', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length < 2) {
      return res.status(400).json({ error: 'Must provide at least two invoice IDs to merge' });
    }

    try {
      // Fetch all invoices
      const placeholders = invoiceIds.map(() => '?').join(',');
      const invoices = db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...invoiceIds) as any[];

      if (invoices.length !== invoiceIds.length) {
         return res.status(400).json({ error: 'Some invoices could not be found' });
      }

      // Ensure all invoices belong to the same client
      const clientId = invoices[0].client_id;
      if (!invoices.every(i => i.client_id === clientId)) {
         return res.status(400).json({ error: 'All merged invoices must belong to the same client' });
      }

      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: Record<string, any> = {};
      settingsRows.forEach(r => {
        try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; }
      });
      let rawTz6 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz6 === 'string' ? rawTz6.replace(/['"]+/g, '') : rawTz6;

      const shiftDateFormatter = getSafeDateTimeFormat('en-GB', {
        timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric'
      });
      const timeFormatter = getSafeDateTimeFormat('en-US', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit'
      });

      const allMergedServices: any[] = [];
      let latestStartTime = '1970-01-01T00:00:00';
      let latestEndTime = '1970-01-01T00:00:00';
      let mainStaffId = null;

      for (const inv of invoices) {
         if (!inv.shift_id) continue;
         const shift = db.prepare(`SELECT s.*, u.first_name as s_fn, u.last_name as s_ln FROM shifts s LEFT JOIN users u ON s.staff_id = u.id WHERE s.id = ?`).get(inv.shift_id) as any;
         if (!shift) continue;

         if (!mainStaffId) mainStaffId = shift.staff_id;
         if (shift.start_time > latestStartTime) {
             latestStartTime = shift.start_time;
             latestEndTime = shift.end_time;
         }

         const start = new Date(shift.start_time);
         const end = new Date(shift.end_time);
         const hours = Math.abs(end.getTime() - start.getTime()) / 36e5;
         const shiftDateStr = shiftDateFormatter.format(start);
         const timeStr = `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
         const staffName = `${shift.s_fn || ''} ${shift.s_ln || ''}`.trim();

         let servicesData = [];
         if (shift.services_json) {
            try { servicesData = JSON.parse(shift.services_json); } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
         }
         
         if (servicesData.length > 0) {
            for (const sd of servicesData) {
               allMergedServices.push({
                  ...sd,
                  date: sd.date || shiftDateStr,
                  time: sd.time || timeStr,
                  staffName: sd.staffName || staffName
               });
            }
         } else if (shift.service_id) {
            allMergedServices.push({
               serviceId: shift.service_id,
               qtyOverride: hours.toFixed(2),
               date: shiftDateStr,
               time: timeStr,
               staffName: staffName
            });
            // We'd also need provider travel / abt fallback handling here, but services_json is default now.
         }
      }

      if (allMergedServices.length === 0) {
         return res.status(400).json({ error: 'No billable services found in the selected invoices' });
      }

      // Services are already in descending order because invoices are fetched `ORDER BY created_at DESC`
      // and we append their individual services sequentially.

      db.transaction(() => {
        // Create new shift representing the merged invoice
        const mainServiceId = allMergedServices[0].serviceId;
        const shiftResult = db.prepare(`
          INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
        `).run(clientId, mainStaffId, mainServiceId, JSON.stringify(allMergedServices), latestStartTime, latestEndTime, 'Merged Invoice Summary');
        
        const newShiftId = shiftResult.lastInsertRowid as number;
        
        // Update old invoices to be VOID and link to new shift
        db.prepare(`UPDATE invoices SET status = 'VOID', merged_into_shift_id = ? WHERE id IN (${placeholders})`).run(newShiftId, ...invoiceIds);

        // Generate new invoice
        generateInvoiceForShift(newShiftId);
      })();

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/invoices/undo-merge/:id', authenticateToken, requireAdmin, (req: any, res: any) => {
    const mergedInvoiceId = parseInt(req.params.id);
    if (!mergedInvoiceId) return res.status(400).json({ error: 'Invalid invoice ID' });

    try {
      db.transaction(() => {
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(mergedInvoiceId) as any;
        if (!invoice) throw new Error('Invoice not found');
        
        const mergedShiftId = invoice.shift_id;

        // Restore old invoices
        db.prepare(`UPDATE invoices SET status = 'GENERATED', merged_into_shift_id = NULL WHERE merged_into_shift_id = ?`).run(mergedShiftId);

        // Delete the merged invoice and shift
        db.prepare('DELETE FROM invoices WHERE id = ?').run(mergedInvoiceId);
        db.prepare('DELETE FROM shifts WHERE id = ?').run(mergedShiftId);
      })();
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/invoices/:id/status', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { status } = req.body;
    const { id } = req.params;
    
    if (!status || !['GENERATED', 'SENT', 'PAID', 'VOID'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
      db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id);
      
      if (status === 'PAID') {
        const invoiceRow = db.prepare('SELECT shift_id, invoice_number FROM invoices WHERE id = ?').get(id) as any;
        if (invoiceRow && invoiceRow.shift_id) {
          const shiftId = invoiceRow.shift_id;
          const data = getInvoiceDataForShift(shiftId);
          if (data && data.lineItems.length > 0) {
             const systemName = `invoice_${data.invoiceNum}_${Date.now()}.pdf`;
             const filePath = path.join(process.cwd(), 'uploads', systemName);
             
             const doc = new PDFDocument({ margin: 50 });
             const writeStream = fs.createWriteStream(filePath);
             doc.pipe(writeStream);
             buildInvoicePdf(doc, data);
             doc.end();

             writeStream.on('finish', () => {
                const clientNameSafe = `${data.shift.c_fn} ${data.shift.c_ln}`.trim();
                const folderPath = `/Clients/${clientNameSafe}/Invoices`;
                const stats = fs.statSync(filePath);
                try {
                  const stmt = db.prepare('INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)');
                  stmt.run(`${data.invoiceNum}.pdf`, systemName, stats.size, req.user.id, folderPath);
                } catch(e) {
                  console.error('Failed to insert file record', e);
                }
             });
          }
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/invoices/:id', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/invoices/bulk-delete', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { invoiceIds } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds)) {
      return res.status(400).json({ error: 'invoiceIds array required' });
    }
    if (invoiceIds.length === 0) {
      return res.json({ success: true });
    }

    try {
      const placeholders = invoiceIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM invoices WHERE id IN (${placeholders})`).run(...invoiceIds);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/invoices/pending-shifts', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const query = `
        SELECT s.*, 
               c.first_name as client_first_name, c.last_name as client_last_name,
               u.first_name as staff_first_name, u.last_name as staff_last_name
        FROM shifts s
        JOIN clients c ON s.client_id = c.id
        JOIN users u ON s.staff_id = u.id
        LEFT JOIN invoices i ON s.id = i.shift_id
        WHERE s.status = 'COMPLETED' AND i.id IS NULL AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
        ORDER BY s.start_time DESC
      `;
      const shifts = db.prepare(query).all();
      res.json(shifts);
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/invoices/:shiftId/generate', authenticateToken, requireAdmin, (req: any, res: any) => {
    const shiftId = parseInt(req.params.shiftId);
    if (!shiftId) return res.status(400).json({ error: 'Invalid shiftId' });
    try {
      generateInvoiceForShift(shiftId);
      const invoice = db.prepare('SELECT * FROM invoices WHERE shift_id = ?').get(shiftId);
      if (invoice) {
        res.json({ success: true, invoice });
      } else {
        res.status(400).json({ error: 'Failed to generate invoice. Shift might not have cost-bearing items.' });
      }
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  const buildInvoicePdf = (doc: any, data: any) => {
    const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal } = data;

    if (settingsMap.letterheadLogo) {
      try {
        let buffer: Buffer | null = null;
        
        if (settingsMap.letterheadLogo.startsWith('/api/assets/')) {
          const fileWithQuery = settingsMap.letterheadLogo.split('/').pop();
          const filename = fileWithQuery.split('?')[0]; // Strip the query params
          const persistentAssetPath = path.join(process.cwd(), 'uploads', 'assets', filename);
          const oldAssetPath = path.join(process.cwd(), 'assets', filename);
          
          if (fs.existsSync(persistentAssetPath)) {
            buffer = fs.readFileSync(persistentAssetPath);
          } else if (fs.existsSync(oldAssetPath)) {
            buffer = fs.readFileSync(oldAssetPath);
          }
        } else if (settingsMap.letterheadLogo.startsWith('data:image/')) {
          const base64Data = settingsMap.letterheadLogo.replace(/^data:image\/\w+;base64,/, "");
          buffer = Buffer.from(base64Data, 'base64');
        }
        
        if (buffer) {
          doc.image(buffer, 50, 40, { height: 50 });
          doc.y = 40;
        } else {
           doc.moveDown();
        }
      } catch (e) {
        console.error("Error drawing letterhead:", e);
        doc.moveDown();
      }
    } else {
      doc.moveDown();
      doc.fontSize(14).text(settingsMap.businessName || 'Happy in the Home');
      doc.fontSize(10).text(`ABN: ${settingsMap.abn || '12 345 678 910'}`);
      doc.text(settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000');
      doc.moveDown();
    }

    doc.fillColor('black');
    doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Invoice No: ${invoiceNum}`, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, { align: 'right' });
    doc.moveDown();

    const topY = 110;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('FROM', 50, topY);
    doc.fontSize(12).font('Helvetica-Bold').text(settingsMap.businessName || 'Happy in the Home', 50, topY + 15);
    doc.fontSize(10).font('Helvetica').text(`ABN: ${settingsMap.abn || '12 345 678 910'}`, 50, topY + 30);
    doc.text(settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000', 50, topY + 45);
    const bizEmail = settingsMap.businessEmail || '';
    if (bizEmail) doc.text(bizEmail, 50, topY + 60);

    const billToLabel = ((shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE')) ? 'PROVIDER' : 'PLAN MANAGER';
    let billToName = shift.plan_manager_name || `${shift.c_fn} ${shift.c_ln}`;
    let billToEmail = shift.plan_manager_email || '';
    let billToAddress = shift.plan_manager_address || '';

    doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('BILL TO', 300, topY);
    doc.fontSize(12).text(`${shift.c_fn} ${shift.c_ln}`, 300, topY + 15);
    doc.fontSize(10).font('Helvetica').text(`NDIS No: ${shift.ndis_number || 'N/A'}`, 300, topY + 30);
    
    doc.moveDown(1);
    const pmY = doc.y;
    doc.fontSize(8).fillColor('gray').text(billToLabel, 300, pmY).fillColor('black');
    doc.fontSize(10).font('Helvetica').text(billToName, 300, pmY + 10);
    if (billToEmail) doc.text(billToEmail, 300, pmY + 22);
    if (billToAddress) doc.text(billToAddress, 300, pmY + 34);

    doc.moveDown(4);

    let currentY = Math.max(doc.y + 10, 250);
    
    // Table Header
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('DATE', 50, currentY, { width: 60, align: 'left' });
    doc.text('DESCRIPTION', 110, currentY, { width: 180, align: 'left' });
    doc.text('TIME', 290, currentY, { width: 90, align: 'left' });
    doc.text('QTY', 385, currentY, { width: 35, align: 'right' });
    doc.text('UNIT', 425, currentY, { width: 55, align: 'left' });
    doc.text('RATE', 485, currentY, { width: 45, align: 'right' });
    doc.text('AMOUNT', 535, currentY, { width: 45, align: 'right' });
    
    doc.moveTo(50, currentY + 15).lineTo(580, currentY + 15).stroke();

    currentY += 20;
    doc.font('Helvetica').fontSize(10);
    
    lineItems.forEach((item: any) => {
      // Automatically add page if we get too close to the bottom
      if (currentY > 700) {
         doc.addPage();
         currentY = 50;
      }

      doc.fontSize(10);
      doc.text(item.date, 50, currentY, { width: 60, align: 'left' });
      
      doc.fontSize(9).text(item.time, 290, currentY, { width: 90, align: 'left' });
      doc.fontSize(10);
      
      // Calculate dynamic height for description block
      let textHeight = doc.heightOfString(item.serviceName, { width: 180 }) || 15;
      doc.text(item.serviceName, 110, currentY, { width: 180, align: 'left' });
      
      let descY = currentY + textHeight + 2;
      const codePrefix = ((shift.funding_type === 'HCP' || shift.funding_type === 'Home Care' || shift.funding_type === 'HOME_CARE')) ? 'Serv. ID:' : 'Code:';
      doc.fontSize(9).text(`${codePrefix} ${item.code || 'N/A'}`, 110, descY, { width: 180, align: 'left' });
      
      if (item.metadata) {
         descY += 12;
         doc.text(item.metadata, 110, descY, { width: 180, align: 'left' });
      }
      
      doc.fontSize(10);
      doc.text(item.qty.toString(), 385, currentY, { width: 35, align: 'right' });
      doc.text(item.unit, 425, currentY, { width: 55, align: 'left' });
      doc.text(`$${item.rate.toFixed(2)}`, 485, currentY, { width: 45, align: 'right' });
      doc.text(`$${item.amount.toFixed(2)}`, 535, currentY, { width: 45, align: 'right' });
      
      // Dynamic Row Height: increment currentY by that height plus a 5pt buffer
      doc.moveTo(50, descY + 15).lineTo(580, descY + 15).stroke();
      currentY = descY + 20;
    });

    const totalsY = currentY + 40;

    let bankName = 'National Australia Bank';
    let bankAccName = 'Happy in the Home';
    let bankBsb = '086-554';
    let bankAcc = '506627847';
    try {
       if (settingsMap.bankName) bankName = settingsMap.bankName;
       if (settingsMap.bankAccountName) bankAccName = settingsMap.bankAccountName;
       if (settingsMap.bankBsb) bankBsb = settingsMap.bankBsb;
       if (settingsMap.bankAcc) bankAcc = settingsMap.bankAcc;
    } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

    doc.font('Helvetica-Bold').fontSize(10).text('PAYMENT DETAILS', 50, totalsY);
    doc.font('Helvetica').text(`Bank: ${bankName}`, 50, totalsY + 15);
    doc.text(`Account: ${bankAccName}`, 50, totalsY + 27);
    doc.text(`BSB: ${bankBsb}`, 50, totalsY + 39);
    doc.text(`Acc No: ${bankAcc}`, 50, totalsY + 51);
    doc.font('Helvetica-Bold').text(`Reference: ${invoiceNum}`, 50, totalsY + 67);

    doc.font('Helvetica');
    doc.text('Subtotal:', 380, totalsY + 15, { width: 100, align: 'right' });
    doc.text(`$${subtotal.toFixed(2)}`, 480, totalsY + 15, { width: 70, align: 'right' });
    
    doc.text('GST (GST-Free):', 380, totalsY + 30, { width: 100, align: 'right' });
    doc.text('$0.00', 480, totalsY + 30, { width: 70, align: 'right' });

    doc.moveTo(380, totalsY + 45).lineTo(550, totalsY + 45).stroke();
    
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL AMOUNT:', 350, totalsY + 55, { width: 130, align: 'right' });
    doc.text(`$${subtotal.toFixed(2)}`, 480, totalsY + 55, { width: 70, align: 'right' });

    doc.moveDown(4);
    let paymentDueDays = settingsMap.paymentDueDays || 14;
    doc.font('Helvetica').fontSize(10).text(`THANK YOU FOR YOUR BUSINESS. PAYMENT IS DUE WITHIN ${paymentDueDays} DAYS.`, 50, doc.y, { align: 'center' });
  };

  app.get('/api/invoices/:id/download-by-id', authenticateToken, (req: any, res: any) => {
    const invoiceId = parseInt(req.params.id);
    if (!invoiceId) return res.status(400).json({ error: 'Invalid invoiceId' });
    
    try {
      const invoiceRow = db.prepare('SELECT shift_id, respite_booking_id FROM invoices WHERE id = ?').get(invoiceId) as any;
      if (!invoiceRow) return res.status(404).json({ error: 'Invoice not found' });
      
      let data: any = null;
      if (invoiceRow.respite_booking_id) {
         data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
      } else if (invoiceRow.shift_id) {
         data = getInvoiceDataForShift(invoiceRow.shift_id);
      }

      if (!data) return res.status(404).json({ error: 'Invoice data not found' });
      if (data.lineItems.length === 0) return res.status(400).json({ error: 'No billable items' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${data.invoiceNum}.pdf"`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);
      
      buildInvoicePdf(doc, data);

      doc.end();

    } catch (e: any) {
      console.error('Failed to generate dynamic invoice:', e);
      if (!res.headersSent) 
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/invoices/:shiftId/download', authenticateToken, (req: any, res: any) => {
    const shiftId = parseInt(req.params.shiftId);
    if (!shiftId) return res.status(400).json({ error: 'Invalid shiftId' });
    
    try {
      const data = getInvoiceDataForShift(shiftId);
      if (!data) return res.status(404).json({ error: 'Invoice data not found' });
      if (data.lineItems.length === 0) return res.status(400).json({ error: 'No billable items' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${data.invoiceNum}.pdf"`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);
      
      buildInvoicePdf(doc, data);

      doc.end();

    } catch (e: any) {
      console.error('Failed to generate dynamic invoice:', e);
      if (!res.headersSent) 
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/invoices/download/:filename', authenticateToken, (req: any, res: any) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'invoices', filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'Invoice PDF not found' });
    }
  });

  // --- Files APIs ---
  // --- Quotes APIs ---
  app.get('/api/quotes', authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT q.*, 
             c.first_name as client_first_name, c.last_name as client_last_name,
             u.first_name as staff_first_name, u.last_name as staff_last_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.staff_id = u.id
      ORDER BY q.created_at DESC
    `;
    try {
      const quotes = db.prepare(query).all();
      res.json(quotes);
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/quotes', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { clientId, activityName, date, services, importantNotes } = req.body;
    try {
      const prefix = 'QUO';
      const c = db.prepare('SELECT first_name FROM clients WHERE id = ?').get(clientId) as any;
      const cInitial = c ? c.first_name.substring(0, 3).toUpperCase() : 'XXX';
      const dateStr = date.replace(/-/g, '').substring(4, 8);
      const timestampPart = Date.now().toString().slice(-3);
      const quoteNumber = `${prefix}-${cInitial}-${dateStr}-${timestampPart}`;

      // Calculate amount based on services map
      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: Record<string, any> = {};
      settingsRows.forEach(r => { try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; } });

      let calculatedAmount = 0;
      const parsedDate = new Date(date);
      const dayOfWeek = parsedDate.getDay();

      if (services && Array.isArray(services)) {
        services.forEach(sd => {
          const srv = db.prepare('SELECT * FROM services WHERE id = ?').get(sd.serviceId) as any;
          if (srv) {
             let qty = sd.qtyOverride ? Number(sd.qtyOverride) : 0;
             let finalRate = Number(srv.rate || 0);
             if (srv.type === 'HOME_CARE' && srv.rates_json) {
                try {
                   const rates = JSON.parse(srv.rates_json);
                   if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
                   else if (dayOfWeek === 6 && rates['Saturday']) finalRate = Number(rates['Saturday']);
                   else if (rates['Weekday']) finalRate = Number(rates['Weekday']);
                } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
             } else if (srv.type === 'NDIS' && srv.rates_json) {
                try {
                   const rates = JSON.parse(srv.rates_json);
                   const region = settingsMap.ndisRegion || 'NSW';
                   if (rates[region] !== undefined) finalRate = Number(rates[region]);
                } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
             }
             calculatedAmount += qty * finalRate;
          }
        });
      }

      const stmt = db.prepare(`
        INSERT INTO quotes (quote_number, client_id, activity_name, activity_date, services_json, amount, status, important_notes)
        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?)
      `);
      stmt.run(quoteNumber, clientId, activityName, date, JSON.stringify(services || []), calculatedAmount, importantNotes || null);

      res.json({ success: true });
    } catch(e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/quotes/:id', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/quotes/bulk-delete', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { quoteIds } = req.body;
    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) return res.json({ success: true });
    try {
      const placeholders = quoteIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM quotes WHERE id IN (${placeholders})`).run(...quoteIds);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/quotes/:id/download', authenticateToken, (req: any, res: any) => {
    try {
      const quoteId = req.params.id;
      const query = `
        SELECT q.*, 
               c.first_name as c_fn, c.last_name as c_ln, c.ndis_number, c.address as c_address, c.provider_id
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
      `;
      const quote = db.prepare(query).get(quoteId) as any;
      if (!quote) return res.status(404).json({ error: 'Quote not found' });

      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((row) => { try { settingsMap[row.key] = JSON.parse(row.value); } catch { settingsMap[row.key] = row.value; } });

      let rawTz7 = settingsMap.timezone || 'Australia/Perth';
      const timezone = typeof rawTz7 === 'string' ? rawTz7.replace(/['"]+/g, '') : rawTz7;
      const dateFormatter = getSafeDateTimeFormat('en-US', {
         timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric'
      });

      let quoteDateStr = '';
      try {
        quoteDateStr = dateFormatter.format(new Date(quote.created_at || Date.now()));
      } catch(e) { quoteDateStr = String(quote.created_at); }

      let activityDateStr = '';
      try {
        activityDateStr = dateFormatter.format(new Date(quote.activity_date));
      } catch(e) { activityDateStr = String(quote.activity_date); }

      let servicesData: any[] = [];
      try {
         if (quote.services_json) servicesData = JSON.parse(quote.services_json);
      } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }

      const parsedDate = new Date(quote.activity_date || Date.now());
      const dayOfWeek = isNaN(parsedDate.getTime()) ? 1 : parsedDate.getDay();
      let subtotal = 0;
      let lineItems: any[] = [];

      if (servicesData.length > 0) {
        servicesData.forEach(sd => {
          const srv = db.prepare('SELECT * FROM services WHERE id = ?').get(sd.serviceId) as any;
          if (srv) {
             let qty = sd.qtyOverride ? Number(sd.qtyOverride) : 0;
             let finalRate = Number(srv.rate || 0);
             if (srv.type === 'HOME_CARE' && srv.rates_json) {
                try {
                   const rates = JSON.parse(srv.rates_json);
                   if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
                   else if (dayOfWeek === 6 && rates['Saturday']) finalRate = Number(rates['Saturday']);
                   else if (rates['Weekday']) finalRate = Number(rates['Weekday']);
                } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
             } else if (srv.type === 'NDIS' && srv.rates_json) {
                try {
                   const rates = JSON.parse(srv.rates_json);
                   const region = settingsMap.ndisRegion || 'NSW';
                   if (rates[region] !== undefined) finalRate = Number(rates[region]);
                } catch(e) { if (e.message && !e.message.includes('duplicate column') && !e.message.includes('no such column')) logger.warn('Migration/Query warning:', e.message); }
             }
             const amt = qty * finalRate;
             subtotal += amt;
             let mappedUnit = srv.unit || 'H';
             if (mappedUnit === 'Hour') mappedUnit = 'H';
             if (mappedUnit === 'KM') mappedUnit = 'Kilometre';

             lineItems.push({
               desc: srv.name,
               code: srv.code || 'N/A',
               qty: qty,
               unit: mappedUnit,
               rate: finalRate,
               amount: amt
             });
          }
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      if (settingsMap.letterheadLogo) {
        try {
          let buffer: Buffer | null = null;
          if (settingsMap.letterheadLogo.startsWith('/api/assets/')) {
            const fileWithQuery = settingsMap.letterheadLogo.split('/').pop();
            const filename = fileWithQuery.split('?')[0];
            const persistentAssetPath = path.join(process.cwd(), 'uploads', 'assets', filename);
            const oldAssetPath = path.join(process.cwd(), 'assets', filename);
            if (fs.existsSync(persistentAssetPath)) {
               buffer = fs.readFileSync(persistentAssetPath);
            } else if (fs.existsSync(oldAssetPath)) {
               buffer = fs.readFileSync(oldAssetPath);
            }
          } else if (settingsMap.letterheadLogo.startsWith('data:image/')) {
            const base64Data = settingsMap.letterheadLogo.replace(/^data:image\/\w+;base64,/, "");
            buffer = Buffer.from(base64Data, 'base64');
          }
          if (buffer) {
             doc.image(buffer, 450, 40, { fit: [100, 70], align: 'right' });
          }
        } catch(e) { console.error('Logo render error:', e); }
      }

      doc.fontSize(24).font('Helvetica-Bold').fillColor('#18181b').text('SERVICE QUOTE', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#52525b').text(settingsMap.businessName || 'Happy in the Home', 50, 80);
      doc.moveDown(2);

      const topY = 130;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('From:', 50, topY);
      doc.fontSize(10).font('Helvetica').text(settingsMap.businessName || 'Happy in the Home', 50, topY + 15);
      doc.text(settingsMap.businessPhone || '0400000000', 50, topY + 30);
      doc.text(settingsMap.businessEmail || 'info@happyinthehome.org', 50, topY + 45);
      doc.text(settingsMap.businessAddress || '123 Care Lane, Sydney NSW 2000', 50, topY + 60);

      doc.font('Helvetica-Bold').text('Quote Date: ', 350, topY).font('Helvetica').text(quoteDateStr, 420, topY);
      doc.font('Helvetica-Bold').text('Quote ID: ', 350, topY + 15).font('Helvetica').text(quote.quote_number, 405, topY + 15);
      doc.font('Helvetica-Bold').text('Valid Until: ', 350, topY + 30).font('Helvetica').text(quoteDateStr, 415, topY + 30); // You can add actual valid until logic if needed

      // Participant Details Box
      const partY = 230;
      doc.rect(50, partY, 4, 70).fill('#0ea5e9'); // Cyan left border
      doc.fillColor('black');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0ea5e9').text('Participant Details', 65, partY + 5);
      doc.fillColor('black').fontSize(10);
      doc.font('Helvetica-Bold').text('Name: ', 65, partY + 25, { continued: true }).font('Helvetica').text(`${quote.c_fn || ''} ${quote.c_ln || ''}`.trim() || 'N/A');
      doc.font('Helvetica-Bold').text('Service Activity: ', 65, partY + 40, { continued: true }).font('Helvetica').text(quote.activity_name || '');
      doc.font('Helvetica-Bold').text('Date of Activity: ', 65, partY + 55, { continued: true }).font('Helvetica').text(activityDateStr);

      let currentY = 330;
      
      // Table Header
      doc.rect(50, currentY, 500, 25).fill('#f4f4f5'); // Light gray bg for header
      doc.fillColor('#18181b').font('Helvetica-Bold').fontSize(9);
      doc.text('Description', 60, currentY + 8, { width: 180, align: 'left' });
      doc.text('NDIS Code', 250, currentY + 8, { width: 100, align: 'left' });
      doc.text('Quantity', 350, currentY + 8, { width: 50, align: 'center' });
      doc.text('Rate', 410, currentY + 8, { width: 50, align: 'right' });
      doc.text('Total', 480, currentY + 8, { width: 60, align: 'right' });
      
      doc.moveTo(50, currentY + 25).lineTo(550, currentY + 25).strokeColor('#e4e4e7').stroke();

      currentY += 35;
      doc.font('Helvetica').fontSize(9);
      
      lineItems.forEach((item: any) => {
        if (currentY > 700) {
           doc.addPage();
           currentY = 50;
        }
        
        doc.fillColor('#18181b');
        doc.text(item.desc || 'Unknown', 60, currentY, { width: 180, align: 'left' });
        doc.text(item.code || 'N/A', 250, currentY, { width: 100, align: 'left' });
        
        // Quantity & Unit
        doc.text(String(item.qty || 0), 350, currentY, { width: 50, align: 'center' });
        doc.fillColor('#71717a').fontSize(8).text(item.unit || '', 350, currentY + 12, { width: 50, align: 'center' });
        
        doc.fillColor('#18181b').fontSize(9);
        doc.text(`$${item.rate.toFixed(2)}`, 410, currentY, { width: 50, align: 'right' });
        doc.text(`$${item.amount.toFixed(2)}`, 480, currentY, { width: 60, align: 'right' });
        
        currentY += 25;
        doc.moveTo(50, currentY).lineTo(550, currentY).strokeColor('#e4e4e7').stroke();
        currentY += 10;
      });

      currentY += 10;
      
      // Total Box
      doc.rect(50, currentY, 500, 40).fill('#f4f4f5');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(12);
      doc.text('TOTAL QUOTE AMOUNT:', 250, currentY + 14, { width: 150, align: 'right' });
      doc.fontSize(14).text(`$${subtotal.toFixed(2)}`, 410, currentY + 13, { width: 120, align: 'right' });

      currentY += 70;

      // Important Notes
      doc.font('Helvetica-Bold').fontSize(12).fillColor('black').text('Important Notes', 50, currentY);
      currentY += 20;
      doc.moveTo(50, currentY).lineTo(550, currentY).strokeColor('#e4e4e7').stroke();
      currentY += 10;

      doc.font('Helvetica').fontSize(9).fillColor('#52525b');
      const defaultNotes = 
        "Remote Billing: This quote is calculated using the NDIS Price Guide for Remote (MMM 6) locations.\n" +
        "Transport: Final transport billing will be based on verified logbook odometer readings at a rate of $1.00 per kilometer.\n" +
        "Exclusions: NDIS funding does not cover personal expenses such as meals, snacks, or activity entry fees. These are out-of-pocket costs for the participant.\n" +
        "Goal Alignment: This support is designed to facilitate community participation and social engagement goals.\n" +
        "Cancellations: Charges for cancellations will be applied in accordance with the current NDIS Pricing Arrangements and Price Limits.";
      
      const customNotes = quote.important_notes ? quote.important_notes.trim() : "";
      const notes = customNotes !== "" ? customNotes : defaultNotes;
      
      notes.split('\n').forEach((line: string) => {
        doc.text(line, 50, currentY, { width: 500 });
        currentY += doc.heightOfString(line, { width: 500 }) + 5;
      });

      doc.end();

    } catch (e: any) {
      console.error("DEBUG QUOTE DOWNLOAD ERROR:", e);
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/files', authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT f.*, u.first_name, u.last_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
    `;
    if (req.user.role !== 'ADMIN') {
      query += ' WHERE f.uploaded_by = ?';
      const files = db.prepare(query).all(req.user.id);
      return res.json(files);
    }
    const files = db.prepare(query).all();
    res.json(files);
  });

  app.post('/api/files', authenticateToken, upload.single('file'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const folderPath = req.query.folderPath || '/';
    const dateIssued = req.body.date_issued || null;
    const dateExpires = req.body.date_expires || null;
    try {
      const stmt = db.prepare('INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(req.file.originalname, req.file.filename, req.file.size, req.user.id, folderPath, dateIssued, dateExpires);
      res.json({ success: true, id: info.lastInsertRowid, date_issued: dateIssued, date_expires: dateExpires });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/files/download/:id', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });
      
      // Basic security for non-admins
      if (req.user.role !== 'ADMIN' && file.uploaded_by !== req.user.id) {
         return res.status(403).json({ error: 'Forbidden' });
      }

      const filePath = path.join(process.cwd(), 'uploads', file.system_name);
      if (fs.existsSync(filePath)) {
        res.download(filePath, file.original_name);
      } else {
        res.status(404).json({ error: 'File on disk not found' });
      }
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/files/:id', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    try {
      const file = db.prepare('SELECT system_name, uploaded_by FROM files WHERE id = ?').get(id) as any;
      if (file) {
         if (req.user.role !== 'ADMIN' && file.uploaded_by !== req.user.id) {
           return res.status(403).json({ error: 'Forbidden' });
         }
         const filePath = path.join(process.cwd(), 'uploads', file.system_name);
         if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) { logger.warn('Failed to delete file', e); } }
      }
      db.prepare('DELETE FROM files WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Cleanup endpoint
  app.post('/api/cleanup', authenticateToken, requireAdmin, (req, res) => {
    try {
      db.transaction(() => {
        db.prepare(`DELETE FROM shifts WHERE status IN ('DELETED', 'deleted', 'CANCELLED')`).run();
      })();
      res.json({ message: 'Cleanup complete: Removed orphaned or deleted/cancelled shifts.' });
    } catch (e: any) {
      
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  // Compliance & Audit Endpoints

  const parseLocationString = (str: string) => {
    const parsed = { name: str, address: '', coords: '' };
    const parts = str.split(/(\[[\d.,\s-]+\])/);
    parts.forEach(part => {
        if (part.startsWith('[') && part.endsWith(']')) {
            parsed.coords = part;
        } else if (part.includes('(') && part.includes(')')) {
            const openIdx = part.indexOf('(');
            const closeIdx = part.lastIndexOf(')');
            parsed.name = part.slice(0, openIdx).trim();
            parsed.address = part.slice(openIdx + 1, closeIdx).trim();
        }
    });
    return parsed;
  };

  const drawPdfPhotoIfPresent = (doc: any, photoDataUrl: string | undefined | null, label: string) => {
    if (photoDataUrl && photoDataUrl.startsWith('data:image/')) {
       try {
         const base64Data = photoDataUrl.replace(/^data:image\/\w+;base64,/, "");
         const imgBuffer = Buffer.from(base64Data, 'base64');
         if (doc.y > doc.page.height - 200) {
            doc.addPage();
         }
         doc.moveDown(0.5);
         doc.fontSize(10).font('Helvetica-Oblique').text(label);
         doc.image(imgBuffer, { height: 120 });
         doc.moveDown(0.5);
       } catch(e) {
          console.error("Failed to render photo to PDF:", e);
       }
    }
  };

  // Evidence Pack Export
  app.get('/api/compliance/evidence', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { clientId, startDate, endDate } = req.query;
    if (!clientId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    try {
      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((r: any) => { try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; } });
      let rawTz8 = settingsMap.timezone || 'Australia/Perth';
      const tz = typeof rawTz8 === 'string' ? rawTz8.replace(/['"]+/g, '') : rawTz8;

      const formatYMDtoDMY = (ymd: string) => ymd ? ymd.split('-').reverse().join('-') : '';

      const formatTz = (isoObj: string | null | undefined, fallbackObj: string) => {
          const target = isoObj || fallbackObj;
          if (!target) return { date: 'N/A', time: 'N/A' };
          try {
             const d = new Date(target);
             if (isNaN(d.getTime())) {
                 // Might be HH:mm already. So try to parse back
                 return { date: formatYMDtoDMY(target.split('T')[0] || target), time: target.split('T')[1]?.substring(0,5) || target };
             }
             const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
             const parts = formatter.formatToParts(d);
             const getP = (t: string) => parts.find(p => p.type === t)?.value || '';
             return { date: `${getP('day')}-${getP('month')}-${getP('year')}`, time: `${getP('hour')}:${getP('minute')}` };
          } catch(e) { return { date: formatYMDtoDMY(target.split('T')[0]), time: target.split('T')[1]?.substring(0, 5) || '' }; }
      }

      const clientRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;
      if (!clientRow) return res.status(404).json({ error: 'Client not found' });

      const shifts = db.prepare(`
        SELECT s.*, u.first_name as staff_first, u.last_name as staff_last
        FROM shifts s
        JOIN users u ON s.staff_id = u.id
        WHERE s.client_id = ? AND s.status = 'COMPLETED'
        AND s.start_time >= ? AND s.end_time <= ?
        ORDER BY s.start_time ASC
      `).all(clientId, startDate, endDate + 'T23:59:59') as any[];

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Evidence_Pack_Client_${clientId}_${formatYMDtoDMY(startDate)}_to_${formatYMDtoDMY(endDate)}.pdf"`);
      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).font('Helvetica-Bold').text('Compliance Evidence Pack', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Client: ', { continued: true }).font('Helvetica').text(`${clientRow.first_name} ${clientRow.last_name}`);
      doc.font('Helvetica-Bold').text('Date Range: ', { continued: true }).font('Helvetica').text(`${formatYMDtoDMY(startDate)} to ${formatYMDtoDMY(endDate)}`);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text(`All times recorded in ${tz}`);
      doc.fillColor('black');
      doc.moveDown(2);

      // Section 1: Service Delivery Log
      doc.fontSize(16).font('Helvetica-Bold').text('1. Service Delivery Log (Chronological)');
      doc.moveDown();
      if (shifts.length === 0) {
        doc.fontSize(12).text('No shifts found in this date range.');
      } else {
        // Table Header
        const headerY = doc.y + 8;
        doc.rect(50, doc.y, 500, 25).fill('#f4f4f5');
        doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
        doc.text('Shift ID', 55, headerY, { width: 45 });
        doc.text('Date', 105, headerY, { width: 60 });
        doc.text('Time', 170, headerY, { width: 140 });
        doc.text('Staff Member', 315, headerY, { width: 100 });
        doc.text('Support Item Code(s)', 420, headerY, { width: 130 });
        
        doc.y = headerY + 25;
        
        let startY = doc.y;
        shifts.forEach((s) => {
          if (doc.y > 650) {
             doc.addPage();
             startY = doc.y;
          }
          const services = s.services_json ? JSON.parse(s.services_json) : [];
          doc.font('Helvetica').fontSize(10);
          
          const startTz = formatTz(s.actual_start_time, s.start_time);
          const endTz = formatTz(s.actual_finish_time, s.end_time);
          const schedStartTz = formatTz(s.start_time, s.start_time);
          const schedEndTz = formatTz(s.end_time, s.end_time);

          doc.text(s.id.toString(), 55, startY, { width: 45 });
          const rowH0 = doc.y;
          doc.text(startTz.date, 105, startY, { width: 60 });
          const rowH1 = doc.y;
          doc.text(`${startTz.time} to ${endTz.time}\n(Sched: ${schedStartTz.time} to ${schedEndTz.time})`, 170, startY, { width: 140 });
          const rowH2 = doc.y;
          doc.text(`${s.staff_first} ${s.staff_last}`, 315, startY, { width: 100 });
          const rowH3 = doc.y;
          
          let codesArr = services.map((sd: any) => {
             const srv = db.prepare('SELECT code FROM services WHERE id = ?').get(sd.serviceId) as any;
             return srv ? srv.code : null;
          }).filter((c: any) => c && c.trim() !== '');
          
          if (codesArr.length === 0 && s.service_id) {
             const srv = db.prepare('SELECT code FROM services WHERE id = ?').get(s.service_id) as any;
             if (srv && srv.code) codesArr.push(srv.code);
          }
          
          let codes = codesArr.length > 0 ? codesArr.join('\n') : "N/A";
          doc.font('Helvetica').text(codes, 420, startY, { width: 130 });
          const rowH4 = doc.y;
          
          doc.y = Math.max(rowH0, rowH1, rowH2, rowH3, rowH4);
          doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).lineWidth(0.5).strokeColor('#e4e4e7').stroke();
          doc.moveDown(1.5);
          startY = doc.y;
        });
      }
      doc.addPage();
      
      // Section 2: Progress Note Archive
      doc.fontSize(16).font('Helvetica-Bold').text('2. Progress Note Archive');
      doc.moveDown();
      shifts.forEach((s) => {
        if (s.notes) {
          const endTz = formatTz(s.actual_finish_time, s.end_time);
          doc.fontSize(12).font('Helvetica-Bold').text(`Shift ID: ${s.id} | Timestamp: ${endTz.date} ${endTz.time}`);
          doc.font('Helvetica').text(s.notes);
          doc.moveDown();
        }
      });

      doc.addPage();

      // Section 3: Transport Evidence
      doc.fontSize(16).font('Helvetica-Bold').text('3. Transport Evidence');
      doc.moveDown();
      
      const tableHeaders = ['Date', 'Staff', 'Travel Route (From -> To)', 'Category', 'KM'];
      const headerY = doc.y;
      doc.rect(50, headerY - 5, 500, 20).fill('#f4f4f5');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(8);
      doc.text(tableHeaders[0], 55, headerY);
      doc.text(tableHeaders[1], 105, headerY);
      doc.text(tableHeaders[2], 180, headerY);
      doc.text(tableHeaders[3], 340, headerY);
      doc.text(tableHeaders[4], 420, headerY);
      doc.y = headerY + 20;

      shifts.forEach((s) => {
        if (s.provider_travel_km > 0 || s.home_care_travel_km > 0 || s.abt_km > 0) {
            const startTz = formatTz(s.actual_start_time, s.start_time);
            
            let routeLog: any = null;
            if (s.transport_route_log) {
                try { routeLog = JSON.parse(s.transport_route_log); } catch(e){}
            }

            let entries: any[] = [];
            
            if (s.provider_travel_km > 0) {
               let routeStrs: string[] = [];
               let coordsStrs: string[] = [];
               if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
                   routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                       let fName = leg.fromName || 'Unknown';
                       let tName = leg.toName || 'Client';
                       if (leg.description && leg.description.includes(' to ')) {
                           const [f, t] = leg.description.split(' to ');
                           const fl = parseLocationString(f);
                           const tl = parseLocationString(t);
                           fName = fl.name ? fl.name + (fl.address ? ` (${fl.address})` : '') : fName;
                           tName = tl.name ? tl.name + (tl.address ? ` (${tl.address})` : '') : tName;
                           if (fl.coords) coordsStrs.push(`[Leg ${idx+1}] F: ${fl.coords}`);
                           if (tl.coords) coordsStrs.push(`[Leg ${idx+1}] T: ${tl.coords}`);
                       }
                       routeStrs.push(`[Leg ${idx+1}] From: ${fName}\nTo: ${tName}`);
                   });
               }
               entries.push({
                   routeStr: routeStrs.join('\n'),
                   cat: 'Provider Travel',
                   km: s.provider_travel_km,
                   coords: coordsStrs.join('\n') || 'N/A'
               });
            }

            if (s.home_care_travel_km > 0) {
               let routeStrs: string[] = [];
               let coordsStrs: string[] = [];
               if (routeLog && routeLog.homeCareTravel && routeLog.homeCareTravel.legs) {
                   routeLog.homeCareTravel.legs.forEach((leg: any, idx: number) => {
                       let fName = leg.fromName || 'Unknown';
                       let tName = leg.toName || 'Client';
                       if (leg.description && leg.description.includes(' to ')) {
                           const [f, t] = leg.description.split(' to ');
                           const fl = parseLocationString(f);
                           const tl = parseLocationString(t);
                           fName = fl.name ? fl.name + (fl.address ? ` (${fl.address})` : '') : fName;
                           tName = tl.name ? tl.name + (tl.address ? ` (${tl.address})` : '') : tName;
                           if (fl.coords) coordsStrs.push(`[Leg ${idx+1}] F: ${fl.coords}`);
                           if (tl.coords) coordsStrs.push(`[Leg ${idx+1}] T: ${tl.coords}`);
                       }
                       routeStrs.push(`[Leg ${idx+1}] From: ${fName}\nTo: ${tName}`);
                   });
               } else if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
                   routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                       let fName = leg.fromName || 'Unknown';
                       let tName = leg.toName || 'Client';
                       if (leg.description && leg.description.includes(' to ')) {
                           const [f, t] = leg.description.split(' to ');
                           const fl = parseLocationString(f);
                           const tl = parseLocationString(t);
                           fName = fl.name ? fl.name + (fl.address ? ` (${fl.address})` : '') : fName;
                           tName = tl.name ? tl.name + (tl.address ? ` (${tl.address})` : '') : tName;
                           if (fl.coords) coordsStrs.push(`[Leg ${idx+1}] F: ${fl.coords}`);
                           if (tl.coords) coordsStrs.push(`[Leg ${idx+1}] T: ${tl.coords}`);
                       }
                       routeStrs.push(`[Leg ${idx+1}] From: ${fName}\nTo: ${tName}`);
                   });
               }
               entries.push({
                   routeStr: routeStrs.join('\n'),
                   cat: 'Home Care Travel',
                   km: s.home_care_travel_km,
                   coords: coordsStrs.join('\n') || 'N/A'
               });
            }

            if (s.abt_km > 0) {
               let routeStrs: string[] = [];
               let coordsStrs: string[] = [];
               if (routeLog && routeLog.abt && routeLog.abt.description) {
                   const abtDesc = routeLog.abt.description.replace('Transport during shift:\n', '');
                   const abtParts = abtDesc.split(' → ');
                   let waypoints: string[] = [];
                   abtParts.forEach((partStr: string) => {
                       const loc = parseLocationString(partStr);
                       const locName = loc.name ? loc.name + (loc.address ? ` (${loc.address})` : '') : (loc.address || 'Unknown');
                       waypoints.push(locName);
                       if (loc.coords) coordsStrs.push(loc.coords);
                   });
                   if (waypoints.length > 0) {
                       routeStrs.push('From: ' + waypoints.join('\nTo: '));
                   }
               }
               entries.push({
                   routeStr: routeStrs.join('\n'),
                   cat: 'Activity Transport',
                   km: s.abt_km,
                   coords: coordsStrs.join('\n') || 'N/A'
               });
            }

            entries.forEach((e, idx) => {
               if (doc.y > 650) { 
                  doc.addPage(); 
               }
               let rowStartY = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(idx === 0 ? startTz.date : '', 55, rowStartY, { width: 45 });
               doc.text(idx === 0 ? `${s.staff_first} ${s.staff_last}` : '', 105, rowStartY, { width: 70 });
               const rowH1 = doc.y;
               doc.text(e.routeStr, 180, rowStartY, { width: 150 });
               doc.font('Helvetica').fontSize(7).text(e.coords, 180, doc.y + 2, { width: 150 });
               const rowH2 = doc.y;
               
               doc.font('Helvetica').fontSize(8);
               doc.text(e.cat, 340, rowStartY, { width: 75 });
               doc.text(e.km.toFixed(2), 420, rowStartY, { width: 25 });
               
               doc.y = Math.max(rowStartY + 10, rowH1, rowH2) + 5;
            });
            // Divider
            doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).strokeColor('#e4e4e7').stroke();
            doc.y += 5;
        }
      });
      doc.end();
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
         logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
  // Staff logbook export
  app.get('/api/compliance/staff-logbook', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { staffId, startDate, endDate } = req.query;
    if (!staffId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    try {
      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((r: any) => { try { settingsMap[r.key] = JSON.parse(r.value); } catch { settingsMap[r.key] = r.value; } });
      let rawTz9 = settingsMap.timezone || 'Australia/Perth';
      const tz = typeof rawTz9 === 'string' ? rawTz9.replace(/['"]+/g, '') : rawTz9;

      const formatYMDtoDMY = (ymd: string) => ymd ? ymd.split('-').reverse().join('-') : '';

      const formatTz = (isoObj: string | null | undefined, fallbackObj: string) => {
          const target = isoObj || fallbackObj;
          if (!target) return { date: 'N/A', time: 'N/A' };
          try {
             const d = new Date(target);
             if (isNaN(d.getTime())) {
                 return { date: formatYMDtoDMY(target.split('T')[0] || target), time: target.split('T')[1]?.substring(0,5) || target };
             }
             const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
             const parts = formatter.formatToParts(d);
             const getP = (t: string) => parts.find(p => p.type === t)?.value || '';
             return { date: `${getP('day')}-${getP('month')}-${getP('year')}`, time: `${getP('hour')}:${getP('minute')}` };
          } catch(e) { return { date: formatYMDtoDMY(target.split('T')[0]), time: target.split('T')[1]?.substring(0, 5) || '' }; }
      }

      const getTzDate = (isoObj: string | null | undefined, fallbackObj: string) => {
          const target = isoObj || fallbackObj;
          if (!target) return new Date();
          const d = new Date(target);
          if (isNaN(d.getTime())) return new Date();
          // To calculate duration correctly regardless of timezone, we can just use the absolute UTC milliseconds.
          return d;
      }

      const staffRow = db.prepare('SELECT * FROM users WHERE id = ?').get(staffId) as any;
      if (!staffRow) return res.status(404).json({ error: 'Staff not found' });

      const shifts = db.prepare(`
        SELECT s.*, c.first_name as client_first, c.last_name as client_last
        FROM shifts s
        JOIN clients c ON s.client_id = c.id
        WHERE s.staff_id = ? AND s.status = 'COMPLETED'
        AND s.start_time >= ? AND s.end_time <= ?
        ORDER BY s.start_time ASC
      `).all(staffId, startDate, endDate + 'T23:59:59') as any[];

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Staff_Logbook_${staffId}_${formatYMDtoDMY(startDate)}_to_${formatYMDtoDMY(endDate)}.pdf"`);
      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).font('Helvetica-Bold').text('Workforce Compliance - Staff Logbook', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Staff: ', { continued: true }).font('Helvetica').text(`${staffRow.first_name} ${staffRow.last_name}`);
      doc.font('Helvetica-Bold').text('Date Range: ', { continued: true }).font('Helvetica').text(`${formatYMDtoDMY(startDate)} to ${formatYMDtoDMY(endDate)}`);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text(`All times recorded in ${tz}`);
      doc.fillColor('black');
      doc.moveDown(2);

      // Section 1: Hours Worked Report
      doc.fontSize(16).font('Helvetica-Bold').text('1. Hours Worked Report (Timesheets)');
      doc.moveDown();
      let totalHours = 0;
      shifts.forEach((s) => {
        const start = getTzDate(s.actual_start_time, s.start_time).getTime();
        const end = getTzDate(s.actual_finish_time, s.end_time).getTime();
        const hrs = Math.max(0, (end - start) / (1000 * 60 * 60));
        totalHours += hrs;

        const startTz = formatTz(s.actual_start_time, s.start_time);
        const endTz = formatTz(s.actual_finish_time, s.end_time);
        const schedStartTz = formatTz(s.start_time, s.start_time);
        const schedEndTz = formatTz(s.end_time, s.end_time);

        doc.fontSize(12).font('Helvetica-Bold').text(`Shift ID: ${s.id} - Date: ${startTz.date}`);
        doc.font('Helvetica').text(`Client: ${s.client_first} ${s.client_last}`);
        doc.text(`Clock-In: ${startTz.time} | Clock-Out: ${endTz.time} (Sched: ${schedStartTz.time} - ${schedEndTz.time})`);
        doc.text(`Hours Worked: ${hrs.toFixed(2)}`);
        doc.moveDown();
      });
      doc.fontSize(14).font('Helvetica-Bold').text(`Total Hours: ${totalHours.toFixed(2)}`);

      doc.addPage();
      
      // Section 2: Vehicle Usage Statement
      doc.fontSize(16).font('Helvetica-Bold').text('2. Vehicle Usage Statement');
      doc.moveDown();
      let totalProviderKm = 0;
      let totalAbtKm = 0;
      let totalHcKm = 0;

      // Table Header
      const headerY = doc.y;
      doc.rect(50, headerY - 5, 500, 20).fill('#f4f4f5');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(8);
      doc.text('Date', 55, headerY);
      doc.text('Client', 105, headerY);
      doc.text('Travel Route', 180, headerY);
      doc.text('Category', 340, headerY);
      doc.text('KM', 420, headerY);
      doc.text('Odo', 450, headerY);
      doc.y = headerY + 20;

      shifts.forEach((s) => {
        let rowsToPrint: any[] = [];
        
        let routeLog: any = null;
        if (s.transport_route_log) {
            try { routeLog = JSON.parse(s.transport_route_log); } catch(e){}
        }
        
        if (s.provider_travel_km > 0) {
           let routeStrs: string[] = [];
           let coordsStrs: string[] = [];
           if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
               routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                   let fName = leg.fromName || 'Unknown';
                   let tName = leg.toName || 'Client';
                   if (leg.description && leg.description.includes(' to ')) {
                       const [f, t] = leg.description.split(' to ');
                       const fl = parseLocationString(f);
                       const tl = parseLocationString(t);
                       fName = fl.name ? fl.name + (fl.address ? ` (${fl.address})` : '') : fName;
                       tName = tl.name ? tl.name + (tl.address ? ` (${tl.address})` : '') : tName;
                       if (fl.coords) coordsStrs.push(`[Leg ${idx+1}] F: ${fl.coords}`);
                       if (tl.coords) coordsStrs.push(`[Leg ${idx+1}] T: ${tl.coords}`);
                   }
                   routeStrs.push(`[Leg ${idx+1}] From: ${fName}\nTo: ${tName}`);
               });
           }
           rowsToPrint.push({ cat: 'Provider Travel', km: s.provider_travel_km, route: routeStrs.join('\n'), coords: coordsStrs.join('\n') });
           totalProviderKm += s.provider_travel_km;
        }
        
        if (s.home_care_travel_km > 0) {
           let routeStrs: string[] = [];
           let coordsStrs: string[] = [];
           if (routeLog && routeLog.homeCareTravel && routeLog.homeCareTravel.legs) {
               routeLog.homeCareTravel.legs.forEach((leg: any, idx: number) => {
                   let fName = leg.fromName || 'Unknown';
                   let tName = leg.toName || 'Client';
                   if (leg.description && leg.description.includes(' to ')) {
                       const [f, t] = leg.description.split(' to ');
                       const fl = parseLocationString(f);
                       const tl = parseLocationString(t);
                       fName = fl.name ? fl.name + (fl.address ? ` (${fl.address})` : '') : fName;
                       tName = tl.name ? tl.name + (tl.address ? ` (${tl.address})` : '') : tName;
                       if (fl.coords) coordsStrs.push(`[Leg ${idx+1}] F: ${fl.coords}`);
                       if (tl.coords) coordsStrs.push(`[Leg ${idx+1}] T: ${tl.coords}`);
                   }
                   routeStrs.push(`[Leg ${idx+1}] From: ${fName}\nTo: ${tName}`);
               });
           } else if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
               // Fallback using Provider Travel legs structure if Home Care travel is missing its own
               routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                   let fName = leg.fromName || 'Unknown';
                   let tName = leg.toName || 'Client';
                   if (leg.description && leg.description.includes(' to ')) {
                       const [f, t] = leg.description.split(' to ');
                       const fl = parseLocationString(f);
                       const tl = parseLocationString(t);
                       fName = fl.name ? fl.name + (fl.address ? ` (${fl.address})` : '') : fName;
                       tName = tl.name ? tl.name + (tl.address ? ` (${tl.address})` : '') : tName;
                       if (fl.coords) coordsStrs.push(`[Leg ${idx+1}] F: ${fl.coords}`);
                       if (tl.coords) coordsStrs.push(`[Leg ${idx+1}] T: ${tl.coords}`);
                   }
                   routeStrs.push(`[Leg ${idx+1}] From: ${fName}\nTo: ${tName}`);
               });
           }
           rowsToPrint.push({ cat: 'Home Care ($1/km)', km: s.home_care_travel_km, route: routeStrs.join('\n'), coords: coordsStrs.join('\n') });
           totalHcKm += s.home_care_travel_km;
        }
        
        if (s.abt_km > 0) {
           let routeStrs: string[] = [];
           let coordsStrs: string[] = [];
           if (routeLog && routeLog.abt && routeLog.abt.description) {
               const abtDesc = routeLog.abt.description.replace('Transport during shift:\n', '');
               const abtParts = abtDesc.split(' → ');
               let waypoints: string[] = [];
               abtParts.forEach((partStr: string) => {
                   const loc = parseLocationString(partStr);
                   const locName = loc.name ? loc.name + (loc.address ? ` (${loc.address})` : '') : (loc.address || 'Unknown');
                   waypoints.push(locName);
                   if (loc.coords) coordsStrs.push(loc.coords);
               });
               if (waypoints.length > 0) {
                   routeStrs.push('From: ' + waypoints.join('\nTo: '));
               }
           }
           rowsToPrint.push({ cat: 'ABT (NDIS)', km: s.abt_km, route: routeStrs.join('\n'), coords: coordsStrs.join('\n') });
           totalAbtKm += s.abt_km;
        }

        if (rowsToPrint.length === 0 && (s.odometer_start_reading || s.odometer_end_reading || s.odometer_start_photo || s.odometer_end_photo)) {
           rowsToPrint.push({ cat: 'Odometer Record', km: 0, route: 'N/A', coords: 'N/A' });
        }

        if (rowsToPrint.length > 0) {
           const startTz = formatTz(s.actual_start_time, s.start_time);
           
           rowsToPrint.forEach((row, idx) => {
               if (doc.y > 650) {
                  doc.addPage();
               }
               
               let rowStartY = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(idx === 0 ? startTz.date : '', 55, rowStartY, { width: 45 });
               doc.text(idx === 0 ? `${s.client_first} ${s.client_last}` : '', 105, rowStartY, { width: 70 });
               
               const rowH1 = doc.y;
               doc.text(row.route || 'N/A', 180, rowStartY, { width: 150 });
               doc.font('Helvetica').fontSize(7).text(row.coords || '', 180, doc.y + 2, { width: 150 });
               
               const hAfterRoute = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(row.cat, 340, rowStartY, { width: 75 });
               doc.text(row.km.toFixed(2), 420, rowStartY, { width: 25 });
               
               if (idx === 0) {
                   const startOdo = s.odometer_start_reading || 'N/A';
                   const endOdo = s.odometer_end_reading || 'N/A';
                   doc.text(`${startOdo}-${endOdo}`, 450, rowStartY, { width: 100 });
               }
               
               doc.y = Math.max(rowStartY + 12, hAfterRoute + 5);
           });

           if (s.odometer_start_photo || s.odometer_end_photo) {
               if (doc.y > 600) { doc.addPage(); } 
               
               doc.moveDown(0.5);
               let imgHeight = 0;
               const currentY = doc.y;
               doc.fillColor('black');
               if (s.odometer_start_photo && s.odometer_start_photo.startsWith('data:image/')) {
                  try {
                     const base64Data = s.odometer_start_photo.replace(/^data:image\/\w+;base64,/, "");
                     const imgBuffer = Buffer.from(base64Data, 'base64');
                     doc.fontSize(7).font('Helvetica-Oblique').text('Start Odo:', 200, currentY);
                     doc.image(imgBuffer, 200, currentY + 10, { height: 60 });
                     imgHeight = 70;
                  } catch(e){}
               }
               
               if (s.odometer_end_photo && s.odometer_end_photo.startsWith('data:image/')) {
                  try {
                     const base64Data = s.odometer_end_photo.replace(/^data:image\/\w+;base64,/, "");
                     const imgBuffer = Buffer.from(base64Data, 'base64');
                     doc.fontSize(7).font('Helvetica-Oblique').text('End Odo:', 360, currentY);
                     doc.image(imgBuffer, 360, currentY + 10, { height: 60 });
                     imgHeight = 70;
                  } catch(e){}
               }
               
               if (imgHeight > 0) {
                  doc.y = currentY + imgHeight + 15;
               }
           }
           
           doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).strokeColor('#e4e4e7').stroke();
           doc.y += 5;
        }
      });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
      doc.text(`Total Provider Travel (NDIS): ${totalProviderKm.toFixed(2)} km`);
      doc.text(`Total Home Care Travel: ${totalHcKm.toFixed(2)} km`);
      doc.text(`Total ABT (NDIS): ${totalAbtKm.toFixed(2)} km`);

      doc.end();
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
         logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
  // Compliance logging
  app.get('/api/compliance/logs', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
       const logs = db.prepare(`
         SELECT a.*, u.first_name, u.last_name 
         FROM audit_logs a
         LEFT JOIN users u ON a.changed_by_user_id = u.id
         ORDER BY a.timestamp DESC
         LIMIT 100
       `).all();
       res.json(logs);
    } catch (e: any) {
       logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Global Express error:', { error: err.message, stack: err.stack, path: req.path, method: req.method });
    if (res.headersSent) {
      return next(err);
    }
    
    if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_CHECK' || err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: `Database validation failed: ${err.message}` });
    }
    
    const isProd = process.env.NODE_ENV === 'production';
    logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
  });

  // --- Database Backups & Management ---
  const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // automated nightly backups
  cron.schedule('0 2 * * *', async () => {
    try {
      const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      const filename = `backup-auto-${dateStr}.sqlite`;
      const filepath = path.join(BACKUP_DIR, filename);
      
      await db.backup(filepath);
      console.log(`Nightly backup completed: ${filepath}`);
      
      // delete backups older than 7 days
      const files = fs.readdirSync(BACKUP_DIR);
      const now = Date.now();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        if (!file.endsWith('.sqlite')) continue;
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        if (now - stats.mtimeMs > MAX_AGE) {
          fs.unlinkSync(path.join(BACKUP_DIR, file));
          console.log(`Deleted old backup: ${file}`);
        }
      }
    } catch (e) {
      console.error('Nightly backup failed:', e);
    }
  });

  app.get('/api/admin/database/download-live', authenticateToken, requireAdmin, async (req: any, res: any) => {
    try {
      const tempFilename = `live-backup-${Date.now()}.sqlite`;
      const tempFilepath = path.join(BACKUP_DIR, tempFilename);
      
      await db.backup(tempFilepath);
      
      res.download(tempFilepath, 'database.sqlite', (err: any) => {
        if (fs.existsSync(tempFilepath)) {
          fs.unlinkSync(tempFilepath);
        }
      });
    } catch (e: any) {
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/database/list', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const files = fs.readdirSync(BACKUP_DIR).filter((f: string) => f.endsWith('.sqlite') && f.startsWith('backup-auto-'));
      const list = files.map((file: string) => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          name: file,
          date: stats.mtime,
          size: stats.size
        };
      });
      list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (e: any) {
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/database/download-backup/:filename', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const file = path.basename(req.params.filename);
      const filepath = path.join(BACKUP_DIR, file);
      if (fs.existsSync(filepath)) {
        res.download(filepath, file.replace('backup-auto-', 'historical-backup-'));
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (e: any) {
      logger.error('API Error masked from frontend', {}); res.status(500).json({ error: 'Internal Server Error' });
    }
  });

 // --- Global Error Handler ---
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Unhandled Application Error', {
      error: err.message || String(err),
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    
    if (res.headersSent) {
      return next(err);
    }

    // Mask the stack trace in the response
    res.status(500).json({ error: 'Internal Server Error. Please contact support.' });
  });

 // --- Vite Middleware or Static Files ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true // <--- ADD THIS LINE HERE
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist'); 
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
