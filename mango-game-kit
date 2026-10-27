// ============================================================
// 芒果積木：讓小朋友「自己拉積木」組出芒果 AI 遊戲
// 三個任務：
//   任務一 教 AI（監督式學習）  任務二 看 AI 長出決策樹  任務三 AI 上工、我當品管員
// 搭配「決策樹 AI」積木（treeAI）一起使用。
// 注意：畫面文字只能顯示英文與數字。
// ============================================================

//% weight=65 color=#E84393 icon="\uf0c1" block="芒果積木"
//% groups=['1 芒果與輸送帶', '2 任務一：教 AI', '3 任務三：AI 上工']
namespace mangoKit {
    let current: Sprite = null

    function clearCurrent() {
        if (current) {
            current.destroy()
            current = null
        }
    }

    function spawn(code: number): Sprite {
        clearCurrent()
        current = sprites.create(mangoGame.mangoImage(code), SpriteKind.Mango)
        current.setPosition(-20, mangoGame.BELT_Y)
        return current
    }

    // ---------------- 1 芒果與輸送帶 ----------------

    //% block="擺好輸送帶與分級箱 顯示按鍵提示 %keys"
    //% keys.shadow=toggleYesNo keys.defl=true
    //% group="1 芒果與輸送帶" weight=100
    export function setupFactory(keys: boolean) {
        scene.setBackgroundImage(mangoGame.bg("", "", true, keys, ""))
    }

    //% block="芒果 %code 的 大小（大=1 小=0）"
    //% code.min=0 code.max=7
    //% group="1 芒果與輸送帶" weight=90
    export function sizeOf(code: number): number {
        return mangoGame.bigOf(code)
    }

    //% block="芒果 %code 的 顏色（紅=1 黃=0）"
    //% code.min=0 code.max=7
    //% group="1 芒果與輸送帶" weight=80
    export function colorOf(code: number): number {
        return mangoGame.redOf(code)
    }

    //% block="芒果 %code 的 斑點（有=1 沒有=0）"
    //% code.min=0 code.max=7
    //% group="1 芒果與輸送帶" weight=70
    export function spotOf(code: number): number {
        return mangoGame.spotOf(code)
    }

    // ---------------- 2 任務一：教 AI ----------------

    //% block="來一顆新芒果（滑到中間）"
    //% group="2 任務一：教 AI" weight=100
    export function newMango(): number {
        const code = mangoGame.nextCode()
        const m = spawn(code)
        mangoGame.slideTo(m, 80, mangoGame.BELT_Y, 110)
        m.sayText("?")
        return code
    }

    //% block="等小朋友分級（← 是 A、↑ 是 B、→ 是 C）"
    //% group="2 任務一：教 AI" weight=90
    export function askGrade(): number {
        while (true) {
            const k = mangoGame.waitKey()
            if (k < 3) return k
        }
    }

    //% block="爺爺說芒果 %code 是幾級（A=0 B=1 C=2）"
    //% code.min=0 code.max=7
    //% group="2 任務一：教 AI" weight=80
    export function grandpaAnswer(code: number): number {
        return mangoGame.truthOf(code)
    }

    //% block="回饋：芒果 %code 小朋友選 %guess"
    //% code.min=0 code.max=7 guess.min=0 guess.max=2
    //% group="2 任務一：教 AI" weight=70
    export function giveFeedback(code: number, guess: number) {
        if (!current) return
        const t = mangoGame.truthOf(code)
        if (guess == t) {
            current.sayText("GOOD!")
            current.startEffect(effects.confetti, 400)
            music.baDing.play()
        } else {
            current.sayText("IT IS " + mangoGame.LETTERS[t])
            music.wawawawaa.play()
        }
        pause(600)
        mangoGame.slideTo(current, mangoGame.BIN_X[t], 96, 170)
        clearCurrent()
    }

    //% block="等小朋友按 A 繼續"
    //% group="2 任務一：教 AI" weight=60
    export function waitForA() {
        mangoGame.waitRelease()
        while (!controller.A.isPressed()) pause(20)
        mangoGame.waitRelease()
    }

    // ---------------- 3 任務三：AI 上工 ----------------

    //% block="芒果從輸送帶左邊出發"
    //% group="3 任務三：AI 上工" weight=100
    export function newMangoAtLeft(): number {
        const code = mangoGame.nextCode()
        spawn(code)
        return code
    }

    //% block="AI 說：答案是 %answer"
    //% answer.min=0 answer.max=2
    //% group="3 任務三：AI 上工" weight=90
    export function aiSays(answer: number) {
        if (!current) return
        current.sayText("AI:" + mangoGame.LETTERS[answer])
    }

    //% block="輸送帶前進，品管員有按 A 喊停嗎？"
    //% group="3 任務三：AI 上工" weight=80
    export function conveyorAndStop(): boolean {
        if (!current) return false
        let rejected = false
        let wasA = controller.A.isPressed()
        while (current.x < mangoGame.CHUTE_X) {
            const a = controller.A.isPressed()
            if (a && !wasA && !rejected && current.x > 8) {
                rejected = true
                music.jumpUp.play()
                current.sayText("STOP!")
            }
            wasA = a
            current.setPosition(current.x + 40 * 0.02, mangoGame.BELT_Y)
            pause(20)
        }
        return rejected
    }

    //% block="處理芒果 %code AI 答案 %ai 品管員喊停 %stopped"
    //% code.min=0 code.max=7 ai.min=0 ai.max=2
    //% group="3 任務三：AI 上工" weight=70
    export function handleResult(code: number, ai: number, stopped: boolean) {
        if (!current) return
        const t = mangoGame.truthOf(code)
        let bin = ai
        if (stopped) {
            if (ai != t) {
                info.changeScoreBy(10)
                current.sayText("NICE CATCH!")
                current.startEffect(effects.confetti, 500)
                music.powerUp.play()
            } else {
                info.changeScoreBy(-5)
                current.sayText("AI WAS RIGHT")
                music.powerDown.play()
            }
            pause(600)
            bin = t
        } else if (ai == t) {
            info.changeScoreBy(2)
            music.baDing.play()
        } else {
            info.changeScoreBy(-3)
            current.sayText("WRONG BIN!")
            music.wawawawaa.play()
            current.startEffect(effects.fire, 500)
            pause(500)
        }
        mangoGame.slideTo(current, mangoGame.BIN_X[bin], 96, 150)
        clearCurrent()
    }
}
