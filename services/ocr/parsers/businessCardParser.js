import { 
    looksLikeName, 
    looksLikeTitle, 
    looksLikeCompany, 
    looksLikeAddress 
} from "../ocrHelpers";

/**
 * Process extracted text for business card information
 * @param {string} text - Raw extracted text
 * @returns {Object} Parsed business card data
 */
export const parseBusinessCard = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const cardData = {
        name: '',
        company: '',
        title: '',
        phone: [],
        email: [],
        website: '',
        address: '',
        other: []
    };

    // Phone number patterns
    const phonePatterns = [
        /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        /(\+?\d{1,3}[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g
    ];

    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    // Website pattern
    const websitePattern = /(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?/g;

    lines.forEach((line, index) => {
        // Extract phone numbers
        phonePatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
                cardData.phone.push(...matches);
            }
        });

        // Extract emails
        const emails = line.match(emailPattern);
        if (emails) {
            cardData.email.push(...emails);
        }

        // Extract websites
        const websites = line.match(websitePattern);
        if (websites && !line.includes('@')) {
            cardData.website = websites[0];
        }

        // Try to identify name (usually first line, capitalized)
        if (index === 0 && looksLikeName(line)) {
            cardData.name = line;
        }
        // Try to identify title (usually contains common title keywords)
        else if (looksLikeTitle(line)) {
            cardData.title = line;
        }
        // Try to identify company (usually capitalized, not a phone/email)
        else if (looksLikeCompany(line)) {
            cardData.company = line;
        }
        // Address detection (contains street, city, state, zip patterns)
        else if (looksLikeAddress(line)) {
            cardData.address = line;
        }
        // Add to other info if not categorized
        else if (!cardData.phone.some(phone => line.includes(phone)) &&
                 !cardData.email.some(email => line.includes(email)) &&
                 line !== cardData.website) {
            cardData.other.push(line);
        }
    });

    return cardData;
};
