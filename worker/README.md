# 可选 Cloudflare Workers AI 语义兜底

本游戏默认依靠前端概念匹配即可完整通关。若希望容纳更多自由中文表达，可部署 `worker.js`：

1. 创建 Cloudflare Worker。
2. 添加 Workers AI Binding，变量名必须为 `AI`。
3. 把 `worker.js` 粘贴并部署。
4. 在游戏根目录 `config.js` 中填写：
   `workerEndpoint: "https://你的worker.workers.dev/judge"`
5. 根据实际 GitHub Pages / 自定义域名修改 `ALLOWED_ORIGINS`。

Worker 只提取玩家表达出的概念标签；PASS/PARTIAL/MISS、剧情结果与结局全部由游戏本体决定。
