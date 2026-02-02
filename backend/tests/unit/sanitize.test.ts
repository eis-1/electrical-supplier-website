import {
  sanitizeObject,
  validateObjectSafety,
  sanitizeString,
  sanitizeEmail,
  sanitizeArray,
  stripHtmlTags,
  validateAllowedKeys,
} from "../../src/utils/sanitize";

describe("Input Sanitization Utilities", () => {
  describe("sanitizeObject", () => {
    it("should remove __proto__ from object", () => {
      const malicious = {
        name: "Product",
        __proto__: { isAdmin: true },
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized).toEqual({ name: "Product" });
      // __proto__ is skipped during iteration, verify it wasn't added
      expect(Object.keys(sanitized)).toEqual(["name"]);
    });

    it("should remove constructor from object", () => {
      const malicious = {
        name: "Product",
        constructor: { prototype: { isAdmin: true } },
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized).toEqual({ name: "Product" });
      // Verify constructor wasn't copied
      expect(Object.keys(sanitized)).toEqual(["name"]);
    });

    it("should remove prototype from object", () => {
      const malicious = {
        name: "Product",
        prototype: { isAdmin: true },
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized).toEqual({ name: "Product" });
      expect((sanitized as any).prototype).toBeUndefined();
    });

    it("should handle nested objects", () => {
      const malicious = {
        name: "Product",
        details: {
          description: "Test",
          __proto__: { isAdmin: true },
        },
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized).toEqual({
        name: "Product",
        details: {
          description: "Test",
        },
      });
    });

    it("should handle arrays", () => {
      const malicious = [
        { name: "Item1" },
        { name: "Item2", __proto__: { isAdmin: true } },
      ];

      const sanitized = sanitizeObject(malicious);

      expect(sanitized).toEqual([{ name: "Item1" }, { name: "Item2" }]);
    });

    it("should handle null and undefined", () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
    });

    it("should handle primitive types", () => {
      expect(sanitizeObject("test")).toBe("test");
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(true)).toBe(true);
    });

    it("should prevent deep nesting DoS attack", () => {
      // Create deeply nested object
      let deepObject: any = { value: "bottom" };
      for (let i = 0; i < 15; i++) {
        deepObject = { nested: deepObject };
      }

      expect(() => sanitizeObject(deepObject)).toThrow(
        "Object nesting too deep"
      );
    });

    it("should handle case-insensitive dangerous keys", () => {
      const malicious = {
        name: "Product",
        __PROTO__: { isAdmin: true },
        Constructor: { prototype: { isAdmin: true } },
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized).toEqual({ name: "Product" });
    });

    it("should remove explicitly set dangerous properties", () => {
      const malicious: any = {
        name: "Product",
        prototype: { isAdmin: true },
      };

      const sanitized = sanitizeObject(malicious);

      // prototype should be removed, only name remains
      expect(Object.keys(sanitized)).toEqual(["name"]);
      expect((sanitized as any).prototype).toBeUndefined();
    });
  });

  describe("validateObjectSafety", () => {
    it("should not detect __proto__ in object (it's inherited)", () => {
      // Note: __proto__ is not an own property, so it won't be detected
      // by our validation function. This is actually fine since
      // sanitizeObject removes it during processing.
      const obj = {
        name: "Product",
        __proto__: { isAdmin: true },
      };

      // This won't throw because __proto__ isn't enumerable
      expect(() => validateObjectSafety(obj)).not.toThrow();
    });

    it("should throw error for explicit constructor property", () => {
      const malicious = {
        name: "Product",
        // Explicitly setting constructor as own property
      };
      Object.defineProperty(malicious, "constructor", {
        value: { prototype: { isAdmin: true } },
        enumerable: true,
      });

      expect(() => validateObjectSafety(malicious)).toThrow(
        "Dangerous keys detected"
      );
    });

    it("should not throw for safe objects", () => {
      const safe = {
        name: "Product",
        price: 100,
        details: {
          description: "Safe object",
        },
      };

      expect(() => validateObjectSafety(safe)).not.toThrow();
    });

    it("should handle null and primitive types", () => {
      expect(() => validateObjectSafety(null)).not.toThrow();
      expect(() => validateObjectSafety(undefined)).not.toThrow();
      expect(() => validateObjectSafety("string")).not.toThrow();
      expect(() => validateObjectSafety(123)).not.toThrow();
    });
  });

  describe("sanitizeString", () => {
    it("should remove null bytes", () => {
      const input = "test\0value";
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe("testvalue");
    });

    it("should trim whitespace", () => {
      const input = "  test value  ";
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe("test value");
    });

    it("should handle non-string input", () => {
      expect(sanitizeString(123 as any)).toBe(123);
      expect(sanitizeString(null as any)).toBeNull();
    });
  });

  describe("sanitizeEmail", () => {
    it("should convert to lowercase", () => {
      const email = "Test@Example.COM";
      const sanitized = sanitizeEmail(email);
      expect(sanitized).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      const email = "  test@example.com  ";
      const sanitized = sanitizeEmail(email);
      expect(sanitized).toBe("test@example.com");
    });

    it("should handle non-string input", () => {
      expect(sanitizeEmail(123 as any)).toBe(123);
    });
  });

  describe("sanitizeArray", () => {
    it("should return empty array for non-array input", () => {
      expect(sanitizeArray("not an array")).toEqual([]);
      expect(sanitizeArray(null)).toEqual([]);
      expect(sanitizeArray(123)).toEqual([]);
    });

    it("should sanitize objects in array", () => {
      const input = [
        { name: "Item1" },
        { name: "Item2", __proto__: { isAdmin: true } },
      ];

      const sanitized = sanitizeArray(input);

      expect(sanitized).toEqual([{ name: "Item1" }, { name: "Item2" }]);
    });

    it("should throw error for arrays exceeding max length", () => {
      const longArray = new Array(101).fill("item");

      expect(() => sanitizeArray(longArray)).toThrow("Array too large");
    });

    it("should handle primitive values in array", () => {
      const input = [1, "two", true, null];
      const sanitized = sanitizeArray(input);
      expect(sanitized).toEqual([1, "two", true, null]);
    });
  });

  describe("stripHtmlTags", () => {
    it("should remove HTML tags", () => {
      const input = "<script>alert(1)</script>Hello<b>World</b>";
      const sanitized = stripHtmlTags(input);
      expect(sanitized).toBe("alert(1)HelloWorld");
    });

    it("should handle self-closing tags", () => {
      const input = "Test<br/>Value<img src='x'/>";
      const sanitized = stripHtmlTags(input);
      expect(sanitized).toBe("TestValue");
    });

    it("should handle non-string input", () => {
      expect(stripHtmlTags(123 as any)).toBe(123);
    });
  });

  describe("validateAllowedKeys", () => {
    it("should not throw for allowed keys", () => {
      const obj = { name: "Product", price: 100 };
      const allowedKeys = ["name", "price", "description"];

      expect(() => validateAllowedKeys(obj, allowedKeys)).not.toThrow();
    });

    it("should throw for unexpected keys", () => {
      const obj = { name: "Product", isAdmin: true };
      const allowedKeys = ["name", "price"];

      expect(() => validateAllowedKeys(obj, allowedKeys)).toThrow(
        "Unexpected keys in request: isAdmin"
      );
    });

    it("should list all unexpected keys", () => {
      const obj = { name: "Product", isAdmin: true, role: "admin" };
      const allowedKeys = ["name"];

      expect(() => validateAllowedKeys(obj, allowedKeys)).toThrow(
        "isAdmin, role"
      );
    });

    it("should handle null and non-object input", () => {
      expect(() => validateAllowedKeys(null, ["key"])).not.toThrow();
      expect(() => validateAllowedKeys("string" as any, ["key"])).not.toThrow();
    });
  });

  describe("Real-world Attack Scenarios", () => {
    it("should prevent prototype pollution via login payload", () => {
      const maliciousLogin = {
        email: "test@example.com",
        password: "password",
        __proto__: {
          isAdmin: true,
          role: "superadmin",
        },
      };

      const sanitized = sanitizeObject(maliciousLogin);

      expect(sanitized).toEqual({
        email: "test@example.com",
        password: "password",
      });

      // Verify prototype not polluted
      const testObj = {};
      expect((testObj as any).isAdmin).toBeUndefined();
    });

    it("should prevent constructor pollution via product creation", () => {
      const maliciousProduct = {
        name: "Product",
        price: 100,
        constructor: {
          prototype: {
            isAdmin: true,
          },
        },
      };

      const sanitized = sanitizeObject(maliciousProduct);

      expect(sanitized).toEqual({
        name: "Product",
        price: 100,
      });
    });

    it("should handle JSON.parse of malicious payload", () => {
      const maliciousJSON = '{"name":"Product","__proto__":{"isAdmin":true}}';
      const parsed = JSON.parse(maliciousJSON);

      const sanitized = sanitizeObject(parsed);

      expect(sanitized).toEqual({ name: "Product" });
    });

    it("should prevent nested prototype pollution", () => {
      const malicious = {
        user: {
          profile: {
            settings: {
              __proto__: { isAdmin: true },
            },
          },
        },
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized.user.profile.settings).toEqual({});
    });

    it("should prevent array-based prototype pollution", () => {
      const malicious = {
        users: [
          { name: "User1" },
          { name: "User2", __proto__: { isAdmin: true } },
        ],
      };

      const sanitized = sanitizeObject(malicious);

      expect(sanitized.users).toEqual([{ name: "User1" }, { name: "User2" }]);
    });
  });
});
