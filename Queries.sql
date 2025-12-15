USE cm3010_stock;

-- =========================
-- Query 1: Dataset summary
-- =========================
SELECT c.ticker,
       COUNT(*) AS row_count,
       MIN(d.trade_date) AS min_date,
       MAX(d.trade_date) AS max_date
FROM DailyPrice d
JOIN Company c ON c.company_id = d.company_id
GROUP BY c.ticker
ORDER BY c.ticker;

-- =========================
-- Query 2: Overall return
-- =========================
WITH bounds AS (
  SELECT company_id,
         MIN(trade_date) AS min_date,
         MAX(trade_date) AS max_date
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
       first_close,
       last_close,
       ROUND((last_close/first_close - 1)*100, 2) AS pct_return
FROM first_last fl
JOIN Company c ON c.company_id = fl.company_id
ORDER BY pct_return DESC;

-- =========================
-- Query 3: Volatility
-- =========================
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

-- =================================
-- Query 4: Average Trading Volume
-- =================================
SELECT c.ticker,
       ROUND(AVG(d.volume), 0) AS avg_volume,
       MAX(d.volume) AS max_volume
FROM DailyPrice d
JOIN Company c ON c.company_id = d.company_id
GROUP BY c.ticker
ORDER BY avg_volume DESC;

-- ==================================
-- Query 5: Biggest single-day move
-- ==================================
SELECT c.ticker,
       d.trade_date,
       d.open_price,
       d.close_price,
       ROUND(ABS(d.close_price/d.open_price - 1)*100, 2) AS abs_intraday_move_pct
FROM DailyPrice d
JOIN Company c ON c.company_id = d.company_id
ORDER BY abs_intraday_move_pct DESC
LIMIT 10;