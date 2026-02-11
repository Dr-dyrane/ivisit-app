import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import RNMlKitOcr from 'react-native-mlkit-ocr';
import { parseBusinessCard } from './parsers/businessCardParser';
import { parseInsuranceCard } from './parsers/insuranceCardParser';
import { looksLikeBusinessCard, looksLikeInsuranceCard } from './ocrHelpers';

/**
 * Extract text from image URI
 * @param {string} imageUri - URI of the image to process
 * @returns {Promise<{success: boolean, text: string, error?: string}>}
 */
export const extractTextFromImage = async (imageUri) => {
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
};

/**
 * Pick an image from gallery and extract text
 * @returns {Promise<{success: boolean, text: string, error?: string}>}
 */
export const pickAndExtractText = async () => {
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
        return await extractTextFromImage(imageUri);
    } catch (error) {
        console.error('OCR Service Error:', error);
        return { 
            success: false, 
            text: '', 
            error: `Failed to process image: ${error.message}` 
        };
    }
};

/**
 * Analyze an insurance card image and extract details
 * @param {string} imageUri 
 * @returns {Promise<{success: boolean, data: object, error?: string}>}
 */
export const scanCard = async (imageUri) => {
    try {
        const ocrResult = await extractTextFromImage(imageUri);
        
        if (!ocrResult.success) {
            return ocrResult;
        }

        const cardData = parseInsuranceCard(ocrResult.text);
        
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
};

/**
 * Parse text from local OCR (if using on-device MLKit)
 * @param {Array} textBlocks - ML Kit text blocks
 * @returns {Object} Parsed data
 */
export const parseText = (textBlocks) => {
    if (!textBlocks || textBlocks.length === 0) {
        return null;
    }

    const fullText = textBlocks.map(block => block.text).join('\n');
    
    // Try to determine if this is a business card or insurance card
    const isBusinessCard = looksLikeBusinessCard(fullText);
    const isInsuranceCard = looksLikeInsuranceCard(fullText);

    if (isBusinessCard) {
        return parseBusinessCard(fullText);
    } else if (isInsuranceCard) {
        return parseInsuranceCard(fullText);
    } else {
        // Return raw text for general documents
        return {
            type: 'document',
            text: fullText,
            lines: fullText.split('\n').map(line => line.trim()).filter(line => line)
        };
    }
};
