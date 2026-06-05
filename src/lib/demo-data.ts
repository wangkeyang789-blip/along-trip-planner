import type {
  ChoiceOption,
  Member,
  Place,
  Preference,
  RouteVariant,
} from "@/lib/types";

export const demoMembers: Member[] = [
  {
    id: "m1",
    name: "林澈",
    initials: "LC",
    color: "#7167f6",
    isSpeaking: true,
  },
  { id: "m2", name: "夏雨", initials: "XY", color: "#ff8c65" },
  { id: "m3", name: "周野", initials: "ZY", color: "#24b59f", isMuted: true },
  { id: "m4", name: "AI 记录员", initials: "AI", color: "#151c3b" },
];

export const demoPlaces: Place[] = [
  {
    id: "forbidden-city",
    name: "故宫博物院",
    category: "人文古迹",
    area: "东城区",
    marker: "1",
    accent: "#7167f6",
    position: { x: 43, y: 35 },
    description: "真实图片、开放时间与地点详情将在接入高德后显示。",
    sourceStatus: "pending",
  },
  {
    id: "shichahai",
    name: "什刹海",
    category: "风景名胜",
    area: "西城区",
    marker: "2",
    accent: "#ff8c65",
    position: { x: 31, y: 53 },
    description: "路线时长、交通状况与地点详情将在接入高德后显示。",
    sourceStatus: "pending",
  },
  {
    id: "drum-tower",
    name: "鼓楼",
    category: "人文古迹",
    area: "东城区",
    marker: "3",
    accent: "#24b59f",
    position: { x: 48, y: 67 },
    description: "地点详情仅展示后续由高德接口真实返回的数据。",
    sourceStatus: "pending",
  },
  {
    id: "temple-of-heaven",
    name: "天坛公园",
    category: "风景名胜",
    area: "东城区",
    marker: "4",
    accent: "#2d7ff9",
    position: { x: 70, y: 75 },
    description: "地点详情仅展示后续由高德接口真实返回的数据。",
    sourceStatus: "pending",
  },
];

export const demoRoutes: RouteVariant[] = [
  {
    id: "balanced",
    name: "平衡路线",
    label: "当前建议",
    description: "兼顾团队已确认的人文体验与减少折返需求",
    color: "#7167f6",
    placeIds: ["forbidden-city", "shichahai", "drum-tower"],
  },
  {
    id: "compact",
    name: "紧凑路线",
    label: "更少折返",
    description: "优先选择地理位置更集中的地点组合",
    color: "#24b59f",
    placeIds: ["shichahai", "drum-tower", "forbidden-city"],
  },
  {
    id: "classic",
    name: "经典路线",
    label: "更多地标",
    description: "加入更多经典地点，实际路线待高德计算",
    color: "#ff8c65",
    placeIds: ["forbidden-city", "temple-of-heaven", "drum-tower"],
  },
];

export const demoPreferences: Preference[] = [
  { id: "culture", label: "人文古迹", weight: 5 },
  { id: "walk", label: "减少步行", weight: 4 },
  { id: "food", label: "本地餐饮", weight: 3 },
];

export const demoChoices: ChoiceOption[] = [
  {
    id: "landmark",
    label: "经典地标",
    description: "优先确认必去地点",
    icon: "landmark",
  },
  {
    id: "compact",
    label: "地点集中",
    description: "减少折返和通勤",
    icon: "route",
  },
  {
    id: "food",
    label: "先定用餐",
    description: "围绕午餐安排路线",
    icon: "utensils",
  },
];
