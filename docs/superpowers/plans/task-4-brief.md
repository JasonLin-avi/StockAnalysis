### Task 4: Frontend Analytics Hub Layout & Skeleton

**Files:**
- Create: `src/app/hub/page.js`
- Create: `src/components/hub/SkeletonLoader.js`
- Test: `tests/ui/hub-page.test.js`

**Interfaces:**
- Produces: The main `/hub` page layout with a 60/40 grid and dark glassmorphism styling.

- [ ] **Step 1: Write the failing test**

```javascript
/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HubPage from '../../src/app/hub/page';

describe('Hub Page Layout', () => {
  it('renders the header and layout grid', () => {
    render(<HubPage />);
    expect(screen.getByText('Analytics Hub')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/ui/hub-page.test.js`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/components/hub/SkeletonLoader.js
import React from 'react';

export default function SkeletonLoader({ height = 'h-32' }) {
  // Why: Provides a smooth, non-blocking visual placeholder while client-side fetches are pending.
  return (
    <div className={`w-full bg-slate-800/50 rounded-2xl animate-pulse ${height}`}></div>
  );
}

// src/app/hub/page.js
import React from 'react';
import SkeletonLoader from '../../components/hub/SkeletonLoader';

export default function HubPage() {
  // Why: 60/40 split on large screens provides optimal reading width for tables vs cards.
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-8">Analytics Hub</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-bold text-slate-300">Watchlist Analytics</h2>
            <SkeletonLoader height="h-64" />
          </div>
          
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-300">Backtest Leaderboard</h2>
            <SkeletonLoader height="h-64" />
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/ui/hub-page.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/hub/page.js src/components/hub/SkeletonLoader.js tests/ui/hub-page.test.js
git commit -m "feat: implement hub page layout and skeleton loader"
```
