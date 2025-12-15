require("dotenv").config();
const express = require("express");
const { query } = require("./db");

const app = express();

/* -----------------------------
   Layout + Table helpers
------------------------------ */

function layout(title, content, currentPath = "") {
  const link = (href, label) => {
    const active = href === currentPath ? "active" : "";
    return `<a class="${active}" href="${href}">${label}</a>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root{
      --bg:#ffffff;
      --text:#111827;
      --muted:#6b7280;
      --line:#e5e7eb;
      --card:#f9fafb;
      --accent:#2563eb;
    }
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);max-width:980px;margin:24px auto;padding:0 14px;line-height:1.45}
    header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    .brand{font-weight:800;font-size:18px;letter-spacing:.2px}
    nav{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    nav a{color:var(--text);text-decoration:none;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff}
    nav a:hover{border-color:#cbd5e1}
    nav a.active{border-color:var(--accent);color:var(--accent);background:#eff6ff}
    hr{border:none;border-top:1px solid var(--line);margin:14px 0 18px}
    h1{font-size:34px;margin:8px 0 10px}
    h2{font-size:18px;margin:0 0 10px}
    .muted{color:var(--muted)}
    .card{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:14px;margin:14px 0}
    .meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .pill{font-size:12px;color:var(--muted);border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 10px}
    table{border-collapse:collapse;width:100%;margin:12px 0;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
    th,td{border-bottom:1px solid var(--line);padding:10px 10px;text-align:left;vertical-align:top}
    th{background:#f3f4f6;font-size:13px;color:#374151}
    tr:last-child td{border-bottom:none}
    .right{text-align:right}
    .footer{margin-top:20px;font-size:12px;color:var(--muted)}
    code{background:#f3f4f6;padding:2px 6px;border-radius:6px}
  </style>
</head>
<body>
  <header>
    <div class="brand">CM3010 • Stock Dashboard</div>
    <nav aria-label="Primary">
      ${link("/", "Home")}
      ${link("/summary", "Summary")}
      ${link("/returns", "Returns")}
      ${link("/volatility", "Volatility")}
      ${link("/volume", "Volume")}
      ${link("/average", "Average")}
    </nav>
  </header>

  <hr>

  ${content}

  <div class="footer">
    <div class="meta">
      <span class="pill">Database: <code>cm3010_stock</code></span>
      <span class="pill">Node + Express + MySQL</span>
    </div>
  </div>
</body>
</html>`;
}

function formatValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    const isInt = Number.isInteger(v);
    return isInt ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  return String(v);
}

function table(rows, options = {}) {
  if (!rows || rows.length === 0) return "<p class='muted'>No results.</p>";

  const cols = options.columns || Object.keys(rows[0]);
  const labels = options.labels || {};
  const rightAlign = new Set(options.rightAlign || []);

  return `<table role="table" aria-label="${options.ariaLabel || "Query results"}">
    <thead><tr>
      ${cols.map(c => `<th scope="col" class="${rightAlign.has(c) ? "right" : ""}">${labels[c] || c}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${rows.map(r => `<tr>
        ${cols.map(c => `<td class="${rightAlign.has(c) ? "right" : ""}">${formatValue(r[c])}</td>`).join("")}
      </tr>`).join("")}
    </tbody>
  </table>`;
}

/* -----------------------------
   Routes
------------------------------ */

// Home
app.get("/", (_req, res) => {
  res.send(layout("CM3010 Stage 4", `
    <h1>CM3010 Stage 4 Web App</h1>
    <p class="muted">Node.js + MySQL app that presents stock price and volume analysis for 7 tickers.</p>

    <div class="card">
      <h2>Motivation / Questions</h2>
      <ul>
        <li>How many records per company and what date range is covered?</li>
        <li>Which stock has the highest overall return over the dataset window?</li>
        <li>Which stock shows the highest day-to-day volatility?</li>
        <li>Which stock has the highest average trading volume?</li>
        <li>How do average closing prices compare across companies?</li>
      </ul>
      <p class="muted">Use the navigation bar to view the SQL query outputs.</p>
    </div>
  `, "/"));
});

// Summary
app.get("/summary", async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT c.ticker,
             COUNT(*) AS row_count,
             MIN(d.trade_date) AS min_date,
             MAX(d.trade_date) AS max_date
      FROM DailyPrice d
      JOIN Company c ON c.company_id = d.company_id
      GROUP BY c.ticker
      ORDER BY c.ticker;
    `);

    res.send(layout("Summary", `
      <h1>Dataset Summary</h1>
      <div class="card">
        <p class="muted">Counts and date range per ticker.</p>
        ${table(rows, {
          labels: { ticker: "Ticker", row_count: "Rows", min_date: "From", max_date: "To" },
          rightAlign: ["row_count"]
        })}
      </div>
    `, "/summary"));
  } catch (e) { next(e); }
});

// Returns
app.get("/returns", async (_req, res, next) => {
  try {
    const rows = await query(`
      WITH bounds AS (
        SELECT company_id, MIN(trade_date) AS min_date, MAX(trade_date) AS max_date
        FROM DailyPrice
        GROUP BY company_id
      ),
      first_last AS (
        SELECT b.company_id,
               (SELECT close_price FROM DailyPrice
                WHERE company_id=b.company_id AND trade_date=b.min_date) AS first_close,
               (SELECT close_price FROM DailyPrice
                WHERE company_id=b.company_id AND trade_date=b.max_date) AS last_close
        FROM bounds b
      )
      SELECT c.ticker,
             ROUND(first_close, 4) AS first_close,
             ROUND(last_close, 4) AS last_close,
             ROUND((last_close/first_close - 1)*100, 2) AS pct_return
      FROM first_last fl
      JOIN Company c ON c.company_id = fl.company_id
      ORDER BY pct_return DESC;
    `);

    res.send(layout("Returns", `
      <h1>Overall Returns</h1>
      <div class="card">
        <p class="muted">Return from first close to last close in the dataset window.</p>
        ${table(rows, {
          labels: { ticker: "Ticker", first_close: "First Close", last_close: "Last Close", pct_return: "Return (%)" },
          rightAlign: ["first_close", "last_close", "pct_return"]
        })}
      </div>
    `, "/returns"));
  } catch (e) { next(e); }
});

// Volatility
app.get("/volatility", async (_req, res, next) => {
  try {
    const rows = await query(`
      WITH returns AS (
        SELECT company_id,
               trade_date,
               (close_price / LAG(close_price) OVER (PARTITION BY company_id ORDER BY trade_date) - 1) AS daily_return
        FROM DailyPrice
      )
      SELECT c.ticker,
             ROUND(STDDEV_SAMP(daily_return)*100, 4) AS daily_volatility_pct
      FROM returns r
      JOIN Company c ON c.company_id = r.company_id
      WHERE daily_return IS NOT NULL
      GROUP BY c.ticker
      ORDER BY daily_volatility_pct DESC;
    `);

    res.send(layout("Volatility", `
      <h1>Volatility</h1>
      <div class="card">
        <p class="muted">Standard deviation of daily returns (higher = more volatile).</p>
        ${table(rows, {
          labels: { ticker: "Ticker", daily_volatility_pct: "Daily Volatility (%)" },
          rightAlign: ["daily_volatility_pct"]
        })}
      </div>
    `, "/volatility"));
  } catch (e) { next(e); }
});

// Volume
app.get("/volume", async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT c.ticker,
             ROUND(AVG(d.volume), 0) AS avg_volume,
             MAX(d.volume) AS max_volume
      FROM DailyPrice d
      JOIN Company c ON c.company_id = d.company_id
      GROUP BY c.ticker
      ORDER BY avg_volume DESC;
    `);

    res.send(layout("Volume", `
      <h1>Trading Volume</h1>
      <div class="card">
        <p class="muted">Average and maximum daily volume per ticker.</p>
        ${table(rows, {
          labels: { ticker: "Ticker", avg_volume: "Avg Volume", max_volume: "Max Volume" },
          rightAlign: ["avg_volume", "max_volume"]
        })}
      </div>
    `, "/volume"));
  } catch (e) { next(e); }
});

// Average
app.get("/average", async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        c.ticker,
        c.company_name,
        ROUND(AVG(d.close_price), 2) AS avg_close_price
      FROM DailyPrice d
      JOIN Company c ON c.company_id = d.company_id
      GROUP BY c.company_id, c.ticker, c.company_name
      ORDER BY avg_close_price DESC;
    `);

    res.send(layout("Average Close", `
      <h1>Average Closing Price</h1>
      <div class="card">
        <h2>What this answers</h2>
        <p class="muted">Compares average close price across tickers over the dataset window.</p>
        ${table(rows, {
          labels: { ticker: "Ticker", company_name: "Company", avg_close_price: "Avg Close (USD)" },
          rightAlign: ["avg_close_price"]
        })}
      </div>
    `, "/average"));
  } catch (e) { next(e); }
});

/* -----------------------------
   Error handler + server start
------------------------------ */

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send(layout("Error", `<h1>Error</h1><pre>${String(err)}</pre>`));
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Running at http://localhost:${process.env.PORT || 3000}`);
});
