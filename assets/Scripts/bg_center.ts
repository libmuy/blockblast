import { _decorator, Component, Graphics, UITransform, Color, Mask, Layout, find } from 'cc';
const { ccclass, property } = _decorator;

const CELL_COUNT = 8;

@ccclass('BackgroundController')
export class BackgroundController extends Component {
    @property({ type: Number })
    cornerRadius: number = 50;  // ← Your shared const (edit in Inspector!)

    @property({ type: Number })
    borderWidth: number = 10;  // ← Your shared const (edit in Inspector!)

    @property({ type: Color })
    borderColor: Color = Color.RED;  // ← Your shared const (edit in Inspector!)

    start() {
        const maskNode = this.node.getChildByName('bg_center')!.getComponent(Mask)!;
        const borderNode = find('bg_center/bg_center_border', this.node);
        this.updateMask(maskNode);
        this.updateBorder(borderNode);
        // this.drawGrid();
    }

    updateMask(maskNode: Mask) {
        const rect = maskNode!.getComponent(UITransform)!.contentSize;
        const graphics = maskNode!.getComponent(Graphics)!;
        graphics.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, this.cornerRadius);
        graphics.fill();
    }

    updateBorder(borderNode: any) {
        const graphics = borderNode!.getComponent(Graphics)!;
        const rect = borderNode!.getComponent(UITransform)!.contentSize;
        
        graphics.lineWidth = this.borderWidth;
        graphics.strokeColor = this.borderColor;
        graphics.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, this.cornerRadius);
        graphics.stroke();
    }

    // drawGrid() {
    //     const graphics = this.node.getComponent(Graphics)!;
    //     const ui = this.node.getComponent(UITransform)!;
    //     const rect = ui.contentSize;
    //     const layout: Layout = this.node.getChildByName('grid_layout')!.getComponent(Layout)!;
    //     const cellSize = rect.width / CELL_COUNT;

    //     graphics.clear();
    //     graphics.lineWidth = layout.spacingX;
    //     graphics.strokeColor = Color.RED;

    //     // Vertical lines
    //     for (let x = cellSize; x < rect.width; x += cellSize) {
    //         graphics.moveTo(x, 0);
    //         graphics.lineTo(x, rect.height);
    //         console.log("x:", x, "cellSize:", cellSize, "rect.width:", rect.width);
    //     }

    //     // Horizontal lines  
    //     for (let y = cellSize; y < rect.height; y += cellSize) {
    //         graphics.moveTo(0, y);
    //         graphics.lineTo(rect.width, y);
    //     }

    //     graphics.stroke();
    // }
}



