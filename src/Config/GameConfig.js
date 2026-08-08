/**
 * GameConfig.js
 * 全局游戏配置。所有可调数值集中在此，禁止在业务代码中写死。
 * 设计逻辑区分为：世界 / 相机 / 玩家 / 刷怪 / 经验 / 性能 / 调试。
 */

export const GameConfig = {
  // 一局时长（秒），默认 3 分钟
  matchDuration: 180,

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
    // 默认职业（可被角色选择覆盖）
    startClass: 'druid',
    // 拾取经验的基础半径
    pickupRadius: 90,
    // 无敌帧时长（秒）
    invincibleTime: 0.6,
    // 出生位置（世界坐标）
    spawnX: 0,
    spawnY: 0,
  },

  spawn: {
    // 刷怪曲线（压缩到 3 分钟局）
    curve: [
      { time: 0, value: 40 },
      { time: 30, value: 90 },
      { time: 60, value: 180 },
      { time: 90, value: 320 },
      { time: 120, value: 500 },
      { time: 150, value: 700 },
      { time: 180, value: 900 },
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
    // 小 Boss：每隔半分钟一只（最终 Boss 出现后停止）
    miniBossInterval: 30,
    // 最终 Boss 出现时间（秒）= 3 分钟
    bossTime: 180,
  },

  exp: {
    // 获取倍率（相对原始掉落值）；1/3 = 变慢三倍
    gainMul: 1 / 3,
    // 线性升级：need(level) = base + (level - 1) * perLevel
    base: 20,
    perLevel: 15,
    // 经验球吸附速度
    magnetSpeed: 640,
  },

  /** 显示相关（可由暂停菜单开关，并持久化） */
  display: {
    // 是否显示伤害飘字与拾取经验数字
    showCombatNumbers: true,
  },

  performance: {
    // 对象池初始容量
    poolEnemy: 400,
    poolBullet: 300,
    poolOrb: 400,
    poolDamageText: 60,
    // 特效池（箭雨/粒子高峰时需足够大，避免频繁扩容）
    poolFx: 260,
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
