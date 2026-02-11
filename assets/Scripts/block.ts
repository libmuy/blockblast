import { _decorator, Component, Node, Color, Graphics, UITransform, CCInteger, CCFloat } from 'cc';
import { ThemeManager } from './ThemeManager';
const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property({ type: CCInteger })
    cornerRadius = 8;
    @property({ type: CCInteger, tooltip: 'Bevel width (frame around central face)' })
    bevelWidth = 5;
    @property({ type: CCFloat, range: [0.35, 0.92], step: 0.01, tooltip: '中央顶面占整块的比例 (0.35~0.92)' })
    centralFaceRatio = 0.72;

    blockSize: number | null = null;
    private _customColor: Color | null = null;
    private _lastSize: number = 0;
    private _lastColor: Color = new Color(255, 255, 255);

    setColor(color: Color) {
        this._customColor = color;
    }

    start() {
        const theme = ThemeManager.instance!;
        const size = this.blockSize ?? theme.getBlockSize();
        this._lastSize = size;

        const uiTransform = this.getComponent(UITransform)!;
        uiTransform.setContentSize(size, size);

        const color = this._customColor ?? theme.getRandomBlockColor();
        this._lastColor = color.clone();
        this.drawBlock(size, color);
    }

    /** Redraw block with a bright flash (lerp toward white) for clear animation. */
    flashToWhite(amount: number = 0.75) {
        const c = this._lastColor;
        const r = Math.min(255, Math.floor(c.r + (255 - c.r) * amount));
        const g = Math.min(255, Math.floor(c.g + (255 - c.g) * amount));
        const b = Math.min(255, Math.floor(c.b + (255 - c.b) * amount));
        const flashColor = new Color(r, g, b, 255);
        this.drawBlock(this._lastSize, flashColor);
    }

    drawBlock(size: number, color: Color) {
        const graphics = this.getComponent(Graphics)!;
        graphics.clear();
        const left = -size / 2;
        const bottom = -size / 2;
        const r = this.cornerRadius;
        const ratio = Math.max(0.35, Math.min(0.92, this.centralFaceRatio));
        const centralSize = size * ratio;
        const b = Math.max(2, (size - centralSize) / 2);
        const top = bottom + size;
        const right = left + size;

        // 斜面用梯形表示立体：上/左稍暗，右更暗，下最深，光从上方照下来
        const t = 0.82;  // 上/左
        const s = 0.62;  // 右
        const w = 0.48;  // 下
        const topBevel = new Color(
            Math.max(0, Math.floor(color.r * t)),
            Math.max(0, Math.floor(color.g * t)),
            Math.max(0, Math.floor(color.b * t)),
            255
        );
        const sideBevel = new Color(
            Math.max(0, Math.floor(color.r * s)),
            Math.max(0, Math.floor(color.g * s)),
            Math.max(0, Math.floor(color.b * s)),
            255
        );
        const bottomBevel = new Color(
            Math.max(0, Math.floor(color.r * w)),
            Math.max(0, Math.floor(color.g * w)),
            Math.max(0, Math.floor(color.b * w)),
            255
        );

        // 1. 上侧梯形斜面
        graphics.moveTo(left, top);
        graphics.lineTo(right, top);
        graphics.lineTo(right - b, top - b);
        graphics.lineTo(left + b, top - b);
        graphics.close();
        graphics.fillColor = topBevel;
        graphics.fill();

        // 2. 左侧梯形斜面
        graphics.moveTo(left, top);
        graphics.lineTo(left, bottom);
        graphics.lineTo(left + b, bottom + b);
        graphics.lineTo(left + b, top - b);
        graphics.close();
        graphics.fillColor = topBevel;
        graphics.fill();

        // 3. 右侧梯形斜面（更暗）
        graphics.moveTo(right, top);
        graphics.lineTo(right, bottom);
        graphics.lineTo(right - b, bottom + b);
        graphics.lineTo(right - b, top - b);
        graphics.close();
        graphics.fillColor = sideBevel;
        graphics.fill();

        // 4. 下侧梯形斜面（最深）
        graphics.moveTo(left, bottom);
        graphics.lineTo(right, bottom);
        graphics.lineTo(right - b, bottom + b);
        graphics.lineTo(left + b, bottom + b);
        graphics.close();
        graphics.fillColor = bottomBevel;
        graphics.fill();

        // 5. 中央顶面（主色）
        graphics.roundRect(left + b, bottom + b, size - 2 * b, size - 2 * b, Math.max(0, r - 2));
        graphics.fillColor = color;
        graphics.fill();

        // 6. 外轮廓
        graphics.strokeColor = new Color(28, 28, 36, 255);
        graphics.lineWidth = 1.5;
        graphics.roundRect(left, bottom, size, size, r);
        graphics.stroke();

        // 7. 内轮廓（中央与斜面交界）
        graphics.strokeColor = new Color(28, 28, 36, 255);
        graphics.lineWidth = 1;
        graphics.roundRect(left + b, bottom + b, size - 2 * b, size - 2 * b, Math.max(0, r - 2));
        graphics.stroke();
    }

}
