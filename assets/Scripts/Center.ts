import { _decorator, Component, Graphics, UITransform, math, CCInteger } from 'cc';
import { ThemeManager } from './ThemeManager';
const { ccclass, property } = _decorator;

@ccclass('Center')
export class Center extends Component {
    @property({ type: CCInteger })
    cornerRadius: number = 50;  // ← Your shared const (edit in Inspector!)

    start() {
        const theme = ThemeManager.instance!;
        const graphics = this.node.getComponent(Graphics)!;
        const uiTransform = this.node.getComponent(UITransform)!;

        uiTransform.setContentSize(theme.centerAreaWidth, theme.centerAreaWidth);
        
        const rect = uiTransform.contentSize;
        this.drawBackground(graphics, rect);
        this.drawGrid(graphics, rect);
    }

    drawBackground(graphics: Graphics, rect: math.Size) {
        const theme = ThemeManager.instance!;
        graphics.clear();
        graphics.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, this.cornerRadius);
        graphics.fillColor = theme.centerBackgroundColor;
        graphics.fill();

        graphics.lineWidth = theme.centerAreaBorderWidth;
        graphics.strokeColor = theme.accentColor;
        graphics.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, this.cornerRadius);
        graphics.stroke();
    }

    drawGrid(graphics: Graphics, rect: math.Size) {
        const theme = ThemeManager.instance!;
        const blockSize = theme.getBlockSize();
        const spacing = theme.spacing;
        const columns = theme.columns;

        graphics.lineWidth = 2;
        graphics.strokeColor = theme.accentColor;

        // Vertical lines
        for (let i = 0; i < columns - 1; i++) {
            const x = -rect.width / 2 + spacing + blockSize + spacing / 2 + i * (blockSize + spacing);
            graphics.moveTo(x, -rect.height / 2);
            graphics.lineTo(x, rect.height / 2);
        }

        // Horizontal lines
        for (let j = 0; j < columns - 1; j++) {
            const y = -rect.height / 2 + spacing + blockSize + spacing / 2 + j * (blockSize + spacing);
            graphics.moveTo(-rect.width / 2, y);
            graphics.lineTo(rect.width / 2, y);
        }

        graphics.stroke();
    }
}




