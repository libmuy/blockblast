import { _decorator, Component, Node, Vec2, Prefab, instantiate, Color, UITransform, Vec3, EventTouch, tween } from 'cc';
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
    L_SHAPE_MIRROR: [new Vec2(1, 0), new Vec2(1, 1), new Vec2(1, 2), new Vec2(0, 0)],
    T_SHAPE: [new Vec2(0, 0), new Vec2(1, 0), new Vec2(2, 0), new Vec2(1, 1)],
    Z_SHAPE: [new Vec2(0, 0), new Vec2(1, 0), new Vec2(1, 1), new Vec2(2, 1)],
    S_SHAPE: [new Vec2(1, 0), new Vec2(2, 0), new Vec2(0, 1), new Vec2(1, 1)],
    CORNER_2x2: [new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1)],
};

@ccclass('Shape')
export class Shape extends Component {
    @property({ type: Prefab })
    blockPrefab: Prefab = null!;

    /** Canonical pattern from init; do not mutate. */
    public offsets: Vec2[] = [];
    private color: Color = Color.WHITE;
    private blocks: Node[] = [];
    private originalScale: Vec3 = new Vec3(0.5, 0.5, 1);
    private dragScale: Vec3 = new Vec3(1, 1, 1);
    private startPos: Vec3 = new Vec3();
    /** 0..3 for 0°, 90°, 180°, 270° CW. */
    private rotationIndex: number = 0;
    private lastTapTime: number = 0;
    private static readonly DOUBLE_TAP_MS = 350;
    private touchReceiver: Node | null = null;

    onEnable() {
        // Touch is registered on touchReceiver in addTouchReceiver() so the shape receives drags (blocks would consume touch otherwise).
    }

    /** Current offsets after rotation; normalized so min x,y >= 0. */
    getCurrentOffsets(): Vec2[] {
        const n = this.rotationIndex % 4;
        const rot = (v: Vec2): Vec2 => {
            if (n === 0) return new Vec2(v.x, v.y);
            if (n === 1) return new Vec2(v.y, -v.x);
            if (n === 2) return new Vec2(-v.x, -v.y);
            return new Vec2(-v.y, v.x);
        };
        const rotated = this.offsets.map(o => rot(o));
        let minX = rotated[0].x, minY = rotated[0].y;
        for (const r of rotated) {
            if (r.x < minX) minX = r.x;
            if (r.y < minY) minY = r.y;
        }
        return rotated.map(r => new Vec2(r.x - minX, r.y - minY));
    }

    private rotate90() {
        this.rotationIndex = (this.rotationIndex + 1) % 4;
        this.updateBlockPositions();
    }

    private getShapeCenterInGridUnits(): Vec2 {
        const current = this.getCurrentOffsets();
        let minX = current[0].x, minY = current[0].y, maxX = current[0].x, maxY = current[0].y;
        for (const p of current) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return new Vec2((minX + maxX) / 2, (minY + maxY) / 2);
    }

    private updateBlockPositions() {
        const theme = ThemeManager.instance!;
        const cellSize = theme.getBlockSize();
        const spacing = theme.spacing;
        const step = cellSize + spacing;
        const current = this.getCurrentOffsets();
        const center = this.getShapeCenterInGridUnits();
        for (let i = 0; i < this.blocks.length && i < current.length; i++) {
            const x = (current[i].x - center.x) * step;
            const y = (current[i].y - center.y) * step;
            this.blocks[i].setPosition(x, y, 0);
        }
    }

    onDisable() {
        if (this.touchReceiver && this.touchReceiver.isValid) {
            this.touchReceiver.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.touchReceiver.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.touchReceiver.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.touchReceiver.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
    }

    init(pattern: Vec2[], color: Color) {
        this.offsets = pattern;
        this.color = color;
        this.node.setScale(this.originalScale);
        this.startPos = this.node.position.clone();
        this.createBlocks();
        this.addTouchReceiver();
    }

    private onTouchStart(event: EventTouch) {
        if (GameManager.instance?.isPaused) return;
        const now = Date.now();
        if (now - this.lastTapTime <= Shape.DOUBLE_TAP_MS) {
            this.rotate90();
            this.lastTapTime = 0;
            return;
        }
        this.lastTapTime = now;
        this.node.setScale(this.dragScale);
        const pos = this.node.position;
        this.node.setPosition(pos.x, pos.y + 100, pos.z);
    }

    private onTouchMove(event: EventTouch) {
        const delta = event.getUIDelta();
        const pos = this.node.position;
        this.node.setPosition(pos.x + delta.x, pos.y + delta.y, pos.z);
    }

    private onTouchEnd(event: EventTouch) {
        if (GameManager.instance?.isGameOver || GameManager.instance?.isPaused) {
            this.node.setScale(this.originalScale);
            this.node.setPosition(this.startPos);
            return;
        }
        const gridManager = GridManager.instance!;
        const theme = ThemeManager.instance!;
        const cellSize = theme.getBlockSize();
        const spacing = theme.spacing;
        const step = cellSize + spacing;
        const cols = theme.columns;

        // Use same grid dimensions as GridManager (theme-based) so drop position matches
        const gridWidth = cols * step + spacing;
        const gridHeight = cols * step + spacing;

        const worldPos = this.node.worldPosition;
        const gridWorldPos = gridManager.node.worldPosition;

        // Position relative to grid left/bottom (grid left = gridWorld.x - gridWidth/2)
        const relX = worldPos.x - (gridWorldPos.x - gridWidth / 2);
        const relY = worldPos.y - (gridWorldPos.y - gridHeight / 2);

        // Cell under the shape's center: use floor so first row (bottom) stays row 0 (round would push upper half into row 1)
        let cellCenterX = Math.floor((relX - spacing - cellSize / 2) / step);
        let cellCenterY = Math.floor((relY - spacing - cellSize / 2) / step);
        cellCenterX = Math.max(0, Math.min(cols - 1, cellCenterX));
        cellCenterY = Math.max(0, Math.min(cols - 1, cellCenterY));

        // Placement origin: where offset (0,0) goes. Center of shape should land at (cellCenterX, cellCenterY).
        const centerOffset = this.getShapeCenterInGridUnits();
        const baseGridX = cellCenterX - Math.round(centerOffset.x);
        const baseGridY = cellCenterY - Math.round(centerOffset.y);

        const currentOffsets = this.getCurrentOffsets();
        // Clamp placement so the whole shape fits in [0, cols-1]; allows first row (y=0) placement
        let minOx = currentOffsets[0].x, maxOx = currentOffsets[0].x;
        let minOy = currentOffsets[0].y, maxOy = currentOffsets[0].y;
        for (const o of currentOffsets) {
            if (o.x < minOx) minOx = o.x;
            if (o.x > maxOx) maxOx = o.x;
            if (o.y < minOy) minOy = o.y;
            if (o.y > maxOy) maxOy = o.y;
        }
        const clampGx = (gx: number) => Math.max(-minOx, Math.min(cols - 1 - maxOx, gx));
        const clampGy = (gy: number) => Math.max(-minOy, Math.min(cols - 1 - maxOy, gy));
        const candidates: [number, number][] = [
            [baseGridX, baseGridY],
            [baseGridX + 1, baseGridY],
            [baseGridX - 1, baseGridY],
            [baseGridX, baseGridY + 1],
            [baseGridX, baseGridY - 1],
        ];
        let placed = false;
        for (const [gx, gy] of candidates) {
            const cx = clampGx(gx);
            const cy = clampGy(gy);
            if (gridManager.canPlaceShape(currentOffsets, cx, cy)) {
                gridManager.placeShape(currentOffsets, cx, cy, this.color);
                placed = true;
                break;
            }
        }
        if (placed) {
            this.node.emit('placed');
            GameManager.instance?.onShapePlaced();
            const scale = this.node.scale.clone();
            tween(this.node)
                .to(0.08, { scale: new Vec3(scale.x * 1.15, scale.y * 1.15, 1) })
                .to(0.12, { scale: new Vec3(scale.x * 0.9, scale.y * 0.9, 1) })
                .call(() => this.node.destroy())
                .start();
        } else {
            // Invalid drop: snap back and small shake
            this.node.setScale(this.originalScale);
            const pos = this.startPos.clone();
            tween(this.node)
                .to(0.05, { position: new Vec3(pos.x + 8, pos.y, pos.z) })
                .to(0.05, { position: new Vec3(pos.x - 6, pos.y, pos.z) })
                .to(0.05, { position: new Vec3(pos.x + 4, pos.y, pos.z) })
                .to(0.05, { position: new Vec3(pos.x, pos.y, pos.z) })
                .start();
        }
    }

    createBlocks() {
        const theme = ThemeManager.instance!;
        const cellSize = theme.getBlockSize();
        const spacing = theme.spacing;
        const step = cellSize + spacing;
        const current = this.getCurrentOffsets();
        const center = this.getShapeCenterInGridUnits();

        current.forEach(offset => {
            const blockNode = instantiate(this.blockPrefab);
            this.node.addChild(blockNode);

            const x = (offset.x - center.x) * step;
            const y = (offset.y - center.y) * step;
            blockNode.setPosition(x, y, 0);

            const block = blockNode.getComponent(Block)!;
            block.setColor(this.color);
            this.blocks.push(blockNode);
        });
    }

    /** Add a full-bounds touch receiver so dragging works (blocks would otherwise consume the touch). */
    private addTouchReceiver() {
        const theme = ThemeManager.instance!;
        const cellSize = theme.getBlockSize();
        const spacing = theme.spacing;
        const step = cellSize + spacing;
        const current = this.getCurrentOffsets();
        let maxX = current[0].x, maxY = current[0].y;
        for (const p of current) {
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        const w = Math.max(1, maxX + 1) * step + 24;
        const h = Math.max(1, maxY + 1) * step + 24;
        const receiver = new Node('TouchReceiver');
        this.node.addChild(receiver);
        receiver.setPosition(0, 0, 0);
        const ut = receiver.addComponent(UITransform);
        ut.setContentSize(w, h);
        ut.setAnchorPoint(0.5, 0.5);
        this.touchReceiver = receiver;
        receiver.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        receiver.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        receiver.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        receiver.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}
