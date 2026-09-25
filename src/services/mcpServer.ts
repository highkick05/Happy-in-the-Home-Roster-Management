import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import type Database from "better-sqlite3";

/**
 * Model Context Protocol (MCP) Server for Happy in the Home
 * Provides analytical tools to monitor client funds and optimize quarterly rostering budgets (Trilogy Care).
 */
export function setupMcpServer(app: Express, db: Database.Database) {
  // Map of active SSE transports by sessionId
  const transports: Record<string, SSEServerTransport> = {};

  // Factory function to create a configured McpServer with analytical tools
  function createConfiguredMcpServer(): McpServer {
    const server = new McpServer({
      name: "happy-in-the-home-care-mcp",
      version: "1.0.0"
    });

    /**
     * Tool A: analyze_client_funds
     * Analyzes client funds for a quarterly budget cycle (Trilogy Care).
     */
    server.tool(
      "analyze_client_funds",
      {
        clientName: z.string().describe("Full or partial name of the client to analyze"),
        quarterStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").describe("Start date of the 3-month quarter (YYYY-MM-DD)"),
        quarterEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").describe("End date of the 3-month quarter (YYYY-MM-DD)"),
        totalQuarterlyBudget: z.number().positive().describe("Total allocated funding budget for this quarter in AUD")
      },
      async ({ clientName, quarterStartDate, quarterEndDate, totalQuarterlyBudget }) => {
        try {
          // 1. Locate client using parameterized query
          const client = db.prepare(
            `SELECT id, first_name, last_name, funding_type 
             FROM clients 
             WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
                OR first_name LIKE ? 
                OR last_name LIKE ?
             LIMIT 1`
          ).get(`%${clientName.trim()}%`, `%${clientName.trim()}%`, `%${clientName.trim()}%`) as any;

          if (!client) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: `Client '${clientName}' not found in the database.`,
                  clientName
                }, null, 2)
              }]
            };
          }

          // 2. Query all shifts (both COMPLETED and SCHEDULED/PUBLISHED) within the date range
          const startIso = `${quarterStartDate}T00:00:00.000Z`;
          const endIso = `${quarterEndDate}T23:59:59.999Z`;

          const shifts = db.prepare(
            `SELECT s.id, s.start_time, s.end_time, s.status, s.services_json,
                    s.service_id, srv.name as service_name, srv.rate as service_rate, srv.unit as service_unit
             FROM shifts s
             LEFT JOIN services srv ON s.service_id = srv.id
             WHERE s.client_id = ?
               AND s.start_time >= ?
               AND s.start_time <= ?
               AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID')
             ORDER BY s.start_time ASC`
          ).all(client.id, startIso, endIso) as any[];

          let totalUsedFunds = 0;
          let totalHours = 0;
          let completedCount = 0;
          let scheduledCount = 0;

          for (const shift of shifts) {
            const isCompleted = UPPER(shift.status) === 'COMPLETED';
            if (isCompleted) {
              completedCount++;
            } else {
              scheduledCount++;
            }

            const startMs = new Date(shift.start_time).getTime();
            const endMs = new Date(shift.end_time).getTime();
            const durationHrs = Math.max(0, (endMs - startMs) / 3600000);
            totalHours += durationHrs;

            let shiftCost = 0;
            let parsedServices: any[] = [];
            if (shift.services_json) {
              try {
                parsedServices = JSON.parse(shift.services_json);
              } catch (e) {}
            }

            if (Array.isArray(parsedServices) && parsedServices.length > 0) {
              for (const sd of parsedServices) {
                const srv = sd.serviceId ? db.prepare("SELECT rate, unit FROM services WHERE id = ?").get(sd.serviceId) as any : null;
                const effectiveRate = Number(sd.rateOverride ?? srv?.rate ?? 0);
                const isKm = (sd.serviceUnit || srv?.unit || '').toUpperCase() === 'KM';
                const qty = Number(sd.qtyOverride ?? (isKm ? 0 : durationHrs));
                shiftCost += qty * effectiveRate;
              }
            } else {
              const baseRate = Number(shift.service_rate || 0);
              shiftCost = durationHrs * baseRate;
            }

            totalUsedFunds += shiftCost;
          }

          // 3. Compute quarter weeks and average burn metrics
          const quarterStartMs = new Date(quarterStartDate).getTime();
          const quarterEndMs = new Date(quarterEndDate).getTime();
          const quarterTotalWeeks = Math.max(1, (quarterEndMs - quarterStartMs) / (7 * 24 * 3600 * 1000));
          const remainingFunds = parseFloat((totalQuarterlyBudget - totalUsedFunds).toFixed(2));
          const averageWeeklyHours = parseFloat((totalHours / quarterTotalWeeks).toFixed(2));
          const averageWeeklySpend = parseFloat((totalUsedFunds / quarterTotalWeeks).toFixed(2));

          const result = {
            clientName: `${client.first_name} ${client.last_name}`,
            clientId: client.id,
            fundingType: client.funding_type || "Trilogy Care / HCP",
            quarterStartDate,
            quarterEndDate,
            quarterTotalWeeks: parseFloat(quarterTotalWeeks.toFixed(1)),
            totalQuarterlyBudget,
            totalUsedFunds: parseFloat(totalUsedFunds.toFixed(2)),
            remainingFunds,
            burnRatePercentage: `${((totalUsedFunds / totalQuarterlyBudget) * 100).toFixed(2)}%`,
            totalCommittedHours: parseFloat(totalHours.toFixed(2)),
            averageWeeklyHours,
            averageWeeklySpend,
            shiftCount: shifts.length,
            statusBreakdown: {
              completedShifts: completedCount,
              scheduledShifts: scheduledCount
            }
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to analyze client funds" })
            }]
          };
        }
      }
    );

    /**
     * Tool B: optimize_quarterly_roster
     * Analyzes client baseline weekly schedule and calculates surplus rostering capacity.
     */
    server.tool(
      "optimize_quarterly_roster",
      {
        clientName: z.string().describe("Full or partial name of the client to optimize"),
        quarterStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").describe("Start date of the 3-month quarter (YYYY-MM-DD)"),
        quarterEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").describe("End date of the 3-month quarter (YYYY-MM-DD)"),
        remainingFunds: z.number().describe("Remaining surplus budget for the rest of the quarter in AUD")
      },
      async ({ clientName, quarterStartDate, quarterEndDate, remainingFunds }) => {
        try {
          // 1. Locate client
          const client = db.prepare(
            `SELECT id, first_name, last_name, funding_type 
             FROM clients 
             WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
                OR first_name LIKE ? 
                OR last_name LIKE ?
             LIMIT 1`
          ).get(`%${clientName.trim()}%`, `%${clientName.trim()}%`, `%${clientName.trim()}%`) as any;

          if (!client) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: `Client '${clientName}' not found in the database.`,
                  clientName
                }, null, 2)
              }]
            };
          }

          // 2. Query client shifts to establish baseline weekly pattern
          const startIso = `${quarterStartDate}T00:00:00.000Z`;
          const endIso = `${quarterEndDate}T23:59:59.999Z`;

          const shifts = db.prepare(
            `SELECT s.id, s.start_time, s.end_time, s.services_json,
                    s.service_id, srv.name as service_name, srv.rate as service_rate
             FROM shifts s
             LEFT JOIN services srv ON s.service_id = srv.id
             WHERE s.client_id = ?
               AND s.start_time >= ?
               AND s.start_time <= ?
               AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID')`
          ).all(client.id, startIso, endIso) as any[];

          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const patternMap: Record<string, { dayOfWeek: string; serviceName: string; totalHours: number; count: number; rate: number }> = {};
          let totalStandardRates = 0;
          let rateCount = 0;

          for (const shift of shifts) {
            const shiftDate = new Date(shift.start_time);
            const dayName = dayNames[shiftDate.getUTCDay()];
            const sName = shift.service_name || "Standard Care Service";
            const sRate = Number(shift.service_rate || 65.47);

            const durationHrs = Math.max(0, (new Date(shift.end_time).getTime() - shiftDate.getTime()) / 3600000);
            const key = `${dayName}_${sName}`;

            if (!patternMap[key]) {
              patternMap[key] = {
                dayOfWeek: dayName,
                serviceName: sName,
                totalHours: 0,
                count: 0,
                rate: sRate
              };
            }
            patternMap[key].totalHours += durationHrs;
            patternMap[key].count += 1;
            totalStandardRates += sRate;
            rateCount++;
          }

          // 3. Calculate remaining weeks in the quarter
          const nowMs = Date.now();
          const quarterStartMs = new Date(quarterStartDate).getTime();
          const quarterEndMs = new Date(quarterEndDate).getTime();
          const effectiveStartMs = Math.max(nowMs, quarterStartMs);
          const remainingMs = Math.max(0, quarterEndMs - effectiveStartMs);
          const remainingWeeks = Math.max(0.1, parseFloat((remainingMs / (7 * 24 * 3600 * 1000)).toFixed(2)));

          // 4. Calculate weekly surplus budget
          const weeklySurplusBudget = parseFloat((remainingFunds / remainingWeeks).toFixed(2));
          const primaryStandardRate = rateCount > 0 ? parseFloat((totalStandardRates / rateCount).toFixed(2)) : 65.47;
          const additionalAffordableHoursPerWeek = parseFloat(Math.max(0, weeklySurplusBudget / primaryStandardRate).toFixed(2));

          // Compute baseline weekly hours
          const quarterWeeks = Math.max(1, (quarterEndMs - quarterStartMs) / (7 * 24 * 3600 * 1000));
          const baselinePattern = Object.values(patternMap).map(p => ({
            dayOfWeek: p.dayOfWeek,
            serviceName: p.serviceName,
            averageWeeklyHours: parseFloat((p.totalHours / quarterWeeks).toFixed(2)),
            unitRate: p.rate,
            estimatedWeeklyCost: parseFloat(((p.totalHours / quarterWeeks) * p.rate).toFixed(2))
          }));

          const totalBaselineWeeklyHours = parseFloat(baselinePattern.reduce((acc, p) => acc + p.averageWeeklyHours, 0).toFixed(2));
          const totalBaselineWeeklyCost = parseFloat(baselinePattern.reduce((acc, p) => acc + p.estimatedWeeklyCost, 0).toFixed(2));

          const result = {
            clientName: `${client.first_name} ${client.last_name}`,
            quarterStartDate,
            quarterEndDate,
            remainingFunds,
            remainingWeeksInQuarter: remainingWeeks,
            weeklySurplusBudget,
            currentWeeklyBaseline: baselinePattern,
            baselineWeeklyHours: totalBaselineWeeklyHours,
            baselineWeeklyCost: totalBaselineWeeklyCost,
            primaryStandardRate,
            additionalAffordableHoursPerWeek,
            recommendedMaxWeeklyHours: parseFloat((totalBaselineWeeklyHours + additionalAffordableHoursPerWeek).toFixed(2)),
            optimizationSummary: `The client has $${remainingFunds.toFixed(2)} remaining across ${remainingWeeks} remaining weeks ($${weeklySurplusBudget.toFixed(2)}/week surplus). At a standard rate of $${primaryStandardRate.toFixed(2)}/hr, they can safely afford an additional ${additionalAffordableHoursPerWeek} hours per week without exceeding their Trilogy Care quarterly budget.`
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to optimize quarterly roster" })
            }]
          };
        }
      }
    );

    return server;
  }

  // --- Express Routing for MCP SSE Transport ---

  /**
   * GET /sse
   * Establishes the Server-Sent Events stream connection for MCP clients.
   */
  app.get("/sse", async (req: Request, res: Response) => {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const transport = new SSEServerTransport("/messages", res);
      const server = createConfiguredMcpServer();

      transports[transport.sessionId] = transport;

      res.on("close", () => {
        delete transports[transport.sessionId];
      });

      await server.connect(transport);
    } catch (err: any) {
      console.error("[MCP] SSE connection error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to establish SSE connection" });
      }
    }
  });

  /**
   * POST /messages
   * Handles incoming JSON-RPC messages from MCP clients forwarded to the appropriate session transport.
   */
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers["x-session-id"] as string);

    if (!sessionId || !transports[sessionId]) {
      return res.status(404).json({ error: "Session not found or expired" });
    }

    try {
      const transport = transports[sessionId];
      await transport.handlePostMessage(req, res);
    } catch (err: any) {
      console.error("[MCP] Error handling post message:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to handle message" });
      }
    }
  });

  console.log("[MCP] Model Context Protocol Server mounted on /sse and /messages");
}

function UPPER(str: any): string {
  return String(str || "").toUpperCase();
}
