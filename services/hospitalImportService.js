// Hospital Import Service - Integrates Google Places with Supabase
import { supabase } from '../lib/supabase';
import googlePlacesService from './googlePlacesService';

class HospitalImportService {
  // Import hospitals from Google Places to Supabase
  async importHospitalsFromGoogle(lat, lng, radius = 10000, createdBy = null) {
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
              await this.updateHospitalFromGoogle(existing.id, hospital);
              skippedCount++;
            } else {
              // Insert new hospital
              await this.insertHospitalFromGoogle(hospital);
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
      console.error('HospitalImportService.importHospitalsFromGoogle error:', error);
      throw error;
    }
  }

  // Insert new hospital from Google Places data
  async insertHospitalFromGoogle(hospital) {
    try {
      const hospitalData = {
        place_id: hospital.place_id,
        name: hospital.name,
        address: hospital.address,
        google_address: hospital.address,
        google_phone: hospital.phone,
        google_website: hospital.website,
        google_rating: hospital.rating,
        google_photos: hospital.photos,
        google_opening_hours: hospital.opening_hours,
        google_types: hospital.types,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        imported_from_google: true,
        import_status: 'pending',
        verified: false,
        status: 'available',
        available_beds: 0, // Will be set by hospital admin
        ambulances_count: 0, // Will be set by hospital admin
        wait_time: 'Unknown', // Will be set by hospital admin
        last_google_sync: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('hospitals')
        .insert(hospitalData)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.insertHospitalFromGoogle error:', error);
      throw error;
    }
  }

  // Update existing hospital with fresh Google data
  async updateHospitalFromGoogle(hospitalId, hospital) {
    try {
      const updateData = {
        google_address: hospital.address,
        google_phone: hospital.phone,
        google_website: hospital.website,
        google_rating: hospital.rating,
        google_photos: hospital.photos,
        google_opening_hours: hospital.opening_hours,
        google_types: hospital.types,
        last_google_sync: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('hospitals')
        .update(updateData)
        .eq('id', hospitalId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.updateHospitalFromGoogle error:', error);
      throw error;
    }
  }

  // Get hospitals pending verification
  async getPendingHospitals() {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('import_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.getPendingHospitals error:', error);
      throw error;
    }
  }

  // Approve hospital import
  async approveHospital(hospitalId) {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .update({
          import_status: 'verified',
          verified: true,
          status: 'available'
        })
        .eq('id', hospitalId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.approveHospital error:', error);
      throw error;
    }
  }

  // Reject hospital import
  async rejectHospital(hospitalId, reason = '') {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .update({
          import_status: 'rejected',
          verified: false,
          status: 'inactive'
        })
        .eq('id', hospitalId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.rejectHospital error:', error);
      throw error;
    }
  }

  // Assign hospital to org admin
  async assignHospitalToAdmin(hospitalId, orgAdminId) {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .update({
          org_admin_id: orgAdminId
        })
        .eq('id', hospitalId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.assignHospitalToAdmin error:', error);
      throw error;
    }
  }

  // Get hospitals assigned to specific admin
  async getHospitalsByAdmin(orgAdminId) {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('org_admin_id', orgAdminId)
        .eq('import_status', 'verified')
        .order('name');

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.getHospitalsByAdmin error:', error);
      throw error;
    }
  }

  // Get import logs
  async getImportLogs(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('hospital_import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('HospitalImportService.getImportLogs error:', error);
      throw error;
    }
  }
}

export default new HospitalImportService();
