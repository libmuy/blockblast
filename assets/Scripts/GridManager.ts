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

        blocksToRemove.forEach(block => {
            tween(block.node)
                .to(0.3, { scale: new Vec3(0, 0, 0) })
                .call(() => block.node.destroy())
                .start();
        });

        return totalCleared;
    }
}
