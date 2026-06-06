import type { ConversationTurnSnapshot } from "@/lib/room-contracts";

export type PreprocessedConversation = {
  turns: ConversationTurnSnapshot[];
  primaryPOIs: string[];
  preferences: string[];
  confirmed: string[];
  disputed: string[];
  version: number;
};

// POI name normalization map
const POI_ALIASES: Record<string, string> = {
  "长城": "八达岭长城",
  "八达岭": "八达岭长城",
  "故宫": "故宫博物院",
  "天安门": "天安门广场",
  "颐和园": "颐和园",
  "圆明园": "圆明园遗址公园",
  "鸟巢": "国家体育场",
  "水立方": "国家游泳中心",
  "西湖": "杭州西湖",
  "外滩": "上海外滩",
  "东方明珠": "东方明珠广播电视塔",
  "兵马俑": "秦始皇兵马俑博物馆",
  "大雁塔": "大雁塔·大慈恩寺",
  "鼓浪屿": "鼓浪屿风景名胜区",
};

// Preference clustering
const LOW_EFFORT_KEYWORDS = ["轻松", "不累", "少走", "不想走", "太累", "休闲", "慢点", "佛系", "躺平"];
const FOOD_KEYWORDS = ["吃", "美食", "小吃", "餐厅", "火锅", "烧烤", "日料", "海鲜", "甜品", "奶茶"];
const CULTURE_KEYWORDS = ["历史", "文化", "博物馆", "古迹", "寺庙", "宫殿", "老街", "传统"];
const NATURE_KEYWORDS = ["自然", "山", "海", "湖", "公园", "植物园", "森林", "瀑布", "日出", "日落"];
const SHOPPING_KEYWORDS = ["买", "购物", "商场", "街", "市场", "免税"];
const PHOTO_KEYWORDS = ["拍照", "打卡", "网红", "好看", "美", "出片", "风景"];
const BUDGET_KEYWORDS = ["便宜", "省钱", "免费", "贵", "预算", "性价比"];

function normalizePOIName(name: string): string {
  return POI_ALIASES[name] || name;
}

function extractPOINames(text: string): string[] {
  const poiPatterns = [
    /(?:去|到|逛|游|玩|看|参观)(?:一下|一逛)?([\u4e00-\u9fa5]{2,12}(?:公园|广场|博物馆|长城|故宫|寺|庙|塔|街|巷|湖|山|海|楼|园|馆|院|堂|府|岛|滩|林|洞|窟|桥|亭|台|阁|坊|城|镇|村|景区|风景|名胜|乐园|世界|中心|大厦|商场|市场|步行街|美食街))/g,
    /([\u4e00-\u9fa5]{2,12}(?:公园|广场|博物馆|长城|故宫|寺|庙|塔|街|巷|湖|山|海|楼|园|馆|院|堂|府|岛))/g,
  ];

  const results: string[] = [];
  for (const pattern of poiPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push(normalizePOIName(match[1] || match[0]));
    }
  }
  return [...new Set(results)];
}

function clusterPreferences(text: string): string[] {
  const prefs: string[] = [];
  const lower = text.toLowerCase();

  if (LOW_EFFORT_KEYWORDS.some(k => lower.includes(k))) prefs.push("低体力消耗");
  if (FOOD_KEYWORDS.some(k => lower.includes(k))) prefs.push("美食优先");
  if (CULTURE_KEYWORDS.some(k => lower.includes(k))) prefs.push("文化深度");
  if (NATURE_KEYWORDS.some(k => lower.includes(k))) prefs.push("自然风景");
  if (SHOPPING_KEYWORDS.some(k => lower.includes(k))) prefs.push("购物逛街");
  if (PHOTO_KEYWORDS.some(k => lower.includes(k))) prefs.push("拍照打卡");
  if (BUDGET_KEYWORDS.some(k => lower.includes(k))) prefs.push("预算敏感");

  return prefs;
}

function detectConflicts(turns: ConversationTurnSnapshot[]): { confirmed: string[]; disputed: string[] } {
  const confirmed: string[] = [];
  const disputed: string[] = [];

  const allText = turns.map(t => t.text).join(" ");
  const confirmPatterns = [/好的/, /可以/, /行/, /没问题/, /同意/, /就这样/, /定了/, /确认/];

  // Check if there are disagreements
  const disagreePatterns = [/不要/, /不行/, /不好/, /换/, /算了/, /别/, /不想/, /不喜欢/];

  if (disagreePatterns.some(p => p.test(allText))) {
    disputed.push("目的地偏好存在分歧");
  }

  if (confirmPatterns.some(p => p.test(allText))) {
    confirmed.push("目的地达成初步共识");
  }

  // Check for unresolved questions
  const questionPatterns = [/怎么去/, /住哪/, /多少钱/, /几天/, /什么时候/, /预算/];
  for (const pattern of questionPatterns) {
    if (pattern.test(allText) && turns.some(t => {
      // Check if the question was answered in the same or subsequent turns
      const idx = turns.findIndex(tt => pattern.test(tt.text));
      return idx >= 0;
    })) {
      disputed.push("交通/住宿/预算等细节未确定");
      break;
    }
  }

  return { confirmed, disputed };
}

export function preprocessConversation(
  turns: ConversationTurnSnapshot[],
  version: number
): PreprocessedConversation {
  // Dedup nearby turns
  const deduped = dedupNearbyTurns(turns);

  // Extract all POI names
  const allPOIs = deduped.flatMap(t => extractPOINames(t.text));
  const primaryPOIs = [...new Set(allPOIs)];

  // Extract preferences
  const allText = deduped.map(t => t.text).join(" ");
  const preferences = clusterPreferences(allText);

  // Detect conflicts
  const { confirmed, disputed } = detectConflicts(deduped);

  return {
    turns: deduped,
    primaryPOIs,
    preferences,
    confirmed,
    disputed,
    version,
  };
}

function dedupNearbyTurns(turns: ConversationTurnSnapshot[]): ConversationTurnSnapshot[] {
  const result: ConversationTurnSnapshot[] = [];
  let repeatCount = 0;
  let lastPOI: string | null = null;

  for (const turn of turns) {
    const pois = extractPOINames(turn.text);
    const mainPOI = pois[0] || null;

    if (mainPOI && mainPOI === lastPOI) {
      repeatCount++;
      if (repeatCount >= 2) {
        // Mark as confirmation, skip
        result.push({
          ...turn,
          text: `[确认] ${turn.text}`,
        });
        continue;
      }
    } else {
      repeatCount = 0;
      lastPOI = mainPOI;
    }

    result.push(turn);
  }

  return result;
}

// Build structured discussion text from preprocessed conversation
export function buildStructuredDiscussion(preprocessed: PreprocessedConversation): string {
  const parts: string[] = [];

  if (preprocessed.primaryPOIs.length > 0) {
    parts.push(`【用户提及的目的地】${preprocessed.primaryPOIs.join("、")}`);
  }
  if (preprocessed.preferences.length > 0) {
    parts.push(`【推断的用户偏好】${preprocessed.preferences.join("、")}`);
  }
  if (preprocessed.confirmed.length > 0) {
    parts.push(`【已确认事项】${preprocessed.confirmed.join("、")}`);
  }
  if (preprocessed.disputed.length > 0) {
    parts.push(`【待解决问题】${preprocessed.disputed.join("、")}`);
  }

  parts.push("\n【原始对话】");
  preprocessed.turns.slice(-20).forEach(t => {
    parts.push(`${t.userName}：${t.text}`);
  });

  return parts.join("\n");
}
