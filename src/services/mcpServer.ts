import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import type Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";

function UPPER(str: any): string {
  return String(str || "").toUpperCase();
}

/**
 * Format ISO YYYY-MM-DD date to Australian DD/MM/YYYY
 */
export function formatToAustralianDate(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return isoDateStr;
}

/**
 * Pure Analytical Logic for Tool A: analyze_client_funds
 */
export function analyzeClientFundsLogic(
  db: Database.Database,
  {
    clientName,
    quarterStartDate,
    quarterEndDate,
    totalQuarterlyBudget
  }: {
    clientName: string;
    quarterStartDate: string;
    quarterEndDate: string;
    totalQuarterlyBudget: number;
  }
) {
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
      error: `Client '${clientName}' not found in the database.`,
      clientName
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

  return {
    clientName: `${client.first_name} ${client.last_name}`,
    clientId: client.id,
    fundingType: client.funding_type || "Trilogy Care / HCP",
    quarterStartDate,
    quarterEndDate,
    quarterStartDateAU: formatToAustralianDate(quarterStartDate),
    quarterEndDateAU: formatToAustralianDate(quarterEndDate),
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
}

/**
 * Pure Analytical Logic for Tool B: optimize_quarterly_roster
 */
export function optimizeQuarterlyRosterLogic(
  db: Database.Database,
  {
    clientName,
    quarterStartDate,
    quarterEndDate,
    remainingFunds
  }: {
    clientName: string;
    quarterStartDate: string;
    quarterEndDate: string;
    remainingFunds: number;
  }
) {
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
      error: `Client '${clientName}' not found in the database.`,
      clientName
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

  return {
    clientName: `${client.first_name} ${client.last_name}`,
    quarterStartDate,
    quarterEndDate,
    quarterStartDateAU: formatToAustralianDate(quarterStartDate),
    quarterEndDateAU: formatToAustralianDate(quarterEndDate),
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
}

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
      async (args) => {
        try {
          const result = analyzeClientFundsLogic(db, args);
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
      async (args) => {
        try {
          const result = optimizeQuarterlyRosterLogic(db, args);
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

  // --- Helper to asynchronously fetch saved Gemini API key from database ---
  async function fetchSavedGeminiApiKey(database: Database.Database): Promise<string> {
    return new Promise((resolve) => {
      try {
        const row = database
          .prepare(
            "SELECT value FROM settings WHERE key IN ('gemini_api_key', 'ai_gemini_api_key', 'GEMINI_API_KEY') ORDER BY CASE WHEN key = 'gemini_api_key' THEN 1 WHEN key = 'ai_gemini_api_key' THEN 2 ELSE 3 END LIMIT 1"
          )
          .get() as any;

        if (!row || !row.value) {
          return resolve("");
        }

        let parsedKey = row.value;
        try {
          parsedKey = JSON.parse(row.value);
        } catch {
          parsedKey = row.value;
        }

        if (typeof parsedKey === "string") {
          return resolve(parsedKey.trim());
        }
        return resolve("");
      } catch (err) {
        console.error("[MCP] Error querying saved Gemini API key from database:", err);
        return resolve("");
      }
    });
  }

  // --- Helper to fetch AI settings from SQLite database ---
  function getAiSettings(database: Database.Database) {
    try {
      const rows = database.prepare("SELECT key, value FROM settings WHERE key LIKE 'ai_%'").all() as any[];
      const res: Record<string, any> = {};
      for (const r of rows) {
        try {
          res[r.key] = JSON.parse(r.value);
        } catch {
          res[r.key] = r.value;
        }
      }
      return {
        ai_model: res.ai_model || "gemini-3.8-flash",
        ai_custom_instructions: res.ai_custom_instructions || ""
      };
    } catch {
      return {
        ai_model: "gemini-3.8-flash",
        ai_custom_instructions: ""
      };
    }
  }

  /**
   * GET /api/ai/status
   * Returns current AI status, active model, and database key configuration state.
   */
  app.get("/api/ai/status", async (req: Request, res: Response) => {
    try {
      const savedApiKey = await fetchSavedGeminiApiKey(db);
      const aiConfig = getAiSettings(db);

      res.json({
        configured: Boolean(savedApiKey && savedApiKey.length > 5),
        hasDatabaseKey: Boolean(savedApiKey && savedApiKey.length > 5),
        maskedKey: savedApiKey ? `${savedApiKey.slice(0, 6)}...${savedApiKey.slice(-4)}` : "",
        model: aiConfig.ai_model,
        provider: "Google Gemini",
        mcpActive: true,
        tools: ["analyze_client_funds", "optimize_quarterly_roster"],
        keySource: savedApiKey ? "SQLite Database (settings table)" : "Missing from database",
        settings: {
          ...aiConfig,
          gemini_api_key: savedApiKey
        }
      });
    } catch (err: any) {
      console.error("[AI Status] Error:", err);
      res.status(500).json({ error: "Failed to determine AI status" });
    }
  });

  /**
   * POST /api/ai/test
   * Tests real-time connectivity between backend and Google Gemini using the saved database key.
   */
  app.post("/api/ai/test", async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      let geminiApiKey = req.body.apiKey ? String(req.body.apiKey).trim() : "";
      if (!geminiApiKey) {
        geminiApiKey = await fetchSavedGeminiApiKey(db);
      }

      if (!geminiApiKey) {
        return res.status(400).json({
          success: false,
          error: "Gemini API key is missing from the database. Please enter your API key in the Settings tab under 'AI Settings' and click Save before testing."
        });
      }

      const { model } = req.body;
      const targetModel = model || getAiSettings(db).ai_model || "gemini-3.8-flash";

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const ping = await ai.models.generateContent({
        model: targetModel,
        contents: "Respond strictly with the single sentence: 'AI Connection Operational. Model Context Protocol analytical tools ready.'"
      });

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        latencyMs,
        reply: ping.text ? ping.text.trim() : "AI Connection Operational. Model Context Protocol analytical tools ready.",
        model: targetModel
      });
    } catch (err: any) {
      console.error("[AI Test] Ping failed:", err);
      const latencyMs = Date.now() - startTime;
      res.status(500).json({
        success: false,
        latencyMs,
        error: err.message || "Failed to communicate with Google Gemini API"
      });
    }
  });

  /**
   * POST /api/chat
   * AI & MCP conversational interface for the frontend chat widget.
   * Asynchronously queries the configuration table for the saved Gemini API key before processing.
   */
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      // 1. Asynchronously query the configuration table to fetch the saved API key
      const savedApiKey = await fetchSavedGeminiApiKey(db);

      // 2. If the key is missing from the database, return a clean error to the frontend
      if (!savedApiKey) {
        return res.status(400).json({
          error: "Gemini API key is not configured in the database. Please enter and save your Gemini API key in the Settings tab under 'AI Settings' to enable the AI Assistant."
        });
      }

      const { message, messages } = req.body;
      const userQuery = (message || (Array.isArray(messages) && messages[messages.length - 1]?.content) || "").trim();

      if (!userQuery) {
        return res.status(400).json({ error: "Message is required." });
      }

      const aiConfig = getAiSettings(db);
      const activeModel = aiConfig.ai_model || "gemini-3.8-flash";

      try {
        const ai = new GoogleGenAI({
          apiKey: savedApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

          const analyzeClientFundsDeclaration = {
            name: "analyze_client_funds",
            description: "Query shifts table and calculate total used funds, remaining funds, and current average weekly hours for a client in a 3-month quarter (Trilogy Care cycle). Dates must be ISO YYYY-MM-DD.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" },
                quarterStartDate: { type: Type.STRING, description: "Start date of 3-month quarter (YYYY-MM-DD)" },
                quarterEndDate: { type: Type.STRING, description: "End date of 3-month quarter (YYYY-MM-DD)" },
                totalQuarterlyBudget: { type: Type.NUMBER, description: "Total allocated funding budget for this quarter in AUD" }
              },
              required: ["clientName", "quarterStartDate", "quarterEndDate", "totalQuarterlyBudget"]
            }
          };

          const optimizeQuarterlyRosterDeclaration = {
            name: "optimize_quarterly_roster",
            description: "Analyze client baseline weekly shift schedule and calculate surplus budget and additional affordable hours per week without exceeding budget limit.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" },
                quarterStartDate: { type: Type.STRING, description: "Start date of quarter (YYYY-MM-DD)" },
                quarterEndDate: { type: Type.STRING, description: "End date of quarter (YYYY-MM-DD)" },
                remainingFunds: { type: Type.NUMBER, description: "Remaining surplus funds in AUD" }
              },
              required: ["clientName", "quarterStartDate", "quarterEndDate", "remainingFunds"]
            }
          };

          let systemInstruction = `You are Happy, the friendly, supportive, and knowledgeable AI portal assistant for HAPPY IN THE HOME ("Happy in the Home Portal Assistant").
When introducing yourself or when asked who you are, greet the user warmly: "Hi! My name is Happy, your Happy in the Home Portal Assistant!"
You specialize in 3-month quarterly budgets, NDIS & Home Care funding, and roster optimization.

CRITICAL FORMATTING & FINANCIAL RULES:
1. All dates in your natural-language responses to users MUST strictly use Australian standard DD/MM/YYYY formatting.
2. In all backend tool calls, you must strictly pass ISO 8601 YYYY-MM-DD format.
3. Currency must always be formatted in AUD ($X.XX).
4. Client budgets are completely individualized. NEVER assume a hardcoded or generic default quarterly budget. When analyzing funds, use the specific budget provided by the user or calculate the exact spent/scheduled costs from actual shifts. If the user asks for a burn rate calculation without specifying their allocated budget, compute the exact spent and scheduled totals and ask for their specific quarter budget.
5. If the user does not specify dates for the quarter, use the current active calendar quarter dates (e.g. 2026-07-01 to 2026-09-30).
6. If the user asks to analyze funds, check burn rate, or optimize a roster without specifying which client they want to analyze, do NOT call tools with empty or assumed client names. Instead, ask warmly: "Which client would you like to analyze? Please select a client or let me know their name."`;

          if (aiConfig.ai_custom_instructions) {
            systemInstruction += `\n\nADDITIONAL CARE COORDINATION GUIDELINES:\n${aiConfig.ai_custom_instructions}`;
          }

          const response = await ai.models.generateContent({
            model: activeModel,
            contents: userQuery,
            config: {
              systemInstruction,
              tools: [
                {
                  functionDeclarations: [
                    analyzeClientFundsDeclaration,
                    optimizeQuarterlyRosterDeclaration
                  ]
                }
              ]
            }
          });

          // Check if Gemini requested a function call
          const functionCalls = response.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            const modelContent = response.candidates?.[0]?.content;
            const functionResponseParts: any[] = [];
            const toolResults: any[] = [];

            for (const call of functionCalls) {
              let toolOutput: any = {};

              if (call.name === "analyze_client_funds") {
                toolOutput = analyzeClientFundsLogic(db, call.args as any);
              } else if (call.name === "optimize_quarterly_roster") {
                toolOutput = optimizeQuarterlyRosterLogic(db, call.args as any);
              }
              toolResults.push({ tool: call.name, output: toolOutput });

              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { result: toolOutput },
                  id: (call as any).id
                }
              });
            }

            // Return function output to Gemini for final natural-language recommendation
            // preserving model turn with thoughtSignature to prevent thought signature errors
            const followUp = await ai.models.generateContent({
              model: activeModel,
              contents: [
                { role: "user", parts: [{ text: userQuery }] },
                modelContent,
                {
                  role: "user",
                  parts: functionResponseParts
                }
              ],
              config: {
                systemInstruction: `You are Happy, the Happy in the Home Portal Assistant. Summarize the tool result into a clear, friendly, and professional recommendation for care coordinators.
Remember: All dates must strictly be formatted in the Australian standard DD/MM/YYYY. Display all financial amounts in AUD ($). Highlight burn rate, remaining weeks, and affordable hours per week.`
              }
            });

            return res.json({
              reply: followUp.text || JSON.stringify(toolResults[0]?.output, null, 2),
              toolResult: toolResults.length === 1 ? toolResults[0].output : toolResults
            });
          }

          if (response.text) {
            return res.json({ reply: response.text });
          }
        } catch (geminiError: any) {
          console.error("[AI Chat] Gemini API call failed:", geminiError?.message || geminiError);
          return res.status(500).json({
            error: `Gemini API Error: ${geminiError?.message || "Failed to generate AI response. Please verify your API key in Settings > AI Settings."}`
          });
        }

      // Intelligent Fallback: Check if user mentioned any client or general budget query
      const clients = db.prepare("SELECT id, first_name, last_name, funding_type FROM clients").all() as any[];
      const lowerQuery = userQuery.toLowerCase();
      const matchedClient = clients.find(c =>
        lowerQuery.includes(`${c.first_name} ${c.last_name}`.toLowerCase()) ||
        lowerQuery.includes(c.first_name.toLowerCase()) ||
        (c.last_name && lowerQuery.includes(c.last_name.toLowerCase()))
      );

      // Default quarter dates (ISO)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const qStartMonth = String(currentQuarter * 3 + 1).padStart(2, '0');
      const qEndMonth = String(currentQuarter * 3 + 3).padStart(2, '0');
      const quarterStartDate = `${currentYear}-${qStartMonth}-01`;
      const lastDayOfQ = new Date(currentYear, currentQuarter * 3 + 3, 0).getDate();
      const quarterEndDate = `${currentYear}-${qEndMonth}-${lastDayOfQ}`;

      if (matchedClient) {
        const clientName = `${matchedClient.first_name} ${matchedClient.last_name}`;
        const totalQuarterlyBudget = 13500; // Typical HCP quarterly budget baseline

        const analysis = analyzeClientFundsLogic(db, {
          clientName,
          quarterStartDate,
          quarterEndDate,
          totalQuarterlyBudget
        });

        if (!analysis.error) {
          const optimization = optimizeQuarterlyRosterLogic(db, {
            clientName,
            quarterStartDate,
            quarterEndDate,
            remainingFunds: analysis.remainingFunds
          });

          const reply = `📊 **Quarterly Budget Analysis for ${clientName}**
• **Funding Cycle:** ${formatToAustralianDate(quarterStartDate)} to ${formatToAustralianDate(quarterEndDate)} (${analysis.quarterTotalWeeks} weeks)
• **Quarterly Budget:** $${analysis.totalQuarterlyBudget.toFixed(2)} AUD
• **Total Funds Committed/Used:** $${analysis.totalUsedFunds.toFixed(2)} (${analysis.burnRatePercentage} burn rate)
• **Remaining Funds:** $${analysis.remainingFunds.toFixed(2)} AUD
• **Current Average Weekly Hours:** ${analysis.averageWeeklyHours} hrs/week ($${analysis.averageWeeklySpend}/week)
• **Shift Count:** ${analysis.shiftCount} shifts (${analysis.statusBreakdown.completedShifts} completed, ${analysis.statusBreakdown.scheduledShifts} scheduled)

💡 **Rostering Recommendation:**
${optimization.optimizationSummary}
• **Baseline Weekly Hours:** ${optimization.baselineWeeklyHours} hrs/week
• **Additional Affordable Hours:** +${optimization.additionalAffordableHoursPerWeek} hrs/week
• **Recommended Max Weekly Hours:** ${optimization.recommendedMaxWeeklyHours} hrs/week`;

          return res.json({ reply, analysis, optimization });
        }
      }

      // General fallback reply
      const firstClients = clients.slice(0, 4).map(c => `${c.first_name} ${c.last_name}`).join(", ");
      return res.json({
        reply: `👋 Hello! I am the Happy in the Home AI Assistant, equipped with Model Context Protocol (MCP) analytical tools.

You can ask me to:
• **Analyze Client Funds:** e.g., *"Analyze funds for ${firstClients ? firstClients.split(',')[0] : 'a client'}"*
• **Optimize Quarterly Rosters:** e.g., *"Optimize roster budget for Trilogy Care"*
• **Assess Burn Rates:** Review used vs. remaining funds across 3-month funding periods.

*All dates are displayed in the Australian standard DD/MM/YYYY.*`
      });

    } catch (err: any) {
      console.error("[AI Chat] Error in /api/chat:", err);
      res.status(500).json({ error: err.message || "Failed to process chat message" });
    }
  });

  console.log("[MCP] Model Context Protocol Server mounted on /sse, /messages, and /api/chat");
}
