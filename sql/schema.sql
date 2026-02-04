CREATE DATABASE IF NOT EXISTS cm3010_stock
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE cm3010_stock;

----- Company table -----
CREATE TABLE Company (
  company_id INT NOT NULL AUTO_INCREMENT,
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (company_id),
  UNIQUE KEY uq_company_ticker (ticker)
) ENGINE=InnoDB;

----- DailyPrice table -----
CREATE TABLE DailyPrice (
  price_id BIGINT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  trade_date DATE NOT NULL,
  open_price DECIMAL(12,6) NOT NULL,
  high_price DECIMAL(12,6) NOT NULL,
  low_price DECIMAL(12,6) NOT NULL,
  close_price DECIMAL(12,6) NOT NULL,
  volume BIGINT NOT NULL,
  PRIMARY KEY (price_id),
  UNIQUE KEY uq_company_date (company_id, trade_date),
  CONSTRAINT fk_dailyprice_company
    FOREIGN KEY (company_id)
    REFERENCES Company(company_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;


SHOW TABLES;
DESCRIBE DailyPrice;

