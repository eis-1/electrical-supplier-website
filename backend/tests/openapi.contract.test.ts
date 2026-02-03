import path from "path";
import { execSync } from "child_process";

import * as http from "http";
import * as https from "https";

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { startTestServer, type TestServerContext } from "./utils/testServer";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const CONTRACT_USER_EMAIL = "contract@electricalsupplier.com";
const CONTRACT_USER_NAME = "Contract Test";

let serverContext: TestServerContext | undefined;
let api = axios.create({
  baseURL: "http://127.0.0.1:0",
  validateStatus: () => true,
});

let httpAgent: http.Agent | undefined;
let httpsAgent: https.Agent | undefined;

let spec: any;
let ajv: Ajv;

function normalizeNullableSchema(schema: any): any {
  if (schema === null || schema === undefined) return schema;

  if (Array.isArray(schema)) {
    return schema.map(normalizeNullableSchema);
  }

  if (typeof schema !== "object") return schema;

  // Shallow copy first, then normalize children
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "nullable") continue;
    out[k] = normalizeNullableSchema(v);
  }

  if (schema.nullable === true) {
    // If a concrete type exists, widen it to include null
    if (out.type) {
      const types = Array.isArray(out.type) ? out.type : [out.type];
      out.type = Array.from(new Set([...types, "null"]));
      return out;
    }

    // Otherwise wrap the schema in anyOf to allow null
    const base = { ...out };
    return {
      anyOf: [base, { type: "null" }],
    };
  }

  return out;
}

function getOperation(pathKey: string, method: HttpMethod) {
  const pathItem = spec?.paths?.[pathKey];
  if (!pathItem) {
    throw new Error(`OpenAPI: path not found: ${pathKey}`);
  }

  const op = pathItem?.[method];
  if (!op) {
    throw new Error(`OpenAPI: operation not found: ${method.toUpperCase()} ${pathKey}`);
  }

  return op;
}

function getJsonResponseSchema(pathKey: string, method: HttpMethod, statusCode: number) {
  const op = getOperation(pathKey, method);
  const statusKey = String(statusCode);

  const response = op?.responses?.[statusKey];
  if (!response) {
    throw new Error(`OpenAPI: response not found for ${method.toUpperCase()} ${pathKey} -> ${statusKey}`);
  }

  const schema = response?.content?.["application/json"]?.schema;
  if (!schema) {
    throw new Error(
      `OpenAPI: missing application/json schema for ${method.toUpperCase()} ${pathKey} -> ${statusKey}`,
    );
  }

  return schema;
}

function assertConforms(schema: any, data: any, context: string) {
  const normalized = normalizeNullableSchema(schema);
  const validate = ajv.compile(normalized);

  const ok = validate(data);
  if (ok) return;

  const errors = (validate.errors || []) as ErrorObject[];
  const details = JSON.stringify(
    {
      context,
      errors,
      responseSample: data,
    },
    null,
    2,
  );

  throw new Error(`OpenAPI contract validation failed:\n${details}`);
}

async function requestAndValidate(opts: {
  pathKey: string;
  method: HttpMethod;
  url: string;
  expectedStatus: number;
  data?: any;
  headers?: Record<string, string>;
}): Promise<AxiosResponse> {
  const config: AxiosRequestConfig = {
    url: opts.url,
    method: opts.method,
    data: opts.data,
    headers: opts.headers,
  };

  const res = await api.request(config);
  expect(res.status).toBe(opts.expectedStatus);

  const schema = getJsonResponseSchema(opts.pathKey, opts.method, opts.expectedStatus);
  assertConforms(schema, res.data, `${opts.method.toUpperCase()} ${opts.pathKey} -> ${opts.expectedStatus}`);

  return res;
}

function buildCookieHeader(setCookie: string[] | undefined): string {
  if (!setCookie || setCookie.length === 0) return "";
  // Keep only the cookie pair (name=value)
  const pairs = setCookie
    .map((c) => c.split(";")[0])
    .filter(Boolean);
  return pairs.join("; ");
}

function omitCookie(cookieHeader: string, cookieName: string): string {
  if (!cookieHeader) return cookieHeader;
  const parts = cookieHeader
    .split("; ")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.startsWith(`${cookieName}=`));
  return parts.join("; ");
}

async function loginAndGetSession() {
  const login = await api.post(
    "/api/v1/auth/login",
    { email: CONTRACT_USER_EMAIL, password: ADMIN_PASSWORD },
    { headers: { "Content-Type": "application/json" } },
  );

  expect(login.status).toBe(200);
  expect(login.data?.success).toBe(true);

  const token = login.data?.data?.token as string | undefined;
  expect(token).toBeDefined();

  const csrf = (login.headers?.["x-csrf-token"] as string | undefined) || "";
  const cookieHeader = buildCookieHeader(login.headers?.["set-cookie"] as string[] | undefined);

  expect(csrf).toBeTruthy();
  expect(cookieHeader).toMatch(/refreshToken=/);
  expect(cookieHeader).toMatch(/csrf-token=/);

  return { token, csrf, cookieHeader };
}

describe("OpenAPI contract (live)", () => {
  beforeAll(async () => {
    // Ensure default admin exists and is reset to a known state.
    const backendRoot = path.resolve(__dirname, "..");
    execSync("node setup-admin.js", { cwd: backendRoot, stdio: "ignore" });

    // Create a dedicated user for contract tests so that other suites toggling
    // 2FA on the default admin cannot make these tests flaky.
    const prisma = new PrismaClient();
    try {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await prisma.admin.upsert({
        where: { email: CONTRACT_USER_EMAIL },
        update: {
          password: hashedPassword,
          name: CONTRACT_USER_NAME,
          role: "superadmin",
          isActive: true,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null,
        },
        create: {
          email: CONTRACT_USER_EMAIL,
          password: hashedPassword,
          name: CONTRACT_USER_NAME,
          role: "superadmin",
          isActive: true,
          twoFactorEnabled: false,
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  beforeAll(async () => {
    serverContext = await startTestServer();

    // Ensure we don't leak sockets (Jest otherwise reports worker-exit warnings).
    httpAgent = new http.Agent({ keepAlive: false, maxSockets: 25 });
    httpsAgent = new https.Agent({ keepAlive: false, maxSockets: 25 });
    api = axios.create({
      baseURL: serverContext.baseUrl,
      validateStatus: () => true,
      httpAgent,
      httpsAgent,
    });
  });

  afterAll(async () => {
    if (serverContext?.close) {
      await serverContext.close();
    }

    // Force-close any remaining sockets held by the agent.
    try {
      httpAgent?.destroy();
    } catch {
      // ignore
    }
    try {
      httpsAgent?.destroy();
    } catch {
      // ignore
    }
  });

  beforeAll(async () => {
    const specPath = path.resolve(__dirname, "..", "..", "docs", "openapi.yaml");
    spec = await SwaggerParser.validate(specPath);

    ajv = new Ajv({
      allErrors: true,
      strict: false,
    });
    addFormats(ajv);
  });

  test("GET /health matches OpenAPI", async () => {
    await requestAndValidate({
      pathKey: "/health",
      method: "get",
      url: "/health",
      expectedStatus: 200,
    });
  });

  test("POST /api/v1/auth/login (success) matches OpenAPI", async () => {
    const res = await requestAndValidate({
      pathKey: "/api/v1/auth/login",
      method: "post",
      url: "/api/v1/auth/login",
      expectedStatus: 200,
      data: {
        email: CONTRACT_USER_EMAIL,
        password: ADMIN_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    // We expect the reset admin to be non-2FA.
    expect(res.data?.success).toBe(true);
    expect(res.data?.data?.requiresTwoFactor).toBeUndefined();
    expect(res.data?.data?.token).toBeDefined();
  });

  test("POST /api/v1/auth/login (invalid creds) matches OpenAPI", async () => {
    await requestAndValidate({
      pathKey: "/api/v1/auth/login",
      method: "post",
      url: "/api/v1/auth/login",
      expectedStatus: 401,
      data: {
        email: CONTRACT_USER_EMAIL,
        password: "WrongPassword123!",
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  test("POST /api/v1/auth/verify matches OpenAPI", async () => {
    const { token } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/verify",
      method: "post",
      url: "/api/v1/auth/verify",
      expectedStatus: 200,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });

  test("POST /api/v1/auth/refresh matches OpenAPI (CSRF + cookies)", async () => {
    const { csrf, cookieHeader } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/refresh",
      method: "post",
      url: "/api/v1/auth/refresh",
      expectedStatus: 200,
      headers: {
        Cookie: cookieHeader,
        "x-csrf-token": csrf,
      },
    });
  });

  test("POST /api/v1/auth/refresh (missing CSRF header) matches OpenAPI", async () => {
    const { cookieHeader } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/refresh",
      method: "post",
      url: "/api/v1/auth/refresh",
      expectedStatus: 403,
      headers: {
        Cookie: cookieHeader,
      },
    });
  });

  test("POST /api/v1/auth/refresh (missing CSRF cookie) matches OpenAPI", async () => {
    const { csrf } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/refresh",
      method: "post",
      url: "/api/v1/auth/refresh",
      expectedStatus: 403,
      headers: {
        "x-csrf-token": csrf,
      },
    });
  });

  test("POST /api/v1/auth/refresh (missing refresh token cookie) matches OpenAPI", async () => {
    const { csrf, cookieHeader } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/refresh",
      method: "post",
      url: "/api/v1/auth/refresh",
      expectedStatus: 401,
      headers: {
        Cookie: omitCookie(cookieHeader, "refreshToken"),
        "x-csrf-token": csrf,
      },
    });
  });

  test("POST /api/v1/auth/logout matches OpenAPI (CSRF + cookies)", async () => {
    const { csrf, cookieHeader } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/logout",
      method: "post",
      url: "/api/v1/auth/logout",
      expectedStatus: 200,
      headers: {
        Cookie: cookieHeader,
        "x-csrf-token": csrf,
      },
    });
  });

  test("POST /api/v1/auth/logout (missing CSRF header) matches OpenAPI", async () => {
    const { cookieHeader } = await loginAndGetSession();

    await requestAndValidate({
      pathKey: "/api/v1/auth/logout",
      method: "post",
      url: "/api/v1/auth/logout",
      expectedStatus: 403,
      headers: {
        Cookie: cookieHeader,
      },
    });
  });
});
