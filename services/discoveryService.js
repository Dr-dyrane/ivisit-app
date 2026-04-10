import { supabase } from './supabase';

/**
 * Discovery Service
 * Handles Trending topics and Health News from Supabase
 */
const isMissingRelationError = (error, relationName) => {
	if (!error) return false;
	if (error.code === '42P01') return true;
	const message = String(error.message || '').toLowerCase();
	return message.includes(relationName.toLowerCase()) && message.includes('does not exist');
};

export const discoveryService = {
	/**
	 * Get trending searches from console (via Supabase RPC)
	 * @param {Object} options
	 * @param {number} options.limit - Max results (default: 8)
	 * @param {number} options.days - Days back (default: 7)
	 */
	getTrendingSearches: async ({ limit = 8, days = 7 } = {}) => {
		try {
			// Using RPC function as defined in the guide's architecture
			const { data, error } = await supabase.rpc('get_trending_searches', {
				days_back: days,
				limit_count: limit
			});

			if (error) throw error;
			return data || [];
		} catch (error) {
			console.error('Error fetching trending searches:', error);
			return [];
		}
	},

	/**
	 * Track when a user selects/searches for something
	 * @param {Object} data
	 * @param {string} data.query - Search query performed
	 * @param {string} data.source - Where search came from ('trending', 'recent', 'manual')
	 * @param {string} data.resultType - Type of result selected ('doctor', 'hospital', etc.)
	 * @param {string} data.resultId - ID of selected result
	 */
	trackSearchSelection: async ({ query, source = 'search_screen', resultType, resultId }) => {
		try {
			const payload = {
				query: typeof query === "string" ? query.toLowerCase() : null,
				source: source,
				result_type: resultType,
				result_id: resultId,
				created_at: new Date().toISOString(),
			};

			const { error } = await supabase.from('search_selections').insert(payload);

			if (error && isMissingRelationError(error, 'search_selections')) {
				// Live schema no longer includes search_selections; keep analytics via search_events.
				const { error: fallbackError } = await supabase.from('search_events').insert({
					query: payload.query,
					source: payload.source,
					selected_key: payload.result_id,
					metadata: {
						result_type: payload.result_type,
						origin: 'search_selection_fallback',
					},
				});

				if (fallbackError) throw fallbackError;
				return true;
			}

			if (error) throw error;
			return true;
		} catch (error) {
			console.warn('Failed to track search selection:', error);
			return false;
		}
	},

	/**
	 * Get health news from Supabase
	 * @param {Object} options
	 * @param {number} options.limit - Max results (default: 10)
	 */
	getHealthNews: async ({ limit = 10 } = {}) => {
		try {
			const { data, error } = await supabase
				.from('health_news')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(limit);

			if (error) throw error;
			return data || [];
		} catch (error) {
			console.error('Error fetching health news:', error);
			// Fallback mock data
			return [
				{
					id: '1',
					title: 'New ICU Wing at Reddington',
					source: 'Hospital Update',
					time: '2h ago',
					icon: 'business-outline',
					url: 'https://example.com/icu-wing'
				},
				{
					id: '2',
					title: 'Breakthrough in Cardiac Treatment',
					source: 'Medical Journal',
					time: '4h ago',
					icon: 'heart-outline',
					url: 'https://example.com/cardiac-breakthrough'
				}
			];
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
				metadata: {
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
