# 地狱裂隙 Hell Rift

暗黑哥特风格 **RogueLite · 幸存者（Vampire Survivors）玩法** 微信小游戏。
一局 5 分钟、单手操作、自动攻击、海量怪物、爽快成长、大量 Build 组合、Boss 挑战。

- 纯 **原生 JavaScript + Canvas** 开发，**不使用** Phaser / Laya / Egret 等第三方游戏引擎。
- 全部视觉元素 **程序化绘制**，**无任何第三方版权素材**，原创世界观。
- **模块化架构**，同一份代码同时支持 **微信小游戏** 与 **浏览器 H5**（通过平台适配层）。

---

## 快速开始

### 浏览器运行（开发调试）

```bash
npm run dev
# 打开 http://localhost:8080
```

零依赖静态服务器（`scripts/dev-server.js`）。桌面浏览器可用鼠标按住左半屏模拟摇杆。

### 微信小游戏运行（推荐：导入打包包）

微信开发者工具对原生 ES Module 支持不稳定，**请务必导入打包后的单文件包**，
不要直接导入含有 `src/` 的源码目录。

1. 下载 [`dist/HellRift.zip`](./dist/HellRift.zip) 并解压
2. 微信开发者工具 → 新建「小游戏」
3. 目录选择解压出来的 `HellRift/`（里面只有 `game.js` / `game.json` / `project.config.json`，**没有** `src/`）
4. AppID 选「测试号」→ 创建 / 编译

若之前导入过旧项目，请先关闭旧项目，换一个新目录重新导入，避免缓存到旧的动态 `import()` 代码。

本地重新打包：

```bash
npm install
npm run build:wechat   # 生成 game.js + dist/HellRift.zip
```

### 校验与自测

```bash
npm run check   # 递归语法检查 src/
node scripts/headless-sim.js   # 无头运行时全流程 + 性能自测
```

`headless-sim.js` 会 mock Canvas/DOM，真实驱动主循环，跑通
「主菜单 → 战斗 → 升级三选一 → 精英 → Boss → 结算」，并采样满屏千怪时的单帧耗时。

---

## 操作方式

- **左手虚拟摇杆**：控制移动，人物朝移动方向前进（浮动摇杆，按下左半屏任意处即出现）。
- **自动攻击**：无需点击，普通攻击自动挥剑攻击最近敌人；获得的技能自动释放。
- **升级三选一**：升级时暂停，弹出 3 张卡片（技能获取/升级 或 属性强化），点击选择。
- **右上暂停按钮**：暂停/继续。

---

## 目录结构

```
src/
  Game.js              核心：主循环(requestAnimationFrame) + 输入 + 场景装配
  SceneManager.js      场景管理器（菜单/游戏/结算）
  Config/
    GameConfig.js      全局配置（数值/曲线/性能/调试），不写死数值
  Data/                数据驱动（JSON 化，方便扩展）
    classes.js         职业（流浪骑士）
    enemies.js         怪物表 + 精英修正 + 难度缩放曲线
    skills.js          技能表 + 被动表 + Build 组合
    equipment.js       装备部位/品质/词条（预留）
  Player/
    Player.js          玩家实体（移动/生命/吸血/等级）
    Stats.js           属性汇总与最终计算
    ExpOrb.js          经验球实体
    ExpSystem.js       经验系统（掉落/吸附/指数升级）
    Equipment.js       装备随机生成/背包存档（预留接口）
  Enemy/
    Enemy.js           怪物实体（对象池）
    EnemySystem.js     刷怪曲线/AI/精英/Boss/接触伤害/难度缩放
    EnemyRenderer.js   怪物程序化绘制
    Boss.js            Boss（裂隙领主）阶段与技能：冲锋/召唤/范围
  Bullet/
    Bullet.js          投射物实体（对象池，穿透/爆炸）
    BulletSystem.js    投射物更新与碰撞结算
  Skill/
    Skill.js           技能实例（等级/冷却）
    SkillSystem.js     技能行为分派 + Build 组合 + 地面区域
    GroundZone.js      地面持续区域（毒云）
    UpgradeManager.js  升级三选一选项生成与应用
  FX/
    EffectSystem.js    瞬时特效（挥砍/爆炸/闪电/光环/预警）+ 飘字池
    DamageText.js      伤害飘字
  UI/
    HUD.js             顶部血/经验/等级/时间/击杀 + 暂停 + 技能栏
    Joystick.js        左手虚拟摇杆
    MainMenu.js        主界面
    LevelUpUI.js       升级三选一界面
    BossBar.js         Boss 血条 + 降临横幅
    ResultUI.js        结算页面
    UIHelpers.js       UI 公共工具
  Scenes/
    MenuScene.js / GameScene.js / ResultScene.js
  Utils/
    Platform.js        平台适配（微信 wx / 浏览器）
    Renderer.js        Canvas 高 DPI 适配与清屏
    Camera.js          跟随摄像机（世界↔屏幕坐标）
    Background.js      无限滚动暗黑地面（岩石/裂缝/岩浆/尸骨/火焰）
    QuadTree.js        四叉树空间划分
    CollisionSystem.js 每帧重建四叉树，提供范围/最近查询
    ObjectPool.js      通用对象池
    MathUtils.js       数学工具
    EventBus.js        事件总线（系统解耦）
  Assets/              说明文件（默认无素材，全程序化绘制）
game.js                微信小游戏入口
game.json              微信小游戏配置
project.config.json    微信开发者工具项目配置
index.html             浏览器 H5 入口
scripts/               dev-server / 语法检查 / 无头自测
```

---

## 游戏流程

启动 → **角色选择大厅**（德鲁伊 / 猎人 / 法师，左右滑动）→ 开始冒险 → 进入地图 →
角色出生 → 怪物不断刷新 → 自动攻击 → 击杀获得经验 → 升级三选一（职业专属技能池）→
技能越来越强 → 精英出现 → 5 分钟 Boss 降临 → 击杀 Boss → 奖励结算 → 返回角色选择。

职业数据配置化存放于 `src/Config/Character.json`（德鲁伊召唤流 / 猎人远程暴击 / 法师 AOE 爆发），
每个职业独立技能池 + 公共被动，并带角色存档（等级、Boss 击杀、金币等）。预留圣骑士、死灵等扩展位。

---

## 系统要点

### 数值与刷怪（爽感）
- 刷怪按时间插值目标存活数：**第 1 分钟约 80 只，第 5 分钟约 1000 只**（`GameConfig.spawn.curve`）。
- 怪物属性随时间缩放（`enemies.js` 的 `DIFFICULTY_SCALE`），保证后期不软。
- 升级经验采用 **指数增长**（`GameConfig.exp`）。

### 技能与 Build
第一版技能：普通攻击(挥剑)、旋风、火球、闪电链、冰环、毒云、飞剑，每个 **1~5 级**
（升级 → 伤害/范围/数量↑、CD↓）。技能可组合，内置示例 Build 协同（见 `skills.js` 的 `BUILD_SYNERGIES`），
如「炼狱瘟疫（火球+毒云）」「极地风暴（冰环+闪电）」「剑刃风暴（旋风+暴击）」。

### Boss（裂隙领主）
多阶段（随血量切换，提升速度/解锁技能）、技能（冲锋 / 召唤小怪 / 范围爆发）、
血条 UI、降临横幅、死亡镜头震动，击杀掉落宝箱（触发装备系统）。

### 性能
- **对象池**：怪物 / 子弹 / 经验球 / 特效 / 飘字，避免高频 GC。
- **四叉树**：每帧重建，加速「技能/子弹 vs 海量怪物」的范围与最近查询。
- **视口剔除**：仅绘制/结算可视范围附近对象；远离玩家的普通怪自动回收。
- **主循环**：`requestAnimationFrame` + dt 上限钳制，避免卡顿后大跳。

### 装备系统（预留）
`Data/equipment.js` + `Player/Equipment.js` 已定义 6 部位、5 档品质、随机词条与本地存档接口，
胜利结算已接入「掉落并装备一件随机装备」，可平滑扩展为长期养成。

---

## 扩展指南（新增内容无需改核心逻辑）

- **加怪物**：在 `Data/enemies.js` 增加一条数据（含 `shape`/`weight`/`minTime`）。
- **加技能**：在 `Data/skills.js` 增加定义（复用现有 `type` 行为或新增行为分派）。
- **调数值**：全部集中在 `Config/GameConfig.js` 与 `Data/*`，不在业务代码写死。

## License

MIT
