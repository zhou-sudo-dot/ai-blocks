// ============================================================
// 決策樹 AI（監督式學習）
// 對應《和 AI 做朋友》第四章「教電腦聰明學習」：
//   有「標準答案」的範例 → 機器自己長出一棵決策樹 → 用樹判斷新資料。
//
// 設計：3 個特徵，每個特徵只有 0 或 1 兩種值（例如：大／小、紅／黃、有斑點／沒斑點），
//       答案（標籤）有 3 種：0、1、2（例如：A、B、C 級）。
// 演算法：每一步挑「分完之後最不混亂」的特徵（以吉尼不純度計算，不需要 log）。
// 全程離線，記憶體用量極小。
// 注意：遊戲機內建字型只能顯示英文與數字，名稱請用英文縮寫。
// ============================================================

//% weight=80 color=#27AE60 icon="\uf1bb" block="決策樹 AI"
//% groups=['1 準備', '2 教 AI', '3 AI 判斷', '4 看決策樹']
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

    //% block="清除所有範例與決策樹"
    //% group="1 準備" weight=100
    export function reset() {
        exF = []
        exY = []
        nodeFeat = []
        nodeLeaf = []
        nodeC0 = []
        nodeC1 = []
        trained = false
    }

    //% block="設定 特徵 %index 名稱 %name 值0 %v0 值1 %v1"
    //% index.min=1 index.max=3 index.defl=1
    //% name.defl="SIZE" v0.defl="S" v1.defl="L"
    //% group="1 準備" weight=90
    export function setFeatureName(index: number, name: string, v0: string, v1: string) {
        if (index < 1 || index > NF) return
        featName[index - 1] = name
        v0Name[index - 1] = v0
        v1Name[index - 1] = v1
    }

    //% block="設定 答案 %index 的名稱為 %name"
    //% index.min=0 index.max=2 index.defl=0
    //% name.defl="A"
    //% group="1 準備" weight=80
    export function setLabelName(index: number, name: string) {
        if (index < 0 || index >= LABELS) return
        labelName[index] = name
    }

    // ---------------- 2 教 AI ----------------

    //% block="給 AI 一個範例 特徵1 %f1 特徵2 %f2 特徵3 %f3 標準答案 %label"
    //% f1.min=0 f1.max=1 f2.min=0 f2.max=1 f3.min=0 f3.max=1
    //% label.min=0 label.max=2
    //% group="2 教 AI" weight=100
    export function addExample(f1: number, f2: number, f3: number, label: number) {
        exF.push(f1 >= 1 ? 1 : 0)
        exF.push(f2 >= 1 ? 1 : 0)
        exF.push(f3 >= 1 ? 1 : 0)
        exY.push(Math.max(0, Math.min(LABELS - 1, label)))
        trained = false
    }

    //% block="AI 開始學習（長出決策樹）"
    //% group="2 教 AI" weight=90
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

    //% block="AI 已經看過幾個範例"
    //% group="2 教 AI" weight=80
    export function exampleCount(): number {
        return exY.length
    }

    // ---------------- 3 AI 判斷 ----------------

    //% block="AI 判斷 特徵1 %f1 特徵2 %f2 特徵3 %f3 的答案"
    //% f1.min=0 f1.max=1 f2.min=0 f2.max=1 f3.min=0 f3.max=1
    //% group="3 AI 判斷" weight=100
    export function predict(f1: number, f2: number, f3: number): number {
        if (!trained) train()
        const f = [f1 >= 1 ? 1 : 0, f2 >= 1 ? 1 : 0, f3 >= 1 ? 1 : 0]
        let n = 0
        while (nodeFeat[n] >= 0) {
            n = f[nodeFeat[n]] == 1 ? nodeC1[n] : nodeC0[n]
        }
        return nodeLeaf[n]
    }

    //% block="答案 %label 的名稱"
    //% label.min=0 label.max=2
    //% group="3 AI 判斷" weight=90
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

    //% block="決策樹的圖"
    //% group="4 看決策樹" weight=100
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

    //% block="把決策樹畫在背景"
    //% group="4 看決策樹" weight=90
    export function showTree() {
        scene.setBackgroundImage(treeImage())
    }
}
