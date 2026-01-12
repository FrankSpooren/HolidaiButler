import { IntentRecognitionResult } from '../services/intentRecognitionService';

export interface QueryInterpretation {
  detectedType: 'general' | 'specific' | 'contextual';
  extractedEntities: string[];
  confidence: number;
  targetPOI?: string;
  positionalReference?: {
    type: 'numeric' | 'ordinal' | 'semantic';
    value: string;
    resolvedPOI: string;
  };
  intentRecognition?: IntentRecognitionResult;
}
