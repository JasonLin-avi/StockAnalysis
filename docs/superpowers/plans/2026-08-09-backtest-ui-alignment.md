# Backtest Sandbox UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Embedded Backtest Sandbox UI loading, spinner animations, and empty state guidance with the 15-Year Senior Quant Expert component.

**Architecture:** Modify React components `EmbeddedBacktestPanel.jsx` and `ResultCards.jsx` to render consistent Tailwind CSS spin animations and dashed placeholder cards.

**Tech Stack:** React, Tailwind CSS, Lucide/Inline SVG.

---

### Task 1: Update EmbeddedBacktestPanel and ResultCards Component UI

**Files:**
- Modify: `src/components/backtest/EmbeddedBacktestPanel.jsx`
- Modify: `src/components/backtest/ResultCards.jsx`

- [ ] **Step 1: Update `EmbeddedBacktestPanel.jsx` with spinner & initial empty state**

Add SVG spin animation to the predict button, render a centered loading block when `loading === true`, and display the dashed initial instruction card when `!loading && !errorMsg && !forecast`.

- [ ] **Step 2: Update `ResultCards.jsx` reveal button spinner**

Add SVG spin animation to the "揭曉未來走勢與自動對比評分" button when `evaluating === true`.

- [ ] **Step 3: Verify existing UI tests or run test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 4: Commit changes**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx src/components/backtest/ResultCards.jsx docs/superpowers/specs/2026-08-09-backtest-ui-alignment-design.md docs/superpowers/plans/2026-08-09-backtest-ui-alignment.md
git commit -m "feat(ui): align backtest sandbox loading spinner and empty state with quant expert panel"
```
