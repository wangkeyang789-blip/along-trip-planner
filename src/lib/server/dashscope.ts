type DashScopeResponseFormat = "json_object" | "plain";

export type DashScopeModelAttempt = {
  model: string;
  responseFormat: DashScopeResponseFormat;
  ok: boolean;
  status?: number;
  code?: string;
  error?: string;
};

type DashScopeValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type DashScopeRequestOptions<T> = {
  validateContent?: (content: string, model: string) => DashScopeValidationResult<T>;
  preferredModels?: string[];
};

const DEFAULT_DASHSCOPE_MODELS = [
  "qwen-flash",
  "qwen-flash-2025-07-28",
  "qwen3.6-flash",
  "qwen3.5-flash",
  "qwen3.5-flash-2026-02-23",
  "qwen-turbo",
  "qwen-plus",
  "qwen-plus-2025-07-28",
  "qwen-plus-2025-12-01",
  "qwen-plus-1220",
  "qwen-plus-0112",
  "qwen3.6-plus",
  "qwen3.7-plus",
  "qwen3.5-plus-2026-04-20",
  "qwen3.5-plus-2026-02-15",
  "qwen-long",
  "qwen-long-latest",
  "qwen-max",
  "qwen3-max",
  "qwen3-max-preview",
  "qwen3-max-2025-09-23",
  "qwen3.6-max-preview",
  "qwen3.7-max",
  "qwen3.7-max-preview",
  "qwen3-8b",
  "qwen3-14b",
  "qwen3-32b",
  "qwen3.5-27b",
  "qwen3.5-35b-a3b",
  "qwen3.5-122b-a10b",
  "qwen3.5-397b-a17b",
  "qwen3-30b-a3b-instruct-2507",
  "qwen3-235b-a22b-instruct-2507",
  "qwen3-235b-a22b-thinking-2507",
  "qwen3-next-80b-a3b-thinking",
  "qwen-math-turbo",
  "qwen-math-plus",
  "qwen-math-plus-0816",
  "qwen-math-plus-0919",
  "qwen3-coder-flash",
  "qwen3-coder-plus",
  "qwen3-coder-plus-2025-07-22",
  "qwen3-coder-next",
  "qwen3-coder-480b-a35b-instruct",
  "deepseek-v3.1",
  "deepseek-v3.2",
  "deepseek-v4-pro",
  "deepseek-r1",
  "deepseek-r1-distill-qwen-32b",
  "deepseek-r1-distill-qwen-14b",
  "deepseek-r1-distill-qwen-7b",
  "glm-4.5-air",
  "glm-5",
  "glm-5.1",
  "kimi-k2.5",
  "kimi-k2.6",
  "kimi-k2-thinking",
  "MiniMax-M2.1",
  "MiniMax-M2.5",
  "qwen-plus-character",
  "qwen-flash-character",
];

function splitModelList(value?: string | null) {
  return (value || "")
    .split(/[\s,;]+/)
    .map((model) => model.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]) {
  return Array.from(new Set(models));
}

export function getDashScopeModelPool() {
  const configuredModels = splitModelList(process.env.DASHSCOPE_MODELS);
  if (configuredModels.length > 0) {
    return uniqueModels(configuredModels);
  }

  return uniqueModels([
    ...splitModelList(process.env.DASHSCOPE_MODEL),
    ...DEFAULT_DASHSCOPE_MODELS,
  ]);
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
    readStringField(root, "request_error") ||
    "DashScope API 调用失败";

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

function isQuotaExhaustedError(status: number, code: string | undefined, message: string) {
  const normalized = `${code || ""} ${message}`.toLowerCase();
  return (
    status === 429 ||
    status === 402 ||
    normalized.includes("quota") ||
    normalized.includes("exhausted") ||
    normalized.includes("rate limit") ||
    normalized.includes("ratelimit") ||
    normalized.includes("too many requests") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("account arrears") ||
    normalized.includes("arrearage") ||
    normalized.includes("throttling") ||
    normalized.includes("flow limit") ||
    normalized.includes("request limit") ||
    normalized.includes("billing")
  );
}

async function callDashScopeModel(
  messages: unknown[],
  model: string,
  responseFormat: DashScopeResponseFormat,
) {
  const response = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY?.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        ...(responseFormat === "json_object"
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    },
  );
  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "DashScope API 返回了非 JSON 响应" };
  }

  if (!response.ok) {
    const { code, message } = extractError(data);
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

export function getDashScopeReadiness() {
  const missing = [];
  if (!process.env.DASHSCOPE_API_KEY?.trim()) {
    missing.push("DASHSCOPE_API_KEY");
  }

  return {
    ready: missing.length === 0,
    missing,
    models: getDashScopeModelPool(),
  };
}


export function getPreferredModelPool(scope: "compress" | "summary" | "route") {
  const allModels = getDashScopeModelPool();

  // Priority lists per scope
  const flashModels = allModels.filter(m => m.includes("flash") || m.includes("qwen3-8b") || m.includes("qwen3-14b"));
  const turboModels = allModels.filter(m => m.includes("turbo") || m.includes("qwen3-32b"));
  const plusModels = allModels.filter(m => m.includes("max") || m.includes("plus") || m.includes("qwen3.7") || m.includes("qwen3.6") || m.includes("qwen-long"));
  const maxFirst = allModels.filter(m => m.includes("max"));
  // Cheap/small models as last resort fallback
  const cheapFallback = allModels.filter(m =>
    m.includes("glm-4.5-air") || m.includes("qwen-math") || m.includes("qwen3-coder-flash")
  );

  if (scope === "compress") {
    // compress: flash first, then turbo, then rest
    return uniqueModels([...flashModels, ...turboModels, ...allModels]);
  }

  if (scope === "summary") {
    // summary: turbo first, then plus, then flash fallback
    return uniqueModels([...turboModels, ...plusModels, ...flashModels, ...allModels]);
  }

  // route: max first, then plus, then turbo, then flash, then cheap fallback
  const ordered = [
    ...maxFirst,
    ...plusModels,
    ...turboModels,
    ...flashModels,
    ...cheapFallback,
    ...allModels,
  ];
  return uniqueModels(ordered);
}

export async function requestDashScopeJson<T = unknown>(
  messages: unknown[],
  options: DashScopeRequestOptions<T> = {},
) {
  const readiness = getDashScopeReadiness();
  if (!readiness.ready) {
    return {
      configured: false,
      source: "dashscope",
      missing: readiness.missing,
      models: readiness.models,
      note: "未配置百炼 Key，不执行 AI 规划，也不会生成虚拟地点事实。",
    };
  }

  const attempts: DashScopeModelAttempt[] = [];

  try {
    const modelPool = options.preferredModels && options.preferredModels.length > 0
      ? options.preferredModels
      : readiness.models;
    for (const model of modelPool) {
      const preferredResult = await callDashScopeModel(
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
        const plainResult = await callDashScopeModel(messages, model, "plain");
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
          continue;
        }

        if (options.validateContent) {
          const validation = options.validateContent(content, model);
          if (!validation.ok) {
            attempts[attempts.length - 1] = {
              ...attempts[attempts.length - 1],
              ok: false,
              error: validation.error,
            };
            continue;
          }

          return {
            configured: true,
            source: "dashscope",
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
          source: "dashscope",
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
          source: "dashscope",
          ok: false,
          status: latestResult.status,
          error: latestResult.error,
          code: latestResult.code,
          attempts,
        };
      }
    }

    return {
      configured: true,
      source: "dashscope",
      ok: false,
      error: "所有 DashScope 模型都未返回可用规划结果",
      attempts,
    };
  } catch (error) {
    return {
      configured: true,
      source: "dashscope",
      ok: false,
      error:
        error instanceof Error ? error.message : "DashScope request failed",
      attempts,
    };
  }
}
