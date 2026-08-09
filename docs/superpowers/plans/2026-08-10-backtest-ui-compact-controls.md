# Backtest Sandbox Compact Control Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce gap distance between selectors and action button, adjust font sizing, and align elements compactly.

**Architecture:** Modify `EmbeddedBacktestPanel.jsx` control bar Tailwind utility classes.

---

### Task 1: Compact Control Bar Layout in `EmbeddedBacktestPanel.jsx`

**Files:**
- Modify: `src/components/backtest/EmbeddedBacktestPanel.jsx`

- [ ] **Step 1: Tighten layout spacing & font styling**

Update control bar flex layout to `flex flex-wrap items-end justify-start gap-4 sm:gap-6` and refine font sizes.

- [ ] **Step 2: Run UI tests**

Run: `npm test tests/ui/embedded-backtest-panel.test.js tests/ui/kline-tab.test.js`
Expected: PASS

- [ ] **Step 3: Commit changes to Git**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx docs/superpowers/specs/2026-08-10-backtest-ui-compact-controls-design.md docs/superpowers/plans/2026-08-10-backtest-ui-compact-controls.md
git commit -m "feat(ui): tighten backtest sandbox control bar layout and font spacing"
```
