import { _decorator, Component, Node, Label, Button, UITransform, Widget, Color, Vec3 } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('GameOverUI')
export class GameOverUI extends Component {
    @property({ type: Label })
    titleLabel: Label | null = null;

    @property({ type: Label })
    finalScoreLabel: Label | null = null;

    @property({ type: Button })
    restartButton: Button | null = null;

    private _createdInCode = false;

    onLoad() {
        if (!this.titleLabel || !this.finalScoreLabel || !this.restartButton) {
            this.createContent();
            this._createdInCode = true;
        }
        if (this.restartButton) {
            this.restartButton.node.on(Button.EventType.CLICK, this.onRestartClick, this);
        }
    }

    onDestroy() {
        if (this.restartButton) {
            this.restartButton.node.off(Button.EventType.CLICK, this.onRestartClick, this);
        }
    }

    private createContent() {
        const ui = this.node.getComponent(UITransform);
        if (!ui) this.node.addComponent(UITransform).setContentSize(720, 1280);
        const w = this.node.getComponent(Widget) || this.node.addComponent(Widget);
        w.isAlignLeft = w.isAlignRight = w.isAlignTop = w.isAlignBottom = true;
        w.left = w.right = w.top = w.bottom = 0;
        w.updateAlignment();

        const createLabel = (name: string, text: string, y: number, fontSize = 32): Label => {
            const n = new Node(name);
            this.node.addChild(n);
            n.setPosition(0, y, 0);
            const ut = n.addComponent(UITransform);
            ut.setContentSize(400, 60);
            const label = n.addComponent(Label);
            label.string = text;
            label.fontSize = fontSize;
            label.color = new Color(255, 255, 255);
            return label;
        };

        if (!this.titleLabel) {
            this.titleLabel = createLabel('Title', 'Game Over', 80, 48);
        }
        if (!this.finalScoreLabel) {
            this.finalScoreLabel = createLabel('FinalScore', 'Score: 0', 0, 36);
        }
        if (!this.restartButton) {
            const btnNode = new Node('RestartButton');
            this.node.addChild(btnNode);
            btnNode.setPosition(0, -120, 0);
            const btnUt = btnNode.addComponent(UITransform);
            btnUt.setContentSize(200, 60);
            this.restartButton = btnNode.addComponent(Button);
            const btnLabel = btnNode.addComponent(Label);
            btnLabel.string = 'Restart';
            btnLabel.fontSize = 28;
            btnLabel.color = new Color(255, 255, 255);
            this.restartButton.node.on(Button.EventType.CLICK, this.onRestartClick, this);
        }
    }

    private onRestartClick() {
        GameManager.instance?.restart();
    }

    show(finalScore: number) {
        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = `Score: ${finalScore}`;
        }
        this.node.active = true;
    }

    hide() {
        this.node.active = false;
    }
}
