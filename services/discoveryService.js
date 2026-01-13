import { supabase } from './supabase';

/**
 * Discovery Service
 * Handles Trending topics and Health News from Supabase
 */
export const discoveryService = {
	/**
	 * Get trending search topics
	 */
	getTrending: async () => {
		try {
			const { data, error } = await supabase
				.from('trending_topics')
				.select('*')
				.order('rank', { ascending: true });

			if (error) throw error;
			return data || [];
		} catch (error) {
			console.error('Error fetching trending topics:', error);
			// Fallback mock data
			return [
				{ id: "1", query: "Cardiologists near me", category: "Trending in Lagos", rank: 1 },
				{ id: "2", query: "Yellow Fever Vaccine", category: "Health Alerts", rank: 2 },
				{ id: "3", query: "24/7 Pharmacies", category: "Most Searched", rank: 3 },
				{ id: "4", query: "Pediatricians", category: "Popular", rank: 4 },
			];
		}
	},

	/**
	 * Get latest health news
	 */
	getNews: async () => {
		try {
			const { data, error } = await supabase
				.from('health_news')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;
			return data || [];
		} catch (error) {
			console.error('Error fetching health news:', error);
			// Fallback mock data
			return [
				{ 
					id: "n1", 
					title: "New ICU Wing at Reddington", 
					source: "Hospital Update", 
					time: "2h ago",
					icon: "business-outline"
				},
				{ 
					id: "n2", 
					title: "Free Dental Checkups this Saturday", 
					source: "Public Health", 
					time: "5h ago",
					icon: "medical-outline"
				},
				{ 
					id: "n3", 
					title: "Flu Season Peak: Stay Protected", 
					source: "Health Alert", 
					time: "1d ago",
					icon: "alert-circle-outline"
				},
			];
		}
	},

	/**
	 * Track search selection analytics
	 */
	trackSearchSelection: async ({ query, source, key, extra }) => {
		try {
			const payload = {
				query: typeof query === "string" ? query : null,
				source: typeof source === "string" ? source : null,
				selected_key: typeof key === "string" ? key : null,
				extra: extra && typeof extra === "object" ? extra : null,
			};
			const { error } = await supabase.from('search_events').insert(payload);
			if (error) throw error;
			return true;
		} catch (error) {
			console.log('Search selection track fallback:', { query, source, key });
			return false;
		}
	},

	/**
	 * Track conversion from search to request start
	 */
	trackConversion: async ({ action, hospitalId, mode, query }) => {
		try {
			const payload = {
				query: typeof query === "string" ? query : null,
				source: "conversion",
				selected_key: typeof action === "string" ? action : null,
				extra: {
					hospitalId: hospitalId ? String(hospitalId) : null,
					mode: typeof mode === "string" ? mode : null,
				},
			};
			const { error } = await supabase.from('search_events').insert(payload);
			if (error) throw error;
			return true;
		} catch (error) {
			console.log('Conversion track fallback:', { action, hospitalId, mode, query });
			return false;
		}
	}
};
