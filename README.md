# 📊 Stock Market Analytics Dashboard (Power BI + SQL + DAX)

An end-to-end data analytics project that demonstrates database design, SQL analytics, and custom DAX measures to analyse historical stock performance of major US technology companies.

This project was built from scratch, covering the full workflow from raw data modelling to an interactive Power BI dashboard.

---

## 🔍 Project Overview

This dashboard analyses daily stock price data for large-cap technology companies over a five-year period, focusing on:

- Overall returns
- Price volatility
- Risk-adjusted performance
- Best and worst daily returns
- Long-term price trends

All metrics are calculated using custom SQL queries and hand-written DAX formulas.

---

## 📌 Data Source

Historical daily stock price data was obtained from Stooq (public market data).

---

## 🧱 Data & Architecture

### Dataset
- Daily OHLC price data and trading volume
- Companies analysed:
  - AAPL, AMZN, GOOGL, META, MSFT, NVDA, TSLA
- Date range: **2019 – 2023**

### Database Design (MySQL)
- Fully normalised relational schema
- One-to-many relationship between companies and daily prices

**Tables**
- `Company(company_id, ticker, company_name)`
- `DailyPrice(price_id, company_id, trade_date, open_price, high_price, low_price, close_price, volume)`

Key design decisions:
- Surrogate primary keys
- Unique constraint on `(company_id, trade_date)`
- Indexed foreign keys for efficient analytical queries
- Referential integrity enforced via foreign keys

---

## 📐 Analytics & Metrics

### SQL Analytics
Core financial metrics were first computed at the database layer using SQL, including:

- Overall percentage return per stock
- Daily return volatility using window functions
- Average closing prices
- Average trading volume
- Date range and record validation per company

### Custom DAX Measures (Power BI)
All dashboard KPIs were implemented using **custom-written DAX**, including:

- Overall Returns
- Volatility
- Return-to-Risk Ratio
- Best Day / Worst Day
- Time-series aggregations for closing prices

No auto-generated measures were used — all calculations were written manually to ensure correctness and transparency.

---

## 📊 Dashboards

### Web Dashboard (Node.js + SQL)
A lightweight web application built to provide programmatic and user-driven access
to the database. This dashboard focuses on:
- Parameterised SQL queries
- User-controlled filters (ticker, date range)
- Safe query execution
- Direct interaction with the relational data model

### Power BI Dashboard (DAX)
An analytical dashboard designed for high-level insight and comparison across stocks.
This dashboard focuses on:
- Custom DAX measures
- Financial KPIs (returns, volatility, risk-adjusted metrics)
- Visual comparison and trend analysis
- Decision-oriented presentation

Different dashboard implementations were intentionally built to demonstrate both programmatic data access and analytical visualisation.

---

## 🛠️ Tech Stack

- **Power BI** – Data visualisation & DAX analytics  
- **DAX** – Custom financial metrics and KPIs  
- **MySQL** – Relational database design and querying  
- **SQL** – Aggregations, window functions, analytics
- **Node.js + Express** – Backend integration (explore & query interface)

---

## 💡 Key Takeaways

- Designed and implemented a production-style relational database
- Wrote complex SQL queries using joins and window functions
- Built a Power BI dashboard entirely from scratch
- Implemented financial metrics using custom DAX
- Translated raw stock data into actionable insights

---



## 👤 Author

**Jaslyn Chan**  
BSc Computer Science (Goldsmith, University of London)  
Interested in data analytics, business intelligence, and data-driven decision making.
