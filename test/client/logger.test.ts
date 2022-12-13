// import {
//   $mockEndpoint,
//   patchXmlHttpRequest,
// } from "@krakenjs/sync-browser-mocks/dist/sync-browser-mocks";
import { ZalgoPromise } from "@krakenjs/zalgo-promise";
import { describe, it, beforeEach } from "vitest";
import { setupWorker, graphql, rest } from "msw";

import { getLogger, insertMockSDKScript } from "../../src";

describe.skip("logger tests", () => {
  // beforeEach(() => {
  //   patchXmlHttpRequest();
  // });
  // const mockLogEndpoint = () => setupWorker(
  //   rest.post(`${window.location.protocol}//${window.location.host}/xoplatform/logger/api/logger`, (req, res, ctx) => {
  //     return res(ctx.status(200), ctx.json(data))
  //   }),
  // )
  it("should log and flush with all expected keys", () => {
    insertMockSDKScript({
      query: {
        "client-id": "foobarbaz",
        "merchant-id": "hello123",
      },
      attributes: {
        "data-partner-attribution-id": "myattributionid",
        "data-sdk-integration-source": "spbf",
      },
    });
    const logger = getLogger();
    let logData: { events: any[]; tracking: any[] };
    const logEndpoint = $mockEndpoint.register({
      method: "POST",
      uri: `${window.location.protocol}//${window.location.host}/xoplatform/logger/api/logger`,
      handler: (req: { data: { events: any[]; tracking: any[] } }) => {
        logData = req.data;
        return {};
      },
    });

    //  mockLogEndpoint();

    (<any>window.navigator).sendBeacon = (url: any, data: string) => {
      logData = JSON.parse(data);
    };

    // @ts-ignore
    logger.info("foo", { bar: "baz" });
    // @ts-ignore
    logger.track({ hello: "world" });
    // logEndpoint.expectCalls();
    logEndpoint();
    // mockLogEndpoint();
    return logger.flush().then(() => {
      if (!logData) {
        throw new Error(`Expected log data to be populated`);
      }

      const event = logData.events.find(
        (e: { event: string }) => e.event === "foo"
      );

      if (!event) {
        throw new Error(`Expected to find foo event`);
      }

      const expectedPayload = {
        referer: window.location.host,
        env: "test",
        bar: "baz",
      };

      for (const key of Object.keys(expectedPayload)) {
        if (
          event.payload[key] !==
          expectedPayload[key as keyof typeof expectedPayload]
        ) {
          throw new Error(
            `Expected logger payload value ${key} to be ${
              expectedPayload[key as keyof typeof expectedPayload]
            } - got ${event.payload[key]}`
          );
        }
      }

      const expectedTracking = {
        feed_name: "payments_sdk",
        serverside_data_source: "checkout",
        client_id: "foobarbaz",
        seller_id: "hello123",
        page_session_id: /^[a-zA-Z0-9_-]+$/,
        referer_url: window.location.host,
        locale: "en_US",
        integration_identifier: "foobarbaz",
        bn_code: "myattributionid",
        sdk_name: "payments_sdk",
        sdk_version: "1.0.45",
        user_agent: window.navigator.userAgent,
        user_action: "commit",
        context_correlation_id: "abc123",
        sdk_integration_source: "spbf",
      };
      const tracking = logData.tracking.find((e) => e.hello === "world");

      if (!tracking) {
        throw new Error(`Expected to find hello=world event`);
      }

      for (const key of Object.keys(expectedTracking)) {
        if (!tracking[key]) {
          throw new Error(`Expected logger tracking value ${key} to be passed`);
        } else if (
          expectedTracking[key as keyof typeof expectedTracking] instanceof
            RegExp &&
          !tracking[key].match(
            expectedTracking[key as keyof typeof expectedTracking]
          )
        ) {
          throw new Error(
            `Expected logger tracking value ${key} to be ${expectedTracking[
              key as keyof typeof expectedTracking
            ].toString()} - got ${tracking[key]}`
          );
        } else if (
          typeof expectedTracking[key as keyof typeof expectedTracking] ===
            "string" &&
          tracking[key] !==
            expectedTracking[key as keyof typeof expectedTracking]
        ) {
          throw new Error(
            `Expected logger tracking value ${key} to be ${
              expectedTracking[key as keyof typeof expectedTracking]
            } - got ${tracking[key]}`
          );
        }
      }
    });
  });
  it("should auto-log on any unhandled errors", () => {
    const logger = getLogger();
    let logData: { events: any[]; tracking: any[] };
    const logEndpoint = $mockEndpoint.register({
      method: "POST",
      uri: `${window.location.protocol}//${window.location.host}/xoplatform/logger/api/logger`,
      handler: (req: { data: { events: any[]; tracking: any[] } }) => {
        logData = req.data;
        return {};
      },
    });

    (<any>window.navigator).sendBeacon = (url: any, data: string) => {
      logData = JSON.parse(data);
    };

    ZalgoPromise.try(() => {
      throw new Error(`meep`);
    });
    logEndpoint.expectCalls();
    return logger.flush().then(() => {
      if (!logData) {
        throw new Error(`Expected log data to be populated`);
      }

      const event = logData.events.find((e) => e.event === "unhandled_error");

      if (!event) {
        throw new Error(`Expected to find unhandled_error event`);
      }

      const expectedPayload = {
        err: /meep/,
      };

      for (const key of Object.keys(expectedPayload)) {
        if (!event.payload[key]) {
          throw new Error(`Expected logger tracking value ${key} to be passed`);
        } else if (
          expectedPayload[key as keyof typeof expectedPayload] instanceof
            RegExp &&
          !event.payload[key].match(
            expectedPayload[key as keyof typeof expectedPayload]
          )
        ) {
          throw new Error(
            `Expected logger tracking value ${key} to be ${expectedPayload[
              key as keyof typeof expectedPayload
            ].toString()} - got ${event.payload[key]}`
          );
        } else if (
          typeof expectedPayload[key as keyof typeof expectedPayload] ===
            "string" &&
          event.payload[key] !==
            expectedPayload[key as keyof typeof expectedPayload]
        ) {
          throw new Error(
            `Expected logger tracking value ${key} to be ${expectedPayload[
              key as keyof typeof expectedPayload
            ].toString()} - got ${event.payload[key]}`
          );
        }
      }

      const expectedTracking = {
        ext_error_code: "payments_sdk_error",
        ext_error_desc: /meep/,
      };
      const tracking = logData.tracking.find(
        (e) => e.ext_error_code === "payments_sdk_error"
      );

      if (!tracking) {
        throw new Error(
          `Expected to find ext_error_code=payments_sdk_error event`
        );
      }

      for (const key of Object.keys(expectedTracking)) {
        if (!tracking[key]) {
          throw new Error(`Expected logger tracking value ${key} to be passed`);
        } else if (
          expectedTracking[key as keyof typeof expectedTracking] instanceof
            RegExp &&
          !tracking[key].match(
            expectedTracking[key as keyof typeof expectedTracking]
          )
        ) {
          throw new Error(
            `Expected logger tracking value ${key} to be ${expectedTracking[
              key as keyof typeof expectedTracking
            ].toString()} - got ${tracking[key]}`
          );
        } else if (
          typeof expectedTracking[key as keyof typeof expectedTracking] ===
            "string" &&
          tracking[key] !==
            expectedTracking[key as keyof typeof expectedTracking]
        ) {
          throw new Error(
            `Expected logger tracking value ${key} to be ${
              expectedTracking[key as keyof typeof expectedTracking]
            } - got ${tracking[key]}`
          );
        }
      }
    });
  });
});
