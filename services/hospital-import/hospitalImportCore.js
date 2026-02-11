import { supabase } from '../../lib/supabase';
import googlePlacesService from '../googlePlacesService';
import { insertHospitalFromGoogle, updateHospitalFromGoogle } from './hospitalImportDb';

export const importHospitalsFromGoogle = async (lat, lng, radius = 10000, createdBy = null) => {
    try {
        // Create import log entry
        const { data: importLog, error: logError } = await supabase
            .from('hospital_import_logs')
            .insert({
                import_type: 'google_places',
                location_lat: lat,
                location_lng: lng,
                radius_km: radius / 1000,
                status: 'running',
                created_by: createdBy
            })
            .select()
            .single();

        if (logError) throw logError;

        let totalFound = 0;
        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errors = [];

        try {
            // Get hospitals from Google Places
            const hospitals = await googlePlacesService.batchImportHospitals(
                lat,
                lng,
                radius,
                (progress) => {
                    console.log(`Import progress: ${progress.progress.toFixed(1)}% - ${progress.hospital}`);
                }
            );

            totalFound = hospitals.length;

            // Process each hospital
            for (const hospital of hospitals) {
                try {
                    // Check if hospital already exists
                    const { data: existing } = await supabase
                        .from('hospitals')
                        .select('id, place_id')
                        .eq('place_id', hospital.place_id)
                        .single();

                    if (existing) {
                        // Update existing hospital
                        await updateHospitalFromGoogle(existing.id, hospital);
                        skippedCount++;
                    } else {
                        // Insert new hospital
                        await insertHospitalFromGoogle(hospital);
                        importedCount++;
                    }
                } catch (error) {
                    errorCount++;
                    errors.push({
                        hospital: hospital.name,
                        error: error.message
                    });
                    console.error(`Failed to import ${hospital.name}:`, error);
                }
            }

            // Update import log with results
            await supabase
                .from('hospital_import_logs')
                .update({
                    total_found: totalFound,
                    imported_count: importedCount,
                    skipped_count: skippedCount,
                    error_count: errorCount,
                    errors: errors,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', importLog.id);

            return {
                success: true,
                totalFound,
                importedCount,
                skippedCount,
                errorCount,
                errors,
                importLogId: importLog.id
            };

        } catch (error) {
            // Update import log with failure
            await supabase
                .from('hospital_import_logs')
                .update({
                    status: 'failed',
                    errors: [{ error: error.message }],
                    completed_at: new Date().toISOString()
                })
                .eq('id', importLog.id);

            throw error;
        }

    } catch (error) {
        console.error('HospitalImportCore.importHospitalsFromGoogle error:', error);
        throw error;
    }
};
