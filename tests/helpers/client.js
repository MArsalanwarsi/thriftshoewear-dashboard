import { TestServer } from "./test-server.js";

let globalServerInstance = null;
let globalClientInstance = null;

export class ApiClient {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  setToken(token) {
    this.token = token;
    return this;
  }

  clone(token = null) {
    const c = new ApiClient(this.baseUrl, token || this.token);
    c.superAdminToken = this.superAdminToken;
    c.adminToken = this.adminToken;
    c.customerToken = this.customerToken;
    return c;
  }

  async request(method, path, { body, query, headers = {}, token } = {}) {
    let url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(query)) {
        if (val !== undefined && val !== null && val !== "") {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const reqHeaders = {
      Accept: "application/json",
      ...headers,
    };

    const authToken = token !== undefined ? token : this.token;
    if (authToken && !reqHeaders["Authorization"]) {
      reqHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    let payload = undefined;
    if (body !== undefined) {
      if (typeof body === "string") {
        payload = body;
      } else {
        payload = JSON.stringify(body);
        if (!reqHeaders["Content-Type"]) {
          reqHeaders["Content-Type"] = "application/json";
        }
      }
    }

    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: payload,
    });

    const contentType = response.headers.get("content-type") || "";
    let parsedData = null;
    let text = "";

    try {
      text = await response.text();
      if (contentType.includes("application/json") || (text.startsWith("{") || text.startsWith("["))) {
        parsedData = JSON.parse(text);
      }
    } catch {
      parsedData = null;
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      data: parsedData,
      body: parsedData,
      text,
    };
  }

  async get(path, opts = {}) {
    return this.request("GET", path, opts);
  }

  async post(path, body, opts = {}) {
    return this.request("POST", path, { ...opts, body });
  }

  async patch(path, body, opts = {}) {
    return this.request("PATCH", path, { ...opts, body });
  }

  async delete(path, opts = {}) {
    return this.request("DELETE", path, opts);
  }
}

export async function getTestClient() {
  if (globalClientInstance) return globalClientInstance;

  const envUrl = process.env.TEST_BASE_URL;
  if (envUrl) {
    try {
      const res = await fetch(`${envUrl}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        globalClientInstance = new ApiClient(envUrl);
        return globalClientInstance;
      }
    } catch {
      // Fall through to in-memory server
    }
  }

  const server = new TestServer(0);
  const baseUrl = await server.start();
  globalServerInstance = server;

  const client = new ApiClient(baseUrl);
  client.superAdminToken = server.superAdminToken;
  client.adminToken = server.adminToken;
  client.customerToken = server.customerToken;
  client.server = server;

  globalClientInstance = client;
  return client;
}

export async function teardownTestEnvironment() {
  if (globalServerInstance) {
    await globalServerInstance.stop();
    globalServerInstance = null;
    globalClientInstance = null;
  }
}
