export function getDashScopeReadiness() {
  const missing = [];
  if (!process.env.DASHSCOPE_API_KEY) {
    missing.push("DASHSCOPE_API_KEY");
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export async function requestDashScopeJson(messages: unknown[]) {
  const readiness = getDashScopeReadiness();
  if (!readiness.ready) {
    return {
      configured: false,
      source: "dashscope",
      missing: readiness.missing,
      note: "未配置百炼 Key，不执行 AI 规划，也不会生成虚拟地点事实。",
    };
  }

  const response = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DASHSCOPE_MODEL || "qwen-flash",
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    },
  );
  const data = await response.json().catch(() => null);

  return {
    configured: true,
    source: "dashscope",
    ok: response.ok,
    data,
  };
}
