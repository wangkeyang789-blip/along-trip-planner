type AmapParams = Record<string, string | number | boolean | undefined>;

const AMAP_BASE_URL = "https://restapi.amap.com";

export function getAmapReadiness() {
  const missing = [];
  if (!process.env.AMAP_WEB_SERVICE_KEY) {
    missing.push("AMAP_WEB_SERVICE_KEY");
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function getAmapClientReadiness() {
  const missing = [];
  if (!process.env.NEXT_PUBLIC_AMAP_JS_KEY) {
    missing.push("NEXT_PUBLIC_AMAP_JS_KEY");
  }
  if (!process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE) {
    missing.push("NEXT_PUBLIC_AMAP_SECURITY_JS_CODE");
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export async function requestAmap(path: string, params: AmapParams) {
  const readiness = getAmapReadiness();
  if (!readiness.ready) {
    return {
      configured: false,
      source: "amap",
      missing: readiness.missing,
      note: "未配置高德 Web Service Key，不返回虚拟地点、图片或路线数据。",
    };
  }

  const url = new URL(path, AMAP_BASE_URL);
  url.searchParams.set("key", process.env.AMAP_WEB_SERVICE_KEY || "");
  url.searchParams.set("output", "json");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => null);

  return {
    configured: true,
    source: "amap",
    ok: response.ok,
    data,
  };
}
