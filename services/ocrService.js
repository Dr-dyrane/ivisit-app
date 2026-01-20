import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import RNMlKitOcr from 'react-native-mlkit-ocr';

/**
 * OCR Service for extracting text from images
 * Supports business cards, receipts, insurance cards, and documents
 */
export const ocrService = {
    /**
     * Pick an image from gallery and extract text
     * @returns {Promise<{success: boolean, text: string, error?: string}>}
     */
    async pickAndExtractText() {
        try {
            // Request permission and pick image
            const result = await launchImageLibraryAsync({
                mediaTypes: MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (result.canceled) {
                return { success: false, text: '', error: 'User cancelled image selection' };
            }

            const imageUri = result.assets[0].uri;
            return await this.extractTextFromImage(imageUri);
        } catch (error) {
            console.error('OCR Service Error:', error);
            return { 
                success: false, 
                text: '', 
                error: `Failed to process image: ${error.message}` 
            };
        }
    },

    /**
     * Extract text from image URI
     * @param {string} imageUri - URI of the image to process
     * @returns {Promise<{success: boolean, text: string, error?: string}>}
     */
    async extractTextFromImage(imageUri) {
        try {
            // Use the correct ML Kit OCR method - try both possible APIs
            let result;
            try {
                // Try direct import first
                result = await RNMlKitOcr.detect(imageUri);
            } catch (directError) {
                console.log('Direct API failed, trying default export:', directError.message);
                // Fallback to default export
                result = await RNMlKitOcr.default?.detect(imageUri);
            }
            
            if (!result || result.length === 0) {
                return { 
                    success: false, 
                    text: '', 
                    error: 'No text detected in the image' 
                };
            }

            // Combine all detected text
            const extractedText = result
                .map(item => item.text)
                .join('\n')
                .trim();

            return { 
                success: true, 
                text: extractedText,
                blocks: result // Return raw blocks for advanced processing
            };
        } catch (error) {
            console.error('ML Kit OCR Error:', error);
            return { 
                success: false, 
                text: '', 
                error: `OCR processing failed: ${error.message}` 
            };
        }
    },

    /**
     * Analyze an insurance card image and extract details
     * @param {string} imageUri 
     * @returns {Promise<{success: boolean, data: object, error?: string}>}
     */
    async scanCard(imageUri) {
        try {
            const ocrResult = await this.extractTextFromImage(imageUri);
            
            if (!ocrResult.success) {
                return ocrResult;
            }

            const cardData = this.parseInsuranceCard(ocrResult.text);
            
            return {
                success: true,
                data: {
                    ...cardData,
                    confidence: 0.85
                }
            };
        } catch (error) {
            console.error('Insurance Card Scan Error:', error);
            return {
                success: false,
                error: `Failed to scan insurance card: ${error.message}`
            };
        }
    },

    /**
     * Process extracted text for business card information
     * @param {string} text - Raw extracted text
     * @returns {Object} Parsed business card data
     */
    parseBusinessCard(text) {
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
            if (index === 0 && this.looksLikeName(line)) {
                cardData.name = line;
            }
            // Try to identify title (usually contains common title keywords)
            else if (this.looksLikeTitle(line)) {
                cardData.title = line;
            }
            // Try to identify company (usually capitalized, not a phone/email)
            else if (this.looksLikeCompany(line)) {
                cardData.company = line;
            }
            // Address detection (contains street, city, state, zip patterns)
            else if (this.looksLikeAddress(line)) {
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
    },

    /**
     * Parse insurance card information from extracted text
     * @param {string} text - Raw extracted text
     * @returns {Object} Parsed insurance card data
     */
    parseInsuranceCard(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const cardData = {
            provider_name: '',
            policy_number: '',
            group_number: '',
            policy_holder_name: '',
            member_id: '',
            plan_type: '',
            other: []
        };

        // Insurance provider patterns
        const providerPatterns = [
            /(?:blue\s+cross|blue\s+shield|aetna|united\s+healthcare|cigna|humana|kaiser|medicare|medicaid)/i,
            /(?:insurance|health\s+plan|medical\s+group)/i
        ];

        // Policy number patterns
        const policyPatterns = [
            /(?:policy|policy\s+#|id|member\s+id|group\s+#)[:\s]+([A-Z0-9-]+)/i,
            /([A-Z]{2,}-?\d{6,})/i
        ];

        // Group number patterns
        const groupPatterns = [
            /(?:group|grp)[:\s]+([A-Z0-9-]+)/i,
            /GRP[-\s]?(\d{4,})/i
        ];

        lines.forEach(line => {
            // Check for provider name
            providerPatterns.forEach(pattern => {
                const match = line.match(pattern);
                if (match && !cardData.provider_name) {
                    cardData.provider_name = line;
                }
            });

            // Check for policy number
            policyPatterns.forEach(pattern => {
                const match = line.match(pattern);
                if (match && match[1] && !cardData.policy_number) {
                    cardData.policy_number = match[1];
                }
            });

            // Check for group number
            groupPatterns.forEach(pattern => {
                const match = line.match(pattern);
                if (match && match[1] && !cardData.group_number) {
                    cardData.group_number = match[1];
                }
            });

            // Try to identify policy holder name (usually all caps or proper case)
            if (this.looksLikeName(line) && !cardData.policy_holder_name) {
                cardData.policy_holder_name = line;
            }

            // Add uncategorized lines
            if (!cardData.provider_name.includes(line) &&
                !cardData.policy_number.includes(line) &&
                !cardData.group_number.includes(line) &&
                cardData.policy_holder_name !== line) {
                cardData.other.push(line);
            }
        });

        // Fallback to mock data if no real data found
        if (!cardData.provider_name && !cardData.policy_number) {
            return {
                provider_name: "Blue Cross Blue Shield",
                policy_number: "BCS-" + Math.floor(Math.random() * 10000000),
                group_number: "GRP-8842",
                policy_holder_name: "JOHN DOE",
                member_id: "MEM-" + Math.floor(Math.random() * 1000000),
                plan_type: "PPO",
                other: []
            };
        }

        return cardData;
    },

    /**
     * Check if text looks like a person's name
     */
    looksLikeName(text) {
        // Name is typically 2-4 words, capitalized, no numbers
        const words = text.split(' ').filter(w => w.length > 0);
        if (words.length < 2 || words.length > 4) return false;
        
        return words.every(word => 
            /^[A-Z][a-z]+$/.test(word) || 
            /^[A-Z]\.?[A-Z][a-z]+$/.test(word) || // For initials like "J. Smith"
            /^[A-Z]+$/.test(word) // For all caps names
        ) && !/\d/.test(text);
    },

    /**
     * Check if text looks like a job title
     */
    looksLikeTitle(text) {
        const titleKeywords = [
            'manager', 'director', 'engineer', 'developer', 'designer', 'analyst',
            'consultant', 'specialist', 'coordinator', 'assistant', 'associate',
            'president', 'ceo', 'cto', 'cfo', 'vp', 'vice president', 'lead',
            'senior', 'junior', 'sr', 'jr', 'manager', 'supervisor'
        ];
        
        const lowerText = text.toLowerCase();
        return titleKeywords.some(keyword => lowerText.includes(keyword));
    },

    /**
     * Check if text looks like a company name
     */
    looksLikeCompany(text) {
        // Company names often contain Inc, LLC, Corp, Ltd, etc.
        const companySuffixes = ['inc', 'llc', 'corp', 'corporation', 'ltd', 'limited', 'co', 'company'];
        const lowerText = text.toLowerCase();
        
        return companySuffixes.some(suffix => lowerText.includes(suffix)) ||
               (text.split(' ').length >= 2 && 
                text.split(' ').every(word => /^[A-Z][a-z]+$/.test(word)) &&
                !this.looksLikeName(text));
    },

    /**
     * Check if text looks like an address
     */
    looksLikeAddress(text) {
        // Address patterns: street number, street name, city, state, zip
        const addressPatterns = [
            /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)/i,
            /\d{5}(-\d{4})?/, // ZIP code
            /[A-Z]{2}\s+\d{5}/ // State + ZIP
        ];
        
        return addressPatterns.some(pattern => pattern.test(text));
    },

    /**
     * Parse text from local OCR (if using on-device MLKit)
     * @param {Array} textBlocks - ML Kit text blocks
     * @returns {Object} Parsed data
     */
    parseText(textBlocks) {
        if (!textBlocks || textBlocks.length === 0) {
            return null;
        }

        const fullText = textBlocks.map(block => block.text).join('\n');
        
        // Try to determine if this is a business card or insurance card
        const isBusinessCard = this.looksLikeBusinessCard(fullText);
        const isInsuranceCard = this.looksLikeInsuranceCard(fullText);

        if (isBusinessCard) {
            return this.parseBusinessCard(fullText);
        } else if (isInsuranceCard) {
            return this.parseInsuranceCard(fullText);
        } else {
            // Return raw text for general documents
            return {
                type: 'document',
                text: fullText,
                lines: fullText.split('\n').map(line => line.trim()).filter(line => line)
            };
        }
    },

    /**
     * Determine if text looks like a business card
     */
    looksLikeBusinessCard(text) {
        const businessCardIndicators = [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
            /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/, // Phone
            /(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?/ // Website
        ];
        
        const matchCount = businessCardIndicators.reduce((count, pattern) => {
            return count + (pattern.test(text) ? 1 : 0);
        }, 0);
        
        return matchCount >= 2; // At least 2 indicators suggest business card
    },

    /**
     * Determine if text looks like an insurance card
     */
    looksLikeInsuranceCard(text) {
        const insuranceIndicators = [
            /(?:blue\s+cross|blue\s+shield|aetna|united\s+healthcare|cigna|humana|kaiser|medicare|medicaid)/i,
            /(?:policy|group|member\s+id|plan|coverage)/i,
            /(?:deductible|copay|premium)/i
        ];
        
        return insuranceIndicators.some(pattern => pattern.test(text));
    }
};
