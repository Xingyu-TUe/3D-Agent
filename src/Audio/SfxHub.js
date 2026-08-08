/**
 * SfxHub.js
 * 音效接口占位：接收 EventBus 的 sfx 事件。
 * 当前为可插拔空实现；后续可挂微信 InnerAudio / WebAudio。
 */

export class SfxHub {
  constructor() {
    this.enabled = true;
    this.lastId = null;
    this.lastKind = null;
    this.playCount = 0;
    /** @type {((evt:{id:string,kind:string})=>void)|null} */
    this.handler = null;
  }

  /** 绑定到 EventBus */
  bind(events) {
    if (!events) return;
    events.on('sfx', (p) => this.play(p));
  }

  play(payload = {}) {
    if (!this.enabled) return;
    this.lastId = payload.id || null;
    this.lastKind = payload.kind || 'sfx';
    this.playCount++;
    if (this.handler) this.handler(payload);
  }
}

export default SfxHub;
