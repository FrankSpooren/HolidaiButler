/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import type {
  BookingDetails,
  BookingResponse,
  CreateBookingRequest,
  ErrorResponse,
  RefundInfo,
  Ticket,
} from "./data-contracts";
import type { RequestParams } from "./http-client";
import { ContentType, HttpClient } from "./http-client";

export class Bookings<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Create a new ticket booking with automatic capacity reservation. Capacity is held for 15 minutes pending payment completion.
   *
   * @tags Bookings
   * @name CreateBooking
   * @summary Create new booking
   * @request POST:/bookings
   * @secure
   */
  createBooking = (data: CreateBookingRequest, params: RequestParams = {}) =>
    this.request<
      {
        success?: boolean;
        data?: BookingResponse;
      },
      ErrorResponse
    >({
      path: `/bookings`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve detailed information about a specific booking
   *
   * @tags Bookings
   * @name GetBooking
   * @summary Get booking by ID
   * @request GET:/bookings/{bookingId}
   * @secure
   */
  getBooking = (bookingId: number, params: RequestParams = {}) =>
    this.request<
      {
        success?: boolean;
        data?: BookingDetails;
      },
      ErrorResponse
    >({
      path: `/bookings/${bookingId}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Confirm a booking after successful payment. This generates digital tickets with QR codes and sends them to the user.
   *
   * @tags Bookings
   * @name ConfirmBooking
   * @summary Confirm booking after payment
   * @request POST:/bookings/{bookingId}/confirm
   * @secure
   */
  confirmBooking = (
    bookingId: number,
    data: {
      /** @example "txn_abc123xyz" */
      paymentTransactionId: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: {
          booking?: BookingDetails;
          tickets?: Ticket[];
        };
      },
      ErrorResponse
    >({
      path: `/bookings/${bookingId}/confirm`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Cancel a booking and initiate refund if applicable
   *
   * @tags Bookings
   * @name CancelBooking
   * @summary Cancel booking
   * @request POST:/bookings/{bookingId}/cancel
   * @secure
   */
  cancelBooking = (
    bookingId: number,
    data: {
      /** @example "Changed plans" */
      reason: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: {
          booking?: BookingDetails;
          refund?: RefundInfo;
        };
      },
      any
    >({
      path: `/bookings/${bookingId}/cancel`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve all bookings for a specific user with optional filtering
   *
   * @tags Bookings
   * @name GetUserBookings
   * @summary Get user bookings
   * @request GET:/bookings/user/{userId}
   * @secure
   */
  getUserBookings = (
    userId: number,
    query?: {
      status?: "pending" | "confirmed" | "cancelled" | "completed";
      /** @format date */
      from?: string;
      /** @format date */
      to?: string;
      /** @default 50 */
      limit?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: BookingDetails[];
        count?: number;
      },
      any
    >({
      path: `/bookings/user/${userId}`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
}
