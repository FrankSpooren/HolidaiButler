"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextResponseService = void 0;
const openingHoursParser_1 = require("../utils/openingHoursParser");
class TextResponseService {
    async generateTextResponse(options) {
        const { userQuery, intentResult, pois, userLocation, currentTime } = options;
        if (!pois || pois.length === 0) {
            return this.generateNoResultsResponse(userQuery, intentResult);
        }
        if (intentResult.intentContext.openingHoursRelated) {
            return this.generateOpeningHoursResponse(pois, currentTime);
        }
        if (intentResult.intentContext.contactRelated) {
            return this.generateContactInfoResponse(pois);
        }
        if (intentResult.intentContext.timeRelated && intentResult.secondaryIntents.includes('time_sensitive')) {
            return this.generateTimeSensitiveResponse(pois, currentTime);
        }
        if (intentResult.intentContext.comparisonRelated) {
            return this.generateComparisonResponse(pois);
        }
        if (intentResult.primaryIntent === 'get_info' && pois.length === 1) {
            return this.generateSinglePOIInfoResponse(pois[0], userQuery);
        }
        return this.generateSearchResultsResponse(pois, userQuery);
    }
    generateNoResultsResponse(userQuery, intentResult) {
        const query = userQuery.toLowerCase();
        if (query.includes('open') || query.includes('hours')) {
            return "I couldn't find any places matching your search. Try searching for a specific business name or type of place.";
        }
        if (query.includes('near') || query.includes('close')) {
            return "I couldn't find any places near your location. Try expanding your search area or being more specific about what you're looking for.";
        }
        return "I couldn't find any places matching your search. Try being more specific or using different keywords.";
    }
    generateOpeningHoursResponse(pois, currentTime) {
        const now = currentTime || new Date();
        if (pois.length === 1) {
            const poi = pois[0];
            const isOpen = this.isCurrentlyOpen(poi, now);
            const openingStatus = this.getOpeningStatus(poi, now);
            if (isOpen) {
                const isClosingSoon = this.isClosingSoon(poi, now);
                if (isClosingSoon) {
                    return `Yes, ${poi.title} is currently open, but closing soon.`;
                }
                return `Yes, ${poi.title} is currently open.`;
            }
            else {
                const nextOpening = this.getNextOpeningTime(poi, now);
                if (nextOpening) {
                    return `No, ${poi.title} is currently closed. It opens ${nextOpening}.`;
                }
                return `No, ${poi.title} is currently closed.`;
            }
        }
        const responses = [];
        for (const poi of pois.slice(0, 3)) {
            const openingStatus = this.getOpeningStatus(poi, now);
            responses.push(`${poi.title}: ${openingStatus}`);
        }
        if (responses.length === 1) {
            return responses[0];
        }
        return `Here are the opening hours for the places I found:\n${responses.join('\n')}`;
    }
    generateContactInfoResponse(pois) {
        const responses = [];
        for (const poi of pois.slice(0, 3)) {
            const contactInfo = this.getContactInfo(poi);
            if (contactInfo) {
                responses.push(`${poi.title}: ${contactInfo}`);
            }
        }
        if (responses.length === 0) {
            return "I couldn't find contact information for these places.";
        }
        if (responses.length === 1) {
            return responses[0];
        }
        return `Here's the contact information:\n${responses.join('\n')}`;
    }
    generateTimeSensitiveResponse(pois, currentTime) {
        const now = currentTime || new Date();
        const openPlaces = pois.filter(poi => this.isCurrentlyOpen(poi, now));
        const closingSoon = pois.filter(poi => this.isClosingSoon(poi, now));
        if (openPlaces.length > 0) {
            const placeNames = openPlaces.slice(0, 3).map(p => p.title).join(', ');
            return `Yes, ${placeNames} ${openPlaces.length === 1 ? 'is' : 'are'} currently open.`;
        }
        if (closingSoon.length > 0) {
            const placeNames = closingSoon.slice(0, 3).map(p => p.title).join(', ');
            return `${placeNames} ${closingSoon.length === 1 ? 'is' : 'are'} closing soon.`;
        }
        const nextOpen = pois.find(poi => this.getNextOpeningTime(poi, now));
        if (nextOpen) {
            const nextTime = this.getNextOpeningTime(nextOpen, now);
            return `${nextOpen.title} is currently closed. It will open ${nextTime}.`;
        }
        return "None of these places are currently open.";
    }
    generateComparisonResponse(pois) {
        if (pois.length < 2) {
            return this.generateSearchResultsResponse(pois, "");
        }
        const top3 = pois.slice(0, 3);
        const comparisons = top3.map((poi, index) => {
            const rating = poi.metadata.rating ? `${poi.metadata.rating}/5 stars` : 'No rating';
            const location = poi.metadata.location || 'Location not specified';
            return `${index + 1}. ${poi.title} - ${rating}, ${location}`;
        });
        return `Here are the top options:\n${comparisons.join('\n')}`;
    }
    generateSinglePOIInfoResponse(poi, userQuery) {
        const query = userQuery.toLowerCase();
        const currentTime = new Date();
        const responses = [];
        if (query.includes('open') || query.includes('hours') || query.includes('closed')) {
            const isOpen = this.isCurrentlyOpen(poi, currentTime);
            const openingStatus = this.getOpeningStatus(poi, currentTime);
            if (query.includes('open') && !query.includes('closed')) {
                if (isOpen) {
                    const isClosingSoon = this.isClosingSoon(poi, currentTime);
                    if (isClosingSoon) {
                        responses.push(`Yes, ${poi.title} is currently open, but closing soon.`);
                    }
                    else {
                        responses.push(`Yes, ${poi.title} is currently open.`);
                    }
                }
                else {
                    const nextOpening = this.getNextOpeningTime(poi, currentTime);
                    if (nextOpening) {
                        responses.push(`No, ${poi.title} is currently closed. It opens ${nextOpening}.`);
                    }
                    else {
                        responses.push(`No, ${poi.title} is currently closed.`);
                    }
                }
            }
            else {
                responses.push(openingStatus);
            }
        }
        if (query.includes('phone') || query.includes('contact') || query.includes('call')) {
            const contactInfo = this.getContactInfo(poi);
            if (contactInfo) {
                responses.push(contactInfo);
            }
            else {
                responses.push(`I don't have contact information for ${poi.title}.`);
            }
        }
        if (query.includes('address') || query.includes('where') || query.includes('location')) {
            if (poi.metadata.location) {
                responses.push(`${poi.title} is located at ${poi.metadata.location}.`);
            }
            else {
                responses.push(`I don't have the address for ${poi.title}.`);
            }
        }
        if (query.includes('rating') || query.includes('review')) {
            if (poi.metadata.rating) {
                responses.push(`${poi.title} has a rating of ${poi.metadata.rating}/5 stars.`);
            }
            else {
                responses.push(`I don't have rating information for ${poi.title}.`);
            }
        }
        if (responses.length === 0) {
            const parts = [poi.title];
            if (poi.metadata.rating)
                parts.push(`${poi.metadata.rating}/5 stars`);
            if (poi.metadata.location)
                parts.push(`at ${poi.metadata.location}`);
            return parts.join(' - ');
        }
        return responses.join(' ');
    }
    generateSearchResultsResponse(pois, userQuery) {
        const top3 = pois.slice(0, 3);
        if (top3.length === 1) {
            const poi = top3[0];
            const parts = [poi.title];
            if (poi.metadata.rating)
                parts.push(`${poi.metadata.rating}/5 stars`);
            if (poi.metadata.location)
                parts.push(`at ${poi.metadata.location}`);
            return parts.join(' - ');
        }
        const results = top3.map((poi, index) => {
            const rating = poi.metadata.rating ? `${poi.metadata.rating}/5 stars` : 'No rating';
            return `${index + 1}. ${poi.title} (${rating})`;
        });
        return `I found ${pois.length} places. Here are the top results:\n${results.join('\n')}`;
    }
    getOpeningStatus(poi, currentTime) {
        return openingHoursParser_1.OpeningHoursParser.getOpeningStatus(poi.metadata, currentTime);
    }
    getContactInfo(poi) {
        const phone = poi.phone || poi.metadata?.phone;
        const website = poi.website || poi.metadata?.website;
        if (phone && website) {
            return `Phone: ${phone}, Website: ${website}`;
        }
        else if (phone) {
            return `Phone: ${phone}`;
        }
        else if (website) {
            return `Website: ${website}`;
        }
        return null;
    }
    isCurrentlyOpen(poi, currentTime) {
        return openingHoursParser_1.OpeningHoursParser.isCurrentlyOpen(poi.metadata, currentTime);
    }
    isClosingSoon(poi, currentTime) {
        return openingHoursParser_1.OpeningHoursParser.isClosingSoon(poi.metadata, currentTime);
    }
    getNextOpeningTime(poi, currentTime) {
        return openingHoursParser_1.OpeningHoursParser.getNextOpeningTime(poi.metadata, currentTime);
    }
}
exports.TextResponseService = TextResponseService;
//# sourceMappingURL=textResponseService.js.map