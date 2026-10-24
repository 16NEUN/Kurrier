import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  isValidMailboxAddress,
  verifyMittwaldImapCredentials,
} from "./mittwald-imap-auth";

describe("16:NEUN Mittwald IMAP authentication foundation", () => {
  it("accepts syntactically plausible mailbox addresses", () => {
    assert.equal(isValidMailboxAddress("person@example.de"), true);
    assert.equal(isValidMailboxAddress("name+alias@example.de"), true);
  });

  it("rejects malformed identities and header injection", () => {
    for (const value of [
      "", "person", "person@", "@example.de", "one@@example.de",
      " a@example.de", "a@example.de\r\nBcc: other@example.de",
    ]) {
      assert.equal(isValidMailboxAddress(value), false);
    }
  });

  it("fails closed before network access on invalid credentials", async () => {
    assert.equal(await verifyMittwaldImapCredentials("not-an-email", "secret"), false);
    assert.equal(await verifyMittwaldImapCredentials("test@example.de", ""), false);
    assert.equal(
      await verifyMittwaldImapCredentials("test@example.de", "x".repeat(1025)),
      false,
    );
  });
});
