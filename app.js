require("dotenv").config();
const express = require("express");
const { query } = require("./db");

const app = express();

function layout(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;max-width:980px;margin:24px auto;padding:0 12px;line-height:1.4}
    nav a{margin-right:12px}
    table{border-collapse:collapse;width:100%;margin:12px 0}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f5f5f5}
    .muted{color:#666}
    .card{border:1px solid #ddd;border-radius:10px;padding:12px;margin:12px 0}
    code{background:#f2f2f2;padding:2px 4px;border-radius:4px}
  </style>
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/summary">Summary</a>
    <a href="/returns">Returns</a>
    <a href="/volatility">Volatility</a>
    <a href="/volume">Volume</a>
    <a href="/average">Average</a>
  </nav>
  <hr>
  ${content}
</body>
</html>`;
}

function table(rows) {
  if (!rows || rows.length === 0) return "<p>No results.</p>";
  const cols = Object.keys(rows[0]);
  return `<table>
    <thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.map(r => `<tr>${cols.map(c => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>`;
}

// Home: motivation + questions (Goals satisfied)
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
      </ul>
      <p class="muted">Pages above answer these questions using SQL queries on <code>cm3010_stock</code>.</p>
    </div>
  `));
});

// Summary page
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
      <p class="muted">Counts and date range per ticker.</p>
      ${table(rows)}
    `));
  } catch (e) { next(e); }
});

// Returns page
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
      <p class="muted">Return from first close to last close in the dataset window.</p>
      ${table(rows)}
    `));
  } catch (e) { next(e); }
});

// Volatility page
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
      <p class="muted">Standard deviation of daily returns (higher = more volatile).</p>
      ${table(rows)}
    `));
  } catch (e) { next(e); }
});

// Volume page
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
      <p class="muted">Average and maximum volume per ticker.</p>
      ${table(rows)}
    `));
  } catch (e) { next(e); }
});


// Average page
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
      <h1>Average Closing Price by Company</h1>
      <p class="muted">Average close price across the dataset window (last ~5 years).</p>
      ${table(rows)}
    `));
  } catch (e) { next(e); }
});


// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send(layout("Error", `<h1>Error</h1><pre>${String(err)}</pre>`));
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Running at http://localhost:${process.env.PORT || 3000}`);
});
