import { supabase } from "./supabase";
import { normalizeVisit } from "../utils/domainNormalize";

const TABLE = "visits";

const mapFromDb = (row) => ({
    ...row,
    hospitalId: row.hospital_id,
    roomNumber: row.room_number,
    estimatedDuration: row.estimated_duration,
    requestId: row.request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapToDb = (item) => {
    const db = { ...item };
    if (item.hospitalId !== undefined) db.hospital_id = item.hospitalId;
    if (item.roomNumber !== undefined) db.room_number = item.roomNumber;
    if (item.estimatedDuration !== undefined) db.estimated_duration = item.estimatedDuration;
    if (item.requestId !== undefined) db.request_id = item.requestId;
    
    // Remove camelCase keys
    delete db.hospitalId;
    delete db.roomNumber;
    delete db.estimatedDuration;
    delete db.requestId;
    delete db.createdAt;
    delete db.updatedAt;
    
    return db;
};

export const visitsService = {
    async list() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch visits error:", error);
            return [];
        }

        return data.map(mapFromDb).map(v => normalizeVisit(v)).filter(Boolean);
    },

    async create(visit) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const normalized = normalizeVisit(visit);
        const dbItem = mapToDb({ ...normalized, user_id: user.id });
        
        // Ensure id is unique or let DB handle it? SQL says id text primary key.
        // We generated one in normalizeVisit.
        
        const { data, error } = await supabase
            .from(TABLE)
            .insert(dbItem)
            .select()
            .single();

        if (error) throw error;
        return normalizeVisit(mapFromDb(data));
    },

    async update(id, updates) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const dbUpdates = mapToDb(updates);
        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from(TABLE)
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return normalizeVisit(mapFromDb(data));
    },

    async cancel(id) {
        return this.update(id, { status: 'cancelled' });
    },
    
    async complete(id) {
        return this.update(id, { status: 'completed' });
    }
};
