// ============================================================
// 自我檢測（測試檔）：檢查三種 AI 的核心功能是否正常
// 在擴展專案本身打開（匯入 GitHub 網址）時會自動執行，
// 螢幕會列出每一項 PASS（綠）或 FAIL（紅），模擬器的主控台也會印出結果。
// 全部 PASS 才代表程式在你的 MakeCode 版本與裝置上運作正常。
// ============================================================

namespace selfTest {
    let lines: string[] = []
    let failCount = 0

    function check(name: string, ok: boolean) {
        const text = (ok ? "PASS " : "FAIL ") + name
        lines.push(text)
        if (!ok) failCount++
        console.log(text)
    }

    // 課本愛文芒果分級表（編號 1~8）：大、紅、斑點、等級（A=0 B=1 C=2）
    const BIGS = [1, 1, 1, 1, 0, 0, 0, 0]
    const REDS = [1, 0, 0, 1, 1, 1, 0, 0]
    const SPOTS = [0, 0, 1, 1, 0, 1, 0, 1]
    const GRADES = [0, 1, 2, 2, 1, 2, 1, 2]

    // ---------- 決策樹 AI ----------
    function testTree() {
        treeAI.reset()
        const empty = treeAI.predict(1, 1, 0)
        check("tree empty ok", empty >= 0 && empty <= 2)

        treeAI.reset()
        for (let i = 0; i < 8; i++) {
            treeAI.addExample(BIGS[i], REDS[i], SPOTS[i], GRADES[i])
        }
        let right = 0
        for (let i = 0; i < 8; i++) {
            if (treeAI.predict(BIGS[i], REDS[i], SPOTS[i]) == GRADES[i]) right++
        }
        check("tree learn " + right + "/8", right == 8)

        treeAI.reset()
        treeAI.addExample(0, 0, 0, 1)
        treeAI.addExample(1, 1, 1, 1)
        check("tree one class", treeAI.predict(1, 0, 1) == 1)

        treeAI.reset()
        for (let i = 0; i < 8; i++) {
            treeAI.addExample(BIGS[i], REDS[i], SPOTS[i], GRADES[i])
        }
        check("tree image", treeAI.treeImage() != null)
    }

    // ---------- 迷宮 AI ----------
    function testMaze() {
        mazeAI.resetMaze()
        for (let y = 0; y < 5; y++) mazeAI.setWall(3, y)
        mazeAI.setWall(5, 3)
        mazeAI.setWall(5, 4)
        mazeAI.setWall(5, 5)
        mazeAI.setWall(5, 6)
        mazeAI.setTrap(6, 6)
        mazeAI.setTrap(2, 6)
        mazeAI.train(300)
        let wins = 0
        for (let k = 0; k < 5; k++) {
            mazeAI.placeAgent()
            while (!mazeAI.agentFinished()) mazeAI.agentStep()
            if (mazeAI.agentReachedGoal()) wins++
        }
        check("maze goal " + wins + "/5", wins >= 4)
        mazeAI.forgetEverything()
        check("maze forget", mazeAI.episodesTrained() == 0)
    }

    // ---------- 圖形 AI ----------
    function testShape() {
        shapeAI.resetData()
        shapeAI.loadDemoData()
        shapeAI.train()
        let ok = 0
        // 小圓（置中偏小）
        shapeAI.setDrawing(["00000000", "00000000", "00011000", "00100100", "00100100", "00011000", "00000000", "00000000"])
        if (shapeAI.classify() == "circle") ok++
        // 偏右下的三角形
        shapeAI.setDrawing(["00000000", "00000000", "00000000", "00001000", "00010100", "00100010", "00111110", "00000000"])
        if (shapeAI.classify() == "triangle") ok++
        // 小方形
        shapeAI.setDrawing(["00000000", "00000000", "00111100", "00100100", "00100100", "00111100", "00000000", "00000000"])
        if (shapeAI.classify() == "square") ok++
        check("shape " + ok + "/3", ok == 3)
        const conf = shapeAI.confidence()
        check("shape conf " + conf, conf >= 34 && conf <= 100)
    }

    // ---------- 芒果規則（和課本分級表一致） ----------
    function testKit() {
        let ok = 0
        for (let i = 0; i < 8; i++) {
            const code = BIGS[i] * 4 + REDS[i] * 2 + SPOTS[i]
            if (mangoKit.sizeOf(code) == BIGS[i] && mangoKit.colorOf(code) == REDS[i] &&
                mangoKit.spotOf(code) == SPOTS[i] && mangoKit.grandpaAnswer(code) == GRADES[i]) ok++
        }
        check("mango table " + ok + "/8", ok == 8)
    }

    export function run() {
        testTree()
        testMaze()
        testShape()
        testKit()

        const board = image.create(160, 120)
        board.fill(15)
        board.print("SELF TEST", 4, 2, 5)
        for (let i = 0; i < lines.length; i++) {
            board.print(lines[i], 4, 14 + i * 9, lines[i].charAt(0) == "P" ? 7 : 2)
        }
        board.print(failCount == 0 ? "ALL PASS!" : "FAIL: " + failCount, 4, 108, failCount == 0 ? 7 : 2)
        scene.setBackgroundImage(board)
        console.log(failCount == 0 ? "ALL PASS" : "FAILED " + failCount)
    }
}

selfTest.run()
