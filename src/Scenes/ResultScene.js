/**
 * ResultScene.js
 * 结算场景。展示战果，点击返回大厅回到主菜单。
 */

import ResultUI from '../UI/ResultUI.js';

export class ResultScene {
  constructor(game) {
    this.game = game;
    this.ui = new ResultUI();
  }

  enter(params) {
    this.ui.setData(params || {});
  }

  resize(w, h) {
    this.ui.resize(w, h);
  }

  update(dt) {
    this.ui.update(dt);
  }

  render(ctx) {
    // 沿用游戏场景最后一帧的暗色背景
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.game.width, this.game.height);
    this.ui.render(ctx);
  }

  onTouchStart(id, x, y) {
    if (this.ui.hitBack(x, y)) {
      this.game.scenes.switchTo('menu');
    }
  }
}

export default ResultScene;
