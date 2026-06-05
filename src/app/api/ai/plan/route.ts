import { NextResponse } from "next/server";
import { requestDashScopeJson } from "@/lib/server/dashscope";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await requestDashScopeJson([
    {
      role: "system",
      content:
        "你是协作旅行规划 Agent。只输出 JSON。只允许使用用户讨论内容和 amapContext 中明确给出的事实，不要虚构地点图片、营业时间、排队信息、评分或拥堵数据。无法确认的字段设为 null。",
    },
    {
      role: "user",
      content: JSON.stringify({
        roomSummary: body.roomSummary || null,
        preferences: body.preferences || [],
        amapContext: body.amapContext || null,
        currentPlan: body.currentPlan || null,
        expectedShape: {
          summary: "string",
          routeIntent: "string",
          suggestedChoices: [
            {
              id: "string",
              label: "string",
              reason: "string",
            },
          ],
          mapUpdates: {
            selectedPlaceIds: ["string"],
            routeMode: "walking | driving | mixed | null",
          },
          missingFacts: ["string"],
        },
      }),
    },
  ]);

  if (result.configured && result.data) {
    const content = (
      result.data as {
        choices?: Array<{ message?: { content?: string } }>;
      }
    ).choices?.[0]?.message?.content;

    if (content) {
      try {
        return NextResponse.json({
          configured: true,
          source: "dashscope",
          plan: JSON.parse(content),
        });
      } catch {
        return NextResponse.json({
          configured: true,
          source: "dashscope",
          plan: null,
          raw: content,
        });
      }
    }
  }

  return NextResponse.json(result, {
    status: result.configured ? 200 : 501,
  });
}
