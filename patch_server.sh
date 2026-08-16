#!/bin/bash

# Insert import at the top
sed -i '4i import { getUnreadCount } from "./getUnreadEmails";' src/server.ts

# Insert the API endpoint before line 4278
sed -i '4278i \
  app.get("/api/emails/unread-count", authenticateToken, async (req, res) => {\
    try {\
      const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");\
      const result = stmt.get("imapAccounts");\
      if (!result) return res.json({ total: 0 });\
      const accounts = JSON.parse(result.value);\
      let totalUnread = 0;\
      for (const account of accounts) {\
        const count = await getUnreadCount(account);\
        totalUnread += count;\
      }\
      res.json({ total: totalUnread });\
    } catch (e: any) {\
      logger.error(`API Error fetching emails: ${e}`);\
      res.status(500).json({ error: "Internal Server Error" });\
    }\
  });\
' src/server.ts
