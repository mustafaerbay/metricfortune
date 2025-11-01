import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

describe("Password Hashing", () => {
  it("should hash password with bcrypt", async () => {
    const password = "Test123!@#";
    const hash = await bcrypt.hash(password, 10);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "Test123!@#";
    const wrongPassword = "WrongPassword123!";
    const hash = await bcrypt.hash(password, 10);

    const isValid = await bcrypt.compare(wrongPassword, hash);
    expect(isValid).toBe(false);
  });
});

describe("Email Verification Token Generation", () => {
  it("should generate unique tokens", () => {
    const crypto = require("crypto");

    const token1 = crypto.randomBytes(32).toString("hex");
    const token2 = crypto.randomBytes(32).toString("hex");

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64);
  });
});
