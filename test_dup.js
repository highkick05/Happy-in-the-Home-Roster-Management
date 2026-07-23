import Database from 'better-sqlite3';
try {
const db = new Database(':memory:');
const q = `
WITH test AS (
  SELECT 1 as funding_type, 2 as funding_type
)
SELECT * FROM test
`;
db.prepare(q).all();
console.log("Success");
} catch(e) {
console.log("Error:", e.message);
}
