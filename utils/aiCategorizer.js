import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const hf = new HfInference(HF_API_TOKEN);

const MODEL_ID = "facebook/bart-large-mnli";

const EXPENSE_LABELS = [
    'Software & Subscriptions', 
    'Internet & Utilities', 
    'Hardware & Equipment', 
    'Marketing & Advertising', 
    'Office Supplies', 
    'Education & Training', 
    'Legal & Professional Fees', 
    'Travel',
    'Meals & Entertainment',
    'Rent or Lease'
];

const INCOME_LABELS = [
    'Freelance Project',
    'Hourly Wage',
    'Retainer Fee',
    'Refund / Reimbursement',
    'Passive Income',
    'Other Income'
];

export const categorizeTransaction = async (description, type) => {
    // 1. Validation
    if (!description || description.trim().length < 2) {
        return 'Uncategorized';
    }

    if (!HF_API_TOKEN) {
        console.error("[AI] Error: HF_API_TOKEN is missing in .env file");
        return 'Uncategorized';
    }

    // 2. Select the correct list based on type
    // Default to EXPENSE_LABELS if type is missing/invalid, or use INCOME for credit
    const candidate_labels = (type === 'credit') ? INCOME_LABELS : EXPENSE_LABELS;

    try {
        console.log(`[AI] Categorizing "${description}" as ${type}...`);

        const result = await hf.zeroShotClassification({
            model: MODEL_ID,
            inputs: description,
            parameters: { candidate_labels }
        });

        // Handle Array of Objects format
        if (Array.isArray(result) && result.length > 0) {
            if (result[0].label && typeof result[0].score === 'number') {
                return result[0].label;
            }
            if (result[0].labels && result[0].labels.length > 0) {
                return result[0].labels[0];
            }
        }

        // Handle Single Object format
        if (result && result.labels && result.labels.length > 0) {
            return result.labels[0];
        }
        
        return 'Uncategorized';

    } catch (error) {
        console.error(`[AI] API Failed: ${error.message}`);
        return 'Uncategorized';
    }
};