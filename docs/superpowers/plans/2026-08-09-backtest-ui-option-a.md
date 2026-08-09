# Option A Backtest Sandbox UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Embedded Backtest Sandbox UI to use full-width 15-Year Quant Expert container, header bar, markdown section, and reveal card.

**Architecture:** Update `EmbeddedBacktestPanel.jsx` and `ResultCards.jsx` to render a unified container layout identical to `TechnicalAISummaryPanel`.

**Tech Stack:** React, ReactMarkdown, remarkGfm, Tailwind CSS.

---

### Task 1: Refactor EmbeddedBacktestPanel and ResultCards Layout

**Files:**
- Modify: `src/components/backtest/EmbeddedBacktestPanel.jsx`
- Modify: `src/components/backtest/ResultCards.jsx`

- [ ] **Step 1: Refactor `EmbeddedBacktestPanel.jsx` to wrap content in 15-Year Quant Expert container**

Wrap lower section in `border border-slate-900 bg-slate-900/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6` with header bar, spinner loading state, error alert, initial empty state box, and `ResultCards`.

- [ ] **Step 2: Refactor `ResultCards.jsx` to render full-width rationale markdown & evaluation card**

Render prediction metrics badges, key levels, full-width Markdown rationale block, and outcome reveal/evaluation card cleanly.

- [ ] **Step 3: Run project tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 4: Commit changes**

```bash
git add src/components/backtest/EmbeddedBacktestPanel.jsx src/components/backtest/ResultCards.jsx docs/superpowers/specs/2026-08-09-backtest-ui-option-a-design.md docs/superpowers/plans/2026-08-09-backtest-ui-option-a.md
git commit -m "feat(ui): implement Option A full-width quant expert layout for backtest sandbox"
```
