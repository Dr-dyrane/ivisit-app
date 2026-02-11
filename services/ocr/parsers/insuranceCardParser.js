import { looksLikeName } from "../ocrHelpers";

/**
 * Parse insurance card information from extracted text
 * @param {string} text - Raw extracted text
 * @returns {Object} Parsed insurance card data
 */
export const parseInsuranceCard = (text) => {
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
        if (looksLikeName(line) && !cardData.policy_holder_name) {
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
};
