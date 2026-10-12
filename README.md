# stock_graph_frount

`stock_graph` 的独立 React / TypeScript 前端。

后端仓库：[`gsbhx/stock_graph`](https://github.com/gsbhx/stock_graph)

> 仓库名沿用 `frount`，代码内部按正常 frontend/web 命名。

## 当前页面（v0.2.1）

- 今日市场概览
- 今日市场故事图：`Event → Theme → Stock`
- 题材结构 / 活跃度
- 股票角色演化时间线
- Demo / Neo4j 后端双模式兼容

后续页面：题材生命周期、事件扩散、龙头层级、归因候选竞争、证据抽屉、前期核心回流、LangGraph 运行审计。

## 技术栈

- React 19
- TypeScript
- Vite
- Lucide React

## 安装

建议 Node.js 22 LTS：

```bash
git clone git@github.com:gsbhx/stock_graph_frount.git
cd stock_graph_frount

npm install
```

## 配置后端地址

```bash
cp .env.example .env
```

默认：

```env
VITE_API_BASE=http://localhost:8010/api
```

如果后端部署在其他机器，改成对应地址即可。

## 开发启动

先确认后端已运行：

```text
http://localhost:8010/api/health
```

然后：

```bash
npm run dev
```

默认页面：

```text
http://localhost:5173
```

## 构建

```bash
npm run build
```

输出：

```text
dist/
```

预览生产构建：

```bash
npm run preview
```

## Docker

```bash
docker build \
  --build-arg VITE_API_BASE=http://localhost:8010/api \
  -t stock-graph-frount .
docker run --rm -p 5173:80 stock-graph-frount
```

## 后端 API 约定

当前使用：

```text
GET /api/dashboard/{trade_date}/overview
GET /api/dashboard/{trade_date}/themes
GET /api/dashboard/{trade_date}/story
GET /api/dashboard/stock/{code}/timeline
```

API 基地址集中在：

```text
src/api.ts
```

不要在组件内部硬编码后端 Host。

## 本地联调

终端 1：后端

```bash
cd stock_graph
source .venv/bin/activate
stock-graph serve --reload
```

终端 2：前端

```bash
cd stock_graph_frount
npm run dev
```

然后访问 `http://localhost:5173`。
