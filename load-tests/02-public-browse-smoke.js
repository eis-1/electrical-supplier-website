import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

export const options = {
  vus: 5,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

function pickFirstProductSlug(json) {
  const items = json?.data?.items;
  if (Array.isArray(items) && items.length > 0) return items[0]?.slug;
  return undefined;
}

export default function () {
  const commonParams = { headers: { Accept: "application/json" } };

  group("public: health", () => {
    const res = http.get(`${BASE_URL}/health`, commonParams);
    check(res, {
      "health status 200": (r) => r.status === 200,
    });
  });

  group("public: categories list", () => {
    const res = http.get(`${BASE_URL}/api/v1/categories?page=1&limit=10`, commonParams);
    check(res, {
      "categories status 200": (r) => r.status === 200,
      "categories is json": (r) => !!r.headers["Content-Type"]?.includes("application/json"),
    });
  });

  let slug;
  group("public: products list", () => {
    const res = http.get(`${BASE_URL}/api/v1/products?page=1&limit=10`, commonParams);
    check(res, {
      "products status 200": (r) => r.status === 200,
      "products has success=true": (r) => r.json()?.success === true,
      "products has items[]": (r) => Array.isArray(r.json()?.data?.items),
    });

    try {
      slug = pickFirstProductSlug(res.json());
    } catch {
      slug = undefined;
    }
  });

  group("public: product details (if available)", () => {
    if (!slug) {
      // DB might be empty if seeding is skipped; don't fail the entire smoke test.
      return;
    }

    const res = http.get(`${BASE_URL}/api/v1/products/${encodeURIComponent(slug)}`, commonParams);
    check(res, {
      "product status 200": (r) => r.status === 200,
      "product slug matches": (r) => r.json()?.data?.slug === slug,
    });
  });

  sleep(1);
}
