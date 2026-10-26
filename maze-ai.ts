// ============================================================
// 第一年：迷宮 AI（Q-learning 強化學習）
// 8x8 迷宮，AI 角色靠「獎勵與懲罰」自己學會走到終點。
// 全程離線，Q 表只有 8*8*4 = 256 個數字。
// ============================================================

//% weight=100 color=#2E86DE icon="\uf1b0" block="迷宮 AI"
//% groups=['1 設定迷宮', '2 訓練 AI', '3 看 AI 學到什麼', '4 AI 角色']
namespace mazeAI {
    const SIZE = 8
    const CELL = 15          // 每格 15 像素，8 格 = 120 像素
    const OFFSET_X = 20      // 迷宮置中於 160 像素寬螢幕
    const MAX_STEPS = 100    // 訓練時每回合最多走幾步
    const AGENT_LIMIT = 60   // AI 角色最多走幾步（避免永遠走不完）

    const EMPTY = 0
    const WALL = 1
    const TRAP = 2
    const GOAL = 3

    // 方向：0 上、1 右、2 下、3 左
    const DX = [0, 1, 0, -1]
    const DY = [-1, 0, 1, 0]

    let cells: number[] = []
    let q: number[] = []
    let startX = 0
    let startY = 0

    let rewardGoal = 10
    let penaltyTrap = -5
    const PENALTY_WALL = -1
    const STEP_COST = -0.1
    let alphaPct = 50        // 學習速度（%）
    const GAMMA = 0.9        // 看重未來獎勵的程度
    let explorePct = 20      // 隨機嘗試比例（%）

    let episodes = 0
    let lastSuccess = 0

    let agent: Sprite = null
    let agentX = 0
    let agentY = 0
    let agentSteps = 0
    let isDone = false
    let didWin = false

    // move() 的輸出（用全域變數避免每步都配置新記憶體）
    let outX = 0
    let outY = 0
    let outReward = 0
    let outDone = false

    function clamp(v: number, lo: number, hi: number): number {
        return Math.max(lo, Math.min(hi, v))
    }

    function idx(x: number, y: number): number {
        return y * SIZE + x
    }

    function inside(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && x < SIZE && y < SIZE
    }

    function clearMemory() {
        q = []
        for (let i = 0; i < SIZE * SIZE * 4; i++) q.push(0)
        episodes = 0
        lastSuccess = 0
    }

    function initWorld() {
        cells = []
        for (let i = 0; i < SIZE * SIZE; i++) cells.push(EMPTY)
        startX = 0
        startY = 0
        cells[idx(SIZE - 1, SIZE - 1)] = GOAL
        rewardGoal = 10
        penaltyTrap = -5
        alphaPct = 50
        explorePct = 20
        clearMemory()
    }

    function maxQ(s: number): number {
        let m = q[s * 4]
        for (let a = 1; a < 4; a++) {
            if (q[s * 4 + a] > m) m = q[s * 4 + a]
        }
        return m
    }

    // 選目前 Q 值最高的方向；一樣高就隨機選（所以沒訓練時＝亂走）
    function bestAction(s: number): number {
        let best = q[s * 4]
        let ties: number[] = [0]
        for (let a = 1; a < 4; a++) {
            const v = q[s * 4 + a]
            if (v > best + 0.000001) {
                best = v
                ties = [a]
            } else if (Math.abs(v - best) <= 0.000001) {
                ties.push(a)
            }
        }
        return ties[Math.randomRange(0, ties.length - 1)]
    }

    function move(x: number, y: number, a: number) {
        const nx = x + DX[a]
        const ny = y + DY[a]
        if (!inside(nx, ny) || cells[idx(nx, ny)] == WALL) {
            outX = x
            outY = y
            outReward = PENALTY_WALL
            outDone = false
            return
        }
        outX = nx
        outY = ny
        const c = cells[idx(nx, ny)]
        if (c == GOAL) {
            outReward = rewardGoal
            outDone = true
        } else if (c == TRAP) {
            outReward = penaltyTrap
            outDone = true
        } else {
            outReward = STEP_COST
            outDone = false
        }
    }

    // ---------------- 設定迷宮 ----------------

    //% block="重設迷宮（8×8，終點在右下角）"
    //% group="1 設定迷宮" weight=100
    export function resetMaze() {
        initWorld()
    }

    //% block="設定 起點 x %x y %y"
    //% x.min=0 x.max=7 x.defl=0 y.min=0 y.max=7 y.defl=0
    //% group="1 設定迷宮" weight=90
    export function setStart(x: number, y: number) {
        if (!inside(x, y)) return
        if (cells[idx(x, y)] == GOAL) return
        cells[idx(x, y)] = EMPTY
        startX = x
        startY = y
    }

    //% block="設定 終點 x %x y %y"
    //% x.min=0 x.max=7 x.defl=7 y.min=0 y.max=7 y.defl=7
    //% group="1 設定迷宮" weight=80
    export function setGoal(x: number, y: number) {
        if (!inside(x, y)) return
        if (x == startX && y == startY) return
        for (let i = 0; i < cells.length; i++) {
            if (cells[i] == GOAL) cells[i] = EMPTY
        }
        cells[idx(x, y)] = GOAL
    }

    //% block="放 牆壁 x %x y %y"
    //% x.min=0 x.max=7 x.defl=3 y.min=0 y.max=7 y.defl=3
    //% group="1 設定迷宮" weight=70
    export function setWall(x: number, y: number) {
        setCell(x, y, WALL)
    }

    //% block="放 陷阱 x %x y %y"
    //% x.min=0 x.max=7 x.defl=4 y.min=0 y.max=7 y.defl=4
    //% group="1 設定迷宮" weight=60
    export function setTrap(x: number, y: number) {
        setCell(x, y, TRAP)
    }

    function setCell(x: number, y: number, type: number) {
        if (!inside(x, y)) return
        if (x == startX && y == startY) return
        if (cells[idx(x, y)] == GOAL) return
        cells[idx(x, y)] = type
    }

    //% block="把 x %x y %y 清成空地"
    //% x.min=0 x.max=7 x.defl=3 y.min=0 y.max=7 y.defl=3
    //% group="1 設定迷宮" weight=50
    export function clearCell(x: number, y: number) {
        if (!inside(x, y)) return
        if (cells[idx(x, y)] == GOAL) return
        cells[idx(x, y)] = EMPTY
    }

    // ---------------- 訓練 AI ----------------

    //% block="訓練 AI %n 回合"
    //% n.min=1 n.max=1000 n.defl=100
    //% group="2 訓練 AI" weight=100
    export function train(n: number) {
        let wins = 0
        for (let e = 0; e < n; e++) {
            let x = startX
            let y = startY
            for (let t = 0; t < MAX_STEPS; t++) {
                const s = idx(x, y)
                let a = 0
                if (Math.randomRange(0, 99) < explorePct) {
                    a = Math.randomRange(0, 3)
                } else {
                    a = bestAction(s)
                }
                move(x, y, a)
                const ns = idx(outX, outY)
                let target = outReward
                if (!outDone) target += GAMMA * maxQ(ns)
                q[s * 4 + a] += (alphaPct / 100) * (target - q[s * 4 + a])
                x = outX
                y = outY
                if (outDone) {
                    if (cells[ns] == GOAL) wins++
                    break
                }
            }
            episodes++
            if (e % 50 == 49) pause(1)   // 讓出時間給畫面
        }
        lastSuccess = n > 0 ? Math.round(100 * wins / n) : 0
    }

    //% block="清除 AI 的記憶（迷宮不變）"
    //% group="2 訓練 AI" weight=90
    export function forgetEverything() {
        clearMemory()
    }

    //% block="設定 到達終點的獎勵 %v"
    //% v.min=1 v.max=50 v.defl=10
    //% group="2 訓練 AI" weight=80
    export function setGoalReward(v: number) {
        rewardGoal = Math.abs(v)
    }

    //% block="設定 踩到陷阱的懲罰 %v"
    //% v.min=0 v.max=50 v.defl=5
    //% group="2 訓練 AI" weight=70
    export function setTrapPenalty(v: number) {
        penaltyTrap = -Math.abs(v)
    }

    //% block="設定 學習速度為 %pct 百分比"
    //% pct.min=5 pct.max=100 pct.defl=50
    //% group="2 訓練 AI" weight=60
    export function setLearningSpeed(pct: number) {
        alphaPct = clamp(pct, 5, 100)
    }

    //% block="設定 隨機嘗試比例為 %pct 百分比"
    //% pct.min=0 pct.max=100 pct.defl=20
    //% group="2 訓練 AI" weight=50
    export function setExplore(pct: number) {
        explorePct = clamp(pct, 0, 100)
    }

    //% block="已訓練回合數"
    //% group="2 訓練 AI" weight=40
    export function episodesTrained(): number {
        return episodes
    }

    //% block="最近一次訓練的成功率（百分比）"
    //% group="2 訓練 AI" weight=30
    export function recentSuccessRate(): number {
        return lastSuccess
    }

    // ---------------- 看 AI 學到什麼 ----------------

    //% block="畫出迷宮"
    //% group="3 看 AI 學到什麼" weight=100
    export function showMaze() {
        render(false)
    }

    //% block="畫出迷宮和 AI 學到的方向（箭頭）"
    //% group="3 看 AI 學到什麼" weight=90
    export function showLearnedArrows() {
        render(true)
    }

    function render(arrows: boolean) {
        const img = image.create(160, 120)
        img.fill(15)
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const c = cells[idx(x, y)]
                let color = 1                         // 空地：白
                if (c == WALL) color = 14             // 牆：咖啡
                else if (c == TRAP) color = 2         // 陷阱：紅
                else if (c == GOAL) color = 7         // 終點：綠
                else if (x == startX && y == startY) color = 9  // 起點：淺藍
                img.fillRect(OFFSET_X + x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, color)
                if (arrows && (c == EMPTY)) drawArrow(img, x, y)
            }
        }
        scene.setBackgroundImage(img)
    }

    function drawArrow(img: Image, x: number, y: number) {
        const s = idx(x, y)
        let lo = q[s * 4]
        let hi = q[s * 4]
        for (let a = 1; a < 4; a++) {
            lo = Math.min(lo, q[s * 4 + a])
            hi = Math.max(hi, q[s * 4 + a])
        }
        if (hi - lo < 0.000001) return                // 還沒學到東西，不畫
        let best = 0
        for (let a = 1; a < 4; a++) {
            if (q[s * 4 + a] > q[s * 4 + best]) best = a
        }
        const cx = OFFSET_X + x * CELL + 7
        const cy = y * CELL + 7
        const dx = DX[best]
        const dy = DY[best]
        const tipX = cx + dx * 5
        const tipY = cy + dy * 5
        img.drawLine(cx - dx * 5, cy - dy * 5, tipX, tipY, 8)
        const bx = tipX - dx * 2
        const by = tipY - dy * 2
        img.drawLine(tipX, tipY, bx + dy * 2, by + dx * 2, 8)
        img.drawLine(tipX, tipY, bx - dy * 2, by - dx * 2, 8)
    }

    // ---------------- AI 角色 ----------------

    //% block="把 AI 角色放在起點"
    //% group="4 AI 角色" weight=100
    export function placeAgent() {
        if (agent) agent.destroy()
        const img = image.create(9, 9)
        img.fillCircle(4, 4, 4, 10)
        agent = sprites.create(img, SpriteKind.Player)
        agentX = startX
        agentY = startY
        agentSteps = 0
        isDone = false
        didWin = false
        agent.setPosition(OFFSET_X + agentX * CELL + 7, agentY * CELL + 7)
    }

    //% block="AI 角色依照學到的走一步"
    //% group="4 AI 角色" weight=90
    export function agentStep() {
        if (!agent || isDone) return
        const a = bestAction(idx(agentX, agentY))
        move(agentX, agentY, a)
        agentX = outX
        agentY = outY
        agentSteps++
        agent.setPosition(OFFSET_X + agentX * CELL + 7, agentY * CELL + 7)
        const c = cells[idx(agentX, agentY)]
        if (c == GOAL) {
            isDone = true
            didWin = true
        } else if (c == TRAP || agentSteps >= AGENT_LIMIT) {
            isDone = true
        }
    }

    //% block="AI 角色結束了嗎？"
    //% group="4 AI 角色" weight=80
    export function agentFinished(): boolean {
        return isDone
    }

    //% block="AI 角色到達終點了嗎？"
    //% group="4 AI 角色" weight=70
    export function agentReachedGoal(): boolean {
        return didWin
    }

    //% block="AI 角色走了幾步"
    //% group="4 AI 角色" weight=60
    export function agentStepCount(): number {
        return agentSteps
    }

    initWorld()
}
