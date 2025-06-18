import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { transformVSCodeUrl } from "../vscode-url-helper";

describe("transformVSCodeUrl", () => {
  const originalWindowLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        hostname: "example.com",
        protocol: "https:",
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore window.location
    Object.defineProperty(window, "location", {
      value: originalWindowLocation,
      writable: true,
    });
  });

  it("should return null if input is null", () => {
    expect(transformVSCodeUrl(null)).toBeNull();
  });

  it("should replace localhost and map to proxied path", () => {
    const input = "http://localhost:8080/?tkn=abc123&folder=/workspace";
    const expected = "https://example.com/vscode/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(expected);
  });

  it("should replace 127.0.0.1 and map to proxied path", () => {
    const input = "http://127.0.0.1:8080/?tkn=abc123&folder=/workspace";
    const expected = "https://example.com/vscode/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(expected);
  });

  it("should replace 0.0.0.0 and map to proxied path", () => {
    const input = "http://0.0.0.0:8080/?tkn=abc123&folder=/workspace";
    const expected = "https://example.com/vscode/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(expected);
  });

  it("should replace private IP and map to proxied path", () => {
    const input = "http://172.17.0.2:8080/?tkn=abc123&folder=/workspace";
    const expected = "https://example.com/vscode/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(expected);
  });

  it("should rewrite when hostname matches current host", () => {
    const input = "http://example.com:8080/?tkn=abc123&folder=/workspace";
    const expected = "https://example.com/vscode/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(expected);
  });

  it("should not modify URL if hostname is not a local alias", () => {
    const input = "http://otherhost:8080/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(input);
  });

  it("should not modify URL if current hostname is also localhost", () => {
    // Change the mocked hostname to localhost
    Object.defineProperty(window, "location", {
      value: {
        hostname: "localhost",
        protocol: "http:",
      },
      writable: true,
    });

    const input = "http://localhost:8080/?tkn=abc123&folder=/workspace";

    expect(transformVSCodeUrl(input)).toBe(input);
  });

  it("should handle invalid URLs gracefully", () => {
    const input = "not-a-valid-url";

    expect(transformVSCodeUrl(input)).toBe(input);
  });
});
