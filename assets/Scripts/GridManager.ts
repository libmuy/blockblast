import { _decorator, Component, Node, Prefab, instantiate, Layout, UITransform , tween, Vec3, Color} from 'cc';
import { ThemeManager } from './ThemeManager';
import { Block } from './Block';
const { ccclass, property } = _decorator;

@ccclass('GridManager')
export class GridManager extends Component {
    
    @property({ type: Prefab })
    blockPrefab: Prefab = null!;
    
    private theme: ThemeManager;
    blocks: Block[][] = [];
    
    start() {
        this.theme = ThemeManager.instance!;
    }
    
    spawnBlock(gridX: number, gridY: number, color: Color) {
        const cellSize = this.theme.getBlockSize();
        const worldX = gridX * cellSize + this.node.position.x;
        const worldY = gridY * cellSize + this.node.position.y;
        
        // Spawn block prefab at exact grid position
        const block = instantiate(this.blockPrefab);
        block.setPosition(worldX, worldY);
        this.node.addChild(block);
        
        this.blocks[gridX][gridY] = block.getComponent(Block)!;
    }
    
    moveBlock(gridX: number, gridY: number, newX: number, newY: number) {
        const cellSize = this.theme.getBlockSize();
        tween(this.blocks[gridX][gridY].node)
            .to(0.3, { position: new Vec3(newX * cellSize, newY * cellSize, 0) })
            .call(() => {
                // Update grid array position
                this.blocks[newX][newY] = this.blocks[gridX][gridY];
                this.blocks[gridX][gridY] = null;
            })
            .start();
    }
}
