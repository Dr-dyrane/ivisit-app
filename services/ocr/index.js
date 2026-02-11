import { 
    extractTextFromImage, 
    pickAndExtractText, 
    scanCard, 
    parseText 
} from "./ocrCore";
import { parseBusinessCard } from "./parsers/businessCardParser";
import { parseInsuranceCard } from "./parsers/insuranceCardParser";
import { 
    looksLikeName, 
    looksLikeTitle, 
    looksLikeCompany, 
    looksLikeAddress, 
    looksLikeBusinessCard, 
    looksLikeInsuranceCard 
} from "./ocrHelpers";

export const ocrService = {
    extractTextFromImage,
    pickAndExtractText,
    scanCard,
    parseText,
    parseBusinessCard,
    parseInsuranceCard,
    looksLikeName,
    looksLikeTitle,
    looksLikeCompany,
    looksLikeAddress,
    looksLikeBusinessCard,
    looksLikeInsuranceCard
};

export default ocrService;
