import re

with open("src/server.ts", "r") as f:
    content = f.read()

old_code = """        const stmt = db.prepare(
          "UPDATE shifts SET staff_id = ?, client_id = ?, service_id = ?, start_time = ?, end_time = ?, status = ?, notes = ?, funding_type = ?, services_json = ?, is_abt_approved = ?, provider_travel_km = ?, abt_km = ? WHERE id = ?",
        );
        stmt.run(
          staffId !== undefined ? staffId : existing.staff_id,
          clientId !== undefined ? clientId : existing.client_id,
          mainServiceId,
          startTime !== undefined ? startTime : existing.start_time,
          endTime !== undefined ? endTime : existing.end_time,
          status !== undefined ? status : existing.status,
          notes !== undefined ? notes : existing.notes,
          finalFundingType,
          servicesJson,
          isAbtApproved ? 1 : 0,
          providerTravelKm !== undefined
            ? providerTravelKm
            : existing.provider_travel_km,
          abtKm !== undefined ? abtKm : existing.abt_km,
          id,
        );"""

new_code = """        const isHistoricalMode = is_historical || (is_historical === undefined && existing.status === 'COMPLETED');
        const finalStatus = isHistoricalMode ? 'COMPLETED' : (status !== undefined ? status : existing.status);
        
        let updateQuery = "UPDATE shifts SET staff_id = ?, client_id = ?, service_id = ?, start_time = ?, end_time = ?, status = ?, notes = ?, funding_type = ?, services_json = ?, is_abt_approved = ?, provider_travel_km = ?, abt_km = ?";
        const params = [
          staffId !== undefined ? staffId : existing.staff_id,
          clientId !== undefined ? clientId : existing.client_id,
          mainServiceId,
          startTime !== undefined ? startTime : existing.start_time,
          endTime !== undefined ? endTime : existing.end_time,
          finalStatus,
          notes !== undefined ? notes : existing.notes,
          finalFundingType,
          servicesJson,
          isAbtApproved ? 1 : 0,
          providerTravelKm !== undefined ? providerTravelKm : existing.provider_travel_km,
          abtKm !== undefined ? abtKm : existing.abt_km,
        ];
        
        if (isHistoricalMode) {
           updateQuery += ", actual_start_time = ?, actual_finish_time = ?, progress_note = ?, odometer_start_reading = ?, odometer_end_reading = ?";
           params.push(
               startTime !== undefined ? startTime : existing.start_time,
               endTime !== undefined ? endTime : existing.end_time,
               progress_note !== undefined ? progress_note : existing.progress_note,
               start_odometer !== undefined ? start_odometer : existing.odometer_start_reading,
               end_odometer !== undefined ? end_odometer : existing.odometer_end_reading
           );
        }
        
        updateQuery += " WHERE id = ?";
        params.push(id);
        
        const stmt = db.prepare(updateQuery);
        stmt.run(...params);"""

content = content.replace(old_code, new_code)
with open("src/server.ts", "w") as f:
    f.write(content)
