import { _decorator, Component, Node, Prefab, instantiate, Color, Vec3 } from 'cc';
import { Shape, SHAPE_PATTERNS } from './Shape';
import { ThemeManager } from './ThemeManager';
const { ccclass, property } = _decorator;

@ccclass('ShapeGenerator')
export class ShapeGenerator extends Component {
    @property({ type: Prefab })
    shapePrefab: Prefab = null!;

    @property({ type: [Node] })
    spawnPoints: Node[] = [];

    private activeShapes: (Node | null)[] = [null, null, null];

    start() {
        this.generateAll();
    }

    generateAll() {
        for (let i = 0; i < 3; i++) {
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
        const patterns = Object.values(SHAPE_PATTERNS);
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
}
