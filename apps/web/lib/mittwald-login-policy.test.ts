import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";
import { isMittwaldLoginEnabledFor } from "./mittwald-login-policy";

const oldEnabled = process.env.ENABLE_MITTWALD_MAILBOX_LOGIN;
const oldAllow = process.env.MITTWALD_ALLOWED_MAILBOXES;

afterEach(() => {
  if (oldEnabled === undefined) delete process.env.ENABLE_MITTWALD_MAILBOX_LOGIN;
  else process.env.ENABLE_MITTWALD_MAILBOX_LOGIN = oldEnabled;
  if (oldAllow === undefined) delete process.env.MITTWALD_ALLOWED_MAILBOXES;
  else process.env.MITTWALD_ALLOWED_MAILBOXES = oldAllow;
});

describe("16:NEUN IMAP login policy", () => {
  it("defaults to disabled without an explicit flag", () => {
    delete process.env.ENABLE_MITTWALD_MAILBOX_LOGIN;
    process.env.MITTWALD_ALLOWED_MAILBOXES = "test@example.de";
    assert.equal(isMittwaldLoginEnabledFor("test@example.de"), false);
  });

  it("fails closed without an allowlist", () => {
    process.env.ENABLE_MITTWALD_MAILBOX_LOGIN = "true";
    delete process.env.MITTWALD_ALLOWED_MAILBOXES;
    assert.equal(isMittwaldLoginEnabledFor("test@example.de"), false);
  });

  it("only accepts explicit test addresses ignoring case", () => {
    process.env.ENABLE_MITTWALD_MAILBOX_LOGIN = "true";
    process.env.MITTWALD_ALLOWED_MAILBOXES =
      "test@example.de, another@example.de";
    assert.equal(isMittwaldLoginEnabledFor("TEST@example.de"), true);
    assert.equal(isMittwaldLoginEnabledFor("unknown@example.de"), false);
    assert.equal(isMittwaldLoginEnabledFor("bad@example.de.evil.net"), false);
  });
});
