# Task P1: Test Performance Optimization

## 角色指派
- **主攻**：`qa-arch-reviewer`

## 任務目標
將 Jest 測試套件執行時間從原本的 200 秒（3.3 分鐘）大幅縮短至 30 秒以內：

1. **分層測試環境配置**：
   - 目前 `jest.config.js` 全域使用 `next/jest` 與 `babel-jest`，每次運行都會經過較重的轉譯流程。
   - 將純演算法計算（`src/lib/**`，無須 JSDOM）與 UI 組件測試（需要 `jsdom`）透過 Jest `projects` 設定分離。
   - 評估引入 `@swc/jest` 取代 `babel-jest`，加速 TypeScript/ESM 轉譯。

2. **微調 Worker 與快取**：
   - 在 Windows 環境配置最佳的 `--maxWorkers`（如 `50%` 或固定 4-6 workers），避免過度併發造成的 I/O 堵塞。
   - 確保 Jest 模組解析快取正常運作。

3. **驗證方式**：
   - 執行 `npm test` 並計時，確認所有測試全數通過且時間大幅下降。
