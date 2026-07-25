```markdown
# AGENTS.md - Backend & UI Architecture Guidelines

本專案採用 Next.js 進行前後端一體開發。為了確保程式碼的可維護性、可測試性與擴充性，後端邏輯與前端 UI 的開發與重構必須嚴格遵循 **Clean Architecture (整潔架構)** 與 **Separation of Concerns (關注點分離)** 原則。

---

## 1. 目錄結構與架構規範

請將程式碼嚴格歸類到以下對應的目錄與職責中：

```text
src/
├── app/                  # Next.js App Router (頁面與 Route Handlers)
│   ├── api/              # 1. Presentation / API 層 (面對前端的 API)
│   └── (routes)/         # 4. UI Components 層 (Render 給前端的 UI)
├── services/             # 2. Application / Business Logic 層 (Implementation Service)
└── external/             # 3. Infrastructure / Adapter 層 (External Services)

```

---

## 2. 各層職責、設計模式與約束

### 1. Presentation / API 層 (`src/app/api/...`)

* **對應概念**：Controller / Interface Adapters
* **職責**：作為 HTTP 進入點。負責解析 Request、驗證前端傳入的參數、進行基本的權限檢查，並呼叫對應的 **Implementation Service**。
* **限制**：**絕對禁止** 在此層寫入任何商業邏輯、資料庫查詢或直接呼叫外部 API。此層僅做 Request/Response 的轉發與例外捕捉。

### 2. Business Logic 層 (`src/services/...`)

* **對應概念**：Application Services / Facade Pattern
* **職責**：核心商業邏輯層（Implementation Service）。負責處理業務規則、資料轉換與流程控制，扮演 Facade 統一協調內部作業。
* **限制**：若需要取得外部資料，必須透過 **External Services 層**，不可直接在 Service 內使用 `fetch` 呼叫第三方 API。

### 3. Infrastructure / Adapter 層 (`src/external/...`)

* **對應概念**：Adapter Pattern / Gateway
* **職責**：封裝所有對外的第三方 API 溝通（例如 Yahoo Finance API、第三方 Payment 等）。
* **限制**：透過轉接器模式隔離外部變動。負責處理網路請求、API 金鑰管理、速率限制（Rate Limiting）、重試機制與外部資料格式的序列化。當外部 API 變更時，僅允許修改此層。

### 4. UI Components 層 (`src/app/...` 或 `src/components/...`)

* **對應概念**：Presentation Layer
* **職責**：負責畫面渲染與使用者互動（Render 給前端的 UI Components）。
* **限制**：不可直接呼叫外部 API 或操作底層商業邏輯，必須透過呼叫 `src/app/api/...` 或 Server Actions 來取得資料。

---

## 3. 開發與修改原則 (給 AI Agent 的指令)

1. **依賴方向原則 (Dependency Rule)**：
* 依賴關係必須嚴格保持單向：`Presentation (API/UI)` $\rightarrow$ `Business Logic (Service)` $\rightarrow$ `Infrastructure (External)`。
* 內層絕對不能依賴外層細節（例如：Service 絕對不能感知 HTTP Status Code 或 Next.js 的 Request 物件）。


2. **職責單一與高內聚**：當被要求新增或修改功能時，請先確認該修改屬於哪一層，嚴禁跨層混寫邏輯（例如在 API Route 內直接寫 Yahoo Finance 的 `fetch`）。
3. **型別安全**：各層之間傳遞的資料必須定義清楚的 TypeScript Interface / Type。

```

```