// 珠海本地 POI 数据库 —— 模拟低延迟 API 响应
// 数据覆盖珠海主要景点、商圈、美食、交通枢纽

export type ZhuhaiPoi = {
  id: string;
  name: string;
  type: string;
  address: string;
  location: string; // "lng,lat"
  adname: string;
  photos: Array<{ title?: string; url: string }>;
  business: {
    opentime_today?: string;
    opentime_week?: string;
    rating?: string;
    business_area?: string;
    cost?: string;
  };
  description?: string;
  tags?: string[];
};

const POI_DB: ZhuhaiPoi[] = [
  {
    id: "zh001",
    name: "长隆海洋王国",
    type: "主题公园;游乐园",
    address: "珠海市香洲区横琴新区富祥湾",
    location: "113.5408,22.1014",
    adname: "横琴新区",
    description: "全球最大的海洋主题公园之一，拥有鲸鲨馆、企鹅馆、白鲸剧场等八大主题区，夜景烟花秀不容错过。",
    tags: ["5A景区", "亲子", "必打卡"],
    photos: [
      { title: "鲸鲨馆", url: "https://picsum.photos/seed/zhuhai-changlong/800/500" },
      { title: "烟花秀", url: "https://picsum.photos/seed/zhuhai-firework/800/500" },
    ],
    business: {
      opentime_today: "10:00-20:00",
      opentime_week: "周一至周日 10:00-20:00",
      rating: "4.9",
      business_area: "横琴新区",
      cost: "¥395/人",
    },
  },
  {
    id: "zh002",
    name: "珠海渔女",
    type: "风景名胜;雕像",
    address: "珠海市香洲区情侣中路海滨公园内",
    location: "113.5889,22.2653",
    adname: "香洲区",
    description: "珠海的城市地标，身高8.7米的巨型石刻雕像，手捧明珠屹立在香炉湾畔，是情侣路最浪漫的打卡点。",
    tags: ["地标", "免费", "夜景"],
    photos: [
      { title: "渔女雕像", url: "https://picsum.photos/seed/zhuhai-yunu/800/500" },
      { title: "香炉湾", url: "https://picsum.photos/seed/zhuhai-xianglu/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放",
      rating: "4.7",
      business_area: "情侣路",
      cost: "免费",
    },
  },
  {
    id: "zh003",
    name: "情侣路",
    type: "风景名胜;海滨浴场",
    address: "珠海市香洲区情侣路沿线",
    location: "113.5830,22.2700",
    adname: "香洲区",
    description: "珠海最美海岸线，全长28公里，串联渔女、珠海大剧院、野狸岛等景点，骑行或漫步皆宜。",
    tags: ["免费", "骑行", "日落"],
    photos: [
      { title: "海岸线", url: "https://picsum.photos/seed/zhuhai-lovers/800/500" },
      { title: "日落", url: "https://picsum.photos/seed/zhuhai-sunset/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放",
      rating: "4.8",
      business_area: "香洲区",
      cost: "免费",
    },
  },
  {
    id: "zh004",
    name: "珠海大剧院",
    type: "文化设施;剧院",
    address: "珠海市香洲区野狸岛海燕路",
    location: "113.5910,22.2760",
    adname: "香洲区",
    description: "昵称\"日月贝\"，中国唯一建在海岛上的歌剧院，由一大一小两个贝壳状建筑组成，夜景灯光璀璨。",
    tags: ["地标", "建筑", "演出"],
    photos: [
      { title: "日月贝", url: "https://picsum.photos/seed/zhuhai-opera/800/500" },
      { title: "夜景", url: "https://picsum.photos/seed/zhuhai-beanight/800/500" },
    ],
    business: {
      opentime_today: "09:00-21:00",
      opentime_week: "周二至周日 09:00-21:00，周一闭馆",
      rating: "4.6",
      business_area: "野狸岛",
      cost: "参观免费，演出另计",
    },
  },
  {
    id: "zh005",
    name: "圆明新园",
    type: "风景名胜;园林",
    address: "珠海市香洲区兰埔路164号",
    location: "113.5380,22.2390",
    adname: "香洲区",
    description: "按北京圆明园1:1比例精选四十景中的十八景修建，融古典皇家建筑群、江南古典园林和西洋建筑于一体。",
    tags: ["4A景区", "历史", "拍照"],
    photos: [
      { title: "大水法", url: "https://picsum.photos/seed/zhuhai-yuanming/800/500" },
      { title: "福海", url: "https://picsum.photos/seed/zhuhai-fuhai/800/500" },
    ],
    business: {
      opentime_today: "09:00-17:30",
      opentime_week: "周一至周日 09:00-17:30",
      rating: "4.5",
      business_area: "兰埔",
      cost: "免费",
    },
  },
  {
    id: "zh006",
    name: "外伶仃岛",
    type: "风景名胜;海岛",
    address: "珠海市香洲区外伶仃岛",
    location: "114.0400,22.2700",
    adname: "香洲区",
    description: "万山群岛中最具代表性的海岛，沙滩细腻、海水清澈，可以潜水、海钓，岛上有独特的伶仃峰石景。",
    tags: ["海岛", "潜水", "度假"],
    photos: [
      { title: "伶仃峰", url: "https://picsum.photos/seed/zhuhai-lingding/800/500" },
      { title: "海滩", url: "https://picsum.photos/seed/zhuhai-beach/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放（船班有限制）",
      rating: "4.7",
      business_area: "万山群岛",
      cost: "船票¥120往返",
    },
  },
  {
    id: "zh007",
    name: "东澳岛",
    type: "风景名胜;海岛",
    address: "珠海市香洲区东澳岛",
    location: "113.7100,22.0200",
    adname: "香洲区",
    description: "拥有\"钻石沙滩\"南沙湾，沙质洁白细腻，岛上保留有清代烽火台和摩崖石刻，适合两天一夜慢游。",
    tags: ["海岛", "沙滩", "度假"],
    photos: [
      { title: "南沙湾", url: "https://picsum.photos/seed/zhuhai-dongao/800/500" },
      { title: "烽火台", url: "https://picsum.photos/seed/zhuhai-fenghuo/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放（船班有限制）",
      rating: "4.6",
      business_area: "万山群岛",
      cost: "船票¥100往返",
    },
  },
  {
    id: "zh008",
    name: "野狸岛",
    type: "风景名胜;公园",
    address: "珠海市香洲区情侣路野狸岛",
    location: "113.5915,22.2765",
    adname: "香洲区",
    description: "珠海市区最近的海岛公园，通过海燕桥与陆地相连，岛上有日月贝大剧院、海韵城商业区，适合散步骑行。",
    tags: ["免费", "骑行", "夜景"],
    photos: [
      { title: "海燕桥", url: "https://picsum.photos/seed/zhuhai-yeli/800/500" },
      { title: "海韵城", url: "https://picsum.photos/seed/zhuhai-haiyun/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放",
      rating: "4.5",
      business_area: "情侣路",
      cost: "免费",
    },
  },
  {
    id: "zh009",
    name: "海泉湾度假区",
    type: "度假村;温泉",
    address: "珠海市金湾区平沙镇海泉湾路",
    location: "113.1800,22.0800",
    adname: "金湾区",
    description: "集海洋温泉、主题乐园、酒店于一体的综合度假区，拥有罕见的海洋溴盐温泉，适合家庭周末度假。",
    tags: ["温泉", "亲子", "度假"],
    photos: [
      { title: "海洋温泉", url: "https://picsum.photos/seed/zhuhai-haiquan/800/500" },
      { title: "神秘岛", url: "https://picsum.photos/seed/zhuhai-shenmidao/800/500" },
    ],
    business: {
      opentime_today: "09:30-23:00",
      opentime_week: "周一至周日 09:30-23:00",
      rating: "4.4",
      business_area: "平沙镇",
      cost: "温泉¥198/人",
    },
  },
  {
    id: "zh010",
    name: "淇澳岛",
    type: "风景名胜;海岛",
    address: "珠海市香洲区淇澳岛",
    location: "113.6500,22.4200",
    adname: "香洲区",
    description: "通过淇澳大桥与市区相连的生态海岛，有红树林保护区、白石街古村落，适合骑行和观鸟。",
    tags: ["免费", "生态", "骑行"],
    photos: [
      { title: "红树林", url: "https://picsum.photos/seed/zhuhai-qiao/800/500" },
      { title: "白石街", url: "https://picsum.photos/seed/zhuhai-baishi/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放",
      rating: "4.3",
      business_area: "唐家湾",
      cost: "免费",
    },
  },
  {
    id: "zh011",
    name: "石景山公园",
    type: "风景名胜;公园",
    address: "珠海市香洲区吉大海滨路",
    location: "113.5850,22.2600",
    adname: "香洲区",
    description: "位于香炉湾畔的城市公园，山顶可俯瞰珠海全景和澳门风光，有索道和滑道上下山。",
    tags: ["观景", "索道", "澳门全景"],
    photos: [
      { title: "山顶观景", url: "https://picsum.photos/seed/zhuhai-shijing/800/500" },
      { title: "滑道", url: "https://picsum.photos/seed/zhuhai-huadao/800/500" },
    ],
    business: {
      opentime_today: "08:00-18:00",
      opentime_week: "周一至周日 08:00-18:00",
      rating: "4.4",
      business_area: "吉大",
      cost: "免费（索道¥60）",
    },
  },
  {
    id: "zh012",
    name: "湾仔海鲜街",
    type: "餐饮;海鲜",
    address: "珠海市香洲区湾仔海鲜街",
    location: "113.5350,22.2150",
    adname: "香洲区",
    description: "珠海最著名的海鲜市场，一楼挑选鲜活海鲜，二楼餐厅加工，对面就是澳门夜景，边吃边看。",
    tags: ["海鲜", "夜景", "澳门对岸"],
    photos: [
      { title: "海鲜档", url: "https://picsum.photos/seed/zhuhai-wanzai/800/500" },
      { title: "澳门夜景", url: "https://picsum.photos/seed/zhuhai-macauview/800/500" },
    ],
    business: {
      opentime_today: "10:00-23:00",
      opentime_week: "周一至周日 10:00-23:00",
      rating: "4.5",
      business_area: "湾仔",
      cost: "人均¥150",
    },
  },
  {
    id: "zh013",
    name: "横琴励骏庞都广场",
    type: "购物;广场",
    address: "珠海市横琴新区横琴口岸对面",
    location: "113.5450,22.1350",
    adname: "横琴新区",
    description: "葡式建筑风格的商业综合体，紧邻横琴口岸，集购物、餐饮、娱乐于一体，夜晚灯光秀极具异域风情。",
    tags: ["购物", "葡式建筑", "夜景"],
    photos: [
      { title: "广场夜景", url: "https://picsum.photos/seed/zhuhai-pangdu/800/500" },
      { title: "建筑", url: "https://picsum.photos/seed/zhuhai-building/800/500" },
    ],
    business: {
      opentime_today: "10:00-22:00",
      opentime_week: "周一至周日 10:00-22:00",
      rating: "4.3",
      business_area: "横琴口岸",
      cost: "免费",
    },
  },
  {
    id: "zh014",
    name: "唐家湾古镇",
    type: "风景名胜;古镇",
    address: "珠海市香洲区唐家湾镇",
    location: "113.6100,22.3600",
    adname: "香洲区",
    description: "百年历史的岭南古镇，保留有大量民国建筑，是唐绍仪、唐国安等名人故居所在地，文艺气息浓厚。",
    tags: ["古镇", "民国建筑", "免费"],
    photos: [
      { title: "古镇街道", url: "https://picsum.photos/seed/zhuhai-tangjia/800/500" },
      { title: "名人故居", url: "https://picsum.photos/seed/zhuhai-guju/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放",
      rating: "4.4",
      business_area: "唐家湾",
      cost: "免费",
    },
  },
  {
    id: "zh015",
    name: "珠海御温泉",
    type: "度假村;温泉",
    address: "珠海市斗门区斗门镇黄杨山",
    location: "113.1800,22.2000",
    adname: "斗门区",
    description: "日式露天温泉度假村，24小时开放，有草药泉、酒泉、咖啡泉等30多种汤池，配套日式客栈住宿。",
    tags: ["温泉", "日式", "24小时"],
    photos: [
      { title: "露天温泉", url: "https://picsum.photos/seed/zhuhai-yuwenquan/800/500" },
      { title: "日式客栈", url: "https://picsum.photos/seed/zhuhai-ryokan/800/500" },
    ],
    business: {
      opentime_today: "24小时",
      opentime_week: "24小时",
      rating: "4.6",
      business_area: "斗门镇",
      cost: "¥168/人",
    },
  },
  {
    id: "zh016",
    name: "珠澳海湾游",
    type: "游船;观光",
    address: "珠海市香洲区湾仔旅游码头",
    location: "113.5320,22.2120",
    adname: "香洲区",
    description: "乘船游览珠澳两岸风光，近距离观赏港珠澳大桥、澳门旅游塔、新葡京等地标，夜航尤其推荐。",
    tags: ["游船", "港珠澳大桥", "夜景"],
    photos: [
      { title: "港珠澳大桥", url: "https://picsum.photos/seed/zhuhai-bridge/800/500" },
      { title: "夜航", url: "https://picsum.photos/seed/zhuhai-nightcruise/800/500" },
    ],
    business: {
      opentime_today: "10:00-22:00",
      opentime_week: "日航10:00-17:00，夜航19:00-22:00",
      rating: "4.5",
      business_area: "湾仔",
      cost: "¥198/人",
    },
  },
  {
    id: "zh017",
    name: "横琴创新方",
    type: "娱乐;主题乐园",
    address: "珠海市横琴新区天羽道111号",
    location: "113.5350,22.1150",
    adname: "横琴新区",
    description: "大型文化娱乐综合体，内有狮门娱乐天地（电影IP室内乐园）、国家地理探险家中心等主题场馆。",
    tags: ["室内乐园", "亲子", "电影IP"],
    photos: [
      { title: "狮门天地", url: "https://picsum.photos/seed/zhuhai-lionsgate/800/500" },
      { title: "国家地理", url: "https://picsum.photos/seed/zhuhai-natgeo/800/500" },
    ],
    business: {
      opentime_today: "10:00-21:00",
      opentime_week: "周一至周日 10:00-21:00",
      rating: "4.4",
      business_area: "横琴新区",
      cost: "¥180/人",
    },
  },
  {
    id: "zh018",
    name: "华发商都",
    type: "购物;购物中心",
    address: "珠海市香洲区珠海大道8号",
    location: "113.5200,22.2350",
    adname: "香洲区",
    description: "珠海规模最大、档次最高的购物中心之一，汇集国际品牌和美食餐厅，中庭音乐喷泉是亮点。",
    tags: ["购物", "美食", "喷泉"],
    photos: [
      { title: "中庭", url: "https://picsum.photos/seed/zhuhai-huafa/800/500" },
      { title: "音乐喷泉", url: "https://picsum.photos/seed/zhuhai-fountain/800/500" },
    ],
    business: {
      opentime_today: "10:00-22:00",
      opentime_week: "周日至周四 10:00-22:00，周五六 10:00-22:30",
      rating: "4.5",
      business_area: "南屏",
      cost: "免费",
    },
  },
  {
    id: "zh019",
    name: "金湾情侣路",
    type: "风景名胜;海滨",
    address: "珠海市金湾区航空新城",
    location: "113.3500,22.0800",
    adname: "金湾区",
    description: "金湾新区版的情侣路，人少景美，沿途有白藤湖湿地公园、金湾高尔夫，是看飞机起降的绝佳位置。",
    tags: ["免费", "人少", "飞机起降"],
    photos: [
      { title: "海滨", url: "https://picsum.photos/seed/zhuhai-jinwan/800/500" },
      { title: "湿地公园", url: "https://picsum.photos/seed/zhuhai-wetland/800/500" },
    ],
    business: {
      opentime_today: "全天开放",
      opentime_week: "全天开放",
      rating: "4.3",
      business_area: "航空新城",
      cost: "免费",
    },
  },
  {
    id: "zh020",
    name: "珠海博物馆",
    type: "文化设施;博物馆",
    address: "珠海市香洲区海虹路88号",
    location: "113.5780,22.2780",
    adname: "香洲区",
    description: "2020年新建成的现代化博物馆，建筑造型如海浪叠翠，常设珠海历史、民俗文化、书画艺术等展览。",
    tags: ["免费", "文化", "建筑"],
    photos: [
      { title: "外观", url: "https://picsum.photos/seed/zhuhai-museum/800/500" },
      { title: "展厅", url: "https://picsum.photos/seed/zhuhai-exhibit/800/500" },
    ],
    business: {
      opentime_today: "09:00-17:00",
      opentime_week: "周二至周日 09:00-17:00，周一闭馆",
      rating: "4.4",
      business_area: "香洲区",
      cost: "免费（需预约）",
    },
  },
];

export function searchZhuhaiPoi(keywords: string): ZhuhaiPoi | undefined {
  const lowerKeywords = keywords.toLowerCase();
  return POI_DB.find((poi) =>
    poi.name.toLowerCase().includes(lowerKeywords) ||
    poi.tags?.some((tag) => tag.toLowerCase().includes(lowerKeywords)) ||
    poi.type.toLowerCase().includes(lowerKeywords),
  );
}

export function searchZhuhaiPois(keywords: string, limit = 10): ZhuhaiPoi[] {
  const lowerKeywords = keywords.toLowerCase();
  const matches = POI_DB.filter((poi) =>
    poi.name.toLowerCase().includes(lowerKeywords) ||
    poi.tags?.some((tag) => tag.toLowerCase().includes(lowerKeywords)) ||
    poi.type.toLowerCase().includes(lowerKeywords) ||
    poi.adname.toLowerCase().includes(lowerKeywords),
  );
  return matches.slice(0, limit);
}

export function getZhuhaiPoiByName(name: string): ZhuhaiPoi | undefined {
  return POI_DB.find((poi) => poi.name === name);
}

export { POI_DB };
