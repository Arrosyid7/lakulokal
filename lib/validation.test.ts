import { describe, expect, it } from "vitest";
import { hasAdminRole, ownsOrder } from "@/lib/authorization";
import { loginSchema, orderSchema, registerSchema } from "@/lib/validation";

describe("registration validation", () => {
  it("accepts a valid account and normalizes email", () => {
    const result = registerSchema.safeParse({
      full_name: "Nadia Putri",
      email: "NADIA@example.com",
      password: "password-aman",
      confirm_password: "password-aman"
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("nadia@example.com");
  });

  it("rejects missing names, malformed email, and passwords shorter than eight characters", () => {
    expect(registerSchema.safeParse({
      full_name: " ",
      email: "not-an-email",
      password: "short",
      confirm_password: "short"
    }).success).toBe(false);
  });

  it("rejects mismatched password confirmation", () => {
    expect(registerSchema.safeParse({
      full_name: "Nadia Putri",
      email: "nadia@example.com",
      password: "password-aman",
      confirm_password: "password-berbeda"
    }).success).toBe(false);
  });
});

describe("login validation", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "secret" }).success).toBe(true);
  });

  it("rejects malformed email and empty password", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
  });
});

describe("order authorization and validation", () => {
  it("permits only the authenticated owner", () => {
    expect(ownsOrder("user-a", "user-a")).toBe(true);
    expect(ownsOrder("user-b", "user-a")).toBe(false);
  });

  it("permits admin UI access only for an ADMIN role", () => {
    expect(hasAdminRole("ADMIN")).toBe(true);
    expect(hasAdminRole("USER")).toBe(false);
    expect(hasAdminRole(undefined)).toBe(false);
  });

  it("accepts valid YouTube HTTPS URL and package identifier", () => {
    expect(orderSchema.safeParse({
      youtube_url: "https://youtu.be/abcdefghijk",
      package_id: "five-clips"
    }).success).toBe(true);
  });

  it("rejects non-YouTube and non-HTTPS URLs", () => {
    expect(orderSchema.safeParse({ youtube_url: "https://example.com/watch?v=1", package_id: "five-clips" }).success).toBe(false);
    expect(orderSchema.safeParse({ youtube_url: "http://youtube.com/watch?v=1", package_id: "five-clips" }).success).toBe(false);
  });

  it("does not accept client-owned user or payment fields as part of the parsed order", () => {
    const result = orderSchema.safeParse({
      youtube_url: "https://www.youtube.com/watch?v=abcdefghijk",
      package_id: "five-clips",
      user_id: "attacker",
      amount: 1,
      payment_status: "PAID"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("user_id");
      expect(result.data).not.toHaveProperty("amount");
      expect(result.data).not.toHaveProperty("payment_status");
    }
  });
});
