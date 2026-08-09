# Screenshot-Matched Backtest Sandbox Unified UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Embedded Backtest Sandbox UI into a single outer card container with a dashed placeholder box matching the user's reference screenshots.

**Architecture:** Combine header title, controls, loading spinner, and dashed placeholder box inside a single `bg-slate-900/30` outer container in `EmbeddedBacktestPanel.jsx`.

**Tech Stack:** React, Tailwind CSS.

---

### Task 1: Refactor `EmbeddedBacktestPanel.jsx` to Single Unified Card

**Files:**
- Modify: `src/components/backtest/EmbeddedBacktestPanel.jsx`

- [ ] **Step 1: Replace split cards with single unified card container**

Consolidate top header title, date/horizon inputs, action button, spinner loading state, error alert, and dashed placeholder box into a single outer container.

- [ ] **Step 2: Run component tests to verify structure**

Run: `npm test tests/unit/components.test.js`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx docs/superpowers/specs/2026-08-09-backtest-ui-unified-screenshot-design.md docs/superpowers/plans/2026-08-09-backtest-ui-unified-screenshot.md
git commit -m "feat(ui): unify backtest sandbox UI into single card with dashed placeholder box matching screenshots"
```
