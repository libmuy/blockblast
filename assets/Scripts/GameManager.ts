import { _decorator, Component, Node, Label } from 'cc';
import { GridManager } from './GridManager';
import { ShapeGenerator } from './ShapeGenerator';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager | null = null;

    @property({ type: Label })
    scoreLabel: Label = null!;

    @property({ type: ShapeGenerator })
    shapeGenerator: ShapeGenerator = null!;

    private score: number = 0;

    onLoad() {
        GameManager.instance = this;
    }

    addScore(points: number) {
        this.score += points;
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this.score}`;
        }
    }

    onShapePlaced() {
        const gridManager = GridManager.instance!;
        const linesCleared = gridManager.checkAndClearLines();

        if (linesCleared > 0) {
            // Bonus for multiple lines
            const points = linesCleared * 100 * linesCleared;
            this.addScore(points);
        }

        this.scheduleOnce(() => {
            if (this.checkGameOver()) {
                console.log("GAME OVER");
                // Here you would show a game over UI
            }
        }, 0.5);
    }

    checkGameOver(): boolean {
        const gridManager = GridManager.instance!;
        const activeShapes = this.shapeGenerator.getActiveShapes();
        const cols = gridManager.blocks.length;

        for (const shape of activeShapes) {
            const offsets = shape.offsets;
            let canPlaceAnywhere = false;

            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < cols; y++) {
                    if (gridManager.canPlaceShape(offsets, x, y)) {
                        canPlaceAnywhere = true;
                        break;
                    }
                }
                if (canPlaceAnywhere) break;
            }

            if (canPlaceAnywhere) {
                // At least one shape can be placed
                return false;
            }
        }

        // None of the active shapes can be placed
        return activeShapes.length > 0;
    }
}
