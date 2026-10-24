import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { shouldRouteToMittwaldLogin } from "./mittwald-login-routing";

describe("16:NEUN customer reauthentication routing", () => {
  it("routes legacy login to Mittwald on the public webmail hostname", () => {
    for (const path of ["/auth/login", "/de/auth/login", "/en/auth/login", "/de/auth/login/"]) {
      assert.equal(shouldRouteToMittwaldLogin({
        host: "mail.16neun.com", path, enabled: true,
      }), true);
    }
  });

  it("routes direct local staging HTTPS login even without a cookie", () => {
    assert.equal(shouldRouteToMittwaldLogin({
      host: "localhost:3443", path: "/de/auth/login", enabled: true,
    }), true);
  });

  it("does not intercept local admin on staging HTTP port", () => {
    assert.equal(shouldRouteToMittwaldLogin({
      host: "127.0.0.1:3011", path: "/de/auth/login", enabled: true,
    }), false);
  });

  it("does not intercept the Mittwald sign-in form itself", () => {
    assert.equal(shouldRouteToMittwaldLogin({
      host: "mail.16neun.com", path: "/de/auth/mail", enabled: true,
    }), false);
  });

  it("preserves private administration login without customer hint", () => {
    assert.equal(shouldRouteToMittwaldLogin({
      host: "admin.internal", path: "/de/auth/login", enabled: true,
    }), false);
  });

  it("routes a previously identified mailbox customer back to Mittwald", () => {
    assert.equal(shouldRouteToMittwaldLogin({
      host: "admin.internal", path: "/auth/login",
      enabled: true, mailboxLoginHint: "1",
    }), true);
  });

  it("stays disabled when the feature is off", () => {
    assert.equal(shouldRouteToMittwaldLogin({
      host: "mail.16neun.com", path: "/de/auth/login",
      enabled: false, mailboxLoginHint: "1",
    }), false);
  });
});
