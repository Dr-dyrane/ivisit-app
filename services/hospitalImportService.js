import { supabase } from './supabase';
import mapboxService from './mapboxService';

class HospitalImportService {
  toFiniteOrNull(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  calculateDistanceKm(left, right) {
    const startLat = this.toFiniteOrNull(left?.latitude);
    const startLng = this.toFiniteOrNull(left?.longitude);
    const endLat = this.toFiniteOrNull(right?.latitude);
    const endLng = this.toFiniteOrNull(right?.longitude);
    if (
      !Number.isFinite(startLat) ||
      !Number.isFinite(startLng) ||
      !Number.isFinite(endLat) ||
      !Number.isFinite(endLng)
    ) {
      return null;
    }

    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const latDelta = toRadians(endLat - startLat);
    const lngDelta = toRadians(endLng - startLng);
    const lat1 = toRadians(startLat);
    const lat2 = toRadians(endLat);
    const haversine =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

    return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
  }

  isSemanticHospitalMatch(left, right) {
    const leftName = this.normalizeText(left?.name);
    const rightName = this.normalizeText(right?.name);
    if (!leftName || !rightName || leftName !== rightName) {
      return false;
    }

    const leftAddress = this.normalizeText(left?.address);
    const rightAddress = this.normalizeText(right?.address);
    if (leftAddress && rightAddress && leftAddress === rightAddress) {
      return true;
    }

    const distanceKm = this.calculateDistanceKm(left, right);
    return Number.isFinite(distanceKm) && distanceKm <= 0.25;
  }

  pruneUndefined(payload = {}) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );
  }

  buildProviderHospitalFields(hospital = {}) {
    const providerTypeTags = Array.isArray(hospital.types)
      ? hospital.types
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
          .map((entry) => `provider_type:${entry}`)
      : [];

    return this.pruneUndefined({
      name: hospital.name || 'Unnamed Hospital',
      address: hospital.address || 'Address unavailable',
      phone: hospital.phone || null,
      rating: this.toFiniteOrNull(hospital.rating),
      latitude: this.toFiniteOrNull(hospital.latitude),
      longitude: this.toFiniteOrNull(hospital.longitude),
      features: providerTypeTags,
      place_id: hospital.place_id || null,
      verification_status: 'pending',
      verified: false,
      status: 'available',
    });
  }

  async findExistingHospitalMatch(hospital) {
    const providerPlaceId = String(hospital?.place_id || '').trim();
    if (providerPlaceId) {
      const { data: exactMatch, error: exactError } = await supabase
        .from('hospitals')
        .select('id, place_id, name, address, latitude, longitude, verified, verification_status')
        .eq('place_id', providerPlaceId)
        .maybeSingle();

      if (exactError) {
        throw exactError;
      }
      if (exactMatch) {
        return exactMatch;
      }
    }

    const normalizedName = this.normalizeText(hospital?.name);
    if (!normalizedName) return null;

    let query = supabase
      .from('hospitals')
      .select('id, place_id, name, address, latitude, longitude, verified, verification_status')
      .ilike('name', hospital.name.trim())
      .limit(12);

    if (this.normalizeText(hospital?.address)) {
      query = query.ilike('address', hospital.address.trim());
    }

    const { data: candidates, error } = await query;
    if (error) {
      throw error;
    }

    const semanticMatches = (candidates || []).filter((candidate) =>
      this.isSemanticHospitalMatch(candidate, hospital)
    );

    if (semanticMatches.length === 0) {
      return null;
    }

    return semanticMatches.sort((left, right) => {
      const leftScore =
        (left?.verified ? 20 : 0) +
        (left?.place_id ? 10 : 0);
      const rightScore =
        (right?.verified ? 20 : 0) +
        (right?.place_id ? 10 : 0);
      return rightScore - leftScore;
    })[0];
  }

  buildImportLogUpdatePayload(payload = {}) {
    const allowed = {
      status: payload.status,
      total_found: payload.total_found,
      imported_count: payload.imported_count,
      skipped_count: payload.skipped_count,
      error_count: payload.error_count,
      errors: payload.errors,
      completed_at: payload.completed_at,
      search_query: payload.search_query,
      location_lat: payload.location_lat,
      location_lng: payload.location_lng,
      radius_km: payload.radius_km,
      created_by: payload.created_by,
      import_type: payload.import_type
    };

    return Object.fromEntries(
      Object.entries(allowed).filter(([, value]) => value !== undefined)
    );
  }

  isMissingRelationError(error, relationName) {
    if (!error) return false;
    if (error.code === '42P01') return true;
    const message = String(error.message || '').toLowerCase();
    return message.includes(relationName.toLowerCase()) && message.includes('does not exist');
  }

  async createImportLog(payload) {
    const { data, error } = await supabase
      .from('hospital_import_logs')
      .insert({
        import_type: payload?.import_type ?? 'provider_import',
        location_lat: payload?.location_lat ?? null,
        location_lng: payload?.location_lng ?? null,
        radius_km: payload?.radius_km ?? null,
        search_query: payload?.search_query ?? null,
        status: payload?.status ?? 'running',
        created_by: payload?.created_by ?? null,
        total_found: payload?.total_found ?? null,
        imported_count: payload?.imported_count ?? null,
        skipped_count: payload?.skipped_count ?? null,
        error_count: payload?.error_count ?? null,
        errors: payload?.errors ?? null,
        completed_at: payload?.completed_at ?? null
      })
      .select()
      .single();

    if (error) {
      if (this.isMissingRelationError(error, 'hospital_import_logs')) {
        return null;
      }
      throw error;
    }

    return data;
  }

  async updateImportLog(importLogId, payload) {
    if (!importLogId) return;
    const updatePayload = this.buildImportLogUpdatePayload(payload);
    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase
      .from('hospital_import_logs')
      .update(updatePayload)
      .eq('id', importLogId);

    if (error && !this.isMissingRelationError(error, 'hospital_import_logs')) {
      throw error;
    }
  }

  // Import hospitals from Google Places to Supabase
  async importHospitalsFromGoogle(lat, lng, radius = 10000, createdBy = null) {
    try {
      // Create import log entry
      const importLog = await this.createImportLog({
          import_type: 'google_places',
          location_lat: lat,
          location_lng: lng,
          radius_km: radius / 1000,
          status: 'running',
          created_by: createdBy
        });

      let totalFound = 0;
      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors = [];

      try {
        console.log('Using Mapbox for hospital discovery...');
        const hospitals = await mapboxService.searchNearbyHospitals(lat, lng, radius / 1000);

        totalFound = hospitals.length;

        // Process each hospital
        for (const hospital of hospitals) {
          try {
            const existing = await this.findExistingHospitalMatch(hospital);

            if (existing) {
              // Update existing hospital
              await this.updateHospitalFromProvider(existing.id, hospital, existing);
              skippedCount++;
            } else {
              // Insert new hospital
              await this.insertHospitalFromProvider(hospital);
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
        await this.updateImportLog(importLog?.id, {
          total_found: totalFound,
          imported_count: importedCount,
          skipped_count: skippedCount,
          error_count: errorCount,
          errors: errors,
          status: 'completed',
          completed_at: new Date().toISOString()
        });

        return {
          success: true,
          totalFound,
          importedCount,
          skippedCount,
          errorCount,
          errors,
          importLogId: importLog?.id || null
        };

      } catch (error) {
        // Update import log with failure
        await this.updateImportLog(importLog?.id, {
          status: 'failed',
          errors: [{ error: error.message }],
          completed_at: new Date().toISOString()
        });

        throw error;
      }

    } catch (error) {
      console.error('HospitalImportService.importHospitalsFromGoogle error:', error);
      throw error;
    }
  }

  // Insert new hospital from provider data (Google/Mapbox)
  async insertHospitalFromProvider(hospital) {
    try {
      const hospitalData = {
        ...this.buildProviderHospitalFields(hospital),
        available_beds: 0,
        total_beds: 0,
        ambulances_count: 0,
        wait_time: 'Unknown',
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

  // Update existing hospital with fresh provider data
  async updateHospitalFromProvider(hospitalId, hospital, existingHospital = null) {
    try {
      const providerFields = this.buildProviderHospitalFields(hospital);
      const existingPlaceId = String(existingHospital?.place_id || '').trim();
      const nextPlaceId = existingPlaceId || providerFields.place_id || undefined;
      const updateData = this.pruneUndefined({
        ...providerFields,
        place_id: nextPlaceId,
        features: undefined,
        verified: undefined,
        verification_status: undefined,
        status: undefined,
        updated_at: new Date().toISOString(),
      });

      if (existingPlaceId && providerFields.place_id && existingPlaceId !== providerFields.place_id) {
        delete updateData.place_id;
      }

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
        .eq('verification_status', 'pending')
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
          verification_status: 'verified',
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
          verification_status: 'rejected',
          verified: false,
          status: 'closed'
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
        .eq('verification_status', 'verified')
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

      if (error) {
        if (this.isMissingRelationError(error, 'hospital_import_logs')) {
          return [];
        }
        throw error;
      }
      return data;

    } catch (error) {
      console.error('HospitalImportService.getImportLogs error:', error);
      throw error;
    }
  }
}

export default new HospitalImportService();
