import db from './db.ts';

      let bookingsQuery = `
      SELECT rb.*, 
             c.first_name as client_first_name, c.last_name as client_last_name
      FROM respite_bookings rb
      LEFT JOIN clients c ON rb.client_id = c.id
    `;
    let bookings = [];
    bookings = db.prepare(bookingsQuery).all();
console.log(bookings);
