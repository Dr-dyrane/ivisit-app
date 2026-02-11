/**
 * Check if text looks like a person's name
 */
export const looksLikeName = (text) => {
    // Name is typically 2-4 words, capitalized, no numbers
    const words = text.split(' ').filter(w => w.length > 0);
    if (words.length < 2 || words.length > 4) return false;
    
    return words.every(word => 
        /^[A-Z][a-z]+$/.test(word) || 
        /^[A-Z]\.?[A-Z][a-z]+$/.test(word) || // For initials like "J. Smith"
        /^[A-Z]+$/.test(word) // For all caps names
    ) && !/\d/.test(text);
};

/**
 * Check if text looks like a job title
 */
export const looksLikeTitle = (text) => {
    const titleKeywords = [
        'manager', 'director', 'engineer', 'developer', 'designer', 'analyst',
        'consultant', 'specialist', 'coordinator', 'assistant', 'associate',
        'president', 'ceo', 'cto', 'cfo', 'vp', 'vice president', 'lead',
        'senior', 'junior', 'sr', 'jr', 'manager', 'supervisor'
    ];
    
    const lowerText = text.toLowerCase();
    return titleKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if text looks like a company name
 */
export const looksLikeCompany = (text) => {
    // Company names often contain Inc, LLC, Corp, Ltd, etc.
    const companySuffixes = ['inc', 'llc', 'corp', 'corporation', 'ltd', 'limited', 'co', 'company'];
    const lowerText = text.toLowerCase();
    
    return companySuffixes.some(suffix => lowerText.includes(suffix)) ||
           (text.split(' ').length >= 2 && 
            text.split(' ').every(word => /^[A-Z][a-z]+$/.test(word)) &&
            !looksLikeName(text));
};

/**
 * Check if text looks like an address
 */
export const looksLikeAddress = (text) => {
    // Address patterns: street number, street name, city, state, zip
    const addressPatterns = [
        /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)/i,
        /\d{5}(-\d{4})?/, // ZIP code
        /[A-Z]{2}\s+\d{5}/ // State + ZIP
    ];
    
    return addressPatterns.some(pattern => pattern.test(text));
};

/**
 * Determine if text looks like a business card
 */
export const looksLikeBusinessCard = (text) => {
    const businessCardIndicators = [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
        /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/, // Phone
        /(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?/ // Website
    ];
    
    const matchCount = businessCardIndicators.reduce((count, pattern) => {
        return count + (pattern.test(text) ? 1 : 0);
    }, 0);
    
    return matchCount >= 2; // At least 2 indicators suggest business card
};

/**
 * Determine if text looks like an insurance card
 */
export const looksLikeInsuranceCard = (text) => {
    const insuranceIndicators = [
        /(?:blue\s+cross|blue\s+shield|aetna|united\s+healthcare|cigna|humana|kaiser|medicare|medicaid)/i,
        /(?:policy|group|member\s+id|plan|coverage)/i,
        /(?:deductible|copay|premium)/i
    ];
    
    return insuranceIndicators.some(pattern => pattern.test(text));
};
