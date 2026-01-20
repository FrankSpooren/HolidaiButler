import { QueryInterpretation } from '../models';
import { logger } from '../config/logger';
import { SemanticFollowUpDetector } from './semanticFollowUpDetector';
import { IntentRecognitionService, IntentRecognitionResult } from './intentRecognitionService';

export interface QueryDetection {
  searchType: 'general' | 'specific' | 'contextual';
  targetPOI?: string | undefined;
  isSpecific: boolean;
  confidence: number;
  intentRecognition?: IntentRecognitionResult | undefined;
}

export class QueryDetectionService {
  private semanticDetector: SemanticFollowUpDetector;
  private intentRecognitionService: IntentRecognitionService;

  constructor() {
    this.semanticDetector = new SemanticFollowUpDetector();
    this.intentRecognitionService = new IntentRecognitionService();
  }

  private positionalPatterns = [
    { regex: /(?:the\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)/i, index: 0 },
    { regex: /(?:the\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)/i, index: 1 },
    { regex: /(?:the\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)/i, index: 2 },
    { regex: /(?:the\s+)?(?:fourth|4th|4)\s+(?:one|place|restaurant|hotel)/i, index: 3 },
    { regex: /(?:the\s+)?(?:fifth|5th|5)\s+(?:one|place|restaurant|hotel)/i, index: 4 },
    { regex: /(?:the\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)/i, index: -1 },
    // Enhanced patterns for more natural language
    { regex: /(?:that\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)/i, index: 0 },
    { regex: /(?:that\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)/i, index: 1 },
    { regex: /(?:that\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)/i, index: 2 },
    { regex: /(?:that\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)/i, index: -1 },
    // Time-based follow-up patterns
    { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: 0 },
    { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: 1 },
    { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: 2 },
    { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: -1 }
  ];

  private semanticPatterns = [
    { keywords: ['mediterranean', 'mediterraneo'], poi: 'Casa Pepe' },
    { keywords: ['beach', 'playa', 'coastal'], poi: 'El Pescador' },
    { keywords: ['boutique', 'small', 'intimate'], poi: 'Boutique Casa Lapicida' },
    { keywords: ['pool', 'swimming', 'aqua'], poi: 'Aquasports' },
    { keywords: ['camper', 'camping', 'rv'], poi: 'Mediterranean Camper Area' }
  ];

  private followUpPatterns = [
    // General follow-up patterns
    /which\s+(?:one|of\s+these|is\s+the\s+best|is\s+better)/i,
    /tell\s+me\s+more\s+about/i,
    /more\s+details\s+about/i,
    /what\s+about/i,
    /how\s+about/i,
    /can\s+you\s+tell\s+me\s+more/i,
    /give\s+me\s+more\s+info/i,
    /which\s+of\s+the/i,
    /among\s+these/i,
    /from\s+the\s+list/i,
    /from\s+these/i,
    /of\s+the\s+ones\s+you\s+mentioned/i,
    /from\s+what\s+you\s+showed/i,
    // Time-based follow-up patterns
    /when\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i,
    /what\s+time\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i,
    /is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+open/i,
    /(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+(?:open|hours|available)/i,
    // Enhanced time-based patterns with "today"
    /when\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+(?:open\s+today|available\s+today)/i,
    /what\s+time\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+(?:open\s+today|available\s+today)/i,
    /is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+open\s+today/i,
    // Detail request patterns
    /what\s+is\s+the\s+(?:address|phone|contact|rating|price|menu)\s+of\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i,
    /(?:address|phone|contact|rating|price|menu)\s+of\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i
  ];

  async detectQueryType(query: string, previousResults: any[] = []): Promise<QueryDetection> {
    // First, perform intent recognition
    let intentRecognition: IntentRecognitionResult | undefined;
    try {
      intentRecognition = await this.intentRecognitionService.recognizeIntent(query, {
        lastResults: previousResults
      });
      logger.info(`🎯 Intent recognized: ${intentRecognition.primaryIntent} (${intentRecognition.confidence})`);
    } catch (error) {
      logger.warn('Intent recognition failed, continuing without intent context:', error);
    }
    logger.info(`Detecting query type for: "${query}"`);
    logger.debug(`Previous results available: ${previousResults.length}`, {
      previousResults: previousResults.slice(0, 3).map(r => ({ title: r.title, category: r.category }))
    });
    
    // Use semantic analysis for follow-up detection
    try {
      const semanticAnalysis = await this.semanticDetector.analyzeQuery(query, previousResults);
      
      if (semanticAnalysis.isFollowUp) {
        logger.info(`🧠 SEMANTIC FOLLOW-UP DETECTED: "${query}"`, {
          confidence: semanticAnalysis.confidence,
          intent: semanticAnalysis.intent,
          reasoning: semanticAnalysis.reasoning
        });
        
        // Try to resolve specific POI reference
        let targetPOI = semanticAnalysis.targetPOI;
        
        // If we have a positional reference (like "first", "second"), resolve it to actual POI name
        if (targetPOI && ['first', 'second', 'third', 'last'].includes(targetPOI)) {
          const resolvedPOI = await this.semanticDetector.resolvePositionalReference(query, previousResults);
          targetPOI = resolvedPOI || undefined;
        }
        
        // If no targetPOI yet, try to resolve from query directly
        if (!targetPOI) {
          const resolvedPOI = await this.semanticDetector.resolvePositionalReference(query, previousResults);
          targetPOI = resolvedPOI || undefined;
        }
        
        if (targetPOI) {
          logger.info(`🎯 RESOLVED TARGET POI: ${targetPOI}`);
          return {
            searchType: 'specific',
            targetPOI: targetPOI,
            isSpecific: true,
            confidence: semanticAnalysis.confidence,
            intentRecognition
          };
        } else {
          logger.info(`📋 GENERIC FOLLOW-UP: Using all previous results`);
          return {
            searchType: 'contextual',
            targetPOI: undefined,
            isSpecific: true,
            confidence: semanticAnalysis.confidence,
            intentRecognition
          };
        }
      }
    } catch (error) {
      logger.warn('Semantic analysis failed, falling back to regex patterns:', error);
      // Fall back to regex-based detection
      return this.fallbackDetection(query, previousResults, intentRecognition);
    }
    
    // Check for positional references (non-follow-up)
    const positionalMatch = this.detectPositionalReference(query, previousResults);
    if (positionalMatch) {
      logger.info(`Detected positional reference: ${positionalMatch}`);
      logger.debug(`Positional match details:`, {
        query,
        match: positionalMatch,
        previousResultsCount: previousResults.length
      });
      return {
        searchType: 'specific',
        targetPOI: positionalMatch,
        isSpecific: true,
        confidence: 0.9,
        intentRecognition
      };
    }

    // Check for direct POI mentions
    const directMatch = this.detectDirectPOIMention(query, previousResults);
    if (directMatch) {
      logger.info(`Detected direct POI mention: ${directMatch}`);
      logger.debug(`Direct match details:`, {
        query,
        match: directMatch,
        previousResultsCount: previousResults.length
      });
      return {
        searchType: 'specific',
        targetPOI: directMatch,
        isSpecific: true,
        confidence: 0.8,
        intentRecognition
      };
    }

    // Check for semantic references
    const semanticMatch = this.detectSemanticPOIMention(query, previousResults);
    if (semanticMatch) {
      logger.info(`Detected semantic reference: ${semanticMatch}`);
      logger.debug(`Semantic match details:`, {
        query,
        match: semanticMatch,
        previousResultsCount: previousResults.length
      });
      return {
        searchType: 'contextual',
        targetPOI: semanticMatch,
        isSpecific: true,
        confidence: 0.7,
        intentRecognition
      };
    }

    // Default to general search
    logger.info('No specific patterns detected, using general search');
    logger.debug(`General search fallback:`, {
      query,
      previousResultsCount: previousResults.length,
      extractedEntities: this.extractEntities(query)
    });
    return {
      searchType: 'general',
      targetPOI: undefined,
      isSpecific: false,
      confidence: 0.5,
      intentRecognition
    };
  }

  private detectPositionalReference(query: string, previousResults: any[]): string | null {
    const queryLower = query.toLowerCase();
    
    for (const pattern of this.positionalPatterns) {
      if (pattern.regex.test(queryLower)) {
        const targetIndex = pattern.index === -1 ? previousResults.length - 1 : pattern.index;
        if (targetIndex >= 0 && targetIndex < previousResults.length) {
          return previousResults[targetIndex].title || previousResults[targetIndex].name;
        }
      }
    }
    
    return null;
  }

  private detectDirectPOIMention(query: string, previousResults: any[]): string | null {
    const queryLower = query.toLowerCase();
    
    for (const result of previousResults) {
      const poiName = (result.title || result.name || '').toLowerCase();
      if (poiName && queryLower.includes(poiName)) {
        return result.title || result.name;
      }
    }
    
    return null;
  }

  private detectSemanticPOIMention(query: string, previousResults: any[]): string | null {
    const queryLower = query.toLowerCase();
    
    for (const pattern of this.semanticPatterns) {
      const hasKeyword = pattern.keywords.some(keyword => queryLower.includes(keyword));
      if (hasKeyword) {
        const foundPOI = previousResults.find(result => {
          const poiName = (result.title || result.name || '').toLowerCase();
          return poiName.includes(pattern.poi.toLowerCase());
        });
        if (foundPOI) {
          return foundPOI.title || foundPOI.name;
        }
      }
    }
    
    return null;
  }

  createQueryInterpretation(detection: QueryDetection, query: string): QueryInterpretation {
    const extractedEntities = this.extractEntities(query);
    
    // Debug logging for intent recognition
    logger.info(`🔍 QUERY INTERPRETATION DEBUG:`, {
      hasIntentRecognition: !!detection.intentRecognition,
      intentRecognition: detection.intentRecognition ? {
        primaryIntent: detection.intentRecognition.primaryIntent,
        secondaryIntents: detection.intentRecognition.secondaryIntents,
        confidence: detection.intentRecognition.confidence
      } : null
    });
    
    return {
      detectedType: detection.searchType,
      extractedEntities,
      confidence: detection.confidence,
      ...(detection.targetPOI && { targetPOI: detection.targetPOI }),
      ...(detection.targetPOI && {
        positionalReference: {
          type: 'numeric' as const,
          value: detection.targetPOI,
          resolvedPOI: detection.targetPOI
        }
      }),
      // Include intent recognition data
      ...(detection.intentRecognition && { intentRecognition: detection.intentRecognition })
    };
  }

  private detectFollowUpQuestion(query: string, previousResults: any[]): boolean {
    const queryLower = query.toLowerCase();
    
    // Check if any follow-up pattern matches
    const hasFollowUpPattern = this.followUpPatterns.some(pattern => pattern.test(query));
    
    // Check for common follow-up indicators
    const hasFollowUpIndicators = 
      queryLower.includes('that') ||
      queryLower.includes('this') ||
      queryLower.includes('these') ||
      queryLower.includes('first') ||
      queryLower.includes('second') ||
      queryLower.includes('third') ||
      queryLower.includes('last') ||
      queryLower.includes('one') ||
      queryLower.includes('which') ||
      queryLower.includes('when') ||
      queryLower.includes('what time') ||
      queryLower.includes('open') ||
      queryLower.includes('hours') ||
      queryLower.includes('address') ||
      queryLower.includes('phone') ||
      queryLower.includes('rating') ||
      queryLower.includes('price') ||
      queryLower.includes('menu');

    // Don't treat as follow-up if it's clearly a new search
    const isNewSearch = 
      queryLower.includes('new') ||
      queryLower.includes('different') ||
      queryLower.includes('other') ||
      queryLower.includes('another') ||
      queryLower.includes('more options') ||
      queryLower.includes('show me') ||
      queryLower.includes('find me') ||
      queryLower.includes('search for');

    // If we have strong follow-up indicators, treat as follow-up even without previous results
    // This allows the system to attempt follow-up processing
    const isStrongFollowUp = hasFollowUpPattern || (hasFollowUpIndicators && !isNewSearch);
    
    // If we have previous results, use them for follow-up processing
    if (isStrongFollowUp && previousResults && previousResults.length > 0) {
      return true;
    }
    
    // If we have strong follow-up indicators but no previous results, still treat as follow-up
    // but the system will need to handle this gracefully
    if (isStrongFollowUp && (!previousResults || previousResults.length === 0)) {
      logger.warn(`Strong follow-up indicators detected but no previous results available for query: "${query}"`);
      return true;
    }
    
    return false;
  }

  private fallbackDetection(query: string, previousResults: any[], intentRecognition?: IntentRecognitionResult): QueryDetection {
    logger.info('Using fallback regex-based detection');
    
    // First check if this is a follow-up question
    const isFollowUp = this.detectFollowUpQuestion(query, previousResults);
    if (isFollowUp) {
      logger.info(`Detected follow-up question: "${query}"`);
      
      // Check for positional references in follow-up
      const positionalMatch = this.detectPositionalReference(query, previousResults);
      if (positionalMatch) {
        logger.info(`Detected positional reference in follow-up: ${positionalMatch}`);
        return {
          searchType: 'specific',
          targetPOI: positionalMatch,
          isSpecific: true,
          confidence: 0.95,
          intentRecognition
        };
      }

      // Check for direct POI mentions in follow-up
      const directMatch = this.detectDirectPOIMention(query, previousResults);
      if (directMatch) {
        logger.info(`Detected direct POI mention in follow-up: ${directMatch}`);
        return {
          searchType: 'specific',
          targetPOI: directMatch,
          isSpecific: true,
          confidence: 0.9,
          intentRecognition
        };
      }

      // Generic follow-up question
      logger.info(`Generic follow-up question detected`);
      return {
        searchType: 'contextual',
        targetPOI: undefined,
        isSpecific: true,
        confidence: 0.8,
        intentRecognition
      };
    }
    
    // Check for positional references (non-follow-up)
    const positionalMatch = this.detectPositionalReference(query, previousResults);
    if (positionalMatch) {
      logger.info(`Detected positional reference: ${positionalMatch}`);
      return {
        searchType: 'specific',
        targetPOI: positionalMatch,
        isSpecific: true,
        confidence: 0.9,
        intentRecognition
      };
    }

    // Check for direct POI mentions
    const directMatch = this.detectDirectPOIMention(query, previousResults);
    if (directMatch) {
      logger.info(`Detected direct POI mention: ${directMatch}`);
      return {
        searchType: 'specific',
        targetPOI: directMatch,
        isSpecific: true,
        confidence: 0.8,
        intentRecognition
      };
    }

    // Check for semantic references
    const semanticMatch = this.detectSemanticPOIMention(query, previousResults);
    if (semanticMatch) {
      logger.info(`Detected semantic reference: ${semanticMatch}`);
      return {
        searchType: 'contextual',
        targetPOI: semanticMatch,
        isSpecific: true,
        confidence: 0.7,
        intentRecognition
      };
    }

    // Default to general search
    logger.info('No specific patterns detected, using general search');
    return {
      searchType: 'general',
      targetPOI: undefined,
      isSpecific: false,
      confidence: 0.5,
      intentRecognition
    };
  }

  private extractEntities(query: string): string[] {
    const words = query.toLowerCase().split(' ');
    const stopWords = ['the', 'and', 'or', 'but', 'for', 'with', 'from', 'that', 'this', 'a', 'an', 'in', 'on', 'at', 'to', 'of'];
    
    return words
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 0);
  }
}
