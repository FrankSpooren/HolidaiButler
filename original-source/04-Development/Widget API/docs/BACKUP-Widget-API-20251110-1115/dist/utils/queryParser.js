"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryParser = void 0;
class QueryParser {
    static extractEntities(query) {
        const words = query.toLowerCase().split(' ');
        const stopWords = ['the', 'and', 'or', 'but', 'for', 'with', 'from', 'that', 'this', 'a', 'an', 'in', 'on', 'at', 'to', 'of'];
        return words
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .map(word => word.replace(/[^\w]/g, ''))
            .filter(word => word.length > 0);
    }
    static normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }
    static detectLanguage(query) {
        const spanishWords = ['restaurante', 'hotel', 'playa', 'calpe', 'mediterraneo'];
        const englishWords = ['restaurant', 'hotel', 'beach', 'calpe', 'mediterranean'];
        const queryLower = query.toLowerCase();
        const spanishCount = spanishWords.filter(word => queryLower.includes(word)).length;
        const englishCount = englishWords.filter(word => queryLower.includes(word)).length;
        return spanishCount > englishCount ? 'es' : 'en';
    }
    static extractLocation(query) {
        const locationPatterns = [
            /in\s+([a-zA-Z\s]+)/i,
            /at\s+([a-zA-Z\s]+)/i,
            /near\s+([a-zA-Z\s]+)/i,
            /en\s+([a-zA-Z\s]+)/i,
            /cerca\s+de\s+([a-zA-Z\s]+)/i
        ];
        for (const pattern of locationPatterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }
}
exports.QueryParser = QueryParser;
//# sourceMappingURL=queryParser.js.map