import { _decorator, Component, Node, Vec2, Prefab, instantiate, Color, UITransform, Vec3, EventTouch, Camera, director } from 'cc';
import { GridManager } from './GridManager';
import { ThemeManager } from './ThemeManager';
import { Block } from './Block';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

export const SHAPE_PATTERNS = {
    DOT: [new Vec2(0, 0)],
    HORIZONTAL_2: [new Vec2(0, 0), new Vec2(1, 0)],
    HORIZONTAL_3: [new Vec2(0, 0), new Vec2(1, 0), new Vec2(2, 0)],
    HORIZONTAL_4: [new Vec2(0, 0), new Vec2(1, 0), new Vec2(2, 0), new Vec2(3, 0)],
    VERTICAL_2: [new Vec2(0, 0), new Vec2(0, 1)],
    VERTICAL_3: [new Vec2(0, 0), new Vec2(0, 1), new Vec2(0, 2)],
    VERTICAL_4: [new Vec2(0, 0), new Vec2(0, 1), new Vec2(0, 2), new Vec2(0, 3)],
    SQUARE: [new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1), new Vec2(1, 1)],
    L_SHAPE: [new Vec2(0, 0), new Vec2(0, 1), new Vec2(0, 2), new Vec2(1, 0)],
};

@ccclass('Shape')
export class Shape extends Component {
    @property({ type: Prefab })
    blockPrefab: Prefab = null!;

    public offsets: Vec2[] = [];
    private color: Color = Color.WHITE;
    private blocks: Node[] = [];
    private originalScale: Vec3 = new Vec3(0.5, 0.5, 1);
    private dragScale: Vec3 = new Vec3(1, 1, 1);
    private startPos: Vec3 = new Vec3();

    onEnable() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDisable() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    init(pattern: Vec2[], color: Color) {
        this.offsets = pattern;
        this.color = color;
        this.node.setScale(this.originalScale);
        this.startPos = this.node.position.clone();
        this.createBlocks();
    }

    private onTouchStart(event: EventTouch) {
        this.node.setScale(this.dragScale);
        // Offset piece upwards slightly so it's visible under finger
        const pos = this.node.position;
        this.node.setPosition(pos.x, pos.y + 100, pos.z);
    }

    private onTouchMove(event: EventTouch) {
        const delta = event.getUIDelta();
        const pos = this.node.position;
        this.node.setPosition(pos.x + delta.x, pos.y + delta.y, pos.z);
    }

    private onTouchEnd(event: EventTouch) {
        const gridManager = GridManager.instance!;
        const theme = ThemeManager.instance!;
        const cellSize = theme.getBlockSize();
        const spacing = theme.spacing;

        // Convert current position to grid coordinates
        // Piece position is relative to its parent (the container)
        // Grid position is relative to its parent (the board)
        // We need world positions to compare
        const worldPos = this.node.worldPosition;
        const gridWorldPos = gridManager.node.worldPosition;
        const gridUITransform = gridManager.node.getComponent(UITransform)!;

        // Relative position to grid bottom-left
        const relX = worldPos.x - (gridWorldPos.x - gridUITransform.width / 2);
        const relY = worldPos.y - (gridWorldPos.y - gridUITransform.height / 2);

        // Approximate grid indices
        const gridX = Math.round((relX - spacing - cellSize / 2) / (cellSize + spacing));
        const gridY = Math.round((relY - spacing - cellSize / 2) / (cellSize + spacing));

        if (gridManager.canPlaceShape(this.offsets, gridX, gridY)) {
            gridManager.placeShape(this.offsets, gridX, gridY, this.color);
            this.node.emit('placed');
            GameManager.instance?.onShapePlaced();
            this.node.destroy();
        } else {
            this.node.setScale(this.originalScale);
            this.node.setPosition(this.startPos);
        }
    }

    createBlocks() {
        const theme = ThemeManager.instance!;
        const cellSize = theme.getBlockSize();
        const spacing = theme.spacing;

        this.offsets.forEach(offset => {
            const blockNode = instantiate(this.blockPrefab);
            this.node.addChild(blockNode);

            const x = offset.x * (cellSize + spacing);
            const y = offset.y * (cellSize + spacing);
            blockNode.setPosition(x, y);

            const block = blockNode.getComponent(Block)!;
            block.setColor(this.color);
            this.blocks.push(blockNode);
        });
    }
}
