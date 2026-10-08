import { describe, expect, it } from "vitest";
import { hasAdminRole, ownsOrder } from "@/lib/authorization";
import { browserProcessingSchema, loginSchema, orderSchema, registerSchema } from "@/lib/validation";

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

  it("creates an order from an active package without sending the video to the server", () => {
    const result = orderSchema.safeParse({ package_id: "five-clips", youtube_url: "https://youtu.be/abcdefghijk" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ package_id: "five-clips" });
  });

  it("does not accept client-owned user or payment fields as part of the parsed order", () => {
    const result = orderSchema.safeParse({
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

describe("browser processing validation", () => {
  it("accepts progress updates from the browser", () => {
    expect(browserProcessingSchema.safeParse({ status: "PROCESSING", progress: 40 }).success).toBe(true);
  });

  it("accepts completed and failed states with bounded error messages", () => {
    expect(browserProcessingSchema.safeParse({ status: "COMPLETED", progress: 100 }).success).toBe(true);
    expect(browserProcessingSchema.safeParse({ status: "FAILED", progress: 0, error_message: "Video rusak" }).success).toBe(true);
    expect(browserProcessingSchema.safeParse({ status: "FAILED", progress: 0, error_message: "x".repeat(401) }).success).toBe(false);
  });

  it("rejects unsupported states and invalid progress", () => {
    expect(browserProcessingSchema.safeParse({ status: "PAID", progress: 100 }).success).toBe(false);
    expect(browserProcessingSchema.safeParse({ status: "PROCESSING", progress: 101 }).success).toBe(false);
  });
});
