/**
 * GameConfig.js
 * 全局游戏配置。所有可调数值集中在此，禁止在业务代码中写死。
 * 设计逻辑区分为：世界 / 相机 / 玩家 / 刷怪 / 经验 / 性能 / 调试。
 */

export const GameConfig = {
  // 一局时长（秒），5 分钟
  matchDuration: 300,

  // 设计分辨率（逻辑坐标）。渲染层会按屏幕做等比缩放适配。
  design: {
    width: 720,
    height: 1280,
  },

  world: {
    // 逻辑上无限世界，这里只用于地面 tile 尺寸
    tileSize: 128,
    // 地面装饰密度（每个 tile 随机装饰概率）
    decorDensity: 0.35,
  },

  camera: {
    // 相机跟随平滑系数（0~1，越大越跟手）
    lerp: 0.12,
    // 相机死区（玩家在此范围内相机不动，像素）
    deadzone: 0,
  },

  player: {
    // 初始职业：流浪骑士
    startClass: 'wanderKnight',
    // 拾取经验的基础半径
    pickupRadius: 90,
    // 无敌帧时长（秒）
    invincibleTime: 0.6,
    // 出生位置（世界坐标）
    spawnX: 0,
    spawnY: 0,
  },

  spawn: {
    // 刷怪曲线：第 1 分钟约 80 只，第 5 分钟约 1000 只同时在场
    // 通过时间插值目标存活数量（value = 目标存活数）
    curve: [
      { time: 0, value: 30 },
      { time: 60, value: 80 },
      { time: 120, value: 220 },
      { time: 180, value: 450 },
      { time: 240, value: 720 },
      { time: 300, value: 1000 },
    ],
    // 允许的最大同屏怪物（性能上限）
    maxAlive: 1200,
    // 每次刷怪最多补充数量
    batchMax: 40,
    // 刷怪间隔（秒）
    interval: 0.4,
    // 刷怪出现在相机外的环形半径范围
    ringMin: 520,
    ringMax: 720,
    // 精英出现间隔（秒）
    eliteInterval: 35,
    // Boss 出现时间（秒）
    bossTime: 300,
    // 若想更快看到 Boss（调试），可改此值
  },

  exp: {
    // 升级经验指数曲线： need(level) = base * growth^(level-1)
    base: 8,
    growth: 1.18,
    // 经验球吸附速度
    magnetSpeed: 640,
  },

  performance: {
    // 对象池初始容量
    poolEnemy: 400,
    poolBullet: 300,
    poolOrb: 400,
    poolDamageText: 60,
    // 四叉树参数
    quadMaxObjects: 8,
    quadMaxLevels: 6,
    // 逻辑帧最大步长（防止卡顿后大跳，秒）
    maxDelta: 0.05,
  },

  ui: {
    joystickRadius: 110,
    joystickKnobRadius: 48,
    // 摇杆吸附到触点还是固定位置（true=触点浮动摇杆）
    floatingJoystick: true,
  },

  debug: {
    showFps: true,
    showQuadTree: false,
    showColliders: false,
    // 无敌 / 快速升级等调试开关
    godMode: false,
  },
};

export default GameConfig;
