import { _decorator, Component, Node, Prefab, instantiate, UITransform, tween, Vec3, Color, Vec2, Layout, Label, UIOpacity } from 'cc';
import { ThemeManager } from './ThemeManager';
import { Block } from './Block';
const { ccclass, property } = _decorator;

/** Clear effect tier by lines cleared: 1, 2, 3, 4+ */
function getClearTier(linesCleared: number): 1 | 2 | 3 | 4 {
    if (linesCleared >= 4) return 4;
    if (linesCleared === 3) return 3;
    if (linesCleared === 2) return 2;
    return 1;
}

@ccclass('GridManager')
export class GridManager extends Component {
    static instance: GridManager | null = null;
    
    @property({ type: Prefab })
    blockPrefab: Prefab = null!;
    
    private theme: ThemeManager = null!;
    public blocks: (Block | null)[][] = [];
    
    onLoad() {
        GridManager.instance = this;
    }

    start() {
        this.theme = ThemeManager.instance!;
        this.initGrid();
        const layout = this.getComponent(Layout);
        if (layout) layout.destroy();
        const step = this.theme.getBlockSize() + this.theme.spacing;
        const gridSize = this.theme.columns * step + this.theme.spacing;
        const ut = this.getComponent(UITransform)!;
        ut.setContentSize(gridSize, gridSize);
        // Reparent under Center so blocks and grid lines use the same coordinate system (no offset)
        const centerNode = this.node.parent?.getChildByName('Center');
        if (centerNode) {
            this.node.setParent(centerNode);
            this.node.setPosition(0, 0, 0);
        }
    }
    
    initGrid() {
        const cols = this.theme.columns;
        this.blocks = [];
        for (let x = 0; x < cols; x++) {
            this.blocks[x] = [];
            for (let y = 0; y < cols; y++) {
                this.blocks[x][y] = null;
            }
        }
    }

    clearAll() {
        if (!this.theme) return;
        const cols = this.theme.columns;
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < cols; y++) {
                const block = this.blocks[x][y];
                if (block && block.node) {
                    block.node.destroy();
                }
                this.blocks[x][y] = null;
            }
        }
        this.initGrid();
    }

    spawnBlock(gridX: number, gridY: number, color: Color) {
        const cellSize = this.theme.getBlockSize();
        const spacing = this.theme.spacing;

        // Calculate position relative to bottom-left of grid
        const x = spacing + gridX * (cellSize + spacing) + cellSize / 2;
        const y = spacing + gridY * (cellSize + spacing) + cellSize / 2;

        const blockNode = instantiate(this.blockPrefab);
        this.node.addChild(blockNode);

        // Adjust for center anchor of grid node if necessary
        const uiTransform = this.getComponent(UITransform)!;
        const worldX = x - uiTransform.width / 2;
        const worldY = y - uiTransform.height / 2;
        // #region agent log
        if (gridX === 0 && gridY === 0) {
            fetch('http://127.0.0.1:7242/ingest/c750bf47-ec44-4bde-94e8-4293a3362f5e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GridManager.ts:spawnBlock',message:'cell 0,0 block position',data:{worldX,worldY,x,y,gridX,gridY,utWidth:uiTransform.width,utHeight:uiTransform.height},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
        }
        // #endregion
        blockNode.setPosition(worldX, worldY);
        
        const block = blockNode.getComponent(Block)!;
        block.setColor(color);
        this.blocks[gridX][gridY] = block;
        return block;
    }
    
    moveBlock(gridX: number, gridY: number, newX: number, newY: number) {
        const block = this.blocks[gridX][gridY];
        if (!block) return;

        const cellSize = this.theme.getBlockSize();
        const spacing = this.theme.spacing;
        const uiTransform = this.getComponent(UITransform)!;

        const x = spacing + newX * (cellSize + spacing) + cellSize / 2 - uiTransform.width / 2;
        const y = spacing + newY * (cellSize + spacing) + cellSize / 2 - uiTransform.height / 2;

        tween(block.node)
            .to(0.3, { position: new Vec3(x, y, 0) })
            .call(() => {
                this.blocks[newX][newY] = block;
                this.blocks[gridX][gridY] = null;
            })
            .start();
    }

    isPositionEmpty(x: number, y: number): boolean {
        const cols = this.theme.columns;
        if (x < 0 || x >= cols || y < 0 || y >= cols) return false;
        return this.blocks[x][y] === null;
    }

    canPlaceShape(offsets: Vec2[], gridX: number, gridY: number): boolean {
        for (const offset of offsets) {
            const x = gridX + offset.x;
            const y = gridY + offset.y;
            if (!this.isPositionEmpty(x, y)) {
                return false;
            }
        }
        return true;
    }

    placeShape(offsets: Vec2[], gridX: number, gridY: number, color: Color) {
        if (!this.canPlaceShape(offsets, gridX, gridY)) return false;

        for (const offset of offsets) {
            const x = gridX + offset.x;
            const y = gridY + offset.y;
            this.spawnBlock(x, y, color);
        }
        return true;
    }

    checkAndClearLines(): number {
        const cols = this.theme.columns;
        let rowsToClear: number[] = [];
        let colsToClear: number[] = [];

        // Check rows
        for (let y = 0; y < cols; y++) {
            let full = true;
            for (let x = 0; x < cols; x++) {
                if (this.blocks[x][y] === null) {
                    full = false;
                    break;
                }
            }
            if (full) rowsToClear.push(y);
        }

        // Check columns
        for (let x = 0; x < cols; x++) {
            let full = true;
            for (let y = 0; y < cols; y++) {
                if (this.blocks[x][y] === null) {
                    full = false;
                    break;
                }
            }
            if (full) colsToClear.push(x);
        }

        const totalCleared = rowsToClear.length + colsToClear.length;
        if (totalCleared === 0) return 0;

        // Clear blocks
        const blocksToRemove = new Set<Block>();
        for (const y of rowsToClear) {
            for (let x = 0; x < cols; x++) {
                blocksToRemove.add(this.blocks[x][y]!);
                this.blocks[x][y] = null;
            }
        }
        for (const x of colsToClear) {
            for (let y = 0; y < cols; y++) {
                if (this.blocks[x][y]) {
                    blocksToRemove.add(this.blocks[x][y]!);
                    this.blocks[x][y] = null;
                }
            }
        }

        const points = totalCleared * 100 * totalCleared;
        const tier = getClearTier(totalCleared);
        const gridNode = this.node;
        const origPos = gridNode.position.clone();
        const baseDelay = 0.06;

        // Per-block: random delay, flash, squash & stretch, random rotation, then shrink
        const doSquashStretch = tier >= 2;
        const rotateBase = tier === 1 ? 0 : tier === 2 ? 90 : tier === 3 ? 180 : 360;

        blocksToRemove.forEach(block => {
            const node = block.node;
            const extraDelay = Math.random() * 0.18;
            const rotateDeg = rotateBase + (rotateBase > 0 ? (Math.random() - 0.5) * 120 : 0);
            const seq = tween(node).delay(baseDelay + extraDelay);
            if (doSquashStretch) {
                seq.to(0.06, { scale: new Vec3(1.35, 0.7, 1) }, { easing: 'sineOut' });
                seq.to(0.06, { scale: new Vec3(0.7, 1.3, 1) }, { easing: 'sineInOut' });
            }
            seq.to(0.22, {
                scale: new Vec3(0, 0, 0),
                eulerAngles: new Vec3(0, 0, rotateDeg)
            }, { easing: 'sineIn' });
            seq.call(() => node.destroy());
            seq.start();
        });

        // Grid shake intensity by tier
        const shakeA = tier === 1 ? 4 : tier === 2 ? 6 : tier === 3 ? 10 : 14;
        const shakeB = tier === 1 ? 3 : tier === 2 ? 5 : tier === 3 ? 8 : 12;
        const shakeDur = tier === 1 ? 0.04 : 0.05;
        tween(gridNode)
            .delay(baseDelay)
            .to(shakeDur, { position: new Vec3(origPos.x + shakeA, origPos.y, origPos.z) })
            .to(shakeDur, { position: new Vec3(origPos.x - shakeB, origPos.y, origPos.z) })
            .to(shakeDur, { position: new Vec3(origPos.x + shakeB * 0.6, origPos.y, origPos.z) })
            .to(shakeDur, { position: new Vec3(origPos.x, origPos.y, origPos.z) })
            .start();

        return totalCleared;
    }

    /** Called by GameManager after a clear to show floating text. Combo is 1-based (1 = first clear). */
    playClearEffect(points: number, tier: 1 | 2 | 3 | 4, combo: number = 1) {
        const texts: Record<number, string> = {
            1: 'Nice!',
            2: 'Double!',
            3: 'Triple!',
            4: 'Amazing!'
        };
        const text = tier >= 4 ? texts[4]! : texts[tier]!;
        const fontSize = tier === 1 ? 52 : tier === 2 ? 62 : tier === 3 ? 76 : 96;
        const colors: Record<number, Color> = {
            1: new Color(100, 220, 120),
            2: new Color(100, 180, 255),
            3: new Color(200, 120, 255),
            4: new Color(255, 200, 60)
        };
        const color = colors[tier]!;
        const showCombo = combo >= 2;

        const effectNode = new Node('ClearEffect');
        this.node.addChild(effectNode);
        effectNode.setPosition(0, 0, 0);
        effectNode.setScale(0.3);

        const labelNode = new Node('ScoreLabel');
        effectNode.addChild(labelNode);
        const ut = labelNode.addComponent(UITransform);
        ut.setContentSize(420, showCombo ? 220 : 160);
        const label = labelNode.addComponent(Label);
        label.string = showCombo ? `Combo x${combo}\n${text}\n+${points}` : `${text}\n+${points}`;
        label.fontSize = fontSize;
        label.isBold = true;
        label.fontFamily = 'Arial Black';
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.lineHeight = fontSize + 12;

        const opacity = effectNode.addComponent(UIOpacity);
        opacity.opacity = 255;

        tween(effectNode)
            .to(0.12, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
        tween(labelNode)
            .delay(0.2)
            .to(0.35, { position: new Vec3(0, 45, 0) })
            .start();
        tween(opacity)
            .delay(0.25)
            .to(0.3, { opacity: 0 })
            .call(() => effectNode.destroy())
            .start();
    }
}
