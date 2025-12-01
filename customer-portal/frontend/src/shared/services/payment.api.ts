/**
 * Payment API Client
 * Integration with Payment Module (port :3005)
 * Adyen payment gateway - PCI-DSS compliant
 */

import { API_CONFIG } from '../config/apiConfig';

const { baseUrl, endpoints } = API_CONFIG.payment;

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
  amount?: number; // Partial refund amount, full refund if not specified
  reason?: string;
}

class PaymentAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
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
