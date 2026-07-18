/**
 * CharacterSelectUI.js
 * 暗黑哥特风格角色选择大厅。
 * 中央展示当前英雄（程序化立绘，预留 3D 模型位），左右滑动切换，
 * 展示名称/简介/初始技能/推荐玩法/难度/属性，点击「开始冒险」进入游戏。
 */

import { CHARACTER_LIST } from '../Config/Character.js';
import SKILL_DATA from '../Data/skills.js';
import { roundRect, pointInRect } from './UIHelpers.js';

function stars(n, max = 5) {
  let s = '';
  for (let i = 1; i <= max; i++) s += i <= n ? '★' : '☆';
  return s;
}

export class CharacterSelectUI {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.index = 0;
    this.characters = CHARACTER_LIST;
    this.offsetX = 0;       // 滑动视觉偏移
    this.targetOffset = 0;
    this.dragging = false;
    this.dragId = null;
    this.dragStartX = 0;
    this.dragBase = 0;
    this.startBtn = { x: 0, y: 0, w: 260, h: 60 };
    this.leftBtn = { x: 0, y: 0, w: 48, h: 48 };
    this.rightBtn = { x: 0, y: 0, w: 48, h: 48 };
    this.classSaves = {}; // id -> save snapshot
  }

  setSaves(map) {
    this.classSaves = map || {};
  }

  setIndexById(id) {
    const i = this.characters.findIndex((c) => c.id === id);
    if (i >= 0) {
      this.index = i;
      this.offsetX = -i;
      this.targetOffset = -i;
    }
  }

  get selected() {
    return this.characters[this.index];
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.startBtn.w = Math.min(280, w * 0.72);
    this.startBtn.h = 58;
    this.startBtn.x = (w - this.startBtn.w) / 2;
    this.startBtn.y = h - 88;
    this.leftBtn.x = 18;
    this.leftBtn.y = h * 0.38;
    this.rightBtn.x = w - 66;
    this.rightBtn.y = h * 0.38;
  }

  update(dt) {
    this.time += dt;
    // 滑动回弹
    this.offsetX += (this.targetOffset - this.offsetX) * Math.min(1, dt * 12);
  }

  hitStart(x, y) {
    const b = this.startBtn;
    return pointInRect(x, y, b.x, b.y, b.w, b.h);
  }

  hitLeft(x, y) {
    return pointInRect(x, y, this.leftBtn.x, this.leftBtn.y, this.leftBtn.w, this.leftBtn.h);
  }

  hitRight(x, y) {
    return pointInRect(x, y, this.rightBtn.x, this.rightBtn.y, this.rightBtn.w, this.rightBtn.h);
  }

  prev() {
    if (this.index > 0) {
      this.index--;
      this.targetOffset = -this.index;
    }
  }

  next() {
    if (this.index < this.characters.length - 1) {
      this.index++;
      this.targetOffset = -this.index;
    }
  }

  onTouchStart(id, x, y) {
    if (this.hitStart(x, y) || this.hitLeft(x, y) || this.hitRight(x, y)) return;
    this.dragging = true;
    this.dragId = id;
    this.dragStartX = x;
    this.dragBase = this.targetOffset;
  }

  onTouchMove(id, x) {
    if (!this.dragging || id !== this.dragId) return;
    const dx = (x - this.dragStartX) / this.w;
    this.offsetX = this.dragBase + dx * 1.4;
  }

  onTouchEnd(id, x) {
    if (this.hitLeft(x, this.leftBtn.y + 10)) { this.prev(); this.dragging = false; return 'nav'; }
    if (this.hitRight(x, this.rightBtn.y + 10)) { this.next(); this.dragging = false; return 'nav'; }
    if (this.hitStart(x, this.startBtn.y + 10)) { this.dragging = false; return 'start'; }

    if (this.dragging && id === this.dragId) {
      const dx = x - this.dragStartX;
      if (dx < -50) this.next();
      else if (dx > 50) this.prev();
      else this.targetOffset = -this.index;
      this.dragging = false;
      this.dragId = null;
      return 'swipe';
    }
    return null;
  }

  render(ctx) {
    const w = this.w;
    const h = this.h;
    this._drawBackground(ctx);
    this._drawTitle(ctx);

    // 角色轮播
    for (let i = 0; i < this.characters.length; i++) {
      const slot = i + this.offsetX; // 当前选中 slot≈0
      if (Math.abs(slot) > 1.4) continue;
      this._drawHeroCard(ctx, this.characters[i], slot, i === this.index);
    }

    this._drawArrows(ctx);
    this._drawInfoPanel(ctx, this.selected);
    this._drawStartButton(ctx);
  }

  _drawBackground(ctx) {
    const w = this.w;
    const h = this.h;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a080c');
    grad.addColorStop(0.45, '#0c070a');
    grad.addColorStop(1, '#05060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 燃烧裂隙
    const pulse = 0.55 + 0.45 * Math.sin(this.time * 2.2);
    const cx = w / 2;
    const cy = h * 0.42;
    const rift = ctx.createRadialGradient(cx, cy, 20, cx, cy, h * 0.45);
    rift.addColorStop(0, `rgba(255,90,30,${0.35 * pulse})`);
    rift.addColorStop(0.4, `rgba(179,18,31,${0.28 * pulse})`);
    rift.addColorStop(1, 'rgba(20,5,8,0)');
    ctx.fillStyle = rift;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 裂隙裂纹
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.2 * pulse;
    ctx.strokeStyle = '#ff5a2a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.28);
    ctx.lineTo(w * 0.45, h * 0.4);
    ctx.lineTo(w * 0.35, h * 0.52);
    ctx.lineTo(w * 0.7, h * 0.58);
    ctx.stroke();
    ctx.restore();

    // 地面平台
    ctx.fillStyle = 'rgba(30,20,24,0.7)';
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.52, w * 0.38, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawTitle(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b3121f';
    ctx.font = 'bold 28px "Microsoft YaHei", serif';
    ctx.shadowColor = 'rgba(255,60,40,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText('选择你的命运', this.w / 2, 42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('左右滑动切换职业', this.w / 2, 68);
  }

  _drawHeroCard(ctx, char, slot, selected) {
    const w = this.w;
    const h = this.h;
    const cx = w / 2 + slot * w * 0.72;
    const cy = h * 0.36;
    const scale = selected ? 1 : 0.72;
    const alpha = selected ? 1 : 0.35;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // 3D 立绘占位光环
    const glow = ctx.createRadialGradient(0, 40, 10, 0, 40, 120);
    glow.addColorStop(0, char.color + '66');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 40, 120, 0, Math.PI * 2);
    ctx.fill();

    this._drawPortrait(ctx, char, this.time);

    // 预留标签
    if (selected) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, -54, 118, 108, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#8b9cb3';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('立绘位 · 可替换', 0, 128);
    }
    ctx.restore();
  }

  /** 程序化职业立绘（后续可替换为 3D/贴图） */
  _drawPortrait(ctx, char, time) {
    const bob = Math.sin(time * 2.5) * 3;
    ctx.save();
    ctx.translate(0, bob);

    if (char.model === 'druid') {
      // 德鲁伊：绿袍 + 鹿角
      ctx.fillStyle = char.accent;
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.lineTo(-55, 90);
      ctx.lineTo(55, 90);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = char.color;
      ctx.beginPath();
      ctx.arc(0, -40, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2a10';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, -60); ctx.lineTo(-35, -95);
      ctx.moveTo(18, -60); ctx.lineTo(35, -95);
      ctx.stroke();
      // 身旁小狼影
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#9aa8b8';
      ctx.beginPath();
      ctx.ellipse(70, 50, 28, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (char.model === 'hunter') {
      // 猎人：斗篷 + 长弓
      ctx.fillStyle = char.accent;
      ctx.beginPath();
      ctx.moveTo(0, -65);
      ctx.lineTo(-48, 90);
      ctx.lineTo(48, 90);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = char.color;
      ctx.beginPath();
      ctx.arc(0, -38, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8e8f8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(40, 10, 55, -1.1, 1.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40, -45);
      ctx.lineTo(40, 65);
      ctx.stroke();
    } else {
      // 法师：紫袍 + 法杖 + 火球
      ctx.fillStyle = char.accent;
      ctx.beginPath();
      ctx.moveTo(0, -75);
      ctx.lineTo(-50, 90);
      ctx.lineTo(50, 90);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = char.color;
      ctx.beginPath();
      ctx.arc(0, -42, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e0b3ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(45, 80);
      ctx.lineTo(55, -70);
      ctx.stroke();
      const pulse = 0.6 + 0.4 * Math.sin(time * 4);
      const g = ctx.createRadialGradient(55, -80, 0, 55, -80, 22);
      g.addColorStop(0, `rgba(255,200,80,${pulse})`);
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(55, -80, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawArrows(ctx) {
    const drawBtn = (b, label, enabled) => {
      ctx.fillStyle = enabled ? 'rgba(40,20,24,0.75)' : 'rgba(20,20,24,0.3)';
      roundRect(ctx, b.x, b.y, b.w, b.h, 10);
      ctx.fill();
      ctx.strokeStyle = enabled ? '#b3121f' : '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = enabled ? '#fff' : '#555';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
    };
    drawBtn(this.leftBtn, '‹', this.index > 0);
    drawBtn(this.rightBtn, '›', this.index < this.characters.length - 1);

    // 指示点
    const n = this.characters.length;
    const startX = this.w / 2 - (n - 1) * 10;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * 20, this.h * 0.55, i === this.index ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i === this.index ? this.selected.color : '#444';
      ctx.fill();
    }
  }

  _drawInfoPanel(ctx, char) {
    if (!char) return;
    const w = this.w;
    const panelY = this.h * 0.58;
    const panelH = this.startBtn.y - panelY - 12;
    const pad = 16;

    ctx.fillStyle = 'rgba(12,10,16,0.82)';
    roundRect(ctx, pad, panelY, w - pad * 2, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = char.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let y = panelY + 22;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${char.name}  ·  ${char.nameEn}`, w / 2, y);

    y += 22;
    ctx.fillStyle = char.color;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText(char.tagline, w / 2, y);

    y += 20;
    ctx.fillStyle = '#9aa7b8';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    this._wrapCenter(ctx, char.description, w / 2, y, w - pad * 4, 16);

    y += 40;
    ctx.fillStyle = '#ffd24a';
    ctx.font = '12px sans-serif';
    ctx.fillText(`推荐 ${stars(char.recommend)}    难度 ${stars(char.difficulty)}`, w / 2, y);

    y += 20;
    ctx.fillStyle = '#8b9cb3';
    ctx.fillText(char.playstyle, w / 2, y);

    // 属性条
    y += 28;
    const attrs = char.attributes;
    const rows = [
      ['生命', attrs.hp, 150],
      ['攻击', attrs.atk, 30],
      ['暴击', Math.round(attrs.crit * 100), 20],
      ['攻速', attrs.atkSpeed, 1.5],
      ['移速', attrs.moveSpeed, 120],
    ];
    const barW = Math.min(280, w - pad * 4);
    const barX = (w - barW) / 2;
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    for (let i = 0; i < rows.length; i++) {
      const [name, val, max] = rows[i];
      const yy = y + i * 18;
      ctx.fillStyle = '#6b7280';
      ctx.fillText(name, barX, yy);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, barX + 40, yy - 7, barW - 80, 10, 3);
      ctx.fill();
      ctx.fillStyle = char.color;
      roundRect(ctx, barX + 40, yy - 7, (barW - 80) * Math.min(1, val / max), 10, 3);
      ctx.fill();
      ctx.fillStyle = '#e6edf3';
      ctx.textAlign = 'right';
      ctx.fillText(String(val) + (name === '暴击' ? '%' : ''), barX + barW, yy);
      ctx.textAlign = 'left';
    }

    // 初始技能
    const startId = char.skills.start[0];
    const skill = SKILL_DATA[startId];
    const sy = y + rows.length * 18 + 10;
    if (skill && sy < this.startBtn.y - 20) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd24a';
      ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
      ctx.fillText(`初始技能：${skill.name}`, w / 2, sy);
      ctx.fillStyle = '#8b9cb3';
      ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.fillText(skill.desc, w / 2, sy + 16);
    }

    // 存档摘要
    const save = this.classSaves[char.id];
    if (save) {
      ctx.fillStyle = '#5a6578';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `职业Lv.${save.level}  ·  Boss ${save.bossKills}  ·  胜场 ${save.wins}  ·  金币 ${save.gold}`,
        w / 2,
        this.startBtn.y - 14,
      );
    }
  }

  _wrapCenter(ctx, text, cx, y, maxW, lh) {
    const chars = text.split('');
    let line = '';
    let yy = y;
    const lines = [];
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = chars[i];
      } else line = test;
    }
    if (line) lines.push(line);
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      ctx.fillText(lines[i], cx, yy + i * lh);
    }
  }

  _drawStartButton(ctx) {
    const b = this.startBtn;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
    ctx.save();
    ctx.shadowColor = `rgba(179,18,31,${0.35 + pulse * 0.35})`;
    ctx.shadowBlur = 18;
    const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    g.addColorStop(0, '#a01019');
    g.addColorStop(1, '#5c0a0e');
    ctx.fillStyle = g;
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 2;
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开 始 冒 险', b.x + b.w / 2, b.y + b.h / 2);
  }
}

export default CharacterSelectUI;
