/**
 * headless-sim.js
 * 无头运行时测试：mock 出 Canvas 2D 上下文与浏览器全局，实际驱动 Game 主循环，
 * 验证从主菜单 -> 开始 -> 战斗 -> 升级 -> 精英 -> Boss -> 结算的全流程无运行时错误，
 * 并做基础性能采样（模拟满屏怪物时的单帧耗时）。
 *
 * 用法：node scripts/headless-sim.js
 */

// ---------- mock 2D 上下文 ----------
function makeGradient() {
  return { addColorStop() {} };
}
function makeCtx() {
  const ctx = {
    canvas: null,
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    setTransform() {}, resetTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    arcTo() {}, ellipse() {}, rect() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    fill() {}, stroke() {}, clip() {},
    fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {},
    measureText(t) { return { width: (t ? t.length : 0) * 8 }; },
    createRadialGradient() { return makeGradient(); },
    createLinearGradient() { return makeGradient(); },
    createPattern() { return null; },
    drawImage() {},
    setLineDash() {},
  };
  // 允许任意属性赋值（fillStyle 等）
  return ctx;
}

// ---------- mock canvas / DOM / window ----------
const canvas = {
  width: 720,
  height: 1280,
  style: {},
  _ctx: null,
  getContext() { if (!this._ctx) { this._ctx = makeCtx(); this._ctx.canvas = this; } return this._ctx; },
  addEventListener() {},
  removeEventListener() {},
};

let rafQueue = [];
global.window = {
  innerWidth: 720,
  innerHeight: 1280,
  devicePixelRatio: 2,
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame(cb) { rafQueue.push(cb); return rafQueue.length; },
  cancelAnimationFrame() {},
  localStorage: {
    _m: {},
    getItem(k) { return this._m[k] != null ? this._m[k] : null; },
    setItem(k, v) { this._m[k] = v; },
  },
};
global.document = {
  getElementById(id) { return id === 'game' ? canvas : null; },
  createElement() { return canvas; },
  body: { appendChild() {} },
};
global.requestAnimationFrame = (cb) => global.window.requestAnimationFrame(cb);
global.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };

// ---------- 启动 ----------
const { Game } = await import('../src/Game.js');

const game = new Game(canvas);
// 我们手动步进，不使用真实 raf 递归
game.running = true;
game.scenes.switchTo('characterSelect');

function step(dt) {
  game.scenes.update(dt);
  game.renderer.clear();
  game.scenes.render(game.ctx);
}

function tap(x, y) {
  game.scenes.onTouchStart(0, x, y);
  game.scenes.onTouchEnd(0, x, y);
}

const DT = 1 / 60;
const W = game.width;
const H = game.height;

let errors = 0;
function guard(label, fn) {
  try { fn(); } catch (e) {
    errors++;
    console.error(`✗ ${label}:`, e && e.stack ? e.stack : e);
  }
}

// 1) 角色选择：验证滑动可停在中间职业（猎人），不会被左右箭头误触跳飞
guard('character select swipe', () => {
  for (let i = 0; i < 5; i++) step(DT);
  console.log('当前场景:', game.scenes.currentName);
  const sel = game.scenes.scenes.get('characterSelect');
  if (!sel) throw new Error('no characterSelect scene');
  sel.ui.setIndexById('druid');
  // 模拟从屏幕中部向左滑（应切到猎人 index=1）
  const midX = W / 2;
  const midY = H * 0.36;
  game.scenes.onTouchStart(0, midX, midY);
  game.scenes.onTouchMove(0, midX - 120, midY);
  game.scenes.onTouchEnd(0, midX - 120, midY); // 松手在左侧，旧 bug 会误触发 prev
  if (sel.ui.selected.id !== 'hunter') {
    throw new Error('左滑后应选中猎人，实际=' + sel.ui.selected.id);
  }
  // 再左滑到法师
  game.scenes.onTouchStart(0, midX, midY);
  game.scenes.onTouchMove(0, midX - 120, midY);
  game.scenes.onTouchEnd(0, midX - 120, midY);
  if (sel.ui.selected.id !== 'mage') {
    throw new Error('再左滑应选中法师，实际=' + sel.ui.selected.id);
  }
  // 右滑回猎人
  game.scenes.onTouchStart(0, midX, midY);
  game.scenes.onTouchMove(0, midX + 120, midY);
  game.scenes.onTouchEnd(0, midX + 120, midY);
  if (sel.ui.selected.id !== 'hunter') {
    throw new Error('右滑后应回到猎人，实际=' + sel.ui.selected.id);
  }
  console.log('滑动选角 OK →', sel.ui.selected.id);
  tap(sel.ui.startBtn.x + 10, sel.ui.startBtn.y + 10);
});
console.log('进入后场景:', game.scenes.currentName, '职业:', game.selectedClassId);

const scene = game.scenes.scenes.get('game');

// 2.5) 静止 15 秒（不碰摇杆），验证怪物能靠近并被普通攻击击杀、升级触发
guard('stationary combat', () => {
  let levelupsHandled = 0;
  for (let i = 0; i < Math.floor(20 / DT); i++) {
    step(DT);
    if (scene.state === 'levelup') {
      const card = scene.levelUpUI.cards[0];
      if (card) { tap(card.x + 10, card.y + 10); levelupsHandled++; }
    }
  }
  console.log(`静止20s: 等级=${scene.player.level} 击杀=${scene.player.kills} 怪物=${scene.enemySystem.count} 存活HP=${scene.player.hp.toFixed(0)} 处理升级=${levelupsHandled}`);
  console.log('已获得技能:', Array.from(scene.skillSystem.skills.keys()).join(', '));
});

// 3) 模拟摇杆移动 + 战斗若干秒，期间自动处理升级三选一
guard('combat + levelup', () => {
  // 若上一阶段玩家已阵亡跳到结算，则重开一局
  if (game.scenes.currentName !== 'game') game.scenes.switchTo('game');
  // 按住摇杆，做小幅走位机动
  const baseX = 140;
  const baseY = H - 160;
  game.scenes.onTouchStart(0, baseX, baseY);

  let simSeconds = 40;
  let steps = Math.floor(simSeconds / DT);
  let levelupsHandled = 0;
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    // 小幅走位（贴近怪群，能持续击杀并升级，从而覆盖三选一流程）
    const ang = t * 0.9;
    game.scenes.onTouchMove(0, baseX + Math.cos(ang) * 40, baseY + Math.sin(ang) * 40);
    step(DT);
    // 若进入升级界面，选择第一张卡
    if (scene.state === 'levelup') {
      const card = scene.levelUpUI.cards[0];
      if (card) {
        game.scenes.onTouchStart(0, card.x + 10, card.y + 10);
        game.scenes.onTouchEnd(0, card.x + 10, card.y + 10);
        levelupsHandled++;
      }
    }
  }
  console.log(`40s 后: 等级=${scene.player.level} 击杀=${scene.player.kills} 怪物=${scene.enemySystem.count} 技能数=${scene.skillSystem.skillCount} 处理升级=${levelupsHandled}`);
  console.log('已获得技能:', Array.from(scene.skillSystem.skills.keys()).join(', '));
});

// 3.5) 主动技能：三职业小技能/大招释放、CD、伤害与特效池
guard('active skills combat', () => {
  const classes = ['druid', 'hunter', 'mage'];
  for (const classId of classes) {
    game.selectedClassId = classId;
    game.scenes.switchTo('game', { classId });
    const s = game.scenes.scenes.get('game');
    // 冻结刷怪，避免总血量被新怪抬高
    s.enemySystem.spawnTimer = 1e9;
    s.enemySystem.eliteTimer = 1e9;
    s.enemySystem.miniBossTimer = 1e9;
    s.enemySystem.bossSpawned = true;

    for (let i = 0; i < 40; i++) {
      const ang = (i / 40) * Math.PI * 2;
      const data = s.enemySystem._randomNormalData();
      s.enemySystem.spawnOne(
        data,
        s.player.x + Math.cos(ang) * (80 + (i % 5) * 30),
        s.player.y + Math.sin(ang) * (80 + (i % 5) * 30),
        false,
      );
    }

    let dealt = 0;
    const origDmg = s.enemySystem.damageEnemy.bind(s.enemySystem);
    s.enemySystem.damageEnemy = (e, amount, crit, knockback, fromX, fromY) => {
      if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
        dealt += amount;
      }
      return origDmg(e, amount, crit, knockback, fromX, fromY);
    };

    const sfxBefore = s.sfx.playCount;
    if (!s.activeSkills.tryCast('small')) throw new Error(`${classId} small cast failed`);
    if (!s.skillButtons.buttons.find((b) => b.slot === 'small')) {
      throw new Error('no small skill button');
    }

    for (let i = 0; i < Math.floor(1.2 / DT); i++) step(DT);
    const smallUi = s.activeSkills.getUiState().small;
    if (!smallUi || smallUi.cooldownLeft <= 0) {
      throw new Error(`${classId} small CD not ticking (left=${smallUi && smallUi.cooldownLeft})`);
    }

    s.activeSkills.forceReady('ultimate');
    if (!s.activeSkills.tryCast('ultimate')) throw new Error(`${classId} ultimate cast failed`);
    const wait = classId === 'mage' ? 3.2 : 1.5;
    for (let i = 0; i < Math.floor(wait / DT); i++) step(DT);

    s.enemySystem.damageEnemy = origDmg;
    if (!(dealt > 0)) {
      throw new Error(`${classId} skills dealt no damage (dealt=${dealt})`);
    }
    if (s.sfx.playCount <= sfxBefore) {
      throw new Error(`${classId} sfx interface not triggered`);
    }
    const left = s.activeSkills.small.cooldownLeft;
    s.activeSkills.reduceCooldown(5, 'small');
    if (s.activeSkills.small.cooldownLeft > left - 4.9) {
      throw new Error(`${classId} reduceCooldown failed`);
    }
    console.log(`主动技 ${classId}: dealt=${dealt.toFixed(0)} fx=${s.effects.effects.length} sfx=${s.sfx.playCount}`);
  }
  game.selectedClassId = 'hunter';
  game.scenes.switchTo('game', { classId: 'hunter' });
});

// 4) 强制触发 Boss：把 boss 时间调到当前，快进
guard('boss flow', () => {
  game.scenes.switchTo('game'); // 干净重开，专注测试 Boss 流程
  scene.enemySystem.spawnBoss();
  // 打印 boss 是否生成
  const boss = scene.enemySystem.boss;
  console.log('Boss 生成:', boss ? boss.name : '无', 'HP:', boss ? Math.round(boss.maxHp) : 0);
  // 快进战斗，让 boss 释放技能（冲锋/召唤/范围）
  for (let i = 0; i < Math.floor(15 / DT); i++) step(DT);
  const b = scene.enemySystem.boss;
  if (b && b.boss) {
    console.log('Boss 阶段:', b.boss.getPhaseName(), 'HP%:', (b.hp / b.maxHp * 100).toFixed(0));
  }
});

// 5) 直接击杀 Boss 验证胜利结算
guard('boss kill -> victory', () => {
  const b = scene.enemySystem.boss;
  if (b) {
    scene.enemySystem.damageEnemy(b, b.hp + 1, false, 0, 0, 0);
  }
  // 推进结算倒计时
  for (let i = 0; i < Math.floor(3 / DT); i++) step(DT);
  console.log('结算后场景:', game.scenes.currentName, '胜利:', scene.victory);
});

// 6) 性能采样：满屏怪物单帧耗时
guard('perf sample', () => {
  game.scenes.switchTo('game');
  const s = game.scenes.scenes.get('game');
  // 强行灌入大量怪物
  s.enemySystem.elapsed = 300; // 难度拉满
  for (let i = 0; i < 1000; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 100 + Math.random() * 600;
    const data = s.enemySystem._randomNormalData();
    s.enemySystem.spawnOne(data, s.player.x + Math.cos(ang) * r, s.player.y + Math.sin(ang) * r, false);
  }
  // 给玩家一堆技能 + 主动箭雨压测特效池
  for (const id of ['whirlwind', 'fireball', 'chainLightning', 'frostRing', 'poisonCloud', 'flyingSword']) {
    s.skillSystem.acquire(id);
    for (let k = 0; k < 4; k++) s.skillSystem.getSkill(id).upgrade();
  }
  s.activeSkills.bindClass('hunter');
  s.activeSkills.forceReady('ultimate');
  s.activeSkills.tryCast('ultimate');
  game.scenes.onTouchStart(0, 140, H - 160);
  game.scenes.onTouchMove(0, 260, H - 260);

  // 预热
  for (let i = 0; i < 10; i++) step(DT);
  const N = 120;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) step(DT);
  const t1 = performance.now();
  const per = (t1 - t0) / N;
  console.log(`满屏怪物(${s.enemySystem.count}) 平均单帧(逻辑+渲染mock): ${per.toFixed(2)} ms  => 理论 ${(1000 / per).toFixed(0)} fps 上限；fxActive=${s.effects.effects.length}`);
});

if (errors === 0) {
  console.log('\n✓ 无头模拟通过：全流程无运行时错误');
} else {
  console.error(`\n✗ 无头模拟发现 ${errors} 处运行时错误`);
  process.exit(1);
}
