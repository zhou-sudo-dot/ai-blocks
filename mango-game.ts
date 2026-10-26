// ============================================================
// 芒果小學徒 MANGO AI —— 教 AI 分芒果的遊戲
// 對應《和 AI 做朋友》：4-2 監督式學習、4-3 決策樹（愛文芒果分級）
//
// 玩法：
//  【教學】芒果一個一個來，你按鍵分級（← A、↑ B、→ C），
//         爺爺的「祕密規則」會告訴你對不對，AI 同時把「標準答案」記下來。
//  【學習】AI 把範例變成一棵決策樹，畫給你看。
//  【檢查】換 AI 上工！AI 會喊出它的分級，你當品管員：
//         AI 錯了就按 A 喊「停」，抓到加 10 分；AI 對了還喊停會扣分；
//         漏掉錯誤的芒果會被扣一顆愛心。
//  【成績】看每一輪 AI 的準確率長條圖。資料越多，AI 越聰明！
//         AI 一整輪全對就「畢業」，重新開始。
//
// 特徵：大小（大＝重）、顏色（紅／黃）、斑點（有／無）
// 爺爺的祕密規則（和課本一樣）：有斑點→C；沒斑點且紅且大→A；其他→B
// 注意：遊戲機字型只能顯示英文數字，所以畫面用英文縮寫與圖示。
// ============================================================

namespace SpriteKind {
    export const Mango = SpriteKind.create()
    export const Helper = SpriteKind.create()
}

namespace mangoGame {
    const LABEL_COLOR = [7, 5, 2]          // A 綠、B 黃、C 紅
    const LETTERS = ["A", "B", "C"]
    const BIN_X = [26, 80, 134]
    const BIN_HINT = ["<A", "^B", "C>"]
    const MIN_EXAMPLES = 4                  // 至少教幾個才能交給 AI
    const WORK_COUNT = 8                    // 每輪檢查幾個芒果
    const BELT_Y = 40
    const CHUTE_X = 128

    let deck: number[] = []
    let history: number[] = []
    let score = 0
    let round = 1

    // ---------- 芒果資料：code 0~7 ----------
    function bigOf(code: number): number {
        return Math.idiv(code, 4) % 2
    }
    function redOf(code: number): number {
        return Math.idiv(code, 2) % 2
    }
    function spotOf(code: number): number {
        return code % 2
    }
    // 爺爺的祕密規則（標準答案）：0=A 1=B 2=C
    function truthOf(code: number): number {
        if (spotOf(code) == 1) return 2
        if (redOf(code) == 1 && bigOf(code) == 1) return 0
        return 1
    }

    function refillDeck() {
        deck = []
        for (let i = 0; i < 8; i++) deck.push(i)
        for (let i = 7; i > 0; i--) {
            const j = Math.randomRange(0, i)
            const t = deck[i]
            deck[i] = deck[j]
            deck[j] = t
        }
    }
    function nextCode(): number {
        if (deck.length == 0) refillDeck()
        return deck.pop()
    }

    // ---------- 圖像 ----------
    function mangoImage(code: number): Image {
        const big = bigOf(code) == 1
        const red = redOf(code) == 1
        const spot = spotOf(code) == 1
        const s = big ? 34 : 24
        const r = big ? 14 : 9
        const c = Math.idiv(s, 2)
        const img = image.create(s, s)
        img.fillCircle(c, c + 2, r, red ? 2 : 5)
        img.fillRect(c, 0, 2, 5, 14)                       // 果柄
        img.fillRect(c + 2, 1, 5, 3, 7)                    // 葉子
        img.fillRect(c - Math.idiv(r, 2), c - Math.idiv(r, 3), 2, 2, 1)   // 高光
        if (spot) {
            img.fillRect(c + 3, c + 4, 3, 3, 15)
            img.fillRect(c - 5, c + 6, 3, 3, 15)
            img.fillRect(c + 1, c - 3, 3, 3, 15)
        }
        return img
    }

    function robotImage(): Image {
        const img = image.create(26, 28)
        img.fillRect(12, 2, 2, 4, 15)
        img.fillCircle(13, 2, 2, 2)
        img.fillRect(2, 5, 22, 16, 9)
        img.drawRect(2, 5, 22, 16, 15)
        img.fillCircle(8, 12, 3, 1)
        img.fillCircle(18, 12, 3, 1)
        img.fillRect(7, 11, 3, 3, 15)
        img.fillRect(17, 11, 3, 3, 15)
        img.fillRect(8, 17, 10, 2, 15)
        img.fillRect(5, 22, 16, 6, 8)
        return img
    }

    function bg(left: string, right: string, bins: boolean, keys: boolean, hint: string): Image {
        const img = image.create(160, 120)
        img.fill(9)                                   // 淺藍牆
        img.fillRect(0, 70, 160, 50, 13)              // 地板
        img.fillRect(0, 58, 160, 12, 15)              // 輸送帶
        for (let x = 0; x < 160; x += 8) img.fillRect(x, 63, 4, 2, 12)
        if (bins) {
            for (let i = 0; i < 3; i++) {
                img.fillRect(BIN_X[i] - 22, 88, 44, 30, LABEL_COLOR[i])
                img.drawRect(BIN_X[i] - 22, 88, 44, 30, 15)
                img.print(LETTERS[i], BIN_X[i] - 4, 92, 15, image.font8)
                if (keys) img.print(BIN_HINT[i], BIN_X[i] - 6, 106, 15)
            }
        }
        img.print(left, 2, 2, 1)
        img.print(right, 158 - right.length * 6, 2, 1)
        if (hint != "") img.printCenter(hint, 2, 5)
        return img
    }

    // ---------- 小工具 ----------
    function slideTo(m: Sprite, tx: number, ty: number, speed: number) {
        while (true) {
            const dx = tx - m.x
            const dy = ty - m.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 3) break
            const step = Math.min(dist, speed * 0.02)
            m.setPosition(m.x + dx / dist * step, m.y + dy / dist * step)
            pause(20)
        }
        m.setPosition(tx, ty)
    }

    function anyKey(): boolean {
        return controller.left.isPressed() || controller.right.isPressed() ||
            controller.up.isPressed() || controller.down.isPressed() ||
            controller.A.isPressed() || controller.B.isPressed()
    }

    function waitRelease() {
        while (anyKey()) pause(20)
    }

    // 0 左、1 上、2 右、3 下
    function waitKey(): number {
        waitRelease()
        while (true) {
            if (controller.left.isPressed()) return 0
            if (controller.up.isPressed()) return 1
            if (controller.right.isPressed()) return 2
            if (controller.down.isPressed()) return 3
            pause(20)
        }
    }

    function waitA() {
        waitRelease()
        while (!controller.A.isPressed()) pause(20)
        waitRelease()
    }

    // ---------- 畫面 ----------
    function titleScreen() {
        const img = image.create(160, 120)
        img.fill(9)
        img.fillRect(0, 84, 160, 36, 13)
        img.printCenter("MANGO AI", 14, 1, image.doubledFont(image.font8))
        img.printCenter("TEACH AI TO GRADE", 38, 15)
        img.printCenter("PRESS A", 104, 1)
        scene.setBackgroundImage(img)
        const robot = sprites.create(robotImage(), SpriteKind.Helper)
        robot.setPosition(36, 70)
        const m1 = sprites.create(mangoImage(6), SpriteKind.Mango)     // 大、紅、無斑
        m1.setPosition(96, 70)
        const m2 = sprites.create(mangoImage(1), SpriteKind.Mango)     // 小、黃、有斑
        m2.setPosition(128, 74)
        robot.sayText("HI!")
        waitA()
        sprites.destroyAllSpritesOfKind(SpriteKind.Helper)
        sprites.destroyAllSpritesOfKind(SpriteKind.Mango)
    }

    function howToScreen() {
        const img = image.create(160, 120)
        img.fill(15)
        img.printCenter("HOW TO PLAY", 4, 5)
        const keyText = ["<  = GRADE A", "^  = GRADE B", ">  = GRADE C", "v  = DONE TEACHING"]
        for (let i = 0; i < 3; i++) {
            img.fillRect(10, 20 + i * 14, 10, 10, LABEL_COLOR[i])
            img.print(keyText[i], 26, 22 + i * 14, 1)
        }
        img.print(keyText[3], 26, 64, 1)
        img.print("BIG = HEAVY", 10, 80, 1)
        img.printCenter("FIND GRANDPA'S SECRET RULE!", 94, 5)
        img.printCenter("PRESS A", 108, 1)
        scene.setBackgroundImage(img)
        waitA()
    }

    // ---------- 階段一：教 AI ----------
    function teachPhase() {
        music.jumpUp.play()
        while (true) {
            scene.setBackgroundImage(bg("DATA " + treeAI.exampleCount(), "R" + round, true, true, "v:DONE"))
            const code = nextCode()
            const m = sprites.create(mangoImage(code), SpriteKind.Mango)
            m.setPosition(-20, BELT_Y)
            slideTo(m, 80, BELT_Y, 110)
            m.sayText("?")
            let key = -1
            while (key < 0) {
                const k = waitKey()
                if (k == 3) {
                    if (treeAI.exampleCount() < MIN_EXAMPLES) {
                        m.sayText("TEACH " + MIN_EXAMPLES + "+")
                        pause(700)
                        m.sayText("?")
                    } else {
                        m.destroy()
                        return
                    }
                } else {
                    key = k
                }
            }
            const t = truthOf(code)
            treeAI.addExample(bigOf(code), redOf(code), spotOf(code), t)
            if (key == t) {
                m.sayText("GOOD!")
                m.startEffect(effects.confetti, 400)
                music.baDing.play()
            } else {
                m.sayText("IT IS " + LETTERS[t])
                music.wawawawaa.play()
            }
            pause(600)
            slideTo(m, BIN_X[t], 96, 170)
            m.destroy()
        }
    }

    // ---------- 階段二：AI 學習並畫出決策樹 ----------
    function learnPhase() {
        treeAI.train()
        const robot = sprites.create(robotImage(), SpriteKind.Helper)
        robot.setPosition(80, 56)
        robot.sayText("DATA " + treeAI.exampleCount())
        music.magicWand.play()
        for (let p = 0; p <= 100; p += 5) {
            const img = bg("AI LEARNING", "", false, false, "")
            img.drawRect(30, 100, 100, 8, 1)
            img.fillRect(31, 101, Math.idiv(p * 98, 100), 6, 7)
            scene.setBackgroundImage(img)
            robot.setPosition(80, 56 + (Math.idiv(p, 5) % 2) * 3)
            pause(70)
        }
        robot.destroy()
        const t = treeAI.treeImage()
        t.print("AI TREE", 2, 2, 5)
        t.printCenter("A: GO", 108, 1)
        scene.setBackgroundImage(t)
        music.powerUp.play()
        waitA()
    }

    // ---------- 階段三：AI 上工，你當品管員 ----------
    function workPhase(): number {
        let lives = 3
        let processed = 0
        let aiRight = 0
        refillDeck()
        for (let i = 0; i < WORK_COUNT; i++) {
            if (lives <= 0) break
            scene.setBackgroundImage(bg("CHECK " + (i + 1) + "/" + WORK_COUNT, "LIFE " + lives, true, false, "A:STOP"))
            const code = nextCode()
            const t = truthOf(code)
            const ai = treeAI.predict(bigOf(code), redOf(code), spotOf(code))
            const m = sprites.create(mangoImage(code), SpriteKind.Mango)
            m.setPosition(-20, BELT_Y)
            m.sayText("AI:" + LETTERS[ai])
            const speed = Math.min(70, 28 + round * 6)
            let rejected = false
            let wasA = controller.A.isPressed()
            while (m.x < CHUTE_X) {
                const a = controller.A.isPressed()
                if (a && !wasA && !rejected && m.x > 8) {
                    rejected = true
                    music.jumpUp.play()
                    m.sayText("STOP!")
                }
                wasA = a
                m.setPosition(m.x + speed * 0.02, BELT_Y)
                pause(20)
            }
            processed++
            if (ai == t) aiRight++
            if (rejected) {
                if (ai != t) {
                    score += 10
                    m.sayText("NICE CATCH!")
                    m.startEffect(effects.confetti, 500)
                    music.powerUp.play()
                } else {
                    score = Math.max(0, score - 5)
                    m.sayText("AI WAS RIGHT")
                    music.powerDown.play()
                }
                pause(600)
                slideTo(m, BIN_X[t], 96, 150)
            } else if (ai == t) {
                score += 2
                music.baDing.play()
                slideTo(m, BIN_X[ai], 96, 150)
            } else {
                lives--
                m.sayText("WRONG BIN!")
                music.wawawawaa.play()
                m.startEffect(effects.fire, 500)
                pause(500)
                slideTo(m, BIN_X[ai], 96, 150)
            }
            m.destroy()
        }
        if (processed == 0) return 0
        return Math.round(100 * aiRight / processed)
    }

    // ---------- 階段四：成績 ----------
    function resultScreen(acc: number) {
        const img = image.create(160, 120)
        img.fill(15)
        img.print("AI ACCURACY", 4, 4, 5)
        const scoreText = "SCORE " + score
        img.print(scoreText, 158 - scoreText.length * 6, 4, 1)
        const base = 92
        const n = history.length
        const show = Math.min(n, 7)
        const start = n - show
        for (let i = 0; i < show; i++) {
            const v = history[start + i]
            const h = Math.idiv(v * 56, 100)
            const x = 14 + i * 20
            img.fillRect(x, base - h, 14, h, i == show - 1 ? 7 : 8)
            img.print("" + v, x - 2, base - h - 9, 1)
            img.print("R" + (start + i + 1), x, base + 3, 1)
        }
        img.drawLine(8, base, 154, base, 1)
        if (acc >= 100) {
            img.printCenter("PERFECT! AI GRADUATED!", 108, 5)
            music.baDing.play()
        } else {
            if (acc < 70) img.printCenter("MORE DATA = SMARTER AI", 16, 5)
            img.printCenter("A: TEACH MORE", 108, 1)
        }
        scene.setBackgroundImage(img)
        waitA()
    }

    // ---------- 主流程 ----------
    export function start() {
        treeAI.reset()
        treeAI.setFeatureName(1, "SIZE", "S", "L")
        treeAI.setFeatureName(2, "COLOR", "YL", "RD")
        treeAI.setFeatureName(3, "SPOT", "NO", "YES")
        history = []
        score = 0
        round = 1
        titleScreen()
        howToScreen()
        while (true) {
            teachPhase()
            learnPhase()
            const acc = workPhase()
            history.push(acc)
            resultScreen(acc)
            if (acc >= 100) {
                treeAI.reset()
                history = []
                score = 0
                round = 0
            }
            round++
            sprites.destroyAllSpritesOfKind(SpriteKind.Mango)
        }
    }
}
