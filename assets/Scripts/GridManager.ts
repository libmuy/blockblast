import { _decorator, Component, Node, Prefab, instantiate, Layout, UITransform , tween, Vec3, Color, Vec2} from 'cc';
import { ThemeManager } from './ThemeManager';
import { Block } from './Block';
const { ccclass, property } = _decorator;

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
        const step = this.theme.getBlockSize() + this.theme.spacing;
        const gridSize = this.theme.columns * step + this.theme.spacing;
        const ut = this.getComponent(UITransform)!;
        ut.setContentSize(gridSize, gridSize);
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

        // Brief delay then clear with scale-down; optional shake on grid
        const gridNode = this.node;
        const origPos = gridNode.position.clone();
        const delay = 0.08;
        blocksToRemove.forEach(block => {
            tween(block.node)
                .delay(delay)
                .to(0.25, { scale: new Vec3(0, 0, 0) })
                .call(() => block.node.destroy())
                .start();
        });
        tween(gridNode)
            .delay(delay)
            .to(0.04, { position: new Vec3(origPos.x + 4, origPos.y, origPos.z) })
            .to(0.04, { position: new Vec3(origPos.x - 3, origPos.y, origPos.z) })
            .to(0.04, { position: new Vec3(origPos.x, origPos.y, origPos.z) })
            .start();

        return totalCleared;
    }
}
