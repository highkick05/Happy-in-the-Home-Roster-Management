import re

with open("src/server.ts", "r") as f:
    code = f.read()

# First part of UNION (shifts)
old_shift = """        SELECT 
          'SHIFT' as source, s.id, s.start_time, s.end_time, s.actual_finish_time, s.notes, s.status, s.service_id,
          c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          srv.name as service_name, srv.type as service_type,
          NULL as tags
        FROM shifts s"""
new_shift = """        SELECT 
          'SHIFT' as source, s.id, s.start_time, s.end_time, s.actual_finish_time, s.notes, s.status, s.service_id,
          c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          srv.name as service_name, srv.type as service_type,
          NULL as tags, s.staff_id as author_id
        FROM shifts s"""
code = code.replace(old_shift, new_shift)

# Second part of UNION (manual)
old_manual = """         SELECT 
          'MANUAL' as source, pn.id, pn.created_at as start_time, NULL as end_time, NULL as actual_finish_time, pn.content as notes, 'COMPLETED' as status, NULL as service_id,
          c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          NULL as service_name, NULL as service_type,
          pn.tags as tags
        FROM progress_notes pn"""
new_manual = """         SELECT 
          'MANUAL' as source, pn.id, pn.created_at as start_time, NULL as end_time, NULL as actual_finish_time, pn.content as notes, 'COMPLETED' as status, NULL as service_id,
          c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          NULL as service_name, NULL as service_type,
          pn.tags as tags, pn.author_id
        FROM progress_notes pn"""
code = code.replace(old_manual, new_manual)

with open("src/server.ts", "w") as f:
    f.write(code)

