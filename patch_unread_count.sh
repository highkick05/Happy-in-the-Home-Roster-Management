#!/bin/bash
sed -i 's/let totalUnread = 0;/let totalUnread = 0; const accountCounts = [];/' src/server.ts
sed -i 's/totalUnread += count;/totalUnread += count; accountCounts.push({ username: account.username, count });/' src/server.ts
sed -i 's/res.json({ total: totalUnread });/res.json({ total: totalUnread, accounts: accountCounts });/' src/server.ts
