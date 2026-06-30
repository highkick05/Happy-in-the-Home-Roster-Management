const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.pragma('foreign_keys = ON'); // enable foreign keys first
db.exec('CREATE TABLE services (id INTEGER PRIMARY KEY, name TEXT UNIQUE);');
db.exec('CREATE TABLE client_services (client_id INTEGER, service_id INTEGER, FOREIGN KEY (service_id) REFERENCES services(id));');
db.exec('INSERT INTO services (id, name) VALUES (1, \\'Test\\');');
db.exec('INSERT INTO client_services (client_id, service_id) VALUES (10, 1);');
db.pragma('foreign_keys = OFF');
db.exec('CREATE TABLE services_new (id INTEGER PRIMARY KEY, name TEXT);');
db.exec('INSERT INTO services_new SELECT * FROM services;');
db.exec('DROP TABLE services;');
db.exec('ALTER TABLE services_new RENAME TO services;');
db.pragma('foreign_keys = ON');
// Test if foreign keys still work
try {
  db.exec('INSERT INTO client_services (client_id, service_id) VALUES (11, 2);');
  console.log('FK Failed (allowed invalid insert)');
} catch (e) {
  console.log('FK check worked: ' + e.message);
}
