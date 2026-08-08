/**
 * CharacterSelectScene.js
 * 启动后的角色选择场景。选择职业后进入游戏。
 */

import CharacterSelectUI from '../UI/CharacterSelectUI.js';
import CharacterSave from '../Player/CharacterSave.js';
import { CHARACTER_LIST } from '../Config/Character.js';

export class CharacterSelectScene {
  constructor(game) {
    this.game = game;
    this.ui = new CharacterSelectUI();
  }

  enter() {
    this.ui.time = 0;
    const save = CharacterSave.load();
    this.ui.setIndexById(save.selectedClassId);
    const map = {};
    for (const c of CHARACTER_LIST) {
      map[c.id] = save.classes[c.id];
    }
    this.ui.setSaves(map);
  }

  resize(w, h) {
    this.ui.resize(w, h);
  }

  update(dt) {
    this.ui.update(dt);
  }

  render(ctx) {
    this.ui.render(ctx);
  }

  onTouchStart(id, x, y) {
    // 左右箭头：按下即切换（不走滑动逻辑）
    if (this.ui.hitLeft(x, y)) {
      this.ui.prev();
      return;
    }
    if (this.ui.hitRight(x, y)) {
      this.ui.next();
      return;
    }
    // 开始冒险：按下即进入
    if (this.ui.hitStart(x, y)) {
      this._startAdventure();
      return;
    }
    // 其余区域：开始滑动手势
    this.ui.onTouchStart(id, x, y);
  }

  onTouchMove(id, x, y) {
    this.ui.onTouchMove(id, x, y);
  }

  onTouchEnd(id, x, y) {
    // 仅结束滑动吸附，不再用松手坐标误点按钮
    this.ui.onTouchEnd(id, x, y);
  }

  _startAdventure() {
    const char = this.ui.selected;
    if (!char) return;
    CharacterSave.setSelectedClassId(char.id);
    this.game.selectedClassId = char.id;
    this.game.scenes.switchTo('game', { classId: char.id });
  }
}

export default CharacterSelectScene;
