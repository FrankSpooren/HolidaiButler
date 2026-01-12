import { MistralService } from './mistralService';
import { logger } from '../config/logger';

export interface ConversationContext {
  query: string;
  previousQueries: string[];
  previousResults: any[];
  conversationHistory: ConversationTurn[];
  userProfile?: UserProfile;
  sessionMetadata: SessionMetadata;
}

export interface ConversationTurn {
  query: string;
  results: any[];
  timestamp: Date;
  intent?: string;
  entities?: string[];
}

export interface UserProfile {
  location?: string;
  preferences?: string[];
  language?: string;
  culturalContext?: string;
}

export interface SessionMetadata {
  sessionId: string;
  startTime: Date;
  totalTurns: number;
  averageResponseTime: number;
}

export interface SemanticAnalysis {
  isFollowUp: boolean;
  confidence: number;
  intent: Intent;
  targetEntities: EntityReference[];
  conversationFlow: ConversationFlow;
  implicitReferences: ImplicitReference[];
  suggestedActions: SuggestedAction[];
}

export interface EntityReference {
  type: 'POI' | 'Category' | 'Location' | 'Time' | 'Attribute';
  entity: string;
  confidence: number;
  source: 'explicit' | 'implicit' | 'inferred';
}

export interface ConversationFlow {
  type: 'new_topic' | 'continuation' | 'clarification' | 'refinement';
  confidence: number;
  reasoning: string;
}

export interface ImplicitReference {
  type: 'time' | 'location' | 'preference' | 'context';
  value: string;
  confidence: number;
}

export interface SuggestedAction {
  action: string;
  priority: number;
  reasoning: string;
}

export type Intent = 'time' | 'location' | 'contact' | 'details' | 'booking' | 'comparison' | 'new_search' | 'clarification';

export class AdvancedSemanticDetector {
  private mistralService: MistralService;

  constructor() {
    this.mistralService = new MistralService();
  }

  async analyzeConversation(context: ConversationContext): Promise<SemanticAnalysis> {
    logger.info('🧠 ADVANCED SEMANTIC ANALYSIS STARTING', {
      query: context.query,
      previousTurns: context.conversationHistory.length,
      previousResults: context.previousResults.length
    });

    try {
      // Generate embeddings for semantic similarity analysis
      const queryEmbedding = await this.generateQueryEmbedding(context.query);
      const contextEmbedding = await this.generateContextEmbedding(context);
      
      // Calculate semantic similarity
      const semanticSimilarity = this.calculateSemanticSimilarity(queryEmbedding, contextEmbedding);
      
      // Analyze conversation flow
      const conversationFlow = await this.analyzeConversationFlow(context);
      
      // Resolve entity references
      const targetEntities = await this.resolveEntityReferences(context);
      
      // Detect implicit references
      const implicitReferences = await this.detectImplicitReferences(context);
      
      // Determine intent
      const intent = await this.determineIntent(context, targetEntities, implicitReferences);
      
      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(context, intent, targetEntities);
      
      // Determine if this is a follow-up
      const isFollowUp = this.determineFollowUpStatus(
        semanticSimilarity,
        conversationFlow,
        targetEntities,
        context
      );

      const analysis: SemanticAnalysis = {
        isFollowUp,
        confidence: this.calculateOverallConfidence(semanticSimilarity, conversationFlow, targetEntities),
        intent,
        targetEntities,
        conversationFlow,
        implicitReferences,
        suggestedActions
      };

      logger.info('🧠 SEMANTIC ANALYSIS COMPLETE', {
        isFollowUp: analysis.isFollowUp,
        confidence: analysis.confidence,
        intent: analysis.intent,
        targetEntitiesCount: analysis.targetEntities.length,
        implicitReferencesCount: analysis.implicitReferences.length
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to perform advanced semantic analysis:', error);
      return this.getFallbackAnalysis(context);
    }
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    return await this.mistralService.generateEmbedding(query);
  }

  private async generateContextEmbedding(context: ConversationContext): Promise<number[]> {
    // Create a comprehensive context string
    const contextString = this.buildContextString(context);
    return await this.mistralService.generateEmbedding(contextString);
  }

  private buildContextString(context: ConversationContext): string {
    const parts = [];
    
    // Add previous queries
    if (context.previousQueries.length > 0) {
      parts.push(`Previous queries: ${context.previousQueries.join('; ')}`);
    }
    
    // Add previous results
    if (context.previousResults.length > 0) {
      const resultTitles = context.previousResults.map(r => r.title).join(', ');
      parts.push(`Previous results: ${resultTitles}`);
    }
    
    // Add conversation history
    if (context.conversationHistory.length > 0) {
      const historyString = context.conversationHistory
        .slice(-3) // Last 3 turns
        .map(turn => `Q: ${turn.query} | Results: ${turn.results.map(r => r.title).join(', ')}`)
        .join(' | ');
      parts.push(`Recent conversation: ${historyString}`);
    }
    
    // Add user profile context
    if (context.userProfile) {
      const profileParts = [];
      if (context.userProfile.location) profileParts.push(`Location: ${context.userProfile.location}`);
      if (context.userProfile.preferences?.length) profileParts.push(`Preferences: ${context.userProfile.preferences.join(', ')}`);
      if (context.userProfile.language) profileParts.push(`Language: ${context.userProfile.language}`);
      if (profileParts.length > 0) {
        parts.push(`User context: ${profileParts.join('; ')}`);
      }
    }
    
    return parts.join('. ');
  }

  private calculateSemanticSimilarity(queryEmbedding: number[], contextEmbedding: number[]): number {
    if (queryEmbedding.length !== contextEmbedding.length) {
      return 0;
    }
    
    // Calculate cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < queryEmbedding.length; i++) {
      const queryVal = queryEmbedding[i] || 0;
      const contextVal = contextEmbedding[i] || 0;
      dotProduct += queryVal * contextVal;
      normA += queryVal * queryVal;
      normB += contextVal * contextVal;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async analyzeConversationFlow(context: ConversationContext): Promise<ConversationFlow> {
    const query = context.query.toLowerCase();
    const previousQuery = context.previousQueries[context.previousQueries.length - 1]?.toLowerCase() || '';
    
    // Analyze conversation patterns
    if (this.isNewTopic(query, previousQuery)) {
      return {
        type: 'new_topic',
        confidence: 0.8,
        reasoning: 'Query appears to introduce a new topic'
      };
    }
    
    if (this.isContinuation(query, previousQuery)) {
      return {
        type: 'continuation',
        confidence: 0.9,
        reasoning: 'Query continues the previous topic'
      };
    }
    
    if (this.isClarification(query)) {
      return {
        type: 'clarification',
        confidence: 0.85,
        reasoning: 'Query seeks clarification'
      };
    }
    
    return {
      type: 'refinement',
      confidence: 0.7,
      reasoning: 'Query refines or narrows the search'
    };
  }

  private isNewTopic(query: string, previousQuery: string): boolean {
    const newTopicIndicators = ['new', 'different', 'another', 'find', 'search', 'show me'];
    return newTopicIndicators.some(indicator => query.includes(indicator));
  }

  private isContinuation(query: string, previousQuery: string): boolean {
    const continuationIndicators = ['also', 'and', 'plus', 'additionally', 'more'];
    return continuationIndicators.some(indicator => query.includes(indicator));
  }

  private isClarification(query: string): boolean {
    const clarificationIndicators = ['what', 'which', 'how', 'where', 'when', 'why'];
    return clarificationIndicators.some(indicator => query.includes(indicator));
  }

  private async resolveEntityReferences(context: ConversationContext): Promise<EntityReference[]> {
    const entities: EntityReference[] = [];
    const query = context.query.toLowerCase();
    
    // Resolve positional references
    if (query.includes('first') || query.includes('1st') || query.includes('1')) {
      if (context.previousResults[0]) {
        entities.push({
          type: 'POI',
          entity: context.previousResults[0].title,
          confidence: 0.9,
          source: 'explicit'
        });
      }
    }
    
    if (query.includes('second') || query.includes('2nd') || query.includes('2')) {
      if (context.previousResults[1]) {
        entities.push({
          type: 'POI',
          entity: context.previousResults[1].title,
          confidence: 0.9,
          source: 'explicit'
        });
      }
    }
    
    if (query.includes('last')) {
      const lastResult = context.previousResults[context.previousResults.length - 1];
      if (lastResult) {
        entities.push({
          type: 'POI',
          entity: lastResult.title,
          confidence: 0.9,
          source: 'explicit'
        });
      }
    }
    
    // Resolve category references
    if (query.includes('restaurant')) {
      const restaurant = context.previousResults.find(r => 
        r.category?.toLowerCase().includes('restaurant')
      );
      if (restaurant) {
        entities.push({
          type: 'POI',
          entity: restaurant.title,
          confidence: 0.8,
          source: 'implicit'
        });
      }
    }
    
    // Resolve pronoun references
    if (query.includes('that') || query.includes('this') || query.includes('it')) {
      const mostRecent = context.previousResults[0];
      if (mostRecent) {
        entities.push({
          type: 'POI',
          entity: mostRecent.title,
          confidence: 0.7,
          source: 'inferred'
        });
      }
    }
    
    return entities;
  }

  private async detectImplicitReferences(context: ConversationContext): Promise<ImplicitReference[]> {
    const references: ImplicitReference[] = [];
    const query = context.query.toLowerCase();
    
    // Detect temporal references
    if (query.includes('today') || query.includes('now')) {
      references.push({
        type: 'time',
        value: 'today',
        confidence: 0.9
      });
    }
    
    if (query.includes('tomorrow')) {
      references.push({
        type: 'time',
        value: 'tomorrow',
        confidence: 0.9
      });
    }
    
    // Detect location references
    if (query.includes('here') || query.includes('nearby')) {
      if (context.userProfile?.location) {
        references.push({
          type: 'location',
          value: context.userProfile.location,
          confidence: 0.8
        });
      }
    }
    
    return references;
  }

  private async determineIntent(
    context: ConversationContext,
    targetEntities: EntityReference[],
    implicitReferences: ImplicitReference[]
  ): Promise<Intent> {
    const query = context.query.toLowerCase();
    
    // Time-related intent
    if (query.includes('when') || query.includes('time') || query.includes('open') || query.includes('closed')) {
      return 'time';
    }
    
    // Location-related intent
    if (query.includes('where') || query.includes('address') || query.includes('location')) {
      return 'location';
    }
    
    // Contact-related intent
    if (query.includes('phone') || query.includes('contact') || query.includes('call')) {
      return 'contact';
    }
    
    // Details-related intent
    if (query.includes('what') || query.includes('tell me') || query.includes('about')) {
      return 'details';
    }
    
    // Booking-related intent
    if (query.includes('book') || query.includes('reserve') || query.includes('table')) {
      return 'booking';
    }
    
    // Comparison-related intent
    if (query.includes('compare') || query.includes('better') || query.includes('vs')) {
      return 'comparison';
    }
    
    // New search intent
    if (query.includes('find') || query.includes('search') || query.includes('show me')) {
      return 'new_search';
    }
    
    // Default to clarification if asking questions
    if (query.includes('?') || query.includes('what') || query.includes('how') || query.includes('which')) {
      return 'clarification';
    }
    
    return 'details';
  }

  private async generateSuggestedActions(
    context: ConversationContext,
    intent: Intent,
    targetEntities: EntityReference[]
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = [];
    
    switch (intent) {
      case 'time':
        actions.push({
          action: 'show_hours',
          priority: 1,
          reasoning: 'User is asking about opening times'
        });
        break;
      case 'location':
        actions.push({
          action: 'show_location',
          priority: 1,
          reasoning: 'User is asking about location/address'
        });
        break;
      case 'contact':
        actions.push({
          action: 'show_contact',
          priority: 1,
          reasoning: 'User is asking for contact information'
        });
        break;
      case 'details':
        actions.push({
          action: 'show_details',
          priority: 1,
          reasoning: 'User wants more information'
        });
        break;
      case 'booking':
        actions.push({
          action: 'show_booking',
          priority: 1,
          reasoning: 'User wants to make a booking'
        });
        break;
    }
    
    // Add contextual actions based on target entities
    if (targetEntities.length > 0) {
      actions.push({
        action: 'highlight_entity',
        priority: 2,
        reasoning: 'Highlight the specific entity being referenced'
      });
    }
    
    return actions;
  }

  private determineFollowUpStatus(
    semanticSimilarity: number,
    conversationFlow: ConversationFlow,
    targetEntities: EntityReference[],
    context: ConversationContext
  ): boolean {
    // High semantic similarity suggests follow-up
    if (semanticSimilarity > 0.7) {
      return true;
    }
    
    // Conversation flow analysis
    if (conversationFlow.type === 'continuation' || conversationFlow.type === 'clarification') {
      return true;
    }
    
    // Entity references suggest follow-up
    if (targetEntities.length > 0) {
      return true;
    }
    
    // Previous results available and query seems related
    if (context.previousResults.length > 0 && semanticSimilarity > 0.5) {
      return true;
    }
    
    return false;
  }

  private calculateOverallConfidence(
    semanticSimilarity: number,
    conversationFlow: ConversationFlow,
    targetEntities: EntityReference[]
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on semantic similarity
    confidence += semanticSimilarity * 0.3;
    
    // Boost confidence based on conversation flow
    confidence += conversationFlow.confidence * 0.2;
    
    // Boost confidence if we have target entities
    if (targetEntities.length > 0) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private getFallbackAnalysis(context: ConversationContext): SemanticAnalysis {
    return {
      isFollowUp: false,
      confidence: 0.5,
      intent: 'new_search',
      targetEntities: [],
      conversationFlow: {
        type: 'new_topic',
        confidence: 0.5,
        reasoning: 'Fallback analysis'
      },
      implicitReferences: [],
      suggestedActions: []
    };
  }
}
