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
        
        // Main block fill
        graphics.roundRect(0, 0, size, size, this.cornerRadius);
        graphics.fillColor = color;
        graphics.fill();
        
        // Subtle highlight (brighter version)
        const highlightR = Math.min(255, color.r * 1.3);
        const highlightG = Math.min(255, color.g * 1.3);
        const highlightB = Math.min(255, color.b * 1.3);
        
        graphics.strokeColor = new Color(highlightR, highlightG, highlightB);
        graphics.lineWidth = 1;
        graphics.roundRect(2, 2, size-4, size-4, this.cornerRadius-2);
        graphics.stroke();
    }

}
