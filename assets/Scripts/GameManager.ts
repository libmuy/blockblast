import { _decorator, Component, Node, Label, UITransform, sys, AudioSource, AudioClip, tween, Vec3, Color, UIOpacity } from 'cc';
import { GridManager } from './GridManager';
import { ShapeGenerator } from './ShapeGenerator';
import { GameOverUI } from './GameOverUI';
const { ccclass, property } = _decorator;

function getClearTier(linesCleared: number): 1 | 2 | 3 | 4 {
    if (linesCleared >= 4) return 4;
    if (linesCleared === 3) return 3;
    if (linesCleared === 2) return 2;
    return 1;
}

const HIGH_SCORE_KEY = 'blockblast_highscore';

@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager | null = null;

    @property({ type: Label })
    scoreLabel: Label = null!;

    @property({ type: Label })
    highScoreLabel: Label | null = null;

    @property({ type: ShapeGenerator })
    shapeGenerator: ShapeGenerator = null!;

    @property({ type: AudioSource })
    audioSource: AudioSource | null = null;

    @property({ type: AudioClip })
    placeClip: AudioClip | null = null;

    @property({ type: AudioClip })
    clearLineClip: AudioClip | null = null;

    @property({ type: AudioClip })
    gameOverClip: AudioClip | null = null;

    private score: number = 0;
    private displayedScore: number = 0;
    private highScore: number = 0;
    private gameOverUI: GameOverUI | null = null;
    private _isGameOver = false;
    private comboCount: number = 0;
    private comboBadgeNode: Node | null = null;
    private comboLabel: Label | null = null;

    get isGameOver(): boolean {
        return this._isGameOver;
    }

    get isPaused(): boolean {
        return false;
    }

    onLoad() {
        GameManager.instance = this;
        const saved = sys.localStorage.getItem(HIGH_SCORE_KEY);
        if (saved != null) {
            const n = parseInt(saved, 10);
            if (!isNaN(n)) this.highScore = n;
        }
        if (!this.audioSource) {
            this.audioSource = this.node.getComponent(AudioSource) || this.node.addComponent(AudioSource);
        }
        this.createGameOverPanel();
        this.createHighScoreLabelIfNeeded();
        this.createScoreLabelIfNeeded();
        this.createComboBadge();
        this.updateHighScoreLabel();
        this.updateScoreLabel();
    }

    update(dt: number) {
        if (this.displayedScore !== this.score && this.scoreLabel) {
            const diff = this.score - this.displayedScore;
            const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.15));
            this.displayedScore += diff > 0 ? step : -step;
            if (Math.abs(this.score - this.displayedScore) < step) this.displayedScore = this.score;
            this.scoreLabel.string = `当前分数: ${this.displayedScore}`;
        }
    }

    private createComboBadge() {
        const badge = new Node('ComboBadge');
        this.node.addChild(badge);
        badge.setPosition(260, 460, 0);
        const ut = badge.addComponent(UITransform);
        ut.setContentSize(140, 44);
        const label = badge.addComponent(Label);
        label.string = 'Combo x2';
        label.fontSize = 26;
        label.color = new Color(255, 220, 100);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        badge.addComponent(UIOpacity);
        badge.active = false;
        this.comboBadgeNode = badge;
        this.comboLabel = label;
    }

    private updateComboUI() {
        if (!this.comboBadgeNode || !this.comboLabel) return;
        if (this.comboCount >= 2) {
            this.comboBadgeNode.active = true;
            this.comboLabel.string = `Combo x${this.comboCount}`;
            this.comboLabel.color = new Color(
                Math.min(255, 200 + this.comboCount * 8),
                Math.min(255, 180 + this.comboCount * 4),
                80
            );
            const n = this.comboBadgeNode;
            n.setScale(1.2, 1.2, 1);
            tween(n).to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        } else {
            this.comboBadgeNode.active = false;
        }
    }

    private playSound(clip: AudioClip | null) {
        if (this.audioSource && clip) {
            this.audioSource.playOneShot(clip);
        }
    }

    private createGameOverPanel() {
        const panel = new Node('GameOverPanel');
        this.node.addChild(panel);
        panel.setPosition(0, 0, 0);
        const ut = panel.addComponent(UITransform);
        ut.setContentSize(720, 1280);
        this.gameOverUI = panel.addComponent(GameOverUI);
        panel.active = false;
    }

    private createHighScoreLabelIfNeeded() {
        if (this.highScoreLabel) return;
        const n = new Node('HighScoreLabel');
        this.node.addChild(n);
        n.setPosition(-280, 520, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(220, 50);
        this.highScoreLabel = n.addComponent(Label);
        this.highScoreLabel.fontSize = 22;
        this.highScoreLabel.string = '最高纪录: 0';
    }

    private createScoreLabelIfNeeded() {
        if (this.scoreLabel && this.scoreLabel.node && this.scoreLabel.node.isValid) return;
        const n = new Node('ScoreLabel');
        this.node.addChild(n);
        n.setPosition(0, 480, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(400, 70);
        ut.setAnchorPoint(0.5, 0.5);
        this.scoreLabel = n.addComponent(Label);
        this.scoreLabel.fontSize = 42;
        this.scoreLabel.isBold = true;
        this.scoreLabel.fontFamily = 'Arial Black';
        this.scoreLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.scoreLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.scoreLabel.string = '当前分数: 0';
    }

    private updateHighScoreLabel() {
        if (this.highScoreLabel) {
            this.highScoreLabel.string = `最高纪录: ${this.highScore}`;
        }
    }

    private tryUpdateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            sys.localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
            this.updateHighScoreLabel();
        }
    }

    addScore(points: number) {
        this.score += points;
        this.tryUpdateHighScore();
        if (this.scoreLabel) {
            const labelNode = this.scoreLabel.node;
            labelNode.setScale(1.1, 1.1, 1);
            tween(labelNode).to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        }
    }

    private updateScoreLabel() {
        if (this.scoreLabel) {
            this.displayedScore = this.score;
            this.scoreLabel.string = `当前分数: ${this.score}`;
        }
    }

    onPlaceSound() {
        this.playSound(this.placeClip);
    }

    onLineClearSound() {
        this.playSound(this.clearLineClip);
    }

    onGameOverSound() {
        this.playSound(this.gameOverClip);
    }

    onShapePlaced() {
        const gridManager = GridManager.instance!;
        const linesCleared = gridManager.checkAndClearLines();

        if (linesCleared > 0) {
            this.comboCount++;
            this.updateComboUI();
            this.onLineClearSound();
            const points = linesCleared * 100 * linesCleared;
            this.addScore(points);
            const tier = getClearTier(linesCleared);
            gridManager.playClearEffect(points, tier, this.comboCount);
        } else {
            this.comboCount = 0;
            this.updateComboUI();
            this.onPlaceSound();
        }

        this.scheduleOnce(() => {
            if (this.checkGameOver()) {
                this._isGameOver = true;
                this.tryUpdateHighScore();
                this.onGameOverSound();
                if (this.gameOverUI) {
                    this.gameOverUI.show(this.score);
                }
            }
        }, 0.5);
    }

    checkGameOver(): boolean {
        const gridManager = GridManager.instance!;
        const activeShapes = this.shapeGenerator.getActiveShapes();
        const cols = gridManager.blocks.length;

        for (const shape of activeShapes) {
            const offsets = shape.getCurrentOffsets();
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

    /** Soft restart: clear grid, score, shapes, hide game-over panel. Option A: use director.loadScene('scene') for full reload. */
    restart() {
        this._isGameOver = false;
        if (this.gameOverUI) this.gameOverUI.hide();
        const gridManager = GridManager.instance!;
        gridManager.clearAll();
        this.score = 0;
        this.displayedScore = 0;
        this.comboCount = 0;
        this.updateComboUI();
        this.updateScoreLabel();
        this.shapeGenerator.clearAndRefill();
    }
}
