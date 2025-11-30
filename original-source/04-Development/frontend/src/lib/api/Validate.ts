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

export class Validate<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Validate a ticket QR code at POI entrance (for staff use)
   *
   * @tags Tickets
   * @name ValidateTicket
   * @summary Validate ticket QR code
   * @request POST:/validate
   * @secure
   */
  validateTicket = (
    data: {
      /** Encrypted QR code payload */
      qrCodeData: string;
      poiId: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      {
        success?: boolean;
        data?: {
          valid?: boolean;
          ticket?: Ticket;
          validationDetails?: {
            poiMatch?: boolean;
            dateValid?: boolean;
            alreadyUsed?: boolean;
          };
        };
      },
      any
    >({
      path: `/validate`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
