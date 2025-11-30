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
import { HttpClient } from "./http-client";

export class Health<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Returns service health status and uptime information
   *
   * @tags Health
   * @name HealthCheck
   * @summary Health check endpoint
   * @request GET:/health
   */
  healthCheck = (params: RequestParams = {}) =>
    this.request<
      {
        /** @example "healthy" */
        status?: string;
        /** @format date-time */
        timestamp?: string;
        /** Service uptime in seconds */
        uptime?: number;
      },
      any
    >({
      path: `/health`,
      method: "GET",
      format: "json",
      ...params,
    });
}
