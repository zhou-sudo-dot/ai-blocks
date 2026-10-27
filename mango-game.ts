// ============================================================
// 芒果小學徒 MANGO AI —— 完整單檔版（決策樹 AI + 遊戲）
// 使用方式：MakeCode Arcade 新增專案 → 切到 JavaScript → 刪掉原本內容 → 整份貼上 → 執行
// 不需要安裝任何擴展。請留在 JavaScript 模式（切到積木會變成灰色方塊）。
// 玩法：標題畫面 A＝單人、B＝雙人輪流；教學（← A ↑ B → C，↓ 結束）→ AI 長出決策樹 → AI 上工你當品管員（按 A 喊停）。
// 注意：畫面文字只能顯示英文與數字。
// ============================================================

// ============================================================
// 決策樹 AI（監督式學習）
// 對應《和 AI 做朋友》第四章「教電腦聰明學習」：
//   有「標準答案」的範例 → 機器自己長出一棵決策樹 → 用樹判斷新資料。
//
// 設計：3 個特徵，每個特徵只有 0 或 1 兩種值（例如：大／小、紅／黃、有斑點／沒斑點），
//       答案（標籤）有 3 種：0、1、2（例如：A、B、C 級）。
// 演算法：每一步挑「分完之後最不混亂」的特徵（以吉尼不純度計算，不需要 log）。
// 全程離線，記憶體用量極小。// ============================================================
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
// 【雙人模式】標題畫面按 B：兩位小朋友輪流（P1、P2），每個芒果換人，
//         各自累積分數，AI 與決策樹是兩人共同的。
//
// 特徵：大小（大＝重）、顏色（紅／黃）、斑點（有／無）
// 爺爺的祕密規則（和課本一樣）：有斑點→C；沒斑點且紅且大→A；其他→B
// 注意：遊戲機字型只能顯示英文數字，所以畫面用英文縮寫與圖示。
// =============================// ============================================================
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
// 【雙人模式】標題畫面按 B：兩位小朋友輪流（P1、P2），每個芒果換人，
//         各自累積分數，AI 與決策樹是兩人共同的。
//
// 特徵：大小（大＝重）、顏色（紅／黃）、斑點（有／無）
// 爺爺的祕密規則（和課本一樣）：有斑點→C；沒斑點且紅且大→A；其他→B
// 注意：遊戲機字型只能顯示英文數字，所以畫面用英文縮寫與圖示。
// ============================================================

namespace SpriteKind {
    export const Mango = SpriteKind.create()
    export const Helper = SpriteKind.create()
}

//% weight=70 color=#F39C12 icon="\uf1fd" block="芒果遊戲"
namespace mangoGame {
    export const LABEL_COLOR = [7, 5, 2]          // A 綠、B 黃、C 紅
    export const LETTERS = ["A", "B", "C"]
    export const BIN_X = [26, 80, 134]
    const BIN_HINT = ["<A", "^B", "C>"]
    const MIN_EXAMPLES = 4                  // 至少教幾個才能交給 AI
    const WORK_COUNT = 8                    // 每輪檢查幾個芒果
    export const BELT_Y = 40
    export const CHUTE_X = 128

    let deck: number[] = []
    let history: number[] = []
    let round = 1
    let players = 1                 // 1 人或 2 人（輪流）
    let turn = 0                    // 目前輪到 0=P1、1=P2
    let pScore: number[] = [0, 0]   // 兩位玩家各自的分數

    // ---------- 芒果資料：code 0~7 ----------
    //% blockHidden=true
    export function bigOf(code: number): number {
        return Math.idiv(code, 4) % 2
    }
    //% blockHidden=true
    export function redOf(code: number): number {
        return Math.idiv(code, 2) % 2
    }
    //% blockHidden=true
    export function spotOf(code: number): number {
        return code % 2
    }
    // 爺爺的祕密規則（標準答案）：0=A 1=B 2=C
    //% blockHidden=true
    export function truthOf(code: number): number {
        if (spotOf(code) == 1) return 2
        if (redOf(code) == 1 && bigOf(code) == 1) return 0
        return 1
    }

    //% blockHidden=true
    export function refillDeck() {
        deck = []
        for (let i = 0; i < 8; i++) deck.push(i)
        for (let i = 7; i > 0; i--) {
            const j = Math.randomRange(0, i)
            const t = deck[i]
            deck[i] = deck[j]
            deck[j] = t
        }
    }
    //% blockHidden=true
    export function nextCode(): number {
        if (deck.length == 0) refillDeck()
        return deck.pop()
    }

    function addScore(n: number) {
        pScore[turn] = Math.max(0, pScore[turn] + n)
    }
    function tag(): string {
        return players == 2 ? "P" + (turn + 1) + " " : ""
    }
    function nextTurn() {
        if (players == 2) turn = 1 - turn
    }

    // ---------- 圖像 ----------
    //% blockHidden=true
    export function mangoImage(code: number): Image {
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

    //% blockHidden=true
    export function bg(left: string, right: string, bins: boolean, keys: boolean, hint: string): Image {
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
    //% blockHidden=true
    export function slideTo(m: Sprite, tx: number, ty: number, speed: number) {
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

    //% blockHidden=true
    export function anyKey(): boolean {
        return controller.left.isPressed() || controller.right.isPressed() ||
            controller.up.isPressed() || controller.down.isPressed() ||
            controller.A.isPressed() || controller.B.isPressed()
    }

    //% blockHidden=true
    export function waitRelease() {
        while (anyKey()) pause(20)
    }

    // 0 左、1 上、2 右、3 下
    //% blockHidden=true
    export function waitKey(): number {
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

    // 標題畫面選人數：A = 1 人，B = 2 人
    function waitMode(): number {
        waitRelease()
        while (true) {
            if (controller.A.isPressed()) {
                waitRelease()
                return 1
            }
            if (controller.B.isPressed()) {
                waitRelease()
                return 2
            }
            pause(20)
        }
    }

    // ---------- 畫面 ----------
    function titleScreen() {
        const img = image.create(160, 120)
        img.fill(9)
        img.fillRect(0, 84, 160, 36, 13)
        img.printCenter("MANGO AI", 14, 1, image.doubledFont(image.font8))
        img.printCenter("TEACH AI TO GRADE", 38, 15)
        img.printCenter("A:1 PLAYER  B:2 PLAYERS", 104, 1)
        scene.setBackgroundImage(img)
        const robot = sprites.create(robotImage(), SpriteKind.Helper)
        robot.setPosition(36, 70)
        const m1 = sprites.create(mangoImage(6), SpriteKind.Mango)     // 大、紅、無斑
        m1.setPosition(96, 70)
        const m2 = sprites.create(mangoImage(1), SpriteKind.Mango)     // 小、黃、有斑
        m2.setPosition(128, 74)
        robot.sayText("HI!")
        players = waitMode()
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
        if (players == 2) img.print("2P:TURNS", 96, 80, 5)
        img.printCenter("FIND GRANDPA'S SECRET RULE!", 94, 5)
        img.printCenter("PRESS A", 108, 1)
        scene.setBackgroundImage(img)
        waitA()
    }

    // ---------- 階段一：教 AI ----------
    function teachPhase() {
        music.jumpUp.play()
        while (true) {
            scene.setBackgroundImage(bg("DATA " + treeAI.exampleCount(), "R" + round, true, true, tag() + "v:DONE"))
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
                m.sayText("GOOD! +1")
                addScore(1)
                m.startEffect(effects.confetti, 400)
                music.baDing.play()
            } else {
                m.sayText("IT IS " + LETTERS[t])
                music.wawawawaa.play()
            }
            pause(600)
            slideTo(m, BIN_X[t], 96, 170)
            m.destroy()
            nextTurn()
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
            scene.setBackgroundImage(bg("CHECK " + (i + 1) + "/" + WORK_COUNT, "LIFE " + lives, true, false, tag() + "A:STOP"))
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
                    addScore(10)
                    m.sayText("NICE CATCH!")
                    m.startEffect(effects.confetti, 500)
                    music.powerUp.play()
                } else {
                    addScore(-5)
                    m.sayText("AI WAS RIGHT")
                    music.powerDown.play()
                }
                pause(600)
                slideTo(m, BIN_X[t], 96, 150)
            } else if (ai == t) {
                addScore(2)
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
            nextTurn()
        }
        if (processed == 0) return 0
        return Math.round(100 * aiRight / processed)
    }

    // ---------- 階段四：成績 ----------
    function resultScreen(acc: number) {
        const img = image.create(160, 120)
        img.fill(15)
        img.print("AI ACCURACY", 4, 4, 5)
        const scoreText = players == 2 ? "P1 " + pScore[0] + " P2 " + pScore[1] : "SCORE " + pScore[0]
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
    //% block="開始「芒果小學徒」遊戲"
    //% weight=100
    export function start() {
        treeAI.reset()
        treeAI.setFeatureName(1, "SIZE", "S", "L")
        treeAI.setFeatureName(2, "COLOR", "YL", "RD")
        treeAI.setFeatureName(3, "SPOT", "NO", "YES")
        history = []
        pScore = [0, 0]
        turn = 0
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
                pScore = [0, 0]
                turn = 0
                round = 0
            }
            round++
            sprites.destroyAllSpritesOfKind(SpriteKind.Mango)
        }
    }
}
===============================

namespace SpriteKind {
    export const Mango = SpriteKind.create()
    export const Helper = SpriteKind.create()
}

//% weight=70 color=#F39C12 icon="\uf1fd" block="芒果遊戲"
namespace mangoGame {
    export const LABEL_COLOR = [7, 5, 2]          // A 綠、B 黃、C 紅
    export const LETTERS = ["A", "B", "C"]
    export const BIN_X = [26, 80, 134]
    const BIN_HINT = ["<A", "^B", "C>"]
    const MIN_EXAMPLES = 4                  // 至少教幾個才能交給 AI
    const WORK_COUNT = 8                    // 每輪檢查幾個芒果
    export const BELT_Y = 40
    export const CHUTE_X = 128

    let deck: number[] = []
    let history: number[] = []
    let round = 1
    let players = 1                 // 1 人或 2 人（輪流）
    let turn = 0                    // 目前輪到 0=P1、1=P2
    let pScore: number[] = [0, 0]   // 兩位玩家各自的分數

    // ---------- 芒果資料：code 0~7 ----------
    //% blockHidden=true
    export function bigOf(code: number): number {
        return Math.idiv(code, 4) % 2
    }
    //% blockHidden=true
    export function redOf(code: number): number {
        return Math.idiv(code, 2) % 2
    }
    //% blockHidden=true
    export function spotOf(code: number): number {
        return code % 2
    }
    // 爺爺的祕密規則（標準答案）：0=A 1=B 2=C
    //% blockHidden=true
    export function truthOf(code: number): number {
        if (spotOf(code) == 1) return 2
        if (redOf(code) == 1 && bigOf(code) == 1) return 0
        return 1
    }

    //% blockHidden=true
    export function refillDeck() {
        deck = []
        for (let i = 0; i < 8; i++) deck.push(i)
        for (let i = 7; i > 0; i--) {
            const j = Math.randomRange(0, i)
            const t = deck[i]
            deck[i] = deck[j]
            deck[j] = t
        }
    }
    //% blockHidden=true
    export function nextCode(): number {
        if (deck.length == 0) refillDeck()
        return deck.pop()
    }

    function addScore(n: number) {
        pScore[turn] = Math.max(0, pScore[turn] + n)
    }
    function tag(): string {
        return players == 2 ? "P" + (turn + 1) + " " : ""
    }
    function nextTurn() {
        if (players == 2) turn = 1 - turn
    }

    // ---------- 圖像 ----------
    //% blockHidden=true
    export function mangoImage(code: number): Image {
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

    //% blockHidden=true
    export function bg(left: string, right: string, bins: boolean, keys: boolean, hint: string): Image {
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
    //% blockHidden=true
    export function slideTo(m: Sprite, tx: number, ty: number, speed: number) {
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

    //% blockHidden=true
    export function anyKey(): boolean {
        return controller.left.isPressed() || controller.right.isPressed() ||
            controller.up.isPressed() || controller.down.isPressed() ||
            controller.A.isPressed() || controller.B.isPressed()
    }

    //% blockHidden=true
    export function waitRelease() {
        while (anyKey()) pause(20)
    }

    // 0 左、1 上、2 右、3 下
    //% blockHidden=true
    export function waitKey(): number {
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

    // 標題畫面選人數：A = 1 人，B = 2 人
    function waitMode(): number {
        waitRelease()
        while (true) {
            if (controller.A.isPressed()) {
                waitRelease()
                return 1
            }
            if (controller.B.isPressed()) {
                waitRelease()
                return 2
            }
            pause(20)
        }
    }

    // ---------- 畫面 ----------
    function titleScreen() {
        const img = image.create(160, 120)
        img.fill(9)
        img.fillRect(0, 84, 160, 36, 13)
        img.printCenter("MANGO AI", 14, 1, image.doubledFont(image.font8))
        img.printCenter("TEACH AI TO GRADE", 38, 15)
        img.printCenter("A:1 PLAYER  B:2 PLAYERS", 104, 1)
        scene.setBackgroundImage(img)
        const robot = sprites.create(robotImage(), SpriteKind.Helper)
        robot.setPosition(36, 70)
        const m1 = sprites.create(mangoImage(6), SpriteKind.Mango)     // 大、紅、無斑
        m1.setPosition(96, 70)
        const m2 = sprites.create(mangoImage(1), SpriteKind.Mango)     // 小、黃、有斑
        m2.setPosition(128, 74)
        robot.sayText("HI!")
        players = waitMode()
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
        if (players == 2) img.print("2P:TURNS", 96, 80, 5)
        img.printCenter("FIND GRANDPA'S SECRET RULE!", 94, 5)
        img.printCenter("PRESS A", 108, 1)
        scene.setBackgroundImage(img)
        waitA()
    }

    // ---------- 階段一：教 AI ----------
    function teachPhase() {
        music.jumpUp.play()
        while (true) {
            scene.setBackgroundImage(bg("DATA " + treeAI.exampleCount(), "R" + round, true, true, tag() + "v:DONE"))
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
                m.sayText("GOOD! +1")
                addScore(1)
                m.startEffect(effects.confetti, 400)
                music.baDing.play()
            } else {
                m.sayText("IT IS " + LETTERS[t])
                music.wawawawaa.play()
            }
            pause(600)
            slideTo(m, BIN_X[t], 96, 170)
            m.destroy()
            nextTurn()
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
            scene.setBackgroundImage(bg("CHECK " + (i + 1) + "/" + WORK_COUNT, "LIFE " + lives, true, false, tag() + "A:STOP"))
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
                    addScore(10)
                    m.sayText("NICE CATCH!")
                    m.startEffect(effects.confetti, 500)
                    music.powerUp.play()
                } else {
                    addScore(-5)
                    m.sayText("AI WAS RIGHT")
                    music.powerDown.play()
                }
                pause(600)
                slideTo(m, BIN_X[t], 96, 150)
            } else if (ai == t) {
                addScore(2)
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
            nextTurn()
        }
        if (processed == 0) return 0
        return Math.round(100 * aiRight / processed)
    }

    // ---------- 階段四：成績 ----------
    function resultScreen(acc: number) {
        const img = image.create(160, 120)
        img.fill(15)
        img.print("AI ACCURACY", 4, 4, 5)
        const scoreText = players == 2 ? "P1 " + pScore[0] + " P2 " + pScore[1] : "SCORE " + pScore[0]
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
    //% block="開始「芒果小學徒」遊戲"
    //% weight=100
    export function start() {
        treeAI.reset()
        treeAI.setFeatureName(1, "SIZE", "S", "L")
        treeAI.setFeatureName(2, "COLOR", "YL", "RD")
        treeAI.setFeatureName(3, "SPOT", "NO", "YES")
        history = []
        pScore = [0, 0]
        turn = 0
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
                pScore = [0, 0]
                turn = 0
                round = 0
            }
            round++
            sprites.destroyAllSpritesOfKind(SpriteKind.Mango)
        }
    }
}

// 注意：遊戲機內建字型只能顯示英文與數字，名稱請用英文縮寫。
// ============================================================

namespace treeAI {
    const NF = 3
    const LABELS = 3

    let exF: number[] = []      // 範例特徵（每筆連續放 NF 個）
    let exY: number[] = []      // 範例答案
    let nodeFeat: number[] = [] // 內部節點用哪個特徵；-1 代表葉節點
    let nodeLeaf: number[] = [] // 葉節點的答案
    let nodeC0: number[] = []   // 特徵值 0 的子節點
    let nodeC1: number[] = []   // 特徵值 1 的子節點
    let trained = false

    let featName: string[] = ["F1", "F2", "F3"]
    let v0Name: string[] = ["0", "0", "0"]
    let v1Name: string[] = ["1", "1", "1"]
    let labelName: string[] = ["A", "B", "C"]
    const LABEL_COLOR = [7, 5, 2]

    // ---------------- 學習（建樹） ----------------

    function gini(ids: number[]): number {
        const n = ids.length
        if (n == 0) return 0
        const cnt = [0, 0, 0]
        for (let k = 0; k < n; k++) cnt[exY[ids[k]]]++
        let sumSq = 0
        for (let c = 0; c < LABELS; c++) sumSq += cnt[c] * cnt[c]
        return 1 - sumSq / (n * n)
    }

    function majority(ids: number[], fallback: number): number {
        if (ids.length == 0) return fallback
        const cnt = [0, 0, 0]
        for (let k = 0; k < ids.length; k++) cnt[exY[ids[k]]]++
        let best = 0
        for (let c = 1; c < LABELS; c++) {
            if (cnt[c] > cnt[best]) best = c
        }
        return best
    }

    function build(ids: number[], used: number[], fallback: number): number {
        const node = nodeFeat.length
        nodeFeat.push(-1)
        nodeLeaf.push(0)
        nodeC0.push(-1)
        nodeC1.push(-1)
        const maj = majority(ids, fallback)
        nodeLeaf[node] = maj
        if (ids.length == 0 || gini(ids) == 0) return node   // 已經很純，不用再分

        let bestF = -1
        let bestScore = 1000
        for (let f = 0; f < NF; f++) {
            if (used[f] == 1) continue
            const a: number[] = []
            const b: number[] = []
            for (let k = 0; k < ids.length; k++) {
                if (exF[ids[k] * NF + f] == 1) b.push(ids[k])
                else a.push(ids[k])
            }
            if (a.length == 0 || b.length == 0) continue      // 這個特徵分不開
            const score = (a.length * gini(a) + b.length * gini(b)) / ids.length
            if (score < bestScore - 0.000001) {
                bestScore = score
                bestF = f
            }
        }
        if (bestF < 0) return node                             // 沒有特徵可用了

        const used2 = [used[0], used[1], used[2]]
        used2[bestF] = 1
        const left: number[] = []
        const right: number[] = []
        for (let k = 0; k < ids.length; k++) {
            if (exF[ids[k] * NF + bestF] == 1) right.push(ids[k])
            else left.push(ids[k])
        }
        const c0 = build(left, used2, maj)
        const c1 = build(right, used2, maj)
        nodeFeat[node] = bestF
        nodeC0[node] = c0
        nodeC1[node] = c1
        return node
    }

    // ---------------- 1 準備 ----------------

    export function reset() {
        exF = []
        exY = []
        nodeFeat = []
        nodeLeaf = []
        nodeC0 = []
        nodeC1 = []
        trained = false
    }

    export function setFeatureName(index: number, name: string, v0: string, v1: string) {
        if (index < 1 || index > NF) return
        featName[index - 1] = name
        v0Name[index - 1] = v0
        v1Name[index - 1] = v1
    }

    export function setLabelName(index: number, name: string) {
        if (index < 0 || index >= LABELS) return
        labelName[index] = name
    }

    // ---------------- 2 教 AI ----------------

    export function addExample(f1: number, f2: number, f3: number, label: number) {
        exF.push(f1 >= 1 ? 1 : 0)
        exF.push(f2 >= 1 ? 1 : 0)
        exF.push(f3 >= 1 ? 1 : 0)
        exY.push(Math.max(0, Math.min(LABELS - 1, label)))
        trained = false
    }

    export function train() {
        nodeFeat = []
        nodeLeaf = []
        nodeC0 = []
        nodeC1 = []
        const ids: number[] = []
        for (let i = 0; i < exY.length; i++) ids.push(i)
        build(ids, [0, 0, 0], 0)
        trained = true
    }

    export function exampleCount(): number {
        return exY.length
    }

    // ---------------- 3 AI 判斷 ----------------

    export function predict(f1: number, f2: number, f3: number): number {
        if (!trained) train()
        const f = [f1 >= 1 ? 1 : 0, f2 >= 1 ? 1 : 0, f3 >= 1 ? 1 : 0]
        let n = 0
        while (nodeFeat[n] >= 0) {
            n = f[nodeFeat[n]] == 1 ? nodeC1[n] : nodeC0[n]
        }
        return nodeLeaf[n]
    }

    export function labelText(label: number): string {
        if (label < 0 || label >= LABELS) return "?"
        return labelName[label]
    }

    // ---------------- 4 看決策樹 ----------------

    let lx: number[] = []
    let ld: number[] = []
    let leafCursor = 0
    let leafTotal = 1

    function countLeaves(n: number): number {
        if (nodeFeat[n] < 0) return 1
        return countLeaves(nodeC0[n]) + countLeaves(nodeC1[n])
    }

    function layout(n: number, depth: number) {
        ld[n] = depth
        if (nodeFeat[n] < 0) {
            lx[n] = Math.idiv((2 * leafCursor + 1) * 160, 2 * leafTotal)
            leafCursor++
            return
        }
        layout(nodeC0[n], depth + 1)
        layout(nodeC1[n], depth + 1)
        lx[n] = Math.idiv(lx[nodeC0[n]] + lx[nodeC1[n]], 2)
    }

    function nodeY(n: number): number {
        return 16 + ld[n] * 28
    }

    function drawEdges(img: Image, n: number) {
        if (nodeFeat[n] < 0) return
        const x = lx[n]
        const y = nodeY(n)
        for (let side = 0; side < 2; side++) {
            const c = side == 0 ? nodeC0[n] : nodeC1[n]
            const cx = lx[c]
            const cy = nodeY(c)
            img.drawLine(x, y + 6, cx, cy - 6, 1)
            const name = side == 0 ? v0Name[nodeFeat[n]] : v1Name[nodeFeat[n]]
            const mx = Math.idiv(x + cx, 2)
            const my = Math.idiv(y + cy, 2)
            const tx = side == 0 ? mx - name.length * 6 - 1 : mx + 2
            img.print(name, tx, my - 4, 5)
        }
        drawEdges(img, nodeC0[n])
        drawEdges(img, nodeC1[n])
    }

    function drawNodes(img: Image, n: number) {
        const x = lx[n]
        const y = nodeY(n)
        if (nodeFeat[n] < 0) {
            const lab = nodeLeaf[n]
            img.fillRect(x - 8, y - 6, 16, 13, LABEL_COLOR[lab])
            img.drawRect(x - 8, y - 6, 16, 13, 1)
            img.print(labelName[lab], x - 3, y - 4, 15)
        } else {
            const name = featName[nodeFeat[n]]
            const w = name.length * 6 + 4
            const left = x - Math.idiv(w, 2)
            img.fillRect(left, y - 6, w, 13, 8)
            img.drawRect(left, y - 6, w, 13, 1)
            img.print(name, left + 2, y - 4, 1)
            drawNodes(img, nodeC0[n])
            drawNodes(img, nodeC1[n])
        }
    }

    export function treeImage(): Image {
        if (!trained) train()
        lx = []
        ld = []
        for (let i = 0; i < nodeFeat.length; i++) {
            lx.push(0)
            ld.push(0)
        }
        leafTotal = countLeaves(0)
        leafCursor = 0
        layout(0, 0)
        const img = image.create(160, 120)
        img.fill(15)
        drawEdges(img, 0)
        drawNodes(img, 0)
        return img
    }

    export function showTree() {
        scene.setBackgroundImage(treeImage())
    }
}

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
// 【雙人模式】標題畫面按 B：兩位小朋友輪流（P1、P2），每個芒果換人，
//         各自累積分數，AI 與決策樹是兩人共同的。
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
    export const LABEL_COLOR = [7, 5, 2]          // A 綠、B 黃、C 紅
    export const LETTERS = ["A", "B", "C"]
    export const BIN_X = [26, 80, 134]
    const BIN_HINT = ["<A", "^B", "C>"]
    const MIN_EXAMPLES = 4                  // 至少教幾個才能交給 AI
    const WORK_COUNT = 8                    // 每輪檢查幾個芒果
    export const BELT_Y = 40
    export const CHUTE_X = 128

    let deck: number[] = []
    let history: number[] = []
    let round = 1
    let players = 1                 // 1 人或 2 人（輪流）
    let turn = 0                    // 目前輪到 0=P1、1=P2
    let pScore: number[] = [0, 0]   // 兩位玩家各自的分數

    // ---------- 芒果資料：code 0~7 ----------
    export function bigOf(code: number): number {
        return Math.idiv(code, 4) % 2
    }
    export function redOf(code: number): number {
        return Math.idiv(code, 2) % 2
    }
    export function spotOf(code: number): number {
        return code % 2
    }
    // 爺爺的祕密規則（標準答案）：0=A 1=B 2=C
    export function truthOf(code: number): number {
        if (spotOf(code) == 1) return 2
        if (redOf(code) == 1 && bigOf(code) == 1) return 0
        return 1
    }

    export function refillDeck() {
        deck = []
        for (let i = 0; i < 8; i++) deck.push(i)
        for (let i = 7; i > 0; i--) {
            const j = Math.randomRange(0, i)
            const t = deck[i]
            deck[i] = deck[j]
            deck[j] = t
        }
    }
    export function nextCode(): number {
        if (deck.length == 0) refillDeck()
        return deck.pop()
    }

    function addScore(n: number) {
        pScore[turn] = Math.max(0, pScore[turn] + n)
    }
    function tag(): string {
        return players == 2 ? "P" + (turn + 1) + " " : ""
    }
    function nextTurn() {
        if (players == 2) turn = 1 - turn
    }

    // ---------- 圖像 ----------
    export function mangoImage(code: number): Image {
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

    export function bg(left: string, right: string, bins: boolean, keys: boolean, hint: string): Image {
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
    export function slideTo(m: Sprite, tx: number, ty: number, speed: number) {
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

    export function anyKey(): boolean {
        return controller.left.isPressed() || controller.right.isPressed() ||
            controller.up.isPressed() || controller.down.isPressed() ||
            controller.A.isPressed() || controller.B.isPressed()
    }

    export function waitRelease() {
        while (anyKey()) pause(20)
    }

    // 0 左、1 上、2 右、3 下
    export function waitKey(): number {
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

    // 標題畫面選人數：A = 1 人，B = 2 人
    function waitMode(): number {
        waitRelease()
        while (true) {
            if (controller.A.isPressed()) {
                waitRelease()
                return 1
            }
            if (controller.B.isPressed()) {
                waitRelease()
                return 2
            }
            pause(20)
        }
    }

    // ---------- 畫面 ----------
    function titleScreen() {
        const img = image.create(160, 120)
        img.fill(9)
        img.fillRect(0, 84, 160, 36, 13)
        img.printCenter("MANGO AI", 14, 1, image.doubledFont(image.font8))
        img.printCenter("TEACH AI TO GRADE", 38, 15)
        img.printCenter("A:1 PLAYER  B:2 PLAYERS", 104, 1)
        scene.setBackgroundImage(img)
        const robot = sprites.create(robotImage(), SpriteKind.Helper)
        robot.setPosition(36, 70)
        const m1 = sprites.create(mangoImage(6), SpriteKind.Mango)     // 大、紅、無斑
        m1.setPosition(96, 70)
        const m2 = sprites.create(mangoImage(1), SpriteKind.Mango)     // 小、黃、有斑
        m2.setPosition(128, 74)
        robot.sayText("HI!")
        players = waitMode()
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
        if (players == 2) img.print("2P:TURNS", 96, 80, 5)
        img.printCenter("FIND GRANDPA'S SECRET RULE!", 94, 5)
        img.printCenter("PRESS A", 108, 1)
        scene.setBackgroundImage(img)
        waitA()
    }

    // ---------- 階段一：教 AI ----------
    function teachPhase() {
        music.jumpUp.play()
        while (true) {
            scene.setBackgroundImage(bg("DATA " + treeAI.exampleCount(), "R" + round, true, true, tag() + "v:DONE"))
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
                m.sayText("GOOD! +1")
                addScore(1)
                m.startEffect(effects.confetti, 400)
                music.baDing.play()
            } else {
                m.sayText("IT IS " + LETTERS[t])
                music.wawawawaa.play()
            }
            pause(600)
            slideTo(m, BIN_X[t], 96, 170)
            m.destroy()
            nextTurn()
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
            scene.setBackgroundImage(bg("CHECK " + (i + 1) + "/" + WORK_COUNT, "LIFE " + lives, true, false, tag() + "A:STOP"))
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
                    addScore(10)
                    m.sayText("NICE CATCH!")
                    m.startEffect(effects.confetti, 500)
                    music.powerUp.play()
                } else {
                    addScore(-5)
                    m.sayText("AI WAS RIGHT")
                    music.powerDown.play()
                }
                pause(600)
                slideTo(m, BIN_X[t], 96, 150)
            } else if (ai == t) {
                addScore(2)
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
            nextTurn()
        }
        if (processed == 0) return 0
        return Math.round(100 * aiRight / processed)
    }

    // ---------- 階段四：成績 ----------
    function resultScreen(acc: number) {
        const img = image.create(160, 120)
        img.fill(15)
        img.print("AI ACCURACY", 4, 4, 5)
        const scoreText = players == 2 ? "P1 " + pScore[0] + " P2 " + pScore[1] : "SCORE " + pScore[0]
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
        pScore = [0, 0]
        turn = 0
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
                pScore = [0, 0]
                turn = 0
                round = 0
            }
            round++
            sprites.destroyAllSpritesOfKind(SpriteKind.Mango)
        }
    }
}

mangoGame.start()
