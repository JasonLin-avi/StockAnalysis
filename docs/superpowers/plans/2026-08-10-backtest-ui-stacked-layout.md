# Backtest Sandbox Stacked Full-Width Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Embedded Backtest Sandbox UI to have vertically stacked full-width title row and control bar, and remove dashed border and test tag from unfetched state.

**Architecture:** Update `EmbeddedBacktestPanel.jsx` JSX hierarchy.

---

### Task 1: Refactor `EmbeddedBacktestPanel.jsx` Layout

**Files:**
- Modify: `src/components/backtest/EmbeddedBacktestPanel.jsx`

- [ ] **Step 1: Stack Title and Control Bar vertically in full width**

Structure header area into two full-width rows inside the card container.

- [ ] **Step 2: Remove dashed border and `🔥 [NEW UI LOADED]` tag from initial state**

Clean up placeholder div style to solid/borderless centered text.

- [ ] **Step 3: Run UI tests to confirm zero regressions**

Run: `npm test tests/ui/embedded-backtest-panel.test.js tests/ui/kline-tab.test.js`
Expected: PASS

- [ ] **Step 4: Commit changes to Git**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx docs/superpowers/specs/2026-08-10-backtest-ui-stacked-layout-design.md docs/superpowers/plans/2026-08-10-backtest-ui-stacked-layout.md
git commit -m "feat(ui): refine backtest sandbox header to stacked full-width layout and clean placeholder prompt"
```
