import { _decorator, Component, Node, Label, UITransform, sys, AudioSource, AudioClip, Button } from 'cc';
import { GridManager } from './GridManager';
import { ShapeGenerator } from './ShapeGenerator';
import { GameOverUI } from './GameOverUI';
const { ccclass, property } = _decorator;

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
    private highScore: number = 0;
    private gameOverUI: GameOverUI | null = null;
    private _isGameOver = false;
    private pausePanel: Node | null = null;
    private _isPaused = false;

    get isGameOver(): boolean {
        return this._isGameOver;
    }

    get isPaused(): boolean {
        return this._isPaused;
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
        this.createPausePanel();
        this.createPauseButton();
        this.createHighScoreLabelIfNeeded();
        this.updateHighScoreLabel();
    }

    private createPausePanel() {
        const panel = new Node('PausePanel');
        this.node.addChild(panel);
        panel.setPosition(0, 0, 0);
        const ut = panel.addComponent(UITransform);
        ut.setContentSize(720, 1280);
        const titleNode = new Node('PauseTitle');
        panel.addChild(titleNode);
        titleNode.setPosition(0, 80, 0);
        const titleUt = titleNode.addComponent(UITransform);
        titleUt.setContentSize(300, 60);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = 'Paused';
        titleLabel.fontSize = 42;
        const resumeNode = new Node('ResumeButton');
        panel.addChild(resumeNode);
        resumeNode.setPosition(0, 0, 0);
        const resumeUt = resumeNode.addComponent(UITransform);
        resumeUt.setContentSize(200, 56);
        const resumeBtn = resumeNode.addComponent(Button);
        const resumeLabel = resumeNode.addComponent(Label);
        resumeLabel.string = 'Resume';
        resumeLabel.fontSize = 28;
        resumeBtn.node.on(Button.EventType.CLICK, () => this.setPaused(false), this);
        const restartNode = new Node('RestartButton');
        panel.addChild(restartNode);
        restartNode.setPosition(0, -80, 0);
        const restartUt = restartNode.addComponent(UITransform);
        restartUt.setContentSize(200, 56);
        const restartBtn = restartNode.addComponent(Button);
        const restartLabel = restartNode.addComponent(Label);
        restartLabel.string = 'Restart';
        restartLabel.fontSize = 28;
        restartBtn.node.on(Button.EventType.CLICK, () => {
            this.setPaused(false);
            this.restart();
        }, this);
        panel.active = false;
        this.pausePanel = panel;
    }

    private createPauseButton() {
        const btnNode = new Node('PauseButton');
        this.node.addChild(btnNode);
        btnNode.setPosition(-280, 520, 0);
        const ut = btnNode.addComponent(UITransform);
        ut.setContentSize(80, 44);
        const btn = btnNode.addComponent(Button);
        const lbl = btnNode.addComponent(Label);
        lbl.string = 'Pause';
        lbl.fontSize = 22;
        btn.node.on(Button.EventType.CLICK, () => this.setPaused(true), this);
    }

    setPaused(paused: boolean) {
        this._isPaused = paused;
        if (this.pausePanel) this.pausePanel.active = paused;
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
        n.setPosition(0, 520, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(200, 50);
        this.highScoreLabel = n.addComponent(Label);
        this.highScoreLabel.fontSize = 20;
        this.highScoreLabel.string = 'High: 0';
    }

    private updateHighScoreLabel() {
        if (this.highScoreLabel) {
            this.highScoreLabel.string = `High: ${this.highScore}`;
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
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this.score}`;
        }
        this.tryUpdateHighScore();
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
            this.onLineClearSound();
            const points = linesCleared * 100 * linesCleared;
            this.addScore(points);
        } else {
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
        if (this.scoreLabel) this.scoreLabel.string = 'Score: 0';
        this.shapeGenerator.clearAndRefill();
    }
}
