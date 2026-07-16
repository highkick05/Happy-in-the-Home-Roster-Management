import re

with open("src/server.ts", "r") as f:
    code = f.read()

endpoint = """app.get('/api/test/dump-shifts', async (req, res) => {
    try {
        const shifts = db.prepare("SELECT count(*) as c FROM shifts").get().c;
        const types = db.prepare("SELECT DISTINCT funding_type FROM shifts").all();
        res.json({ message: "Shifts count", count: shifts, types: types, dbName: db.name, path: process.env.DATABASE_PATH });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
"""

code = code.replace('app.get("/api/health", (req, res) => {', endpoint + '\napp.get("/api/health", (req, res) => {')

with open("src/server.ts", "w") as f:
    f.write(code)

print("Added endpoint!")
