import { Metadata } from "next";

type SharePageProps = {
  params: Promise<{ code: string }>;
};

export const metadata: Metadata = {
  title: "同路 · 旅行路线分享",
  description: "查看朋友分享的旅行路线方案",
};

async function fetchSharedPlan(code: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const url = baseUrl + "/api/rooms/" + encodeURIComponent(code) + "/state";
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.planning) return null;
    return {
      title: data.title || "旅行路线",
      planning: data.planning,
    };
  } catch {
    return null;
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { code } = await params;
  const data = await fetchSharedPlan(code);

  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui", color: "#666" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "16px" }}>🗺</h1>
        <h2>路线方案未找到</h2>
        <p style={{ color: "#999" }}>该分享链接可能已过期或房间不存在</p>
      </div>
    );
  }

  const { planning } = data;
  const selectedVariant = planning.routeVariants?.find(
    (v: { id: string }) => v.id === planning.selectedVariantId
  ) || planning.routeVariants?.[0];

  return (
    <div style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: "40px 24px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#1a1a2e",
    }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{data.title}</h1>
        {planning.city && (
          <p style={{ color: "#7167f6", fontSize: 16, marginTop: 8 }}>
            📍 {planning.city}
          </p>
        )}
      </header>

      {planning.summary && (
        <section style={{
          background: "linear-gradient(135deg, #f0eeff, #e8f4ff)",
          borderRadius: 16,
          padding: "24px",
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: "#7167f6" }}>AI 理解摘要</h2>
          <p style={{ margin: 0, lineHeight: 1.6, color: "#444" }}>{planning.summary}</p>
        </section>
      )}

      {selectedVariant && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>
            {selectedVariant.name}
          </h2>
          <p style={{ color: "#666", margin: "0 0 20px" }}>{selectedVariant.description}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {selectedVariant.waypoints?.sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((wp: { id: string; name: string; description?: string; order: number }, idx: number, arr: Array<{ id: string }>) => (
              <div key={wp.id} style={{ display: "flex", gap: 16, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#7167f6", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: "#e0ddf8", minHeight: 28 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 24 }}>
                  <strong style={{ fontSize: 16, color: "#1a1a2e" }}>{wp.name}</strong>
                  {wp.description && (
                    <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>{wp.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedVariant.totalDurationText && (
            <div style={{
              display: "flex", gap: 24, marginTop: 16,
              padding: "16px", background: "#f9f9fb", borderRadius: 12,
            }}>
              <span style={{ color: "#666", fontSize: 14 }}>
                ⏱ {selectedVariant.totalDurationText}
              </span>
              {selectedVariant.totalDistanceText && (
                <span style={{ color: "#666", fontSize: 14 }}>
                  📏 {selectedVariant.totalDistanceText}
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {planning.routeVariants?.length > 1 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>其他方案</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {planning.routeVariants
              .filter((v: { id: string }) => v.id !== selectedVariant?.id)
              .map((v: { id: string; name: string; description: string; waypoints?: Array<{ name: string }> }) => (
                <div key={v.id} style={{
                  flex: "1 1 200px",
                  padding: 16,
                  background: "#f9f9fb",
                  borderRadius: 12,
                  border: "1px solid #eee",
                }}>
                  <strong style={{ fontSize: 15 }}>{v.name}</strong>
                  <p style={{ color: "#888", fontSize: 13, margin: "4px 0" }}>{v.description}</p>
                  {v.waypoints && (
                    <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>
                      {v.waypoints.length} 个地点
                    </p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #eee", textAlign: "center" }}>
        <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>
          由 同路 · 协作旅行 生成 · 仅供参考
        </p>
      </footer>
    </div>
  );
}