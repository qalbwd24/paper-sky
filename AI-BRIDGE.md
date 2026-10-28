# DeepSeek 双层 AI（独立实验分支）

本分支复用纸翼现有 **60Hz 服务端物理** 与 **Three.js 联机画面**。不是截图/视觉模型：AI 读取游戏内数值状态；不需要 GPU 或浏览器截屏。**不修改 main，也不触碰生产服务器。**

## 工作方式

1. 房主本地启动 `online/server.cjs`，创建房间，点击“补满测试 AI”。
2. 勾选“DeepSeek 双层决策”。房主浏览器中的 AI 代理继续使用现有 `PaperPilot` / `PaperPursuit` 作安全底座。
3. 慢层 `/chase/api/ai/plan` 约每 2.4 秒生成战略（追击/逃离/巡航，左右偏好、高度、速度）。
4. 快层 `/chase/api/ai/judge` 每 250ms 尝试一次新操作，**每次携带当前 `state.plan`**，因此慢层计划会影响快层判断。
5. 快模型返回有时效性的转向/俯仰/加减速；过期、API 故障或碰撞风险时自动退回原有规则 AI。所有物理与碰撞仍由游戏服务器决定。

目前的 AI 代理由房主浏览器运行。因此关掉房主页面，AI 代理仍会停止；后续可以将同一模型桥迁入服务端常驻 worker。不要把当前版本称为“无头 AI 服务端”。

## Windows PowerShell 本地启动

确保 Node.js >=22。克隆分支并进入项目：

```powershell
git clone -b feature/deepseek-ai https://github.com/qalbwd24/paper-sky.git
cd paper-sky\online
npm ci --ignore-scripts
$env:AI_BRIDGE_ENABLED="1"
$env:DEEPSEEK_API_KEY="你的DeepSeek API Key"
node server.cjs
```

浏览器访问 http://127.0.0.1:8770/chase/ ，创建房间，补满测试 AI，勾选模型控制，选追击机，然后开始游戏。可以在房间面板看到快/慢层决策数、延迟、回退情况。

**请勿把 API Key 放到 HTML/JS、GitHub 或任何提交中**；只在启动进程的环境变量中配置。关闭终端会结束该进程。

如果没有 Key，照旧使用普通测试 AI：`node server.cjs`，模型选项会被禁用。

## 可调整参数

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `AI_BRIDGE_ENABLED` | `0` | 显式允许远程 API 消耗 |
| `DEEPSEEK_API_KEY` | 空 | 仅由 Node.js 后端读取 |
| `FAST_MODEL` | `deepseek-flash` | 快模型，禁用思考 |
| `PLANNER_MODEL` | `deepseek-v4-pro` | 慢模型，默认低思考力度 |
| `FAST_BASE_URL` / `PLANNER_BASE_URL` | `https://api.deepseek.com` | 可分别改为兼容的服务 |
| `FAST_API_KEY` / `PLANNER_API_KEY` | 共享 DeepSeek Key | 可分别配置凭据 |
| `FAST_TIMEOUT_MS` | `900` | 快层 API 超时；界面控制不停 |
| `PLANNER_TIMEOUT_MS` | `4500` | 慢层 API 超时 |
| `PLANNER_THINKING` | `1` | 设 `0` 关闭慢模型思考 |
| `AI_MAX_CALLS_PER_MIN` | `120` | 全局 API 调用预算上限 |

模型名依照 2026-10 的 DeepSeek 文档；Pro 与 Flash 实际服务可能升级或路由，性能须通过真实请求测量。默认调用频率是**尝试频率**，不是模型一定能在 250ms 响应。实际快层如果 >650ms 才有结果，就不会持续使用过期动作。

测试：`node --test online/decision-bridge.test.cjs`（在仓库根目录运行），以及 `cd online; npm test`。测试不请求真实 DeepSeek，不产生 API 费用。

安全限制：服务端校验登录 Cookie、Origin、房间代理归属、单 bot 频率及总体调用预算。桥只返回经过约束的指令，不能跳过 60Hz 物理或替换现有权限系统。
