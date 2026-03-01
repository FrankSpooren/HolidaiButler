/**
 * Payment API Client (Fase III — Blok A)
 * Integration with Payment Engine via Platform Core (port 3001)
 * Adyen payment gateway - PCI-DSS SAQ-A compliant
 */

import { API_CONFIG } from '../config/apiConfig';

const { baseUrl, endpoints } = API_CONFIG.payment;

/** Adyen session data returned by backend — must match AdyenCheckout.tsx interface */
export interface AdyenSessionData {
  id: string;
  sessionData: string;
  clientKey: string;
  environment: 'test' | 'live';
  amount: { value: number; currency: string };
  transactionUuid: string;
  merchantAccount?: string;
}

export interface PaymentSessionRequest {
  amountCents: number;
  currency?: string;
  orderType: 'ticket' | 'reservation' | 'booking';
  orderId: number;
  returnUrl: string;
  userId?: number;
  poiId?: number;
  metadata?: Record<string, string>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  bookingId: string;
  paymentMethod?: string;
  returnUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  error?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
}

class PaymentAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    const destinationId = import.meta.env.VITE_DESTINATION_ID || 'calpe';
    return {
      'Content-Type': 'application/json',
      'X-Destination-ID': destinationId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Create Adyen payment session (Fase III)
   * Returns session data for AdyenCheckout Drop-in component.
   */
  async createPaymentSession(request: PaymentSessionRequest): Promise<{ success: boolean; data?: AdyenSessionData; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.session}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Payment session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable',
      };
    }
  }

  /**
   * Get transaction status by UUID (Fase III)
   */
  async getTransactionStatus(transactionUuid: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}/payments/${transactionUuid}/status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get transaction status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable',
      };
    }
  }

  /**
   * Initiate a payment checkout session
   */
  async createCheckout(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.checkout}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Payment checkout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable',
      };
    }
  }

  /**
   * Get payment status by ID
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.payments}/${paymentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get payment status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable',
      };
    }
  }

  /**
   * Request a refund
   */
  async requestRefund(request: RefundRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.refund}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Refund request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund service unavailable',
      };
    }
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(): Promise<{ success: boolean; payments?: any[]; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.payments}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get payment history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable',
      };
    }
  }
}

export const paymentApi = new PaymentAPI();
export default paymentApi;
