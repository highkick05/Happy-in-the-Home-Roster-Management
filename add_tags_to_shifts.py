with open('src/server.ts', 'r') as f:
    text = f.read()

# Add to initDB
init_target = 'db.exec("ALTER TABLE shifts ADD COLUMN custom_staff_name TEXT");'
if init_target in text and 'ADD COLUMN tags TEXT' not in text:
    text = text.replace(init_target, init_target + '\n    try { db.exec("ALTER TABLE shifts ADD COLUMN tags TEXT"); } catch (e) {}')

# Update query in /api/progress-notes/:clientId
query_target = "NULL as tags, s.staff_id as author_id"
query_replacement = "s.tags as tags, s.staff_id as author_id"
text = text.replace(query_target, query_replacement)

# Update the POST /api/shifts/:id/complete to take tags
complete_target = """        const {
          actual_start_time,
          actual_finish_time,
          notes,
          abtCoordinates,
          odometer_end_reading,
          odometer_end_photo,
        } = req.body;"""

complete_replacement = """        const {
          actual_start_time,
          actual_finish_time,
          notes,
          abtCoordinates,
          odometer_end_reading,
          odometer_end_photo,
          is_incident,
        } = req.body;"""

text = text.replace(complete_target, complete_replacement)

# Update the UPDATE statement
update_str_target = """        UPDATE shifts SET 
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
      `;"""

update_str_replacement = """        UPDATE shifts SET 
          actual_finish_time = ?, 
          notes = ?, 
          tags = ?,
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
      `;"""

text = text.replace(update_str_target, update_str_replacement)

# Update the params array
params_target = """        const updateParams = [
          actual_finish_time || new Date().toISOString(),
          notes || shift.notes,
          finalProviderKm,
          finalProviderCost,"""

params_replacement = """        const updateParams = [
          actual_finish_time || new Date().toISOString(),
          notes || shift.notes,
          is_incident ? 'Incident' : (shift.tags || null),
          finalProviderKm,
          finalProviderCost,"""

text = text.replace(params_target, params_replacement)

with open('src/server.ts', 'w') as f:
    f.write(text)
