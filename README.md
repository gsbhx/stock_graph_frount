# stock_graph_frount v0.3

`stock_graph` A 股多智能体研究平台的 React / TypeScript 决策驾驶舱。

后端：`gsbhx/stock_graph`。旧版页面合同与新业务语义图兼容需要配套安装后端 `fix/dashboard-semantic-compat-20261019` 分支。

## 页面结构

首页按“先结论、后证据”组织：

1. **市场概览**：图谱关系、活跃股票、催化事件、活跃题材；
2. **今日机会驾驶舱**：
   - `ATTACK` 明日进攻；
   - `ROTATION` 轮动潜伏；
   - `INDUSTRY` 长期产业；
3. **研究与报告中心**：运行三套研究工作流，切换 current / PIT，直接查看日报；
4. **全市场原始数据**：Lead Score、题材相关度、角色等底层结构；
5. **原始领涨结构**：明确作为底层证据，不直接等价于“最有潜力”；
6. **Evidence Graph**：事件 / 股票 / 题材关系钻取；
7. **题材全景与角色时间线**。

## 为什么做三套机会排序

前端不再只回答“今天谁最强”，而是拆成三个问题：

```text
ATTACK   → 明天谁最值得进攻观察？
ROTATION → 谁正在接近轮动/回流机会？
INDUSTRY → 哪些公司和产业值得持续跟踪？
```

这些分数来自后端确定性 Opportunity Engine，是筛选排序，不是收益预测。

## current / PIT

研究中心提供两种知识模式：

- `current`：今天补抓到的历史新闻可以按真实 `published_at` 回填历史时间线；
- `pit`：同时约束 `known_at`，晚抓数据不会泄露进当时的历史决策。

## 技术栈

- React 19
- TypeScript
- Vite
- Lucide React

## 安装

建议 Node.js 22：

```bash
npm ci
```

配置：

```bash
cp .env.example .env
```

默认后端：

```env
VITE_API_BASE=http://localhost:8010/api
```

开发：

```bash
npm run dev
```

构建：

```bash
npm run build
```

## v0.3 后端 API

```text
GET  /api/dashboard/{trade_date}/overview
GET  /api/dashboard/{trade_date}/themes
GET  /api/dashboard/{trade_date}/stocks
GET  /api/dashboard/{trade_date}/story
GET  /api/dashboard/stock/{code}/timeline
GET  /api/opportunities/{trade_date}
POST /api/workflows/daily
GET  /api/reports/{trade_date}
```

研究按钮调用：

```json
POST /api/workflows/daily
{
  "trade_date": 20261013,
  "update_rag": true,
  "knowledge_mode": "current"
}
```

## 联调

后端：

```bash
cd stock_graph
source .venv/bin/activate
stock-graph serve --reload
```

前端：

```bash
cd stock_graph_frount
npm run dev
```

访问：

```text
http://localhost:5173
```

## 当前边界

前端已经完成 v0.3 信息架构，但真实研究按钮依赖后端已配置 Neo4j、MySQL、三套 Skill、Embedding（可选）和 Agent CLI。真实环境联调完成之前，本分支保持 Draft PR，不直接合并 main。

## 图谱升级后的兼容与排障（2026-10）

后端新图谱可能把股票-题材关系存为 `RESEARCH_THEME`，把股票角色存为 `PLAYS_ROLE`，不再保证所有交易日都有旧的 `StockThemeState/RoleState`。

此修复支持新旧关系，并把首页五个 API 调用改为分区容错：`/dashboard/{date}/overview`、`themes`、`stocks`、`story`、`/opportunities/{date}`。任何一个接口失败都会明确标注，其他模块仍正常展示。

后端兼容分支会优先读取旧的已验证日状态，缺失时再查询 `Attribution` 和 `RESEARCH_THEME/PLAYS_ROLE`，投影成原有 v0.3 JSON 结构。**不会修改或删除 Neo4j 数据，也不会把没有完成归因的交易日伪装成有数据**。

```bash
# 在 stock_graph 后端仓库
git fetch origin
git switch --track origin/fix/dashboard-semantic-compat-20261019
PYTHONPATH=src python -m stock_graph.cli serve --reload

# 在 stock_graph_frount 前端仓库的另一终端
git fetch origin
 git switch --track origin/fix/dashboard-semantic-compat-20261019
npm ci
npm run dev
```

访问 `/api/dashboard/20261013/overview` 和 `/api/dashboard/20261013/story`，检查实际研究日期是否有数据；若两个接口都返回空，确认 Neo4j 是否有当日 `Attribution` 或 `RESEARCH_THEME`（兼容层无法创造缺失的研究结论）。如果整个页面提示 `Failed to fetch`，还要核实 `VITE_API_BASE`、后端端口和 CORS 配置。
