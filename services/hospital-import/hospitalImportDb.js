import { supabase } from '../../lib/supabase';

export const insertHospitalFromGoogle = async (hospital) => {
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
        console.error('HospitalImportDb.insertHospitalFromGoogle error:', error);
        throw error;
    }
};

export const updateHospitalFromGoogle = async (hospitalId, hospital) => {
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
        console.error('HospitalImportDb.updateHospitalFromGoogle error:', error);
        throw error;
    }
};
