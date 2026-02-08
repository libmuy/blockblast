import { _decorator, Component, Node, Color, CCInteger, director, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ThemeManager')
export class ThemeManager extends Component {
    static instance: ThemeManager | null = null;
    
    @property({ type: Color })
    primaryColor = Color.BLUE;
    
    @property({ type: Color })
    secondaryColor = Color.GREEN;
    
    @property({ type: Color })
    accentColor = Color.YELLOW;
    
    @property({ type: [Color] })
    blockColors: Color[] = [Color.RED, Color.BLUE, Color.GREEN, Color.YELLOW, new Color(200, 0, 200)];
    
    @property({ type: Color })
    centerBackgroundColor = Color.GRAY;

    @property({ type: Color })
    backgroundColor = new Color(20, 30, 50);

    @property({type: CCInteger})
    centerAreaWidth = 600;

    @property({type: CCInteger})
    centerAreaBorderWidth = 10;

    @property({type: CCInteger})
    spacing = 2;
    
    @property({type: CCInteger})
    columns = 8;

    getBlockSize(): number {
        const totalSpacing = this.spacing * (this.columns + 1);
        const totalBlockWidth = this.centerAreaWidth - totalSpacing;
        return totalBlockWidth / this.columns;
    }
    
    start() {
        if (ThemeManager.instance) {
            this.destroy();
            return;
        }
        ThemeManager.instance = this;

        const camera = director.getScene()?.getComponentInChildren(Camera);
        if (camera) {
            camera.clearColor = this.backgroundColor;
        }
    }
    
    
    getRandomBlockColor(): Color {
        return this.blockColors[Math.floor(Math.random() * this.blockColors.length)]!;
    }

    changeTheme(newPrimary: Color, newSecondary: Color, newBg: Color) {
        this.primaryColor = newPrimary;
        this.secondaryColor = newSecondary;
        this.centerBackgroundColor = newBg;
        this.node.emit('theme-changed');
    }
    

}

