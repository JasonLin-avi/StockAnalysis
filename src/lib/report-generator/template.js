const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>股市分析報告 - {{symbol}}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-blue: #3b82f6;
            --accent-green: #10b981;
            --accent-red: #ef4444;
            --accent-orange: #f59e0b;
            --gradient-primary: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            --glass-bg: rgba(15, 23, 42, 0.4);
            --glass-border: rgba(255, 255, 255, 0.05);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2rem 1rem;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        header {
            background: var(--gradient-primary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2.5rem;
            margin-bottom: 2rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
            z-index: 1;
        }

        .header-content {
            position: relative;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
        }

        .brand {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(to right, #3b82f6, #60a5fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }

        .meta-info {
            text-align: right;
        }

        .meta-info h1 {
            font-size: 2.2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.2rem;
        }

        .meta-info p {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.8rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }

        .card-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 1.2rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.6rem;
        }

        .card-title svg {
            width: 20px;
            height: 20px;
            fill: var(--accent-blue);
        }

        .highlight-grid {
            grid-column: span 2;
        }

        @media (max-width: 768px) {
            .highlight-grid {
                grid-column: span 1;
            }
            .meta-info {
                text-align: left;
            }
        }

        /* Lists and details */
        .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 0.8rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .metric-row:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        .metric-value {
            font-weight: 600;
            font-size: 0.95rem;
        }

        .value-up { color: var(--accent-green); }
        .value-down { color: var(--accent-red); }
        .value-neutral { color: var(--accent-blue); }

        /* Advice Panel Styling */
        .advice-box {
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.2rem;
        }

        .advice-badge-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .badge {
            padding: 0.4rem 1rem;
            border-radius: 99px;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
        }

        .badge-buy { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-sell { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge-hold { background: rgba(245, 158, 11, 0.2); color: var(--accent-orange); border: 1px solid rgba(245, 158, 11, 0.3); }

        .advice-summary {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 0.8rem;
        }

        .advice-rationale {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        /* Risk alert items */
        .risk-item {
            display: flex;
            gap: 0.8rem;
            background: rgba(239, 68, 68, 0.05);
            border-left: 3px solid var(--accent-red);
            padding: 1rem;
            border-radius: 0 8px 8px 0;
            margin-bottom: 0.8rem;
            font-size: 0.9rem;
        }

        .risk-item:last-child {
            margin-bottom: 0;
        }

        .risk-item-icon {
            color: var(--accent-red);
            font-weight: bold;
        }

        .footer {
            text-align: center;
            padding: 2rem 0;
            color: var(--text-secondary);
            font-size: 0.85rem;
            border-top: 1px solid var(--border-color);
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-content">
                <div class="brand">Antigravity Stock Analytics</div>
                <div class="meta-info">
                    <h1>{{symbol}} 分析報告</h1>
                    <p>報告日期: {{date}} | 當前價格: {{price}} ({{changePercent}}%)</p>
                </div>
            </div>
        </header>

        <div class="grid">
            <!-- 投資建議與評級 -->
            <div class="card highlight-grid">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
                    評級與投資策略建議
                </div>
                <div class="advice-box">
                    <div class="advice-badge-container">
                        <div>
                            <span class="badge {{badgeClass}}">{{recommendation}}</span>
                            <span style="margin-left: 0.5rem; color: var(--text-secondary)">信心指數: {{confidenceScore}}</span>
                        </div>
                        <div style="font-weight: 600;">建議持股比例: {{positionSize}}</div>
                    </div>
                    <div class="advice-summary">{{adviceSummary}}</div>
                    <div class="advice-rationale"><strong>資產配置邏輯：</strong>{{portfolioRationale}}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="metric-row" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px;">
                        <span class="metric-label">建議止損價</span>
                        <span class="metric-value" style="color: var(--accent-red)">{{stopLoss}}</span>
                    </div>
                    <div class="metric-row" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px;">
                        <span class="metric-label">目標止盈價</span>
                        <span class="metric-value" style="color: var(--accent-green)">{{takeProfit}}</span>
                    </div>
                </div>
            </div>

            <!-- 技術指標 -->
            <div class="card">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                    技術分析指標
                </div>
                <div class="metric-row">
                    <span class="metric-label">MA(20) 移動平均線</span>
                    <span class="metric-value">{{ma20}}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">RSI(14) 相對強弱指標</span>
                    <span class="metric-value {{rsiClass}}">{{rsi}}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">MACD 柱狀體 (Histogram)</span>
                    <span class="metric-value {{macdClass}}">{{macdHistogram}}</span>
                </div>
            </div>

            <!-- 基本面指標 -->
            <div class="card">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H5v-2h4V7h2v4h4v2z"/></svg>
                    基本面財務指標
                </div>
                <div class="metric-row">
                    <span class="metric-label">市盈率 (P/E Ratio)</span>
                    <span class="metric-value {{peClass}}">{{peRatio}} ({{peStatus}})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">每股收益 (EPS)</span>
                    <span class="metric-value">{{eps}} ({{epsStatus}})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">負債比率 (Debt Ratio)</span>
                    <span class="metric-value">{{debtRatio}} ({{debtRatioStatus}})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">季度營收成長率</span>
                    <span class="metric-value">{{revenueGrowth}} ({{revenueGrowthStatus}})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">自由現金流 (Free Cash Flow)</span>
                    <span class="metric-value">{{freeCashFlow}} ({{cashFlowStatus}})</span>
                </div>
            </div>

            <!-- 新聞與社交情緒 -->
            <div class="card">
                <div class="card-title">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                    輿情與情緒指標
                </div>
                <div class="metric-row">
                    <span class="metric-label">財經新聞情緒得分</span>
                    <span class="metric-value {{newsClass}}">{{newsScore}} ({{newsSentiment}})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">社群論壇討論熱度/情緒</span>
                    <span class="metric-value {{socialClass}}">{{socialScore}} ({{socialSentiment}})</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">高影響力事件警示</span>
                    <span class="metric-value">{{highImpactEvent}}</span>
                </div>
            </div>

            <!-- 風險警告因素 -->
            <div class="card">
                <div class="card-title" style="color: var(--accent-red);">
                    <svg viewBox="0 0 24 24" style="fill: var(--accent-red);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    重大風險防護因子
                </div>
                <div style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.95rem;">
                    <strong>風險防護建議：</strong>{{riskMitigation}}
                </div>
                <div id="risk-factors">
                    {{riskFactorsHTML}}
                </div>
            </div>
        </div>

        <div class="footer">
            <p>本報告由 Antigravity 股市自動分析引擎生成。僅供參考，不構成任何買賣與投資操作建議。</p>
            <p>&copy; 2026 Antigravity Analytics. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

export {htmlTemplate};
