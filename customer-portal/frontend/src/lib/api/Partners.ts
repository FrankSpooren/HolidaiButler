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

import type { RequestParams } from "./http-client";
import { ContentType, HttpClient } from "./http-client";

export class Partners<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Synchronize inventory from external partner systems
   *
   * @tags Partners
   * @name SyncPartnerInventory
   * @summary Sync partner inventory
   * @request POST:/partners/{partnerId}/sync-inventory
   * @secure
   */
  syncPartnerInventory = (
    partnerId: string,
    data: {
      /** @format date */
      date: string;
      inventory: {
        totalCapacity?: number;
        availableCapacity?: number;
      };
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: {
          synced?: boolean;
          recordsUpdated?: number;
        };
      },
      any
    >({
      path: `/partners/${partnerId}/sync-inventory`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Receive webhooks from partner systems for booking updates
   *
   * @tags Partners
   * @name PartnerWebhook
   * @summary Partner webhook receiver
   * @request POST:/partners/{partnerId}/webhook
   * @secure
   */
  partnerWebhook = (
    partnerId: string,
    data: {
      /** @example "booking.confirmed" */
      event?: string;
      bookingId?: string;
      /** @format date-time */
      timestamp?: string;
      data?: object;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: {
          received?: boolean;
          /** @format date-time */
          processedAt?: string;
        };
      },
      any
    >({
      path: `/partners/${partnerId}/webhook`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
