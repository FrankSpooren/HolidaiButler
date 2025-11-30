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

import type { Ticket } from "./data-contracts";
import type { RequestParams } from "./http-client";
import { HttpClient } from "./http-client";

export class Tickets<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Retrieve all tickets for a specific user
   *
   * @tags Tickets
   * @name GetUserTickets
   * @summary Get user tickets
   * @request GET:/tickets/user/{userId}
   * @secure
   */
  getUserTickets = (
    userId: number,
    query?: {
      status?: "active" | "used" | "expired" | "cancelled";
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: Ticket[];
        count?: number;
      },
      any
    >({
      path: `/tickets/user/${userId}`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
}
