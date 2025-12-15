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
:root{--bg:#fff;--text:#111827;--muted:#6b7280;--line:#e5e7eb;--card:#f9fafb;--accent:#2563eb}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);max-width:980px;margin:24px auto;padding:0 14px}
header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.brand{font-weight:800}
nav{display:flex;gap:10px;flex-wrap:wrap}
nav a{padding:8px 10px;border:1px solid var(--line);border-radius:10px;text-decoration:none;color:var(--text)}
nav a.active{border-color:var(--accent);background:#eff6ff;color:var(--accent)}
.card{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:14px;margin:14px 0}
.muted{color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff}
th,td{border:1px solid var(--line);padding:8px}
th{background:#f3f4f6}
.right{text-align:right}
</style>
</head>
<body>
<header>
  <div class="brand">CM3010 • Stock Dashboard</div>
  <nav>
    ${link("/", "Home")}
    ${link("/summary", "Summary")}
    ${link("/returns", "Returns")}
    ${link("/volatility", "Volatility")}
    ${link("/volume", "Volume")}
    ${link("/average", "Average")}
    ${link("/explore", "Explore")}
  </nav>
</header>
${content}
</body>
</html>`;
}

function formatValue(v) {
  if (v == null) return "";
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return String(v);
}

function table(rows, opts = {}) {
  if (!rows.length) return "<p class='muted'>No results.</p>";
  const cols = Object.keys(rows[0]);
  const right = new Set(opts.rightAlign || []);
  return `<table>
<thead><tr>${cols.map(c => `<th class="${right.has(c) ? "right" : ""}">${opts.labels?.[c] || c}</th>`).join("")}</tr></thead>
<tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${right.has(c) ? "right" : ""}">${formatValue(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;
}

/* -----------------------------
   Routes
------------------------------ */

app.get("/", (_req, res) => {
  res.send(layout("Home", `
<h1>CM3010 Stage 4 Web App</h1>
<div class="card">
<p class="muted">Interactive Node.js + MySQL application for stock analysis.</p>
<ul>
<li>Dataset coverage</li>
<li>Returns</li>
<li>Volatility</li>
<li>Volume</li>
<li>User-driven exploration</li>
</ul>
</div>
`, "/"));
});

app.get("/summary", async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT c.ticker, COUNT(*) row_count, MIN(trade_date) min_date, MAX(trade_date) max_date
      FROM DailyPrice d JOIN Company c ON c.company_id=d.company_id
      GROUP BY c.ticker ORDER BY c.ticker
    `);
    res.send(layout("Summary", `<h1>Summary</h1>${table(rows,{labels:{row_count:"Rows"}})}`, "/summary"));
  } catch(e){next(e);}
});

app.get("/returns", async (_req, res, next) => {
  try {
    const rows = await query(`
      WITH b AS (
        SELECT company_id, MIN(trade_date) a, MAX(trade_date) z FROM DailyPrice GROUP BY company_id
      )
      SELECT c.ticker,
      ROUND((MAX(d.close_price)/MIN(d.close_price)-1)*100,2) pct_return
      FROM DailyPrice d JOIN b ON d.company_id=b.company_id
      JOIN Company c ON c.company_id=d.company_id
      GROUP BY c.ticker ORDER BY pct_return DESC
    `);
    res.send(layout("Returns", `<h1>Returns</h1>${table(rows,{rightAlign:["pct_return"]})}`, "/returns"));
  } catch(e){next(e);}
});

app.get("/volatility", async (_req, res, next) => {
  try {
    const rows = await query(`
      WITH r AS (
        SELECT company_id, close_price/LAG(close_price) OVER (PARTITION BY company_id ORDER BY trade_date)-1 x
        FROM DailyPrice
      )
      SELECT c.ticker, ROUND(STDDEV_SAMP(x)*100,4) volatility
      FROM r JOIN Company c ON c.company_id=r.company_id
      WHERE x IS NOT NULL GROUP BY c.ticker ORDER BY volatility DESC
    `);
    res.send(layout("Volatility", `<h1>Volatility</h1>${table(rows,{rightAlign:["volatility"]})}`, "/volatility"));
  } catch(e){next(e);}
});

app.get("/volume", async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT c.ticker, ROUND(AVG(volume),0) avg_volume
      FROM DailyPrice d JOIN Company c ON c.company_id=d.company_id
      GROUP BY c.ticker ORDER BY avg_volume DESC
    `);
    res.send(layout("Volume", `<h1>Volume</h1>${table(rows,{rightAlign:["avg_volume"]})}`, "/volume"));
  } catch(e){next(e);}
});

app.get("/average", async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT c.ticker, c.company_name, ROUND(AVG(close_price),2) avg_close
      FROM DailyPrice d JOIN Company c ON c.company_id=d.company_id
      GROUP BY c.ticker,c.company_name ORDER BY avg_close DESC
    `);
    res.send(layout("Average", `<h1>Average Close</h1>${table(rows,{rightAlign:["avg_close"]})}`, "/average"));
  } catch(e){next(e);}
});

/* -----------------------------
   EXPLORE (FIXED LIMIT ISSUE)
------------------------------ */

app.get("/explore", async (req, res, next) => {
  try {
    const companies = await query(`SELECT ticker, company_name FROM Company ORDER BY ticker`);
    let days = Math.min(365, Math.max(5, parseInt(req.query.days || 30)));
    const ticker = req.query.ticker || companies[0].ticker;
    const mode = req.query.mode || "prices";

    let rows;

    if (mode === "prices") {
      rows = await query(`
        SELECT trade_date, open_price, high_price, low_price, close_price, volume
        FROM DailyPrice d JOIN Company c ON c.company_id=d.company_id
        WHERE c.ticker=?
        ORDER BY trade_date DESC
        LIMIT ${days}
      `,[ticker]);
    } else {
      rows = await query(`
        WITH recent AS (
          SELECT close_price, volume
          FROM DailyPrice d JOIN Company c ON c.company_id=d.company_id
          WHERE c.ticker=?
          ORDER BY trade_date DESC
          LIMIT ${days}
        )
        SELECT
          ? ticker,
          ROUND(MIN(close_price),2) min_close,
          ROUND(MAX(close_price),2) max_close,
          ROUND(AVG(close_price),2) avg_close,
          ROUND(AVG(volume),0) avg_volume
        FROM recent
      `,[ticker,ticker]);
    }

    res.send(layout("Explore", `
<h1>Explore</h1>
<form>
<select name="ticker">${companies.map(c=>`<option ${c.ticker===ticker?"selected":""}>${c.ticker}</option>`).join("")}</select>
<select name="mode">
<option value="prices" ${mode==="prices"?"selected":""}>Prices</option>
<option value="stats" ${mode==="stats"?"selected":""}>Stats</option>
</select>
<input type="range" name="days" min="5" max="365" value="${days}">
<button>Run</button>
</form>
${table(rows)}
`, "/explore"));
  } catch(e){next(e);}
});

/* ----------------------------- */

app.use((err,_q,res,_n)=>{
  console.error(err);
  res.status(500).send(layout("Error", `<pre>${err}</pre>`));
});

app.listen(process.env.PORT||3000, ()=>{
  console.log(`Running at http://localhost:${process.env.PORT||3000}`);
});
