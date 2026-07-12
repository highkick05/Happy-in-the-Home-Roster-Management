              }
            }
          }
        }

        const servicesJson = servicesData
          ? JSON.stringify(processedServicesData)
          : existing.services_json;
        const mainServiceId =
          (processedServicesData && processedServicesData.length > 0
            ? processedServicesData[0].serviceId
            : serviceId || existing.service_id);

        const finalFundingType =
          fundingType ||
          existing.funding_type ||
          (
            db
              .prepare("SELECT funding_type FROM clients WHERE id = ?")
              .get(
                clientId !== undefined ? clientId : existing.client_id,
              ) as any
          )?.funding_type ||
          "NDIS";

        const stmt = db.prepare(
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
        );

        // Recalculate travel immediately after UPDATE database operation
        await recalculateDayTravelForStaff(
          staffId !== undefined ? staffId : existing.staff_id,
          startTime !== undefined ? startTime : existing.start_time,
        );
        if (
          (staffId !== undefined && staffId !== existing.staff_id) ||
          (startTime !== undefined && startTime !== existing.start_time)
        ) {
          // Recalculate old date/staff if it changed
