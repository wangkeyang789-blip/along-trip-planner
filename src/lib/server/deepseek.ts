type DeepSeekResponseFormat = "json_object" | "plain";

export type DeepSeekAttempt = {
  model: string;
  responseFormat: DeepSeekResponseFormat;
  ok: boolean;
  status?: number;
  code?: string;
  error?: string;
};

type DeepSeekValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type DeepSeekRequestOptions<T> = {
  validateContent?: (content: string, model: string) => DeepSeekValidationResult<T>;
  preferredModels?: string[];
};

function getApiBase() {
  return (process.env.OPENAI_API_BASE || "https://api.deepseek.com").replace(/\/$/, "");
}

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

function getModelName() {
  return process.env.OPENAI_MODEL_NAME?.trim() || "deepseek-chat";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readStringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function extractError(data: unknown) {
  const root = asRecord(data);
  const errorRecord = asRecord(root?.error);
  const code =
    readStringField(errorRecord, "code") ||
    readStringField(root, "code") ||
    readStringField(root, "error_code");
  const message =
    readStringField(errorRecord, "message") ||
    readStringField(root, "message") ||
    readStringField(root, "msg") ||
    "DeepSeek API 调用失败";

  return { code, message };
}

function extractContent(data: unknown) {
  const root = asRecord(data);
  const choices = root?.choices;
  if (!Array.isArray(choices)) return undefined;

  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  return readStringField(message, "content");
}

function isResponseFormatUnsupported(
  status: number,
  code: string | undefined,
  message: string,
) {
  const normalized = `${code || ""} ${message}`.toLowerCase();
  return (
    status === 400 &&
    (normalized.includes("response_format") ||
      normalized.includes("json_object") ||
      normalized.includes("json mode"))
  );
}

function isFatalAuthError(status: number, code: string | undefined, message: string) {
  const normalized = `${code || ""} ${message}`.toLowerCase();
  return (
    status === 401 ||
    normalized.includes("invalid api key") ||
    normalized.includes("invalidapikey") ||
    normalized.includes("unauthorized")
  );
}

async function callDeepSeekModel(
  messages: unknown[],
  model: string,
  responseFormat: DeepSeekResponseFormat,
) {
  const apiBase = getApiBase();
  const apiKey = getApiKey();

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      ...(responseFormat === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  console.log("[DeepSeek] API response status:", response.status);

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "DeepSeek API 返回了非 JSON 响应" };
  }

  if (!response.ok) {
    const { code, message } = extractError(data);
    console.error("[DeepSeek] API error:", { status: response.status, code, message });
    return {
      ok: false as const,
      status: response.status,
      data,
      code,
      error: message,
    };
  }

  return {
    ok: true as const,
    status: response.status,
    data,
    content: extractContent(data),
  };
}

export function getDeepSeekReadiness() {
  const missing = [];
  if (!getApiKey()) {
    missing.push("OPENAI_API_KEY");
  }

  return {
    ready: missing.length === 0,
    missing,
    model: getModelName(),
    apiBase: getApiBase(),
  };
}

export async function requestDeepSeekJson<T = unknown>(
  messages: unknown[],
  options: DeepSeekRequestOptions<T> = {},
) {
  const readiness = getDeepSeekReadiness();
  if (!readiness.ready) {
    return {
      configured: false,
      source: "deepseek",
      missing: readiness.missing,
      model: readiness.model,
      note: "未配置 DeepSeek API Key，不执行 AI 规划。",
    };
  }

  const attempts: DeepSeekAttempt[] = [];
  const model = options.preferredModels?.[0] || readiness.model;

  console.log("[DeepSeek] requesting with model:", model, "messages count:", messages.length);

  try {
    const preferredResult = await callDeepSeekModel(
      messages,
      model,
      "json_object",
    );
    let latestResult = preferredResult;
    attempts.push({
      model,
      responseFormat: "json_object",
      ok: preferredResult.ok,
      status: preferredResult.status,
      code: preferredResult.ok ? undefined : preferredResult.code,
      error: preferredResult.ok ? undefined : preferredResult.error,
    });

    if (
      !preferredResult.ok &&
      isResponseFormatUnsupported(
        preferredResult.status,
        preferredResult.code,
        preferredResult.error,
      )
    ) {
      const plainResult = await callDeepSeekModel(messages, model, "plain");
      latestResult = plainResult;
      attempts.push({
        model,
        responseFormat: "plain",
        ok: plainResult.ok,
        status: plainResult.status,
        code: plainResult.ok ? undefined : plainResult.code,
        error: plainResult.ok ? undefined : plainResult.error,
      });
    }

    if (latestResult.ok) {
      const content = latestResult.content;
      if (!content) {
        attempts[attempts.length - 1] = {
          ...attempts[attempts.length - 1],
          ok: false,
          error: "模型没有返回 message.content",
        };
        return {
          configured: true,
          source: "deepseek",
          ok: false,
          error: "模型没有返回 content",
          attempts,
        };
      }

      if (options.validateContent) {
        const validation = options.validateContent(content, model);
        if (!validation.ok) {
          attempts[attempts.length - 1] = {
            ...attempts[attempts.length - 1],
            ok: false,
            error: validation.error,
          };
          return {
            configured: true,
            source: "deepseek",
            ok: false,
            error: validation.error,
            attempts,
          };
        }

        return {
          configured: true,
          source: "deepseek",
          ok: true,
          status: latestResult.status,
          model,
          data: latestResult.data,
          content,
          parsed: validation.value,
          attempts,
        };
      }

      return {
        configured: true,
        source: "deepseek",
        ok: true,
        status: latestResult.status,
        model,
        data: latestResult.data,
        content,
        attempts,
      };
    }

    if (
      isFatalAuthError(
        latestResult.status,
        latestResult.code,
        latestResult.error,
      )
    ) {
      return {
        configured: true,
        source: "deepseek",
        ok: false,
        status: latestResult.status,
        error: latestResult.error,
        code: latestResult.code,
        attempts,
      };
    }

    return {
      configured: true,
      source: "deepseek",
      ok: false,
      error: latestResult.error || "DeepSeek API 调用失败",
      code: latestResult.code,
      attempts,
    };
  } catch (error) {
    console.log("[DeepSeek] final result:", { ok: false, configured: true, error: error instanceof Error ? error.message : "DeepSeek request failed", attemptsCount: attempts.length });
    return {
      configured: true,
      source: "deepseek",
      ok: false,
      error:
        error instanceof Error ? error.message : "DeepSeek request failed",
      attempts,
    };
  }

  // This should never be reached, but satisfies TS control flow
  console.log("[DeepSeek] final result:", { ok: false, configured: true, error: "Unexpected end of function", attemptsCount: attempts.length });
  return {
    configured: true,
    source: "deepseek",
    ok: false,
    error: "Unexpected end of function",
    attempts,
  };
}
