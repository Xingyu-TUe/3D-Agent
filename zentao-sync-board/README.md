# 迭代同步看板

按禅道迭代查看每位开发的任务数量和预计工时：未开始、进行中、已完成。页面包含堆叠柱状图，并按约 8 秒从禅道刷新。

默认对应执行 [#588 任务看板](https://zentao.designorder.cn/execution-taskKanban-588-task-order_asc-assignedTo.html)。连接后会列出同一项目下的其他迭代。

## 运行

```bash
cd zentao-sync-board
python3 server.py
```

打开 http://localhost:5173

未配置账号时使用内置演示数据，柱状图、迭代切换和人员筛选都可以先看。

## 连接禅道

在页面填写地址、账号、密码，或用环境变量启动：

```bash
export ZENTAO_BASE_URL=https://zentao.designorder.cn
export ZENTAO_ACCOUNT=你的账号
export ZENTAO_PASSWORD=你的密码
# 可选
export ZENTAO_TOKEN=
export ZENTAO_EXECUTION_ID=588
export ZENTAO_INSECURE_SSL=0
python3 server.py --port 5173
```

服务端调用禅道 REST API v1：

- `POST /api.php/v1/tokens`
- `GET /api.php/v1/executions/{id}/tasks`（自动翻页）
- `GET /api.php/v1/executions/{id}`
- `GET /api.php/v1/projects/{id}/executions`

禅道需要已开启 RESTful API（开源版 16.5+，入口为 `www/api.php`）。页面上的「立即同步」会跳过 8 秒缓存立刻重拉。

账号密码写在本机 `zentao-sync-board/.zentao.local.json`（已 gitignore），接口响应里不会回传密码。

## 统计口径

- 未开始：`wait`
- 进行中：`doing`，以及 `pause`（已暂停）
- 已完成：`done`，以及 `closed`（已关闭）。关闭后指派人变成 `closed` 时，记到完成人
- `cancel` 不进柱状图和合计
- 父任务不与子任务重复计数
- 工时是预计工时 `estimate`。柱状图可在「任务数 / 预估工时」之间切换

## 测试

```bash
cd zentao-sync-board
python3 -m unittest test_board.py
```

## 部署到 Vercel

看板已适配 Vercel：`public/` 静态页 + `api/*.py` Serverless 调用禅道。

### 一键导入（推荐）

1. 打开 [Vercel New Project](https://vercel.com/new)，导入 GitHub 仓库 `3D-Agent`（或你的 fork）。
2. **Root Directory** 设为 `zentao-sync-board`。
3. Framework Preset 选 **Other**（会使用仓库内 `vercel.json` 的 `npm run build`）。
4. 在 **Environment Variables** 添加（Production / Preview 都建议勾选）：

| 变量 | 说明 |
| --- | --- |
| `ZENTAO_BASE_URL` | 默认 `https://zentao.designorder.cn` |
| `ZENTAO_ACCOUNT` | 禅道账号 |
| `ZENTAO_PASSWORD` | 禅道密码 |
| `ZENTAO_EXECUTION_ID` | 可选，默认 `588` |
| `ZENTAO_INSECURE_SSL` | 可选，`1` 跳过 SSL 校验（一般不需要） |

5. Deploy。部署完成后打开站点即可查看柱状图与迭代数据。

未配置账号密码时，线上仍显示**演示数据**，便于先看 UI。

### CLI 部署

```bash
cd zentao-sync-board
npm install
npx vercel login
npx vercel link
npx vercel env add ZENTAO_ACCOUNT
npx vercel env add ZENTAO_PASSWORD
npx vercel --prod
```

线上环境不会把页面里填写的密码写入磁盘；请用 Vercel 环境变量连接禅道。
