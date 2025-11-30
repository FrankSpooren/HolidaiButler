"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DietaryIntentService = void 0;
const logger_1 = require("../config/logger");
class DietaryIntentService {
    detectDietaryIntent(query) {
        const queryLower = query.toLowerCase();
        logger_1.logger.info(`🥗 DIETARY INTENT DETECTION: "${query}" -> "${queryLower}"`);
        const dietaryPatterns = {
            'vegetarian': {
                keywords: ['vegetarian', 'veggie', 'plant-based', 'plant', 'herbivore', 'meat-free', 'vegetable', 'salad', 'green'],
                phrases: ['vegetarian place', 'vegetarian restaurant', 'veggie food', 'plant based', 'meat free'],
                confidence: 0.9
            },
            'vegan': {
                keywords: ['vegan', 'plant-based', 'dairy-free', 'egg-free', 'animal-free', 'cruelty-free'],
                phrases: ['vegan place', 'vegan restaurant', 'dairy free', 'egg free', 'animal free'],
                confidence: 0.9
            },
            'gluten-free': {
                keywords: ['gluten-free', 'gluten free', 'celiac', 'wheat-free', 'gf'],
                phrases: ['gluten free', 'celiac friendly', 'wheat free'],
                confidence: 0.8
            },
            'halal': {
                keywords: ['halal', 'muslim', 'islamic', 'permissible'],
                phrases: ['halal food', 'halal restaurant', 'muslim food'],
                confidence: 0.9
            },
            'kosher': {
                keywords: ['kosher', 'jewish', 'hechsher'],
                phrases: ['kosher food', 'kosher restaurant', 'jewish food'],
                confidence: 0.9
            },
            'keto': {
                keywords: ['keto', 'ketogenic', 'low-carb', 'low carb', 'high-fat'],
                phrases: ['keto diet', 'ketogenic', 'low carb', 'high fat'],
                confidence: 0.8
            },
            'paleo': {
                keywords: ['paleo', 'paleolithic', 'caveman', 'primal'],
                phrases: ['paleo diet', 'paleolithic', 'caveman diet'],
                confidence: 0.8
            }
        };
        let bestMatch = null;
        let highestConfidence = 0;
        for (const [type, pattern] of Object.entries(dietaryPatterns)) {
            let matchScore = 0;
            let totalChecks = 0;
            logger_1.logger.info(`🔍 Checking pattern: ${type}`);
            for (const keyword of pattern.keywords) {
                totalChecks++;
                const matches = queryLower.includes(keyword);
                if (matches) {
                    matchScore++;
                    logger_1.logger.info(`   ✅ Keyword match: "${keyword}"`);
                }
            }
            for (const phrase of pattern.phrases) {
                totalChecks++;
                const matches = queryLower.includes(phrase);
                if (matches) {
                    matchScore += 2;
                    logger_1.logger.info(`   ✅ Phrase match: "${phrase}"`);
                }
            }
            const confidence = matchScore > 0 ? pattern.confidence : 0;
            logger_1.logger.info(`   📊 ${type}: matchScore=${matchScore}, confidence=${confidence.toFixed(3)}`);
            if (confidence > highestConfidence && confidence > 0.1) {
                highestConfidence = confidence;
                bestMatch = {
                    type,
                    confidence,
                    keywords: pattern.keywords
                };
                logger_1.logger.info(`   🎯 New best match: ${type} (confidence: ${confidence.toFixed(3)})`);
            }
        }
        if (bestMatch) {
            logger_1.logger.info(`Detected dietary intent: ${bestMatch.type} with confidence ${bestMatch.confidence.toFixed(2)}`);
            return {
                type: bestMatch.type,
                confidence: bestMatch.confidence,
                keywords: bestMatch.keywords
            };
        }
        return {
            type: 'none',
            confidence: 0,
            keywords: []
        };
    }
    extractDietaryKeywords(query) {
        const queryLower = query.toLowerCase();
        const allKeywords = [
            'vegetarian', 'veggie', 'plant-based', 'plant', 'herbivore', 'meat-free', 'vegetable', 'salad', 'green',
            'vegan', 'dairy-free', 'egg-free', 'animal-free', 'cruelty-free',
            'gluten-free', 'gluten free', 'celiac', 'wheat-free', 'gf',
            'halal', 'muslim', 'islamic', 'permissible',
            'kosher', 'jewish', 'hechsher',
            'keto', 'ketogenic', 'low-carb', 'low carb', 'high-fat',
            'paleo', 'paleolithic', 'caveman', 'primal'
        ];
        return allKeywords.filter(keyword => queryLower.includes(keyword));
    }
    checkPOIDietaryMatch(poi, dietaryIntent) {
        if (dietaryIntent.type === 'none')
            return true;
        const poiText = this.getPOIText(poi).toLowerCase();
        const keywords = dietaryIntent.keywords;
        return keywords.some(keyword => poiText.includes(keyword));
    }
    getPOIText(poi) {
        const parts = [
            poi.title || '',
            poi.subtitle || '',
            poi.category || '',
            poi.metadata?.description || '',
            poi.metadata?.amenities?.join(' ') || ''
        ];
        return parts.join(' ').toLowerCase();
    }
}
exports.DietaryIntentService = DietaryIntentService;
//# sourceMappingURL=dietaryIntentService.js.map