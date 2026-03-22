import { test, expect } from "@playwright/test";
import {
  signUpAndGetApiContext,
  apiGet,
  type ApiTestContext,
} from "./helpers/api-auth";

test.describe("Billing", () => {
  let ctx: ApiTestContext;

  test.beforeEach(async ({ page, request }) => {
    ctx = await signUpAndGetApiContext(page, request);
  });

  test("get subscription returns free plan for new org", async () => {
    const { status, body } = await apiGet(
      ctx,
      `/orgs/${ctx.orgId}/billing/subscription`
    );

    expect(status).toBe(200);
    expect(body.plan).toBe("free");
    expect(body.status).toBe("active");
  });

  test("connect status returns false for new org", async () => {
    const { status, body } = await apiGet(
      ctx,
      `/orgs/${ctx.orgId}/billing/connect-status`
    );

    expect(status).toBe(200);
    expect(body.hasConnectAccount).toBe(false);
    expect(body.onboardingComplete).toBe(false);
  });

  test("revenue returns empty for new org", async () => {
    const { status, body } = await apiGet(
      ctx,
      `/orgs/${ctx.orgId}/billing/revenue`
    );

    expect(status).toBe(200);
    expect(body.grossRevenue).toBe(0);
    expect(body.eventCount).toBe(0);
    expect(body.currency).toBe("usd");
  });
});
