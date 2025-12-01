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
import { ContentType, HttpClient } from "./http-client";

export class TicketId<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Retrieve detailed information about a specific ticket
   *
   * @tags Tickets
   * @name GetTicket
   * @summary Get ticket by ID
   * @request GET:/{ticketId}
   * @secure
   */
  getTicket = (ticketId: number, params: RequestParams = {}) =>
    this.request<
      {
        success?: boolean;
        data?: Ticket;
      },
      any
    >({
      path: `/${ticketId}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Resend the ticket to the user's email address
   *
   * @tags Tickets
   * @name ResendTicket
   * @summary Resend ticket email
   * @request POST:/{ticketId}/resend
   * @secure
   */
  resendTicket = (ticketId: number, params: RequestParams = {}) =>
    this.request<
      {
        success?: boolean;
        data?: {
          sent?: boolean;
          email?: string;
        };
      },
      any
    >({
      path: `/${ticketId}/resend`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Generate Apple Wallet or Google Pay pass for the ticket
   *
   * @tags Tickets
   * @name AddToWallet
   * @summary Add ticket to mobile wallet
   * @request POST:/{ticketId}/wallet
   * @secure
   */
  addToWallet = (
    ticketId: number,
    data: {
      /** @example "apple" */
      walletType: "apple" | "google";
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: {
          /** @format uri */
          walletPassUrl?: string;
        };
      },
      any
    >({
      path: `/${ticketId}/wallet`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
