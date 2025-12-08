/* eslint-disable */
/* tslint:disable */
/**
 * Payments API Client
 *
 * Client for the Payment Module with Adyen integration
 * Backend: payment-module (port 3005)
 * Gateway: platform-core (port 3001) -> /api/v1/payments
 */

import type {
  CreatePaymentSessionRequest,
  PaymentSessionResponse,
  PaymentStatusResponse,
  ErrorResponse,
} from './data-contracts';
import type { RequestParams } from './http-client';
import { HttpClient, ContentType } from './http-client';

export class Payments<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Create an Adyen payment session for Drop-in checkout
   * @tags Payments
   * @name CreateSession
   * @summary Create payment session
   * @request POST:/payments
   */
  createSession = (data: CreatePaymentSessionRequest, params: RequestParams = {}) =>
    this.request<PaymentSessionResponse, ErrorResponse>({
      path: `/payments`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Get payment status by transaction ID
   * @tags Payments
   * @name GetStatus
   * @summary Get payment status
   * @request GET:/payments/{paymentId}
   */
  getStatus = (paymentId: string, params: RequestParams = {}) =>
    this.request<PaymentStatusResponse, ErrorResponse>({
      path: `/payments/${paymentId}`,
      method: 'GET',
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Get available payment methods for a country/currency
   * @tags Payments
   * @name GetPaymentMethods
   * @summary Get available payment methods
   * @request GET:/payments/payment-methods/available
   */
  getPaymentMethods = (
    query?: {
      countryCode?: string;
      currency?: string;
      amount?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<
      {
        success: boolean;
        data: {
          paymentMethods: Array<{
            type: string;
            name: string;
            brands?: string[];
          }>;
        };
      },
      ErrorResponse
    >({
      path: `/payments/payment-methods/available`,
      method: 'GET',
      query,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Create a refund for a payment
   * @tags Payments
   * @name CreateRefund
   * @summary Create refund
   * @request POST:/payments/{paymentId}/refunds
   */
  createRefund = (
    paymentId: string,
    data: { amount: number; reason?: string },
    params: RequestParams = {}
  ) =>
    this.request<
      {
        success: boolean;
        data: {
          refundId: string;
          status: 'pending' | 'completed' | 'failed';
          amount: number;
        };
      },
      ErrorResponse
    >({
      path: `/payments/${paymentId}/refunds`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Check payment module health
   * @tags Payments
   * @name HealthCheck
   * @summary Health check
   * @request GET:/payments/health
   */
  healthCheck = (params: RequestParams = {}) =>
    this.request<{ status: string; timestamp: string }, ErrorResponse>({
      path: `/payments/health`,
      method: 'GET',
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
}
