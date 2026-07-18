/**
 * MenuScene.js
 * 主菜单场景。点击开始进入游戏场景。
 */

import MainMenu from '../UI/MainMenu.js';

export class MenuScene {
  constructor(game) {
    this.game = game;
    this.menu = new MainMenu();
  }

  enter() {
    this.menu.time = 0;
  }

  resize(w, h) {
    this.menu.resize(w, h);
  }

  update(dt) {
    this.menu.update(dt);
  }

  render(ctx) {
    this.menu.render(ctx);
  }

  onTouchStart(id, x, y) {
    if (this.menu.hitStart(x, y)) {
      this.game.scenes.switchTo('game');
    }
  }
}

export default MenuScene;
