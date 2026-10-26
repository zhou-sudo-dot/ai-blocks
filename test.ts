// 這個檔案只在「擴展專案本身」的編輯畫面執行，匯入到別人的專案時不會跑。
// DEMO = 1：第一年 迷宮 AI（強化學習）
// DEMO = 2：第二年 圖形 AI（8x8 畫圖分類）
// DEMO = 3：芒果小學徒（決策樹／監督式學習遊戲）
let DEMO = 3

if (DEMO == 1) {
    mazeAI.resetMaze()
    for (let y = 0; y < 5; y++) mazeAI.setWall(3, y)
    mazeAI.setWall(5, 3)
    mazeAI.setWall(5, 4)
    mazeAI.setWall(5, 5)
    mazeAI.setWall(5, 6)
    mazeAI.setTrap(6, 6)
    mazeAI.setTrap(2, 6)
    mazeAI.showMaze()
    mazeAI.placeAgent()

    // A：讓 AI 角色走一次（沒訓練時會亂走）
    controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
        mazeAI.placeAgent()
        while (!mazeAI.agentFinished()) {
            mazeAI.agentStep()
            pause(150)
        }
        game.splash(mazeAI.agentReachedGoal() ? "Goal!" : "Failed", "steps: " + mazeAI.agentStepCount())
    })

    // B：訓練 100 回合並畫出箭頭
    controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
        mazeAI.train(100)
        mazeAI.showLearnedArrows()
        info.setScore(mazeAI.episodesTrained())
    })

    // 下：清除 AI 記憶，重新比較
    controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
        mazeAI.forgetEverything()
        mazeAI.showMaze()
        info.setScore(0)
    })
} else if (DEMO == 2) {
    shapeAI.loadDemoData()
    shapeAI.train()
    forever(function () {
        shapeAI.drawShape()
        const result = shapeAI.classify()
        game.splash(result, "" + shapeAI.confidence() + "%")
        shapeAI.showBrain(result)
        pause(1500)
    })
} else {
    mangoGame.start()
}
