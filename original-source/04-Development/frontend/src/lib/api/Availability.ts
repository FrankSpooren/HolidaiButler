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
  AvailabilityData,
  AvailabilityResponse,
  ErrorResponse,
} from "./data-contracts";
import type { RequestParams } from "./http-client";
import { ContentType, HttpClient } from "./http-client";

export class Availability<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Check if tickets are available for a specific POI, date, timeslot, and quantity
   *
   * @tags Availability
   * @name CheckAvailability
   * @summary Check availability for specific date/time
   * @request POST:/availability/check
   */
  checkAvailability = (
    data: {
      /**
       * Point of Interest ID
       * @example 123
       */
      poiId: number;
      /**
       * @format date
       * @example "2025-12-25"
       */
      date: string;
      /**
       * Optional time slot
       * @example "10:00-12:00"
       */
      timeslot?: string;
      /**
       * @min 1
       * @example 2
       */
      quantity: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<AvailabilityResponse, ErrorResponse>({
      path: `/availability/check`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve availability information for a specific POI and date
   *
   * @tags Availability
   * @name GetAvailability
   * @summary Get availability for single date
   * @request GET:/availability/{poiId}
   */
  getAvailability = (
    poiId: number,
    query: {
      /**
       * @format date
       * @example "2025-12-25"
       */
      date: string;
      /** @example "10:00-12:00" */
      timeslot?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<AvailabilityData, ErrorResponse>({
      path: `/availability/${poiId}`,
      method: "GET",
      query: query,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve availability for a date range (useful for calendar views)
   *
   * @tags Availability
   * @name GetAvailabilityRange
   * @summary Get availability for date range
   * @request GET:/availability/{poiId}/range
   */
  getAvailabilityRange = (
    poiId: number,
    query: {
      /**
       * @format date
       * @example "2025-12-01"
       */
      from: string;
      /**
       * @format date
       * @example "2025-12-31"
       */
      to: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: AvailabilityData[];
      },
      any
    >({
      path: `/availability/${poiId}/range`,
      method: "GET",
      query: query,
      format: "json",
      ...params,
    });
}
