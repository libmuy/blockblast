import { _decorator, Component, Prefab, instantiate, Node, Vec3, Color, find, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BlockContainer')
export class BlockContainer extends Component {
    @property({ type: Prefab })
    blockPrefab: Prefab = null!;  // Your Block prefab
    
    @property({ type: Node })
    gridManager: Node = null!;    // GridManager node reference
    
    // Grid state (10x15 for Block Blast)
    private blocks: Node[][] = [];
    private gridWidth = 10;
    private gridHeight = 15;
    private cellSize = 60;
    
    onLoad() {
        this.initGrid();
    }
    
    initGrid() {
        // Initialize empty grid
        this.blocks = [];
        for (let x = 0; x < this.gridWidth; x++) {
            this.blocks[x] = [];
            for (let y = 0; y < this.gridHeight; y++) {
                this.blocks[x][y] = null;
            }
        }
    }
    
    // Spawn block at grid position
spawnBlock(gridX: number, gridY: number, color?: Color) {
    if (!this.blockPrefab || gridX < 0 || gridX >= this.gridWidth || 
        gridY < 0 || gridY >= this.gridHeight || this.blocks[gridX][gridY]) {
        return null;
    }
    
    const blockNode = instantiate(this.blockPrefab);
    const block = blockNode.getComponent('Block')!;
    
    // Position in world space
    const worldPos = new Vec3(
        gridX * this.cellSize,
        gridY * this.cellSize,
        0
    );
    blockNode.setPosition(worldPos);
    
    // Random color if none provided - FIXED
    if (!color) {
        // Option 1: Direct fallback array (most reliable)
        const fallbackColors = [Color.RED, Color.BLUE, Color.GREEN, Color.YELLOW, new Color(200, 0, 200)];
        color = fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
        
        // Option 2: Try ThemeManager (if it exists with correct method)
        const themeNode = find('Canvas/ThemeManager');
        if (themeNode) {
            const theme = themeNode.getComponent('ThemeManager');
            if (theme && typeof (theme as any).getRandomBlockColor === 'function') {
                color = (theme as any).getRandomBlockColor();
            }
        }
    }
    
    this.node.addChild(blockNode);
    this.blocks[gridX][gridY] = blockNode;
    
    return blockNode;
}
    
    // Get block at position
    getBlock(gridX: number, gridY: number): Node | null {
        return this.blocks[gridX]?.[gridY] || null;
    }
    
    // Move block with animation
    moveBlock(oldX: number, oldY: number, newX: number, newY: number, duration = 0.3) {
        const block = this.blocks[oldX][oldY];
        if (!block) return;
        
        const newWorldPos = new Vec3(newX * this.cellSize, newY * this.cellSize, 0);
        
        // Animate move
        tween(block)
            .to(duration, { position: newWorldPos })
            .call(() => {
                // Update grid state
                this.blocks[newX][newY] = block;
                this.blocks[oldX][oldY] = null;
            })
            .start();
    }
    
    // Clear block (with pop animation)
    clearBlock(gridX: number, gridY: number, callback?: Function) {
        const block = this.blocks[gridX][gridY];
        if (!block) return;
        
        tween(block)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(0, 0, 0) })
            .call(() => {
                block.destroy();
                this.blocks[gridX][gridY] = null;
                callback?.();
            })
            .start();
    }
    
    // Fill top rows randomly (game start)
    fillRandomBlocks(rowCount = 8) {
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = this.gridHeight - 1; y >= this.gridHeight - rowCount; y--) {
                this.spawnBlock(x, y);
            }
        }
    }
    
    // Check if position is empty
    isEmpty(gridX: number, gridY: number): boolean {
        return !this.blocks[gridX]?.[gridY];
    }
}
