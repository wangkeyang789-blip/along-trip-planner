# 部署指南

## 环境变量清单

复制 `.env.local` 并填入你的 API 密钥：

```bash
# AI 服务（二选一，推荐 DeepSeek）
OPENAI_API_KEY=sk-your-deepseek-key          # DeepSeek API Key
# 或 DASHSCOPE_API_KEY=sk-your-dashscope-key  # 阿里云 DashScope（旧版）

# 语音识别（SiliconFlow 用于本地录音转写）
SILICONFLOW_API_KEY=sk-your-siliconflow-key

# 讯飞实时语音转写
APPID=your-xfyun-appid
APIKey=your-xfyun-apikey

# 高德地图
AMAP_WEB_SERVICE_KEY=your-amap-web-key
NEXT_PUBLIC_AMAP_JS_KEY=your-amap-js-key
NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=your-amap-security-code

# 站点地址（部署时必须设置）
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**⚠️ 安全提醒**：
- `NEXT_PUBLIC_` 前缀的变量会暴露到浏览器（高德 JS SDK 需要）
- 服务端密钥（DeepSeek、讯飞）仅在服务器端使用，不会泄露

---

## 方案一：Vercel 部署（推荐，最简单）

1. 访问 https://vercel.com/new，导入你的 GitHub 仓库
2. 在 Environment Variables 中填入上述变量
3. 点击 Deploy，等待自动构建
4. 绑定自定义域名（可选）：Settings → Domains

**免费 Hobby 计划限制**：
- 每月 100GB 带宽
- 函数执行时间 10s（AI 规划可能超时，建议升级 Pro）
- 每日 10000 次函数调用

---

## 方案二：云服务器 + Docker（完全控制）

### 1. 购买云服务器
推荐：阿里云 ECS / 腾讯云 CVM / AWS EC2
配置：1 核 2G 起步，建议 2 核 4G

### 2. 安装 Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
```

### 3. 构建并运行
```bash
# 克隆代码
git clone https://github.com/IceyOrange/along-trip-planner.git
cd along-trip-planner

# 构建镜像（传入 NEXT_PUBLIC 变量）
docker build \
  --build-arg NEXT_PUBLIC_AMAP_JS_KEY=你的JSKey \
  --build-arg NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=你的安全码 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  -t along-trip-planner .

# 运行容器
docker run -d \
  --name trip-planner \
  -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -e SILICONFLOW_API_KEY=sk-your-key \
  -e APPID=your-appid \
  -e APIKey=your-apikey \
  -e AMAP_WEB_SERVICE_KEY=your-key \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  --restart unless-stopped \
  along-trip-planner
```

### 4. 配置 Nginx + HTTPS（推荐）
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 方案三：Railway / Render（一键部署）

### Railway
1. 访问 https://railway.app/new，连接 GitHub
2. 添加环境变量
3. 自动部署

### Render
1. 访问 https://dashboard.render.com，New Web Service
2. 连接 GitHub 仓库
3. Build Command: `npm ci && npm run build`
4. Start Command: `npm start`
5. 添加环境变量

---

## 部署后验证

1. 访问 `/api/amap/status` — 确认高德 API 配置正确
2. 访问首页 — 确认地图加载正常
3. 点击麦克风按钮 — 确认讯飞 ASR 工作
4. 说"我想去珠海长隆" — 确认 AI 规划返回路线

## 常见问题

**Q: 地图不显示？**
A: 检查 `NEXT_PUBLIC_AMAP_JS_KEY` 和 `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE` 是否正确。

**Q: AI 规划返回错误？**
A: 检查 `OPENAI_API_KEY`（DeepSeek）或 `DASHSCOPE_API_KEY` 是否有效。

**Q: 语音识别没反应？**
A: 检查 `APPID` 和 `APIKey`（讯飞）。注意必须是实时语音转写 API，不是语音听写。

**Q: 部署后 POI 搜索失败？**
A: 确保 `NEXT_PUBLIC_SITE_URL` 设置为实际域名，不能是 localhost。
