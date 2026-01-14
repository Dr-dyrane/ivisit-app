import { supabase } from "./supabase";
import { insuranceService } from "./insuranceService";
import { VISIT_STATUS, VISIT_TYPES } from "../constants/visits";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../constants/notifications";
import { MOCK_FAQS } from "../constants/faqs";

const MOCK_VISITS = [
    {
        hospital: "City General Hospital",
        doctor: "Dr. Sarah Wilson",
        doctor_image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400",
        specialty: "Cardiology",
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
        time: "10:00 AM",
        type: VISIT_TYPES.REGULAR,
        status: VISIT_STATUS.UPCOMING,
        image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400",
        address: "123 Medical Plaza, Suite 405",
        phone: "+1-555-0123",
        notes: "Follow-up on blood pressure medication.",
        estimated_duration: "45 mins",
        preparation: ["Fast for 12 hours", "Bring current medication list"],
        cost: "$150",
        insurance_covered: true,
        room_number: "405-B"
    },
    {
        hospital: "St. Mary's Medical Center",
        doctor: "Dr. James Chen",
        doctor_image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400",
        specialty: "Orthopedics",
        date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], // 5 days ago
        time: "2:30 PM",
        type: VISIT_TYPES.FOLLOW_UP,
        status: VISIT_STATUS.COMPLETED,
        image: "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=400",
        address: "456 Healthcare Ave, Wing C",
        phone: "+1-555-0456",
        notes: "Knee inspection after surgery.",
        estimated_duration: "30 mins",
        cost: "$200",
        insurance_covered: true,
        summary: "Patient recovering well. Range of motion improved by 15%.",
        prescriptions: ["Ibuprofen 800mg", "Physical Therapy 2x/week"]
    },
    {
        hospital: "University Medical Center",
        doctor: "Dr. Emily Brown",
        doctor_image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400",
        specialty: "Neurology",
        date: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0], // 2 weeks ago
        time: "9:15 AM",
        type: VISIT_TYPES.CONSULTATION,
        status: VISIT_STATUS.COMPLETED,
        image: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400",
        address: "100 University Ave, Building B",
        phone: "+1-555-0100",
        notes: "Headache consultation.",
        estimated_duration: "60 mins",
        cost: "$250",
        insurance_covered: true
    },
    {
        hospital: "Children's Memorial Hospital",
        doctor: "Dr. Michael Ross",
        doctor_image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400",
        specialty: "Pediatrics",
        date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], // 10 days from now
        time: "11:00 AM",
        type: VISIT_TYPES.REGULAR,
        status: VISIT_STATUS.UPCOMING,
        image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400",
        address: "500 Rainbow Drive",
        phone: "+1-555-0500",
        notes: "Annual vaccination.",
        estimated_duration: "30 mins",
        cost: "$120",
        insurance_covered: true
    }
];

const MOCK_NOTIFICATIONS = [
    {
        type: NOTIFICATION_TYPES.EMERGENCY,
        title: "Ambulance Dispatched",
        message: "Your ambulance is en route. ETA: 8 minutes.",
        read: false,
        priority: NOTIFICATION_PRIORITY.URGENT,
        action_type: "track",
        action_data: { visitId: "track_ambulance" }
    },
    {
        type: NOTIFICATION_TYPES.APPOINTMENT,
        title: "Appointment Reminder",
        message: "You have an appointment with Dr. Wilson tomorrow at 10:00 AM.",
        read: false,
        priority: NOTIFICATION_PRIORITY.HIGH,
        action_type: "view_appointment",
        action_data: { visitId: "upcoming_visit" }
    },
    {
        type: NOTIFICATION_TYPES.SYSTEM,
        title: "Profile Updated",
        message: "Your medical history has been successfully updated.",
        read: true,
        priority: NOTIFICATION_PRIORITY.NORMAL
    },
    {
        type: NOTIFICATION_TYPES.PROMOTION,
        title: "Health Checkup Offer",
        message: "Get 20% off on full body checkup this month.",
        read: true,
        priority: NOTIFICATION_PRIORITY.LOW
    }
];

export const seederService = {
    async seedVisits() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const visits = MOCK_VISITS.map(v => ({
            ...v,
            user_id: user.id,
            id: `visit_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        }));

        const { error } = await supabase.from('visits').insert(visits);
        if (error) throw error;
        return visits.length;
    },

    async seedNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const notifications = MOCK_NOTIFICATIONS.map(n => ({
            ...n,
            user_id: user.id,
            id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
        return notifications.length;
    },

    async seedFAQs() {
        // FAQs are public/system data, so usually don't need user_id, 
        // but depending on RLS, we might need to be admin. 
        // Assuming public write or user can insert for demo.
        
        // First check if FAQs exist to avoid duplicates if we run seed multiple times
        // Ideally we should upsert based on question or id.
        // For simplicity in this seeder, we'll insert.
        
        const faqs = MOCK_FAQS.map((f, index) => ({
            ...f,
            // id: generated by db
        }));

        try {
            const { error } = await supabase.from('support_faqs').insert(faqs);
            if (error) {
                // If RLS prevents insertion, we just log it and continue
                // The app will fall back to MOCK_FAQS in helpSupportService
                if (error.code === '42501') {
                    console.warn('Skipping FAQ seeding due to RLS policy (expected for non-admin users)');
                    return 0;
                }
                throw error;
            }
            return faqs.length;
        } catch (error) {
            console.warn('Failed to seed FAQs:', error.message);
            // Return 0 instead of throwing to allow other seeds to complete
            return 0;
        }
    },

    async seedInsurance() {
        try {
            await insuranceService.enrollBasicScheme();
            return 1;
        } catch (error) {
            console.warn('Failed to seed Insurance:', error.message);
            return 0;
        }
    },

    async seedAll() {
        await this.seedVisits();
        await this.seedNotifications();
        await this.seedFAQs();
        await this.seedInsurance();
        // Trigger schema reload to ensure everything is fresh
        await supabase.rpc('reload_schema'); 
        return true;
    }
};
