import { _decorator, Component, Node, Prefab, instantiate, Color, Vec3 } from 'cc';
import { Shape, SHAPE_PATTERNS } from './Shape';
import { ThemeManager } from './ThemeManager';
const { ccclass, property } = _decorator;

@ccclass('ShapeGenerator')
export class ShapeGenerator extends Component {
    @property({ type: Prefab })
    shapePrefab: Prefab = null!;

    @property({ type: Node })
    spawnContainer: Node | null = null;

    private spawnPoints: Node[] = [];

    private activeShapes: (Node | null)[] = [];

    start() {
        // populate spawnPoints from the assigned container (fallback to any pre-filled array)
        if (this.spawnContainer) {
            this.spawnPoints = this.spawnContainer.children;
        } else if (this.spawnPoints.length === 0) {
            console.warn('ShapeGenerator: no spawnContainer assigned and spawnPoints is empty');
        }

        // ensure activeShapes array matches spawnPoints length
        this.activeShapes = new Array(this.spawnPoints.length).fill(null);

        this.generateAll();
    }

    generateAll() {
        for (let i = 0; i < this.spawnPoints.length; i++) {
            this.generateShape(i);
        }
    }

    generateShape(index: number) {
        if (this.activeShapes[index]) return;

        const shapeNode = instantiate(this.shapePrefab);
        const spawnPoint = this.spawnPoints[index];
        spawnPoint.addChild(shapeNode);
        shapeNode.setPosition(0, 0, 0);

        const shape = shapeNode.getComponent(Shape)!;
        const patterns = Object.keys(SHAPE_PATTERNS).map(key => SHAPE_PATTERNS[key as keyof typeof SHAPE_PATTERNS]);
        const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const randomColor = ThemeManager.instance!.getRandomBlockColor();

        shape.init(randomPattern, randomColor);
        this.activeShapes[index] = shapeNode;

        shapeNode.on('placed', () => {
            this.activeShapes[index] = null;
            this.checkRefill();
        });
    }

    checkRefill() {
        if (this.activeShapes.every(s => s === null)) {
            this.generateAll();
        }
    }

    getActiveShapes(): Shape[] {
        return this.activeShapes
            .filter(s => s !== null)
            .map(s => s!.getComponent(Shape)!);
    }

    clearAndRefill() {
        for (let i = 0; i < this.activeShapes.length; i++) {
            const node = this.activeShapes[i];
            if (node && node.isValid) {
                node.destroy();
            }
            this.activeShapes[i] = null;
        }
        this.generateAll();
    }
}
