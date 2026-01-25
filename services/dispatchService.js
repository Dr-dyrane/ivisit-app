import { calculateDistance } from "../utils/mapUtils";

/**
 * Smart Hospital Dispatch Service
 * Automatically selects the best hospital based on multiple factors
 */

export class DispatchService {
  /**
   * Calculate hospital score for emergency dispatch
   * @param {Object} hospital - Hospital data
   * @param {Object} userLocation - User's GPS coordinates
   * @returns {number} Score (higher = better)
   */
  static calculateHospitalScore(hospital, userLocation) {
    if (!hospital?.coordinates || !userLocation) return 0;

    // 1. Distance Score (40% weight) - Closer is better
    const distanceKm = hospital.distanceKm || 0;
    const distanceScore = Math.max(0, 100 - (distanceKm * 10)); // 10 points per km

    // 2. Bed Availability Score (30% weight) - More beds is better
    const availableBeds = hospital.availableBeds || 0;
    const bedScore = Math.min(100, availableBeds * 2); // 2 points per bed, max 100

    // 3. Wait Time Score (20% weight) - Lower wait time is better
    const waitTime = hospital.waitTime || "15 mins";
    const waitMinutes = parseInt(waitTime) || 15;
    const waitScore = Math.max(0, 100 - (waitMinutes * 2)); // 2 points per minute

    // 4. Ambulance Availability Score (10% weight) - Having ambulances is better
    const ambulances = hospital.ambulances || 0;
    const ambulanceScore = Math.min(100, ambulances * 25); // 25 points per ambulance, max 100

    // Weighted final score
    const finalScore = (
      distanceScore * 0.4 +
      bedScore * 0.3 +
      waitScore * 0.2 +
      ambulanceScore * 0.1
    );

    return Math.round(finalScore);
  }

  /**
   * Rank hospitals for emergency dispatch
   * @param {Array} hospitals - List of hospitals
   * @param {Object} userLocation - User's GPS coordinates
   * @returns {Array} Ranked hospitals with scores
   */
  static rankHospitals(hospitals, userLocation) {
    if (!Array.isArray(hospitals) || !userLocation) return [];

    return hospitals
      .map(hospital => ({
        ...hospital,
        dispatchScore: this.calculateHospitalScore(hospital, userLocation)
      }))
      .filter(hospital => hospital.dispatchScore > 0)
      .sort((a, b) => b.dispatchScore - a.dispatchScore); // Highest score first
  }

  /**
   * Select best hospital for emergency dispatch
   * @param {Array} hospitals - List of hospitals
   * @param {Object} userLocation - User's GPS coordinates
   * @returns {Object|null} Best hospital or null if none available
   */
  static selectBestHospital(hospitals, userLocation) {
    const rankedHospitals = this.rankHospitals(hospitals, userLocation);
    
    if (rankedHospitals.length === 0) {
      console.warn('[DispatchService] No suitable hospitals found');
      return null;
    }

    const bestHospital = rankedHospitals[0];
    console.log('[DispatchService] Selected best hospital:', {
      name: bestHospital.name,
      score: bestHospital.dispatchScore,
      distance: bestHospital.distance,
      beds: bestHospital.availableBeds,
      waitTime: bestHospital.waitTime
    });

    return bestHospital;
  }

  /**
   * Get dispatch recommendation details
   * @param {Object} hospital - Selected hospital
   * @returns {Object} Dispatch recommendation
   */
  static getDispatchRecommendation(hospital) {
    if (!hospital) return null;

    return {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      hospitalAddress: hospital.address,
      estimatedArrival: hospital.eta,
      availableBeds: hospital.availableBeds,
      waitTime: hospital.waitTime,
      dispatchScore: hospital.dispatchScore,
      recommendation: `Selected ${hospital.name} - Score: ${hospital.dispatchScore}/100`,
      reasons: this.getSelectionReasons(hospital)
    };
  }

  /**
   * Get reasons for hospital selection
   * @param {Object} hospital - Selected hospital
   * @returns {Array} List of selection reasons
   */
  static getSelectionReasons(hospital) {
    const reasons = [];
    
    if (hospital.distanceKm < 5) {
      reasons.push(`Very close (${hospital.distance})`);
    }
    
    if (hospital.availableBeds > 20) {
      reasons.push(`High bed availability (${hospital.availableBeds} beds)`);
    }
    
    if (hospital.waitTime && parseInt(hospital.waitTime) < 15) {
      reasons.push(`Low wait time (${hospital.waitTime})`);
    }
    
    if (hospital.ambulances > 0) {
      reasons.push(`On-site ambulances (${hospital.ambulances})`);
    }

    return reasons.length > 0 ? reasons : ['Best overall match'];
  }
}

export default DispatchService;
