import "express-async-errors";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";

function getHistoricalServiceData(db, srv, shiftDateStr) {
  if (!srv || srv.type !== 'NDIS') return { rate: srv?.rate, rates_json: srv?.rates_json };
  if (!shiftDateStr) return { rate: srv.rate, rates_json: srv.rates_json };
  try {
    const shiftDateOnly = shiftDateStr.split('T')[0];
    const pl = db.prepare("SELECT id FROM price_lists WHERE effective_date IS NOT NULL AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1").get(shiftDateOnly);
    if (pl) {
      const item = db.prepare("SELECT rate, rates_json FROM price_list_items WHERE price_list_id = ? AND code = ?").get(pl.id, srv.code);
      if (item && item.rates_json) {
        return { rate: item.rate, rates_json: item.rates_json };
      }
    }
  } catch (e) {}
  return { rate: srv.rate, rates_json: srv.rates_json };
}

import * as xlsx from "xlsx";
import PDFDocument from "pdfkit";
import fs from "fs";
import morgan from "morgan";
import winston from "winston";
import Holidays from "date-holidays";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import nodemailer from "nodemailer";
import crypto from "crypto";
import {
  getGoogleRoutesDistance,
  getRecordCoordinates,
  formatCoords,
} from "./utils/mapUtils.js";
import { calculateProviderTravel } from "./utils/travelCalculator.js";
import { calculateHomeCareTravel } from "./utils/homeCareCalculator.js";
import { calculateAbtTravel } from "./utils/abtCalculator.js";
import { recalculateDayTravelForStaff } from "./services/travelEngine.js";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", {
    error: err.message || String(err),
    stack: err.stack,
  });
});

process.on("unhandledRejection", (reason: any) => {
  const errorMsg = reason?.message || String(reason);
  const stack = reason?.stack;
  logger.error("Unhandled Rejection at Promise", { error: errorMsg, stack });
});

let _filename: string;
let _dirname: string;

if (typeof __dirname !== "undefined") {
  _dirname = __dirname;
  _filename = __filename;
} else {
  // @ts-ignore
  _filename = fileURLToPath(import.meta.url);
  _dirname = path.dirname(_filename);
}

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = (req.query.folderPath as string) || "/";
    subfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, ""); // Prevent directory traversal
    if (subfolder.startsWith("/")) {
      subfolder = subfolder.substring(1);
    }
    const targetDir = path.join(UPLOADS_DIR, subfolder);
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch (e) {
        return cb(e as Error, UPLOADS_DIR);
      }
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit to prevent storage exhaustion
});

if (!fs.existsSync(path.join(process.cwd(), "data", "invoices"))) {
  fs.mkdirSync(path.join(process.cwd(), "data", "invoices"), { recursive: true });
}

function getSafeDateTimeFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch (e: any) {
    if (e instanceof RangeError && options.timeZone) {
      console.warn(
        `Invalid time zone "${options.timeZone}", falling back to UTC.`,
      );
      const fallbackOptions = { ...options, timeZone: "UTC" };
      return new Intl.DateTimeFormat(locale, fallbackOptions);
    }
    throw e;
  }
}

function getTzDayOfWeek(date: Date, tz: string): number {
  try {
    const tzDayStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
    }).format(date);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(tzDayStr);
  } catch (e) {
    if (tz !== "UTC") return getTzDayOfWeek(date, "UTC");
    return date.getUTCDay();
  }
}

// Initialize DB from module
// db initialized in db.ts

// Setup Schema
// Setup Schema logic removed as per rules

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run database migrations/column additions
  try {
    const tableInfo = db.pragma("table_info(shifts)") as any[];
    const staffIdCol = tableInfo.find(c => c.name === 'staff_id');
    if (staffIdCol && staffIdCol.notnull === 1) {
      console.log("[DEBUG] Modifying shifts table to allow NULL staff_id...");
      
      const existingColumns = tableInfo.map(c => c.name);
      
      db.exec(`
        PRAGMA foreign_keys = OFF;
        
        CREATE TABLE IF NOT EXISTS shifts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER,
          client_id INTEGER NOT NULL,
          service_id INTEGER,
          respite_booking_id INTEGER,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'DRAFT',
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
          provider_travel_minutes REAL DEFAULT 0,
          provider_travel_cost REAL DEFAULT 0,
          abt_km REAL DEFAULT 0,
          abt_cost REAL DEFAULT 0,
          transport_route_log TEXT,
          services_json TEXT,
          home_care_travel_km REAL DEFAULT 0,
          home_care_travel_total REAL DEFAULT 0,
          batch_id TEXT,
          custom_staff_name TEXT,
          is_abt_approved INTEGER DEFAULT 0,
          travel_breakdown TEXT,
          FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
          FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE CASCADE
        );
      `);
      
      // Get columns common to both tables
      const newTableInfo = db.pragma("table_info(shifts_new)") as any[];
      const newColumns = newTableInfo.map(c => c.name);
      const commonColumns = existingColumns.filter(c => newColumns.includes(c)).join(', ');
      
      db.exec(`
        INSERT INTO shifts_new (${commonColumns})
        SELECT ${commonColumns} FROM shifts;
      
        DROP TABLE shifts;
        ALTER TABLE shifts_new RENAME TO shifts;
      
        CREATE INDEX IF NOT EXISTS idx_shifts_client_id ON shifts(client_id);
        CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
        CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
        CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
        CREATE INDEX IF NOT EXISTS idx_shifts_client_start_time ON shifts(client_id, start_time);
        CREATE INDEX IF NOT EXISTS idx_shifts_staff_start_time ON shifts(staff_id, start_time);
        CREATE INDEX IF NOT EXISTS idx_shifts_status_start_time ON shifts(status, start_time);
        CREATE INDEX IF NOT EXISTS idx_shifts_service ON shifts(service_id);
        CREATE INDEX IF NOT EXISTS idx_shifts_funding ON shifts(funding_type);
        CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time); 
      
        PRAGMA foreign_keys = ON;
      `);
      console.log("[DEBUG] Completed shifts null staff_id migration.");
    }
  } catch (e: any) {
    console.warn("Migration warning for shifts table:", e.message);
  }

  try {
    // 1. Drop any explicit unique index if it exists (but we can't drop sqlite_autoindex this way)
    const indices = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='services' AND sql LIKE '%UNIQUE%'").all() as any[];
    for (const idx of indices) {
       if (idx.name && !idx.name.startsWith('sqlite_autoindex')) {
          db.exec(`DROP INDEX IF EXISTS ${idx.name}`);
       }
    }
    
    // 2. Recreate table if UNIQUE table constraint exists
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='services'").get() as any;
    if (tableInfo && tableInfo.sql) {
      let sql = tableInfo.sql;
      const uniqueRegex = /,\s*UNIQUE\s*\(\s*"?type"?\s*,\s*"?code"?\s*,\s*"?name"?\s*\)/i;
      const uniqueRegex2 = /,\s*CONSTRAINT\s+["`\w]+\s+UNIQUE\s*\(\s*"?type"?\s*,\s*"?code"?\s*,\s*"?name"?\s*\)/i;
      const altUnique = /,\s*UNIQUE\s*\([^)]+\)/gi;
      
      let needsRecreate = false;
      let newSql = sql;

      if (uniqueRegex.test(sql) || uniqueRegex2.test(sql)) {
        newSql = newSql.replace(uniqueRegex, '');
        newSql = newSql.replace(uniqueRegex2, '');
        needsRecreate = true;
      } else if (altUnique.test(sql) && sql.includes('type') && sql.includes('code') && sql.includes('name')) {
        newSql = newSql.replace(altUnique, '');
        needsRecreate = true;
      }
      
      if (needsRecreate) {
        console.log("[DEBUG] Found UNIQUE constraint on services, recreating table...");
        newSql = newSql.replace(/CREATE TABLE "?services"?/i, 'CREATE TABLE services_new');
        
        db.pragma("foreign_keys = OFF");
        db.transaction(() => {
          db.exec(newSql);
          db.exec("INSERT INTO services_new SELECT * FROM services;");
          db.exec("DROP TABLE services;");
          db.exec("ALTER TABLE services_new RENAME TO services;");
        })();
        db.pragma("foreign_keys = ON");
        console.log("[DEBUG] Recreated services table without UNIQUE constraint to preserve historical pricing");
      }
    }
  } catch(e: any) {
    console.warn("Could not handle unique constraint on services:", e.message);
  }

  try {
    db.exec(
      "ALTER TABLE providers ADD COLUMN provider_type TEXT DEFAULT 'NDIS'",
    );
    console.log("[DEBUG] Completed provider_type column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(
      "ALTER TABLE providers ADD COLUMN management_fee REAL DEFAULT 10.00",
    );
    console.log("[DEBUG] Completed management_fee column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(
      "ALTER TABLE clients ADD COLUMN care_coordination_fee REAL DEFAULT 20.00",
    );
    console.log("[DEBUG] Completed care_coordination_fee column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE shifts ADD COLUMN custom_staff_name TEXT");
    console.log("[DEBUG] Completed custom_staff_name column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE shifts ADD COLUMN provider_travel_minutes REAL DEFAULT 0");
    console.log("[DEBUG] Completed provider_travel_minutes column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE invoices ADD COLUMN services_json TEXT");
    console.log("[DEBUG] Completed invoices.services_json column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE invoices ADD COLUMN merged_into_invoice_id INTEGER");
    console.log(
      "[DEBUG] Completed invoices.merged_into_invoice_id column check.",
    );
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE clients ADD COLUMN home_care_sub_type TEXT");
    console.log("[DEBUG] Completed clients.home_care_sub_type column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE clients ADD COLUMN home_care_level_or_class TEXT");
    console.log(
      "[DEBUG] Completed clients.home_care_level_or_class column check.",
    );
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE clients ADD COLUMN joined_date TEXT");
    console.log("[DEBUG] Completed clients.joined_date column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN other_providers_spent REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(
      "ALTER TABLE client_roster_templates ADD COLUMN template_name TEXT DEFAULT 'Default Template'",
    );
    console.log(
      "[DEBUG] Completed client_roster_templates.template_name column check.",
    );
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN historical_internal_consumptions REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN spend_as_of_date TEXT;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN cycle_start_date TEXT;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN cycle_end_date TEXT;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ndis_service_agreements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        total_budget REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );
      
      CREATE TABLE IF NOT EXISTS ndis_service_agreement_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agreement_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        allocated_budget REAL DEFAULT 0,
        allocated_hours REAL DEFAULT 0,
        FOREIGN KEY (agreement_id) REFERENCES ndis_service_agreements(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      );

      CREATE TABLE IF NOT EXISTS position_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_title TEXT NOT NULL UNIQUE,
        description_text TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default position templates
    const defaultTemplates = [
      {
        title: "Support Worker",
        desc: "Providing personal care, domestic assistance, and community access support to clients in accordance with their individual care plans. Responsibilities include assisting with activities of daily living, medication prompting, transport, and documenting progress notes accurately.",
      },
      {
        title: "Registered Nurse",
        desc: "Delivering clinical nursing care to clients, including comprehensive assessments, care planning, wound care, medication administration, and monitoring health outcomes. Supervising care staff and ensuring compliance with healthcare standards.",
      },
      {
        title: "Enrolled Nurse",
        desc: "Providing nursing care under the supervision of a Registered Nurse, including administering medications, monitoring patient vital signs, wound care, and updating patient records. Supporting the implementation of care plans.",
      },
      {
        title: "Clinical Coordinator",
        desc: "Overseeing and managing clinical care services, ensuring quality and compliance with relevant standards. Coordinating care teams, developing complex care plans, liaising with stakeholders, and providing clinical leadership.",
      },
      {
        title: "Administrator",
        desc: "Managing office operations, scheduling, fielding client inquiries, maintaining accurate records, supporting payroll processes, and providing general administrative support to the management team.",
      },
      {
        title: "Gardener",
        desc: "Performing general gardening and minor outdoor maintenance tasks for clients, including lawn mowing, pruning, weeding, and ensuring outdoor areas are safe and accessible.",
      },
      {
        title: "Home Maintenance Worker",
        desc: "Conducting minor home maintenance and repair tasks to ensure client homes remain safe and functional. Duties include minor carpentry, changing lightbulbs, fixing fixtures, and safety checks.",
      },
    ];

    const insertTemplate = db.prepare(`
      INSERT INTO position_templates (position_title, description_text) 
      VALUES (?, ?) 
      ON CONFLICT(position_title) DO NOTHING
    `);

    db.transaction(() => {
      for (const t of defaultTemplates) {
        insertTemplate.run(t.title, t.desc);
      }
    })();
  } catch (e: any) {
    console.error("Migration error for ndis_service_agreements:", e);
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS client_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        cycle_start_date TEXT,
        cycle_end_date TEXT,
        historical_internal_consumptions REAL DEFAULT 0,
        spend_as_of_date TEXT,
        starting_rollover_balance REAL DEFAULT 0,
        rollover_spent_so_far REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        base_cycle_allocation REAL,
        closing_balance REAL,
        rollover_amount_forwarded REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );
    `);

    const runMigration = db
      .prepare("SELECT count(*) as count FROM client_budgets")
      .get() as any;
    if (runMigration.count === 0) {
      db.exec(`
        INSERT INTO client_budgets (
          client_id, cycle_start_date, cycle_end_date, historical_internal_consumptions, 
          spend_as_of_date, starting_rollover_balance, rollover_spent_so_far, status
        )
        SELECT 
          id, cycle_start_date, cycle_end_date, coalesce(historical_internal_consumptions, 0), 
          spend_as_of_date, coalesce(starting_rollover_balance, 0), coalesce(rollover_spent_so_far, 0), 'ACTIVE'
        FROM clients;
      `);
      console.log("Migrated budget columns to client_budgets table");
    }
  } catch (e: any) {
    console.error("Migration error for client_budgets:", e);
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS client_ledger_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        service_name TEXT NOT NULL,
        vendor_name TEXT,
        base_amount REAL NOT NULL,
        care_coord_fee REAL DEFAULT 0,
        management_fee REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        source_type TEXT DEFAULT 'external',
        apply_loadings INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );

      CREATE TABLE IF NOT EXISTS price_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_master BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        price_list_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        rate REAL NOT NULL,
        description TEXT,
        reg_group_number TEXT,
        reg_group_name TEXT,
        rates_json TEXT,
        unit TEXT,
        FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE
      );
    `);
    console.log("[DEBUG] Completed client_ledger_entries table setup.");
  } catch (e: any) {
    console.error("Migration error for client_ledger_entries:", e);
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN starting_rollover_balance REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN rollover_spent_so_far REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN billing_tier TEXT DEFAULT 'SAH_Full_Pensioner';
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN historical_monthly_cap REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN assessed_independence_pct REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE clients ADD COLUMN assessed_everyday_living_pct REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`ALTER TABLE clients ADD COLUMN ndis_agreement_start_date TEXT;`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column"))
      console.warn("Migration warning:", e.message);
  }
  try {
    db.exec(`ALTER TABLE clients ADD COLUMN ndis_agreement_end_date TEXT;`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column"))
      console.warn("Migration warning:", e.message);
  }
  try {
    db.exec(
      `ALTER TABLE clients ADD COLUMN ndis_agreement_budget REAL DEFAULT 0;`,
    );
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column"))
      console.warn("Migration warning:", e.message);
  }

  try {
    db.exec(`
      ALTER TABLE client_ledger_entries ADD COLUMN client_share REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE client_ledger_entries ADD COLUMN package_drawdown REAL DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE client_ledger_entries ADD COLUMN service_category TEXT;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE price_lists ADD COLUMN effective_date TEXT;
    `);
    console.log("[DEBUG] Added effective_date column to price_lists table");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE price_lists ADD COLUMN file_id INTEGER;
    `);
    console.log("[DEBUG] Added file_id column to price_lists table");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE services ADD COLUMN status TEXT DEFAULT 'ACTIVE';
    `);
    console.log("[DEBUG] Added status column to services table");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    const pls = db.prepare("SELECT id, created_at, effective_date FROM price_lists").all() as any[];
    for (const pl of pls) {
      let changed = false;
      let newCreatedAt = pl.created_at;
      let newEffectiveDate = pl.effective_date;
      if (pl.created_at && pl.created_at.includes('T')) {
        newCreatedAt = pl.created_at.split('T')[0];
        changed = true;
      }
      if (pl.effective_date && pl.effective_date.includes('T')) {
        newEffectiveDate = pl.effective_date.split('T')[0];
        changed = true;
      }
      if (changed) {
        db.prepare("UPDATE price_lists SET created_at = ?, effective_date = ? WHERE id = ?").run(newCreatedAt, newEffectiveDate, pl.id);
        console.log(`[DEBUG] Cleaned timestamps for price_list ${pl.id}`);
      }
    }
  } catch (e: any) {
    console.warn("Migration warning cleaning price_lists timestamps:", e.message);
  }

  try {
    db.exec(`
      ALTER TABLE services ADD COLUMN service_category TEXT CHECK(service_category IN ('Clinical', 'Independence', 'Everyday Living') OR service_category IS NULL);
    `);
    console.log("[DEBUG] Completed services.service_category column check");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  // Data consistency sync for old templates
  try {
    db.prepare(
      `
      UPDATE shifts
      SET funding_type = (SELECT funding_type FROM clients WHERE clients.id = shifts.client_id)
      WHERE funding_type != (SELECT funding_type FROM clients WHERE clients.id = shifts.client_id)
         OR funding_type IS NULL
    `,
    ).run();
    console.log("[DEBUG] Completed funding_type backfill synchronization.");

    const missingLogShifts = db
      .prepare(
        `
      SELECT DISTINCT staff_id, DATE(start_time) as shift_date 
      FROM shifts 
      WHERE transport_route_log IS NULL 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
    `,
      )
      .all() as any[];

    if (missingLogShifts.length > 0) {
      console.log(
        `[DEBUG] Found ${missingLogShifts.length} staff-days with missing transport logs. Running cascade sweep...`,
      );
      (async () => {
        for (const item of missingLogShifts) {
          await recalculateDayTravelForStaff(item.staff_id, item.shift_date);
        }
        console.log(`[DEBUG] Completed cascade sweep for missing logs.`);
      })();
    }
  } catch (e) {
    console.error("Data sync error:", e);
  }

  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && "body" in err) {
      logger.error("Malformed JSON received", {
        error: err.message,
        path: req.path,
      });
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    next(err);
  });
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Request logging using Morgan and Winston
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );

  const JWT_SECRET = process.env.JWT_SECRET || "happyinthehome-secret-key-123";

  // --- Google Routes & Travel Logic ---

  const calculateScheduledProviderTravel = async (
    staffId: string | number,
    newShiftStartTime: string,
    newShiftEndTime: string,
    newShiftClientId: string | number,
    currentShiftId?: string | number,
  ) => {
    const staff = db
      .prepare("SELECT address FROM users WHERE id = ?")
      .get(staffId) as any;
    const client = db
      .prepare("SELECT address, funding_type FROM clients WHERE id = ?")
      .get(newShiftClientId) as any;

    const staffHomeCoords = await getRecordCoordinates(
      "users",
      staffId,
      staff?.address,
    );
    const clientCoords = await getRecordCoordinates(
      "clients",
      newShiftClientId,
      client?.address,
    );

    const fundingType = client?.funding_type || "NDIS";
    let totalDist = 0;

    try {
      // Find previous shift today for staff
      const prevShift = db
        .prepare(
          `
        SELECT * FROM shifts 
        WHERE staff_id = ? AND end_time <= ? ${currentShiftId ? "AND id != ?" : ""} AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
        ORDER BY end_time DESC LIMIT 1
      `,
        )
        .get(
          currentShiftId
            ? [staffId, newShiftStartTime, currentShiftId]
            : [staffId, newShiftStartTime],
        ) as any;

      // Find next shift today for staff (to determine if last)
      const nextShift = db
        .prepare(
          `
        SELECT * FROM shifts 
        WHERE staff_id = ? AND start_time >= ? ${currentShiftId ? "AND id != ?" : ""} AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
        ORDER BY start_time ASC LIMIT 1
      `,
        )
        .get(
          currentShiftId
            ? [staffId, newShiftEndTime, currentShiftId]
            : [staffId, newShiftEndTime],
        ) as any;

      if (
        fundingType === "HCP" ||
        fundingType === "Home Care" ||
        fundingType === "HOME_CARE"
      ) {
        // HOME CARE LOGIC
        const prevGapMins = prevShift
          ? (new Date(newShiftStartTime).getTime() -
              new Date(prevShift.end_time).getTime()) /
            60000
          : Infinity;
        if (!prevShift || prevGapMins > 60 || prevGapMins < 0) {
          console.log(
            `[DEBUG Provider Travel (Schedule)] First shift of day for staff ${staffId} (Home Care). No travel allowed (Private Commute).`,
          );
          totalDist += 0;
        } else {
          const prevClientInfo = db
            .prepare("SELECT address FROM clients WHERE id = ?")
            .get(prevShift.client_id) as any;
          const prevClientCoords = await getRecordCoordinates(
            "clients",
            prevShift.client_id,
            prevClientInfo?.address,
          );
          console.log(
            `[DEBUG Provider Travel (Schedule)] Subsequent shift (Home Care <= 60m). Dist from Client ${prevShift.client_id} to ${newShiftClientId}`,
          );
          const { distance: dist } = await getGoogleRoutesDistance([
            prevClientCoords,
            clientCoords,
          ]);
          console.log(
            `[DEBUG Provider Travel (Schedule)] Calculated dist: ${dist} km`,
          );
          totalDist += dist;
        }
      } else {
        // NDIS LOGIC
        let totalMins = 0;
        const prevGapMins = prevShift
          ? (new Date(newShiftStartTime).getTime() -
              new Date(prevShift.end_time).getTime()) /
            60000
          : Infinity;
        if (prevShift && prevGapMins >= 0 && prevGapMins <= 60) {
          const prevClientInfo = db
            .prepare("SELECT address FROM clients WHERE id = ?")
            .get(prevShift.client_id) as any;
          const prevClientCoords = await getRecordCoordinates(
            "clients",
            prevShift.client_id,
            prevClientInfo?.address,
          );
          console.log(
            `[DEBUG Provider Travel (Schedule)] Subsequent shift (${fundingType}). Calculating distance from Previous Client ${prevShift.client_id} to Client ${newShiftClientId}`,
          );
          const { distance: dist, minutes: mins } =
            await getGoogleRoutesDistance([prevClientCoords, clientCoords]);
          console.log(
            `[DEBUG Provider Travel (Schedule)] Calculated Provider Travel from Previous Client -> Current Client: ${dist} km, ${mins} mins`,
          );
          totalDist += dist / 2;
          totalMins += mins / 2;
        } else {
          console.log(
            `[DEBUG Provider Travel (Schedule)] First shift of sequence for staff ${staffId} (NDIS). Calculating distance from Home to Client ${newShiftClientId}`,
          );
          const { distance: distHome, minutes: minsHome } =
            await getGoogleRoutesDistance([staffHomeCoords, clientCoords]);
          console.log(
            `[DEBUG Provider Travel (Schedule)] Calculated Provider Travel from Home -> Client: ${distHome} km, ${minsHome} mins`,
          );
          totalDist += distHome;
          totalMins += minsHome;
        }

        const nextGapMins = nextShift
          ? (new Date(nextShift.start_time).getTime() -
              new Date(newShiftEndTime).getTime()) /
            60000
          : Infinity;
        if (nextShift && nextGapMins >= 0 && nextGapMins <= 60) {
          console.log(
            `[DEBUG Provider Travel (Schedule)] Next shift within 60 mins. Splitting outgoing trip 50/50.`,
          );
          const nextClientInfo = db
            .prepare("SELECT address FROM clients WHERE id = ?")
            .get(nextShift.client_id) as any;
          const nextClientCoords = await getRecordCoordinates(
            "clients",
            nextShift.client_id,
            nextClientInfo?.address,
          );
          const { distance: distNext, minutes: minsNext } =
            await getGoogleRoutesDistance([clientCoords, nextClientCoords]);
          totalDist += distNext / 2;
          totalMins += minsNext / 2;
        } else {
          console.log(
            `[DEBUG Provider Travel (Schedule)] Last shift of sequence for staff ${staffId} (NDIS). Appending Return Home distance: Client ${newShiftClientId} -> Staff Home`,
          );
          const { distance: distReturn, minutes: minsReturn } =
            await getGoogleRoutesDistance([clientCoords, staffHomeCoords]);
          console.log(
            `[DEBUG Provider Travel (Schedule)] Return Home calc dist: ${distReturn} km, ${minsReturn} mins`,
          );
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
      console.error(
        "[DEBUG Provider Travel (Schedule)] Error calculating scheduled provider travel:",
        e,
      );
      return { distance: 0, minutes: 0 };
    }
  };

  const recalculateStaffTravelForDate = async (
    staffId: string | number,
    dateIso: string,
  ) => {
    try {
      // 1. Get all remaining active shifts for staffId on dateIso
      const shifts = db
        .prepare(
          `
        SELECT * FROM shifts 
        WHERE staff_id = ? AND start_time >= datetime(?, '-14 hours') AND start_time <= datetime(?, '+14 hours') AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
        ORDER BY start_time ASC
      `,
        )
        .all(staffId, dateIso, dateIso) as any[];

      if (!shifts || shifts.length === 0) return;

      console.log(
        `[DEBUG Recalculate] Recalculating travel for staff ${staffId} on ${dateIso}. Found ${shifts.length} shift(s).`,
      );

      for (const shift of shifts) {
        if (shift.status === "COMPLETED") {
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
                  const service = db
                    .prepare("SELECT name, unit FROM services WHERE id = ?")
                    .get(sData.serviceId) as any;
                  if (service && service.name) {
                    const name = service.name.toLowerCase();
                    if (name.includes("provider travel")) {
                      let billableValue = pTravel.distance; // Fallback
                      if (
                        pTravel.minutes !== undefined &&
                        !name.includes("non-labour")
                      ) {
                        const unitStr = (service.unit || "Hour").toLowerCase();
                        billableValue =
                          unitStr.includes("minute") || unitStr === "min"
                            ? pTravel.minutes
                            : pTravel.minutes / 60;
                      }
                      sData.qtyOverride = parseFloat(billableValue.toFixed(2));
                      changed = true;
                    } else if (
                      name.includes("activity based transport") &&
                      shift.abt_km !== undefined
                    ) {
                      sData.qtyOverride = parseFloat(
                        Number(shift.abt_km).toFixed(2),
                      );
                      changed = true;
                    }
                  }
                }
                if (changed) {
                  updatedServicesJson = JSON.stringify(servicesData);
                }
              }
            } catch (e) {
              console.error(
                "Failed to parse services_json during recalculate:",
                e,
              );
            }
          }

          db.prepare(
            "UPDATE shifts SET provider_travel_km = ?, provider_travel_cost = ?, home_care_travel_km = ?, home_care_travel_total = ?, services_json = ? WHERE id = ?",
          ).run(
            pTravel.distance,
            pTravel.cost,
            hcTravel.distance,
            hcTravel.cost,
            updatedServicesJson,
            shift.id,
          );
        } else {
          // Re-calculate scheduled Provider Travel (DRAFT, PUBLISHED, IN_PROGRESS)
          if (!shift.services_json) continue;
          let servicesData;
          try {
            servicesData = JSON.parse(shift.services_json);
          } catch (e) {
            if (
              e.message &&
              !e.message.includes("duplicate column") &&
              !e.message.includes("no such column")
            )
              logger.warn("Migration/Query warning:", e.message);
          }
          if (servicesData && Array.isArray(servicesData)) {
            let updated = false;
            for (const sData of servicesData) {
              const service = db
                .prepare("SELECT name, unit FROM services WHERE id = ?")
                .get(sData.serviceId) as any;
              if (
                service &&
                service.name &&
                service.name.toLowerCase().includes("provider travel")
              ) {
                const schedTravel = await calculateScheduledProviderTravel(
                  shift.staff_id,
                  shift.start_time,
                  shift.end_time,
                  shift.client_id,
                  shift.id,
                );
                let billableValue = schedTravel.distance;
                if (
                  schedTravel.minutes !== undefined &&
                  schedTravel.minutes > 0 &&
                  !service.name.toLowerCase().includes("non-labour")
                ) {
                  const unitStr = (service.unit || "Hour").toLowerCase();
                  billableValue =
                    unitStr.includes("minute") || unitStr === "min"
                      ? schedTravel.minutes
                      : schedTravel.minutes / 60;
                }
                sData.qtyOverride = parseFloat(billableValue.toFixed(2));
                updated = true;
              }
            }
            if (updated) {
              db.prepare(
                "UPDATE shifts SET services_json = ? WHERE id = ?",
              ).run(JSON.stringify(servicesData), shift.id);
            }
          }
        }
      }
    } catch (e) {
      console.error("[DEBUG Recalculate] Error recalculating staff travel:", e);
    }
  };

  const getInvoiceDataForMergedInvoice = (invoiceRow: any) => {
    const client = db
      .prepare(
        `
        SELECT c.*,
               p.company_name as plan_manager_name, p.email as plan_manager_email, p.address as plan_manager_address
        FROM clients c
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE c.id = ?
      `,
      )
      .get(invoiceRow.client_id) as any;

    const shift = {
      client_id: invoiceRow.client_id,
      funding_type: client?.funding_type || "NDIS",
      c_fn: client?.first_name || "",
      c_ln: client?.last_name || "",
      ndis_number: client?.ndis_number || "",
      my_aged_care_id: client?.my_aged_care_id || "",
      plan_manager_name: client?.plan_manager_name || "",
      plan_manager_email: client?.plan_manager_email || "",
      plan_manager_address: client?.plan_manager_address || "",
    };

    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settingsMap: Record<string, any> = {};
    settingsRows.forEach((r) => {
      try {
        settingsMap[r.key] = JSON.parse(r.value);
      } catch {
        settingsMap[r.key] = r.value;
      }
    });

    let rawTz = settingsMap.timezone || "Australia/Perth";
    const timezone =
      typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;

    const invoiceDateFormatter = getSafeDateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const createdAtDate = new Date(invoiceRow.created_at || Date.now());
    const finalInvoiceDateStr = invoiceDateFormatter
      .format(createdAtDate)
      .replace(/\//g, "-");

    let services: any[] = [];
    try {
      if (invoiceRow.services_json) {
        services = JSON.parse(invoiceRow.services_json);
      }
    } catch (e) {
      console.error("Failed to parse merged invoice services_json:", e);
    }

    const lineItems: any[] = [];
    let subtotal = 0;

    services.forEach((sd) => {
      // Resolve service
      let srv = null;
      if (
        sd.isCustom ||
        (sd.serviceId && String(sd.serviceId).startsWith("custom-"))
      ) {
        srv = {
          id: sd.serviceId,
          name: sd.customName || "Custom Service",
          rate: Number(sd.customRate || 0),
          unit: sd.customUnit || "Hour",
          code: sd.customCode || "CUSTOM",
          type: "CUSTOM",
        };
      } else {
        srv = db
          .prepare("SELECT * FROM services WHERE id = ?")
          .get(sd.serviceId) as any;
      }

      if (srv) {
        let qty =
          sd.qtyOverride !== undefined &&
          sd.qtyOverride !== null &&
          sd.qtyOverride !== ""
            ? Number(sd.qtyOverride)
            : 1;
        let finalRate =
          sd.rateOverride !== undefined &&
          sd.rateOverride !== null &&
          sd.rateOverride !== ""
            ? Number(sd.rateOverride)
            : Number(srv.rate || 0);

        const amt = qty * finalRate;
        subtotal += amt;

        let mappedUnit = srv.unit || "H";
        if (mappedUnit === "Hour") mappedUnit = "H";
        if (
          srv.name &&
          (srv.name.toLowerCase().includes("activity based transport") ||
            srv.name.toLowerCase().includes("provider travel"))
        ) {
          mappedUnit = "Kilometre";
        }

        lineItems.push({
          date: sd.date || "",
          time: sd.time || "",
          serviceName: srv.name,
          code: srv.code || srv.id,
          metadata: sd.staffName ? `Provided by ${sd.staffName}` : "",
          qty: parseFloat(qty.toFixed(2)),
          unit: mappedUnit,
          rate: parseFloat(finalRate.toFixed(2)),
          amount: parseFloat(amt.toFixed(2)),
        });
      }
    });

    const isHomeCare =
      shift.funding_type === "HCP" ||
      shift.funding_type === "Home Care" ||
      shift.funding_type === "HOME_CARE";
    const gstAmount = isHomeCare ? subtotal * 0.1 : 0;
    const totalAmount = subtotal + gstAmount;

    return {
      shift,
      settingsMap,
      invoiceNum: invoiceRow.invoice_number,
      invoiceDate: finalInvoiceDateStr,
      lineItems,
      subtotal,
      gstAmount,
      totalAmount,
    };
  };

  const getInvoiceDataForShift = (shiftId: number) => {
    const shift = db
      .prepare(
        `
        SELECT s.*, 
               c.first_name as c_fn, c.last_name as c_ln, c.ndis_number, c.my_aged_care_id, c.address as c_address, c.provider_id,
               c.funding_type as client_funding_type,
               srv.rate, srv.name as service_name, srv.code as service_code, srv.type as service_type, srv.unit as service_unit,
               COALESCE(s.custom_staff_name, u.first_name) as s_fn, 
               COALESCE(CASE WHEN s.custom_staff_name IS NOT NULL THEN '' ELSE u.last_name END, '') as s_ln,
               p.company_name as plan_manager_name, p.email as plan_manager_email, p.address as plan_manager_address
        FROM shifts s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN services srv ON s.service_id = srv.id
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE s.id = ?
      `,
      )
      .get(shiftId) as any;

    if (!shift) return null;

    // Fallback for older merged shifts that might lack funding_type
    if (!shift.funding_type) {
      shift.funding_type = shift.client_funding_type || "NDIS";
    }

    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settingsMap: Record<string, any> = {};
    settingsRows.forEach((r) => {
      try {
        settingsMap[r.key] = JSON.parse(r.value);
      } catch {
        settingsMap[r.key] = r.value;
      }
    });

    let rawTz1 = settingsMap.timezone || "Australia/Perth";
    const timezone =
      typeof rawTz1 === "string" ? rawTz1.replace(/['"]+/g, "") : rawTz1;

    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const hours = Math.abs(end.getTime() - start.getTime()) / 36e5;

    const dateFormatterAPI = getSafeDateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const yyyymmdd = dateFormatterAPI.format(start).replace(/-/g, "");

    const isHC =
      shift.funding_type === "HCP" ||
      shift.funding_type === "Home Care" ||
      shift.funding_type === "HOME_CARE";
    let invoicePrefix = isHC
      ? settingsMap.hcInvoicePrefix
      : settingsMap.ndisInvoicePrefix;
    if (!invoicePrefix) {
      invoicePrefix = isHC ? "HC-" : "INV-";
    }
    const invoiceNum = `${invoicePrefix}${yyyymmdd}-${String(shiftId).padStart(4, "0")}`;

    const shiftDateFormatter = getSafeDateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const shiftDateStr = shiftDateFormatter.format(start).replace(/\//g, "-");

    const staffName = `${shift.s_fn} ${shift.s_ln}`;

    const timeFormatter = getSafeDateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const timeStr = `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;

    const lineItems: any[] = [];
    let subtotal = 0;

    let servicesData: any[] = [];
    try {
      if (shift.services_json) {
        servicesData = JSON.parse(shift.services_json);
      }
    } catch (e) {
      if (
        e.message &&
        !e.message.includes("duplicate column") &&
        !e.message.includes("no such column")
      )
        logger.warn("Migration/Query warning:", e.message);
    }

    if (servicesData.length > 0) {
      servicesData.forEach((sd) => {
        let srv = null;
        if (
          sd.isCustom ||
          (sd.serviceId && String(sd.serviceId).startsWith("custom-"))
        ) {
          srv = {
            id: sd.serviceId,
            name: sd.customName || "Custom Service",
            rate: Number(sd.customRate || 0),
            unit: sd.customUnit || "Hour",
            code: sd.customCode || "CUSTOM",
            type: "CUSTOM",
          };
        } else {
          srv = db
            .prepare("SELECT * FROM services WHERE id = ?")
            .get(sd.serviceId) as any;
        }
        if (srv) {
          let qty =
            sd.qtyOverride !== undefined && sd.qtyOverride !== ""
              ? Number(sd.qtyOverride)
              : srv.unit === "Hour"
                ? hours
                : 1;
          if (qty > 0) {
            let baseRate = Number(srv.rate || 0);
            let dayOfWeek = getTzDayOfWeek(start, timezone);
            let finalRate = baseRate;

            if (srv.type === "HOME_CARE" && srv.rates_json) {
              try {
                const hd = new Holidays("AU", settingsMap.state || "WA");
                const localDateStr = dateFormatterAPI.format(start);
                const isPublicHoliday = hd
                  .getHolidays(start.getFullYear())
                  .some(
                    (h: any) =>
                      h.type === "public" && h.date.startsWith(localDateStr),
                  );

                const rates = JSON.parse(srv.rates_json);
                if (isPublicHoliday && rates["Public Holiday"])
                  finalRate = Number(rates["Public Holiday"]);
                else if (dayOfWeek === 0 && rates["Sunday"])
                  finalRate = Number(rates["Sunday"]);
                else if (dayOfWeek === 6 && rates["Saturday"])
                  finalRate = Number(rates["Saturday"]);
                else if (rates["Weekday"]) finalRate = Number(rates["Weekday"]);
              } catch (e) {
                if (
                  e.message &&
                  !e.message.includes("duplicate column") &&
                  !e.message.includes("no such column")
                )
                  logger.warn("Migration/Query warning:", e.message);
              }
            } else if (srv.type === "NDIS" && srv.rates_json) {
              try {
                const rates = JSON.parse(srv.rates_json);
                const region = settingsMap.ndisRegion || "NSW";
                if (rates[region] !== undefined)
                  finalRate = Number(rates[region]);
              } catch (e) {
                if (
                  e.message &&
                  !e.message.includes("duplicate column") &&
                  !e.message.includes("no such column")
                )
                  logger.warn("Migration/Query warning:", e.message);
              }
            }

            if (
              sd.rateOverride !== undefined &&
              sd.rateOverride !== null &&
              sd.rateOverride !== ""
            ) {
              finalRate = Number(sd.rateOverride);
            }

            const amt = qty * finalRate;
            subtotal += amt;

            const isTravel =
              srv.name.toLowerCase().includes("travel") ||
              srv.name.toLowerCase().includes("transport");

            let mappedUnit = srv.unit || "H";
            if (mappedUnit === "Hour") mappedUnit = "H";
            if (
              srv.name.toLowerCase().includes("activity based transport") ||
              srv.name.toLowerCase().includes("provider travel")
            ) {
              mappedUnit = "Kilometre";
            }

            lineItems.push({
              date: sd.date || shiftDateStr,
              time: sd.time || timeStr,
              serviceName: srv.name,
              code: srv.code || srv.id,
              metadata: sd.staffName
                ? `Provided by ${sd.staffName}`
                : `Provided by ${staffName}`,
              qty: parseFloat(qty.toFixed(2)),
              unit: mappedUnit,
              rate: parseFloat(finalRate.toFixed(2)),
              amount: parseFloat(amt.toFixed(2)),
            });
          }
        }
      });
    } else if (shift.rate) {
      let fallbackUnit = shift.service_unit || "H";
      if (fallbackUnit === "Hour") fallbackUnit = "H";
      if (
        shift.service_name &&
        (shift.service_name
          .toLowerCase()
          .includes("activity based transport") ||
          shift.service_name.toLowerCase().includes("provider travel"))
      ) {
        fallbackUnit = "Kilometre";
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
        amount: amt,
      });

      if (shift.provider_travel_km > 0) {
        const travelCost = shift.provider_travel_cost;
        const travelRate =
          shift.provider_travel_km > 0
            ? travelCost / shift.provider_travel_km
            : 1.0;
        subtotal += travelCost;
        lineItems.push({
          date: shiftDateStr,
          time: timeStr,
          serviceName: "Provider travel - non-labour costs",
          code: "09_799_0117_6_3",
          metadata: `Provided by ${staffName}`,
          qty: shift.provider_travel_km,
          unit: "Kilometre",
          rate: travelRate,
          amount: travelCost,
        });
      }
      if (shift.abt_km > 0) {
        const abtCost = shift.abt_cost;
        const abtRate = shift.abt_km > 0 ? abtCost / shift.abt_km : 1.0;
        subtotal += abtCost;
        lineItems.push({
          date: shiftDateStr,
          time: timeStr,
          serviceName: "Activity Based Transport",
          code: "09_591_0117_6_3",
          metadata: `Provided by ${staffName}`,
          qty: shift.abt_km,
          unit: "Kilometre",
          rate: abtRate,
          amount: abtCost,
        });
      }
    }

    const invoiceDateFormatter = getSafeDateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    let finalInvoiceDateStr = invoiceDateFormatter
      .format(start)
      .replace(/\//g, "-");

    let manualGstType: string | null = null;
    if (shift.services_json) {
      try {
        const parsed = JSON.parse(shift.services_json);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0].gstType !== undefined
        ) {
          manualGstType = parsed[0].gstType;
        }
      } catch (e) {}
    }

    const isHomeCare =
      shift.funding_type === "HCP" ||
      shift.funding_type === "Home Care" ||
      shift.funding_type === "HOME_CARE";

    let gstAmount = 0;
    if (manualGstType) {
      gstAmount = manualGstType === "10%" ? subtotal * 0.1 : 0;
    } else {
      gstAmount = isHomeCare ? subtotal * 0.1 : 0;
    }

    const totalAmount = subtotal + gstAmount;

    return {
      shift,
      settingsMap,
      invoiceNum,
      invoiceDate: finalInvoiceDateStr,
      lineItems,
      subtotal,
      gstAmount,
      totalAmount,
    };
  };

  const calculateBillingSplits = (
    clientId: number,
    dateStr: string,
    loadedCost: number,
    category: string,
  ) => {
    try {
      const client = db
        .prepare(
          `
        SELECT billing_tier, historical_monthly_cap, 
               coalesce(assessed_independence_pct, 0) as assessed_independence_pct,
               coalesce(assessed_everyday_living_pct, 0) as assessed_everyday_living_pct
        FROM clients WHERE id = ?
      `,
        )
        .get(clientId) as any;

      if (!client) {
        return { clientShare: 0, packageDrawdown: loadedCost };
      }

      const tier = client.billing_tier || "SAH_Full_Pensioner";
      const isGrandfathered =
        tier === "Grandfathered" || tier === "grandfathered";
      const isHybrid =
        tier === "Hybrid" ||
        tier === "Hybrid (Transitioned Co-Payer)" ||
        tier === "hybrid";

      if (isGrandfathered) {
        return { clientShare: 0, packageDrawdown: loadedCost };
      }

      // Determine category percentage
      let categoryPct = 0;
      const normCategory = (category || "").trim().toLowerCase();

      if (normCategory === "clinical") {
        categoryPct = 0;
      } else if (normCategory === "independence") {
        categoryPct = (client.assessed_independence_pct ?? 0) / 100;
      } else if (
        normCategory === "everyday living" ||
        normCategory === "everyday_living"
      ) {
        categoryPct = (client.assessed_everyday_living_pct ?? 0) / 100;
      } else {
        // Default fallback if no category is matched.
        categoryPct = (client.assessed_independence_pct ?? 0) / 100;
      }

      let calculatedClientShare = parseFloat(
        (loadedCost * categoryPct).toFixed(2),
      );
      let calculatedPackageDrawdown = parseFloat(
        (loadedCost - calculatedClientShare).toFixed(2),
      );

      if (isHybrid) {
        // Cap at historical_monthly_cap
        const cap = Number(client.historical_monthly_cap || 0);

        // Parse dates to find billing month
        let year = "";
        let month = "";
        if (dateStr) {
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              // YYYY-MM-DD
              year = parts[0];
              month = parts[1];
            } else if (parts[2].length === 4) {
              // DD-MM-YYYY
              year = parts[2];
              month = parts[1];
            }
          }
        }
        if (!year || !month) {
          const d = new Date();
          year = String(d.getFullYear());
          month = String(d.getMonth() + 1).padStart(2, "0");
        }

        const likePattern1 = `${year}-${month}-%`;
        const likePattern2 = `%-${month}-${year}`;

        const sumRow = db
          .prepare(
            `
          SELECT SUM(client_share) as total 
          FROM client_ledger_entries 
          WHERE client_id = ? 
            AND (date LIKE ? OR date LIKE ?)
        `,
          )
          .get(clientId, likePattern1, likePattern2) as any;
        const existingMonthlyTotal = sumRow?.total || 0;

        if (existingMonthlyTotal + calculatedClientShare > cap) {
          const remainingCap = Math.max(0, cap - existingMonthlyTotal);
          calculatedClientShare = parseFloat(remainingCap.toFixed(2));
          calculatedPackageDrawdown = parseFloat(
            (loadedCost - calculatedClientShare).toFixed(2),
          );
        }
      }

      return {
        clientShare: calculatedClientShare,
        packageDrawdown: calculatedPackageDrawdown,
      };
    } catch (e) {
      console.error("Error calculating billing splits:", e);
      return { clientShare: 0, packageDrawdown: loadedCost };
    }
  };

  const getInvoiceDataForRespiteBooking = (respiteBookingId: number) => {
    const rb = db
      .prepare(
        `
        SELECT rb.*, c.first_name as c_fn, c.last_name as c_ln, c.ndis_number, c.my_aged_care_id, c.address as c_address, c.provider_id, c.funding_type,
               p.company_name as plan_manager_name, p.email as plan_manager_email, p.address as plan_manager_address
        FROM respite_bookings rb
        LEFT JOIN clients c ON rb.client_id = c.id
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE rb.id = ?
      `,
      )
      .get(respiteBookingId) as any;

    if (!rb) return null;

    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settingsMap: Record<string, any> = {};
    settingsRows.forEach((r) => {
      try {
        settingsMap[r.key] = JSON.parse(r.value);
      } catch {
        settingsMap[r.key] = r.value;
      }
    });
    let rawTz2 = settingsMap.timezone || "Australia/Perth";
    const timezone =
      typeof rawTz2 === "string" ? rawTz2.replace(/['"]+/g, "") : rawTz2;

    const dateFormatterAPI = getSafeDateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const shiftDateFormatter = getSafeDateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const start = new Date(rb.start_time);
    const end = new Date(rb.end_time);
    const yyyymmdd = dateFormatterAPI.format(start).replace(/-/g, "");

    const isHC =
      rb.funding_type === "HCP" ||
      rb.funding_type === "Home Care" ||
      rb.funding_type === "HOME_CARE";
    let invoicePrefix = isHC
      ? settingsMap.hcInvoicePrefix
      : settingsMap.ndisInvoicePrefix;
    if (!invoicePrefix) invoicePrefix = isHC ? "HC-" : "INV-";

    const invoiceNum = `${invoicePrefix}RB${yyyymmdd}-${String(respiteBookingId).padStart(4, "0")}`;

    // Fetch child shifts staff details for daily distribution
    const shifts = db
      .prepare(
        `
        SELECT s.start_time, s.end_time, s.service_id, s.services_json, u.first_name as s_fn, u.last_name as s_ln
        FROM shifts s
        LEFT JOIN users u ON s.staff_id = u.id
        WHERE s.respite_booking_id = ?
        ORDER BY s.start_time ASC
      `,
      )
      .all(respiteBookingId) as any[];

    const dailyMap: Record<
      string,
      { staff: Set<string>; sStart: Date; serviceId: number | null }
    > = {};

    for (const s of shifts) {
      const sStart = new Date(s.start_time);
      const shiftDateStr = shiftDateFormatter
        .format(sStart)
        .replace(/\//g, "-");

      if (!dailyMap[shiftDateStr]) {
        dailyMap[shiftDateStr] = {
          staff: new Set<string>(),
          sStart: sStart,
          serviceId: null,
        };
      }
      if (s.s_fn) dailyMap[shiftDateStr].staff.add(`${s.s_fn} ${s.s_ln}`);

      if (!dailyMap[shiftDateStr].serviceId) {
        let srvId = null;
        if (s.services_json) {
          try {
            const pj = JSON.parse(s.services_json);
            if (pj && pj.length > 0) srvId = pj[0].serviceId;
          } catch (e) {}
        }
        if (!srvId && s.service_id) srvId = s.service_id;
        if (srvId) dailyMap[shiftDateStr].serviceId = srvId;
      }
    }

    const allLineItems: any[] = [];
    let subtotal = 0;

    const hd = new Holidays("AU", settingsMap.state || "WA");

    for (const [dateStr, dayData] of Object.entries(dailyMap)) {
      const staffList = Array.from(dayData.staff);
      const sStart = dayData.sStart;

      let srvId = dayData.serviceId;
      if (!srvId && rb.service_id) srvId = rb.service_id;

      let finalRate = 0;
      let srvName = "STA / Respite";
      let srvCode = "N/A";
      let dayCategory = "Weekday";

      const dayOfWeek = getTzDayOfWeek(sStart, timezone);
      const ymd = dateFormatterAPI.format(sStart);
      const isPubHol = hd
        .getHolidays(sStart.getFullYear())
        .some((h: any) => h.type === "public" && h.date.startsWith(ymd));

      if (isPubHol) dayCategory = "Public Holiday";
      else if (dayOfWeek === 0) dayCategory = "Sunday";
      else if (dayOfWeek === 6) dayCategory = "Saturday";

      if (srvId) {
        const srv = db
          .prepare("SELECT * FROM services WHERE id = ?")
          .get(srvId) as any;
        if (srv) {
          srvName = srv.name;
          srvCode = srv.code || srv.id || "N/A";

          let baseRate = Number(srv.rate || 0);

          // Look up custom rate for this client/service
          const cs = db
            .prepare(
              "SELECT custom_rate FROM client_services WHERE client_id = ? AND service_id = ?",
            )
            .get(rb.client_id, srvId) as any;
          if (cs && cs.custom_rate !== null && cs.custom_rate !== undefined) {
            baseRate = Number(cs.custom_rate);
          }

          finalRate = baseRate;
          if (srv.type === "HOME_CARE" && srv.rates_json) {
            try {
              const rates = JSON.parse(srv.rates_json);
              if (isPubHol && rates["Public Holiday"])
                finalRate = Number(rates["Public Holiday"]);
              else if (dayOfWeek === 0 && rates["Sunday"])
                finalRate = Number(rates["Sunday"]);
              else if (dayOfWeek === 6 && rates["Saturday"])
                finalRate = Number(rates["Saturday"]);
              else if (rates["Weekday"]) finalRate = Number(rates["Weekday"]);
            } catch (e) {}
          } else if (srv.type === "NDIS" && srv.rates_json) {
            try {
              const rates = JSON.parse(srv.rates_json);
              const region = settingsMap.ndisRegion || "NSW";
              if (rates[region] !== undefined)
                finalRate = Number(rates[region]);
            } catch (e) {}
          }
        }
      }

      const description = `${srvName} - ${dayCategory}`;

      allLineItems.push({
        date: dateStr,
        time: "24 Hours",
        serviceName: description,
        code: srvCode,
        metadata:
          staffList.length > 0 ? `Provided by ${staffList.join(", ")}` : "",
        qty: 1,
        unit: "Day",
        rate: finalRate,
        amount: finalRate,
      });
      subtotal += finalRate;
    }

    if (allLineItems.length === 0) return null;

    const invoiceDateFormatter = getSafeDateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    let finalInvoiceDateStr = invoiceDateFormatter
      .format(new Date(rb.start_time))
      .replace(/\//g, "-");

    const isHomeCare =
      rb.funding_type === "HCP" ||
      rb.funding_type === "Home Care" ||
      rb.funding_type === "HOME_CARE";
    const gstAmount = isHomeCare ? subtotal * 0.1 : 0;
    const totalAmount = subtotal + gstAmount;

    return {
      shift: rb,
      settingsMap,
      invoiceNum,
      invoiceDate: finalInvoiceDateStr,
      lineItems: allLineItems,
      subtotal,
      gstAmount,
      totalAmount,
    };
  };

  const generateInvoiceForRespiteBooking = (respiteBookingId: number) => {
    try {
      const data = getInvoiceDataForRespiteBooking(respiteBookingId);
      if (!data) return;
      if (data.lineItems.length === 0) return;

      const {
        shift,
        settingsMap,
        invoiceNum,
        invoiceDate,
        lineItems,
        subtotal,
        totalAmount,
      } = data;
      const fileName = `${invoiceNum}.pdf`;

      const existing = db
        .prepare("SELECT id FROM invoices WHERE respite_booking_id = ?")
        .get(respiteBookingId);
      if (existing) {
        db.prepare(
          "UPDATE invoices SET invoice_number=?, amount=?, file_path=?, status=?, merged_into_shift_id=NULL, merged_into_invoice_id=NULL WHERE respite_booking_id=?",
        ).run(invoiceNum, totalAmount, fileName, "GENERATED", respiteBookingId);
      } else {
        db.prepare(
          "INSERT INTO invoices (invoice_number, respite_booking_id, client_id, amount, file_path, status) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(
          invoiceNum,
          respiteBookingId,
          shift.client_id,
          totalAmount,
          fileName,
          "GENERATED",
        );
      }
    } catch (e) {
      console.error("Failed to generate invoice for respite:", e);
    }
  };

  // Backfill existing invoices
  try {
    // Clear orphaned merged invoices references and restore them dynamically
    const orphanInvoiceRes = db
      .prepare(
        `
      UPDATE invoices 
      SET status = 'GENERATED', merged_into_invoice_id = NULL 
      WHERE merged_into_invoice_id IS NOT NULL 
        AND merged_into_invoice_id NOT IN (SELECT id FROM invoices)
    `,
      )
      .run();
    if (orphanInvoiceRes.changes > 0) {
      console.log(
        `[DEBUG] Restored ${orphanInvoiceRes.changes} orphaned merged invoices whose target invoice was deleted.`,
      );
    }

    const orphanShiftRes = db
      .prepare(
        `
      UPDATE invoices 
      SET status = 'GENERATED', merged_into_shift_id = NULL 
      WHERE merged_into_shift_id IS NOT NULL 
        AND merged_into_shift_id NOT IN (SELECT id FROM shifts)
    `,
      )
      .run();
    if (orphanShiftRes.changes > 0) {
      console.log(
        `[DEBUG] Restored ${orphanShiftRes.changes} orphaned merged invoices whose target shift was deleted.`,
      );
    }

    const existingInvoices = db
      .prepare("SELECT id, shift_id FROM invoices WHERE invoice_number IS NULL")
      .all() as any[];
    if (existingInvoices.length > 0) {
      console.log(`Backfilling ${existingInvoices.length} invoices...`);
      existingInvoices.forEach((inv) => {
        try {
          const data = getInvoiceDataForShift(inv.shift_id);
          if (data && data.invoiceNum) {
            db.prepare(
              "UPDATE invoices SET invoice_number = ? WHERE id = ?",
            ).run(data.invoiceNum, inv.id);
          }
        } catch (err) {
          console.error(`Failed to backfill invoice ${inv.id}:`, err);
        }
      });
    }

    // Fix respite invoices with $0 amounts
    const zeroRespiteInvoices = db
      .prepare(
        "SELECT id, respite_booking_id FROM invoices WHERE respite_booking_id IS NOT NULL AND amount = 0",
      )
      .all() as any[];
    if (zeroRespiteInvoices.length > 0) {
      console.log(
        `Recalculating ${zeroRespiteInvoices.length} respite invoices with $0.00 amount...`,
      );
      zeroRespiteInvoices.forEach((inv) => {
        try {
          const data = getInvoiceDataForRespiteBooking(inv.respite_booking_id);
          if (data && data.totalAmount !== undefined) {
            db.prepare("UPDATE invoices SET amount = ? WHERE id = ?").run(
              data.totalAmount,
              inv.id,
            );
          }
        } catch (err) {
          console.error(`Failed to update respite invoice ${inv.id}:`, err);
        }
      });
    }
  } catch (e) {
    console.warn("Invoices backfill failed:", e);
  }

  const generateInvoiceForShift = (shiftId: number) => {
    try {
      const data = getInvoiceDataForShift(shiftId);
      if (!data) return;
      if (data.lineItems.length === 0) return;

      const {
        shift,
        settingsMap,
        invoiceNum,
        invoiceDate,
        lineItems,
        subtotal,
        totalAmount,
      } = data;
      const fileName = `${invoiceNum}.pdf`;

      // Just update DB record, no need to write to fs since it's on-the-fly now.
      const existing = db
        .prepare("SELECT id FROM invoices WHERE shift_id = ?")
        .get(shiftId);
      if (existing) {
        db.prepare(
          "UPDATE invoices SET invoice_number=?, amount=?, file_path=?, status=?, merged_into_shift_id=NULL, merged_into_invoice_id=NULL WHERE shift_id=?",
        ).run(invoiceNum, totalAmount, fileName, "GENERATED", shiftId);
      } else {
        db.prepare(
          "INSERT INTO invoices (invoice_number, shift_id, client_id, amount, file_path, status) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(
          invoiceNum,
          shiftId,
          shift.client_id,
          totalAmount,
          fileName,
          "GENERATED",
        );
      }
    } catch (e) {
      console.error("Failed to generate invoice:", e);
    }
  };

  // Seed default admin if table is empty
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync("password123", 10);
    db.prepare(
      "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
    ).run("admin@happyinthehome.com", hash, "ADMIN", "System", "Admin");
    console.log(
      "Seeded default admin user: admin@happyinthehome.com / password123",
    );
  }

  // Seed default settings if empty
  const populateDefaultSettings = () => {
    const defaults: Record<string, any> = {
      bankName: "National Australia Bank",
      bankAccountName: "Happy in the Home",
      bankBsb: "086-554",
      bankAcc: "506627847",
      ndisRegion: "Remote",
    };

    const stmtInsert = db.prepare(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
    );
    db.transaction(() => {
      for (const [k, v] of Object.entries(defaults)) {
        stmtInsert.run(k, JSON.stringify(v));
      }
    })();
  };
  populateDefaultSettings();

  try {
    db.exec(
      `UPDATE files SET folder_path = '/Settings' WHERE original_name LIKE '%NDIS-Support Catalogue%' OR original_name LIKE '%Home Care pricing%'`,
    );
  } catch (e: any) {
    logger.error("Failed to move initial files to Settings folder", e);
  }

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.split(" ")[1];

    // Also allow token from query string (for PDF downloads etc)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      req.user = user;
      next();
    });
  };

  const authenticateTokenOrWallboard = (req: any, res: any, next: any) => {
    if (req.query.wallboard === "true" && req.method === "GET") {
      req.user = {
        role: "ADMIN",
        id: -1,
        first_name: "Wallboard",
        last_name: "",
      };
      return next();
    }
    return authenticateToken(req, res, next);
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
      error:
        "Too many login attempts from this IP, please try again after 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth Routes
  app.post("/api/login", loginRateLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    // Also attach safe settings
    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settings = settingsRows.reduce(
      (acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),
      {},
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      settings,
    });
  });

  // --- Notifications API ---
  app.get("/api/notifications", authenticateToken, (req: any, res: any) => {
    try {
      const notifs = db
        .prepare(
          "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        )
        .all(req.user.id);
      res.json(notifs);
    } catch (e: any) {
      logger.error(
        "API Error",
        Object.assign({}, e, { message: e?.message, stack: e?.stack }),
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put(
    "/api/notifications/read-all",
    authenticateToken,
    (req: any, res: any) => {
      try {
        db.prepare(
          "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        ).run(req.user.id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(
          "API Error",
          Object.assign({}, e, { message: e?.message, stack: e?.stack }),
        );
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/notifications/:id/read",
    authenticateToken,
    (req: any, res: any) => {
      try {
        db.prepare(
          "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        ).run(req.params.id, req.user.id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(
          "API Error",
          Object.assign({}, e, { message: e?.message, stack: e?.stack }),
        );
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const user = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email) as any;
      if (!user) {
        // Return 200 to prevent email enumeration
        return res.json({
          success: true,
          message: "If that email exists, we have sent a reset link to it.",
        });
      }

      const token = crypto.randomBytes(20).toString("hex");
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      db.prepare(
        "UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?",
      ).run(token, expires, email);

      const appUrl =
        process.env.APP_URL || process.env.BASE_URL || "http://localhost:3000";
      const resetLink = `${appUrl}/reset-password/${token}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || "support@happyinthehome.com",
        to: email,
        subject: "Password Reset - Happy in the Home",
        text:
          `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
          `Please click on the following link, or paste this into your browser to complete the process. This link will expire in 1 hour:\n\n` +
          `${resetLink}\n\n` +
          `If you did not request this, please ignore this email and your password will remain unchanged.\n` +
          `Regards,\nHappy in the Home Team`,
      };

      await transporter.sendMail(mailOptions);
      res.json({
        success: true,
        message: "If that email exists, we have sent a reset link to it.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    try {
      const user = db
        .prepare(
          "SELECT id, reset_password_expires FROM users WHERE reset_password_token = ?",
        )
        .get(token) as any;

      if (!user) {
        return res
          .status(400)
          .json({ error: "Password reset token is invalid or has expired." });
      }

      if (new Date(user.reset_password_expires) < new Date()) {
        return res
          .status(400)
          .json({ error: "Password reset token is invalid or has expired." });
      }

      const passwordHash = bcrypt.hashSync(password, 10);

      db.prepare(
        "UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?",
      ).run(passwordHash, user.id);

      res.json({
        success: true,
        message: "Password has been successfully reset. You can now login.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/me", authenticateToken, (req: any, res: any) => {
    const user = db
      .prepare(
        "SELECT id, email, role, first_name, last_name FROM users WHERE id = ?",
      )
      .get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });

    // Also attach safe settings
    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settings = settingsRows.reduce(
      (acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),
      {},
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      settings,
    });
  });

  app.get("/api/profile", authenticateToken, (req: any, res: any) => {
    const user = db
      .prepare(
        `
      SELECT 
        id, email, role, first_name as firstName, last_name as lastName, 
        phone, address, dob, 
        emergency_contact_name as emergencyContactName, 
        emergency_contact_phone as emergencyContactPhone, 
        bank_name as bankName, bank_bsb as bankBsb, bank_acc as bankAcc, 
        tax_number as taxNumber, super_fund_name as superFundName, 
        super_member_number as superMemberNumber 
      FROM users WHERE id = ?
    `,
      )
      .get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.put("/api/profile", authenticateToken, (req: any, res: any) => {
    const {
      firstName,
      lastName,
      phone,
      address,
      dob,
      emergencyContactName,
      emergencyContactPhone,
      bankName,
      bankBsb,
      bankAcc,
      taxNumber,
      superFundName,
      superMemberNumber,
      password,
    } = req.body;

    let query = `
      UPDATE users SET 
        first_name = ?, last_name = ?, phone = ?, address = ?, dob = ?, 
        emergency_contact_name = ?, emergency_contact_phone = ?, 
        bank_name = ?, bank_bsb = ?, bank_acc = ?, tax_number = ?, 
        super_fund_name = ?, super_member_number = ?
    `;
    const params: any[] = [
      firstName,
      lastName,
      phone,
      address,
      dob,
      emergencyContactName,
      emergencyContactPhone,
      bankName,
      bankBsb,
      bankAcc,
      taxNumber,
      superFundName,
      superMemberNumber,
    ];

    if (password) {
      query += ", password_hash = ?";
      params.push(bcrypt.hashSync(password, 10));
    }

    query += " WHERE id = ?";
    params.push(req.user.id);

    try {
      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  // --- API Routes Placeholder ---
  app.get("/api/public-settings", (req, res) => {
    try {
      const rows = db
        .prepare("SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?)")
        .all(
          "websiteLogo",
          "businessName",
          "pwaIcon192",
          "pwaIcon512",
        ) as any[];
      const settings: any = {};
      rows.forEach((r) => {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          settings[r.key] = r.value;
        }
      });
      res.json(settings);
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const persistentAssetsDir = path.join(process.cwd(), "data", "uploads", "assets");
  if (!fs.existsSync(persistentAssetsDir)) {
    fs.mkdirSync(persistentAssetsDir, { recursive: true });
  }

  // Migrate old assets if they exist (for non-docker setups)
  const oldAssetsDir = path.join(process.cwd(), "assets");
  if (fs.existsSync(oldAssetsDir)) {
    try {
      fs.readdirSync(oldAssetsDir).forEach((file) => {
        const oldPath = path.join(oldAssetsDir, file);
        const newPath = path.join(persistentAssetsDir, file);
        if (!fs.existsSync(newPath) && fs.statSync(oldPath).isFile()) {
          fs.copyFileSync(oldPath, newPath);
        }
      });
    } catch (err) {
      console.error("Error migrating old assets:", err);
    }
  }

  const assetsDir = persistentAssetsDir;

  app.get("/api/assets/:filename", (req: any, res: any) => {
    const filePath = path.join(assetsDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("Not found");
    }
  });

  app.post(
    "/api/settings/upload-logo",
    authenticateToken,
    requireAdmin,
    upload.single("logo"),
    (req: any, res: any) => {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      try {
        const ext = path.extname(req.file.originalname) || ".png";
        const key = req.body.key || "logo";
        const filename = `${key}_${Date.now()}${ext}`;
        const targetPath = path.join(assetsDir, filename);
        fs.copyFileSync(req.file.path, targetPath);
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {} // Clean up multer temp file
        res.json({ path: `/api/assets/${filename}` });
      } catch (e: any) {
        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {}
        }

        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/api/holidays", authenticateToken, (req, res) => {
    try {
      const year = req.query.year
        ? parseInt(req.query.year as string, 10)
        : new Date().getFullYear();

      const settingsRows = db
        .prepare("SELECT key, value FROM settings")
        .all() as any[];
      const settingsMap: any = {};
      settingsRows.forEach((r) => {
        try {
          settingsMap[r.key] = JSON.parse(r.value);
        } catch {
          settingsMap[r.key] = r.value;
        }
      });

      const state = settingsMap.state || "WA"; // Default to WA
      const hd = new Holidays("AU", state);

      const holidaysList = hd
        .getHolidays(year)
        .filter((h) => h.type === "public");
      res.json({ holidays: holidaysList, state });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/pwa-icon/:size", async (req, res) => {
    try {
      const size = req.params.size;
      const rows = db
        .prepare("SELECT key, value FROM settings WHERE key IN (?, ?)")
        .all("pwaIcon192", "pwaIcon512") as any[];
      const settingsMap = rows.reduce((acc, row) => {
        let val = row.value;
        try {
          val = JSON.parse(val);
        } catch (e) {
          /* ignore */
        }
        return { ...acc, [row.key]: val };
      }, {} as any);
      let url =
        size === "512" ? settingsMap.pwaIcon512 : settingsMap.pwaIcon192;
      if (!url || url === "/favicon.ico") {
        url =
          "https://storage.googleapis.com/a1aa/image/q5wGk6gY1A4iIpyQ4tP9CEX2uD43iP6PudN1F2cQ5B8cWcWTA.jpg";
      }

      if (url.startsWith("/")) {
        url = `http://localhost:${PORT}${url}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }
      const buffer = await response.arrayBuffer();
      res.setHeader(
        "Content-Type",
        response.headers.get("content-type") || "image/jpeg",
      );
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      logger.error(
        "API Error",
        Object.assign({}, err, { message: err?.message, stack: err?.stack }),
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get(["/api/app-manifest.json", "/manifest.webmanifest"], (req, res) => {
    try {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Content-Type", "application/manifest+json");

      let pwa192 =
        "https://storage.googleapis.com/a1aa/image/q5wGk6gY1A4iIpyQ4tP9CEX2uD43iP6PudN1F2cQ5B8cWcWTA.jpg";
      let pwa512 =
        "https://storage.googleapis.com/a1aa/image/q5wGk6gY1A4iIpyQ4tP9CEX2uD43iP6PudN1F2cQ5B8cWcWTA.jpg";
      let name = "Happy in the Home";

      try {
        const rows = db
          .prepare("SELECT key, value FROM settings WHERE key IN (?, ?, ?)")
          .all("pwaIcon192", "pwaIcon512", "businessName") as any[];
        for (const row of rows) {
          try {
            let val = row.value;
            if (typeof val === "string") {
              try {
                val = JSON.parse(val);
              } catch (e) {}
            }
            if (
              row.key === "pwaIcon192" &&
              typeof val === "string" &&
              val &&
              val !== "/favicon.ico"
            )
              pwa192 = val;
            if (
              row.key === "pwaIcon512" &&
              typeof val === "string" &&
              val &&
              val !== "/favicon.ico"
            )
              pwa512 = val;
            if (row.key === "businessName" && typeof val === "string" && val)
              name = val;
          } catch (e) {}
        }
      } catch (e) {
        console.error("Error fetching settings for manifest:", e);
      }

      const getMimeType = (url: any) => {
        if (typeof url !== "string") return "image/png";
        if (url.toLowerCase().endsWith(".ico")) return "image/x-icon";
        return url.toLowerCase().includes(".jpg") ||
          url.toLowerCase().includes(".jpeg")
          ? "image/jpeg"
          : "image/png";
      };

      const manifestContent = {
        name: "HappyJob",
        short_name: "HappyJob",
        start_url: "/",
        scope: "/",
        description: "Roster management application",
        theme_color: "#0b1120",
        background_color: "#0b1120",
        display: "standalone",
        icons: [
          {
            src: pwa192,
            sizes: "192x192",
            type: getMimeType(pwa192),
            purpose: "any maskable",
          },
          {
            src: pwa512,
            sizes: "512x512",
            type: getMimeType(pwa512),
            purpose: "any maskable",
          },
          {
            src: pwa192,
            sizes: "180x180",
            type: getMimeType(pwa192),
            purpose: "any",
          },
        ],
      };

      res.type("application/manifest+json");
      res.send(JSON.stringify(manifestContent));
    } catch (e: any) {
      console.error("Failed to generate manifest.webmanifest:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/settings", authenticateToken, requireAdmin, (req, res) => {
    try {
      const rows = db.prepare("SELECT key, value FROM settings").all() as any[];
      const settings = rows.reduce(
        (acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),
        {},
      );
      res.json(settings);
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/funding-rates", authenticateToken, (req, res) => {
    try {
      const rows = db
        .prepare(
          "SELECT key, value FROM settings WHERE key IN ('hcpFundingLevels', 'sahFundingLevels')",
        )
        .all() as any[];
      const settings = rows.reduce(
        (acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),
        {} as any,
      );
      res.json(settings);
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/settings", authenticateToken, requireAdmin, (req, res) => {
    try {
      const settings = req.body;
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      );
      const insertMany = db.transaction((settingsObj) => {
        for (const [key, value] of Object.entries(settingsObj)) {
          stmt.run(key, JSON.stringify(value));
        }
      });
      insertMany(settings);
      res.json({ success: true, settings });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/awesome-quotes/daily", (req, res) => {
    try {
      const quotes = [
        {
          quote: "The only way to do great work is to love what you do.",
          author: "Steve Jobs",
        },
        {
          quote: "Believe you can and you're halfway there.",
          author: "Theodore Roosevelt",
        },
        {
          quote:
            "It does not matter how slowly you go as long as you do not stop.",
          author: "Confucius",
        },
        {
          quote:
            "Success is not final, failure is not fatal: it is the courage to continue that counts.",
          author: "Winston Churchill",
        },
        {
          quote: "Act as if what you do makes a difference. It does.",
          author: "William James",
        },
        {
          quote:
            "What you get by achieving your goals is not as important as what you become by achieving your goals.",
          author: "Zig Ziglar",
        },
        {
          quote:
            "I can't change the direction of the wind, but I can adjust my sails to always reach my destination.",
          author: "Jimmy Dean",
        },
        {
          quote:
            "You are never too old to set another goal or to dream a new dream.",
          author: "C.S. Lewis",
        },
        {
          quote: "Limit your 'always' and your 'nevers'.",
          author: "Amy Poehler",
        },
        {
          quote: "Nothing is impossible. The word itself says 'I'm possible!'",
          author: "Audrey Hepburn",
        },
        { quote: "You are enough just as you are.", author: "Meghan Markle" },
        {
          quote:
            "Keep your face always toward the sunshine, and shadows will fall behind you.",
          author: "Walt Whitman",
        },
        {
          quote:
            "The future belongs to those who believe in the beauty of their dreams.",
          author: "Eleanor Roosevelt",
        },
        {
          quote:
            "You define your own life. Don't let other people write your script.",
          author: "Oprah Winfrey",
        },
        { quote: "Spread love everywhere you go.", author: "Mother Teresa" },
        {
          quote: "Do what you can, with what you have, where you are.",
          author: "Theodore Roosevelt",
        },
        {
          quote: "The best way to predict the future is to create it.",
          author: "Abraham Lincoln",
        },
        {
          quote:
            "Happiness is not something ready made. It comes from your own actions.",
          author: "Dalai Lama",
        },
        {
          quote:
            "The only limit to our realization of tomorrow will be our doubts of today.",
          author: "Franklin D. Roosevelt",
        },
        {
          quote: "We generate fears while we sit. We overcome them by action.",
          author: "Dr. Henry Link",
        },
        {
          quote: "Whether you think you can or think you can't, you're right.",
          author: "Henry Ford",
        },
        {
          quote:
            "Security is mostly a superstition. Life is either a daring adventure or nothing.",
          author: "Helen Keller",
        },
        {
          quote:
            "The man who has confidence in himself gains the confidence of others.",
          author: "Hasidic Proverb",
        },
        {
          quote:
            "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.",
          author: "Winston Churchill",
        },
        {
          quote: "Don't let yesterday take up too much of today.",
          author: "Will Rogers",
        },
        {
          quote:
            "You learn more from failure than from success. Don't let it stop you.",
          author: "Unknown",
        },
        {
          quote:
            "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you.",
          author: "Steve Jobs",
        },
        {
          quote:
            "People who are crazy enough to think they can change the world, are the ones who do.",
          author: "Rob Siltanen",
        },
        {
          quote:
            "Failure will never overtake me if my determination to succeed is strong enough.",
          author: "Og Mandino",
        },
        {
          quote:
            "Entrepreneurs are great at dealing with uncertainty and also very good at minimizing risk.",
          author: "Mohnish Pabrai",
        },
        {
          quote: "We may encounter many defeats but we must not be defeated.",
          author: "Maya Angelou",
        },
        {
          quote:
            "Knowing is not enough; we must apply. Wishing is not enough; we must do.",
          author: "Johann Wolfgang Von Goethe",
        },
        {
          quote:
            "Imagine your life is perfect in every respect; what would it look like?",
          author: "Brian Tracy",
        },
      ];
      // Use days since epoch to pick a consistent daily quote that cycles through the array over time
      const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const dailyQuote = quotes[dayIndex % quotes.length];
      res.json(dailyQuote);
    } catch (err) {
      res.json({
        quote: "Innovation distinguishes between a leader and a follower.",
        author: "Steve Jobs",
      });
    }
  });

  app.get("/api/test-clients", (req, res) => {
    try {
      const clients = db
        .prepare(
          "SELECT id, first_name, last_name, ndis_number, my_aged_care_id, funding_type FROM clients",
        )
        .all();
      res.json(clients);
    } catch (e: any) {
      logger.error("Error in /api/test-clients route", {
        error: e.message,
        stack: e.stack,
      });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get(
    "/api/places/autocomplete",
    authenticateToken,
    async (req: any, res: any) => {
      const { input } = req.query;
      if (!input) return res.status(400).json({ error: "Input required" });

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
                high: { latitude: -13.7, longitude: 129.0 },
              },
            },
          };
          const apiKey =
            process.env.Maps_API_KEY ||
            process.env.Maps_PLATFORM_KEY ||
            process.env.GOOGLE_MAPS_PLATFORM_KEY ||
            "";
          const response = await fetch(
            "https://places.googleapis.com/v1/places:autocomplete",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
              },
              body: JSON.stringify(payload),
            },
          );
          if (!response.ok) {
            if (
              (response.status >= 500 || response.status === 429) &&
              attempts < maxAttempts
            ) {
              attempts++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              return attemptFetch();
            }
            throw new Error(
              `Google Places API responded with status ${response.status}`,
            );
          }
          return await response.json();
        } catch (err) {
          if (attempts < maxAttempts) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return attemptFetch();
          }
          throw err;
        }
      }

      try {
        const data = await attemptFetch();
        res.json(data);
      } catch (e) {
        console.error("Places Autocomplete proxy error", e);
        res
          .status(503)
          .json({ error: "Search service temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/transport-distance",
    authenticateToken,
    async (req: any, res: any) => {
      const { placeIds } = req.body;
      if (!placeIds || !Array.isArray(placeIds) || placeIds.length < 2) {
        return res.json({ distance: 0 });
      }
      try {
        const validWaypoints = placeIds.map((id: string) => ({ placeId: id }));
        const payload: any = {
          origin: validWaypoints[0],
          destination: validWaypoints[validWaypoints.length - 1],
          travelMode: "DRIVE",
        };
        if (validWaypoints.length > 2) {
          payload.intermediates = validWaypoints.slice(1, -1);
        }

        const apiKey =
          process.env.Maps_API_KEY ||
          process.env.Maps_PLATFORM_KEY ||
          process.env.GOOGLE_MAPS_PLATFORM_KEY ||
          "";
        const response = await fetch(
          "https://routes.googleapis.com/directions/v2:computeRoutes",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "routes.distanceMeters",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          return res
            .status(500)
            .json({ error: "Failed to compute route distances" });
        }
        const data = await response.json();
        const meters = data.routes?.[0]?.distanceMeters || 0;
        res.json({ distance: meters / 1000 });
      } catch (err) {
        console.error("Transport distance computation error", err);
        res.status(500).json({ error: "Failed to compute route distances" });
      }
    },
  );

  // --- Onboarding APIs ---
  app.get("/api/users/onboarding", authenticateToken, (req: any, res: any) => {
    try {
      let targetUserId = req.user.id;
      if (req.user.role === "ADMIN" && req.query.userId) {
        targetUserId = parseInt(req.query.userId, 10);
      }
      const user = db
        .prepare("SELECT onboarding_json FROM users WHERE id = ?")
        .get(targetUserId) as any;
      let onboardingData = user?.onboarding_json
        ? JSON.parse(user.onboarding_json)
        : {};

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

      const fileIds = Object.keys(fileIdsObject).map((id) => parseInt(id, 10));

      if (fileIds.length > 0) {
        const placeholders = fileIds.map(() => "?").join(",");
        const existingFiles = db
          .prepare(
            `SELECT id, system_name, date_issued, date_expires FROM files WHERE id IN (${placeholders})`,
          )
          .all(...fileIds) as any[];

        const validFileIds = new Set();
        const fileMetadata = new Map();
        existingFiles.forEach((f) => {
          const filePath = path.join(process.cwd(), "data", "uploads", f.system_name);
          if (fs.existsSync(filePath)) {
            validFileIds.add(f.id);
            fileMetadata.set(f.id, f);
          }
        });

        for (const stepKey in onboardingData) {
          const step = onboardingData[stepKey];
          if (step.files && Array.isArray(step.files)) {
            const originalLength = step.files.length;
            step.files = step.files
              .filter((f: any) => validFileIds.has(f.id))
              .map((f: any) => {
                const meta = fileMetadata.get(f.id);
                return {
                  ...f,
                  date_issued: meta.date_issued,
                  date_expires: meta.date_expires,
                };
              });
            // Always consider modified if we are picking up metadata, or length changed
            if (
              step.files.length !== originalLength ||
              step.files.some((f: any) => f.date_issued || f.date_expires)
            ) {
              modified = true;
            }
            if (step.files.length === 0) {
              // If it became empty, remove fileId too and potentially step status
              if (step.fileId) {
                step.fileId = null;
                modified = true;
              }
              if (step.status === "completed") {
                step.status = "pending";
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
              if (step.status === "completed") step.status = "pending";
              modified = true;
            } else {
              const meta = fileMetadata.get(step.fileId);
              step.files = [
                {
                  id: step.fileId,
                  name: "Uploaded File",
                  date_issued: meta.date_issued,
                  date_expires: meta.date_expires,
                },
              ];
              step.fileId = null;
              modified = true;
            }
          }
        }

        if (modified) {
          db.prepare("UPDATE users SET onboarding_json = ? WHERE id = ?").run(
            JSON.stringify(onboardingData),
            targetUserId,
          );
        }
      }

      res.json(onboardingData);
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/users/onboarding", authenticateToken, (req: any, res: any) => {
    try {
      let targetUserId = req.user.id;
      if (req.user.role === "ADMIN" && req.body.targetUserId) {
        targetUserId = parseInt(req.body.targetUserId, 10);
      }
      db.prepare("UPDATE users SET onboarding_json = ? WHERE id = ?").run(
        JSON.stringify(req.body.data || req.body),
        targetUserId,
      );
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Staff (Users) APIs ---
  app.get(
    "/api/admin/staff-compliance",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const staffList = db
          .prepare(
            "SELECT id, first_name, last_name, email, onboarding_json FROM users WHERE role = 'STAFF'",
          )
          .all() as any[];
        const allFiles = db
          .prepare(
            "SELECT id, date_issued, date_expires, original_name FROM files",
          )
          .all() as any[];
        const filesMap = new Map(allFiles.map((f) => [f.id, f]));

        const result = staffList.map((staff) => {
          let onboardingData: any = {};
          try {
            onboardingData = staff.onboarding_json
              ? JSON.parse(staff.onboarding_json)
              : {};
          } catch (err) {
            onboardingData = {};
          }

          const compliance: Record<string, any> = {};
          const itemKeys = [
            "tfn_super",
            "ndis_screening",
            "wwcc",
            "vevo",
            "ahpra",
            "ndis_orientation",
            "cpr",
            "first_aid",
            "manual_handling",
            "driver_license",
            "car_insurance",
            "flu_shot",
            "immunisation",
            "covid_vaccine",
            "police_check",
          ];

          itemKeys.forEach((key) => {
            const step = onboardingData[key] || {};
            let status = "MISSING";
            let expiry: string | null = null;
            let issued: string | null = null;
            let fileName: string | null = null;

            const stepFiles = step.files || [];
            let fileId: number | null = null;
            if (stepFiles.length > 0) {
              const fInfo = stepFiles[0];
              fileId = fInfo.id || null;
              const fileMeta = filesMap.get(fInfo.id) as any;
              if (fileMeta) {
                expiry = fileMeta.date_expires || null;
                issued = fileMeta.date_issued || null;
                fileName = fileMeta.original_name || null;

                if (expiry) {
                  const expDate = new Date(expiry);
                  const today = new Date();
                  const diffTime = expDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays <= 0) {
                    status = "EXPIRED";
                  } else if (diffDays <= 90) {
                    status = "EXPIRING_SOON";
                  } else {
                    status = "VALID";
                  }
                } else {
                  status = "VALID";
                }
              }
            }

            compliance[key] = { status, expiry, issued, fileName, fileId };
          });

          return {
            id: staff.id,
            first_name: staff.first_name || staff.firstName || "",
            last_name: staff.last_name || staff.lastName || "",
            email: staff.email,
            compliance,
          };
        });

        res.json(result);
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/api/staff", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "ADMIN") {
      const staff = db
        .prepare(
          "SELECT id, first_name, last_name, role FROM users WHERE role = ?",
        )
        .all("STAFF");
      return res.json(staff);
    }
    const staff = db
      .prepare(
        "SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at FROM users",
      )
      .all();
    res.json(staff);
  });

  app.post("/api/staff", authenticateToken, requireAdmin, (req, res) => {
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
      address,
      dob,
      emergencyContactName,
      emergencyContactPhone,
      bankName,
      bankBsb,
      bankAcc,
      taxNumber,
      superFundName,
      superMemberNumber,
    } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const stmt = db.prepare(
        "INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const info = stmt.run(
        email,
        hash,
        role || "STAFF",
        firstName,
        lastName,
        phone,
        address,
        dob,
        emergencyContactName,
        emergencyContactPhone,
        bankName,
        bankBsb,
        bankAcc,
        taxNumber,
        superFundName,
        superMemberNumber,
      );
      res.json({
        id: info.lastInsertRowid,
        email,
        role,
        firstName,
        lastName,
        phone,
        address,
        dob,
        emergencyContactName,
        emergencyContactPhone,
        bankName,
        bankBsb,
        bankAcc,
        taxNumber,
        superFundName,
        superMemberNumber,
      });
    } catch (e: any) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  app.put("/api/staff/:id", authenticateToken, requireAdmin, (req, res) => {
    const {
      email,
      role,
      firstName,
      lastName,
      phone,
      address,
      dob,
      emergencyContactName,
      emergencyContactPhone,
      bankName,
      bankBsb,
      bankAcc,
      taxNumber,
      superFundName,
      superMemberNumber,
    } = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare(
        "UPDATE users SET email = ?, role = ?, first_name = ?, last_name = ?, phone = ?, address = ?, dob = ?, emergency_contact_name = ?, emergency_contact_phone = ?, bank_name = ?, bank_bsb = ?, bank_acc = ?, tax_number = ?, super_fund_name = ?, super_member_number = ? WHERE id = ?",
      );
      stmt.run(
        email,
        role,
        firstName,
        lastName,
        phone,
        address,
        dob,
        emergencyContactName,
        emergencyContactPhone,
        bankName,
        bankBsb,
        bankAcc,
        taxNumber,
        superFundName,
        superMemberNumber,
        id,
      );
      res.json({
        id,
        email,
        role,
        firstName,
        lastName,
        phone,
        address,
        dob,
        emergencyContactName,
        emergencyContactPhone,
        bankName,
        bankBsb,
        bankAcc,
        taxNumber,
        superFundName,
        superMemberNumber,
      });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put(
    "/api/staff/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      console.log(`Updating staff \${id} status to \${status}`);
      try {
        db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
        console.log(`Success`);
        res.json({ success: true, status });
      } catch (e: any) {
        console.error(`Error updating staff status:`, e);

        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete("/api/staff/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(
        "SUSPENDED",
        id,
      );
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Clients APIs ---
  app.get("/api/clients", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== "ADMIN") {
      const clients = db
        .prepare("SELECT id, first_name, last_name, address FROM clients")
        .all();
      return res.json(clients);
    }

    const clients = db
      .prepare(
        `
      SELECT clients.*, providers.company_name as provider_name 
      FROM clients 
      LEFT JOIN providers ON clients.provider_id = providers.id
    `,
      )
      .all();

    const clientServices = db.prepare("SELECT * FROM client_services").all();

    const clientsWithServices = (clients as any[]).map((c) => ({
      ...c,
      service_ids: clientServices
        .filter((cs: any) => cs.client_id === c.id)
        .map((cs: any) => cs.service_id),
    }));

    res.json(clientsWithServices);
  });

  app.get("/api/clients/:id", authenticateToken, (req: any, res: any) => {
    try {
      const client = db
        .prepare(
          `
        SELECT clients.*, providers.company_name as provider_name, providers.management_fee, providers.provider_type
        FROM clients 
        LEFT JOIN providers ON clients.provider_id = providers.id
        WHERE clients.id = ?
      `,
        )
        .get(req.params.id) as any;

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (req.user.role !== "ADMIN") {
        // Limited view for non-admins - includes fields necessary for progress notes clinical chart
        return res.json({
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          dob: client.dob,
          address: client.address,
          ndis_number: client.ndis_number,
          my_aged_care_id: client.my_aged_care_id,
          funding_type: client.funding_type,
          home_care_sub_type: client.home_care_sub_type || null,
          home_care_level_or_class: client.home_care_level_or_class || null,
          joined_date: client.joined_date || null,
          billing_tier: client.billing_tier || "SAH_Full_Pensioner",
          historical_monthly_cap: client.historical_monthly_cap || 0,
          assessed_independence_pct: client.assessed_independence_pct || 0,
          assessed_everyday_living_pct:
            client.assessed_everyday_living_pct || 0,
          ndis_agreement_start_date: client.ndis_agreement_start_date || null,
          ndis_agreement_end_date: client.ndis_agreement_end_date || null,
          ndis_agreement_budget: client.ndis_agreement_budget || 0,
        });
      }

      const activeBudget = db
        .prepare(
          `SELECT * FROM client_budgets WHERE client_id = ? AND status = 'ACTIVE' LIMIT 1`,
        )
        .get(client.id) as any;
      if (activeBudget) {
        client.historical_internal_consumptions =
          activeBudget.historical_internal_consumptions;
        client.spend_as_of_date = activeBudget.spend_as_of_date;
        client.starting_rollover_balance =
          activeBudget.starting_rollover_balance;
        client.rollover_spent_so_far = activeBudget.rollover_spent_so_far;
        client.cycle_start_date = activeBudget.cycle_start_date;
        client.cycle_end_date = activeBudget.cycle_end_date;
      }

      const clientServices = db
        .prepare("SELECT service_id FROM client_services WHERE client_id = ?")
        .all(req.params.id);

      res.json({
        ...client,
        service_ids: clientServices.map((cs: any) => cs.service_id),
      });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/clients", authenticateToken, requireAdmin, (req, res) => {
    try {
      const insertTransaction = db.transaction((reqBody) => {
        const {
          firstName,
          lastName,
          ndisNumber,
          carePlanDetails,
          contactEmail,
          contactPhone,
          providerId,
          dob,
          fundingType,
          myAgedCareId,
          address,
          representativeName,
          representativePhone,
          representativeEmail,
          serviceIds,
          homeCareSubType,
          homeCareLevelOrClass,
          joinedDate,
          careCoordinationFee,
          billingTier,
          historicalMonthlyCap,
          assessedIndependencePct,
          assessedEverydayLivingPct,
          ndisAgreementStartDate,
          ndisAgreementEndDate,
          ndisAgreementBudget,
        } = reqBody;

        const stmt = db.prepare(
          "INSERT INTO clients (first_name, last_name, ndis_number, care_plan_details, contact_email, contact_phone, provider_id, dob, funding_type, my_aged_care_id, address, representative_name, representative_phone, representative_email, home_care_sub_type, home_care_level_or_class, joined_date, care_coordination_fee, billing_tier, historical_monthly_cap, assessed_independence_pct, assessed_everyday_living_pct, ndis_agreement_start_date, ndis_agreement_end_date, ndis_agreement_budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        );
        const info = stmt.run(
          firstName,
          lastName,
          ndisNumber,
          carePlanDetails,
          contactEmail,
          contactPhone,
          providerId || null,
          dob || null,
          fundingType || null,
          myAgedCareId || null,
          address || null,
          representativeName || null,
          representativePhone || null,
          representativeEmail || null,
          homeCareSubType || null,
          homeCareLevelOrClass || null,
          joinedDate || null,
          careCoordinationFee !== undefined ? careCoordinationFee : 20.0,
          billingTier || "SAH_Full_Pensioner",
          historicalMonthlyCap !== undefined
            ? parseFloat(historicalMonthlyCap)
            : 0.0,
          assessedIndependencePct !== undefined
            ? parseFloat(assessedIndependencePct)
            : 0.0,
          assessedEverydayLivingPct !== undefined
            ? parseFloat(assessedEverydayLivingPct)
            : 0.0,
          ndisAgreementStartDate || null,
          ndisAgreementEndDate || null,
          ndisAgreementBudget !== undefined
            ? parseFloat(ndisAgreementBudget)
            : 0.0,
        );

        const clientId = info.lastInsertRowid;

        if (Array.isArray(serviceIds)) {
          const insertService = db.prepare(
            "INSERT INTO client_services (client_id, service_id) VALUES (?, ?)",
          );
          for (const serviceId of serviceIds) {
            insertService.run(clientId, serviceId);
          }
        }
        return clientId;
      });

      const clientId = insertTransaction(req.body);
      res.json({ id: clientId });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/clients/:id", authenticateToken, requireAdmin, (req, res) => {
    try {
      const updateTransaction = db.transaction((reqBody, paramId) => {
        const {
          firstName,
          lastName,
          ndisNumber,
          carePlanDetails,
          contactEmail,
          contactPhone,
          providerId,
          dob,
          fundingType,
          myAgedCareId,
          address,
          representativeName,
          representativePhone,
          representativeEmail,
          serviceIds,
          homeCareSubType,
          homeCareLevelOrClass,
          joinedDate,
          careCoordinationFee,
          billingTier,
          historicalMonthlyCap,
          assessedIndependencePct,
          assessedEverydayLivingPct,
          ndisAgreementStartDate,
          ndisAgreementEndDate,
          ndisAgreementBudget,
        } = reqBody;

        const stmt = db.prepare(
          "UPDATE clients SET first_name = ?, last_name = ?, ndis_number = ?, care_plan_details = ?, contact_email = ?, contact_phone = ?, provider_id = ?, dob = ?, funding_type = ?, my_aged_care_id = ?, address = ?, representative_name = ?, representative_phone = ?, representative_email = ?, home_care_sub_type = ?, home_care_level_or_class = ?, joined_date = ?, care_coordination_fee = ?, billing_tier = ?, historical_monthly_cap = ?, assessed_independence_pct = ?, assessed_everyday_living_pct = ?, ndis_agreement_start_date = ?, ndis_agreement_end_date = ?, ndis_agreement_budget = ? WHERE id = ?",
        );
        stmt.run(
          firstName,
          lastName,
          ndisNumber,
          carePlanDetails,
          contactEmail,
          contactPhone,
          providerId || null,
          dob || null,
          fundingType || null,
          myAgedCareId || null,
          address || null,
          representativeName || null,
          representativePhone || null,
          representativeEmail || null,
          homeCareSubType || null,
          homeCareLevelOrClass || null,
          joinedDate || null,
          careCoordinationFee !== undefined ? careCoordinationFee : 20.0,
          billingTier || "SAH_Full_Pensioner",
          historicalMonthlyCap !== undefined
            ? parseFloat(historicalMonthlyCap)
            : 0.0,
          assessedIndependencePct !== undefined
            ? parseFloat(assessedIndependencePct)
            : 0.0,
          assessedEverydayLivingPct !== undefined
            ? parseFloat(assessedEverydayLivingPct)
            : 0.0,
          ndisAgreementStartDate || null,
          ndisAgreementEndDate || null,
          ndisAgreementBudget !== undefined
            ? parseFloat(ndisAgreementBudget)
            : 0.0,
          paramId,
        );

        if (Array.isArray(serviceIds)) {
          db.prepare("DELETE FROM client_services WHERE client_id = ?").run(
            paramId,
          );
          const insertService = db.prepare(
            "INSERT INTO client_services (client_id, service_id) VALUES (?, ?)",
          );
          for (const serviceId of serviceIds) {
            insertService.run(paramId, serviceId);
          }
        }
      });

      updateTransaction(req.body, req.params.id);
      res.json({ id: req.params.id });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post(
    "/api/admin/rollover-budgets",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      try {
        const now = new Date();
        let count = 0;

        const activeBudgets = db
          .prepare(`SELECT * FROM client_budgets WHERE status = 'ACTIVE'`)
          .all() as any[];
        const fundingRates = db
          .prepare(`SELECT * FROM funding_rates`)
          .all() as any[];

        for (const budget of activeBudgets) {
          if (!budget.cycle_end_date || !budget.cycle_start_date) continue;

          const client = db
            .prepare(`SELECT * FROM clients WHERE id = ?`)
            .get(budget.client_id) as any;
          if (!client) continue;

          const cycleEndStr = budget.cycle_end_date;
          const cycleEnd = new Date(cycleEndStr);
          cycleEnd.setHours(23, 59, 59, 999);

          // Check if system date transitioned past the end date
          if (now.getTime() > cycleEnd.getTime()) {
            // Calculate daily rate
            let dailyRate = 0;
            if (
              client.funding_type === "HOME_CARE" ||
              client.funding_type === "Home Care"
            ) {
              const subType = client.home_care_sub_type || "HCP";
              const levelOrClass = client.home_care_level_or_class || "Level 1";
              const rateObj = fundingRates.find(
                (r: any) =>
                  r.type === subType && r.level_or_class === levelOrClass,
              );
              dailyRate = rateObj ? rateObj.daily_rate_cents / 100 : 0;
            }

            const msPerDay = 1000 * 60 * 60 * 24;
            const cycleStart = new Date(budget.cycle_start_date);
            const totalDays =
              Math.floor(
                (new Date(budget.cycle_end_date).getTime() -
                  cycleStart.getTime()) /
                  msPerDay,
              ) + 1;
            const baseCycleAllocation = totalDays * dailyRate;

            // Fetch Live Consumptions for this period
            const startFilter = `${budget.cycle_start_date}T00:00:00`;
            const endFilter = `${budget.cycle_end_date}T23:59:59`;
            const shifts = db
              .prepare(
                `SELECT id FROM shifts WHERE client_id = ? AND start_time >= ? AND start_time <= ? AND status NOT IN ('DRAFT', 'CANCELLED')`,
              )
              .all(client.id, startFilter, endFilter) as any[];
            const respiteBookings = db
              .prepare(
                `SELECT id FROM respite_bookings WHERE client_id = ? AND start_time >= ? AND start_time <= ? AND status NOT IN ('DRAFT', 'CANCELLED')`,
              )
              .all(client.id, startFilter, endFilter) as any[];

            let liveConsumptions = 0;
            const careCoordPercent =
              client.funding_type === "HOME_CARE" ||
              client.funding_type === "Home Care"
                ? (client.care_coordination_fee ?? 20)
                : 0;
            const managementFeePercent =
              client.funding_type === "HOME_CARE" ||
              client.funding_type === "Home Care"
                ? (client.management_fee ?? 0)
                : 0;

            const processLedgerItem = (amount: number) => {
              if (
                client.funding_type !== "HOME_CARE" &&
                client.funding_type !== "Home Care"
              )
                return amount;
              const coordinationFee = amount * (careCoordPercent / 100);
              const subtotal = amount + coordinationFee;
              const managementFee = subtotal * (managementFeePercent / 100);
              return amount + coordinationFee + managementFee;
            };

            for (const shiftRow of shifts) {
              try {
                const data = getInvoiceDataForShift(shiftRow.id);
                if (data && data.lineItems) {
                  data.lineItems.forEach((li: any) => {
                    liveConsumptions += processLedgerItem(li.amount);
                  });
                }
              } catch (e) {}
            }
            for (const respiteRow of respiteBookings) {
              try {
                const data = getInvoiceDataForRespiteBooking(respiteRow.id);
                if (data && data.lineItems) {
                  data.lineItems.forEach((li: any) => {
                    liveConsumptions += processLedgerItem(li.amount);
                  });
                }
              } catch (e) {}
            }

            const historicalInternal =
              budget.historical_internal_consumptions || 0;
            const totalCombinedSpent = historicalInternal + liveConsumptions;

            const remainingBalance = baseCycleAllocation - totalCombinedSpent;

            // EVALUATE ROLLOVER ELIGIBILITY (10% OR $1,000 REGULATORY RULE)
            const capThreshold = Math.max(1000, 0.1 * baseCycleAllocation);

            let newRolloverAmountForwarded = 0;
            if (remainingBalance > 0) {
              if (remainingBalance <= capThreshold) {
                newRolloverAmountForwarded = remainingBalance;
              } else {
                newRolloverAmountForwarded = capThreshold;
              }
            }

            const currentStartingRollover =
              budget.starting_rollover_balance || 0;
            const currentRolloverSpent = budget.rollover_spent_so_far || 0;
            const actualUnspentInPool =
              currentStartingRollover - currentRolloverSpent;

            let nextQuarterStartingRollover =
              Math.max(0, actualUnspentInPool) + newRolloverAmountForwarded;

            // 3. RESET AND INITIALIZE THE NEW QUARTER
            const currentYear = now.getFullYear();
            const quarters = [
              {
                start: new Date(currentYear, 0, 1),
                end: new Date(currentYear, 2, 31),
              },
              {
                start: new Date(currentYear, 3, 1),
                end: new Date(currentYear, 5, 30),
              },
              {
                start: new Date(currentYear, 6, 1),
                end: new Date(currentYear, 8, 30),
              },
              {
                start: new Date(currentYear, 9, 1),
                end: new Date(currentYear, 11, 31),
              },
            ];
            const nextQuarter =
              quarters.find((q) => now >= q.start && now <= q.end) ||
              quarters[0];

            // Database Archiving Protocol
            const updateStatus = db.prepare(
              `UPDATE client_budgets SET status = 'ARCHIVED', base_cycle_allocation = ?, closing_balance = ?, rollover_amount_forwarded = ? WHERE id = ?`,
            );
            const insertNew = db.prepare(`
              INSERT INTO client_budgets (
                client_id, cycle_start_date, cycle_end_date, historical_internal_consumptions, 
                spend_as_of_date, starting_rollover_balance, rollover_spent_so_far, status
              ) VALUES (?, ?, ?, 0, ?, ?, 0, 'ACTIVE')
           `);

            const tx = db.transaction(() => {
              updateStatus.run(
                baseCycleAllocation,
                remainingBalance,
                newRolloverAmountForwarded,
                budget.id,
              );
              insertNew.run(
                client.id,
                nextQuarter.start.toISOString().split("T")[0],
                nextQuarter.end.toISOString().split("T")[0],
                null, // spend_as_of_date
                nextQuarterStartingRollover,
              );
            });

            tx();
            count++;
          }
        }
        res.json({ success: true, message: `Rolled over ${count} budgets` });
      } catch (e: any) {
        logger.error(`API Error rolling over budgets: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/clients/:id/budget",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      const {
        other_providers_spent,
        historical_internal_consumptions,
        spend_as_of_date,
        cycle_start_date,
        cycle_end_date,
        starting_rollover_balance,
        rollover_spent_so_far,
      } = req.body;
      try {
        const activeBudget = db
          .prepare(
            `SELECT id FROM client_budgets WHERE client_id = ? AND status = 'ACTIVE' LIMIT 1`,
          )
          .get(id) as any;
        if (activeBudget) {
          db.prepare(
            `
          UPDATE client_budgets 
          SET historical_internal_consumptions = coalesce(?, historical_internal_consumptions), 
              spend_as_of_date = coalesce(?, spend_as_of_date), 
              cycle_start_date = coalesce(?, cycle_start_date), 
              cycle_end_date = coalesce(?, cycle_end_date),
              starting_rollover_balance = coalesce(?, starting_rollover_balance),
              rollover_spent_so_far = coalesce(?, rollover_spent_so_far)
          WHERE client_id = ? AND status = 'ACTIVE'
        `,
          ).run(
            historical_internal_consumptions,
            spend_as_of_date,
            cycle_start_date,
            cycle_end_date,
            starting_rollover_balance,
            rollover_spent_so_far,
            id,
          );
        } else {
          db.prepare(
            `
          INSERT INTO client_budgets (
            client_id, historical_internal_consumptions, spend_as_of_date, cycle_start_date, cycle_end_date, starting_rollover_balance, rollover_spent_so_far, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `,
          ).run(
            id,
            historical_internal_consumptions || 0,
            spend_as_of_date || null,
            cycle_start_date || null,
            cycle_end_date || null,
            starting_rollover_balance || 0,
            rollover_spent_so_far || 0,
          );
        }

        // Also update other_providers_spent on clients just to not break existing fields if they are strictly required
        db.prepare(
          `UPDATE clients SET other_providers_spent = ? WHERE id = ?`,
        ).run(other_providers_spent || 0, id);

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error updating client budget: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/api/clients/:id/budget-ledger", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    try {
      if (!startDate || !endDate) return res.json({ total: 0, items: [] });

      const client = db
        .prepare(
          `SELECT billing_tier, historical_monthly_cap FROM clients WHERE id = ?`,
        )
        .get(id) as any;
      const billingTier = client?.billing_tier || "SAH_Full_Pensioner";
      const historicalMonthlyCap = client?.historical_monthly_cap || 0;

      const startFilter = `${startDate}T00:00:00`;
      const endFilter = `${endDate}T23:59:59`;

      const shifts = db
        .prepare(
          `
        SELECT id FROM shifts 
        WHERE client_id = ? 
          AND start_time >= ? 
          AND start_time <= ?
          AND status NOT IN ('DRAFT', 'CANCELLED')
      `,
        )
        .all(id, startFilter, endFilter) as any[];

      const respiteBookings = db
        .prepare(
          `
        SELECT id FROM respite_bookings 
        WHERE client_id = ? 
          AND start_time >= ? 
          AND start_time <= ?
          AND status NOT IN ('DRAFT', 'CANCELLED')
      `,
        )
        .all(id, startFilter, endFilter) as any[];

      let total = 0;
      let items: any[] = [];

      const getCategoryOfService = (srvName: string, srvCode: string) => {
        let cat = "Independence";
        if (srvCode) {
          const lookup = db
            .prepare(
              "SELECT service_category FROM services WHERE code = ? OR id = ? LIMIT 1",
            )
            .get(srvCode, srvCode) as any;
          if (lookup?.service_category) cat = lookup.service_category;
        } else if (srvName) {
          const lookup = db
            .prepare(
              "SELECT service_category FROM services WHERE name = ? LIMIT 1",
            )
            .get(srvName) as any;
          if (lookup?.service_category) cat = lookup.service_category;
        }
        return cat;
      };

      for (const shiftRow of shifts) {
        try {
          const data = getInvoiceDataForShift(shiftRow.id);
          if (data && data.lineItems) {
            data.lineItems.forEach((li: any) => {
              const sCat = getCategoryOfService(li.serviceName, li.code);
              const splits = calculateBillingSplits(
                Number(id),
                li.date,
                li.amount,
                sCat,
              );
              total += li.amount; // subtotal amounts exclusively exclude GST
              items.push({
                date: li.date,
                service: li.serviceName,
                amount: li.amount,
                client_share: splits.clientShare,
                package_drawdown: splits.packageDrawdown,
                service_category: sCat,
              });
            });
          }
        } catch (e) {
          console.error(
            `Failed to process shift ${shiftRow.id} for budget:`,
            e,
          );
        }
      }

      for (const respiteRow of respiteBookings) {
        try {
          const data = getInvoiceDataForRespiteBooking(respiteRow.id);
          if (data && data.lineItems) {
            data.lineItems.forEach((li: any) => {
              const sCat = getCategoryOfService(li.serviceName, li.code);
              const splits = calculateBillingSplits(
                Number(id),
                li.date,
                li.amount,
                sCat,
              );
              total += li.amount; // subtotal amounts exclusively exclude GST
              items.push({
                date: li.date,
                service: li.serviceName,
                amount: li.amount,
                client_share: splits.clientShare,
                package_drawdown: splits.packageDrawdown,
                service_category: sCat,
              });
            });
          }
        } catch (e) {
          console.error(
            `Failed to process respite ${respiteRow.id} for budget:`,
            e,
          );
        }
      }

      // Fetch external ledger entries for this cycle/range
      const external = db
        .prepare(
          `
        SELECT * FROM client_ledger_entries 
        WHERE client_id = ? 
          AND date >= ? 
          AND date <= ?
      `,
        )
        .all(id, startDate, endDate) as any[];

      for (const entry of external) {
        let dateFormatted = entry.date;
        const parts = entry.date.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        let serviceCat = entry.service_category;
        if (!serviceCat) {
          serviceCat = getCategoryOfService(entry.service_name, "");
        }

        let cShare = entry.client_share;
        let pDrawdown = entry.package_drawdown;
        if (
          cShare === undefined ||
          cShare === null ||
          (entry.client_share === 0 &&
            entry.grand_total > 0 &&
            billingTier !== "Grandfathered")
        ) {
          const splits = calculateBillingSplits(
            Number(id),
            entry.date,
            entry.grand_total,
            serviceCat,
          );
          cShare = splits.clientShare;
          pDrawdown = splits.packageDrawdown;
        }

        total += entry.grand_total;
        items.push({
          id: entry.id,
          date: dateFormatted,
          service: entry.service_name,
          amount: entry.grand_total,
          base_amount: entry.base_amount,
          care_coord_fee: entry.care_coord_fee,
          management_fee: entry.management_fee,
          grand_total: entry.grand_total,
          source_type: "external",
          vendor_name: entry.vendor_name,
          client_share: cShare,
          package_drawdown: pDrawdown,
          service_category: serviceCat,
        });
      }

      items.sort((a, b) => {
        const parseStr = (s: string) => {
          const p = s.split("-");
          if (p.length === 3)
            return new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`).getTime();
          return new Date(s).getTime();
        };
        return parseStr(b.date) - parseStr(a.date);
      });

      res.json({
        total,
        items,
        billingTier,
        historicalMonthlyCap,
      });
    } catch (e: any) {
      logger.error(`API Error fetching budget ledger: ${e}`, {
        error: "Internal Server Error",
      });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/clients/:id/ndis-agreements", authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
      const agreementsQuery = db.prepare(
        `SELECT * FROM ndis_service_agreements WHERE client_id = ? ORDER BY start_date DESC`,
      );
      const agreementsResult = agreementsQuery.all(id) as any[];

      const results = agreementsResult.map((agr) => {
        const items = db
          .prepare(
            `
           SELECT nai.*, s.code as supportItemCode, s.name as supportItemName 
           FROM ndis_service_agreement_items nai
           LEFT JOIN services s ON nai.service_id = s.id
           WHERE nai.agreement_id = ?
         `,
          )
          .all(agr.id) as any[];

        const shifts = db
          .prepare(
            `
           SELECT id FROM shifts 
           WHERE client_id = ? 
             AND start_time >= ? 
             AND start_time <= ?
             AND status IN ('COMPLETED', 'PUBLISHED', 'IN_PROGRESS')
         `,
          )
          .all(
            id,
            `${agr.start_date}T00:00:00`,
            `${agr.end_date}T23:59:59`,
          ) as any[];

        const itemsMap = new Map();
        for (const item of items) {
          itemsMap.set(String(item.service_id), {
            service_id: item.service_id,
            supportItemCode: item.supportItemCode || String(item.service_id),
            supportItemName: item.supportItemName || "Unknown Service",
            allocatedHours: item.allocated_hours || 0,
            allocatedBudget: item.allocated_budget || 0,
            amountSpent: 0,
            deliveredHours: 0,
          });
        }

        let totalAmountSpent = 0;
        for (const shiftRow of shifts) {
          try {
            const data = getInvoiceDataForShift(shiftRow.id);
            if (data && data.lineItems) {
              data.lineItems.forEach((li: any) => {
                const sId = String(li.serviceId);
                if (itemsMap.has(sId)) {
                  const item = itemsMap.get(sId);
                  item.amountSpent += li.amount || 0;
                  if (li.unit === "H" || li.unit === "Hour") {
                    item.deliveredHours += li.qty || 0;
                  }
                  totalAmountSpent += li.amount || 0;
                }
              });
            }
          } catch (e) {}
        }

        return {
          id: agr.id,
          name: agr.name,
          totalAgreementValue: agr.total_budget,
          startDate: agr.start_date,
          endDate: agr.end_date,
          status: agr.status,
          totalClaimed: totalAmountSpent,
          totalRemainingBalance: agr.total_budget - totalAmountSpent,
          items: Array.from(itemsMap.values()).map((it) => ({
            ...it,
            remainingBalance: it.allocatedBudget - it.amountSpent,
          })),
        };
      });
      res.json(results);
    } catch (e: any) {
      logger.error(`API Error fetching NDIS agreements: ${e}`, {
        error: "Internal Server Error",
      });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put(
    "/api/clients/:id/ndis-agreements/:agrId",
    authenticateToken,
    (req, res) => {
      const { id, agrId } = req.params;
      const { name, startDate, endDate, items } = req.body;
      try {
        const totalBudget = items.reduce(
          (sum: number, it: any) => sum + (Number(it.allocatedBudget) || 0),
          0,
        );

        db.prepare(
          `UPDATE ndis_service_agreements SET name = ?, start_date = ?, end_date = ?, total_budget = ? WHERE id = ? AND client_id = ?`,
        ).run(name, startDate, endDate, totalBudget, agrId, id);

        // Delete existing items
        db.prepare(
          `DELETE FROM ndis_service_agreement_items WHERE agreement_id = ?`,
        ).run(agrId);

        // Insert new items
        const insertItem = db.prepare(
          `INSERT INTO ndis_service_agreement_items (agreement_id, service_id, allocated_budget) VALUES (?, ?, ?)`,
        );
        items.forEach((it: any) => {
          insertItem.run(agrId, it.service_id, it.allocatedBudget || 0);
        });

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error updating NDIS agreement: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/clients/:id/ndis-agreements/:agrId/status",
    authenticateToken,
    (req, res) => {
      const { id, agrId } = req.params;
      const { status } = req.body;
      try {
        db.prepare(
          `UPDATE ndis_service_agreements SET status = ? WHERE id = ? AND client_id = ?`,
        ).run(status, agrId, id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error updating NDIS agreement status: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/clients/:id/ndis-agreements/:agrId",
    authenticateToken,
    (req, res) => {
      const { id, agrId } = req.params;
      try {
        db.prepare(
          `DELETE FROM ndis_service_agreement_items WHERE agreement_id = ?`,
        ).run(agrId);
        db.prepare(
          `DELETE FROM ndis_service_agreements WHERE id = ? AND client_id = ?`,
        ).run(agrId, id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error deleting NDIS agreement: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/clients/:id/ndis-agreements",
    authenticateToken,
    (req, res) => {
      const { id } = req.params;
      const { name, startDate, endDate, items } = req.body;
      try {
        const totalBudget = items.reduce(
          (sum: number, it: any) => sum + (Number(it.allocatedBudget) || 0),
          0,
        );
        const result = db
          .prepare(
            `INSERT INTO ndis_service_agreements (client_id, name, start_date, end_date, total_budget) VALUES (?, ?, ?, ?, ?)`,
          )
          .run(id, name, startDate, endDate, totalBudget);
        const agrId = result.lastInsertRowid;

        const insertItem = db.prepare(
          `INSERT INTO ndis_service_agreement_items (agreement_id, service_id, allocated_budget) VALUES (?, ?, ?)`,
        );
        items.forEach((it: any) => {
          insertItem.run(agrId, it.service_id, it.allocatedBudget || 0);
        });

        res.json({ success: true, agreementId: agrId });
      } catch (e: any) {
        logger.error(`API Error saving NDIS agreement: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/clients/:id/ledger/external",
    authenticateToken,
    (req, res) => {
      const { id } = req.params;
      const { date, serviceName, vendorName, baseAmount, applyLoadings } =
        req.body;

      try {
        if (!date || !serviceName || baseAmount === undefined) {
          return res.status(400).json({
            error: "Missing required fields: date, serviceName, baseAmount",
          });
        }

        const client = db
          .prepare(
            `
        SELECT care_coordination_fee, billing_tier, historical_monthly_cap, 
               assessed_independence_pct, assessed_everyday_living_pct 
        FROM clients WHERE id = ?
      `,
          )
          .get(id) as any;

        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        const rawBase = parseFloat(baseAmount) || 0;
        let careCoordFee = 0;
        let managementFee = 0;
        let grandTotal = rawBase;

        if (applyLoadings) {
          const clientCareCoordRate = parseFloat(
            client.care_coordination_fee ?? 20,
          );
          careCoordFee = parseFloat(
            (rawBase * (clientCareCoordRate / 100)).toFixed(2),
          );
          const subtotal = rawBase + careCoordFee;
          managementFee = parseFloat((subtotal * 0.1).toFixed(2));
          grandTotal = parseFloat((subtotal + managementFee).toFixed(2));
        }

        const service = db
          .prepare(
            `
        SELECT service_category FROM services WHERE name = ? LIMIT 1
      `,
          )
          .get(serviceName) as any;
        const category = service?.service_category || "Independence";

        const splits = calculateBillingSplits(
          Number(id),
          date,
          grandTotal,
          category,
        );

        const info = db
          .prepare(
            `
        INSERT INTO client_ledger_entries (client_id, date, service_name, vendor_name, base_amount, care_coord_fee, management_fee, grand_total, source_type, apply_loadings, client_share, package_drawdown, service_category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'external', ?, ?, ?, ?)
      `,
          )
          .run(
            id,
            date,
            serviceName,
            vendorName || "",
            rawBase,
            careCoordFee,
            managementFee,
            grandTotal,
            applyLoadings ? 1 : 0,
            splits.clientShare,
            splits.packageDrawdown,
            category,
          );

        const parts = date.split("-");
        let dateFormatted = date;
        if (parts.length === 3 && parts[0].length === 4) {
          dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        const newEntry = {
          id: info.lastInsertRowid,
          date: dateFormatted,
          service: serviceName,
          amount: grandTotal,
          base_amount: rawBase,
          care_coord_fee: careCoordFee,
          management_fee: managementFee,
          grand_total: grandTotal,
          source_type: "external",
          vendor_name: vendorName || "",
          apply_loadings: applyLoadings ? 1 : 0,
          client_share: splits.clientShare,
          package_drawdown: splits.packageDrawdown,
          service_category: category,
        };

        res.status(201).json({ success: true, item: newEntry });
      } catch (e: any) {
        logger.error(`API Error adding external ledger entry: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/clients/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        db.prepare("UPDATE clients SET status = ? WHERE id = ?").run(
          status,
          id,
        );
        res.json({ success: true, status });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/clients/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      try {
        db.prepare("UPDATE clients SET status = ? WHERE id = ?").run(
          "SUSPENDED",
          id,
        );
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Providers APIs ---
  app.get("/api/providers", authenticateToken, requireAdmin, (req, res) => {
    const providers = db.prepare("SELECT * FROM providers").all();
    res.json(providers);
  });

  app.post("/api/providers", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
    } = req.body;
    try {
      const stmt = db.prepare(
        "INSERT INTO providers (company_name, contact_name, email, phone, address, provider_type, management_fee) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      const info = stmt.run(
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType || "NDIS",
        managementFee === undefined ? 10.0 : managementFee,
      );
      res.json({
        id: info.lastInsertRowid,
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType,
        managementFee,
      });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/providers/:id", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
    } = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare(
        "UPDATE providers SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, provider_type = ?, management_fee = ? WHERE id = ?",
      );
      stmt.run(
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType || "NDIS",
        managementFee === undefined ? 10.0 : managementFee,
        id,
      );
      res.json({
        id,
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType,
        managementFee,
      });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put(
    "/api/providers/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        db.prepare("UPDATE providers SET status = ? WHERE id = ?").run(
          status,
          id,
        );
        res.json({ success: true, status });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/providers/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      try {
        db.prepare("UPDATE providers SET status = ? WHERE id = ?").run(
          "SUSPENDED",
          id,
        );
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Respite Bookings APIs ---
  app.get(
    "/api/respite-bookings",
    authenticateTokenOrWallboard,
    (req: any, res: any) => {
      const isAdmin = req.user.role === "ADMIN";

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
      const placeholders = bookingIds.map(() => "?").join(",");

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
        shifts: childShifts.filter((s: any) => s.respite_booking_id === b.id),
      }));

      res.json(mappedBookings);
    },
  );

  app.get(
    "/api/respite-bookings/:id",
    authenticateToken,
    (req: any, res: any) => {
      const booking = db
        .prepare("SELECT * FROM respite_bookings WHERE id = ?")
        .get(req.params.id) as any;
      if (!booking) return res.status(404).json({ error: "Not found" });

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
    },
  );

  // Create Respite Booking
  app.post(
    "/api/respite-bookings",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { clientId, startTime, endTime, notes, servicesData } = req.body;

      try {
        const createRespite = db.transaction((services) => {
          const rbStmt = db.prepare(
            "INSERT INTO respite_bookings (client_id, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, ?)",
          );
          const rbInfo = rbStmt.run(
            clientId,
            startTime,
            endTime,
            "DRAFT",
            notes,
          );
          const bookingId = rbInfo.lastInsertRowid;

          const insertShift = db.prepare(
            "INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, respite_booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          );

          for (const service of services) {
            for (const staff of service.staffShifts) {
              insertShift.run(
                staff.staffId,
                clientId,
                service.serviceId,
                staff.startTime,
                staff.endTime,
                "DRAFT",
                notes,
                bookingId,
              );
            }
          }
          return bookingId;
        });
        const bookingId = createRespite(servicesData);
        res.json({ id: bookingId });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // Update Respite Booking
  app.put(
    "/api/respite-bookings/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const bookingId = req.params.id;
      const { clientId, startTime, endTime, notes, servicesData } = req.body;

      try {
        db.transaction((services) => {
          db.prepare(
            "UPDATE respite_bookings SET client_id = ?, start_time = ?, end_time = ?, notes = ? WHERE id = ?",
          ).run(clientId, startTime, endTime, notes, bookingId);

          // delete old child shifts
          db.prepare("DELETE FROM shifts WHERE respite_booking_id = ?").run(
            bookingId,
          );

          // create new
          const insertShift = db.prepare(
            "INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, respite_booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          );

          for (const service of services) {
            for (const staff of service.staffShifts) {
              insertShift.run(
                staff.staffId,
                clientId,
                service.serviceId,
                staff.startTime,
                staff.endTime,
                "DRAFT",
                notes,
                bookingId,
              );
            }
          }
        })(servicesData);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/respite-bookings/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const bookingId = req.params.id;
      const { status } = req.body;
      try {
        let childShiftIds: number[] = [];
        db.transaction(() => {
          const existing = db
            .prepare("SELECT status FROM respite_bookings WHERE id = ?")
            .get(bookingId) as any;
          if (
            existing &&
            existing.status !== status &&
            status === "COMPLETED"
          ) {
            childShiftIds = db
              .prepare("SELECT id FROM shifts WHERE respite_booking_id = ?")
              .all(bookingId)
              .map((s: any) => s.id);
          }
          db.prepare("UPDATE respite_bookings SET status = ? WHERE id = ?").run(
            status,
            bookingId,
          );
          db.prepare(
            "UPDATE shifts SET status = ? WHERE respite_booking_id = ?",
          ).run(status, bookingId);
        })();

        if (status === "COMPLETED") {
          for (const shiftId of childShiftIds) {
            generateInvoiceForShift(shiftId);
          }
        }

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/respite-bookings/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      try {
        db.transaction(() => {
          db.prepare("DELETE FROM shifts WHERE respite_booking_id = ?").run(
            req.params.id,
          );
          db.prepare("DELETE FROM respite_bookings WHERE id = ?").run(
            req.params.id,
          );
        })();
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Progress Notes API ---
  app.get(
    "/api/progress-notes/clients",
    authenticateToken,
    (req: any, res: any) => {
      try {
        if (req.user.role === "ADMIN") {
          const clients = db
            .prepare("SELECT id, first_name, last_name FROM clients")
            .all();
          return res.json(clients);
        } else {
          const clients = db
            .prepare(
              `
          SELECT DISTINCT c.id, c.first_name, c.last_name
          FROM clients c
          JOIN shifts s ON s.client_id = c.id
          WHERE s.staff_id = ? AND s.status IN ('COMPLETED', 'PUBLISHED', 'CANCELLED') AND s.notes IS NOT NULL AND s.notes != ''
        `,
            )
            .all(req.user.id);
          return res.json(clients);
        }
      } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/progress-notes/export",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r: any) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz = settingsMap.timezone || "Australia/Perth";
        const tz =
          typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;

        const formatYMDtoDMY = (ymd: string) =>
          ymd ? ymd.split("-").reverse().join("-") : "";
        const formatTz = (
          isoObj: string | null | undefined,
          fallbackObj: string,
        ) => {
          const target = isoObj || fallbackObj;
          if (!target) return { date: "N/A", time: "N/A" };
          try {
            const d = new Date(target);
            if (isNaN(d.getTime())) {
              return {
                date: formatYMDtoDMY(target.split("T")[0] || target),
                time: target.split("T")[1]?.substring(0, 5) || target,
              };
            }
            const formatter = new Intl.DateTimeFormat("en-CA", {
              timeZone: tz,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const parts = formatter.formatToParts(d);
            const getP = (t: string) =>
              parts.find((p) => p.type === t)?.value || "";
            const date = `${getP("day")}/${getP("month")}/${getP("year")}`;
            const time = `${getP("hour")}:${getP("minute")}`;
            return { date, time };
          } catch (e) {
            return { date: "N/A", time: "N/A" };
          }
        };

        const { clientId, startDate, endDate } = req.query;
        if (!clientId) {
          return res.status(400).json({ error: "Missing clientId" });
        }

        // Fetch client
        const clientQuery = `SELECT * FROM clients WHERE id = ?`;
        const client = db.prepare(clientQuery).get(clientId) as any;
        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        // Base query for shifts (progress notes)
        const params: any[] = [clientId];
        let dateFilter = "";
        if (startDate && startDate !== "undefined") {
          dateFilter += ` AND s.start_time >= ?`;
          params.push(`${startDate}T00:00:00.000Z`);
        }
        if (endDate && endDate !== "undefined") {
          dateFilter += ` AND s.start_time <= ?`;
          params.push(`${endDate}T23:59:59.999Z`);
        }

        const notes = db
          .prepare(
            `
        SELECT 
          s.id, s.start_time, s.end_time, s.actual_finish_time, s.notes, s.status,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          srv.name as service_name
        FROM shifts s
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN services srv ON s.service_id = srv.id
        WHERE s.client_id = ? AND s.status IN ('COMPLETED', 'PUBLISHED', 'CANCELLED') ${dateFilter}
        AND s.notes IS NOT NULL AND TRIM(s.notes) != ''
        ORDER BY s.start_time ASC
      `,
          )
          .all(...params) as any[];

        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 40, bottom: 20, left: 40, right: 40 },
        });
        let dateStr = "";
        if (
          startDate &&
          startDate !== "undefined" &&
          endDate &&
          endDate !== "undefined"
        ) {
          dateStr = `_${startDate}_to_${endDate}`;
        } else if (startDate && startDate !== "undefined") {
          dateStr = `_from_${startDate}`;
        } else if (endDate && endDate !== "undefined") {
          dateStr = `_until_${endDate}`;
        }
        const filename =
          `Progress_Notes_${(client.first_name || "").trim()}_${(client.last_name || "").trim()}${dateStr}.pdf`.replace(
            /[^a-zA-Z0-9_-]/g,
            "_",
          );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        const drawFormBorder = () => {
          const boxX = 40;
          const boxY = 40;
          const boxW = doc.page.width - 80;
          const headerH = 80;
          const colHeaderYOffset = 4.5;
          const colHeaderHeight = 24;
          const dataRowHeight = 24;

          // Calculate exact total height so there are no floating extra lines at the bottom
          const usedAboveRows = headerH + colHeaderYOffset + colHeaderHeight; // 105
          const maxRows = 27;
          const exactUsableH = usedAboveRows + maxRows * dataRowHeight;
          const maxH = boxY + exactUsableH;

          // Outer border around entire usable page area (excluding margin at bottom)
          doc.lineWidth(1).rect(boxX, boxY, boxW, exactUsableH).stroke();

          // Top header block separator
          doc.rect(boxX, boxY, boxW, headerH).stroke();

          // Left header box (PROGRESS NOTES)
          doc.rect(boxX, boxY, boxW * 0.55, headerH).stroke();
          doc.font("Helvetica-Bold").fontSize(24).fillColor("black");
          doc.text("PROGRESS NOTES", boxX, boxY + 28, {
            width: boxW * 0.55,
            align: "center",
          });

          // Right header box fields
          const rightBoxX = boxX + boxW * 0.55;
          const rightBoxW = boxW * 0.45;
          const rowH = headerH / 5;

          const safeRefNumber =
            client.ndis_number || client.my_aged_care_id || "";
          const formattedDOB = client.dob
            ? new Date(client.dob).toLocaleDateString("en-GB")
            : "";
          const safeAddress = (client.address || "")
            .replace(/\r?\n|\r/g, ", ")
            .trim();

          const fields = [
            { label: "LAST NAME", value: (client.last_name || "").trim() },
            { label: "GIVEN NAMES", value: (client.first_name || "").trim() },
            { label: "D.O.B", value: formattedDOB },
            { label: "ADDRESS", value: safeAddress },
            { label: "ID NO.", value: safeRefNumber },
          ];

          for (let i = 0; i < 5; i++) {
            const y = boxY + i * rowH;
            if (i > 0) {
              doc
                .moveTo(rightBoxX, y)
                .lineTo(rightBoxX + rightBoxW, y)
                .stroke();
            }
            doc.font("Helvetica-Bold").fontSize(8.5);
            doc.text(fields[i].label, rightBoxX + 5, y + 4.5, { width: 70 });

            doc.font("Helvetica").fontSize(9.5); // Increased further
            doc.text(fields[i].value, rightBoxX + 80, y + 3.5, {
              width: rightBoxW - 85,
              height: rowH - 4,
              lineBreak: false,
            });
          }

          // Separator before column headers
          const colHeaderY = boxY + headerH + colHeaderYOffset;
          // Draw a double line or thicker line
          doc
            .lineWidth(2)
            .moveTo(boxX, colHeaderY)
            .lineTo(boxX + boxW, colHeaderY)
            .stroke();
          doc.lineWidth(1); // reset

          // Column headers
          const headerStart = colHeaderY;
          const headerHeight = colHeaderHeight;
          const col1W = 120;
          const col2W = boxW - col1W;

          doc.rect(boxX, headerStart, boxW, headerHeight).stroke();
          doc.rect(boxX, headerStart, col1W, headerHeight).stroke(); // vertical separator

          doc.font("Helvetica-Bold").fontSize(8);
          doc.text("Date/Time", boxX, headerStart + 6, {
            width: col1W,
            align: "center",
          });
          doc
            .text(
              "Write entry in Black pen. ",
              boxX + col1W + 8,
              headerStart + 7,
              { continued: true },
            )
            .font("Helvetica-Oblique")
            .text(
              "Sign each entry, print name and designation after signature.",
            );

          return {
            boxX,
            boxY,
            boxW,
            colHeaderY: headerStart + headerHeight,
            col1W,
            col2W,
            maxH,
          };
        };

        let { boxX, boxW, col1W, col2W, colHeaderY, maxH } = drawFormBorder();
        let currentY = colHeaderY;

        let pageNum = 1;
        const drawFooter = () => {
          doc.font("Helvetica").fontSize(6).fillColor("gray");
          doc.text(`PAGE ${pageNum}`, 40, doc.page.height - 35);
          doc.text(
            "© COPYRIGHT HAPPY IN THE HOME PTY LTD / CR040 PROGRESS NOTES",
            0,
            doc.page.height - 35,
            { align: "right", width: doc.page.width - 40 },
          );
        };

        // Draw the background grid on the initial page
        const rowH = 24;
        let gridY = currentY;
        while (gridY < maxH - 1) {
          const remaining = maxH - gridY;
          const curRowH = remaining < rowH * 1.5 ? remaining : rowH;
          doc.rect(boxX, gridY, col1W, curRowH).stroke();
          doc.rect(boxX + col1W, gridY, col2W, curRowH).stroke();
          gridY += curRowH;
        }

        if (notes.length > 0) {
          notes.forEach((note, index) => {
            const tzData = formatTz(
              note.actual_finish_time || note.end_time,
              note.start_time,
            );
            const dateStr = tzData.date;
            const startTimeStr = tzData.time;

            const staffName =
              `${note.staff_first_name || ""} ${note.staff_last_name || ""}`.trim();
            const staffRole =
              note.staff_role === "ADMIN" ? "Administrator" : "Support Worker";

            doc.font("Helvetica").fontSize(9);
            const fontHeight = doc.currentLineHeight();
            const gap = Math.max(0, rowH - fontHeight);

            const sigText = `   ${staffName} (${staffRole})`;
            const cancelPrefix =
              note.status === "CANCELLED" ? "[SHIFT CANCELLED] " : "";
            const fullNoteString = `${cancelPrefix}${note.notes || ""}${sigText}`;

            // Calculate height using EXACT SAME math as frontend so pages match:
            const explicitLinesCount = fullNoteString.split("\n");
            let exactLinesCount = 0;
            explicitLinesCount.forEach((l) => {
              exactLinesCount += Math.max(1, Math.ceil(l.length / 90)); // matching React 90
            });
            const neededHeight = exactLinesCount * rowH;

            if (currentY + neededHeight > maxH) {
              drawFooter();
              doc.addPage();
              pageNum++;
              ({ boxX, boxW, col1W, col2W, colHeaderY, maxH } =
                drawFormBorder());
              currentY = colHeaderY;

              // Draw the background grid on the new page
              let newGridY = currentY;
              while (newGridY < maxH - 1) {
                const remaining = maxH - newGridY;
                const curRowH = remaining < rowH * 1.5 ? remaining : rowH;
                doc.rect(boxX, newGridY, col1W, curRowH).stroke();
                doc.rect(boxX + col1W, newGridY, col2W, curRowH).stroke();
                newGridY += curRowH;
              }
            }

            // Calculate exact start positions to vertically center text
            // Helvetica size 9 cap height is est 6-7px. Visually centering in 24px:
            const topPadding = 7.5;

            // Text drawing (no boxes or borders drawn here, already done!)
            // Date/Time
            doc.font("Helvetica-Bold").fontSize(8).fillColor("black");
            doc.text(
              `${dateStr} ${startTimeStr}`,
              boxX,
              currentY + topPadding,
              { align: "center", width: col1W },
            );

            // Note Text
            doc.font("Helvetica").fontSize(8.5).fillColor("black");

            doc.text(fullNoteString, boxX + col1W + 6, currentY + topPadding, {
              width: col2W - 12,
              height: neededHeight,
              lineGap: gap,
            });

            currentY += neededHeight;
          });
        }

        drawFooter();
        doc.end();
      } catch (e: any) {
        logger.error("Error generating PDF", {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/progress-notes/:clientId",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const { clientId } = req.params;
        const { startDate, endDate } = req.query;
        let query = `
        SELECT s.id, s.start_time, s.end_time, s.actual_finish_time, s.notes, s.status, s.service_id,
               c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
               u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
               srv.name as service_name, srv.type as service_type
        FROM shifts s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN services srv ON s.service_id = srv.id
        WHERE s.client_id = ? AND s.status IN ('COMPLETED', 'PUBLISHED', 'CANCELLED') AND s.notes IS NOT NULL AND s.notes != ''
      `;
        const params: any[] = [clientId];

        if (req.user.role !== "ADMIN") {
          query += ` AND s.staff_id = ?`;
          params.push(req.user.id);
        }

        if (startDate) {
          query += ` AND date(s.start_time) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          query += ` AND date(s.start_time) <= date(?)`;
          params.push(endDate);
        }

        query += ` ORDER BY s.start_time ASC`;

        const notes = db.prepare(query).all(...params);
        res.json(notes);
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Client Roster Templates APIs ---
  app.get(
    "/api/clients/:id/roster-templates/pdf",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const clientId = req.params.id;
        const templateName = req.query.templateName || "Default Template";
        const client = db
          .prepare("SELECT * FROM clients WHERE id = ?")
          .get(clientId) as any;
        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        const templates = db
          .prepare(
            `
        SELECT t.*, 
               u.first_name as staff_first_name, u.last_name as staff_last_name,
               srv.name as service_name
        FROM client_roster_templates t
        LEFT JOIN users u ON t.staff_id = u.id
        LEFT JOIN services srv ON t.service_id = srv.id
        WHERE t.client_id = ? AND (t.template_name = ? OR (? = 'Default Template' AND t.template_name IS NULL))
        ORDER BY t.day_of_week, t.start_time
      `,
          )
          .all(clientId, templateName, templateName) as any[];

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Roster_Templates_${client.first_name}_${client.last_name}.pdf"`,
        );

        const doc = new PDFDocument({
          margin: 20,
          size: "A4",
          layout: "landscape",
        });
        doc.pipe(res);

        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(`Roster Templates: ${client.first_name} ${client.last_name}`, {
            align: "center",
          });
        doc.moveDown(1);

        // We want Monday to Sunday order
        const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 1=Monday... 0=Sunday
        const DAY_NAMES = {
          1: "Monday",
          2: "Tuesday",
          3: "Wednesday",
          4: "Thursday",
          5: "Friday",
          6: "Saturday",
          0: "Sunday",
        };

        const templatesByDay: Record<number, any[]> = {
          0: [],
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
          6: [],
        };
        templates.forEach((t) => {
          templatesByDay[t.day_of_week].push(t);
        });

        const startY = doc.y;
        const colWidth = 110;
        const marginX = 20;
        const spacing = 5;

        DAYS_ORDER.forEach((dayIdx, i) => {
          const x = marginX + i * (colWidth + spacing);
          const dayTemplates = templatesByDay[dayIdx] || [];

          // Draw column header
          doc
            .roundedRect(x, startY, colWidth, 25, 4)
            .fillAndStroke("#f4f4f5", "#e4e4e7");
          doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(10);

          const headerText = `${DAY_NAMES[dayIdx]}  ${dayTemplates.length} SHIFT${dayTemplates.length !== 1 ? "S" : ""}`;
          doc.text(headerText, x + 5, startY + 7, {
            width: colWidth - 10,
            align: "left",
          });

          let currentY = startY + 30;

          // Draw cards
          dayTemplates.forEach((t) => {
            // Basic calculations for card height
            let servicesText = t.service_name || "";
            if (t.services_json) {
              try {
                const parsed = JSON.parse(t.services_json);
                if (parsed.length > 0) {
                  servicesText = `${parsed.length} service(s)`;
                  // If we want more detail, we could read it here
                }
              } catch (e) {}
            }

            const cardHeight = 70;

            // Background
            doc
              .roundedRect(x, currentY, colWidth, cardHeight, 4)
              .fillAndStroke("#ffffff", "#e4e4e7");

            // Time
            doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(10);
            doc.text(`${t.start_time} - ${t.end_time}`, x + 5, currentY + 5);

            // Staff
            const staffName = t.staff_first_name
              ? `${t.staff_first_name} ${t.staff_last_name}`
              : "Unassigned";
            // Tag for staff
            doc
              .roundedRect(x + 5, currentY + 20, colWidth - 10, 14, 2)
              .fillAndStroke("#f4f4f5", "#e4e4e7");
            doc.fillColor("#52525b").font("Helvetica").fontSize(8);
            doc.text(staffName, x + 7, currentY + 23, {
              width: colWidth - 14,
              ellipsis: true,
            });

            // Service
            // Tiny bullet point
            doc.circle(x + 8, currentY + 45, 2).fill("#3b82f6");
            doc.fillColor("#18181b").font("Helvetica").fontSize(9);
            doc.text(servicesText, x + 13, currentY + 42, {
              width: colWidth - 18,
              height: 24,
              ellipsis: true,
            });

            currentY += cardHeight + 5;
          });
        });

        doc.end();
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/clients/:id/roster-templates",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const templates = db
          .prepare(
            `
        SELECT t.*, 
               u.first_name as staff_first_name, u.last_name as staff_last_name,
               srv.name as service_name
        FROM client_roster_templates t
        LEFT JOIN users u ON t.staff_id = u.id
        LEFT JOIN services srv ON t.service_id = srv.id
        WHERE t.client_id = ?
        ORDER BY t.day_of_week, t.start_time
      `,
          )
          .all(req.params.id);

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
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/clients/:id/roster-templates",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const {
          daysOfWeek = [],
          dayOfWeek,
          startTime,
          endTime,
          staffId,
          servicesData,
          templateName = "Default Template"
        } = req.body;
        const stmt = db.prepare(`
        INSERT INTO client_roster_templates (client_id, day_of_week, start_time, end_time, staff_id, services_json, template_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
        const daysToIterate =
          Array.isArray(daysOfWeek) && daysOfWeek.length > 0
            ? daysOfWeek
            : [dayOfWeek];

        db.transaction(() => {
          for (const day of daysToIterate) {
            if (day !== undefined && day !== null) {
              stmt.run(
                req.params.id,
                day,
                startTime,
                endTime,
                staffId || null,
                JSON.stringify(servicesData || []),
                templateName
              );
            }
          }
        })();
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/client-roster-templates/:id",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const {
          dayOfWeek,
          startTime,
          endTime,
          staffId,
          servicesData,
        } = req.body;
        db.prepare(`
          UPDATE client_roster_templates 
          SET day_of_week = ?, start_time = ?, end_time = ?, staff_id = ?, services_json = ?
          WHERE id = ?
        `).run(
          dayOfWeek,
          startTime,
          endTime,
          staffId || null,
          JSON.stringify(servicesData || []),
          req.params.id
        );
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/clients/:id/roster-templates/rename",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const { oldName, newName } = req.body;
        if (!oldName || !newName) return res.status(400).json({ error: "Missing names" });
        db.prepare(
          "UPDATE client_roster_templates SET template_name = ? WHERE client_id = ? AND template_name = ?",
        ).run(newName, req.params.id, oldName);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/clients/:id/roster-templates/clear",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const { templateName = "Default Template" } = req.query;
        db.prepare(
          "DELETE FROM client_roster_templates WHERE client_id = ? AND template_name = ?",
        ).run(req.params.id, templateName);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/client-roster-templates/:id",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        db.prepare("DELETE FROM client_roster_templates WHERE id = ?").run(
          req.params.id,
        );
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  function getUtcTimeFromLocal(
    dateStr: string,
    timeStr: string,
    timeZone: string,
  ) {
    const localIso = `${dateStr}T${timeStr}:00`;
    let d = new Date(`${localIso}Z`);

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    function getOffsetAt(dateObj: Date) {
      const parts = formatter.formatToParts(dateObj);
      const p: any = {};
      parts.forEach((part) => (p[part.type] = part.value));
      let h = parseInt(p.hour, 10);
      if (h === 24) h = 0;
      const formattedLocalAsUtc = Date.UTC(
        p.year,
        parseInt(p.month, 10) - 1,
        p.day,
        h,
        p.minute,
        p.second,
      );
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
  app.post(
    "/api/clients/:id/generate-roster",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      try {
        const { startDate, endDate, overwriteConflicts, dryRun, templateName = "Default Template", clearExisting = false, frequency = "Weekly" } = req.body;
        const clientId = req.params.id;

        if (!startDate || !endDate)
          return res
            .status(400)
            .json({ error: "startDate and endDate required" });

        const start = new Date(startDate + "T00:00:00Z");
        const end = new Date(endDate + "T00:00:00Z");

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ error: "Invalid date format" });
        }

        if (start > end) {
          return res
            .status(400)
            .json({ error: "Start date must be before or equal to end date" });
        }

        // Cap at 12 months for safety
        const msIn12Months = 366 * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > msIn12Months) {
          return res
            .status(400)
            .json({ error: "Date range cannot exceed 12 months." });
        }

        const templates = db
          .prepare("SELECT * FROM client_roster_templates WHERE client_id = ? AND template_name = ?")
          .all(clientId, templateName) as any[];
        if (!templates.length)
          return res
            .status(400)
            .json({ error: "No templates found for this client." });

        let validMondays: Set<string> | null = null;
        if (frequency && frequency !== "Weekly") {
          validMondays = new Set<string>();
          const startDt = new Date(startDate + "T12:00:00Z");
          
          const getMondayStr = (d: Date) => {
            const dCopy = new Date(d.getTime());
            const day = dCopy.getUTCDay();
            const diff = dCopy.getUTCDate() - day + (day === 0 ? -6 : 1);
            dCopy.setUTCDate(diff);
            return dCopy.toISOString().split("T")[0];
          };

          if (frequency === "Fortnightly") {
            let curr = new Date(getMondayStr(startDt) + "T12:00:00Z");
            const endDt = new Date(endDate + "T12:00:00Z");
            while (curr <= endDt || curr.getTime() <= startDt.getTime() + 14 * 86400000) {
              validMondays.add(curr.toISOString().split("T")[0]);
              curr.setUTCDate(curr.getUTCDate() + 14);
            }
          } else if (frequency === "3 Weekly") {
            let curr = new Date(getMondayStr(startDt) + "T12:00:00Z");
            const endDt = new Date(endDate + "T12:00:00Z");
            while (curr <= endDt || curr.getTime() <= startDt.getTime() + 21 * 86400000) {
              validMondays.add(curr.toISOString().split("T")[0]);
              curr.setUTCDate(curr.getUTCDate() + 21);
            }
          } else if (frequency.endsWith("Monthly")) {
            const months = parseInt(frequency.split(" ")[0]) || 1;
            let curr = new Date(startDt.getTime());
            const endDt = new Date(endDate + "T12:00:00Z");
            while (curr <= endDt || curr.getTime() <= startDt.getTime() + 31 * 86400000) {
              validMondays.add(getMondayStr(curr));
              curr.setUTCMonth(curr.getUTCMonth() + months);
            }
          }
        }

        const clientRow = db
          .prepare("SELECT funding_type FROM clients WHERE id = ?")
          .get(clientId) as any;
        const fundingType = clientRow?.funding_type || "NDIS";

        const shiftsCreated = [];
        const conflicts: any[] = [];
        const clientConflicts: any[] = [];
        let existingShiftsCount = 0;
        let existingClientShifts: any[] = [];

        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz3 = settingsMap.timezone || "Australia/Perth";
        const timezone =
          typeof rawTz3 === "string" ? rawTz3.replace(/['"]+/g, "") : rawTz3;

        if (dryRun && clearExisting) {
          const existingRows = db
            .prepare(
              `SELECT * FROM shifts WHERE client_id = ? AND start_time >= ? AND start_time < ? AND status NOT IN ('COMPLETED', 'IN_PROGRESS') ORDER BY start_time ASC`,
            )
            .all(
              clientId,
              start.toISOString(),
              new Date(end.getTime() + 86400000).toISOString(),
            ) as any[];
          existingShiftsCount = existingRows.length;
          existingClientShifts = existingRows.map((r: any) => {
             const startDate = new Date(r.start_time);
             const endDate = new Date(r.end_time);
             const dateParts = r.start_time.split("T")[0].split("-");
             const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : r.start_time.split("T")[0];
             return {
               id: r.id,
               date: formattedDate,
               startTime: startDate.toLocaleTimeString(['en-AU', 'en-US'], { hour: '2-digit', minute: '2-digit', timeZone: timezone }),
               endTime: endDate.toLocaleTimeString(['en-AU', 'en-US'], { hour: '2-digit', minute: '2-digit', timeZone: timezone }),
               status: r.status
             };
          });
        }

        const dateFormatterAPI = getSafeDateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const hd = new Holidays("AU", settingsMap.state || "WA");

        let generatedBatchId: string | null = null;
        if (!dryRun) {
          const crypto = require("crypto");
          generatedBatchId = crypto.randomUUID();
        }

        const affectedStaffDates = new Set<string>();

        db.transaction(() => {
          if (!dryRun && overwriteConflicts === "all" && clearExisting) {
            db.prepare(
              `DELETE FROM shifts WHERE client_id = ? AND start_time >= ? AND start_time < ? AND status NOT IN ('COMPLETED', 'IN_PROGRESS')`,
            ).run(
              clientId,
              start.toISOString(),
              new Date(end.getTime() + 86400000).toISOString(),
            );
          }

          let currentDt = new Date(`${startDate}T12:00:00Z`);
          let endDt = new Date(`${endDate}T12:00:00Z`);
          
          const masterPl = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1 LIMIT 1").get() as any;

          // Loop through dates
          for (
            let dt = new Date(currentDt);
            dt <= endDt;
            dt.setUTCDate(dt.getUTCDate() + 1)
          ) {
            if (validMondays) {
              const dCopy = new Date(dt.getTime());
              const day = dCopy.getUTCDay();
              const diff = dCopy.getUTCDate() - day + (day === 0 ? -6 : 1);
              dCopy.setUTCDate(diff);
              const weekMondayStr = dCopy.toISOString().split("T")[0];
              if (!validMondays.has(weekMondayStr)) {
                continue;
              }
            }

            const shiftDateStr = dt.toISOString().split("T")[0];
            const localNoon = new Date(`${shiftDateStr}T12:00:00Z`);
            const dayOfWeek = localNoon.getUTCDay(); // 0 is Sunday, 6 is Saturday

            const todaysTemplates = templates.filter(
              (t) => t.day_of_week === dayOfWeek,
            );

            for (const tmpl of todaysTemplates) {
              // Create timestamps
              const startDateTime = getUtcTimeFromLocal(
                shiftDateStr,
                tmpl.start_time,
                timezone,
              );
              const endDateTime = getUtcTimeFromLocal(
                shiftDateStr,
                tmpl.end_time,
                timezone,
              );

              // No need to check client conflicts since they are wiped if overwriteConflicts === 'all'
              // We just push dummy if dryRun so UI knows there are templates processed, but actually we use existingShiftsCount now.
              if (dryRun && existingShiftsCount > 0) {
                clientConflicts.push({ existing: [] }); // Dummy to trigger UI confirmation
              }
              if (!dryRun && overwriteConflicts !== "all") {
                // If they didn't approve wipe, we shouldn't continue, but just for safety.
              }

              const overlapCheckSql = clearExisting
                ? `SELECT id FROM shifts WHERE client_id = ? AND status IN ('COMPLETED', 'IN_PROGRESS') AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))`
                : `SELECT id FROM shifts WHERE client_id = ? AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))`;

              const clientPreservedConflict = db
                .prepare(overlapCheckSql)
                .get(
                  clientId,
                  endDateTime.toISOString(),
                  startDateTime.toISOString(),
                  endDateTime.toISOString(),
                  startDateTime.toISOString(),
                  startDateTime.toISOString(),
                  endDateTime.toISOString(),
                );

              if (clientPreservedConflict) {
                continue; // Skip creating this template shift because it's already fulfilled by a preserved shift
              }

              // Check conflicts for preferred staff
              let assignedStaffId = tmpl.staff_id;
              if (assignedStaffId) {
                const conflict = db
                  .prepare(
                    `
                SELECT id, start_time, end_time, client_id FROM shifts 
                WHERE staff_id = ? 
                AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
                LIMIT 1
              `,
                  )
                  .get(
                    assignedStaffId,
                    endDateTime.toISOString(),
                    startDateTime.toISOString(),
                    endDateTime.toISOString(),
                    startDateTime.toISOString(),
                    startDateTime.toISOString(),
                    endDateTime.toISOString(),
                  ) as any;

                if (conflict) {
                  const userRow = db
                    .prepare(
                      "SELECT first_name, last_name FROM users WHERE id = ?",
                    )
                    .get(assignedStaffId) as any;
                  const staffName = userRow
                    ? `${userRow.first_name} ${userRow.last_name}`
                    : `Staff ID ${assignedStaffId}`;

                  const cRow = conflict.client_id ? db.prepare('SELECT first_name, last_name FROM clients WHERE id = ?').get(conflict.client_id) as any : null;
                  const cName = cRow ? `${cRow.first_name} ${cRow.last_name}` : 'Unknown Client';
                  const cStart = new Date(conflict.start_time);
                  const cEnd = new Date(conflict.end_time);

                  const parts = shiftDateStr.split('-');
                  const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

                  conflicts.push({
                    date: formattedDate,
                    startTime: tmpl.start_time,
                    endTime: tmpl.end_time,
                    message: `${staffName} is already booked with ${cName} (${cStart.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})} - ${cEnd.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})}).`,
                  });
                  assignedStaffId = null; // Unassigned
                }
              }

              if (dryRun) continue; // Do not INSERT if dry run

              let servicesData = [];
              let isAbtApproved = false;

              const localDateStr = dateFormatterAPI.format(startDateTime);
              const isPublicHoliday = hd
                .getHolidays(startDateTime.getFullYear())
                .some(
                  (h: any) =>
                    h.type === "public" && h.date.startsWith(localDateStr),
                );

              if (tmpl.services_json) {
                try {
                  servicesData = JSON.parse(tmpl.services_json);
                  for (let sData of servicesData) {
                    if (sData.serviceId && !sData.isCustom && !String(sData.serviceId).startsWith("custom-")) {
                      if (masterPl && masterPl.effective_date && shiftDateStr < masterPl.effective_date.split('T')[0]) {
                        const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(sData.serviceId) as any;
                        if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                          const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                          if (historicalSrv) {
                            sData.serviceId = historicalSrv.id;
                          }
                        }
                      }
                    }
                    const srv = db
                      .prepare(
                        "SELECT type, rates_json, name FROM services WHERE id = ?",
                      )
                      .get(sData.serviceId) as any;
                    if (srv) {
                      if (
                        srv.name
                          .toLowerCase()
                          .includes("activity based transport")
                      ) {
                        isAbtApproved = true;
                        sData.qtyOverride = 0;
                      }
                      const histData = getHistoricalServiceData(db, srv, startDateTime.toISOString());
                    }
                  }
                } catch (e: any) {
                  logger.warn("JSON Parse Error:", e.message);
                }
              } else if (tmpl.service_id) {
                servicesData = [{ serviceId: tmpl.service_id }];
                if (servicesData[0].serviceId) {
                  if (masterPl && masterPl.effective_date && shiftDateStr < masterPl.effective_date.split('T')[0]) {
                    const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(servicesData[0].serviceId) as any;
                    if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                      const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                      if (historicalSrv) {
                        servicesData[0].serviceId = historicalSrv.id;
                      }
                    }
                  }
                }
                const srv = db
                  .prepare(
                    "SELECT type, rates_json, name FROM services WHERE id = ?",
                  )
                  .get(servicesData[0].serviceId) as any;
                if (srv) {
                  if (
                    srv.name.toLowerCase().includes("activity based transport")
                  ) {
                    isAbtApproved = true;
                    servicesData[0].qtyOverride = 0;
                  }                  const histData = getHistoricalServiceData(db, srv, tmpl.start_time || tmpl.start || startDateTime.toISOString());
                }
              }
              let mainServiceId = null;
              if (servicesData.length > 0)
                mainServiceId = servicesData[0].serviceId;

              const stmt = db.prepare(`
              INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, status, batch_id, funding_type, is_abt_approved)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
              const shiftInfo = stmt.run(
                clientId,
                assignedStaffId,
                mainServiceId,
                JSON.stringify(servicesData),
                startDateTime.toISOString(),
                endDateTime.toISOString(),
                "DRAFT", // Always set generated shifts to DRAFT so they can be reviewed
                generatedBatchId,
                fundingType,
                isAbtApproved ? 1 : 0,
              );
              shiftsCreated.push(shiftInfo.lastInsertRowid);
              if (assignedStaffId) {
                affectedStaffDates.add(`${assignedStaffId}|${shiftDateStr}`);
              }
            }
          }

          if (!dryRun && shiftsCreated.length > 0 && generatedBatchId) {
            db.prepare(
              `
            INSERT INTO roster_builds (id, client_id, shift_count, date_range_start, date_range_end)
            VALUES (?, ?, ?, ?, ?)
          `,
            ).run(
              generatedBatchId,
              clientId,
              shiftsCreated.length,
              start.toISOString().split("T")[0],
              end.toISOString().split("T")[0],
            );
          }

          // If dryRun, we can rollback just in case, but no INSERT or DELETE was made
          if (dryRun) {
            // Throw error to rollback anything, but we already didn't modify
          }
        })();

        if (!dryRun && affectedStaffDates.size > 0) {
          console.log(
            `[DEBUG TRIGGER] Running template sweep for ${affectedStaffDates.size} unique staff-date combinations.`,
          );
          for (const sd of affectedStaffDates) {
            const [staffId, shiftDateStr] = sd.split("|");
            await recalculateDayTravelForStaff(Number(staffId), shiftDateStr);
          }
        }

        res.json({
          success: true,
          createdCount: shiftsCreated.length,
          conflicts,
          clientConflicts,
          existingShiftsCount,
          existingClientShifts,
          dryRun,
        });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // Get Builds history
  app.get(
    "/api/clients/:id/roster-builds",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const builds = db
          .prepare(
            "SELECT * FROM roster_builds WHERE client_id = ? ORDER BY created_at DESC",
          )
          .all(req.params.id);
        res.json(builds);
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // Get shifts by batch id
  app.get(
    "/api/roster/builds/:batchId/shifts",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const shifts = db
          .prepare(
            `
        SELECT s.id, s.start_time, s.end_time, 
               u.first_name as staff_first_name, u.last_name as staff_last_name, 
               svc.name as service_name
        FROM shifts s
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN services svc ON s.service_id = svc.id
        WHERE s.batch_id = ?
        ORDER BY s.start_time ASC
      `,
          )
          .all(req.params.batchId);

        // Add a formatted date from start_time
        const formattedShifts = shifts.map((s: any) => {
          const utcDate = s.start_time ? new Date(s.start_time) : new Date();
          const dateStr = utcDate.toISOString().split("T")[0];
          return {
            ...s,
            date: dateStr,
          };
        });

        res.json(formattedShifts);
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // Revert Build (Delete by batchId)
  app.delete(
    "/api/roster/builds/:batchId",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        let deletedCount = 0;
        db.transaction(() => {
          const result = db
            .prepare(
              "DELETE FROM shifts WHERE batch_id = ? AND status != 'COMPLETED'",
            )
            .run(req.params.batchId);
          deletedCount = result.changes;
          db.prepare("DELETE FROM roster_builds WHERE id = ?").run(
            req.params.batchId,
          );
        })();
        res.json({ success: true, deletedCount });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/clients/:id/resolve-roster-conflicts",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      try {
        const { shiftsToOverwrite } = req.body;
        const clientId = req.params.id;

        if (!shiftsToOverwrite || !Array.isArray(shiftsToOverwrite)) {
          return res
            .status(400)
            .json({ error: "shiftsToOverwrite array required" });
        }

        const templates = db
          .prepare("SELECT * FROM client_roster_templates WHERE client_id = ?")
          .all(clientId) as any[];
        const templatesMap = new Map(templates.map((t) => [t.id, t]));

        const shiftsCreated = [];
        const conflicts = [];

        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz4 = settingsMap.timezone || "Australia/Perth";
        const timezone =
          typeof rawTz4 === "string" ? rawTz4.replace(/['"]+/g, "") : rawTz4;

        const dateFormatterAPI = getSafeDateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const hd = new Holidays("AU", settingsMap.state || "WA");

        const clientRow = db
          .prepare("SELECT funding_type FROM clients WHERE id = ?")
          .get(clientId) as any;
        const fundingType = clientRow?.funding_type || "NDIS";

        const affectedStaffDates = new Set<string>();

        db.transaction(() => {
          for (const item of shiftsToOverwrite) {
            const tmpl = templatesMap.get(item.templateId);
            if (!tmpl) continue;

            const shiftDateStr = item.date;
            const startDateTime = getUtcTimeFromLocal(
              shiftDateStr,
              tmpl.start_time,
              timezone,
            );
            const endDateTime = getUtcTimeFromLocal(
              shiftDateStr,
              tmpl.end_time,
              timezone,
            );

            // Delete existing client shifts at this time
            const oldShifts = db
              .prepare(
                `
            SELECT id FROM shifts 
            WHERE client_id = ? 
            AND status NOT IN ('COMPLETED', 'IN_PROGRESS')
            AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
          `,
              )
              .all(
                clientId,
                endDateTime.toISOString(),
                startDateTime.toISOString(),
                endDateTime.toISOString(),
                startDateTime.toISOString(),
                startDateTime.toISOString(),
                endDateTime.toISOString(),
              ) as any[];

            for (const oldShift of oldShifts) {
              db.prepare("DELETE FROM shifts WHERE id = ?").run(oldShift.id);
            }

            // Check if there is an overlapping COMPLETED or IN_PROGRESS shift for this client
            const clientPreservedConflict = db
              .prepare(
                `
            SELECT id FROM shifts 
            WHERE client_id = ? 
            AND status IN ('COMPLETED', 'IN_PROGRESS')
            AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
          `,
              )
              .get(
                clientId,
                endDateTime.toISOString(),
                startDateTime.toISOString(),
                endDateTime.toISOString(),
                startDateTime.toISOString(),
                startDateTime.toISOString(),
                endDateTime.toISOString(),
              );

            if (clientPreservedConflict) {
              continue; // Skip creating this template shift because it's already fulfilled by a preserved shift
            }

            // Check conflicts for preferred staff
            let assignedStaffId = tmpl.staff_id;
            if (assignedStaffId) {
              const conflict = db
                .prepare(
                  `
              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? 
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
              LIMIT 1
            `,
                )
                .get(
                  assignedStaffId,
                  endDateTime.toISOString(),
                  startDateTime.toISOString(),
                  endDateTime.toISOString(),
                  startDateTime.toISOString(),
                  startDateTime.toISOString(),
                  endDateTime.toISOString(),
                ) as any;

              if (conflict) {
                const userRow = db
                  .prepare(
                    "SELECT first_name, last_name FROM users WHERE id = ?",
                  )
                  .get(assignedStaffId) as any;
                const staffName = userRow
                  ? `${userRow.first_name} ${userRow.last_name}`
                  : `Staff ID ${assignedStaffId}`;

                const cRow = conflict.client_id ? db.prepare('SELECT first_name, last_name FROM clients WHERE id = ?').get(conflict.client_id) as any : null;
                const cName = cRow ? `${cRow.first_name} ${cRow.last_name}` : 'Unknown Client';
                const cStart = new Date(conflict.start_time);
                const cEnd = new Date(conflict.end_time);

                const parts = shiftDateStr.split('-');
                const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

                conflicts.push({
                  date: formattedDate,
                  startTime: tmpl.start_time,
                  endTime: tmpl.end_time,
                  message: `${staffName} is already booked with ${cName} (${cStart.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})} - ${cEnd.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})}).`,
                });
                assignedStaffId = null; // Unassigned
              }
            }

            const localNoon = new Date(`${shiftDateStr}T12:00:00Z`);
            const dayOfWeek = localNoon.getUTCDay(); // 0 is Sunday, 6 is Saturday

            let servicesData = [];
            let isAbtApproved = false;

            const localDateStr = dateFormatterAPI.format(startDateTime);
            const isPublicHoliday = hd
              .getHolidays(startDateTime.getFullYear())
              .some(
                (h: any) =>
                  h.type === "public" && h.date.startsWith(localDateStr),
              );

            if (tmpl.services_json) {
              try {
                servicesData = JSON.parse(tmpl.services_json);
                for (const sData of servicesData) {
                  const srv = db
                    .prepare(
                      "SELECT type, rates_json, name FROM services WHERE id = ?",
                    )
                    .get(sData.serviceId) as any;
                  if (srv) {
                    if (
                      srv.name
                        .toLowerCase()
                        .includes("activity based transport")
                    ) {
                      isAbtApproved = true;
                      sData.qtyOverride = 0;
                    }
                    const histData = getHistoricalServiceData(db, srv, tmpl.start_time || tmpl.start || startDateTime.toISOString());
                  }
                }
              } catch (e: any) {
                if (
                  e.message &&
                  !e.message.includes("duplicate column") &&
                  !e.message.includes("no such column")
                )
                  logger.warn("Migration/Query warning:", e.message);
              }
            } else if (tmpl.service_id) {
              servicesData = [{ serviceId: tmpl.service_id }];
              const srv = db
                .prepare(
                  "SELECT type, rates_json, name FROM services WHERE id = ?",
                )
                .get(tmpl.service_id) as any;
              if (srv) {
                if (
                  srv.name.toLowerCase().includes("activity based transport")
                ) {
                  isAbtApproved = true;
                  servicesData[0].qtyOverride = 0;
                }                const histData = getHistoricalServiceData(db, srv, tmpl.start_time || tmpl.start || startDateTime.toISOString());
              }
            }
            let mainServiceId = null;
            if (servicesData.length > 0)
              mainServiceId = servicesData[0].serviceId;

            const stmt = db.prepare(`
            INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, status, funding_type, is_abt_approved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
            const shiftInfo = stmt.run(
              clientId,
              assignedStaffId,
              mainServiceId,
              JSON.stringify(servicesData),
              startDateTime.toISOString(),
              endDateTime.toISOString(),
              "DRAFT", // Always set to DRAFT so they can be reviewed before publishing
              fundingType,
              isAbtApproved ? 1 : 0,
            );
            shiftsCreated.push(shiftInfo.lastInsertRowid);
            if (assignedStaffId) {
              affectedStaffDates.add(`${assignedStaffId}|${shiftDateStr}`);
            }
          }
        })();

        if (affectedStaffDates.size > 0) {
          console.log(
            `[DEBUG TRIGGER] Running template sweep for ${affectedStaffDates.size} unique staff-date combinations.`,
          );
          for (const sd of affectedStaffDates) {
            const [staffId, shiftDateStr] = sd.split("|");
            await recalculateDayTravelForStaff(Number(staffId), shiftDateStr);
          }
        }

        res.json({
          success: true,
          createdCount: shiftsCreated.length,
          conflicts,
        });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Shifts APIs ---

  app.get(
    "/api/invoices/:id/invoice-preview",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const invoiceRow = db
          .prepare("SELECT * FROM invoices WHERE id = ?")
          .get(req.params.id) as any;
        if (!invoiceRow)
          return res.status(404).json({ error: "Invoice not found" });

        let data: any = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });
        res.json({ success: true, data });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/shifts/:id/invoice-preview",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const data = getInvoiceDataForShift(Number(req.params.id));
        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });
        res.json({ success: true, data });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/api/shifts", authenticateTokenOrWallboard, (req: any, res: any) => {
    let query = `
      SELECT s.*, 
             u.first_name as staff_first_name, u.last_name as staff_last_name,
             c.first_name as client_first_name, c.last_name as client_last_name,
             srv.name as service_name, srv.code as service_code, srv.rate as service_rate, srv.unit as service_unit, srv.rates_json as service_rates_json, srv.type as service_type,
             COALESCE(c.funding_type, 'NDIS') as funding_type
      FROM shifts s
      LEFT JOIN users u ON s.staff_id = u.id
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN services srv ON s.service_id = srv.id
      WHERE (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
    `;
    // If not admin, only show their own published shifts and omit rates
    if (req.user.role !== "ADMIN") {
      const staffQuery = `
         SELECT s.*, COALESCE(c.funding_type, 'NDIS') as funding_type,
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
      shifts.forEach((s) => {
        try {
          let parsed = s.services_json ? JSON.parse(s.services_json) : [];
          if (Array.isArray(parsed)) {
             for (const sd of parsed) {
                 if (sd.serviceId && !sd.serviceName) {
                     const srv = db.prepare("SELECT name, code, type, rate, unit, rates_json FROM services WHERE id = ?").get(sd.serviceId) as any;
                     if (srv) {
                         const hist = getHistoricalServiceData(db, srv, s.start_time);
                         sd.serviceName = srv.name;
                         sd.serviceCode = srv.code;
                         sd.serviceType = srv.type;
                         sd.serviceRate = hist.rate;
                         sd.serviceUnit = srv.unit;
                         sd.serviceRatesJson = hist.rates_json;
                     }
                 }
             }
          }
          s.servicesData = parsed;
        } catch (e) {
          s.servicesData = [];
        }
      });
      return res.json(shifts);
    }

    const shifts = db.prepare(query).all() as any[];
    shifts.forEach((s) => {
      try {
        let parsed = s.services_json ? JSON.parse(s.services_json) : [];
        if (Array.isArray(parsed)) {
           for (const sd of parsed) {
               if (sd.serviceId && !sd.serviceName) {
                   const srv = db.prepare("SELECT name, code, type, rate, unit, rates_json FROM services WHERE id = ?").get(sd.serviceId) as any;
                     if (srv) {
                         const hist = getHistoricalServiceData(db, srv, s.start_time);
                         sd.serviceName = srv.name;
                         sd.serviceCode = srv.code;
                         sd.serviceType = srv.type;
                         sd.serviceRate = hist.rate;
                         sd.serviceUnit = srv.unit;
                         sd.serviceRatesJson = hist.rates_json;
                     }
               }
           }
        }
        s.servicesData = parsed;
      } catch (e) {
        s.servicesData = [];
      }
    });
    res.json(shifts);
  });

  app.post("/api/shifts", authenticateToken, requireAdmin, async (req, res) => {
    let {
      staffId,
      staffIds,
      clientId,
      serviceId,
      startTime,
      endTime,
      status,
      notes,
      servicesData,
      ignoreConflicts,
    } = req.body;
    try {
      const idsToProcess =
        Array.isArray(staffIds) && staffIds.length > 0 ? staffIds : [staffId];

      if (servicesData && servicesData.length > 0 && startTime) {
        let shiftDate = startTime.split("T")[0];
        try {
          const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
          const settingsMap: Record<string, string> = {};
          settingsRows.forEach((r) => { settingsMap[r.key] = r.value; });
          const rawTz = settingsMap.timezone || "Australia/Perth";
          const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;
          
          const shiftDateFormatter = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const localParts = shiftDateFormatter.formatToParts(new Date(startTime));
          const day = localParts.find((p) => p.type === "day")?.value;
          const month = localParts.find((p) => p.type === "month")?.value;
          const year = localParts.find((p) => p.type === "year")?.value;
          shiftDate = `${year}-${month}-${day}`;
        } catch(e) {}
        
        const masterPl = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1").get() as any;
        if (masterPl && masterPl.effective_date && shiftDate < masterPl.effective_date.split('T')[0]) {
          for (let sd of servicesData) {
            if (sd.serviceId && !sd.isCustom && !String(sd.serviceId).startsWith("custom-")) {
              const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(sd.serviceId) as any;
              if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                if (historicalSrv) {
                  sd.serviceId = historicalSrv.id;
                }
              }
            }
          }
        }
      }

      const mainServiceId =
        (servicesData && servicesData.length > 0
          ? servicesData[0].serviceId
          : serviceId);

      // Conflict Checking
      if (!ignoreConflicts && status !== 'CANCELLED') {
        const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz = settingsMap.timezone || "Australia/Perth";
        const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;

        const startDateTime = new Date(startTime).toISOString();
        const endDateTime = new Date(endTime).toISOString();
        const conflicts: any[] = [];

        for (const singleStaffId of idsToProcess) {
          if (!singleStaffId) continue;
          
          const conflict = db
            .prepare(`
              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? AND status != 'CANCELLED'
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
              LIMIT 1
            `)
            .get(
              singleStaffId,
              endDateTime,
              startDateTime,
              endDateTime,
              startDateTime,
              startDateTime,
              endDateTime
            ) as any;

          if (conflict) {
            const userRow = db.prepare("SELECT first_name, last_name FROM users WHERE id = ?").get(singleStaffId) as any;
            const staffName = userRow ? `${userRow.first_name} ${userRow.last_name}` : `Staff ID ${singleStaffId}`;
            const cRow = conflict.client_id ? db.prepare('SELECT first_name, last_name FROM clients WHERE id = ?').get(conflict.client_id) as any : null;
            const cName = cRow ? `${cRow.first_name} ${cRow.last_name}` : 'Unknown Client';
            const cStart = new Date(conflict.start_time);
            const cEnd = new Date(conflict.end_time);
            const dt = new Date(startDateTime);
            
            conflicts.push({
              date: dt.toLocaleDateString(['en-AU', 'en-US'], { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone}).replace(/\//g, '-'),
              startTime: dt.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone}),
              endTime: new Date(endDateTime).toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone}),
              message: `${staffName} is already booked with ${cName} (${cStart.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})} - ${cEnd.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})}).`
            });
          }
        }
        
        if (conflicts.length > 0) {
          return res.status(409).json({ error: 'Conflict detected', conflicts });
        }
      }

      const processedStaffShifts: any[] = [];
      for (const singleStaffId of idsToProcess) {
        let processedServicesData = servicesData
          ? JSON.parse(JSON.stringify(servicesData))
          : [];
        let isAbtApproved = false;

        for (const sData of processedServicesData) {
          const srv = db
            .prepare("SELECT name, unit FROM services WHERE id = ?")
            .get(sData.serviceId) as any;
          if (srv) {
            const name = srv.name.toLowerCase();
            if (name.includes("activity based transport")) {
              isAbtApproved = true;
              sData.qtyOverride = 0;
            }
            // Provider travel logic is deferred entirely to the async cascade hook
          }
        }

        processedStaffShifts.push({
          staffId: singleStaffId,
          servicesJson: JSON.stringify(processedServicesData),
          isAbtApproved,
        });
      }

      const clientQ = db
        .prepare("SELECT funding_type FROM clients WHERE id = ?")
        .get(clientId) as any;
      const fType = clientQ?.funding_type || "NDIS";
      const stmt = db.prepare(
        "INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );

      if (idsToProcess.length > 1) {
        const createShifts = db.transaction((shiftsArray) => {
          return shiftsArray.map((shift: any) => {
            const info = stmt.run(
              shift.staffId,
              clientId,
              mainServiceId,
              startTime,
              endTime,
              status || "DRAFT",
              notes,
              shift.servicesJson,
              shift.isAbtApproved ? 1 : 0,
              fType,
            );
            return info.lastInsertRowid;
          });
        });

        const shiftIds = createShifts(processedStaffShifts);

        // Recalculate after batch insert
        for (const single of processedStaffShifts) {
          console.log(
            `[DEBUG CASCADE] Calling hook for POST batch insert: staffId ${single.staffId}, time: ${startTime}`,
          );
          await recalculateDayTravelForStaff(single.staffId, startTime);
        }

        res.json({ id: shiftIds[0], ids: shiftIds });
      } else {
        const single = processedStaffShifts[0];
        const info = stmt.run(
          single.staffId,
          clientId,
          mainServiceId,
          startTime,
          endTime,
          status || "DRAFT",
          notes,
          single.servicesJson,
          single.isAbtApproved ? 1 : 0,
          fType,
        );

        // Recalculate after single insert
        console.log(
          `[DEBUG CASCADE] Calling hook for POST single insert: staffId ${single.staffId}, time: ${startTime}`,
        );
        await recalculateDayTravelForStaff(single.staffId, startTime);

        res.json({ id: info.lastInsertRowid });
      }
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post(
    "/api/shifts/batch-action",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      try {
        const { action, shiftIds } = req.body;
        if (
          !action ||
          !shiftIds ||
          !Array.isArray(shiftIds) ||
          shiftIds.length === 0
        ) {
          return res
            .status(400)
            .json({ error: "Valid action and shiftIds array required" });
        }

        const validActions = ["publish", "unpublish", "delete"];
        if (!validActions.includes(action)) {
          return res.status(400).json({ error: "Invalid action" });
        }

        // Filter out any IDs starting with 'rb_' (respite wrapper shifts)
        const pureShiftIds = shiftIds.filter(
          (id) => typeof id === "number" || !String(id).startsWith("rb_"),
        );

        if (pureShiftIds.length === 0) {
          return res.json({
            success: true,
            message: "No valid shifts supplied for batch action",
            updatedCount: 0,
          });
        }

        const placeholders = pureShiftIds.map(() => "?").join(",");

        let uniqueStaffDates = new Set<string>();

        db.transaction(() => {
          if (action === "delete") {
            const shiftsToDelete = db
              .prepare(
                `SELECT staff_id, start_time FROM shifts WHERE id IN (${placeholders})`,
              )
              .all(...pureShiftIds);
            shiftsToDelete.forEach((s: any) => {
              uniqueStaffDates.add(`${s.staff_id}|${s.start_time}`);
            });
          }

          if (action === "publish") {
            db.prepare(
              `UPDATE shifts SET status = 'PUBLISHED' WHERE id IN (${placeholders}) AND status = 'DRAFT'`,
            ).run(...pureShiftIds);
          } else if (action === "unpublish") {
            db.prepare(
              `UPDATE shifts SET status = 'DRAFT' WHERE id IN (${placeholders}) AND status = 'PUBLISHED'`,
            ).run(...pureShiftIds);
          } else if (action === "delete") {
            const invoices = db
              .prepare(
                `SELECT file_path FROM invoices WHERE shift_id IN (${placeholders})`,
              )
              .all(...pureShiftIds);
            invoices.forEach((inv: any) => {
              if (inv.file_path) {
                const filePath = path.join(
                  process.cwd(),
              "data",
              "invoices",
                  inv.file_path,
                );
                if (fs.existsSync(filePath)) {
                  try {
                    fs.unlinkSync(filePath);
                  } catch (e) {
                    logger.warn("Failed to delete file", e);
                  }
                }
              }
            });
            db.prepare(
              `DELETE FROM invoices WHERE shift_id IN (${placeholders})`,
            ).run(...pureShiftIds);
            db.prepare(`DELETE FROM shifts WHERE id IN (${placeholders})`).run(
              ...pureShiftIds,
            );
          }
        })();

        if (action === "delete" && uniqueStaffDates.size > 0) {
          for (const sd of Array.from(uniqueStaffDates)) {
            const [staffId, startTime] = sd.split("|");
            await recalculateDayTravelForStaff(Number(staffId), startTime);
          }
        }

        res.json({
          success: true,
          message: `Batch ${action} completed successfully`,
        });
      } catch (e: any) {
        console.error(e);

        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/shifts/publish-all",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        db.transaction(() => {
          db.prepare("UPDATE shifts SET status = ? WHERE status = ?").run(
            "PUBLISHED",
            "DRAFT",
          );
          db.prepare(
            "UPDATE respite_bookings SET status = ? WHERE status = ?",
          ).run("PUBLISHED", "DRAFT");
        })();
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/shifts/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      const { id } = req.params;
      const {
        staffId,
        clientId,
        serviceId,
        startTime,
        endTime,
        status,
        notes,
        fundingType,
        servicesData,
        providerTravelKm,
        abtKm,
        ignoreConflicts,
      } = req.body;

      try {
        const existing = db
          .prepare("SELECT * FROM shifts WHERE id = ?")
          .get(id) as any;
        if (!existing) return res.status(404).json({ error: "Not found" });

        // Conflict Checking
        if (!ignoreConflicts && status !== 'CANCELLED' && staffId) {
          const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
          const settingsMap: any = {};
          settingsRows.forEach((r) => {
            try {
              settingsMap[r.key] = JSON.parse(r.value);
            } catch {
              settingsMap[r.key] = r.value;
            }
          });
          let rawTz = settingsMap.timezone || "Australia/Perth";
          const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;

          const startDateTime = new Date(startTime).toISOString();
          const endDateTime = new Date(endTime).toISOString();
          
          const conflict = db
            .prepare(`
              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? AND id != ? AND status != 'CANCELLED'
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
              LIMIT 1
            `)
            .get(
              staffId,
              id,
              endDateTime,
              startDateTime,
              endDateTime,
              startDateTime,
              startDateTime,
              endDateTime
            ) as any;

          if (conflict) {
            const userRow = db.prepare("SELECT first_name, last_name FROM users WHERE id = ?").get(staffId) as any;
            const staffName = userRow ? `${userRow.first_name} ${userRow.last_name}` : `Staff ID ${staffId}`;
            const cRow = conflict.client_id ? db.prepare('SELECT first_name, last_name FROM clients WHERE id = ?').get(conflict.client_id) as any : null;
            const cName = cRow ? `${cRow.first_name} ${cRow.last_name}` : 'Unknown Client';
            const cStart = new Date(conflict.start_time);
            const cEnd = new Date(conflict.end_time);
            const dt = new Date(startDateTime);
            
            const conflictData = {
              date: dt.toLocaleDateString(['en-AU', 'en-US'], { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone}).replace(/\//g, '-'),
              startTime: dt.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone}),
              endTime: new Date(endDateTime).toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone}),
              message: `${staffName} is already booked with ${cName} (${cStart.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})} - ${cEnd.toLocaleTimeString(['en-AU', 'en-US'], {hour: '2-digit', minute: '2-digit', timeZone: timezone})}).`
            };
            
            return res.status(409).json({ error: 'Conflict detected', conflicts: [conflictData] });
          }
        }

        // Build old value for audit logging
        const oldValue = JSON.stringify(existing);

        if (servicesData && servicesData.length > 0 && startTime) {
          let shiftDate = startTime.split("T")[0];
          try {
            const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
            const settingsMap: Record<string, string> = {};
            settingsRows.forEach((r) => { settingsMap[r.key] = r.value; });
            const rawTz = settingsMap.timezone || "Australia/Perth";
            const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;
            
            const shiftDateFormatter = new Intl.DateTimeFormat("en-GB", {
              timeZone: timezone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            const localParts = shiftDateFormatter.formatToParts(new Date(startTime));
            const day = localParts.find((p) => p.type === "day")?.value;
            const month = localParts.find((p) => p.type === "month")?.value;
            const year = localParts.find((p) => p.type === "year")?.value;
            shiftDate = `${year}-${month}-${day}`;
          } catch(e) {}

          const masterPl = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1").get() as any;
          if (masterPl && masterPl.effective_date && shiftDate < masterPl.effective_date.split('T')[0]) {
            for (let sd of servicesData) {
              if (sd.serviceId && !sd.isCustom && !String(sd.serviceId).startsWith("custom-")) {
                const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(sd.serviceId) as any;
                if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                  const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                  if (historicalSrv) {
                    sd.serviceId = historicalSrv.id;
                  }
                }
              }
            }
          }
        }

        let processedServicesData = servicesData
          ? JSON.parse(JSON.stringify(servicesData))
          : [];
        let isAbtApproved = existing.is_abt_approved === 1;

        if (servicesData) {
          isAbtApproved = false;
          for (const sData of processedServicesData) {
            const srv = db
              .prepare("SELECT name, unit FROM services WHERE id = ?")
              .get(sData.serviceId) as any;
            if (srv) {
              const name = srv.name.toLowerCase();
              if (name.includes("activity based transport")) {
                isAbtApproved = true;
                sData.qtyOverride = 0;
              }
            }
          }
        }

        const servicesJson = servicesData
          ? JSON.stringify(processedServicesData)
          : existing.services_json;
        const mainServiceId =
          (processedServicesData && processedServicesData.length > 0
            ? processedServicesData[0].serviceId
            : serviceId || existing.service_id);

        const finalFundingType =
          fundingType ||
          existing.funding_type ||
          (
            db
              .prepare("SELECT funding_type FROM clients WHERE id = ?")
              .get(
                clientId !== undefined ? clientId : existing.client_id,
              ) as any
          )?.funding_type ||
          "NDIS";

        const stmt = db.prepare(
          "UPDATE shifts SET staff_id = ?, client_id = ?, service_id = ?, start_time = ?, end_time = ?, status = ?, notes = ?, funding_type = ?, services_json = ?, is_abt_approved = ?, provider_travel_km = ?, abt_km = ? WHERE id = ?",
        );
        stmt.run(
          staffId !== undefined ? staffId : existing.staff_id,
          clientId !== undefined ? clientId : existing.client_id,
          mainServiceId,
          startTime !== undefined ? startTime : existing.start_time,
          endTime !== undefined ? endTime : existing.end_time,
          status !== undefined ? status : existing.status,
          notes !== undefined ? notes : existing.notes,
          finalFundingType,
          servicesJson,
          isAbtApproved ? 1 : 0,
          providerTravelKm !== undefined
            ? providerTravelKm
            : existing.provider_travel_km,
          abtKm !== undefined ? abtKm : existing.abt_km,
          id,
        );

        // Recalculate travel immediately after UPDATE database operation
        await recalculateDayTravelForStaff(
          staffId !== undefined ? staffId : existing.staff_id,
          startTime !== undefined ? startTime : existing.start_time,
        );
        if (
          (staffId !== undefined && staffId !== existing.staff_id) ||
          (startTime !== undefined && startTime !== existing.start_time)
        ) {
          // Recalculate old date/staff if it changed
          await recalculateDayTravelForStaff(
            existing.staff_id,
            existing.start_time,
          );
        }

        // Audit Log for COMPLETED shift edits
        if (existing.status === "COMPLETED") {
          const newRecord = db
            .prepare("SELECT * FROM shifts WHERE id = ?")
            .get(id) as any;
          db.prepare(
            "INSERT INTO audit_logs (entity_type, entity_id, old_value, new_value, changed_by_user_id) VALUES (?, ?, ?, ?, ?)",
          ).run("shift", id, oldValue, JSON.stringify(newRecord), req.user.id);
        }

        if (
          (status === "COMPLETED" || existing.status === "COMPLETED") &&
          (existing.status !== status ||
            servicesJson !== existing.services_json ||
            providerTravelKm !== undefined ||
            abtKm !== undefined)
        ) {
          generateInvoiceForShift(id);
        }

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/shifts/:id/cancel",
    authenticateToken,
    (req: any, res: any) => {
      const { id } = req.params;
      const { reason } = req.body;
      try {
        const shift = db
          .prepare("SELECT * FROM shifts WHERE id = ?")
          .get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id)
          return res.status(403).json({ error: "Forbidden" });

        db.prepare("UPDATE shifts SET status = ?, notes = ? WHERE id = ?").run(
          "CANCELLED",
          reason ? `Cancelled: ${reason}` : "Cancelled by staff",
          id,
        );

        // Better communication: Send notifications about the cancellation
        try {
          const staff = db
            .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
            .get(shift.staff_id) as any;
          const staffName = staff
            ? `${staff.first_name} ${staff.last_name}`
            : "A staff member";

          const client = db
            .prepare("SELECT first_name, last_name FROM clients WHERE id = ?")
            .get(shift.client_id) as any;
          const clientName = client
            ? `${client.first_name} ${client.last_name}`
            : "a client";

          const notifReason = reason ? reason : "No reason provided";
          const msg = `${staffName} cancelled their shift with ${clientName}. Reason: ${notifReason}`;

          const insertNotif = db.prepare(
            "INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
          );

          // Build a unique set of user IDs to receive this notification: the assigned staff member + all admins
          const userIdsToNotify = new Set<number>();
          userIdsToNotify.add(Number(shift.staff_id));

          const admins = db
            .prepare("SELECT id FROM users WHERE role = 'ADMIN'")
            .all() as any[];
          for (const admin of admins) {
            userIdsToNotify.add(Number(admin.id));
          }

          for (const userId of userIdsToNotify) {
            insertNotif.run(
              userId,
              "SHIFT_CANCELLED",
              "Shift Cancelled",
              msg,
              "/roster",
            );
          }
        } catch (err) {
          logger.error(
            `Failed to create notifications for cancelled shift ${id}: ${err}`,
          );
        }

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post("/api/shifts/:id/start", authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    const { odometer_start_reading, odometer_start_photo, actual_start_time } =
      req.body;
    try {
      const shift = db
        .prepare("SELECT * FROM shifts WHERE id = ?")
        .get(id) as any;
      if (!shift) return res.status(404).json({ error: "Shift not found" });
      if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });

      // Use the provided local check-in time, fallback to server time
      const startTime = actual_start_time || new Date().toISOString();
      db.prepare(
        "UPDATE shifts SET actual_start_time = ?, status = ?, odometer_start_reading = ?, odometer_start_photo = ? WHERE id = ?",
      ).run(
        startTime,
        "IN_PROGRESS",
        odometer_start_reading || null,
        odometer_start_photo || null,
        id,
      );
      res.json({ success: true, actual_start_time: startTime });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post(
    "/api/shifts/:id/undo-start",
    authenticateToken,
    (req: any, res: any) => {
      const { id } = req.params;
      try {
        const shift = db
          .prepare("SELECT * FROM shifts WHERE id = ?")
          .get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id)
          return res.status(403).json({ error: "Forbidden" });

        db.prepare(
          "UPDATE shifts SET actual_start_time = NULL, status = ?, odometer_start_reading = NULL, odometer_start_photo = NULL WHERE id = ?",
        ).run("PUBLISHED", id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/shifts/:id/complete",
    authenticateToken,
    async (req: any, res: any) => {
      const { id } = req.params;
      const {
        actual_start_time,
        actual_finish_time,
        notes,
        abtCoordinates,
        odometer_end_reading,
        odometer_end_photo,
      } = req.body;

      try {
        const shift = db
          .prepare("SELECT * FROM shifts WHERE id = ?")
          .get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id)
          return res.status(403).json({ error: "Forbidden" });

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
            legs: pTravel.routeLogs,
          };
        }

        if (hcTravel.routeLogs && hcTravel.routeLogs.length > 0) {
          combinedRouteLog = combinedRouteLog || {};
          combinedRouteLog.homeCareTravel = {
            calculatedAt: new Date().toISOString(),
            distance: hcTravel.distance,
            cost: hcTravel.cost,
            legs: hcTravel.routeLogs,
          };
        }

        if (Array.isArray(abtCoordinates) && abtCoordinates.length > 0) {
          const abtTravel = await calculateAbtTravel(shift, abtCoordinates);
          abt_km = abtTravel.distance;
          abt_cost = abtTravel.cost;

          if (abt_km > 0) {
            combinedRouteLog = combinedRouteLog || {};
            combinedRouteLog.abt = {
              description: (abtTravel.routeLogs as any).description,
              waypoints: (abtTravel.routeLogs as any).waypoints,
              distance: abt_km,
              minutes: (abtTravel as any).minutes,
              cost: abt_cost,
              calculatedAt: new Date().toISOString(),
              legs: (abtTravel.routeLogs as any).legs,
            };
          }
        }

        transport_route_log = combinedRouteLog
          ? JSON.stringify(combinedRouteLog)
          : null;

        // 3. Update DB
        let updatedServicesJson = shift.services_json;
        const { checklist } = req.body;

        if (checklist && Array.isArray(checklist) && checklist.length > 0) {
          updatedServicesJson = JSON.stringify(checklist);
        }

        if (!updatedServicesJson) {
          updatedServicesJson = "[]";
        }

        if (updatedServicesJson) {
          try {
            const servicesData = JSON.parse(updatedServicesJson);
            if (Array.isArray(servicesData)) {
              let changed = false;
              let hasABT = false;
              let hasProviderTravel = false;
              for (const sData of servicesData) {
                const service = db
                  .prepare("SELECT name, unit FROM services WHERE id = ?")
                  .get(sData.serviceId) as any;
                if (service && service.name) {
                  const name = service.name.toLowerCase();
                  if (name.includes("activity based transport")) {
                    hasABT = true;
                    sData.qtyOverride = parseFloat(abt_km.toFixed(2));
                    changed = true;
                  } else if (name.includes("provider travel")) {
                    hasProviderTravel = true;
                    let billableValue = pTravel.distance; // Fallback
                    if (
                      pTravel.minutes !== undefined &&
                      !name.includes("non-labour")
                    ) {
                      const unitStr = (service.unit || "Hour").toLowerCase();
                      billableValue =
                        unitStr.includes("minute") || unitStr === "min"
                          ? pTravel.minutes
                          : pTravel.minutes / 60;
                    }
                    sData.qtyOverride = parseFloat(billableValue.toFixed(2));
                    changed = true;
                  }
                }
              }
              
              if (abt_km > 0 && !hasABT) {
                const abtService = db.prepare("SELECT id FROM services WHERE LOWER(name) LIKE '%activity based transport%' LIMIT 1").get() as any;
                if (abtService) {
                  servicesData.push({
                    serviceId: abtService.id,
                    hoursType: "Normal",
                    qtyOverride: parseFloat(abt_km.toFixed(2))
                  });
                  changed = true;
                }
              }

              if (pTravel.distance > 0 && !hasProviderTravel) {
                const ptService = db.prepare("SELECT id FROM services WHERE LOWER(name) LIKE '%provider travel%' AND LOWER(name) NOT LIKE '%non-labour%' LIMIT 1").get() as any;
                if (ptService) {
                  servicesData.push({
                    serviceId: ptService.id,
                    hoursType: "Normal",
                    qtyOverride: parseFloat((pTravel.minutes !== undefined ? pTravel.minutes / 60 : pTravel.distance).toFixed(2))
                  });
                  changed = true;
                }
              }

              if (changed) {
                updatedServicesJson = JSON.stringify(servicesData);
              }
            }
          } catch (e) {
            console.error(
              "Failed to parse services_json during completion:",
              e,
            );
          }
        }

        const isHomeCare =
          shift.funding_type === "HCP" ||
          shift.funding_type === "Home Care" ||
          shift.funding_type === "HOME_CARE";

        const finalProviderKm = isHomeCare
          ? shift.provider_travel_km
          : pTravel.distance;
        const finalProviderCost = isHomeCare
          ? shift.provider_travel_cost
          : pTravel.cost;

        // ... Update query downwards
        let updateQueryStr = `
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
      `;
        const updateParams = [
          actual_finish_time || new Date().toISOString(),
          notes || shift.notes,
          finalProviderKm,
          finalProviderCost,
          hcTravel.distance,
          hcTravel.cost,
          abt_km,
          abt_cost,
          transport_route_log,
          updatedServicesJson,
          shift.status === "COMPLETED"
            ? odometer_end_reading || shift.odometer_end_reading
            : odometer_end_reading || null,
          shift.status === "COMPLETED"
            ? odometer_end_photo || shift.odometer_end_photo
            : odometer_end_photo || null,
        ];

        if (actual_start_time) {
          updateQueryStr += `, actual_start_time = ? `;
          updateParams.push(actual_start_time);
        }

        updateQueryStr += ` WHERE id = ?`;
        updateParams.push(id);

        const stmt = db.prepare(updateQueryStr);
        stmt.run(...updateParams);

        console.log(
          `[DEBUG TRIGGER] Shift ${id} completed. Triggering cascade engine.`,
        );
        await recalculateDayTravelForStaff(shift.staff_id, shift.start_time);

        // Trigger notification for ADMINs
        try {
          const staff = db
            .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
            .get(shift.staff_id) as any;
          const staffName = staff
            ? `${staff.first_name} ${staff.last_name}`
            : "A staff member";

          const client = db
            .prepare("SELECT first_name, last_name FROM clients WHERE id = ?")
            .get(shift.client_id) as any;
          const clientName = client
            ? `${client.first_name} ${client.last_name}`
            : "a client";

          const admins = db
            .prepare("SELECT id FROM users WHERE role = 'ADMIN'")
            .all() as any[];

          const insertNotif = db.prepare(
            "INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
          );

          for (const admin of admins) {
            insertNotif.run(
              admin.id,
              "SHIFT_COMPLETED",
              "Shift Completed",
              `${staffName} has completed their shift with ${clientName} and submitted progress notes.`,
              "/roster",
            );
          }
        } catch (err) {
          logger.error(
            `Failed to create notifications for shift ${id}: ${err}`,
          );
        }

        if (shift.respite_booking_id) {
          const childShifts = db
            .prepare("SELECT status FROM shifts WHERE respite_booking_id = ?")
            .all(shift.respite_booking_id);
          const allCompleted = childShifts.every(
            (s: any) => s.status === "COMPLETED",
          );
          if (allCompleted) {
            db.prepare(
              "UPDATE respite_bookings SET status = 'COMPLETED' WHERE id = ?",
            ).run(shift.respite_booking_id);
            generateInvoiceForRespiteBooking(shift.respite_booking_id);
          }
        } else {
          // Generate Invoice for normal shift
          generateInvoiceForShift(id);
        }

        res.json({ success: true, abt_km, pTravelDistance: pTravel.distance });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/shifts/:id",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      const { id } = req.params;
      try {
        let shiftToUpdate: any;
        db.transaction(() => {
          shiftToUpdate = db
            .prepare("SELECT staff_id, start_time FROM shifts WHERE id = ?")
            .get(id);
          const invoices = db
            .prepare("SELECT file_path FROM invoices WHERE shift_id = ?")
            .all(id);
          invoices.forEach((inv: any) => {
            if (inv.file_path) {
              const filePath = path.join(
                process.cwd(),
              "data",
              "invoices",
                inv.file_path,
              );
              if (fs.existsSync(filePath)) {
                try {
                  fs.unlinkSync(filePath);
                } catch (e) {
                  logger.warn("Failed to delete file", e);
                }
              }
            }
          });
          db.prepare("DELETE FROM invoices WHERE shift_id = ?").run(id);
          db.prepare("DELETE FROM shifts WHERE id = ?").run(id);

          // Restore any invoices that were merged into this shift which is now being deleted
          db.prepare(
            `UPDATE invoices SET status = 'GENERATED', merged_into_shift_id = NULL WHERE merged_into_shift_id = ?`,
          ).run(id);
        })();

        if (shiftToUpdate) {
          await recalculateDayTravelForStaff(
            shiftToUpdate.staff_id,
            shiftToUpdate.start_time,
          );
        }

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Services APIs ---
  app.get("/api/services", authenticateToken, (req: any, res: any) => {
    const { type } = req.query;

    // For staff, omit rate and rates_json completely
    const isStaff = req.user.role !== "ADMIN";
    const selectCols = isStaff
      ? "id, code, name, description, type, unit, service_category, reg_group_number, reg_group_name"
      : "*";

    let query = `SELECT ${selectCols} FROM services WHERE (status IS NULL OR status != 'ARCHIVED')`;

    if (type) {
      if (type === "NDIS") {
        query += ` AND type = ? ORDER BY code ASC`;
      } else {
        query += ` AND type = ? ORDER BY name ASC`;
      }
      const services = db.prepare(query).all(type);
      return res.json(services);
    }
    const services = db.prepare(query + " ORDER BY name ASC").all();
    res.json(services);
  });

  app.post("/api/services", authenticateToken, requireAdmin, (req, res) => {
    const { code, name, rate, description, type } = req.body;
    try {
      const stmt = db.prepare(
        "INSERT INTO services (code, name, rate, description, type) VALUES (?, ?, ?, ?, ?)",
      );
      const info = stmt.run(code, name, rate, description, type || "NDIS");
      res.json({
        id: info.lastInsertRowid,
        code,
        name,
        rate,
        description,
        type: type || "NDIS",
      });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch(
    "/api/settings/services/:id/category",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { id } = req.params;
      const { service_category } = req.body;

      if (
        service_category &&
        !["Clinical", "Independence", "Everyday Living"].includes(
          service_category,
        )
      ) {
        return res.status(400).json({ error: "Invalid service category" });
      }

      try {
        const stmt = db.prepare(
          "UPDATE services SET service_category = ? WHERE id = ?",
        );
        stmt.run(service_category || null, id);
        res.json({ success: true, service_category });
      } catch (e: any) {
        logger.error(`API Error updating service category: ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/settings/services/export",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const services = db
          .prepare(
            "SELECT * FROM services WHERE type = 'HOME_CARE' ORDER BY code ASC",
          )
          .all() as any[];

        const exportData = services.map((s) => {
          let rates: any = {};
          if (s.rates_json) {
            try {
              rates = JSON.parse(s.rates_json);
            } catch (e) {}
          }

          return {
            "SERV. ID": s.code,
            "SERVICE NAME": s.name,
            CATEGORY: s.service_category || "",
            UNIT: s.unit || "Hour",
            WEEKDAY:
              rates["Weekday"] !== undefined
                ? parseFloat(rates["Weekday"])
                : parseFloat(s.rate) || 0,
            "NON-STANDARD":
              rates["Weekday (Non-Standard)"] !== undefined
                ? parseFloat(rates["Weekday (Non-Standard)"])
                : 0,
            SATURDAY:
              rates["Saturday"] !== undefined
                ? parseFloat(rates["Saturday"])
                : 0,
            SUNDAY:
              rates["Sunday"] !== undefined ? parseFloat(rates["Sunday"]) : 0,
            "PUB. HOLIDAY":
              rates["Public Holiday"] !== undefined
                ? parseFloat(rates["Public Holiday"])
                : 0,
          };
        });

        const worksheet = xlsx.utils.json_to_sheet(exportData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Home Care Pricing");

        const buffer = xlsx.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=home_care_pricing_export.xlsx",
        );
        res.send(buffer);
      } catch (e: any) {
        logger.error(`Export error: ${e.message}`);
        res.status(500).json({ error: "Failed to export pricing" });
      }
    },
  );

  app.get(
    "/api/settings/services/export-ndis",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const services = db
          .prepare(
            "SELECT * FROM services WHERE type = 'NDIS' ORDER BY code ASC",
          )
          .all() as any[];

        const exportData = services.map((s) => {
          let rates: any = {};
          if (s.rates_json) {
            try {
              rates = JSON.parse(s.rates_json);
            } catch (e) {}
          }

          return {
            "NDIS Code": s.code,
            "Service Name": s.name,
            "Reg. Grp Num": s.reg_group_number || "",
            "Reg. Grp Name": s.reg_group_name || "",
            "Unit": s.unit || "",
            "ACT": rates["ACT"] !== undefined ? parseFloat(rates["ACT"]) : 0,
            "NSW": rates["NSW"] !== undefined ? parseFloat(rates["NSW"]) : 0,
            "NT": rates["NT"] !== undefined ? parseFloat(rates["NT"]) : 0,
            "QLD": rates["QLD"] !== undefined ? parseFloat(rates["QLD"]) : 0,
            "SA": rates["SA"] !== undefined ? parseFloat(rates["SA"]) : 0,
            "TAS": rates["TAS"] !== undefined ? parseFloat(rates["TAS"]) : 0,
            "VIC": rates["VIC"] !== undefined ? parseFloat(rates["VIC"]) : 0,
            "WA": rates["WA"] !== undefined ? parseFloat(rates["WA"]) : 0,
            "Remote": rates["Remote"] !== undefined ? parseFloat(rates["Remote"]) : 0,
            "Very Remote": rates["Very Remote"] !== undefined ? parseFloat(rates["Very Remote"]) : 0,
          };
        });

        const worksheet = xlsx.utils.json_to_sheet(exportData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "NDIS Pricing");

        const buffer = xlsx.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=ndis_pricing_export.xlsx",
        );
        res.send(buffer);
      } catch (e: any) {
        logger.error(`Export error: ${e.message}`);
        res.status(500).json({ error: "Failed to export NDIS pricing" });
      }
    },
  );

  app.post(
    "/api/settings/services",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      const { name, service_category, unit, rates_json, type } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Service name is required" });
      }

      try {
        // Find highest SERV-XXXX
        const lastService = db
          .prepare(
            "SELECT code FROM services WHERE code LIKE 'SERV-%' ORDER BY CAST(SUBSTR(code, 6) AS INTEGER) DESC LIMIT 1",
          )
          .get() as any;
        let nextNum = 1;
        if (lastService && lastService.code) {
          const match = lastService.code.match(/SERV-(\d+)/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }
        const nextCode = `SERV-${nextNum.toString().padStart(4, "0")}`;

        // We will set the 'rate' column to the 'Weekday' value from rates_json, or 0 if missing.
        const rateStr =
          rates_json && rates_json["Weekday"] !== undefined
            ? rates_json["Weekday"]
            : "0";
        const parsedRatesJson = rates_json ? JSON.stringify(rates_json) : "{}";

        const stmt = db.prepare(`
        INSERT INTO services (code, name, service_category, unit, rate, rates_json, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

        const info = stmt.run(
          nextCode,
          name,
          service_category || null,
          unit || "Hour",
          rateStr,
          parsedRatesJson,
          type || "HOME_CARE",
        );

        const newService = db
          .prepare(`SELECT * FROM services WHERE id = ?`)
          .get(info.lastInsertRowid);
        res.status(201).json(newService);
      } catch (e: any) {
        logger.error(`Failed to create custom service: ${e}`);
        res.status(500).json({ error: "Failed to create service" });
      }
    },
  );

  app.post(
    "/api/services/import",
    authenticateToken,
    requireAdmin,
    upload.single("file"),
    (req: any, res: any) => {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { type, region, priceListName, isMaster, effectiveDate } = req.body;
      if (type !== "NDIS" && type !== "HOME_CARE") {
        return res.status(400).json({ error: "Invalid service type" });
      }

      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const workbook = xlsx.read(fileBuffer, { type: "buffer" });
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
            return (
              str === "code" ||
              str === "support item number" ||
              str === "support item"
            );
          });
          if (hasCodeHeader) {
            headerRowIndex = i;
            break;
          }
        }

        const data: any[] = xlsx.utils.sheet_to_json(sheet, {
          range: headerRowIndex,
        });

        if (!data || data.length === 0) {
          return res.status(400).json({ error: "The uploaded file contains no data." });
        }

        if (type === "NDIS") {
          const sampleKeys = Object.keys(data[0]);
          const hasRegGroupNum = sampleKeys.some((k) => /reg.*(group|grp).*num/i.test(k.replace(/[\r\n]/g, " ")));
          const hasRegGroupName = sampleKeys.some((k) => /reg.*(group|grp).*name/i.test(k.replace(/[\r\n]/g, " ")));

          if (!hasRegGroupNum || !hasRegGroupName) {
            return res.status(400).json({ 
              error: "Invalid NDIS Pricing format: Missing required columns 'Registration Group Number' and 'Registration Group Name'. Please ensure your .xlsx file contains these columns before importing." 
            });
          }
        }

        let imported = 0;
        let updated = 0;

        const REGIONS = [
          "ACT",
          "NSW",
          "NT",
          "QLD",
          "SA",
          "TAS",
          "VIC",
          "WA",
          "Remote",
          "Very Remote",
        ];
        const insertService = db.prepare(
          "INSERT INTO services (code, name, rate, description, reg_group_number, reg_group_name, type, rates_json, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')"
        );
        const updateService = db.prepare(
          "UPDATE services SET code = ?, name = ?, rate = ?, description = ?, reg_group_number = ?, reg_group_name = ?, rates_json = ?, unit = ?, status = 'ACTIVE' WHERE id = ?",
        );
        const insertPriceListItem = db.prepare(
          "INSERT INTO price_list_items (price_list_id, code, name, rate, description, reg_group_number, reg_group_name, rates_json, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        let priceListId: number | undefined;
        let shouldBeMaster = String(isMaster) === "true";

        if (effectiveDate) {
          const rawTzSetting = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
          const rawTz = rawTzSetting?.value || "Australia/Perth";
          const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;

          const auDateStr = new Date().toLocaleDateString("en-AU", { timeZone: timezone });
          const [day, month, year] = auDateStr.split('/');
          const todayStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          if (effectiveDate <= todayStr) {
            shouldBeMaster = true;
          }
        }

        db.transaction(() => {
          if (type === "NDIS") {
            const countRow = db.prepare("SELECT count(*) as count FROM price_lists").get() as any;
            if (countRow.count === 0) {
              shouldBeMaster = true;
            }
          }

          if (type === "NDIS" && shouldBeMaster) {
             db.prepare("UPDATE services SET status = 'ARCHIVED' WHERE type = 'NDIS'").run();
          }

          if (type === "NDIS" && priceListName) {
            const insertList = db.prepare("INSERT INTO price_lists (name, is_master, effective_date) VALUES (?, 0, ?)");
            const plInfo = insertList.run(priceListName, effectiveDate || null);
            priceListId = plInfo.lastInsertRowid as number;
          }
          // Keep a copy of the file on fileserver for future use
          if (req.file) {
            try {
              db.exec("ALTER TABLE files ADD COLUMN region TEXT");
            } catch (e: any) {
              if (
                e.message &&
                !e.message.includes("duplicate column") &&
                !e.message.includes("no such column")
              )
                logger.warn("Migration/Query warning:", e.message);
            }

            let folderPath = req.query.folderPath || "/";
            let subfolder = (folderPath as string).trim();
            subfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, "");
            if (subfolder.startsWith("/")) {
              subfolder = subfolder.substring(1);
            }
            const systemName =
              subfolder && subfolder !== "."
                ? path.posix.join(subfolder, req.file.filename)
                : req.file.filename;

            const fileInfo = db.prepare(
              "INSERT INTO files (original_name, system_name, size, uploaded_by, region, folder_path) VALUES (?, ?, ?, ?, ?, ?)",
            ).run(
              req.file.originalname,
              systemName,
              req.file.size,
              req.user.id,
              region || null,
              folderPath,
            );
            
            if (priceListId) {
              db.prepare("UPDATE price_lists SET file_id = ? WHERE id = ?").run(fileInfo.lastInsertRowid, priceListId);
            }
          }

          for (const row of data) {
            const keys = Object.keys(row);
            const NDIS_REGIONS = [
              "ACT",
              "NSW",
              "NT",
              "QLD",
              "SA",
              "TAS",
              "VIC",
              "WA",
              "Remote",
              "Very Remote",
            ];
            const HOME_CARE_DAY_RATES = [
              "Weekday",
              "Weekday (Non-Standard)",
              "Saturday",
              "Sunday",
              "Public Holiday",
            ];

            let codeKey,
              nameKey,
              descKey,
              rateKey,
              regGroupNumKey,
              regGroupNameKey,
              unitKey;

            if (type === "HOME_CARE") {
              codeKey = keys.find(
                (k) =>
                  /serv\. id/i.test(k) ||
                  /serv\.? id/i.test(k) ||
                  k.trim().toLowerCase() === "serv. id",
              );
              nameKey = keys.find(
                (k) =>
                  k.trim().toLowerCase() === "service" || /service/i.test(k),
              );
              descKey = keys.find(
                (k) =>
                  k.trim().toLowerCase() === "description" ||
                  /description/i.test(k),
              );
              // Default rate is Weekday if it exists
              rateKey = keys.find(
                (k) =>
                  k.trim().toLowerCase() === "weekday" ||
                  (/weekday/i.test(k) && !/non-standard/i.test(k)),
              );
              unitKey = keys.find(
                (k) =>
                  k.trim().toLowerCase() === "unit" ||
                  k.trim().toLowerCase() === "uom",
              );
            } else {
              codeKey =
                keys.find(
                  (k) => k.trim().toLowerCase() === "support item number",
                ) || keys.find((k) => /code|support item number/i.test(k));
              nameKey =
                keys.find(
                  (k) => k.trim().toLowerCase() === "support item name",
                ) ||
                keys.find((k) => /support item name/i.test(k)) ||
                keys.find(
                  (k) =>
                    /name/i.test(k) &&
                    !/group/i.test(k) &&
                    !/category/i.test(k),
                );
              descKey =
                keys.find((k) => k.trim().toLowerCase() === "description") ||
                keys.find((k) => /description/i.test(k));
              rateKey =
                (region &&
                  keys.find(
                    (k) =>
                      k.trim().toLowerCase() === String(region).toLowerCase(),
                  )) ||
                keys.find((k) => /rate|price/i.test(k));
              regGroupNumKey =
                keys.find(
                  (k) => /reg.*(group|grp).*num/i.test(k.replace(/[\r\n]/g, " "))
                );
              regGroupNameKey =
                keys.find(
                  (k) => /reg.*(group|grp).*name/i.test(k.replace(/[\r\n]/g, " "))
                );
              unitKey = keys.find(
                (k) =>
                  k.trim().toLowerCase() === "unit" ||
                  k.trim().toLowerCase() === "uom",
              );
            }

            const code = codeKey ? String(row[codeKey]).trim() : undefined;
            const name = nameKey ? String(row[nameKey]).trim() : undefined;
            const description = descKey ? String(row[descKey]).trim() : "";
            const regGroupNum = regGroupNumKey
              ? String(row[regGroupNumKey]).trim()
              : "";
            const regGroupName = regGroupNameKey
              ? String(row[regGroupNameKey]).trim()
              : "";

            let rawUnit = unitKey
              ? String(row[unitKey]).trim().toUpperCase()
              : "";
            let unit = "";
            if (rawUnit === "H" || rawUnit === "HOUR" || rawUnit.includes("HOUR")) unit = "Hour";
            else if (rawUnit === "E" || rawUnit === "EACH" || rawUnit.includes("EACH")) unit = "Each";
            else if (rawUnit === "D" || rawUnit === "DAY" || rawUnit.includes("DAY")) unit = "Day";
            else if (rawUnit === "WK" || rawUnit === "WEEK" || rawUnit.includes("WEEK")) unit = "Week";
            else if (rawUnit === "YR" || rawUnit === "YEAR" || rawUnit.includes("YEAR")) unit = "Year";
            else if (rawUnit === "MON" || rawUnit === "MONTH" || rawUnit.includes("MONTH")) unit = "Month";
            else if (rawUnit) unit = ""; // fallback to empty string to pass CHECK constraint

            if (!unit && type === "HOME_CARE") {
              if (code === "SERV-0026") {
                unit = "Each";
              } else {
                unit = "Hour";
              }
            }

            let rate = rateKey ? row[rateKey] : undefined;

            if (!code || !name) continue;

            // Integrity checks
            if (
              code.toLowerCase().includes("serv. id") ||
              code.toLowerCase().includes("support item")
            )
              continue;
            if (name.toLowerCase().includes("support item name")) continue;
            if (code.length < 2) continue;

            if (typeof rate === "string") {
              rate = parseFloat(rate.replace(/[^0-9.]/g, ""));
            }
            if (isNaN(rate) || rate === undefined) rate = 0;

            const ratesObj: Record<string, number> = {};
            if (type === "HOME_CARE") {
              for (const day of HOME_CARE_DAY_RATES) {
                // Exact match or partial match
                const rKey = keys.find(
                  (k) =>
                    k.trim().toLowerCase() === day.toLowerCase() ||
                    k
                      .replace(/[\(\)-]/g, "")
                      .trim()
                      .toLowerCase() ===
                      day
                        .replace(/[\(\)-]/g, "")
                        .trim()
                        .toLowerCase(),
                );
                if (rKey) {
                  let rVal = row[rKey];
                  if (typeof rVal === "string")
                    rVal = parseFloat(rVal.replace(/[^0-9.]/g, ""));
                  if (isNaN(rVal) || rVal == null) rVal = 0;
                  ratesObj[day] = rVal;
                }
              }
            } else {
              for (const reg of NDIS_REGIONS) {
                const rKey = keys.find(
                  (k) => k.trim().toLowerCase() === reg.toLowerCase(),
                );
                if (rKey) {
                  let rVal = row[rKey];
                  if (typeof rVal === "string")
                    rVal = parseFloat(rVal.replace(/[^0-9.]/g, ""));
                  if (isNaN(rVal) || rVal == null) rVal = 0;
                  ratesObj[reg] = rVal;
                }
              }
            }
            if (type === "NDIS" && (name.toLowerCase().includes("activity based transport") || name.toLowerCase().includes("provider travel"))) {
              rate = 1;
              for (const k of Object.keys(ratesObj)) {
                ratesObj[k] = 1;
              }
            }
            const ratesJson = JSON.stringify(ratesObj);

            if (priceListId) {
               insertPriceListItem.run(
                 priceListId,
                 code,
                 name,
                 rate,
                 description,
                 regGroupNum,
                 regGroupName,
                 ratesJson,
                 unit
               );
               imported++;
               // Defer the `isMaster` service generation to after the loop so we can do the full mapping!
            } else {
              let existing: { id: number } | undefined = undefined;
              if (type === "HOME_CARE") {
                existing = db
                  .prepare(
                    "SELECT id FROM services WHERE code = ? AND type = ? AND name = ?",
                  )
                  .get(code, type, name) as any;
              } else {
                existing = db
                  .prepare("SELECT id FROM services WHERE code = ? AND type = ?")
                  .get(code, type) as any;
              }

              if (existing) {
                updateService.run(
                  code,
                  name,
                  rate,
                  description,
                  regGroupNum,
                  regGroupName,
                  ratesJson,
                  unit,
                  existing.id,
                );
                updated++;
              } else {
                insertService.run(
                  code,
                  name,
                  rate,
                  description,
                  regGroupNum,
                  regGroupName,
                  type,
                  ratesJson,
                  unit,
                );
                imported++;
              }
            }
          }
        })();

        if (priceListId && shouldBeMaster) {
           applyMasterPriceList(priceListId);
        }

        if (imported === 0 && updated === 0 && data.length > 0) {
          return res.json({
            success: false,
            error: `No valid rows found to import from ${data.length} rows. Seen headers: ${Object.keys(data[0]).join(", ")}`,
          });
        }

        res.json({ success: true, imported, updated });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/api/settings/price_lists", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const lists = db.prepare(`
        SELECT p.*, f.system_name, f.original_name
        FROM price_lists p
        LEFT JOIN files f ON p.file_id = f.id
        ORDER BY p.created_at DESC
      `).all();
      res.json(lists);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch price lists" });
    }
  });

  app.post("/api/settings/price_lists/archive", authenticateToken, requireAdmin, (req: any, res: any) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
      let priceListId: number;
      db.transaction(() => {
        const info = db.prepare("INSERT INTO price_lists (name, is_master) VALUES (?, 0)").run(name);
        priceListId = info.lastInsertRowid as number;

        const services = db.prepare("SELECT * FROM services WHERE type = 'NDIS'").all() as any[];
        const insertItem = db.prepare(
          "INSERT INTO price_list_items (price_list_id, code, name, rate, description, reg_group_number, reg_group_name, rates_json, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        for (const s of services) {
          insertItem.run(priceListId, s.code, s.name, s.rate, s.description, s.reg_group_number, s.reg_group_name, s.rates_json, s.unit);
        }
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to archive current pricing" });
    }
  });

  function applyMasterPriceList(id: number) {
    db.transaction(() => {
      // Archive all existing NDIS services first
      db.prepare("UPDATE services SET status = 'ARCHIVED' WHERE type = 'NDIS'").run();

      const items = db.prepare("SELECT * FROM price_list_items WHERE price_list_id = ?").all(id) as any[];
      const insertService = db.prepare(
        "INSERT INTO services (code, name, rate, description, reg_group_number, reg_group_name, type, rates_json, unit, status) VALUES (?, ?, ?, ?, ?, ?, 'NDIS', ?, ?, 'ACTIVE')"
      );

      const oldIdToNewId: Record<number, number> = {};

      for (const item of items) {
        // Get ALL old IDs for this code so any future shifts using an older ID get mapped
        const allExisting = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS'").all(item.code) as any[];
        
        const info = insertService.run(item.code, item.name, item.rate, item.description, item.reg_group_number, item.reg_group_name, item.rates_json, item.unit);
        const newId = info.lastInsertRowid as number;

        if (allExisting.length > 0 && newId) {
          for (const ex of allExisting) {
            oldIdToNewId[ex.id] = newId;
          }
        }
      }

      // Migrate active recurring templates and client budgets to use the new IDs
      
      // 1. client_services (Client special rates)
      const clientServices = db.prepare("SELECT client_id, service_id FROM client_services").all() as any[];
      const updateClientService = db.prepare("UPDATE client_services SET service_id = ? WHERE client_id = ? AND service_id = ?");
      for (const cs of clientServices) {
        if (oldIdToNewId[cs.service_id]) {
          updateClientService.run(oldIdToNewId[cs.service_id], cs.client_id, cs.service_id);
        }
      }

      // 2. ndis_service_agreement_items
      const agreementItems = db.prepare("SELECT id, service_id FROM ndis_service_agreement_items").all() as any[];
      const updateAgreementItem = db.prepare("UPDATE ndis_service_agreement_items SET service_id = ? WHERE id = ?");
      for (const ai of agreementItems) {
        if (oldIdToNewId[ai.service_id]) {
          updateAgreementItem.run(oldIdToNewId[ai.service_id], ai.id);
        }
      }

      // 3. client_roster_templates
      const templates = db.prepare("SELECT id, services_json FROM client_roster_templates").all() as any[];
      const updateTemplate = db.prepare("UPDATE client_roster_templates SET services_json = ? WHERE id = ?");
      for (const t of templates) {
        if (t.services_json) {
          try {
            const sData = JSON.parse(t.services_json);
            let changed = false;
            for (const s of sData) {
              if (s.serviceId && oldIdToNewId[s.serviceId]) {
                s.serviceId = oldIdToNewId[s.serviceId];
                changed = true;
              }
            }
            if (changed) {
              updateTemplate.run(JSON.stringify(sData), t.id);
            }
          } catch (e) {}
        }
      }

      // 4. Update DRAFT and PUBLISHED shifts that start on or after the effective date of the price list (or today if none)
      const pl = db.prepare("SELECT effective_date FROM price_lists WHERE id = ?").get(id) as any;
      const cutoffDate = pl?.effective_date || new Date().toISOString().split('T')[0];
      
      const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
      const settingsMap: Record<string, string> = {};
      settingsRows.forEach((r) => { settingsMap[r.key] = r.value; });
      const rawTz = settingsMap.timezone || "Australia/Perth";
      const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;
      
      const shiftDateFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const futureShifts = db.prepare("SELECT id, start_time, service_id, services_json FROM shifts WHERE status IN ('DRAFT', 'PUBLISHED')").all() as any[];
      const updateShift = db.prepare("UPDATE shifts SET services_json = ?, service_id = ? WHERE id = ?");
      for (const shift of futureShifts) {
        if (!shift.services_json) continue;
        
        const localParts = shiftDateFormatter.formatToParts(new Date(shift.start_time));
        const day = localParts.find((p) => p.type === "day")?.value;
        const month = localParts.find((p) => p.type === "month")?.value;
        const year = localParts.find((p) => p.type === "year")?.value;
        const localDateStr = `${year}-${month}-${day}`;
        
        if (localDateStr >= cutoffDate) {
          try {
            const sData = JSON.parse(shift.services_json);
            let changed = false;
            let newMainServiceId = shift.service_id;
            for (const s of sData) {
              if (s.serviceId && oldIdToNewId[s.serviceId]) {
                if (String(shift.service_id) === String(s.serviceId)) {
                  newMainServiceId = oldIdToNewId[s.serviceId];
                }
                s.serviceId = oldIdToNewId[s.serviceId];
                changed = true;
              }
            }
            if (changed) {
              updateShift.run(JSON.stringify(sData), newMainServiceId, shift.id);
            }
          } catch (e) {}
        }
      }

      db.prepare("UPDATE price_lists SET is_master = 0").run();
      db.prepare("UPDATE price_lists SET is_master = 1 WHERE id = ?").run(id);
    })();
  };

  app.post("/api/settings/price_lists/:id/make_master", authenticateToken, requireAdmin, (req: any, res: any) => {
    const { id } = req.params;
    try {
      applyMasterPriceList(id);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to apply master price list" });
    }
  });

  app.put("/api/settings/price_lists/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    const { id } = req.params;
    const { name, created_at, effective_date } = req.body;
    try {
      db.prepare(
        "UPDATE price_lists SET name = ?, created_at = ?, effective_date = ? WHERE id = ?"
      ).run(name, created_at || null, effective_date || null, id);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to update price list" });
    }
  });

  app.delete("/api/settings/price_lists/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    const { id } = req.params;
    try {
      const pl = db.prepare("SELECT is_master FROM price_lists WHERE id = ?").get(id) as any;

      db.transaction(() => {
        if (pl && pl.is_master) {
           db.prepare("UPDATE services SET status = 'ARCHIVED' WHERE type = 'NDIS'").run();
        }
        db.prepare("DELETE FROM price_list_items WHERE price_list_id = ?").run(id);
        db.prepare("DELETE FROM price_lists WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete price list" });
    }
  });

  app.get(
    "/api/reports/staff-activity",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        const { startDate, endDate, staffId } = req.query;
        const settingsMap: any = db
          .prepare("SELECT key, value FROM settings")
          .all()
          .reduce((acc: any, row: any) => {
            acc[row.key] =
              typeof row.value === "string" &&
              (row.value.startsWith("{") || row.value.startsWith("["))
                ? (() => {
                    try {
                      return JSON.parse(row.value);
                    } catch {
                      return row.value;
                    }
                  })()
                : row.value;
            return acc;
          }, {});

        let rawTz5 = settingsMap.timezone || "Australia/Perth";
        const timezone =
          typeof rawTz5 === "string" ? rawTz5.replace(/['"]+/g, "") : rawTz5;

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
          const endPlusOne = new Date(
            new Date(endDate).getTime() + 86400000,
          ).toISOString();
          query += ` AND s.start_time < ?`;
          params.push(endPlusOne);
        }
        if (staffId) {
          query += ` AND s.staff_id = ?`;
          params.push(staffId);
        }

        query += ` ORDER BY s.start_time DESC`;

        const shifts = db.prepare(query).all(...params) as any[];

        const hd = new Holidays("AU", "WA");

        const shiftDateFormatter = getSafeDateTimeFormat("en-AU", {
          timeZone: timezone,
          weekday: "long",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const ymdFormatter = getSafeDateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const timeFormatter = getSafeDateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
        });

        const totals: any = {
          weekdayHours: 0,
          saturdayHours: 0,
          sundayHours: 0,
          publicHolidayHours: 0,
          travelKm: 0,
          travelHrs: 0,
          providerTravelKm: 0,
          abtKm: 0,
          homeCareTravelTotal: 0,
        };

        const activityLog = shifts.flatMap((shift) => {
          let scheduledHrs =
            (new Date(shift.end_time).getTime() -
              new Date(shift.start_time).getTime()) /
            3600000;
          let hours = Math.max(0, scheduledHrs);
          if (shift.actual_start_time && shift.actual_finish_time) {
            let actualHrs =
              (new Date(shift.actual_finish_time).getTime() -
                new Date(shift.actual_start_time).getTime()) /
              3600000;
            if (actualHrs > 0.01) {
              hours = actualHrs;
            }
          }

          const rosterT = new Date(shift.start_time);

          let servicesArray: any[] = [];
          try {
            servicesArray = shift.services_json
              ? JSON.parse(shift.services_json)
              : [];
          } catch (e) {}

          let primaryQtyOverride: number | null = null;
          let serviceNamesList: string[] = [];

          if (servicesArray.length > 0) {
            for (const sData of servicesArray) {
              const srv = db
                .prepare("SELECT name FROM services WHERE id = ?")
                .get(sData.serviceId) as any;
              if (srv && srv.name) {
                const nameLower = srv.name.toLowerCase();
                // Do not list Provider Travel or ABT here; they get their own dedicated rows
                if (
                  !nameLower.includes("provider travel") &&
                  !nameLower.includes("activity based transport")
                ) {
                  if (!serviceNamesList.includes(srv.name)) {
                    serviceNamesList.push(srv.name);
                  }
                  if (
                    primaryQtyOverride === null &&
                    sData.qtyOverride !== undefined &&
                    sData.qtyOverride !== ""
                  ) {
                    primaryQtyOverride = Number(sData.qtyOverride);
                  }
                }
              }
            }
          }

          if (primaryQtyOverride !== null && primaryQtyOverride > 0) {
            hours = primaryQtyOverride;
          }

          const ymd = ymdFormatter.format(rosterT);
          const isPubHol = hd.isHoliday(new Date(ymd));

          const parts = shiftDateFormatter.formatToParts(rosterT);
          let weekdayStr =
            parts.find((p: any) => p.type === "weekday")?.value || "";

          let dayCategory = "Weekday";
          if (isPubHol && isPubHol.some((h: any) => h.type === "public")) {
            dayCategory = "Public Holiday";
            totals.publicHolidayHours += Math.max(0, scheduledHrs);
          } else if (weekdayStr === "Saturday") {
            dayCategory = "Saturday";
            totals.saturdayHours += Math.max(0, scheduledHrs);
          } else if (weekdayStr === "Sunday") {
            dayCategory = "Sunday";
            totals.sundayHours += Math.max(0, scheduledHrs);
          } else {
            totals.weekdayHours += Math.max(0, scheduledHrs);
          }

          let serviceProvided = shift.service_name || "";
          if (serviceNamesList.length > 0) {
            serviceProvided = serviceNamesList.join(", ");
          } else if (servicesArray.length > 0) {
            const primaryId = servicesArray[0]?.serviceId;
            if (primaryId && primaryId !== shift.service_id) {
              const mainSrv = db
                .prepare("SELECT name FROM services WHERE id = ?")
                .get(primaryId) as any;
              if (mainSrv) {
                serviceProvided = mainSrv.name;
              }
            }
          }

          const isHomeCare =
            shift.funding_type === "HCP" ||
            shift.funding_type === "Home Care" ||
            shift.funding_type === "HOME_CARE";

          let calculatedMins = shift.provider_travel_minutes || 0;
          if (isHomeCare && calculatedMins === 0 && shift.travel_breakdown) {
              try {
                  const breakdown = JSON.parse(shift.travel_breakdown);
                  for (const b of breakdown) {
                      const m = b.match(/\(([0-9.]+) mins\)/);
                      if (m) calculatedMins += parseFloat(m[1]);
                  }
                  if (calculatedMins > 0) {
                      try {
                          db.prepare("UPDATE shifts SET provider_travel_minutes = ? WHERE id = ?").run(calculatedMins, shift.id);
                      } catch(e) {}
                  }
              } catch(e) {}
          }

          const hc_travel_km = shift.respite_booking_id
            ? 0
            : shift.provider_travel_km || shift.home_care_travel_km || 0;
          const hc_travel_hrs = shift.respite_booking_id
            ? 0
            : calculatedMins / 60;
          const hc_travel_total = shift.respite_booking_id
            ? 0
            : shift.home_care_travel_total || 0;
          const prov_km = shift.respite_booking_id
            ? 0
            : shift.provider_travel_km || 0;
          const abt_km = shift.respite_booking_id ? 0 : shift.abt_km || 0;

          totals.travelKm += isHomeCare ? hc_travel_km : prov_km + abt_km;
          totals.travelHrs += isHomeCare ? hc_travel_hrs : 0;
          totals.providerTravelKm =
            (totals.providerTravelKm || 0) + (isHomeCare ? 0 : prov_km);
          totals.abtKm = (totals.abtKm || 0) + (isHomeCare ? 0 : abt_km);

          const rowProvReimbursement = parseFloat((prov_km * 0.99).toFixed(2));
          const rowAbtReimbursement = parseFloat((abt_km * 0.99).toFixed(2));
          const shiftTravelPay = isHomeCare
            ? 0
            : rowProvReimbursement + rowAbtReimbursement;
          totals.travelPayTotal = (totals.travelPayTotal || 0) + shiftTravelPay;

          const dayOnly = parts.find((p: any) => p.type === "day")?.value || "";
          const monthOnly =
            parts.find((p: any) => p.type === "month")?.value || "";
          const yearOnly =
            parts.find((p: any) => p.type === "year")?.value || "";
          const dayStr = `${weekdayStr} ${dayOnly}/${monthOnly}/${yearOnly}`;

          const timeStr = `${timeFormatter.format(new Date(shift.start_time))} - ${timeFormatter.format(new Date(shift.end_time))}`;

          const rows = [];

          rows.push({
            id: shift.id + "_base",
            dateAndDay: dayStr,
            timeString: timeStr,
            serviceProvided: serviceProvided,
            hoursWorked: parseFloat(hours.toFixed(2)),
            shiftDuration: parseFloat(scheduledHrs.toFixed(2)),
            dayCategory: dayCategory,
            travelKm: isHomeCare ? parseFloat(hc_travel_km.toFixed(2)) : 0,
            travelHours: isHomeCare
              ? parseFloat(hc_travel_hrs.toFixed(2))
              : undefined,
            travelReimbursement: undefined,
            providerTravelKm: 0,
            abtKm: 0,
            staffName: `${shift.staff_first_name} ${shift.staff_last_name}`,
            clientName: shift.client_first_name
              ? `${shift.client_first_name} ${shift.client_last_name || ""}`.trim()
              : "-",
          });

          if (!isHomeCare && prov_km > 0) {
            rows.push({
              id: shift.id + "_prov",
              dateAndDay: dayStr,
              timeString: "-", // Secondary travel item
              serviceProvided: "Provider Travel",
              hoursWorked: 0,
              shiftDuration: 0,
              dayCategory: dayCategory,
              travelKm: parseFloat(prov_km.toFixed(2)),
              travelHours: undefined,
              travelReimbursement: rowProvReimbursement,
              providerTravelKm: parseFloat(prov_km.toFixed(2)),
              abtKm: 0,
              staffName: `${shift.staff_first_name} ${shift.staff_last_name}`,
              clientName: shift.client_first_name
                ? `${shift.client_first_name} ${shift.client_last_name || ""}`.trim()
                : "-",
            });
          }

          if (!isHomeCare && abt_km > 0) {
            rows.push({
              id: shift.id + "_abt",
              dateAndDay: dayStr,
              timeString: "-", // Secondary transport item
              serviceProvided: "Activity Based Transport",
              hoursWorked: 0,
              shiftDuration: 0,
              dayCategory: dayCategory,
              travelKm: parseFloat(abt_km.toFixed(2)),
              travelHours: undefined,
              travelReimbursement: rowAbtReimbursement,
              providerTravelKm: 0,
              abtKm: parseFloat(abt_km.toFixed(2)),
              staffName: `${shift.staff_first_name} ${shift.staff_last_name}`,
              clientName: shift.client_first_name
                ? `${shift.client_first_name} ${shift.client_last_name || ""}`.trim()
                : "-",
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
            publicHolidayHours: parseFloat(
              totals.publicHolidayHours.toFixed(2),
            ),
            travelKm: parseFloat(totals.travelKm.toFixed(2)),
            travelHrs: parseFloat(totals.travelHrs.toFixed(2)),
            travelPayTotal: parseFloat((totals.travelPayTotal || 0).toFixed(2)),
          },
        });
      } catch (e: any) {
        logger.error(`Staff Activity Report Error: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Invoices APIs ---
  app.get("/api/invoices", authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT i.*, 
             COALESCE(s.start_time, rb.start_time) as start_time, 
             COALESCE(s.end_time, rb.end_time) as end_time, 
             COALESCE(s.notes, rb.notes) as shift_notes,
             c.first_name as client_first_name, c.last_name as client_last_name,
             COALESCE(s.custom_staff_name, u.first_name) as staff_first_name, 
             COALESCE(CASE WHEN s.custom_staff_name IS NOT NULL THEN '' ELSE u.last_name END, '') as staff_last_name,
             (((SELECT COUNT(*) FROM invoices sub WHERE sub.merged_into_shift_id = s.id OR sub.merged_into_invoice_id = i.id) > 0) OR i.services_json IS NOT NULL) as is_merged
      FROM invoices i
      LEFT JOIN shifts s ON i.shift_id = s.id
      LEFT JOIN respite_bookings rb ON i.respite_booking_id = rb.id
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users u ON s.staff_id = u.id
      WHERE i.merged_into_shift_id IS NULL AND i.merged_into_invoice_id IS NULL AND i.status != 'VOID'
      ORDER BY i.created_at DESC
    `;
    const invoices = db.prepare(query).all() as any[];

    // Auto-sync stale amounts from past generated invoices
    for (const inv of invoices) {
      let currentCalculatedAmount = inv.amount;
      if (inv.shift_id) {
        const data = getInvoiceDataForShift(inv.shift_id);
        if (data && data.totalAmount !== undefined)
          currentCalculatedAmount = data.totalAmount;
      } else if (inv.services_json) {
        const data = getInvoiceDataForMergedInvoice(inv);
        if (data && data.totalAmount !== undefined)
          currentCalculatedAmount = data.totalAmount;
      } else if (inv.respite_booking_id) {
        const data = getInvoiceDataForRespiteBooking(inv.respite_booking_id);
        if (data && data.totalAmount !== undefined)
          currentCalculatedAmount = data.totalAmount;
      }
      if (currentCalculatedAmount !== inv.amount) {
        try {
          db.prepare("UPDATE invoices SET amount = ? WHERE id = ?").run(
            currentCalculatedAmount,
            inv.id,
          );
          inv.amount = currentCalculatedAmount;
        } catch (e) {}
      }
    }

    // For respite bookings, staff_first_name and staff_last_name are null because there's no s.staff_id.
    // Fetch unique staff members from child shifts.
    for (const inv of invoices) {
      if (inv.respite_booking_id && !inv.staff_first_name) {
        const childStaff = db
          .prepare(
            `
             SELECT DISTINCT u.first_name, u.last_name
             FROM shifts s
             JOIN users u ON s.staff_id = u.id
             WHERE s.respite_booking_id = ?
          `,
          )
          .all(inv.respite_booking_id) as any[];

        if (childStaff.length > 0) {
          const names = childStaff
            .map((s) => `${s.first_name} ${s.last_name}`)
            .join(", ");
          // Since the table expects staff_first_name and staff_last_name to be merged, we just set `staff_first_name` to the merged string and leave `last_name` empty.
          inv.staff_first_name = names;
          inv.staff_last_name = "";
        }
      } else if (inv.services_json && !inv.staff_first_name) {
        try {
          const services = JSON.parse(inv.services_json);
          if (Array.isArray(services)) {
            const uniqueStaffs = Array.from(
              new Set(
                services
                  .map((s: any) => s.staffName)
                  .filter(
                    (name: any) =>
                      typeof name === "string" && name.trim().length > 0,
                  )
                  .map((name: any) => name.trim()),
              ),
            );
            if (uniqueStaffs.length > 0) {
              inv.staff_first_name = uniqueStaffs.join(", ");
              inv.staff_last_name = "";
            }
          }
        } catch (e) {
          console.error(
            "Failed to parse inv.services_json for staff names:",
            e,
          );
        }
      }
    }

    res.json(invoices);
  });

  app.get(
    "/api/invoices/form-data",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const clients = db
          .prepare(
            "SELECT id, first_name, last_name, funding_type FROM clients ORDER BY first_name ASC",
          )
          .all();
        const staff = db
          .prepare(
            "SELECT id, first_name, last_name FROM users WHERE role = 'STAFF' AND status = 'ACTIVE' ORDER BY first_name ASC",
          )
          .all();
        const services = db
          .prepare(
            "SELECT id, name, rate, unit, code, type, rates_json FROM services ORDER BY name ASC",
          )
          .all();

        const clientServices = db
          .prepare("SELECT * FROM client_services")
          .all();
        const clientsWithServices = (clients as any[]).map((c) => ({
          ...c,
          service_ids: clientServices
            .filter((cs: any) => cs.client_id === c.id)
            .map((cs: any) => cs.service_id),
          custom_rates: clientServices
            .filter((cs: any) => cs.client_id === c.id)
            .reduce((acc: any, cs: any) => {
              if (cs.custom_rate !== null && cs.custom_rate !== undefined) {
                acc[cs.service_id] = cs.custom_rate;
              }
              return acc;
            }, {}),
        }));

        res.json({ clients: clientsWithServices, staff, services });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/invoices/manual",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const {
        clientId,
        staffId,
        services,
        date,
        startTime,
        endTime,
        customStaffName,
      } = req.body;

      if (
        !clientId ||
        !staffId ||
        !services ||
        !Array.isArray(services) ||
        services.length === 0 ||
        !date ||
        !startTime ||
        !endTime
      ) {
        return res
          .status(400)
          .json({ error: "Missing required fields or services array" });
      }

      try {
        const startDateTime = `${date}T${startTime}:00`;
        let endDateTime = `${date}T${endTime}:00`;

        // If endTime is less than or equal to startTime, it means it crosses over midnight to the next day
        if (endTime <= startTime) {
          const [year, month, day] = date.split("-").map(Number);
          const nextDay = new Date(year, month - 1, day);
          nextDay.setDate(nextDay.getDate() + 1);
          const y = nextDay.getFullYear();
          const m = String(nextDay.getMonth() + 1).padStart(2, "0");
          const rDay = String(nextDay.getDate()).padStart(2, "0");
          const nextDayStr = `${y}-${m}-${rDay}`;
          endDateTime = `${nextDayStr}T${endTime}:00`;
        }

        // 1. Create a completed shift
        const isCustomStaff = staffId === "custom" || !staffId;
        const finalStaffId = isCustomStaff ? req.user.id : staffId;
        const finalCustomStaffName = isCustomStaff
          ? customStaffName || "Generic Staff"
          : null;

        const mainServiceId = services[0].isCustom
          ? null
          : services[0].serviceId;
        if (req.body.gstType && services.length > 0) {
          services[0].gstType = req.body.gstType;
        }
        const servicesJson = JSON.stringify(services);

        const shiftResult = db
          .prepare(
            `
        INSERT INTO shifts (client_id, staff_id, service_id, services_json, start_time, end_time, actual_finish_time, status, notes, custom_staff_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)
      `,
          )
          .run(
            clientId,
            finalStaffId,
            mainServiceId,
            servicesJson,
            startDateTime,
            endDateTime,
            endDateTime,
            "Manually generated invoice",
            finalCustomStaffName,
          );

        const shiftId = shiftResult.lastInsertRowid as number;

        // 2. Generate the invoice
        generateInvoiceForShift(shiftId);

        const invoice = db
          .prepare("SELECT * FROM invoices WHERE shift_id = ?")
          .get(shiftId);
        res.json({ success: true, invoice });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/invoices/merge",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { invoiceIds } = req.body;
      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length < 2) {
        return res
          .status(400)
          .json({ error: "Must provide at least two invoice IDs to merge" });
      }

      try {
        // Fetch all invoices
        const placeholders = invoiceIds.map(() => "?").join(",");
        const invoices = db
          .prepare(
            `SELECT * FROM invoices WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
          )
          .all(...invoiceIds) as any[];

        if (invoices.length !== invoiceIds.length) {
          return res
            .status(400)
            .json({ error: "Some invoices could not be found" });
        }

        // Ensure all invoices belong to the same client
        const clientId = invoices[0].client_id;
        if (!invoices.every((i) => i.client_id === clientId)) {
          return res.status(400).json({
            error: "All merged invoices must belong to the same client",
          });
        }

        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: Record<string, any> = {};
        settingsRows.forEach((r) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz6 = settingsMap.timezone || "Australia/Perth";
        const timezone =
          typeof rawTz6 === "string" ? rawTz6.replace(/['"]+/g, "") : rawTz6;

        const shiftDateFormatter = getSafeDateTimeFormat("en-GB", {
          timeZone: timezone,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeFormatter = getSafeDateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
        });

        const allMergedServices: any[] = [];

        for (const inv of invoices) {
          if (inv.services_json) {
            try {
              const servicesData = JSON.parse(inv.services_json);
              allMergedServices.push(...servicesData);
            } catch (e) {
              console.error(
                "[Merge] Failed to parse services_json on invoice ID:",
                inv.id,
                e,
              );
            }
          } else if (inv.shift_id) {
            const shift = db
              .prepare(
                `SELECT s.*, COALESCE(s.custom_staff_name, u.first_name) as s_fn, COALESCE(CASE WHEN s.custom_staff_name IS NOT NULL THEN '' ELSE u.last_name END, '') as s_ln FROM shifts s LEFT JOIN users u ON s.staff_id = u.id WHERE s.id = ?`,
              )
              .get(inv.shift_id) as any;
            if (!shift) continue;

            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            const hours = Math.abs(end.getTime() - start.getTime()) / 36e5;
            const shiftDateStr = shiftDateFormatter
              .format(start)
              .replace(/\//g, "-");
            const timeStr = `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
            const staffName = `${shift.s_fn || ""} ${shift.s_ln || ""}`.trim();

            let servicesData = [];
            if (shift.services_json) {
              try {
                servicesData = JSON.parse(shift.services_json);
              } catch (e) {}
            }

            if (servicesData.length > 0) {
              for (const sd of servicesData) {
                let finalQty = sd.qtyOverride;
                if (
                  finalQty === undefined ||
                  finalQty === null ||
                  finalQty === ""
                ) {
                  let srv = null;
                  if (
                    sd.isCustom ||
                    (sd.serviceId && String(sd.serviceId).startsWith("custom-"))
                  ) {
                    const unit = sd.customUnit || "Hour";
                    srv = { unit };
                  } else if (sd.serviceId) {
                    srv = db
                      .prepare("SELECT * FROM services WHERE id = ?")
                      .get(sd.serviceId) as any;
                  }
                  const unit = srv?.unit || "Hour";
                  finalQty = unit === "Hour" ? hours.toFixed(2) : "1";
                }

                allMergedServices.push({
                  ...sd,
                  qtyOverride: finalQty,
                  date: sd.date || shiftDateStr,
                  time: sd.time || timeStr,
                  staffName: sd.staffName || staffName,
                });
              }
            } else if (shift.service_id) {
              allMergedServices.push({
                serviceId: shift.service_id,
                qtyOverride: hours.toFixed(2),
                date: shiftDateStr,
                time: timeStr,
                staffName: staffName,
              });
            }
          }
        }

        if (allMergedServices.length === 0) {
          return res.status(400).json({
            error: "No billable services found in the selected invoices",
          });
        }

        let subtotal = 0;
        for (const sd of allMergedServices) {
          let srv = null;
          if (
            sd.isCustom ||
            (sd.serviceId && String(sd.serviceId).startsWith("custom-"))
          ) {
            srv = {
              rate: Number(sd.customRate || 0),
            };
          } else if (sd.serviceId) {
            srv = db
              .prepare("SELECT * FROM services WHERE id = ?")
              .get(sd.serviceId) as any;
          }
          let finalRate =
            sd.rateOverride !== undefined &&
            sd.rateOverride !== null &&
            sd.rateOverride !== ""
              ? Number(sd.rateOverride)
              : Number(srv?.rate || 0);
          let qty =
            sd.qtyOverride !== undefined &&
            sd.qtyOverride !== null &&
            sd.qtyOverride !== ""
              ? Number(sd.qtyOverride)
              : 1;
          subtotal += qty * finalRate;
        }

        // Fetch client funding type
        const clientRow = db
          .prepare("SELECT funding_type FROM clients WHERE id = ?")
          .get(clientId) as any;
        const clientFundingType = clientRow?.funding_type || "NDIS";
        const isHomeCare =
          clientFundingType === "HCP" ||
          clientFundingType === "Home Care" ||
          clientFundingType === "HOME_CARE";
        const gstAmount = isHomeCare ? subtotal * 0.1 : 0;
        const totalAmount = subtotal + gstAmount;

        db.transaction(() => {
          const insertResult = db
            .prepare(
              `
           INSERT INTO invoices (invoice_number, client_id, amount, status, services_json)
           VALUES (?, ?, ?, 'GENERATED', ?)
         `,
            )
            .run(
              `TEMP-MERGE-${Date.now()}`,
              clientId,
              totalAmount,
              JSON.stringify(allMergedServices),
            );

          const newInvoiceId = insertResult.lastInsertRowid as number;

          // Generate final distinct invoice number
          let invoicePrefix = isHomeCare
            ? settingsMap.hcInvoicePrefix
            : settingsMap.ndisInvoicePrefix;
          if (!invoicePrefix) {
            invoicePrefix = isHomeCare ? "HC-" : "INV-";
          }
          const today = new Date();
          const dateFormatter = getSafeDateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const yyyymmdd = dateFormatter.format(today).replace(/-/g, "");
          const invoiceNum = `${invoicePrefix}${yyyymmdd}-M${String(newInvoiceId).padStart(3, "0")}`;
          const fileName = `${invoiceNum}.pdf`;

          // Update the invoice row with invoice_number and file_path
          db.prepare(
            "UPDATE invoices SET invoice_number = ?, file_path = ? WHERE id = ?",
          ).run(invoiceNum, fileName, newInvoiceId);

          // Update old invoices to be VOID and link to the new invoice via merged_into_invoice_id
          db.prepare(
            `UPDATE invoices SET status = 'VOID', merged_into_invoice_id = ? WHERE id IN (${placeholders})`,
          ).run(newInvoiceId, ...invoiceIds);
        })();

        res.json({ success: true });
      } catch (e: any) {
        console.error(e);

        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/invoices/undo-merge/:id",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const mergedInvoiceId = parseInt(req.params.id);
      if (!mergedInvoiceId)
        return res.status(400).json({ error: "Invalid invoice ID" });

      try {
        db.transaction(() => {
          const invoice = db
            .prepare("SELECT * FROM invoices WHERE id = ?")
            .get(mergedInvoiceId) as any;
          if (!invoice) throw new Error("Invoice not found");

          const mergedShiftId = invoice.shift_id;

          // Restore old invoices
          if (invoice.services_json) {
            db.prepare(
              `UPDATE invoices SET status = 'GENERATED', merged_into_invoice_id = NULL WHERE merged_into_invoice_id = ?`,
            ).run(invoice.id);
          } else if (mergedShiftId) {
            db.prepare(
              `UPDATE invoices SET status = 'GENERATED', merged_into_shift_id = NULL WHERE merged_into_shift_id = ?`,
            ).run(mergedShiftId);
          }

          // Delete the merged invoice and shift
          db.prepare("DELETE FROM invoices WHERE id = ?").run(mergedInvoiceId);
          if (mergedShiftId) {
            db.prepare("DELETE FROM shifts WHERE id = ?").run(mergedShiftId);
          }
        })();
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put(
    "/api/invoices/:id/status",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { status } = req.body;
      const { id } = req.params;

      if (!status || !["GENERATED", "SENT", "PAID", "VOID"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      try {
        const oldInvoice = db
          .prepare("SELECT status, invoice_number FROM invoices WHERE id = ?")
          .get(id) as any;
        if (!oldInvoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        db.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(
          status,
          id,
        );

        if (oldInvoice.status === "PAID" && status !== "PAID") {
          const oldOriginalName = `${oldInvoice.invoice_number}.pdf`;
          const fileRecords = db
            .prepare(
              "SELECT id, system_name, folder_path FROM files WHERE original_name = ?",
            )
            .all(oldOriginalName) as any[];
          for (const fileRecord of fileRecords) {
            const sysFilePath = path.join(
              process.cwd(),
              "data",
              "uploads",
              fileRecord.system_name,
            );
            if (fs.existsSync(sysFilePath)) {
              fs.unlinkSync(sysFilePath);
            }
            db.prepare("DELETE FROM files WHERE id = ?").run(fileRecord.id);

            // Check if folder is now empty and delete if possible to clean up
            /* if needed, but not strictly required */
          }
        }

        if (status === "PAID") {
          const invoiceRow = db
            .prepare("SELECT * FROM invoices WHERE id = ?")
            .get(id) as any;
          if (invoiceRow) {
            let data: any = null;
            if (invoiceRow.services_json) {
              data = getInvoiceDataForMergedInvoice(invoiceRow);
            } else if (invoiceRow.respite_booking_id) {
              data = getInvoiceDataForRespiteBooking(
                invoiceRow.respite_booking_id,
              );
            } else if (invoiceRow.shift_id) {
              data = getInvoiceDataForShift(invoiceRow.shift_id);
            }

            if (data && data.lineItems && data.lineItems.length > 0) {
              const clientNameSafe = `${data.shift.c_fn} ${data.shift.c_ln}`
                .trim()
                .replace(/[\/\\]/g, "");
              const folderPath = `/Clients/${clientNameSafe}/Invoices`;

              let subfolder = folderPath;
              subfolder = path
                .normalize(subfolder)
                .replace(/^(\.\.[\/\\])+/, "");
              if (subfolder.startsWith("/")) {
                subfolder = subfolder.substring(1);
              }

              const rawSystemName = `${data.invoiceNum}.pdf`;
              const systemName = path.posix.join(subfolder, rawSystemName);

              const targetDir = path.join(process.cwd(), "data", "uploads", subfolder);
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
              }
              const filePath = path.join(targetDir, rawSystemName);

              const doc = new PDFDocument({ margin: 50 });
              const writeStream = fs.createWriteStream(filePath);
              doc.pipe(writeStream);
              buildInvoicePdf(doc, data);
              doc.end();

              writeStream.on("finish", () => {
                const stats = fs.statSync(filePath);
                try {
                  const stmt = db.prepare(
                    "INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)",
                  );
                  stmt.run(
                    `${data.invoiceNum}.pdf`,
                    systemName,
                    stats.size,
                    req.user.id,
                    folderPath,
                  );
                } catch (e) {
                  console.error("Failed to insert file record", e);
                }
              });
            }
          }
        }

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/invoices/:id",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        db.transaction(() => {
          // Restore any child invoices that were merged into this invoice which is now being deleted
          db.prepare(
            `UPDATE invoices SET status = 'GENERATED', merged_into_invoice_id = NULL WHERE merged_into_invoice_id = ?`,
          ).run(req.params.id);
          db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
        })();
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/invoices/bulk-delete",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { invoiceIds } = req.body;
      if (!invoiceIds || !Array.isArray(invoiceIds)) {
        return res.status(400).json({ error: "invoiceIds array required" });
      }
      if (invoiceIds.length === 0) {
        return res.json({ success: true });
      }

      try {
        const placeholders = invoiceIds.map(() => "?").join(",");
        db.transaction(() => {
          // Restore any child invoices that were merged into these invoices which are now being deleted
          for (const id of invoiceIds) {
            db.prepare(
              `UPDATE invoices SET status = 'GENERATED', merged_into_invoice_id = NULL WHERE merged_into_invoice_id = ?`,
            ).run(id);
          }
          db.prepare(`DELETE FROM invoices WHERE id IN (${placeholders})`).run(
            ...invoiceIds,
          );
        })();
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/invoices/pending-shifts",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
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
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/invoices/:shiftId/generate",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const shiftId = parseInt(req.params.shiftId);
      if (!shiftId) return res.status(400).json({ error: "Invalid shiftId" });
      try {
        generateInvoiceForShift(shiftId);
        const invoice = db
          .prepare("SELECT * FROM invoices WHERE shift_id = ?")
          .get(shiftId);
        if (invoice) {
          res.json({ success: true, invoice });
        } else {
          res.status(400).json({
            error:
              "Failed to generate invoice. Shift might not have cost-bearing items.",
          });
        }
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/invoices/respite/:respiteBookingId/generate",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const respiteBookingId = parseInt(req.params.respiteBookingId);
      if (!respiteBookingId)
        return res.status(400).json({ error: "Invalid respiteBookingId" });
      try {
        generateInvoiceForRespiteBooking(respiteBookingId);
        const invoice = db
          .prepare("SELECT * FROM invoices WHERE respite_booking_id = ?")
          .get(respiteBookingId);
        if (invoice) {
          res.json({ success: true, invoice });
        } else {
          res.status(400).json({
            error:
              "Failed to generate invoice. Respite booking might not have cost-bearing items.",
          });
        }
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  const buildInvoicePdf = (doc: any, data: any) => {
    const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal } =
      data;
    const isHomeCare =
      shift.funding_type === "HCP" ||
      shift.funding_type === "Home Care" ||
      shift.funding_type === "HOME_CARE";
    const gstAmount =
      data.gstAmount !== undefined
        ? data.gstAmount
        : isHomeCare
          ? subtotal * 0.1
          : 0;
    const totalAmount =
      data.totalAmount !== undefined ? data.totalAmount : subtotal + gstAmount;

    if (settingsMap.letterheadLogo) {
      try {
        let buffer: Buffer | null = null;

        if (settingsMap.letterheadLogo.startsWith("/api/assets/")) {
          const fileWithQuery = settingsMap.letterheadLogo.split("/").pop();
          const filename = fileWithQuery.split("?")[0]; // Strip the query params
          const persistentAssetPath = path.join(
            process.cwd(),
              "data",
              "uploads",
            "assets",
            filename,
          );
          const oldAssetPath = path.join(process.cwd(), "assets", filename);

          if (fs.existsSync(persistentAssetPath)) {
            buffer = fs.readFileSync(persistentAssetPath);
          } else if (fs.existsSync(oldAssetPath)) {
            buffer = fs.readFileSync(oldAssetPath);
          }
        } else if (settingsMap.letterheadLogo.startsWith("data:image/")) {
          const base64Data = settingsMap.letterheadLogo.replace(
            /^data:image\/\w+;base64,/,
            "",
          );
          buffer = Buffer.from(base64Data, "base64");
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
      doc.fontSize(14).text(settingsMap.businessName || "Happy in the Home");
      doc.fontSize(10).text(`ABN: ${settingsMap.abn || "12 345 678 910"}`);
      doc.text(settingsMap.businessAddress || "123 Care Lane, Sydney NSW 2000");
      doc.moveDown();
    }

    doc.fillColor("black");
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("TAX INVOICE", { align: "right" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice No: ${invoiceNum}`, { align: "right" });
    doc.text(`Date: ${invoiceDate}`, { align: "right" });
    doc.moveDown();

    const topY = 110;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text("FROM", 50, topY);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(settingsMap.businessName || "Happy in the Home", 50, topY + 15);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`ABN: ${settingsMap.abn || "12 345 678 910"}`, 50, topY + 30);
    doc.text(
      settingsMap.businessAddress || "123 Care Lane, Sydney NSW 2000",
      50,
      topY + 45,
    );
    const bizEmail = settingsMap.businessEmail || "";
    if (bizEmail) doc.text(bizEmail, 50, topY + 60);

    const billToLabel = isHomeCare ? "PROVIDER" : "PLAN MANAGER";
    let billToName = shift.plan_manager_name || `${shift.c_fn} ${shift.c_ln}`;
    let billToEmail = shift.plan_manager_email || "";
    let billToAddress = shift.plan_manager_address || "";

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text("BILL TO", 300, topY);
    doc.fontSize(12).text(`${shift.c_fn} ${shift.c_ln}`, 300, topY + 15);
    const ndisLabel = isHomeCare ? "Home Care ID:" : "NDIS No:";
    const ndisVal = shift.my_aged_care_id || shift.ndis_number;
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${ndisLabel} ${ndisVal || "N/A"}`, 300, topY + 30);

    doc.moveDown(1);
    const pmY = doc.y;
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(billToLabel, 300, pmY)
      .fillColor("black");
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(billToName, 300, pmY + 10);
    if (billToEmail) doc.text(billToEmail, 300, pmY + 22);
    if (billToAddress) doc.text(billToAddress, 300, pmY + 34);

    doc.moveDown(4);

    let currentY = Math.max(doc.y + 10, 250);

    // Table Header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("DATE", 50, currentY, { width: 60, align: "left" });
    doc.text("DESCRIPTION", 110, currentY, { width: 180, align: "left" });
    doc.text("TIME", 290, currentY, { width: 90, align: "left" });
    doc.text("QTY", 385, currentY, { width: 35, align: "right" });
    doc.text("UNIT", 425, currentY, { width: 55, align: "left" });
    doc.text("RATE", 485, currentY, { width: 45, align: "right" });
    doc.text("AMOUNT", 535, currentY, { width: 45, align: "right" });

    doc
      .moveTo(50, currentY + 15)
      .lineTo(580, currentY + 15)
      .stroke();

    currentY += 20;
    doc.font("Helvetica").fontSize(10);

    lineItems.forEach((item: any) => {
      let safeServiceName = item.serviceName || "Unknown Service";
      let textHeight =
        doc.heightOfString(safeServiceName, { width: 180 }) || 15;
      let blockHeight = textHeight + 20 + (item.metadata ? 12 : 0);

      // Automatically add page if the required height for this line item exceeds the margin
      if (currentY + blockHeight > 700) {
        doc.addPage();
        // Print Header again for the new page
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("DATE", 50, 50, { width: 60, align: "left" });
        doc.text("DESCRIPTION", 110, 50, { width: 180, align: "left" });
        doc.text("TIME", 290, 50, { width: 90, align: "left" });
        doc.text("QTY", 385, 50, { width: 35, align: "right" });
        doc.text("UNIT", 425, 50, { width: 55, align: "left" });
        doc.text("RATE", 485, 50, { width: 45, align: "right" });
        doc.text("AMOUNT", 535, 50, { width: 45, align: "right" });
        doc.moveTo(50, 65).lineTo(580, 65).stroke();
        currentY = 75;
      }

      doc.font("Helvetica").fontSize(10);
      doc.text(item.date, 50, currentY, { width: 60, align: "left" });

      doc
        .fontSize(9)
        .text(item.time, 290, currentY, { width: 90, align: "left" });
      doc.fontSize(10);

      // Calculate dynamic height for description block
      doc.text(safeServiceName, 110, currentY, { width: 180, align: "left" });

      let descY = currentY + textHeight + 2;
      const codePrefix =
        shift.funding_type === "HCP" ||
        shift.funding_type === "Home Care" ||
        shift.funding_type === "HOME_CARE"
          ? "Serv. ID:"
          : "Code:";
      doc.fontSize(9).text(`${codePrefix} ${item.code || "N/A"}`, 110, descY, {
        width: 180,
        align: "left",
      });

      if (item.metadata) {
        descY += 12;
        doc.text(item.metadata, 110, descY, { width: 180, align: "left" });
      }

      doc.fontSize(10);
      doc.text(item.qty.toString(), 385, currentY, {
        width: 35,
        align: "right",
      });
      doc.text(item.unit, 425, currentY, { width: 55, align: "left" });
      doc.text(`$${item.rate.toFixed(2)}`, 485, currentY, {
        width: 45,
        align: "right",
      });
      doc.text(`$${item.amount.toFixed(2)}`, 535, currentY, {
        width: 45,
        align: "right",
      });

      // Dynamic Row Height: increment currentY by that height plus a 5pt buffer
      doc
        .moveTo(50, descY + 15)
        .lineTo(580, descY + 15)
        .stroke();
      currentY = descY + 20;
    });

    let totalsY = currentY + 30;

    if (totalsY + 100 > 700) {
      doc.addPage();
      totalsY = 50;
    }

    let bankName = "National Australia Bank";
    let bankAccName = "Happy in the Home";
    let bankBsb = "086-554";
    let bankAcc = "506627847";
    try {
      if (settingsMap.bankName) bankName = settingsMap.bankName;
      if (settingsMap.bankAccountName)
        bankAccName = settingsMap.bankAccountName;
      if (settingsMap.bankBsb) bankBsb = settingsMap.bankBsb;
      if (settingsMap.bankAcc) bankAcc = settingsMap.bankAcc;
    } catch (e) {
      if (
        e.message &&
        !e.message.includes("duplicate column") &&
        !e.message.includes("no such column")
      )
        logger.warn("Migration/Query warning:", e.message);
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("PAYMENT DETAILS", 50, totalsY);
    doc.font("Helvetica").text(`Bank: ${bankName}`, 50, totalsY + 15);
    doc.text(`Account: ${bankAccName}`, 50, totalsY + 27);
    doc.text(`BSB: ${bankBsb}`, 50, totalsY + 39);
    doc.text(`Acc No: ${bankAcc}`, 50, totalsY + 51);
    doc
      .font("Helvetica-Bold")
      .text(`Reference: ${invoiceNum}`, 50, totalsY + 67);

    doc.font("Helvetica");
    doc.text("Subtotal:", 380, totalsY + 15, { width: 100, align: "right" });
    doc.text(`$${subtotal.toFixed(2)}`, 480, totalsY + 15, {
      width: 70,
      align: "right",
    });

    if (gstAmount > 0) {
      doc.text("GST (10%):", 380, totalsY + 30, { width: 100, align: "right" });
      doc.text(`$${gstAmount.toFixed(2)}`, 480, totalsY + 30, {
        width: 70,
        align: "right",
      });
    } else {
      doc.text("GST (GST-Free):", 380, totalsY + 30, {
        width: 100,
        align: "right",
      });
      doc.text("$0.00", 480, totalsY + 30, { width: 70, align: "right" });
    }

    doc
      .moveTo(380, totalsY + 45)
      .lineTo(550, totalsY + 45)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("TOTAL AMOUNT:", 350, totalsY + 55, {
      width: 130,
      align: "right",
    });
    doc.text(`$${totalAmount.toFixed(2)}`, 480, totalsY + 55, {
      width: 70,
      align: "right",
    });

    doc.moveDown(4);
    let paymentDueDays = settingsMap.paymentDueDays || 14;
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `THANK YOU FOR YOUR BUSINESS. PAYMENT IS DUE WITHIN ${paymentDueDays} DAYS.`,
        50,
        doc.y,
        { align: "center" },
      );
  };

  app.get(
    "/api/invoices/:id/download-by-id",
    authenticateToken,
    (req: any, res: any) => {
      const invoiceId = parseInt(req.params.id);
      if (!invoiceId)
        return res.status(400).json({ error: "Invalid invoiceId" });

      try {
        const invoiceRow = db
          .prepare("SELECT * FROM invoices WHERE id = ?")
          .get(invoiceId) as any;
        if (!invoiceRow)
          return res.status(404).json({ error: "Invoice not found" });

        let data: any = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });
        if (data.lineItems.length === 0)
          return res.status(400).json({ error: "No billable items" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${data.invoiceNum}.pdf"`,
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        buildInvoicePdf(doc, data);

        doc.end();
      } catch (e: any) {
        console.error("Failed to generate dynamic invoice:", e);
        if (!res.headersSent)
          logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/invoices/:shiftId/download",
    authenticateToken,
    (req: any, res: any) => {
      const shiftId = parseInt(req.params.shiftId);
      if (!shiftId) return res.status(400).json({ error: "Invalid shiftId" });

      try {
        const data = getInvoiceDataForShift(shiftId);
        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });
        if (data.lineItems.length === 0)
          return res.status(400).json({ error: "No billable items" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${data.invoiceNum}.pdf"`,
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        buildInvoicePdf(doc, data);

        doc.end();
      } catch (e: any) {
        console.error("Failed to generate dynamic invoice:", e);
        if (!res.headersSent)
          logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/invoices/download/:filename",
    authenticateToken,
    (req: any, res: any) => {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "data", "invoices", filename);
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).json({ error: "Invoice PDF not found" });
      }
    },
  );

  // --- Files APIs ---
  // --- Quotes APIs ---
  app.get("/api/quotes", authenticateToken, (req: any, res: any) => {
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
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post(
    "/api/quotes",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { clientId, activityName, date, endDate, services, importantNotes } =
        req.body;
      try {
        const prefix = "QUO";
        const c = db
          .prepare("SELECT first_name FROM clients WHERE id = ?")
          .get(clientId) as any;
        const cInitial = c ? c.first_name.substring(0, 3).toUpperCase() : "XXX";
        const dateStr = date.replace(/-/g, "").substring(4, 8);
        const timestampPart = Date.now().toString().slice(-3);
        const quoteNumber = `${prefix}-${cInitial}-${dateStr}-${timestampPart}`;

        // Calculate amount based on services map
        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: Record<string, any> = {};
        settingsRows.forEach((r) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });

        let rawTzQuote = settingsMap.timezone || "Australia/Perth";
        const timezone =
          typeof rawTzQuote === "string"
            ? rawTzQuote.replace(/['"]+/g, "")
            : rawTzQuote;

        let calculatedAmount = 0;
        const parsedDate = new Date(date);
        const dayOfWeek = getTzDayOfWeek(parsedDate, timezone);

        if (services && Array.isArray(services)) {
          if (services.length > 0) {
            if (req.body.gstType) {
              services[0].gstType = req.body.gstType;
            }
            if (req.body.date) {
              services[0].startDate = req.body.date;
            }
            if (req.body.endDate) {
              services[0].endDate = req.body.endDate;
            }
          }

          services.forEach((sd) => {
            const srv = db
              .prepare("SELECT * FROM services WHERE id = ?")
              .get(sd.serviceId) as any;
            if (srv) {
              let qty = sd.qtyOverride ? Number(sd.qtyOverride) : 0;
              let finalRate = Number(srv.rate || 0);
              if (srv.type === "HOME_CARE" && srv.rates_json) {
                try {
                  const rates = JSON.parse(srv.rates_json);
                  if (dayOfWeek === 0 && rates["Sunday"])
                    finalRate = Number(rates["Sunday"]);
                  else if (dayOfWeek === 6 && rates["Saturday"])
                    finalRate = Number(rates["Saturday"]);
                  else if (rates["Weekday"])
                    finalRate = Number(rates["Weekday"]);
                } catch (e) {
                  if (
                    e.message &&
                    !e.message.includes("duplicate column") &&
                    !e.message.includes("no such column")
                  )
                    logger.warn("Migration/Query warning:", e.message);
                }
              } else if (srv.type === "NDIS" && srv.rates_json) {
                try {
                  const rates = JSON.parse(srv.rates_json);
                  const region = settingsMap.ndisRegion || "NSW";
                  if (rates[region] !== undefined)
                    finalRate = Number(rates[region]);
                } catch (e) {
                  if (
                    e.message &&
                    !e.message.includes("duplicate column") &&
                    !e.message.includes("no such column")
                  )
                    logger.warn("Migration/Query warning:", e.message);
                }
              }

              if (
                sd.rateOverride !== undefined &&
                sd.rateOverride !== null &&
                sd.rateOverride !== ""
              ) {
                finalRate = Number(sd.rateOverride);
              }

              calculatedAmount += qty * finalRate;
            }
          });
        }

        if (req.body.gstType === "10%") {
          calculatedAmount = calculatedAmount * 1.1; // Add GST
        }

        const stmt = db.prepare(`
        INSERT INTO quotes (quote_number, client_id, activity_name, activity_date, services_json, amount, status, important_notes)
        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?)
      `);
        stmt.run(
          quoteNumber,
          clientId,
          activityName,
          date,
          JSON.stringify(services || []),
          calculatedAmount,
          importantNotes || null,
        );

        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete(
    "/api/quotes/:id",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        db.prepare("DELETE FROM quotes WHERE id = ?").run(req.params.id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/quotes/bulk-delete",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { quoteIds } = req.body;
      if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0)
        return res.json({ success: true });
      try {
        const placeholders = quoteIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM quotes WHERE id IN (${placeholders})`).run(
          ...quoteIds,
        );
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/quotes/:id/download",
    authenticateToken,
    (req: any, res: any) => {
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
        if (!quote) return res.status(404).json({ error: "Quote not found" });

        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((row) => {
          try {
            settingsMap[row.key] = JSON.parse(row.value);
          } catch {
            settingsMap[row.key] = row.value;
          }
        });

        let rawTz7 = settingsMap.timezone || "Australia/Perth";
        const timezone =
          typeof rawTz7 === "string" ? rawTz7.replace(/['"]+/g, "") : rawTz7;
        const dateFormatter = getSafeDateTimeFormat("en-GB", {
          timeZone: timezone,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        let quoteDateStr = "";
        try {
          const createdAtDate = quote.created_at ? new Date(quote.created_at.replace(" ", "T") + (quote.created_at.includes("Z") ? "" : "Z")) : new Date();
          quoteDateStr = dateFormatter
            .format(createdAtDate)
            .replace(/\//g, "-");
        } catch (e) {
          quoteDateStr = dateFormatter.format(new Date()).replace(/\//g, "-");
        }

        let servicesData: any[] = [];
        try {
          if (quote.services_json)
            servicesData = JSON.parse(quote.services_json);
        } catch (e: any) {
          if (
            e.message &&
            !e.message.includes("duplicate column") &&
            !e.message.includes("no such column")
          )
            logger.warn("Migration/Query warning:", e.message);
        }

        let activityDateStr = "";
        try {
          activityDateStr = dateFormatter
            .format(new Date(quote.activity_date))
            .replace(/\//g, "-");
          if (servicesData.length > 0 && servicesData[0].endDate) {
             const endStr = dateFormatter.format(new Date(servicesData[0].endDate)).replace(/\//g, "-");
             activityDateStr = `${activityDateStr} to ${endStr}`;
          }
        } catch (e) {
          activityDateStr = String(quote.activity_date);
        }

        let paymentDueDays = 14;
        try {
           paymentDueDays = settingsMap.paymentDueDays ? parseInt(settingsMap.paymentDueDays) : 14;
           if (isNaN(paymentDueDays)) paymentDueDays = 14;
        } catch(e) {}
        
        let validUntilStr = "";
        try {
           const d = quote.created_at ? new Date(quote.created_at.replace(" ", "T") + (quote.created_at.includes("Z") ? "" : "Z")) : new Date();
           d.setDate(d.getDate() + paymentDueDays);
           validUntilStr = dateFormatter.format(d).replace(/\//g, "-");
        } catch(e) {
           validUntilStr = quoteDateStr;
        }

        const parsedDate = new Date(quote.activity_date || Date.now());
        const dayOfWeek = isNaN(parsedDate.getTime())
          ? 1
          : getTzDayOfWeek(parsedDate, timezone);
        let subtotal = 0;
        let lineItems: any[] = [];

        let gstTypeFromMeta: string | null = null;
        if (servicesData.length > 0) {
          if (servicesData[0].gstType) {
            gstTypeFromMeta = servicesData[0].gstType;
          }

          servicesData.forEach((sd) => {
            const srv = db
              .prepare("SELECT * FROM services WHERE id = ?")
              .get(sd.serviceId) as any;
            if (srv) {
              let qty = sd.qtyOverride ? Number(sd.qtyOverride) : 0;
              let finalRate = Number(srv.rate || 0);
              if (srv.type === "HOME_CARE" && srv.rates_json) {
                try {
                  const rates = JSON.parse(srv.rates_json);
                  if (dayOfWeek === 0 && rates["Sunday"])
                    finalRate = Number(rates["Sunday"]);
                  else if (dayOfWeek === 6 && rates["Saturday"])
                    finalRate = Number(rates["Saturday"]);
                  else if (rates["Weekday"])
                    finalRate = Number(rates["Weekday"]);
                } catch (e) {
                  if (
                    e.message &&
                    !e.message.includes("duplicate column") &&
                    !e.message.includes("no such column")
                  )
                    logger.warn("Migration/Query warning:", e.message);
                }
              } else if (srv.type === "NDIS" && srv.rates_json) {
                try {
                  const rates = JSON.parse(srv.rates_json);
                  const region = settingsMap.ndisRegion || "NSW";
                  if (rates[region] !== undefined)
                    finalRate = Number(rates[region]);
                } catch (e) {
                  if (
                    e.message &&
                    !e.message.includes("duplicate column") &&
                    !e.message.includes("no such column")
                  )
                    logger.warn("Migration/Query warning:", e.message);
                }
              }
              if (
                sd.rateOverride !== undefined &&
                sd.rateOverride !== null &&
                sd.rateOverride !== ""
              ) {
                finalRate = Number(sd.rateOverride);
              }
              const amt = qty * finalRate;
              subtotal += amt;
              let mappedUnit = srv.unit || "H";
              if (mappedUnit === "Hour") mappedUnit = "H";
              if (mappedUnit === "KM") mappedUnit = "Kilometre";

              lineItems.push({
                desc: srv.name,
                code: srv.code || "N/A",
                qty: qty,
                unit: mappedUnit,
                rate: finalRate,
                amount: amt,
              });
            }
          });
        }

        let gstAmount = 0;
        if (gstTypeFromMeta === "10%") {
          gstAmount = subtotal * 0.1;
        }
        const totalAmount = subtotal + gstAmount;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${quote.quote_number}.pdf"`,
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        if (settingsMap.letterheadLogo) {
          try {
            let buffer: Buffer | null = null;
            if (settingsMap.letterheadLogo.startsWith("/api/assets/")) {
              const fileWithQuery = settingsMap.letterheadLogo.split("/").pop();
              const filename = fileWithQuery.split("?")[0];
              const persistentAssetPath = path.join(
                process.cwd(),
              "data",
              "uploads",
                "assets",
                filename,
              );
              const oldAssetPath = path.join(process.cwd(), "assets", filename);
              if (fs.existsSync(persistentAssetPath)) {
                buffer = fs.readFileSync(persistentAssetPath);
              } else if (fs.existsSync(oldAssetPath)) {
                buffer = fs.readFileSync(oldAssetPath);
              }
            } else if (settingsMap.letterheadLogo.startsWith("data:image/")) {
              const base64Data = settingsMap.letterheadLogo.replace(
                /^data:image\/\w+;base64,/,
                "",
              );
              buffer = Buffer.from(base64Data, "base64");
            }
            if (buffer) {
              doc.image(buffer, 450, 40, { fit: [100, 70], align: "right" });
            }
          } catch (e) {
            console.error("Logo render error:", e);
          }
        }

        doc
          .fontSize(24)
          .font("Helvetica-Bold")
          .fillColor("#18181b")
          .text("SERVICE QUOTE", 50, 50);
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#52525b")
          .text(settingsMap.businessName || "Happy in the Home", 50, 80);
        doc.moveDown(2);

        const topY = 130;
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor("black")
          .text("From:", 50, topY);
          
        const fromLines: string[] = [];
        fromLines.push(settingsMap.businessName || "Happy in the Home");
        if (settingsMap.businessPhone && settingsMap.businessPhone.trim() !== "0400000000" && settingsMap.businessPhone.trim() !== "") {
          fromLines.push(settingsMap.businessPhone.trim());
        }
        fromLines.push(settingsMap.businessEmail || "info@happyinthehome.org");
        fromLines.push(settingsMap.businessAddress || "123 Care Lane, Sydney NSW 2000");
        fromLines.push(`ABN: ${settingsMap.abn || "12 345 678 910"}`);

        doc.fontSize(10).font("Helvetica");
        fromLines.forEach((line, idx) => {
          doc.text(line, 50, topY + 15 + (idx * 15));
        });

        doc
          .font("Helvetica-Bold")
          .text("Quote Date: ", 350, topY)
          .font("Helvetica")
          .text(quoteDateStr, 420, topY);
        doc
          .font("Helvetica-Bold")
          .text("Quote ID: ", 350, topY + 15)
          .font("Helvetica")
          .text(quote.quote_number, 405, topY + 15);
        doc
          .font("Helvetica-Bold")
          .text("Valid Until: ", 350, topY + 30)
          .font("Helvetica")
          .text(validUntilStr, 415, topY + 30);

        // Participant Details Box
        const partY = 230;
        doc.rect(50, partY, 4, 70).fill("#0ea5e9"); // Cyan left border
        doc.fillColor("black");
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#0ea5e9")
          .text("Participant Details", 65, partY + 5);
        doc.fillColor("black").fontSize(10);
        doc
          .font("Helvetica-Bold")
          .text("Name: ", 65, partY + 25, { continued: true })
          .font("Helvetica")
          .text(`${quote.c_fn || ""} ${quote.c_ln || ""}`.trim() || "N/A");
        doc
          .font("Helvetica-Bold")
          .text("Service Activity: ", 65, partY + 40, { continued: true })
          .font("Helvetica")
          .text(quote.activity_name || "");
        doc
          .font("Helvetica-Bold")
          .text("Date of Activity: ", 65, partY + 55, { continued: true })
          .font("Helvetica")
          .text(activityDateStr);

        let currentY = 330;

        // Table Header
        doc.rect(50, currentY, 500, 25).fill("#f4f4f5"); // Light gray bg for header
        doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(9);
        doc.text("Description", 60, currentY + 8, {
          width: 180,
          align: "left",
        });
        doc.text("NDIS Code", 250, currentY + 8, { width: 100, align: "left" });
        doc.text("Quantity", 350, currentY + 8, { width: 50, align: "center" });
        doc.text("Rate", 410, currentY + 8, { width: 50, align: "right" });
        doc.text("Total", 480, currentY + 8, { width: 60, align: "right" });

        doc
          .moveTo(50, currentY + 25)
          .lineTo(550, currentY + 25)
          .strokeColor("#e4e4e7")
          .stroke();

        currentY += 35;
        doc.font("Helvetica").fontSize(9);

        lineItems.forEach((item: any) => {
          let textHeight =
            doc.heightOfString(item.desc || "Unknown", { width: 180 }) || 15;
          let blockHeight = Math.max(textHeight, 15) + 20;

          if (currentY + blockHeight > 700) {
            doc.addPage();
            currentY = 50;
          }

          doc.fillColor("#18181b");
          doc.text(item.desc || "Unknown", 60, currentY, {
            width: 180,
            align: "left",
          });
          doc.text(item.code || "N/A", 250, currentY, {
            width: 100,
            align: "left",
          });

          // Quantity & Unit
          doc.text(String(item.qty || 0), 350, currentY, {
            width: 50,
            align: "center",
          });
          doc
            .fillColor("#71717a")
            .fontSize(8)
            .text(item.unit || "", 350, currentY + 12, {
              width: 50,
              align: "center",
            });

          doc.fillColor("#18181b").fontSize(9);
          doc.text(`$${item.rate.toFixed(2)}`, 410, currentY, {
            width: 50,
            align: "right",
          });
          doc.text(`$${item.amount.toFixed(2)}`, 480, currentY, {
            width: 60,
            align: "right",
          });

          currentY += textHeight + 10;
          doc
            .moveTo(50, currentY)
            .lineTo(550, currentY)
            .strokeColor("#e4e4e7")
            .stroke();
          currentY += 10;
        });

        if (currentY + 70 > 700) {
          doc.addPage();
          currentY = 50;
        } else {
          currentY += 10;
        }

        // Total Box
        doc.rect(50, currentY, 500, 60).fill("#f4f4f5");

        doc.fillColor("#71717a").font("Helvetica").fontSize(10);
        doc.text("Subtotal:", 250, currentY + 10, {
          width: 150,
          align: "right",
        });
        doc.text(`$${subtotal.toFixed(2)}`, 410, currentY + 10, {
          width: 120,
          align: "right",
        });

        doc.text(`GST:`, 250, currentY + 25, { width: 150, align: "right" });
        doc.text(`$${gstAmount.toFixed(2)}`, 410, currentY + 25, {
          width: 120,
          align: "right",
        });

        doc.fillColor("black").font("Helvetica-Bold").fontSize(12);
        doc.text("TOTAL QUOTE AMOUNT:", 200, currentY + 42, {
          width: 200,
          align: "right",
        });
        doc
          .fontSize(14)
          .text(`$${totalAmount.toFixed(2)}`, 410, currentY + 41, {
            width: 120,
            align: "right",
          });

        currentY += 90;

        // Important Notes
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("black")
          .text("Important Notes", 50, currentY);
        currentY += 20;
        doc
          .moveTo(50, currentY)
          .lineTo(550, currentY)
          .strokeColor("#e4e4e7")
          .stroke();
        currentY += 10;

        doc.font("Helvetica").fontSize(9).fillColor("#52525b");
        const defaultNotes =
          "Remote Billing: This quote is calculated using the NDIS Price Guide for Remote (MMM 6) locations.\n" +
          "Transport: Final transport billing will be based on verified logbook odometer readings at a rate of $1.00 per kilometer.\n" +
          "Exclusions: NDIS funding does not cover personal expenses such as meals, snacks, or activity entry fees. These are out-of-pocket costs for the participant.\n" +
          "Cancellations: Charges for cancellations will be applied in accordance with the current NDIS Pricing Arrangements and Price Limits.";

        const customNotes = quote.important_notes
          ? quote.important_notes.trim()
          : "";
        const notes = customNotes !== "" ? customNotes : defaultNotes;

        notes.split("\n").forEach((line: string) => {
          doc.text(line, 50, currentY, { width: 500 });
          currentY += doc.heightOfString(line, { width: 500 }) + 5;
        });

        doc.end();
      } catch (e: any) {
        console.error("DEBUG QUOTE DOWNLOAD ERROR:", e);

        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/api/files", authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT f.*, u.first_name, u.last_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
    `;
    if (req.user.role !== "ADMIN") {
      query += " WHERE f.uploaded_by = ?";
      const files = db.prepare(query).all(req.user.id);
      return res.json(files);
    }
    const files = db.prepare(query).all();
    res.json(files);
  });

  app.post(
    "/api/files",
    authenticateToken,
    upload.single("file"),
    (req: any, res: any) => {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      let folderPath = req.query.folderPath || "/";
      const dateIssued = req.body.date_issued || null;
      const dateExpires = req.body.date_expires || null;

      let targetUserId = req.user.id;
      if (req.user.role === "ADMIN" && req.body.targetUserId) {
        targetUserId = req.body.targetUserId;
      }

      if (req.body.context === "STAFF_ONBOARDING") {
        try {
          const targetUser = db
            .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
            .get(targetUserId) as { first_name: string; last_name: string };
          if (targetUser) {
            const name = [targetUser.first_name, targetUser.last_name]
              .filter(Boolean)
              .join(" ")
              .trim()
              .replace(/[\/\\]/g, "");
            folderPath = `/Staff/${name ? `${name}/` : ""}Onboarding`;
          }
        } catch (err: any) {
          logger.error(
            `Failed to lookup targetUser for folder path: ${err.message}`,
          );
        }
      }

      let subfolder = (folderPath as string).trim();
      subfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, "");
      if (subfolder.startsWith("/")) {
        subfolder = subfolder.substring(1);
      }

      const initialSubfolderRaw = (req.query.folderPath as string) || "/";
      let initialSubfolder = initialSubfolderRaw.trim();
      initialSubfolder = path
        .normalize(initialSubfolder)
        .replace(/^(\.\.[\/\\])+/, "");
      if (initialSubfolder.startsWith("/")) {
        initialSubfolder = initialSubfolder.substring(1);
      }

      const initialSystemName =
        initialSubfolder && initialSubfolder !== "."
          ? path.posix.join(initialSubfolder, req.file.filename)
          : req.file.filename;
      const actualSystemName =
        subfolder && subfolder !== "."
          ? path.posix.join(subfolder, req.file.filename)
          : req.file.filename;

      if (initialSystemName !== actualSystemName) {
        const initialFilePath = path.join(
          process.cwd(),
              "data",
              "uploads",
          initialSystemName,
        );
        const actualDirPath = path.join(process.cwd(), "data", "uploads", subfolder);
        const actualFilePath = path.join(actualDirPath, req.file.filename);
        if (fs.existsSync(initialFilePath)) {
          if (!fs.existsSync(actualDirPath))
            fs.mkdirSync(actualDirPath, { recursive: true });
          fs.renameSync(initialFilePath, actualFilePath);
        }
      }

      const systemName = actualSystemName;

      try {
        const stmt = db.prepare(
          "INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) VALUES (?, ?, ?, ?, ?, ?, ?)",
        );
        const info = stmt.run(
          req.file.originalname,
          systemName,
          req.file.size,
          targetUserId,
          folderPath,
          dateIssued,
          dateExpires,
        );

        // Clear notifications immediately upon successful document renewal/upload
        db.prepare(
          `DELETE FROM notifications WHERE user_id = ? AND type IN ('DOCUMENT_EXPIRED', 'DOCUMENT_EXPIRING_SOON')`,
        ).run(targetUserId);

        res.json({
          success: true,
          id: info.lastInsertRowid,
          date_issued: dateIssued,
          date_expires: dateExpires,
        });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.put("/api/files/:id", authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    const { date_issued, date_expires } = req.body;
    try {
      const file = db
        .prepare("SELECT id, uploaded_by FROM files WHERE id = ?")
        .get(id) as any;
      if (!file) return res.status(404).json({ error: "File not found" });

      if (req.user.role !== "ADMIN" && file.uploaded_by !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      db.prepare(
        "UPDATE files SET date_issued = ?, date_expires = ? WHERE id = ?",
      ).run(date_issued || null, date_expires || null, id);

      // Clear notifications for this doc if it was updated
      db.prepare(
        `DELETE FROM notifications WHERE user_id = ? AND type IN ('DOCUMENT_EXPIRED', 'DOCUMENT_EXPIRING_SOON')`,
      ).run(file.uploaded_by);

      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get(
    "/api/files/download/:id",
    authenticateToken,
    (req: any, res: any) => {
      const { id } = req.params;
      const preview = req.query.preview === "true";
      try {
        const file = db
          .prepare("SELECT * FROM files WHERE id = ?")
          .get(id) as any;
        if (!file) return res.status(404).json({ error: "File not found" });

        // Basic security for non-admins
        if (req.user.role !== "ADMIN" && file.uploaded_by !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }

        const filePath = path.join(process.cwd(), "data", "uploads", file.system_name);
        if (fs.existsSync(filePath)) {
          if (preview) {
            if (file.mime_type) {
              res.setHeader("Content-Type", file.mime_type);
            }
            res.sendFile(filePath);
          } else {
            res.download(filePath, file.original_name);
          }
        } else {
          res.status(404).json({ error: "File on disk not found" });
        }
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.post(
    "/api/admin/migrate-files",
    authenticateToken,
    (req: any, res: any) => {
      if (req.user.role !== "ADMIN")
        return res.status(403).json({ error: "Requires admin privileges" });

      try {
        const files = db
          .prepare("SELECT id, system_name, folder_path FROM files")
          .all() as any[];
        let migrated = 0;

        for (const file of files) {
          if (
            !file.folder_path ||
            file.folder_path === "/" ||
            file.folder_path.trim() === ""
          ) {
            continue;
          }

          let subfolder = file.folder_path.trim();
          subfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, "");
          if (subfolder.startsWith("/")) {
            subfolder = subfolder.substring(1);
          }

          if (
            file.system_name.startsWith(subfolder + "/") ||
            file.system_name.startsWith(subfolder + "\\")
          ) {
            continue;
          }

          const currentFilePath = path.join(
            process.cwd(),
              "data",
              "uploads",
            file.system_name,
          );
          const targetDir = path.join(process.cwd(), "data", "uploads", subfolder);
          const targetFilePath = path.join(targetDir, file.system_name);

          if (fs.existsSync(currentFilePath)) {
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            fs.renameSync(currentFilePath, targetFilePath);

            const newSystemName = path.posix.join(subfolder, file.system_name);
            db.prepare("UPDATE files SET system_name = ? WHERE id = ?").run(
              newSystemName,
              file.id,
            );
            migrated++;
          }
        }
        res.json({
          success: true,
          message: `Migrated ${migrated} files successfully.`,
          count: migrated,
        });
      } catch (e: any) {
        logger.error(`Migration API Error: ${e}`, {
          error: "Internal Server Error",
        });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.delete("/api/files/:id", authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    try {
      const file = db
        .prepare("SELECT system_name, uploaded_by FROM files WHERE id = ?")
        .get(id) as any;
      if (file) {
        if (req.user.role !== "ADMIN" && file.uploaded_by !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const filePath = path.join(process.cwd(), "data", "uploads", file.system_name);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            logger.warn("Failed to delete file", e);
          }
        }
      }
      db.prepare("DELETE FROM files WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- BLANK TEMPLATES (FILE SYSTEM) ---
  app.get(
    "/api/templates",
    authenticateTokenOrWallboard,
    (req: any, res: any) => {
      try {
        const fundingType = req.query.fundingType === "HCP" ? "HCP" : "NDIS";
        const templatesDir = path.join(UPLOADS_DIR, "Templates", fundingType);
        if (!fs.existsSync(templatesDir)) {
          fs.mkdirSync(templatesDir, { recursive: true });
          return res.json([]);
        }
        const files = fs
          .readdirSync(templatesDir)
          .filter((f) => f.endsWith(".pdf"));
        const templates = files.map((name) => ({
          id: encodeURIComponent(name),
          name,
          url: `/uploads/Templates/${fundingType}/${name}`,
          type: fundingType,
        }));
        res.json(templates);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.post(
    "/api/templates/upload",
    authenticateToken,
    requireAdmin,
    upload.single("file"),
    (req: any, res: any) => {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      try {
        const fundingType = req.body.fundingType === "HCP" ? "HCP" : "NDIS";
        const templatesDir = path.join(UPLOADS_DIR, "Templates", fundingType);
        if (!fs.existsSync(templatesDir)) {
          fs.mkdirSync(templatesDir, { recursive: true });
        }
        const targetPath = path.join(templatesDir, req.file.originalname);
        fs.renameSync(req.file.path, targetPath);
        res.json({ success: true, name: req.file.originalname });
      } catch (e: any) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.get(
    "/api/templates/:name/download",
    authenticateTokenOrWallboard,
    async (req: any, res: any) => {
      try {
        const fundingType = req.query.fundingType === "HCP" ? "HCP" : "NDIS";
        const templatesDir = path.join(UPLOADS_DIR, "Templates", fundingType);
        const templateName = req.params.name;

        if (!templateName || !templateName.endsWith(".pdf"))
          return res.status(400).json({ error: "Invalid template name" });

        const filePath = path.join(templatesDir, templateName);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "Template not found" });
        }
        
        try {
          const fs = require('fs');
          const pdfBytes = fs.readFileSync(filePath);
          const { PDFDocument } = require('pdf-lib');
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const form = pdfDoc.getForm();
          const fields = form.getFields();
          for (const field of fields) {
            if (field.constructor.name.includes("TextField")) {
              try {
                // @ts-ignore
                field.setFontSize(11);
              } catch (e) {
                // Ignore failure on specific field
              }
            }
          }
          const modifiedBytes = await pdfDoc.save();
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${templateName}"`);
          return res.send(Buffer.from(modifiedBytes));
        } catch (pdfErr) {
          console.error("PDF-lib Error on form adjustment: ", pdfErr);
          return res.sendFile(filePath);
        }
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.delete(
    "/api/templates/:name",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const fundingType = req.query.fundingType === "HCP" ? "HCP" : "NDIS";
        const templatesDir = path.join(UPLOADS_DIR, "Templates", fundingType);
        const templateName = req.params.name;

        if (!templateName || !templateName.endsWith(".pdf"))
          return res.status(400).json({ error: "Invalid template name" });

        const filePath = path.join(templatesDir, templateName);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.put(
    "/api/templates/rename",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const { fundingType, oldName, newName } = req.body;
        const typeDir = fundingType === "HCP" ? "HCP" : "NDIS";
        const templatesDir = path.join(UPLOADS_DIR, "Templates", typeDir);

        let targetName = newName;
        if (!targetName.endsWith(".pdf")) {
          targetName += ".pdf";
        }

        const oldPath = path.join(templatesDir, oldName);
        const newPath = path.join(templatesDir, targetName);

        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          res.json({ success: true });
        } else {
          res.status(404).json({ error: "File not found" });
        }
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  // --- CLIENT DOCUMENTS ---
  app.get(
    "/api/clients/:id/documents",
    authenticateTokenOrWallboard,
    (req: any, res: any) => {
      try {
        const client = db
          .prepare("SELECT id, first_name, last_name FROM clients WHERE id = ?")
          .get(req.params.id) as any;
        if (!client) return res.status(404).json({ error: "Client not found" });

        const clientFolder =
          `${client.first_name || ""} ${client.last_name || ""}`.trim();
        const docsDir = path.join(UPLOADS_DIR, clientFolder, "Documents");

        const getDocsInDir = (dirPath: string, category: string) => {
          if (!fs.existsSync(dirPath)) return [];
          const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".pdf"));
          return files.map((name) => {
            const stats = fs.statSync(path.join(dirPath, name));
            return {
              id: name,
              name,
              size: stats.size,
              createdAt: stats.mtime,
              clientName: clientFolder,
              category
            };
          });
        };

        const mainDocs = getDocsInDir(docsDir, "Main");
        const savedDocs = getDocsInDir(path.join(docsDir, "Saved"), "Saved");
        const completedDocs = getDocsInDir(path.join(docsDir, "Completed"), "Completed");

        res.json([...mainDocs, ...savedDocs, ...completedDocs]);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.get(
    "/api/clients/:id/documents/:name/download",
    authenticateTokenOrWallboard,
    async (req: any, res: any) => {
      try {
        const client = db
          .prepare("SELECT id, first_name, last_name FROM clients WHERE id = ?")
          .get(req.params.id) as any;
        if (!client) return res.status(404).json({ error: "Client not found" });

        const clientFolder =
          `${client.first_name || ""} ${client.last_name || ""}`.trim();
        const docsDir = path.join(UPLOADS_DIR, clientFolder, "Documents");
        
        const fileName = req.params.name;
        if (!fileName || !fileName.endsWith(".pdf"))
          return res.status(400).json({ error: "Invalid document name" });

        let filePath = path.join(docsDir, fileName);
        if (!fs.existsSync(filePath)) {
          filePath = path.join(docsDir, "Saved", fileName);
        }
        if (!fs.existsSync(filePath)) {
          filePath = path.join(docsDir, "Completed", fileName);
        }

        if (fs.existsSync(filePath)) {
          try {
            const fs = require('fs');
            const pdfBytes = fs.readFileSync(filePath);
            const { PDFDocument } = require('pdf-lib');
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            for (const field of fields) {
              if (field.constructor.name.includes("TextField")) {
                try {
                  // @ts-ignore
                  field.setFontSize(11);
                } catch (e) {
                  // ignore
                }
              }
            }
            const modifiedBytes = await pdfDoc.save();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            return res.send(Buffer.from(modifiedBytes));
          } catch (pdfErr) {
            console.error("PDF-lib Error on form adjustment: ", pdfErr);
            return res.sendFile(filePath);
          }
        } else {
          res.status(404).json({ error: "File not found" });
        }
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.post(
    "/api/clients/:id/documents/upload",
    authenticateToken,
    upload.single("file"),
    (req: any, res: any) => {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      try {
        const client = db
          .prepare("SELECT id, first_name, last_name FROM clients WHERE id = ?")
          .get(req.params.id) as any;
        if (!client) return res.status(404).json({ error: "Client not found" });

        const clientFolder =
          `${client.first_name || ""} ${client.last_name || ""}`.trim();
        let docsDir = path.join(UPLOADS_DIR, clientFolder, "Documents");
        
        if (req.body.category === "Saved") {
          docsDir = path.join(docsDir, "Saved");
        } else if (req.body.category === "Completed") {
          docsDir = path.join(docsDir, "Completed");
        }

        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
        }

        const targetPath = path.join(docsDir, req.file.originalname);
        fs.renameSync(req.file.path, targetPath);
        res.json({ success: true, name: req.file.originalname });
      } catch (e: any) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.put(
    "/api/clients/:id/documents/rename",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const { oldName, newName, category } = req.body;
        const client = db
          .prepare("SELECT id, first_name, last_name FROM clients WHERE id = ?")
          .get(req.params.id) as any;
        if (!client) return res.status(404).json({ error: "Client not found" });

        const clientFolder =
          `${client.first_name || ""} ${client.last_name || ""}`.trim();
        let docsDir = path.join(UPLOADS_DIR, clientFolder, "Documents");
        if (category === "Saved") docsDir = path.join(docsDir, "Saved");
        if (category === "Completed") docsDir = path.join(docsDir, "Completed");

        let targetName = newName;
        if (!targetName.endsWith(".pdf")) {
          targetName += ".pdf";
        }

        const oldPath = path.join(docsDir, oldName);
        const newPath = path.join(docsDir, targetName);

        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          res.json({ success: true });
        } else {
          // fallback search
          const dirsToCheck = [
             path.join(UPLOADS_DIR, clientFolder, "Documents"),
             path.join(UPLOADS_DIR, clientFolder, "Documents", "Saved"),
             path.join(UPLOADS_DIR, clientFolder, "Documents", "Completed")
          ];
          for (const d of dirsToCheck) {
             const op = path.join(d, oldName);
             if (fs.existsSync(op)) {
                 fs.renameSync(op, path.join(d, targetName));
                 return res.json({ success: true });
             }
          }
          res.status(404).json({ error: "File not found" });
        }
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  app.delete(
    "/api/clients/:id/documents/:name",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const client = db
          .prepare("SELECT id, first_name, last_name FROM clients WHERE id = ?")
          .get(req.params.id) as any;
        if (!client) return res.status(404).json({ error: "Client not found" });

        const clientFolder =
          `${client.first_name || ""} ${client.last_name || ""}`.trim();
        const category = req.query.category;
        let docsDir = path.join(UPLOADS_DIR, clientFolder, "Documents");
        if (category === "Saved") docsDir = path.join(docsDir, "Saved");
        if (category === "Completed") docsDir = path.join(docsDir, "Completed");

        const fileName = req.params.name;
        if (!fileName || !fileName.endsWith(".pdf"))
          return res.status(400).json({ error: "Invalid document name" });

        const filePath = path.join(docsDir, fileName);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return res.json({ success: true });
        } else {
          const dirsToCheck = [
             path.join(UPLOADS_DIR, clientFolder, "Documents"),
             path.join(UPLOADS_DIR, clientFolder, "Documents", "Saved"),
             path.join(UPLOADS_DIR, clientFolder, "Documents", "Completed")
          ];
          for (const d of dirsToCheck) {
             const fp = path.join(d, fileName);
             if (fs.existsSync(fp)) {
                 fs.unlinkSync(fp);
                 return res.json({ success: true });
             }
          }
        }
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    },
  );

  // Cleanup endpoint
  app.post("/api/cleanup", authenticateToken, requireAdmin, (req, res) => {
    try {
      db.transaction(() => {
        db.prepare(
          `DELETE FROM shifts WHERE status IN ('DELETED', 'deleted', 'CANCELLED')`,
        ).run();
      })();
      res.json({
        message:
          "Cleanup complete: Removed orphaned or deleted/cancelled shifts.",
      });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Compliance & Audit Endpoints

  const parseLocationString = (str: string) => {
    const parsed = { name: str, address: "", coords: "" };
    const parts = str.split(/(\[[\d.,\s-]+\])/);
    parts.forEach((part) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        parsed.coords = part;
      } else if (part.includes("(") && part.includes(")")) {
        const openIdx = part.indexOf("(");
        const closeIdx = part.lastIndexOf(")");
        parsed.name = part.slice(0, openIdx).trim();
        parsed.address = part.slice(openIdx + 1, closeIdx).trim();
      }
    });
    return parsed;
  };

  const drawPdfPhotoIfPresent = (
    doc: any,
    photoDataUrl: string | undefined | null,
    label: string,
  ) => {
    if (photoDataUrl && photoDataUrl.startsWith("data:image/")) {
      try {
        const base64Data = photoDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, "base64");
        if (doc.y > doc.page.height - 200) {
          doc.addPage();
        }
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica-Oblique").text(label);
        doc.image(imgBuffer, { height: 120 });
        doc.moveDown(0.5);
      } catch (e) {
        console.error("Failed to render photo to PDF:", e);
      }
    }
  };

  // Evidence Pack Export
  app.get(
    "/api/compliance/evidence/matrix",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const { clientId, staffId, startDate, endDate } = req.query;

        let query = `
        SELECT s.*, 
               u.first_name as staff_first, u.last_name as staff_last,
               c.first_name as client_first, c.last_name as client_last,
               c.funding_type
        FROM shifts s
        JOIN users u ON s.staff_id = u.id
        JOIN clients c ON s.client_id = c.id
        WHERE s.status = 'COMPLETED'
      `;
        const params: any[] = [];

        if (clientId) {
          query += ` AND s.client_id = ?`;
          params.push(clientId);
        }
        if (staffId) {
          query += ` AND s.staff_id = ?`;
          params.push(staffId);
        }
        if (startDate) {
          query += ` AND (s.actual_start_time >= ? OR s.start_time >= ?)`;
          const st = startDate.includes("T")
            ? startDate
            : startDate + "T00:00:00.000Z";
          params.push(st, st);
        }
        if (endDate) {
          query += ` AND (s.actual_start_time <= ? OR s.start_time <= ?)`;
          const et = endDate.includes("T")
            ? endDate
            : endDate + "T23:59:59.999Z";
          params.push(et, et);
        }

        query += ` ORDER BY s.actual_start_time DESC`;

        const shifts = db.prepare(query).all(...params) as any[];

        res.json(shifts);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch matrix" });
      }
    },
  );

  app.get(
    "/api/compliance/export/evidence",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      try {
        const { clientId, staffId, startDate, endDate } = req.query;

        let query = `
        SELECT s.*, 
               u.first_name as staff_first, u.last_name as staff_last,
               c.first_name as client_first, c.last_name as client_last,
               c.funding_type
        FROM shifts s
        JOIN users u ON s.staff_id = u.id
        JOIN clients c ON s.client_id = c.id
        WHERE s.status = 'COMPLETED'
      `;
        const params: any[] = [];

        if (clientId) {
          query += ` AND s.client_id = ?`;
          params.push(clientId);
        }
        if (staffId) {
          query += ` AND s.staff_id = ?`;
          params.push(staffId);
        }
        if (startDate) {
          query += ` AND (s.actual_start_time >= ? OR s.start_time >= ?)`;
          const st = startDate.includes("T")
            ? startDate
            : startDate + "T00:00:00.000Z";
          params.push(st, st);
        }
        if (endDate) {
          query += ` AND (s.actual_start_time <= ? OR s.start_time <= ?)`;
          const et = endDate.includes("T")
            ? endDate
            : endDate + "T23:59:59.999Z";
          params.push(et, et);
        }

        query += ` ORDER BY s.actual_start_time DESC`;

        const shifts = db.prepare(query).all(...params) as any[];

        const exceljsModule = await import("exceljs");
        const Workbook = exceljsModule.default
          ? exceljsModule.default.Workbook
          : (exceljsModule as any).Workbook;
        const workbook = new Workbook();

        // Evidence Dataset
        const evidenceSheet = workbook.addWorksheet("Evidence Dataset");
        evidenceSheet.columns = [
          { header: "Client Name", key: "clientName", width: 25 },
          { header: "Staff Name", key: "staffName", width: 25 },
          { header: "Service Date", key: "serviceDate", width: 15 },
          { header: "Shift Timestamps", key: "shiftTimes", width: 30 },
          { header: "Care Type", key: "careType", width: 20 },
          { header: "Logged Care Hours", key: "careHours", width: 20 },
          { header: "Progress Note Status", key: "noteStatus", width: 25 },
          { header: "Total Transport Kilometers", key: "totalKm", width: 30 },
          { header: "Calculated Travel Cost", key: "travelCost", width: 25 },
          { header: "Start Odometer", key: "startOdo", width: 15 },
          { header: "Start Photo", key: "startPhoto", width: 15 },
          { header: "End Odometer", key: "endOdo", width: 15 },
          { header: "End Photo", key: "endPhoto", width: 15 },
        ];

        evidenceSheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF001c3d" },
        };
        evidenceSheet.getRow(1).font = {
          color: { argb: "FFFFFFFF" },
          bold: true,
        };
        evidenceSheet.autoFilter = "A1:M1";

        // Summary Dashboard
        const summarySheet = workbook.addWorksheet("Summary Dashboard");
        summarySheet.columns = [
          { header: "Metric", key: "metric", width: 40 },
          { header: "Value", key: "value", width: 25 },
        ];

        let totalHours = 0;
        let totalKM = 0;
        let auditLogCount = 0;
        try {
          auditLogCount =
            (db.prepare("SELECT count(*) as c FROM audit_logs").get() as any)
              ?.c || 0;
        } catch (e) {}

        shifts.forEach((s: any) => {
          let hrs = 0;
          let qtyOverride = null;
          try {
            if (s.services_json) {
              const srvList = JSON.parse(s.services_json);
              if (
                srvList.length > 0 &&
                srvList[0].qtyOverride !== undefined &&
                srvList[0].qtyOverride !== ""
              ) {
                qtyOverride = parseFloat(srvList[0].qtyOverride);
              }
            }
          } catch (e) {}

          if (qtyOverride !== null && !isNaN(qtyOverride)) {
            hrs = qtyOverride;
          } else {
            if (s.actual_start_time && s.actual_finish_time) {
              const aHrs =
                (new Date(s.actual_finish_time).getTime() -
                  new Date(s.actual_start_time).getTime()) /
                (1000 * 60 * 60);
              if (aHrs > 0) {
                hrs = aHrs;
              } else {
                hrs =
                  (new Date(s.end_time).getTime() -
                    new Date(s.start_time).getTime()) /
                  (1000 * 60 * 60);
              }
            } else if (s.start_time && s.end_time) {
              hrs =
                (new Date(s.end_time).getTime() -
                  new Date(s.start_time).getTime()) /
                (1000 * 60 * 60);
            }
          }
          totalHours += hrs > 0 ? hrs : 0;
          const isHC =
            s.funding_type === "HCP" ||
            s.funding_type === "Home Care" ||
            s.funding_type === "HOME_CARE";
          const hc_km = isHC
            ? s.home_care_travel_km || s.provider_travel_km || 0
            : 0;
          const p_km = isHC ? 0 : s.provider_travel_km || 0;
          totalKM += p_km + hc_km + (s.abt_km || 0);
        });

        summarySheet.addRow({
          metric: "Total Logged Care Hours",
          value: totalHours.toFixed(2),
        });
        summarySheet.addRow({
          metric: "Total Transport KM",
          value: totalKM.toFixed(2),
        });
        summarySheet.addRow({
          metric: "Total Security Audit Logs",
          value: auditLogCount,
        });

        summarySheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF000080" },
        };
        summarySheet.getRow(1).font = {
          color: { argb: "FFFFFFFF" },
          bold: true,
        };

        for (let i = 0; i < shifts.length; i++) {
          const s = shifts[i];
          let dateStr = s.start_time ? s.start_time.split("T")[0] : "";

          const st = (s.actual_start_time || s.start_time || "").split("T")[1];
          const et = (s.actual_finish_time || s.end_time || "").split("T")[1];
          const timeStr = `${st?.substring(0, 5) || "N/A"} - ${et?.substring(0, 5) || "N/A"}`;

          let hrs = 0;
          let qtyOverride = null;
          try {
            if (s.services_json) {
              const srvList = JSON.parse(s.services_json);
              if (
                srvList.length > 0 &&
                srvList[0].qtyOverride !== undefined &&
                srvList[0].qtyOverride !== ""
              ) {
                qtyOverride = parseFloat(srvList[0].qtyOverride);
              }
            }
          } catch (e) {}

          if (qtyOverride !== null && !isNaN(qtyOverride)) {
            hrs = qtyOverride;
          } else {
            if (s.actual_start_time && s.actual_finish_time) {
              const aHrs =
                (new Date(s.actual_finish_time).getTime() -
                  new Date(s.actual_start_time).getTime()) /
                (1000 * 60 * 60);
              if (aHrs > 0) {
                hrs = aHrs;
              } else {
                hrs =
                  (new Date(s.end_time).getTime() -
                    new Date(s.start_time).getTime()) /
                  (1000 * 60 * 60);
              }
            } else if (s.start_time && s.end_time) {
              hrs =
                (new Date(s.end_time).getTime() -
                  new Date(s.start_time).getTime()) /
                (1000 * 60 * 60);
            }
          }

          const isHomeCare =
            s.funding_type === "HOME_CARE" ||
            s.funding_type === "Home Care" ||
            s.funding_type === "HCP";
          const hc_km = isHomeCare
            ? s.home_care_travel_km || s.provider_travel_km || 0
            : 0;
          const p_km = isHomeCare ? 0 : s.provider_travel_km || 0;
          const km = p_km + hc_km + (s.abt_km || 0);

          const row = evidenceSheet.addRow({
            clientName: `${s.client_first} ${s.client_last}`,
            staffName: `${s.staff_first} ${s.staff_last}`,
            serviceDate: dateStr,
            shiftTimes: timeStr,
            careType:
              s.funding_type === "HOME_CARE" ? "Home Care" : "NDIS Support",
            careHours: Math.max(0, hrs).toFixed(2),
            noteStatus: s.notes ? "Completed" : "Pending",
            totalKm: km,
            // Explicitly set 0 so formatting applies, we'll override it with the formula below
            travelCost: isHomeCare
              ? 0
              : (s.provider_travel_cost || 0) + (s.abt_cost || 0),
            startOdo: s.odometer_start_reading || "",
            startPhoto: "",
            endOdo: s.odometer_end_reading || "",
            endPhoto: "",
          });

          // Alternating row styling
          if (i % 2 === 0)
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" },
            };

          // Currency formatting & Formula for cost
          const costCell = row.getCell("travelCost");
          costCell.numFmt = '"$"#,##0.00';

          // Extract base64 photos and embed them
          const embedPhoto = (base64Photo: string, colIndex: number) => {
            if (base64Photo && base64Photo.startsWith("data:image/")) {
              try {
                const matches = base64Photo.match(
                  /^data:image\/(\w+);base64,(.+)$/,
                );
                if (matches && matches.length === 3) {
                  const ext = matches[1] === "jpeg" ? "jpeg" : "png";
                  const buffer = Buffer.from(matches[2], "base64");
                  const imageId = workbook.addImage({ buffer, extension: ext });

                  row.height = 60; // Make row taller to fit image

                  // Center in cell using custom dimensions
                  evidenceSheet.addImage(imageId, {
                    tl: { col: colIndex, row: row.number - 1 },
                    ext: { width: 50, height: 50 },
                  });
                }
              } catch (e) {
                row.getCell(colIndex + 1).value = "Error";
              }
            } else if (base64Photo) {
              // If it's a URL or something else, we could just say "Yes"
              row.getCell(colIndex + 1).value = "Yes";
            } else {
              row.getCell(colIndex + 1).value = "No";
            }
          };

          // startPhoto is col K (index 10), endPhoto is col M (index 12)
          embedPhoto(s.odometer_start_photo, 10);
          embedPhoto(s.odometer_end_photo, 12);
        }

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="Compliance_Evidence_Ledger.xlsx"',
        );

        await workbook.xlsx.write(res);
        res.end();
      } catch (e) {
        console.error(e);
        if (!res.headersSent)
          res.status(500).json({ error: "Failed to export Excel" });
      }
    },
  );

  app.get(
    "/api/compliance/evidence",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { clientId, startDate, endDate } = req.query;
      if (!clientId || !startDate || !endDate) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      try {
        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r: any) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz8 = settingsMap.timezone || "Australia/Perth";
        const tz =
          typeof rawTz8 === "string" ? rawTz8.replace(/['"]+/g, "") : rawTz8;

        const formatYMDtoDMY = (ymd: string) =>
          ymd ? ymd.split("-").reverse().join("-") : "";

        const formatTz = (
          isoObj: string | null | undefined,
          fallbackObj: string,
        ) => {
          const target = isoObj || fallbackObj;
          if (!target) return { date: "N/A", time: "N/A" };
          try {
            const d = new Date(target);
            if (isNaN(d.getTime())) {
              // Might be HH:mm already. So try to parse back
              return {
                date: formatYMDtoDMY(target.split("T")[0] || target),
                time: target.split("T")[1]?.substring(0, 5) || target,
              };
            }
            const formatter = new Intl.DateTimeFormat("en-CA", {
              timeZone: tz,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const parts = formatter.formatToParts(d);
            const getP = (t: string) =>
              parts.find((p) => p.type === t)?.value || "";
            return {
              date: `${getP("day")}-${getP("month")}-${getP("year")}`,
              time: `${getP("hour")}:${getP("minute")}`,
            };
          } catch (e) {
            return {
              date: formatYMDtoDMY(target.split("T")[0]),
              time: target.split("T")[1]?.substring(0, 5) || "",
            };
          }
        };

        const clientRow = db
          .prepare("SELECT * FROM clients WHERE id = ?")
          .get(clientId) as any;
        if (!clientRow)
          return res.status(404).json({ error: "Client not found" });

        const shifts = db
          .prepare(
            `
        SELECT s.*, u.first_name as staff_first, u.last_name as staff_last
        FROM shifts s
        JOIN users u ON s.staff_id = u.id
        WHERE s.client_id = ? AND s.status = 'COMPLETED'
        AND s.start_time >= ? AND s.end_time <= ?
        ORDER BY s.start_time ASC
      `,
          )
          .all(clientId, startDate, endDate + "T23:59:59") as any[];

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Evidence_Pack_Client_${clientId}_${formatYMDtoDMY(startDate)}_to_${formatYMDtoDMY(endDate)}.pdf"`,
        );
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("Compliance Evidence Pack", { align: "center" });
        doc.moveDown();
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Client: ", { continued: true })
          .font("Helvetica")
          .text(`${clientRow.first_name} ${clientRow.last_name}`);
        doc
          .font("Helvetica-Bold")
          .text("Date Range: ", { continued: true })
          .font("Helvetica")
          .text(`${formatYMDtoDMY(startDate)} to ${formatYMDtoDMY(endDate)}`);
        doc
          .fontSize(10)
          .font("Helvetica-Oblique")
          .fillColor("gray")
          .text(`All times recorded in ${tz}`);
        doc.fillColor("black");
        doc.moveDown(2);

        // Section 1: Service Delivery Log
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("1. Service Delivery Log (Chronological)");
        doc.moveDown();
        if (shifts.length === 0) {
          doc.fontSize(12).text("No shifts found in this date range.");
        } else {
          // Table Header
          const headerY = doc.y + 8;
          doc.rect(50, doc.y, 500, 25).fill("#f4f4f5");
          doc.fillColor("black").font("Helvetica-Bold").fontSize(10);
          doc.text("Shift ID", 55, headerY, { width: 45 });
          doc.text("Date", 105, headerY, { width: 60 });
          doc.text("Time", 170, headerY, { width: 140 });
          doc.text("Staff Member", 315, headerY, { width: 100 });
          doc.text("Support Item Code(s)", 420, headerY, { width: 130 });

          doc.y = headerY + 25;

          let startY = doc.y;
          shifts.forEach((s) => {
            if (doc.y > 650) {
              doc.addPage();
              startY = doc.y;
            }
            const services = s.services_json ? JSON.parse(s.services_json) : [];
            doc.font("Helvetica").fontSize(10);

            const startTz = formatTz(s.actual_start_time, s.start_time);
            const endTz = formatTz(s.actual_finish_time, s.end_time);
            const schedStartTz = formatTz(s.start_time, s.start_time);
            const schedEndTz = formatTz(s.end_time, s.end_time);

            doc.text(s.id.toString(), 55, startY, { width: 45 });
            const rowH0 = doc.y;
            doc.text(startTz.date, 105, startY, { width: 60 });
            const rowH1 = doc.y;
            doc.text(
              `${startTz.time} to ${endTz.time}\n(Sched: ${schedStartTz.time} to ${schedEndTz.time})`,
              170,
              startY,
              { width: 140 },
            );
            const rowH2 = doc.y;
            doc.text(`${s.staff_first} ${s.staff_last}`, 315, startY, {
              width: 100,
            });
            const rowH3 = doc.y;

            let codesArr = services
              .map((sd: any) => {
                const srv = db
                  .prepare("SELECT code FROM services WHERE id = ?")
                  .get(sd.serviceId) as any;
                return srv ? srv.code : null;
              })
              .filter((c: any) => c && c.trim() !== "");

            if (codesArr.length === 0 && s.service_id) {
              const srv = db
                .prepare("SELECT code FROM services WHERE id = ?")
                .get(s.service_id) as any;
              if (srv && srv.code) codesArr.push(srv.code);
            }

            let codes = codesArr.length > 0 ? codesArr.join("\n") : "N/A";
            doc.font("Helvetica").text(codes, 420, startY, { width: 130 });
            const rowH4 = doc.y;

            doc.y = Math.max(rowH0, rowH1, rowH2, rowH3, rowH4);
            doc
              .moveTo(50, doc.y + 5)
              .lineTo(550, doc.y + 5)
              .lineWidth(0.5)
              .strokeColor("#e4e4e7")
              .stroke();
            doc.moveDown(1.5);
            startY = doc.y;
          });
        }
        doc.addPage();

        // Section 2: Progress Note Archive
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("2. Progress Note Archive");
        doc.moveDown();
        shifts.forEach((s) => {
          if (s.notes) {
            const endTz = formatTz(s.actual_finish_time, s.end_time);
            doc
              .fontSize(12)
              .font("Helvetica-Bold")
              .text(
                `Shift ID: ${s.id} | Timestamp: ${endTz.date} ${endTz.time}`,
              );
            doc.font("Helvetica").text(s.notes);
            doc.moveDown();
          }
        });

        doc.addPage();

        // Section 3: Transport Evidence
        doc.fontSize(16).font("Helvetica-Bold").text("3. Transport Evidence");
        doc.moveDown();

        const tableHeaders = [
          "Date",
          "Staff",
          "Travel Route (From -> To)",
          "Category",
          "KM",
        ];
        const headerY = doc.y;
        doc.rect(50, headerY - 5, 500, 20).fill("#f4f4f5");
        doc.fillColor("black").font("Helvetica-Bold").fontSize(8);
        doc.text(tableHeaders[0], 55, headerY);
        doc.text(tableHeaders[1], 105, headerY);
        doc.text(tableHeaders[2], 180, headerY);
        doc.text(tableHeaders[3], 340, headerY);
        doc.text(tableHeaders[4], 420, headerY);
        doc.y = headerY + 20;

        shifts.forEach((s) => {
          if (
            s.provider_travel_km > 0 ||
            s.home_care_travel_km > 0 ||
            s.abt_km > 0
          ) {
            const startTz = formatTz(s.actual_start_time, s.start_time);

            let routeLog: any = null;
            if (s.transport_route_log) {
              try {
                routeLog = JSON.parse(s.transport_route_log);
              } catch (e) {}
            }

            let entries: any[] = [];
            const isHC =
              s.funding_type === "HCP" ||
              s.funding_type === "Home Care" ||
              s.funding_type === "HOME_CARE";

            if (!isHC && s.provider_travel_km > 0) {
              let routeStrs: string[] = [];
              let coordsStrs: string[] = [];
              if (
                routeLog &&
                routeLog.providerTravel &&
                routeLog.providerTravel.legs
              ) {
                routeLog.providerTravel.legs.forEach(
                  (leg: any, idx: number) => {
                    let fName = leg.fromName || "Unknown";
                    let tName = leg.toName || "Client";
                    if (leg.description && leg.description.includes(" to ")) {
                      const [f, t] = leg.description.split(" to ");
                      const fl = parseLocationString(f);
                      const tl = parseLocationString(t);
                      fName = fl.name
                        ? fl.name + (fl.address ? ` (${fl.address})` : "")
                        : fName;
                      tName = tl.name
                        ? tl.name + (tl.address ? ` (${tl.address})` : "")
                        : tName;
                      if (fl.coords)
                        coordsStrs.push(`[Leg ${idx + 1}] F: ${fl.coords}`);
                      if (tl.coords)
                        coordsStrs.push(`[Leg ${idx + 1}] T: ${tl.coords}`);
                    }
                    routeStrs.push(
                      `[Leg ${idx + 1}] From: ${fName}\nTo: ${tName}`,
                    );
                  },
                );
              }
              entries.push({
                routeStr: routeStrs.join("\n"),
                cat: "Provider Travel",
                km: s.provider_travel_km,
                coords: coordsStrs.join("\n") || "N/A",
              });
            }

            if (s.home_care_travel_km > 0) {
              let routeStrs: string[] = [];
              let coordsStrs: string[] = [];
              if (
                routeLog &&
                routeLog.homeCareTravel &&
                routeLog.homeCareTravel.legs
              ) {
                routeLog.homeCareTravel.legs.forEach(
                  (leg: any, idx: number) => {
                    let fName = leg.fromName || "Unknown";
                    let tName = leg.toName || "Client";
                    if (leg.description && leg.description.includes(" to ")) {
                      const [f, t] = leg.description.split(" to ");
                      const fl = parseLocationString(f);
                      const tl = parseLocationString(t);
                      fName = fl.name
                        ? fl.name + (fl.address ? ` (${fl.address})` : "")
                        : fName;
                      tName = tl.name
                        ? tl.name + (tl.address ? ` (${tl.address})` : "")
                        : tName;
                      if (fl.coords)
                        coordsStrs.push(`[Leg ${idx + 1}] F: ${fl.coords}`);
                      if (tl.coords)
                        coordsStrs.push(`[Leg ${idx + 1}] T: ${tl.coords}`);
                    }
                    routeStrs.push(
                      `[Leg ${idx + 1}] From: ${fName}\nTo: ${tName}`,
                    );
                  },
                );
              } else if (
                routeLog &&
                routeLog.providerTravel &&
                routeLog.providerTravel.legs
              ) {
                routeLog.providerTravel.legs.forEach(
                  (leg: any, idx: number) => {
                    let fName = leg.fromName || "Unknown";
                    let tName = leg.toName || "Client";
                    if (leg.description && leg.description.includes(" to ")) {
                      const [f, t] = leg.description.split(" to ");
                      const fl = parseLocationString(f);
                      const tl = parseLocationString(t);
                      fName = fl.name
                        ? fl.name + (fl.address ? ` (${fl.address})` : "")
                        : fName;
                      tName = tl.name
                        ? tl.name + (tl.address ? ` (${tl.address})` : "")
                        : tName;
                      if (fl.coords)
                        coordsStrs.push(`[Leg ${idx + 1}] F: ${fl.coords}`);
                      if (tl.coords)
                        coordsStrs.push(`[Leg ${idx + 1}] T: ${tl.coords}`);
                    }
                    routeStrs.push(
                      `[Leg ${idx + 1}] From: ${fName}\nTo: ${tName}`,
                    );
                  },
                );
              }
              entries.push({
                routeStr: routeStrs.join("\n"),
                cat: "Home Care Travel",
                km: s.home_care_travel_km,
                coords: coordsStrs.join("\n") || "N/A",
              });
            }

            if (s.abt_km > 0) {
              let routeStrs: string[] = [];
              let coordsStrs: string[] = [];
              if (routeLog && routeLog.abt && routeLog.abt.description) {
                const abtDesc = routeLog.abt.description.replace(
                  "Transport during shift:\n",
                  "",
                );
                const abtParts = abtDesc.split(" → ");
                let waypoints: string[] = [];
                abtParts.forEach((partStr: string) => {
                  const loc = parseLocationString(partStr);
                  const locName = loc.name
                    ? loc.name + (loc.address ? ` (${loc.address})` : "")
                    : loc.address || "Unknown";
                  waypoints.push(locName);
                  if (loc.coords) coordsStrs.push(loc.coords);
                });
                if (waypoints.length > 0) {
                  routeStrs.push("From: " + waypoints.join("\nTo: "));
                }
              }
              entries.push({
                routeStr: routeStrs.join("\n"),
                cat: "Activity Transport",
                km: s.abt_km,
                coords: coordsStrs.join("\n") || "N/A",
              });
            }

            entries.forEach((e, idx) => {
              if (doc.y > 650) {
                doc.addPage();
              }
              let rowStartY = doc.y;
              doc.font("Helvetica").fontSize(8);
              doc.text(idx === 0 ? startTz.date : "", 55, rowStartY, {
                width: 45,
              });
              doc.text(
                idx === 0 ? `${s.staff_first} ${s.staff_last}` : "",
                105,
                rowStartY,
                { width: 70 },
              );
              const rowH1 = doc.y;
              doc.text(e.routeStr, 180, rowStartY, { width: 150 });
              doc
                .font("Helvetica")
                .fontSize(7)
                .text(e.coords, 180, doc.y + 2, { width: 150 });
              const rowH2 = doc.y;

              doc.font("Helvetica").fontSize(8);
              doc.text(e.cat, 340, rowStartY, { width: 75 });
              doc.text(e.km.toFixed(2), 420, rowStartY, { width: 25 });

              doc.y = Math.max(rowStartY + 10, rowH1, rowH2) + 5;
            });
            // Divider
            doc
              .moveTo(50, doc.y)
              .lineTo(550, doc.y)
              .lineWidth(0.5)
              .strokeColor("#e4e4e7")
              .stroke();
            doc.y += 5;
          }
        });
        doc.end();
      } catch (e) {
        console.error(e);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error" });
        }
      }
    },
  );
  // Staff logbook export
  app.get(
    "/api/compliance/staff-logbook",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      const { staffId, startDate, endDate } = req.query;
      if (!staffId || !startDate || !endDate) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      try {
        const settingsRows = db
          .prepare("SELECT key, value FROM settings")
          .all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r: any) => {
          try {
            settingsMap[r.key] = JSON.parse(r.value);
          } catch {
            settingsMap[r.key] = r.value;
          }
        });
        let rawTz9 = settingsMap.timezone || "Australia/Perth";
        const tz =
          typeof rawTz9 === "string" ? rawTz9.replace(/['"]+/g, "") : rawTz9;

        const formatYMDtoDMY = (ymd: string) =>
          ymd ? ymd.split("-").reverse().join("-") : "";

        const formatTz = (
          isoObj: string | null | undefined,
          fallbackObj: string,
        ) => {
          const target = isoObj || fallbackObj;
          if (!target) return { date: "N/A", time: "N/A" };
          try {
            const d = new Date(target);
            if (isNaN(d.getTime())) {
              return {
                date: formatYMDtoDMY(target.split("T")[0] || target),
                time: target.split("T")[1]?.substring(0, 5) || target,
              };
            }
            const formatter = new Intl.DateTimeFormat("en-CA", {
              timeZone: tz,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const parts = formatter.formatToParts(d);
            const getP = (t: string) =>
              parts.find((p) => p.type === t)?.value || "";
            return {
              date: `${getP("day")}-${getP("month")}-${getP("year")}`,
              time: `${getP("hour")}:${getP("minute")}`,
            };
          } catch (e) {
            return {
              date: formatYMDtoDMY(target.split("T")[0]),
              time: target.split("T")[1]?.substring(0, 5) || "",
            };
          }
        };

        const getTzDate = (
          isoObj: string | null | undefined,
          fallbackObj: string,
        ) => {
          const target = isoObj || fallbackObj;
          if (!target) return new Date();
          const d = new Date(target);
          if (isNaN(d.getTime())) return new Date();
          // To calculate duration correctly regardless of timezone, we can just use the absolute UTC milliseconds.
          return d;
        };

        const staffRow = db
          .prepare("SELECT * FROM users WHERE id = ?")
          .get(staffId) as any;
        if (!staffRow)
          return res.status(404).json({ error: "Staff not found" });

        const shifts = db
          .prepare(
            `
        SELECT s.*, c.first_name as client_first, c.last_name as client_last
        FROM shifts s
        JOIN clients c ON s.client_id = c.id
        WHERE s.staff_id = ? AND s.status = 'COMPLETED'
        AND s.start_time >= ? AND s.end_time <= ?
        ORDER BY s.start_time ASC
      `,
          )
          .all(staffId, startDate, endDate + "T23:59:59") as any[];

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Staff_Logbook_${staffId}_${formatYMDtoDMY(startDate)}_to_${formatYMDtoDMY(endDate)}.pdf"`,
        );
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("Workforce Compliance - Staff Logbook", { align: "center" });
        doc.moveDown();
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Staff: ", { continued: true })
          .font("Helvetica")
          .text(`${staffRow.first_name} ${staffRow.last_name}`);
        doc
          .font("Helvetica-Bold")
          .text("Date Range: ", { continued: true })
          .font("Helvetica")
          .text(`${formatYMDtoDMY(startDate)} to ${formatYMDtoDMY(endDate)}`);
        doc
          .fontSize(10)
          .font("Helvetica-Oblique")
          .fillColor("gray")
          .text(`All times recorded in ${tz}`);
        doc.fillColor("black");
        doc.moveDown(2);

        // Section 1: Hours Worked Report
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("1. Hours Worked Report (Timesheets)");
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

          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Shift ID: ${s.id} - Date: ${startTz.date}`);
          doc
            .font("Helvetica")
            .text(`Client: ${s.client_first} ${s.client_last}`);
          doc.text(
            `Clock-In: ${startTz.time} | Clock-Out: ${endTz.time} (Sched: ${schedStartTz.time} - ${schedEndTz.time})`,
          );
          doc.text(`Hours Worked: ${hrs.toFixed(2)}`);
          doc.moveDown();
        });
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(`Total Hours: ${totalHours.toFixed(2)}`);

        doc.addPage();

        // Section 2: Vehicle Usage Statement
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("2. Vehicle Usage Statement");
        doc.moveDown();
        let totalProviderKm = 0;
        let totalAbtKm = 0;
        let totalHcKm = 0;

        // Table Header
        const headerY = doc.y;
        doc.rect(50, headerY - 5, 500, 20).fill("#f4f4f5");
        doc.fillColor("black").font("Helvetica-Bold").fontSize(8);
        doc.text("Date", 55, headerY);
        doc.text("Client", 105, headerY);
        doc.text("Travel Route", 180, headerY);
        doc.text("Category", 340, headerY);
        doc.text("KM", 420, headerY);
        doc.text("Odo", 450, headerY);
        doc.y = headerY + 20;

        shifts.forEach((s) => {
          let rowsToPrint: any[] = [];

          let routeLog: any = null;
          if (s.transport_route_log) {
            try {
              routeLog = JSON.parse(s.transport_route_log);
            } catch (e) {}
          }

          const isHC =
            s.funding_type === "HCP" ||
            s.funding_type === "Home Care" ||
            s.funding_type === "HOME_CARE";

          if (!isHC && s.provider_travel_km > 0) {
            let routeStrs: string[] = [];
            let coordsStrs: string[] = [];
            if (
              routeLog &&
              routeLog.providerTravel &&
              routeLog.providerTravel.legs
            ) {
              routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                let fName = leg.fromName || "Unknown";
                let tName = leg.toName || "Client";
                if (leg.description && leg.description.includes(" to ")) {
                  const [f, t] = leg.description.split(" to ");
                  const fl = parseLocationString(f);
                  const tl = parseLocationString(t);
                  fName = fl.name
                    ? fl.name + (fl.address ? ` (${fl.address})` : "")
                    : fName;
                  tName = tl.name
                    ? tl.name + (tl.address ? ` (${tl.address})` : "")
                    : tName;
                  if (fl.coords)
                    coordsStrs.push(`[Leg ${idx + 1}] F: ${fl.coords}`);
                  if (tl.coords)
                    coordsStrs.push(`[Leg ${idx + 1}] T: ${tl.coords}`);
                }
                routeStrs.push(`[Leg ${idx + 1}] From: ${fName}\nTo: ${tName}`);
              });
            }
            rowsToPrint.push({
              cat: "Provider Travel",
              km: s.provider_travel_km,
              route: routeStrs.join("\n"),
              coords: coordsStrs.join("\n"),
            });
            totalProviderKm += s.provider_travel_km;
          }

          if (s.home_care_travel_km > 0) {
            let routeStrs: string[] = [];
            let coordsStrs: string[] = [];
            if (
              routeLog &&
              routeLog.homeCareTravel &&
              routeLog.homeCareTravel.legs
            ) {
              routeLog.homeCareTravel.legs.forEach((leg: any, idx: number) => {
                let fName = leg.fromName || "Unknown";
                let tName = leg.toName || "Client";
                if (leg.description && leg.description.includes(" to ")) {
                  const [f, t] = leg.description.split(" to ");
                  const fl = parseLocationString(f);
                  const tl = parseLocationString(t);
                  fName = fl.name
                    ? fl.name + (fl.address ? ` (${fl.address})` : "")
                    : fName;
                  tName = tl.name
                    ? tl.name + (tl.address ? ` (${tl.address})` : "")
                    : tName;
                  if (fl.coords)
                    coordsStrs.push(`[Leg ${idx + 1}] F: ${fl.coords}`);
                  if (tl.coords)
                    coordsStrs.push(`[Leg ${idx + 1}] T: ${tl.coords}`);
                }
                routeStrs.push(`[Leg ${idx + 1}] From: ${fName}\nTo: ${tName}`);
              });
            } else if (
              routeLog &&
              routeLog.providerTravel &&
              routeLog.providerTravel.legs
            ) {
              // Fallback using Provider Travel legs structure if Home Care travel is missing its own
              routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                let fName = leg.fromName || "Unknown";
                let tName = leg.toName || "Client";
                if (leg.description && leg.description.includes(" to ")) {
                  const [f, t] = leg.description.split(" to ");
                  const fl = parseLocationString(f);
                  const tl = parseLocationString(t);
                  fName = fl.name
                    ? fl.name + (fl.address ? ` (${fl.address})` : "")
                    : fName;
                  tName = tl.name
                    ? tl.name + (tl.address ? ` (${tl.address})` : "")
                    : tName;
                  if (fl.coords)
                    coordsStrs.push(`[Leg ${idx + 1}] F: ${fl.coords}`);
                  if (tl.coords)
                    coordsStrs.push(`[Leg ${idx + 1}] T: ${tl.coords}`);
                }
                routeStrs.push(`[Leg ${idx + 1}] From: ${fName}\nTo: ${tName}`);
              });
            }
            rowsToPrint.push({
              cat: "Home Care ($1/km)",
              km: s.home_care_travel_km,
              route: routeStrs.join("\n"),
              coords: coordsStrs.join("\n"),
            });
            totalHcKm += s.home_care_travel_km;
          }

          if (s.abt_km > 0) {
            let routeStrs: string[] = [];
            let coordsStrs: string[] = [];
            if (routeLog && routeLog.abt && routeLog.abt.description) {
              const abtDesc = routeLog.abt.description.replace(
                "Transport during shift:\n",
                "",
              );
              const abtParts = abtDesc.split(" → ");
              let waypoints: string[] = [];
              abtParts.forEach((partStr: string) => {
                const loc = parseLocationString(partStr);
                const locName = loc.name
                  ? loc.name + (loc.address ? ` (${loc.address})` : "")
                  : loc.address || "Unknown";
                waypoints.push(locName);
                if (loc.coords) coordsStrs.push(loc.coords);
              });
              if (waypoints.length > 0) {
                routeStrs.push("From: " + waypoints.join("\nTo: "));
              }
            }
            rowsToPrint.push({
              cat: "ABT (NDIS)",
              km: s.abt_km,
              route: routeStrs.join("\n"),
              coords: coordsStrs.join("\n"),
            });
            totalAbtKm += s.abt_km;
          }

          if (
            rowsToPrint.length === 0 &&
            (s.odometer_start_reading ||
              s.odometer_end_reading ||
              s.odometer_start_photo ||
              s.odometer_end_photo)
          ) {
            rowsToPrint.push({
              cat: "Odometer Record",
              km: 0,
              route: "N/A",
              coords: "N/A",
            });
          }

          if (rowsToPrint.length > 0) {
            const startTz = formatTz(s.actual_start_time, s.start_time);

            rowsToPrint.forEach((row, idx) => {
              if (doc.y > 650) {
                doc.addPage();
              }

              let rowStartY = doc.y;
              doc.font("Helvetica").fontSize(8);
              doc.text(idx === 0 ? startTz.date : "", 55, rowStartY, {
                width: 45,
              });
              doc.text(
                idx === 0 ? `${s.client_first} ${s.client_last}` : "",
                105,
                rowStartY,
                { width: 70 },
              );

              const rowH1 = doc.y;
              doc.text(row.route || "N/A", 180, rowStartY, { width: 150 });
              doc
                .font("Helvetica")
                .fontSize(7)
                .text(row.coords || "", 180, doc.y + 2, { width: 150 });

              const hAfterRoute = doc.y;
              doc.font("Helvetica").fontSize(8);
              doc.text(row.cat, 340, rowStartY, { width: 75 });
              doc.text(row.km.toFixed(2), 420, rowStartY, { width: 25 });

              if (idx === 0) {
                const startOdo = s.odometer_start_reading || "N/A";
                const endOdo = s.odometer_end_reading || "N/A";
                doc.text(`${startOdo}-${endOdo}`, 450, rowStartY, {
                  width: 100,
                });
              }

              doc.y = Math.max(rowStartY + 12, hAfterRoute + 5);
            });

            if (s.odometer_start_photo || s.odometer_end_photo) {
              if (doc.y > 600) {
                doc.addPage();
              }

              doc.moveDown(0.5);
              let imgHeight = 0;
              const currentY = doc.y;
              doc.fillColor("black");
              if (
                s.odometer_start_photo &&
                s.odometer_start_photo.startsWith("data:image/")
              ) {
                try {
                  const base64Data = s.odometer_start_photo.replace(
                    /^data:image\/\w+;base64,/,
                    "",
                  );
                  const imgBuffer = Buffer.from(base64Data, "base64");
                  doc
                    .fontSize(7)
                    .font("Helvetica-Oblique")
                    .text("Start Odo:", 200, currentY);
                  doc.image(imgBuffer, 200, currentY + 10, { height: 60 });
                  imgHeight = 70;
                } catch (e) {}
              }

              if (
                s.odometer_end_photo &&
                s.odometer_end_photo.startsWith("data:image/")
              ) {
                try {
                  const base64Data = s.odometer_end_photo.replace(
                    /^data:image\/\w+;base64,/,
                    "",
                  );
                  const imgBuffer = Buffer.from(base64Data, "base64");
                  doc
                    .fontSize(7)
                    .font("Helvetica-Oblique")
                    .text("End Odo:", 360, currentY);
                  doc.image(imgBuffer, 360, currentY + 10, { height: 60 });
                  imgHeight = 70;
                } catch (e) {}
              }

              if (imgHeight > 0) {
                doc.y = currentY + imgHeight + 15;
              }
            }

            doc
              .moveTo(50, doc.y)
              .lineTo(550, doc.y)
              .lineWidth(0.5)
              .strokeColor("#e4e4e7")
              .stroke();
            doc.y += 5;
          }
        });
        doc.moveDown();
        doc.fontSize(10).font("Helvetica-Bold").fillColor("black");
        doc.text(
          `Total Provider Travel (NDIS): ${totalProviderKm.toFixed(2)} km`,
        );
        doc.text(`Total Home Care Travel: ${totalHcKm.toFixed(2)} km`);
        doc.text(`Total ABT (NDIS): ${totalAbtKm.toFixed(2)} km`);

        doc.end();
      } catch (e) {
        console.error(e);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error" });
        }
      }
    },
  );
  // Compliance logging
  app.get(
    "/api/compliance/logs",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const logs = db
          .prepare(
            `
         SELECT a.*, u.first_name, u.last_name 
         FROM audit_logs a
         LEFT JOIN users u ON a.changed_by_user_id = u.id
         ORDER BY a.timestamp DESC
         LIMIT 100
       `,
          )
          .all();
        res.json(logs);
      } catch (e: any) {
        logger.error(
          "API Error",
          Object.assign({}, e, { message: e?.message, stack: e?.stack }),
        );
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Database Backups & Management ---
  const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Daily compliance document expiry check function
  async function checkComplianceDocumentExpiry() {
    try {
      logger.info("Running compliance document expiry check...");

      // Step 1: Evaluate all active date_expires records. We assume valid documents have date_expires.
      // We will look for files belonging to staff members and verify if they are expiring soon or expired.
      // To prevent flooding, we can check if a notification already exists for this file_id/type.
      const expiringFiles = db
        .prepare(
          `
        SELECT f.id, f.uploaded_by, f.original_name, f.date_expires, u.email, u.first_name, u.last_name 
        FROM files f 
        JOIN users u ON f.uploaded_by = u.id 
        WHERE f.date_expires IS NOT NULL
      `,
        )
        .all() as any[];
      const today = new Date();
      const insertNotif = db.prepare(
        "INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
      );
      const checkNotif = db.prepare(
        "SELECT id FROM notifications WHERE user_id = ? AND type = ? AND message LIKE ? AND is_read = 0",
      );

      const admins = db
        .prepare("SELECT id FROM users WHERE role = 'ADMIN'")
        .all() as any[];

      for (const file of expiringFiles) {
        const expDate = new Date(file.date_expires);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          // EXPIRED
          const title = `Document Expired`;
          const msg = `Your mandatory document '${file.original_name}' has expired. Immediate action required.`;
          const adminMsg = `Staff member ${file.first_name} ${file.last_name} (${file.email}) has an expired document: '${file.original_name}'.`;
          
          // Notify staff member
          const exists = checkNotif.get(
            file.uploaded_by,
            "DOCUMENT_EXPIRED",
            `%${file.original_name}%`,
          );
          if (!exists) {
            insertNotif.run(
              file.uploaded_by,
              "DOCUMENT_EXPIRED",
              title,
              msg,
              `/onboarding`,
            );
            
            // Notify admins
            for (const admin of admins) {
              const adminExists = checkNotif.get(
                admin.id,
                "DOCUMENT_EXPIRED",
                `%${file.original_name}%`,
              );
              if (!adminExists) {
                insertNotif.run(
                  admin.id,
                  "DOCUMENT_EXPIRED",
                  `Staff Document Expired`,
                  adminMsg,
                  `/compliance`,
                );
              }
            }

            logger.info(
              `Flagged EXPIRED for file ${file.id} (user ${file.uploaded_by})`,
            );

            // Send Email reminder safely if SMTP is configured
            if (process.env.SMTP_USER && process.env.SMTP_PASS && file.email) {
              try {
                await transporter.sendMail({
                  from: process.env.SMTP_FROM || "support@happyinthehome.com",
                  to: file.email,
                  subject: `Action Required: Document Expired - Happy in the Home`,
                  text:
                    `Dear ${file.first_name || "Team Member"},\n\n` +
                    `This is a friendly reminder that your mandatory document '${file.original_name}' has expired.\n\n` +
                    `Immediate renewal is required to maintain compliance. Please log in to your Staff Portal and upload the renewed document.\n\n` +
                    `Regards,\n` +
                    `Happy in the Home Support Team`,
                });
                logger.info(
                  `Expiry email notification sent to ${file.email} for file ${file.id}`,
                );
              } catch (mailErr) {
                logger.error(
                  `Failed to send expiry email to ${file.email}:`,
                  mailErr,
                );
              }
            }
          }
        } else if (diffDays <= 90) {
          // EXPIRING SOON
          const title = `Document Expiring Soon`;
          const msg = `Your mandatory document '${file.original_name}' expires in ${diffDays} days. Please renew it soon.`;
          const adminMsg = `Staff member ${file.first_name} ${file.last_name} (${file.email}) has a document expiring in ${diffDays} days: '${file.original_name}'.`;
          
          // Notify staff member
          const exists = checkNotif.get(
            file.uploaded_by,
            "DOCUMENT_EXPIRING_SOON",
            `%${file.original_name}%`,
          );
          if (!exists) {
            insertNotif.run(
              file.uploaded_by,
              "DOCUMENT_EXPIRING_SOON",
              title,
              msg,
              `/onboarding`,
            );
            
            // Notify admins
            for (const admin of admins) {
              const adminExists = checkNotif.get(
                admin.id,
                "DOCUMENT_EXPIRING_SOON",
                `%${file.original_name}%`,
              );
              if (!adminExists) {
                insertNotif.run(
                  admin.id,
                  "DOCUMENT_EXPIRING_SOON",
                  `Staff Document Expiring Soon`,
                  adminMsg,
                  `/compliance`,
                );
              }
            }

            logger.info(
              `Flagged EXPIRING_SOON for file ${file.id} (user ${file.uploaded_by})`,
            );

            // Send Email reminder safely if SMTP is configured
            if (process.env.SMTP_USER && process.env.SMTP_PASS && file.email) {
              try {
                await transporter.sendMail({
                  from: process.env.SMTP_FROM || "support@happyinthehome.com",
                  to: file.email,
                  subject: `Compliance Alert: Document Expiring Soon - Happy in the Home`,
                  text:
                    `Dear ${file.first_name || "Team Member"},\n\n` +
                    `Your mandatory document '${file.original_name}' is expiring in ${diffDays} days.\n\n` +
                    `Please ensure you renew and re-upload the document before it expires to remain compliant.\n\n` +
                    `Regards,\n` +
                    `Happy in the Home Support Team`,
                });
                logger.info(
                  `Expiring-soon email notification sent to ${file.email} for file ${file.id}`,
                );
              } catch (mailErr) {
                logger.error(
                  `Failed to send expiring-soon email to ${file.email}:`,
                  mailErr,
                );
              }
            }
          }
        }
      }
    } catch (e) {
      logger.error("Error during compliance cron check:", e);
    }
  }

  // Run once on startup
  checkComplianceDocumentExpiry();
  
  try {
    const rawTzSetting = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
    const rawTz = rawTzSetting?.value || "Australia/Perth";
    const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;
    const auDateStr = new Date().toLocaleDateString("en-AU", { timeZone: timezone });
    const [day, month, year] = auDateStr.split('/');
    const today = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const currentMaster = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1 LIMIT 1").get() as any;
    const masterDate = currentMaster && currentMaster.effective_date ? currentMaster.effective_date : '1970-01-01';
    
    const lists = db.prepare("SELECT id FROM price_lists WHERE is_master = 0 AND effective_date IS NOT NULL AND effective_date <= ? AND effective_date > ? ORDER BY effective_date ASC").all(today, masterDate) as any[];
    for (const list of lists) {
      applyMasterPriceList(list.id);
      console.log(`[Startup] Activated scheduled price list ${list.id}`);
    }
  } catch(e) {
    logger.error("Failed to apply scheduled price lists on startup:", e);
  }

  // Migration to repair corrupted services with missing reg_group_number
  try {
    const corruptedServices = db.prepare("SELECT id, code FROM services WHERE type = 'NDIS' AND reg_group_number = '-'").all() as any[];
    if (corruptedServices.length > 0) {
      console.log(`[Startup] Found ${corruptedServices.length} corrupted services. Attempting repair...`);
      const getGoodItem = db.prepare("SELECT reg_group_number, reg_group_name FROM price_list_items WHERE code = ? AND reg_group_number != '-' AND reg_group_number IS NOT NULL LIMIT 1");
      const updateSrv = db.prepare("UPDATE services SET reg_group_number = ?, reg_group_name = ? WHERE id = ?");
      
      let repaired = 0;
      for (const s of corruptedServices) {
        const good = getGoodItem.get(s.code) as any;
        if (good) {
          updateSrv.run(good.reg_group_number, good.reg_group_name, s.id);
          repaired++;
        }
      }
      console.log(`[Startup] Repaired ${repaired} corrupted services.`);
    }
  } catch(e) {
    console.error("[Startup] Failed to repair corrupted services:", e);
  }

  // Migration to sync shift.service_id with services_json
  try {
    const shiftsToSync = db.prepare("SELECT id, service_id, services_json FROM shifts").all() as any[];
    let synced = 0;
    const updateSync = db.prepare("UPDATE shifts SET service_id = ? WHERE id = ?");
    for (const shift of shiftsToSync) {
      if (shift.services_json) {
        try {
          const sData = JSON.parse(shift.services_json);
          if (sData && sData.length > 0 && sData[0].serviceId) {
            const jsonServiceId = sData[0].serviceId;
            if (String(jsonServiceId) !== String(shift.service_id)) {
              updateSync.run(jsonServiceId, shift.id);
              synced++;
            }
          }
        } catch(e) {}
      }
    }
    if (synced > 0) console.log(`[Startup] Synced service_id for ${synced} shifts.`);
  } catch(e) {
    console.error("[Startup] Failed to sync shift service IDs:", e);
  }

  // Daily compliance document expiry check
  cron.schedule("0 1 * * *", async () => {
    await checkComplianceDocumentExpiry();
  });

  // Check for future-dated price lists that should become active today
  cron.schedule("0 0 * * *", () => {
    try {
      const rawTzSetting = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
      const rawTz = rawTzSetting?.value || "Australia/Perth";
      const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;
      const auDateStr = new Date().toLocaleDateString("en-AU", { timeZone: timezone });
      const [day, month, year] = auDateStr.split('/');
      const today = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const currentMaster = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1 LIMIT 1").get() as any;
      const masterDate = currentMaster && currentMaster.effective_date ? currentMaster.effective_date : '1970-01-01';
      
      const lists = db.prepare("SELECT id FROM price_lists WHERE is_master = 0 AND effective_date IS NOT NULL AND effective_date <= ? AND effective_date > ? ORDER BY effective_date ASC").all(today, masterDate) as any[];
      for (const list of lists) {
        applyMasterPriceList(list.id);
        console.log(`[Cron] Activated scheduled price list ${list.id}`);
      }
    } catch(e) {
      logger.error("Failed to apply scheduled price lists:", e);
    }
  });

  // automated nightly backups
  cron.schedule("0 2 * * *", async () => {
    try {
      const dateStr = new Date()
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-");
      const filename = `backup-auto-${dateStr}.sqlite`;
      const filepath = path.join(BACKUP_DIR, filename);

      await db.backup(filepath);
      console.log(`Nightly backup completed: ${filepath}`);

      // delete backups older than 7 days
      const files = fs.readdirSync(BACKUP_DIR);
      const now = Date.now();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith(".sqlite")) continue;
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        if (now - stats.mtimeMs > MAX_AGE) {
          fs.unlinkSync(path.join(BACKUP_DIR, file));
          console.log(`Deleted old backup: ${file}`);
        }
      }
    } catch (e) {
      console.error("Nightly backup failed:", e);
    }
  });

  app.get(
    "/api/admin/database/download-live",
    authenticateToken,
    requireAdmin,
    async (req: any, res: any) => {
      try {
        const tempFilename = `live-backup-${Date.now()}.sqlite`;
        const tempFilepath = path.join(BACKUP_DIR, tempFilename);

        await db.backup(tempFilepath);

        res.download(tempFilepath, "database.sqlite", (err: any) => {
          if (fs.existsSync(tempFilepath)) {
            fs.unlinkSync(tempFilepath);
          }
        });
      } catch (e: any) {
        logger.error(
          "API Error",
          Object.assign({}, e, { message: e?.message, stack: e?.stack }),
        );
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/admin/database/list",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const files = fs
          .readdirSync(BACKUP_DIR)
          .filter(
            (f: string) =>
              f.endsWith(".sqlite") && f.startsWith("backup-auto-"),
          );
        const list = files.map((file: string) => {
          const stats = fs.statSync(path.join(BACKUP_DIR, file));
          return {
            name: file,
            date: stats.mtime,
            size: stats.size,
          };
        });
        list.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        res.json(list);
      } catch (e: any) {
        logger.error(
          "API Error",
          Object.assign({}, e, { message: e?.message, stack: e?.stack }),
        );
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/api/admin/database/download-backup/:filename",
    authenticateToken,
    requireAdmin,
    (req: any, res: any) => {
      try {
        const file = path.basename(req.params.filename);
        const filepath = path.join(BACKUP_DIR, file);
        if (fs.existsSync(filepath)) {
          res.download(
            filepath,
            file.replace("backup-auto-", "historical-backup-"),
          );
        } else {
          res.status(404).json({ error: "File not found" });
        }
      } catch (e: any) {
        logger.error(
          "API Error",
          Object.assign({}, e, { message: e?.message, stack: e?.stack }),
        );
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Position Templates Routes ---
  app.get("/api/settings/position-templates", authenticateToken, (req, res) => {
    try {
      const templates = db
        .prepare(
          "SELECT position_title, description_text FROM position_templates",
        )
        .all();
      res.json(templates);
    } catch (e: any) {
      logger.error("API Error: GET position-templates", { error: String(e) });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/settings/position-templates", authenticateToken, (req, res) => {
    const { position_title, description_text } = req.body;
    try {
      db.prepare(
        `
        INSERT INTO position_templates (position_title, description_text) 
        VALUES (?, ?) 
        ON CONFLICT(position_title) 
        DO UPDATE SET description_text = excluded.description_text, updated_at = CURRENT_TIMESTAMP
      `,
      ).run(position_title, description_text);
      res.json({ success: true });
    } catch (e: any) {
      logger.error("API Error: PUT position-templates", { error: String(e) });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- PDF Contract Generation Route ---
  app.post(
    "/api/staff/:id/generate-contract",
    authenticateToken,
    async (req, res) => {
      const { id } = req.params;
      const {
        employmentType,
        positionTitle,
        schadsLevel,
        schadsPayPoint,
        baseHourlyRate,
        industrialInstrument,
        commencementDate,
        probationPeriod,
        positionDescription,
        staffName,
        address,
      } = req.body;

      try {
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({
          margin: 40,
          size: "A4",
          bufferPages: true,
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Employment_Contract_${staffName.replace(/\\s+/g, "_")}.pdf"`,
        );

        doc.pipe(res);

        // Logo Support
        const settingsTable = db
          .prepare("SELECT value FROM settings WHERE key = ?")
          .get("letterheadLogo") as any;
        const logoUrl = settingsTable?.value
          ? JSON.parse(settingsTable.value)
          : undefined;
        const addLogo = () => {
          if (logoUrl) {
            try {
              const logoFilename = logoUrl.split("/").pop();
              const logoPath = require("path").join(assetsDir, logoFilename);
              if (require("fs").existsSync(logoPath)) {
                doc.image(logoPath, doc.page.width - 40 - 90, 40, {
                  width: 90,
                });
                // We do NOT modify doc.y, so standard text on the left stays at the top.
              }
            } catch (err) {}
          }
        };

        // Colors & Fonts
        const primaryColor = "#000000";
        const secondaryColor = "#4a4a4a";

        // --- PAGE 1: LETTER OF OFFER ---
        addLogo();
        // Reset X and Y to top left
        doc.x = 40;
        doc.y = 40;
        // Header
        doc
          .font("Helvetica-Bold")
          .fontSize(22)
          .fillColor(primaryColor)
          .text("Letter of Offer", { width: doc.page.width - 80 });
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(11);
        doc.text("HAPPY IN THE HOME");
        doc.text("24 Pollett Street, Spalding WA 6530");
        doc.text("ABN: 69695033115");

        // Date of contract issue
        doc.moveDown(1);
        const todayDate = new Date().toLocaleDateString("en-AU");
        doc.font("Helvetica").text(todayDate);

        // Addressee
        doc.moveDown(1);
        doc.font("Helvetica-Bold").text(staffName);
        doc.font("Helvetica").text(address);

        doc.moveDown(2);
        doc.font("Helvetica").text(`Dear ${staffName.split(" ")[0]},`);
        doc.moveDown(1);
        doc.font("Helvetica-Bold").text("Re: Offer of employment");
        doc.moveDown(1);
        doc
          .font("Helvetica")
          .text(
            `I am pleased to offer you the position of ${positionTitle} with Happy in the Home.`,
          );
        doc.moveDown(1);

        doc.text(
          `Please find attached your employment contract which provides the terms and conditions for this position. At a minimum, your terms and conditions are in accordance with the National Employment Standards and the ${industrialInstrument}. I've also attached the position description.`,
        );
        doc.moveDown(1);

        doc.text(
          `If you have any questions about your employment, please contact me on 0429604099. You can also contact the Fair Work Ombudsman (www.fairwork.gov.au) for help with minimum terms and conditions of employment.`,
        );
        doc.moveDown(1);

        doc.text(
          `To accept this offer and the attached terms and conditions, please sign and date this letter in the section below and sign the attached employment contract and return to me by ${new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-AU")}.`,
        );
        doc.moveDown(1);

        doc.text("Congratulations – I look forward to you joining us.");
        doc.moveDown(2);

        doc.text("Yours sincerely,");
        doc.moveDown(3);
        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + 200, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Employer signature");
        doc.moveDown(2);
        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + 200, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Employer name and position");

        // --- PAGE 2: ACCEPTANCE OF OFFER ---
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(16).text("Acceptance of offer");
        doc.moveDown(1);
        doc.font("Helvetica").fontSize(11);
        doc.text(`I ${staffName}:`);
        doc.moveDown(0.5);
        doc.text(
          "• have read and understand the terms and conditions in the attached employment contract",
          { indent: 20 },
        );
        doc.text(
          "• have discussed any issues I have with these terms and conditions with my employer and they have considered and responded to any issues raised",
          { indent: 20 },
        );
        doc.text(
          "• have received a copy of the contract and this letter of offer for my records.",
          { indent: 20 },
        );
        doc.moveDown(4);

        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + 250, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Employee signature");
        doc.moveDown(3);
        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + 250, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Date");

        // --- PAGE 3: EMPLOYMENT CONTRACT START ---
        doc.addPage();
        addLogo();
        doc.x = 40;
        doc.y = 40;
        doc
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Employment Contract", { width: doc.page.width - 80 });
        doc.moveDown(1.5);

        doc.font("Helvetica").fontSize(11);
        doc.text(`This is an employment contract dated ${todayDate}.`);
        doc.moveDown(1.5);

        doc.text("Between (employer name of employer address):");
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Happy in the Home");
        doc.font("Helvetica").text("24 Pollett Street, Spalding WA 6530");
        doc.moveDown(1.5);

        doc.text("and (employee's name of employee's address):");
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text(staffName);
        doc.font("Helvetica").text(address);
        doc.moveDown(2);

        // Section: Position
        doc.font("Helvetica-Bold").fontSize(15).text("Position");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(`You are being employed in the position of ${positionTitle}.`);
        doc.moveDown(0.5);
        doc.text(
          `You are being employed on a ${employmentType.toLowerCase()} basis, as required.`,
        );
        doc.moveDown(1);

        if (positionDescription) {
          doc.font("Helvetica-Bold").fontSize(13).text("Position Description");
          doc.moveDown(0.5);
          doc.font("Helvetica").fontSize(11).text(positionDescription);
          doc.moveDown(1);
        }

        if (employmentType === "Casual") {
          doc.text(
            "Because you are a casual employee, we do not guarantee the days or hours you'll work, or how long you'll be employed for. We do not commit to providing you with work that will be continuing or indefinite.",
          );
          doc.moveDown(0.5);
          doc.text(
            "We may choose to offer you work and you may accept or refuse our offer. You will be paid a casual loading or a specific casual pay rate.",
          );
          doc.moveDown(0.5);
          doc.text(
            "In some circumstances, you may have the right to become a permanent employee.",
          );
        }
        doc.moveDown(1);

        // Section: Employment dates
        doc.font("Helvetica-Bold").fontSize(13).text("Employment dates");
        doc.moveDown(0.5);
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(
            `Your start date will be ${new Date(commencementDate).toLocaleDateString("en-AU")}.`,
          );
        doc.moveDown(1.5);

        if (probationPeriod !== "None") {
          doc.font("Helvetica-Bold").fontSize(13).text("Probation");
          doc.moveDown(0.5);
          doc
            .font("Helvetica")
            .fontSize(11)
            .text(
              `Your employment is subject to a probation period of ${probationPeriod}.`,
            );
          doc.moveDown(1.5);
        }

        // Section: Workplace
        doc.font("Helvetica-Bold").fontSize(13).text("Workplace");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text("You will be required to work at the following location/s:");
        doc.moveDown(0.5);
        doc.text("24, Pollett Street, Spalding, Western Australia, 6530");
        doc.moveDown(0.5);
        doc.text(
          "You may also be required to work at other locations where reasonable.",
        );
        doc.moveDown(1.5);

        // Section: Duties
        doc.font("Helvetica-Bold").fontSize(13).text("Duties");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You will perform the duties described in the attached position description as required.",
          );
        doc.moveDown(0.5);
        doc.text(
          "We may also assign you other duties, where reasonable for your position, qualifications, training and experience.",
        );
        doc.moveDown(1.5);

        // Section: Employment terms and conditions
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("Employment terms and conditions");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(
          `Your employment terms and conditions are those set out in this contract, the ${industrialInstrument} and applicable legislation. This includes, the National Employment Standards in the Fair Work Act 2009.`,
        );
        doc.moveDown(0.5);
        doc.text(
          "You can check the minimum award entitlements for your classification level with the Fair Work Ombudsman's Pay and Conditions Tool.",
        );
        doc.moveDown(1.5);

        // Section: Hours of work
        doc.font("Helvetica-Bold").fontSize(15).text("Hours of work");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(
          `As a ${employmentType.toLowerCase()} employee, your hours may vary depending on business needs.`,
        );
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(13).text("Shift work hours");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "At the start of your employment, you will be rostered to work day, afternoon and night shifts in accordance with the award. The shifts you work may be changed later in accordance with award rules about changing hours of work, rosters and consultation.",
          );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Rosters");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(
          "We will provide you with your days and hours of work in a roster at least 7 days before the start of the roster.",
        );
        doc.moveDown(0.5);
        doc.text(
          "If we need to change your roster, we will give you 7 days' notice or ask for your agreement to the change.",
        );
        doc.moveDown(0.5);
        doc.text(
          "If you wish to ask for a change to your roster, we require 7 days' notice. You will need our agreement to the change.",
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Breaks");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(
          "Depending on the number of hours you work in a shift, you may be entitled to meal breaks. The award sets out:",
        );
        doc.text("• the length of the breaks", { indent: 20 });
        doc.text("• when they need to be taken", { indent: 20 });
        doc.text("• the rules about payment.", { indent: 20 });
        doc.moveDown(0.5);
        doc.text("You may also be entitled to rest breaks.");
        doc.moveDown(1.5);

        // Section: Pay and allowances
        doc.font("Helvetica-Bold").fontSize(15).text("Pay and allowances");
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(13).text("Pay rate");
        doc.moveDown(0.5);
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(
            `You will be paid $${parseFloat(baseHourlyRate || 0).toFixed(2)} per hour (${schadsLevel} ${schadsPayPoint}). `,
            { continued: true },
          );
        doc
          .font("Helvetica")
          .text(
            `This pay rate includes casual loading at the percentage set out in your award. This loading is paid instead of entitlements that apply to permanent employees like paid personal leave and annual leave.`,
          );
        doc.moveDown(0.5);
        doc.text(
          "This pay rate does not include superannuation, we'll pay this separately.",
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Payment method");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "We will pay you fortnightly into your nominated bank account.",
          );
        doc.moveDown(1.5);

        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("Penalty rates and overtime");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You may be entitled to overtime rates under your award if you work:",
          );
        doc.text("• more than your ordinary hours of work", { indent: 20 });
        doc.text("• outside the spread of ordinary hours.", { indent: 20 });
        doc.moveDown(0.5);
        doc.text(
          "You may be entitled to penalty rates or shift loadings according to your award if you work:",
        );
        doc.text("• on a weekend", { indent: 20 });
        doc.text("• on a public holiday", { indent: 20 });
        doc.text("• late night or early morning shifts.", { indent: 20 });
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Superannuation");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(
          "If you are eligible for the super guarantee (SG), we will pay the contributions on your behalf in accordance with legislation and your award. We will pay contributions into a super fund of your choice.",
        );
        doc.moveDown(0.5);
        doc.text(
          "If you do not tell us your choice of fund, we may need to contact the ATO to find out if you have a 'stapled' super fund to make your SG contributions into.",
        );
        doc.moveDown(0.5);
        doc.text(
          "If you do not tell us your choice of fund and the ATO confirms you don't have a stapled super fund, we will pay your SG contributions to our default fund or another fund that meets the choice of fund rules.",
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Annual pay review");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(
          "We will review your pay annually to determine whether you are eligible for an increase, taking into consideration:",
        );
        doc.text("• your performance", { indent: 20 });
        doc.text("• the business's financial position.", { indent: 20 });
        doc.moveDown(0.5);
        doc.text(
          "Any increase in your pay, above your award entitlements, is our decision.",
        );
        doc.moveDown(1.5);

        // Section: Leave
        doc.font("Helvetica-Bold").fontSize(15).text("Leave");
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(13).text("Carer's leave");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You are entitled to 2 days of unpaid carer's leave (in accordance with the National Employment Standards). This is available each time a member of your immediate family or household needs your care or support because of:",
          );
        doc.text("• personal injury", { indent: 20 });
        doc.text("• personal illness", { indent: 20 });
        doc.text("• an unexpected emergency.", { indent: 20 });
        doc.text(
          "• You must give us notice as soon as possible to take carer's leave. We may also require evidence (such as a medical certificate).",
          { indent: 20 },
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Compassionate leave");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You are entitled to 2 days unpaid compassionate leave (in accordance with the National Employment Standards) each time:",
          );
        doc.text(
          "• a member of your immediate family or household dies, or contracts or develops a life-threatening illness or injury",
          { indent: 20 },
        );
        doc.text(
          "• a child is stillborn, that would have been a member of your immediate family or household if born alive",
          { indent: 20 },
        );
        doc.text(
          "• you or your current spouse or de facto partner has a miscarriage.",
          { indent: 20 },
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Community service leave");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You may be entitled to community service leave (in accordance with the National Employment Standards) for certain activities such as:",
          );
        doc.text("• voluntary emergency management activities", { indent: 20 });
        doc.text("• jury duty and jury selection.", { indent: 20 });
        doc.moveDown(0.5);
        doc.text("You must give us:");
        doc.text("• notice of your leave as soon as possible", { indent: 20 });
        doc.text(
          "• details of the period, or expected period, that you will be away from work.",
          { indent: 20 },
        );
        doc.moveDown(0.5);
        doc.text(
          "We may ask you to provide evidence that you require community service leave.",
        );
        doc.moveDown(1.5);

        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("Family and domestic violence leave");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You may be entitled to 10 days of paid family and domestic violence leave (in accordance with the National Employment Standards) each 12-month period.",
          );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Long service leave");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You may be entitled to long service leave after working with us for a specific period of time in accordance with relevant state or territory legislation or the Fair Work Act.",
          );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Parental leave");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You may be entitled to 12 months of unpaid parental leave if you:",
          );
        doc.text(
          "• have worked for us on a regular and systematic basis for 12 months or more",
          { indent: 20 },
        );
        doc.text(
          "• had a reasonable expectation of continuing your employment on a regular and systematic basis had it not been for the birth or adoption of a child.",
          { indent: 20 },
        );
        doc.moveDown(0.5);
        doc.text("You may also:");
        doc.text(
          "• request up to an extra 12 months of unpaid parental leave",
          { indent: 20 },
        );
        doc.text(
          "• be entitled to Parental Leave Pay from the Australian Government, administered by Services Australia.",
          { indent: 20 },
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Public holidays");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text("You have a right to be absent from work on a public holiday.");
        doc.moveDown(0.5);
        doc.text(
          "We may ask you to work on a public holiday, but as you are a casual employee you may refuse our offer of work.",
        );
        doc.moveDown(0.5);
        doc.text(
          "If you work on a public holiday, you are entitled to any additional entitlements set out under your award, such as public holiday penalty rates.",
        );
        doc.moveDown(1.5);

        // Section: Obligations
        doc.font("Helvetica-Bold").fontSize(15).text("Obligations");
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(13).text("Employee obligations");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text("As an employee of our business, we expect you to:");
        doc.text("• carry out your duties to the best of your ability", {
          indent: 20,
        });
        doc.text("• act honestly and in the best interests of the business", {
          indent: 20,
        });
        doc.text(
          "• comply with our business policies and procedures which we will make available to you (but do not form part of this contract)",
          { indent: 20 },
        );
        doc.text(
          "• comply with any other lawful and reasonable directions we provide.",
          { indent: 20 },
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Conflict of interest");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "While employed with us, you must get our written agreement before working for other employers or doing activities that may conflict with the interests of our business.",
          );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Confidentiality");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "You agree not to use or disclose confidential information relating to the business. This includes while you are employed by us and after your employment ends.",
          );
        doc.moveDown(0.5);
        doc.text(
          "Confidential information – including trade secrets, pricing structures, documents you create while employed with us, and information on our clients and suppliers – is our property.",
        );
        doc.moveDown(0.5);
        doc.text("There are exceptions if:");
        doc.text("• we have given you our consent", { indent: 20 });
        doc.text(
          "• you are using the information appropriately to do your work for us",
          { indent: 20 },
        );
        doc.text("• the information is already publicly available", {
          indent: 20,
        });
        doc.text("• the information is required by law.", { indent: 20 });
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Intellectual property");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "Anything you invent, develop or create in the course of your work with us, remains our intellectual property. You must tell us about these works immediately.",
          );
        doc.moveDown(0.5);
        doc.text("This includes:");
        doc.text("• designs", { indent: 20 });
        doc.text("• logos", { indent: 20 });
        doc.text("• business and domain names", { indent: 20 });
        doc.text("• copyright", { indent: 20 });
        doc.text("• trade marks", { indent: 20 });
        doc.text("• patents.", { indent: 20 });
        doc.moveDown(0.5);
        doc.text(
          "You must not use or reproduce any intellectual property owned by us without our consent. This includes after your employment ends with us.",
        );
        doc.moveDown(1.5);

        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("Consultation for workplace changes");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "If we intend to make significant changes in the workplace, we will consult with you and your representatives in accordance with the award. This includes major changes to:",
          );
        doc.text(
          "• our business operations, structure or technology that are likely to significantly affect you",
          { indent: 20 },
        );
        doc.text(
          "• your regular roster or ordinary hours of work – if you work regular hours.",
          { indent: 20 },
        );
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Disputes");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "If you have any concerns about your employment, talk to us first so we can try to solve the issues together. Your award has a dispute resolution term that sets out this process.",
          );
        doc.moveDown(0.5);
        doc.text(
          "If the dispute remains unresolved, you or we may refer it to the Fair Work Commission. If this happens, you can be represented by another person or organisation.",
        );
        doc.moveDown(0.5);
        doc.text(
          "While the dispute is being resolved, you must continue to work as usual as long as the work complies with any applicable work health and safety legislative requirements.",
        );
        doc.moveDown(1.5);

        // Section: Ending employment
        doc.font("Helvetica-Bold").fontSize(15).text("Ending employment");
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(13).text("Notice");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11).text("As a casual employee, if:");
        doc.text(
          "• we end your employment, we do not have to give you notice",
          { indent: 20 },
        );
        doc.text("• you resign, you do not have to give us notice.", {
          indent: 20,
        });
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Misconduct");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "We may terminate your employment without notice, or payment in lieu of notice, if you engage in serious misconduct.",
          );
        doc.moveDown(0.5);
        doc.text("Serious misconduct is when an employee:");
        doc.text(
          "• causes serious and imminent risk to the health and safety of another person or to the reputation, viability or profits of their employer's business, or",
          { indent: 20 },
        );
        doc.text(
          "• wilfully or deliberately behaves in a way that's inconsistent with continuing their employment.",
          { indent: 20 },
        );
        doc.moveDown(0.5);
        doc.text("Examples of serious misconduct include:");
        doc.text("• theft", { indent: 20 });
        doc.text("• fraud", { indent: 20 });
        doc.text("• violence/assault", { indent: 20 });
        doc.text("• sexual harassment", { indent: 20 });
        doc.text("• serious breaches of health and safety requirements", {
          indent: 20,
        });
        doc.text("• being drunk or affected by drugs at work", { indent: 20 });
        doc.text("• refusing to carry out work duties.", { indent: 20 });
        doc.moveDown(1.5);

        // --- PAGE: SIGNED ---
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(16).text("SIGNED");
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(13).text("Employer");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "Signed for and on behalf of Happy in the Home by its authorized representative.",
          );
        doc.moveDown(3);

        const sigWidth = 250;
        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Signature");
        doc.moveDown(2);

        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Name (print)");
        doc.moveDown(2);

        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Position");
        doc.moveDown(2);

        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Date");
        doc.moveDown(4);

        // Employee
        doc.font("Helvetica-Bold").fontSize(13).text("Employee");
        doc.moveDown(0.5);
        doc
          .font("Helvetica")
          .fontSize(11)
          .text(
            "I understand and agree to the terms and conditions of employment set out in this contract.",
          );
        doc.moveDown(3);

        doc.text(staffName);
        doc.moveDown(0.2);
        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Name (print)");
        doc.moveDown(3);

        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Signature");
        doc.moveDown(3);

        doc.text(todayDate);
        doc.moveDown(0.2);
        doc
          .moveTo(doc.x, doc.y)
          .lineTo(doc.x + sigWidth, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.text("Date");

        // Add page numbers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          // Temporarily disable bottom margin to avoid unwanted new pages
          const oldBottom = doc.page.margins.bottom;
          doc.page.margins.bottom = 0;
          doc.font("Helvetica").fontSize(9).fillColor("#888888");
          doc.text(`Page ${i + 1} of ${range.count}`, 0, doc.page.height - 30, {
            align: "center",
            width: doc.page.width,
            lineBreak: false,
          });
          doc.page.margins.bottom = oldBottom;
        }

        doc.end();
      } catch (e: any) {
        logger.error("API Error: Generate Contract", { error: String(e) });
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  // --- Vite Middleware or Static Files ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true, // <--- ADD THIS LINE HERE
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- Global Robust Error Handler ---
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error("Unhandled Application Error", {
      error: err.message || String(err),
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    if (res.headersSent) {
      return next(err);
    }

    if (
      err.code &&
      typeof err.code === "string" &&
      err.code.startsWith("SQLITE_CONSTRAINT")
    ) {
      return res.status(400).json({ error: "Database validation failed" });
    }

    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid payload format" });
    }

    // Production-Grade Stability: Mask 500-level stack traces from the frontend
    res.status(500).json({
      error: "Internal Server Error. Please contact support.",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
