import { _decorator, Component, Node, Color, Graphics, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property({ type: Color })
    blockColor = Color.BLUE;
    
    @property({ type: Number })
    cornerRadius = 8;
    
    start() {
        this.drawBlock();
    }
    
    drawBlock() {
        const graphics = this.getComponent(Graphics)!;
        const ui = this.getComponent(UITransform)!;
        const { width, height } = ui.contentSize;
        
        graphics.clear();
        
        // Main block fill
        graphics.roundRect(0, 0, width, height, this.cornerRadius);
        graphics.fillColor = this.blockColor;
        graphics.fill();
        
        // Subtle highlight (brighter version)
        const highlightR = Math.min(255, this.blockColor.r * 1.3);
        const highlightG = Math.min(255, this.blockColor.g * 1.3);
        const highlightB = Math.min(255, this.blockColor.b * 1.3);
        
        graphics.strokeColor = new Color(highlightR, highlightG, highlightB);
        graphics.lineWidth = 1;
        graphics.roundRect(2, 2, width-4, height-4, this.cornerRadius-2);
        graphics.stroke();
    }

}

