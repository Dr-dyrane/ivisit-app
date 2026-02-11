import { supabase } from '../../lib/supabase';

export const getPendingHospitals = async () => {
    try {
        const { data, error } = await supabase
            .from('hospitals')
            .select('*')
            .eq('import_status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('HospitalImportAdmin.getPendingHospitals error:', error);
        throw error;
    }
};

export const approveHospital = async (hospitalId) => {
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
        console.error('HospitalImportAdmin.approveHospital error:', error);
        throw error;
    }
};

export const rejectHospital = async (hospitalId, reason = '') => {
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
        console.error('HospitalImportAdmin.rejectHospital error:', error);
        throw error;
    }
};

export const assignHospitalToAdmin = async (hospitalId, orgAdminId) => {
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
        console.error('HospitalImportAdmin.assignHospitalToAdmin error:', error);
        throw error;
    }
};

export const getHospitalsByAdmin = async (orgAdminId) => {
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
        console.error('HospitalImportAdmin.getHospitalsByAdmin error:', error);
        throw error;
    }
};

export const getImportLogs = async (limit = 50) => {
    try {
        const { data, error } = await supabase
            .from('hospital_import_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('HospitalImportAdmin.getImportLogs error:', error);
        throw error;
    }
};
