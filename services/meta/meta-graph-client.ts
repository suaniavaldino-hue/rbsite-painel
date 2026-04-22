import "server-only";

type Primitive = boolean | number | string;

type QueryValue = Primitive | null | undefined;

type MetaGraphRequestOptions = {
  method?: "GET" | "POST";
  body?: Record<string, QueryValue>;
  query?: Record<string, QueryValue>;
};

type MetaErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaGraphApiError extends Error {
  status: number;

  code?: number;

  subcode?: number;

  traceId?: string;

  errorType?: string;

  constructor(message: string, init: {
    status: number;
    code?: number;
    subcode?: number;
    traceId?: string;
    errorType?: string;
  }) {
    super(message);
    this.name = "MetaGraphApiError";
    this.status = init.status;
    this.code = init.code;
    this.subcode = init.subcode;
    this.traceId = init.traceId;
    this.errorType = init.errorType;
  }
}

export class MetaGraphClient {
  private readonly accessToken: string;

  private readonly version: string;

  private readonly baseUrl = "https://graph.facebook.com";

  constructor(config: { accessToken: string; version: string }) {
    this.accessToken = config.accessToken;
    this.version = config.version;
  }

  async get<T>(path: string, query?: Record<string, QueryValue>) {
    return this.request<T>(path, {
      method: "GET",
      query,
    });
  }

  async post<T>(path: string, body?: Record<string, QueryValue>) {
    return this.request<T>(path, {
      method: "POST",
      body,
    });
  }

  private async request<T>(
    path: string,
    options: MetaGraphRequestOptions = {},
  ): Promise<T> {
    const method = options.method ?? "GET";
    const query = new URLSearchParams();
    query.set("access_token", this.accessToken);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }

    const url = `${this.baseUrl}/${this.version}/${path.replace(/^\//, "")}?${query.toString()}`;

    let body: string | undefined;
    const headers: HeadersInit = {};

    if (method === "POST") {
      const form = new URLSearchParams();

      for (const [key, value] of Object.entries(options.body ?? {})) {
        if (value !== undefined && value !== null) {
          form.set(key, String(value));
        }
      }

      form.set("access_token", this.accessToken);
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = form.toString();
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const json = (await response.json()) as T & MetaErrorPayload;

    if (!response.ok) {
      throw new MetaGraphApiError(
        json.error?.message ?? "Meta Graph API request failed.",
        {
          status: response.status,
          code: json.error?.code,
          subcode: json.error?.error_subcode,
          traceId: json.error?.fbtrace_id,
          errorType: json.error?.type,
        },
      );
    }

    return json;
  }
}
