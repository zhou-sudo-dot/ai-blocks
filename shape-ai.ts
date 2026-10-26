// ============================================================
// 第二年：圖形 AI（監督式學習：最近中心法 nearest centroid）
// 學生在 8x8 畫板畫圖 → 貼上標籤 → AI 算出每一類的「平均樣子」
// → 新圖進來時，看跟哪一類的平均樣子最像。
// 全程離線，64 個點 × 少量樣本，記憶體用量極小。
//
// 注意：遊戲機預設字型只能顯示英文與數字，
// 類別名稱建議用英文（circle、triangle）或數字（1、2、3）。
// ============================================================

//% weight=90 color=#E67E22 icon="\uf002" block="圖形 AI"
//% groups=['1 畫圖', '2 教 AI', '3 AI 判斷', '4 看 AI 學到什麼']
namespace shapeAI {
    const N = 8
    const PIXELS = 64
    const CELL = 12          // 8 格 × 12 = 96 像素
    const BX = 32            // 畫板左上角
    const BY = 6

    let drawing: number[] = []
    let hasDrawing = false
    let labels: string[] = []
    let sums: number[][] = []
    let counts: number[] = []
    let centroids: number[][] = []
    let trained = false
    let autoFit = true
    let lastLabel = "?"
    let lastConf = 0

    function clearBoard() {
        drawing = []
        for (let i = 0; i < PIXELS; i++) drawing.push(0)
        hasDrawing = false
    }

    function zeros(): number[] {
        const a: number[] = []
        for (let i = 0; i < PIXELS; i++) a.push(0)
        return a
    }

    // 前處理：把圖形「搬到中間並放大到填滿 8x8」，
    // 這樣圖畫在哪裡、畫多大，都不影響辨識。
    function normalize(p: number[]): number[] {
        if (!autoFit) return p.slice(0, PIXELS)
        let minX = N
        let maxX = -1
        let minY = N
        let maxY = -1
        for (let i = 0; i < PIXELS; i++) {
            if (p[i] == 1) {
                const x = i % N
                const y = Math.idiv(i, N)
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
            }
        }
        const out = zeros()
        if (maxX < 0) return out
        const w = maxX - minX + 1
        const h = maxY - minY + 1
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const sx = minX + Math.idiv(x * w, N)
                const sy = minY + Math.idiv(y * h, N)
                out[y * N + x] = p[sy * N + sx]
            }
        }
        return out
    }

    function labelIndex(label: string): number {
        for (let i = 0; i < labels.length; i++) {
            if (labels[i] == label) return i
        }
        return -1
    }

    function addToClass(label: string, pattern: number[]) {
        const norm = normalize(pattern)
        let i = labelIndex(label)
        if (i < 0) {
            labels.push(label)
            sums.push(zeros())
            counts.push(0)
            i = labels.length - 1
        }
        for (let k = 0; k < PIXELS; k++) sums[i][k] += norm[k]
        counts[i] = counts[i] + 1
        trained = false
    }

    function pat(rows: string[]): number[] {
        const out: number[] = []
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                out.push(rows[r].charAt(c) == "1" ? 1 : 0)
            }
        }
        return out
    }

    function renderBoard(cx: number, cy: number, showCursor: boolean) {
        const img = image.create(160, 120)
        img.fill(15)
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const on = drawing[y * N + x] == 1
                img.fillRect(BX + x * CELL + 1, BY + y * CELL + 1, CELL - 2, CELL - 2, on ? 5 : 12)
            }
        }
        if (showCursor) {
            img.drawRect(BX + cx * CELL, BY + cy * CELL, CELL, CELL, 1)
            img.print("A:dot B:done", 28, 108, 1)
        }
        scene.setBackgroundImage(img)
    }

    // ---------------- 1 畫圖 ----------------

    //% block="開啟 8×8 畫板（方向鍵移動、A 點亮／熄滅、B 完成）"
    //% group="1 畫圖" weight=100
    export function drawShape() {
        clearBoard()
        let cx = 0
        let cy = 0
        let wasUp = controller.up.isPressed()
        let wasDown = controller.down.isPressed()
        let wasLeft = controller.left.isPressed()
        let wasRight = controller.right.isPressed()
        let wasA = controller.A.isPressed()
        let wasB = controller.B.isPressed()
        renderBoard(cx, cy, true)
        while (true) {
            const up = controller.up.isPressed()
            const down = controller.down.isPressed()
            const left = controller.left.isPressed()
            const right = controller.right.isPressed()
            const a = controller.A.isPressed()
            const b = controller.B.isPressed()
            if (up && !wasUp && cy > 0) cy--
            if (down && !wasDown && cy < N - 1) cy++
            if (left && !wasLeft && cx > 0) cx--
            if (right && !wasRight && cx < N - 1) cx++
            if (a && !wasA) drawing[cy * N + cx] = 1 - drawing[cy * N + cx]
            if (b && !wasB) break
            wasUp = up
            wasDown = down
            wasLeft = left
            wasRight = right
            wasA = a
            wasB = b
            renderBoard(cx, cy, true)
            pause(30)
        }
        hasDrawing = true
    }

    //% block="清空畫板"
    //% group="1 畫圖" weight=90
    export function clearDrawing() {
        clearBoard()
    }

    //% block="顯示剛畫的圖"
    //% group="1 畫圖" weight=80
    export function showDrawing() {
        renderBoard(0, 0, false)
    }

    //% block="自動置中並放大圖形 %on"
    //% on.shadow=toggleOnOff on.defl=true
    //% group="1 畫圖" weight=70
    export function setAutoFit(on: boolean) {
        autoFit = on
    }

    // ---------------- 2 教 AI ----------------

    //% block="把畫好的圖存成 類別 %label"
    //% label.defl="circle"
    //% group="2 教 AI" weight=100
    export function addSample(label: string) {
        if (!hasDrawing) return
        let any = false
        for (let i = 0; i < PIXELS; i++) {
            if (drawing[i] == 1) any = true
        }
        if (!any) return
        addToClass(label, drawing)
    }

    //% block="開始訓練"
    //% group="2 教 AI" weight=90
    export function train() {
        centroids = []
        for (let i = 0; i < labels.length; i++) {
            const c: number[] = []
            for (let k = 0; k < PIXELS; k++) c.push(sums[i][k] / counts[i])
            centroids.push(c)
        }
        trained = true
    }

    //% block="類別 %label 有幾筆資料"
    //% label.defl="circle"
    //% group="2 教 AI" weight=80
    export function sampleCount(label: string): number {
        const i = labelIndex(label)
        return i < 0 ? 0 : counts[i]
    }

    //% block="載入示範資料（circle、triangle、square 各 2 筆）"
    //% group="2 教 AI" weight=70
    export function loadDemoData() {
        addToClass("circle", pat(["00111100", "01000010", "10000001", "10000001", "10000001", "10000001", "01000010", "00111100"]))
        addToClass("circle", pat(["00000000", "00111100", "01000010", "01000010", "01000010", "01000010", "00111100", "00000000"]))
        addToClass("triangle", pat(["00011000", "00100100", "00100100", "01000010", "01000010", "10000001", "10000001", "11111111"]))
        addToClass("triangle", pat(["00000000", "00011000", "00100100", "00100100", "01000010", "01000010", "01111110", "00000000"]))
        addToClass("square", pat(["11111111", "10000001", "10000001", "10000001", "10000001", "10000001", "10000001", "11111111"]))
        addToClass("square", pat(["00000000", "01111110", "01000010", "01000010", "01000010", "01000010", "01111110", "00000000"]))
    }

    //% block="清除所有訓練資料"
    //% group="2 教 AI" weight=60
    export function resetData() {
        labels = []
        sums = []
        counts = []
        centroids = []
        trained = false
        lastLabel = "?"
        lastConf = 0
    }

    // ---------------- 3 AI 判斷 ----------------

    //% block="AI 判斷這張圖是"
    //% group="3 AI 判斷" weight=100
    export function classify(): string {
        if (labels.length == 0 || !hasDrawing) {
            lastLabel = "?"
            lastConf = 0
            return lastLabel
        }
        if (!trained) train()
        const norm = normalize(drawing)
        let best = 0
        let bestD = 1000000
        const w: number[] = []
        let total = 0
        for (let i = 0; i < labels.length; i++) {
            let d = 0
            for (let k = 0; k < PIXELS; k++) {
                const diff = norm[k] - centroids[i][k]
                d += diff * diff
            }
            if (d < bestD) {
                bestD = d
                best = i
            }
            w.push(1 / (d + 1))
            total += w[i]
        }
        lastLabel = labels[best]
        lastConf = Math.round(100 * w[best] / total)
        return lastLabel
    }

    //% block="AI 的把握程度（百分比）"
    //% group="3 AI 判斷" weight=90
    export function confidence(): number {
        return lastConf
    }

    // ---------------- 4 看 AI 學到什麼 ----------------

    //% block="顯示 AI 心中的 %label 長什麼樣子"
    //% label.defl="circle"
    //% group="4 看 AI 學到什麼" weight=100
    export function showBrain(label: string) {
        const i = labelIndex(label)
        if (i < 0) return
        if (!trained) train()
        const img = image.create(160, 120)
        img.fill(15)
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const v = centroids[i][y * N + x]
                let color = 15
                if (v >= 0.8) color = 1
                else if (v >= 0.6) color = 5
                else if (v >= 0.4) color = 4
                else if (v >= 0.2) color = 2
                else if (v > 0) color = 12
                img.fillRect(BX + x * CELL + 1, BY + y * CELL + 1, CELL - 2, CELL - 2, color)
            }
        }
        img.print(label + " x" + counts[i], 28, 108, 1)
        scene.setBackgroundImage(img)
    }

    clearBoard()
}
