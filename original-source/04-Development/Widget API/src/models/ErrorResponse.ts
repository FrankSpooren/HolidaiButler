export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    suggestions?: string[];
  };
  context?: {
    sessionId?: string;
    preserved?: boolean;
  };
}
