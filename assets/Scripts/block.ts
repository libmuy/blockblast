import { _decorator, Component, Node, Color, Graphics, UITransform, CCInteger } from 'cc';
import { ThemeManager } from './ThemeManager';
const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property({ type: CCInteger })
    cornerRadius = 8;
    
    blockSize: number | null = null;
    private _customColor: Color | null = null;
    
    setColor(color: Color) {
        this._customColor = color;
    }

    start() {
        const theme = ThemeManager.instance!;
        const size = this.blockSize ?? theme.getBlockSize();
        
        const uiTransform = this.getComponent(UITransform)!;
        uiTransform.setContentSize(size, size);
        
        const color = this._customColor ?? theme.getRandomBlockColor();
        this.drawBlock(size, color);
    }
    
    drawBlock(size: number, color: Color) {
        const graphics = this.getComponent(Graphics)!;
        graphics.clear();
        // Draw centered in node (prefab anchor is 0.5, 0.5 so local origin is center)
        const left = -size / 2;
        const bottom = -size / 2;
        graphics.roundRect(left, bottom, size, size, this.cornerRadius);
        graphics.fillColor = color;
        graphics.fill();
        const highlightR = Math.min(255, color.r * 1.3);
        const highlightG = Math.min(255, color.g * 1.3);
        const highlightB = Math.min(255, color.b * 1.3);
        graphics.strokeColor = new Color(highlightR, highlightG, highlightB);
        graphics.lineWidth = 1;
        graphics.roundRect(left + 2, bottom + 2, size - 4, size - 4, this.cornerRadius - 2);
        graphics.stroke();
    }

}
