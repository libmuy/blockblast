import { _decorator, Component, Node, Prefab, instantiate, Color, Vec3, tween, UITransform, EventTouch } from 'cc';
import { Shape, SHAPE_PATTERNS } from './Shape';
import { ThemeManager } from './ThemeManager';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

const SPAWN_SCALE = new Vec3(0.5, 0.5, 1);

@ccclass('ShapeGenerator')
export class ShapeGenerator extends Component {
    @property({ type: Prefab })
    shapePrefab: Prefab = null!;

    @property({ type: Node })
    spawnContainer: Node | null = null;

    private spawnPoints: Node[] = [];

    private activeShapes: (Node | null)[] = [];

    private areaTouchReceiver: Node | null = null;
    private dragShape: Shape | null = null;
    private dragTouchId = 0;

    start() {
        // Populate spawnPoints from the container. Use a copy so adding the touch receiver later doesn't become a spawn slot.
        if (this.spawnContainer) {
            this.spawnPoints = this.spawnContainer.children.slice();
        } else if (this.spawnPoints.length === 0) {
            console.warn('ShapeGenerator: no spawnContainer assigned and spawnPoints is empty');
        }

        // Ensure activeShapes array matches spawnPoints length
        this.activeShapes = new Array(this.spawnPoints.length).fill(null);

        this.generateAll();
        this.addSpawnAreaTouchReceiver();
    }

    private addSpawnAreaTouchReceiver() {
        if (!this.spawnContainer) return;
        const ut = this.spawnContainer.getComponent(UITransform);
        const width = ut ? ut.contentSize.width : 700;
        const height = ut ? ut.contentSize.height : 320;
        const receiver = new Node('SpawnAreaTouchReceiver');
        this.spawnContainer.addChild(receiver);
        receiver.setPosition(0, 0, 0);
        const rut = receiver.addComponent(UITransform);
        rut.setContentSize(width, height);
        rut.setAnchorPoint(0.5, 0.5);
        receiver.on(Node.EventType.TOUCH_START, this.onSpawnAreaTouchStart, this);
        receiver.on(Node.EventType.TOUCH_MOVE, this.onSpawnAreaTouchMove, this);
        receiver.on(Node.EventType.TOUCH_END, this.onSpawnAreaTouchEnd, this);
        receiver.on(Node.EventType.TOUCH_CANCEL, this.onSpawnAreaTouchEnd, this);
        this.areaTouchReceiver = receiver;
    }

    private getShapeIndexAtTouch(event: EventTouch): number {
        const touchPos = event.getUILocation();
        let bestIndex = 0;
        let bestDistSq = Infinity;
        for (let i = 0; i < this.spawnPoints.length; i++) {
            const pt = this.spawnPoints[i];
            if (!pt || !pt.isValid) continue;
            const shapeNode = this.activeShapes[i];
            if (!shapeNode || !shapeNode.isValid) continue;
            const worldPos = pt.worldPosition;
            const dx = touchPos.x - worldPos.x;
            const dy = touchPos.y - worldPos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    private onSpawnAreaTouchStart(event: EventTouch) {
        if (GameManager.instance?.isPaused) return;
        const index = this.getShapeIndexAtTouch(event);
        const shapeNode = this.activeShapes[index];
        if (!shapeNode || !shapeNode.isValid) return;
        const shape = shapeNode.getComponent(Shape);
        if (!shape) return;
        this.dragShape = shape;
        this.dragTouchId = event.getID();
        shape.startDrag(event);
    }

    private onSpawnAreaTouchMove(event: EventTouch) {
        if (this.dragShape && event.getID() === this.dragTouchId) {
            this.dragShape.updateDrag(event);
        }
    }

    private onSpawnAreaTouchEnd(event: EventTouch) {
        if (this.dragShape && event.getID() === this.dragTouchId) {
            this.dragShape.endDrag(event);
            this.dragShape = null;
        }
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

        this.playSpawnAnimation(shapeNode, index);

        shapeNode.on('placed', () => {
            this.activeShapes[index] = null;
            this.checkRefill();
        });
    }

    private playSpawnAnimation(shapeNode: Node, index: number) {
        shapeNode.setScale(0, 0, 1);
        shapeNode.setRotationFromEuler(0, 0, -18);
        const staggerDelay = index * 0.1;
        const overshoot = new Vec3(SPAWN_SCALE.x * 1.08, SPAWN_SCALE.y * 1.08, 1);
        tween(shapeNode)
            .delay(staggerDelay)
            .to(0.35, {
                scale: overshoot,
                eulerAngles: new Vec3(0, 0, 0)
            }, { easing: 'backOut' })
            .to(0.1, { scale: SPAWN_SCALE.clone() }, { easing: 'sineOut' })
            .start();
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
