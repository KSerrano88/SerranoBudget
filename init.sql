-- Schema matching production database (PostgreSQL)

CREATE TABLE IF NOT EXISTS transactions (
    ID_TRANSACTIONS SERIAL PRIMARY KEY,
    TRANSACTION_DATE DATE,
    CHECK_NMBR VARCHAR(10),
    DESCRIPTION VARCHAR(100),
    NOTES VARCHAR(200),
    MULTI_PART_TRAN_TOTAL DECIMAL(10,2) DEFAULT 0.00,
    POSTED_FLAG SMALLINT DEFAULT 0,
    TRAN_TYPE VARCHAR(50),
    DEBIT DECIMAL(10,2) DEFAULT 0.00,
    CREDIT DECIMAL(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS balance_carryover (
    ID_CARRYOVER SERIAL PRIMARY KEY,
    ENTRY_DATE DATE,
    AMOUNT DECIMAL(10,2),
    IS_ACTIVE SMALLINT DEFAULT 0
);

-- Carryover balance
INSERT INTO balance_carryover (ENTRY_DATE, AMOUNT, IS_ACTIVE) VALUES ('2010-02-28', 168.18, 1);

-- ==========================================
-- Realistic seed data: Oct 2025 - Feb 2026
-- ==========================================

-- October 2025
INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, MULTI_PART_TRAN_TOTAL, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT) VALUES
('2025-10-01', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2025-10-01', '2010', 'Rent', 'October rent', 0, 1, 'Housing', 1450.00, 0.00),
('2025-10-03', '', 'Electric Bill', 'October power', 0, 1, 'Utilities', 95.00, 0.00),
('2025-10-05', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 132.50, 0.00),
('2025-10-07', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 48.00, 0.00),
('2025-10-10', '', 'Internet Bill', 'Monthly internet', 0, 1, 'Utilities', 65.00, 0.00),
('2025-10-12', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 118.75, 0.00),
('2025-10-15', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2025-10-15', '2011', 'Car Payment', 'Monthly auto loan', 0, 1, 'Auto', 385.00, 0.00),
('2025-10-18', '', 'Restaurant', 'Dinner out', 0, 1, 'Food', 62.00, 0.00),
('2025-10-20', '', 'Cell Phone', 'Monthly phone bill', 0, 1, 'Utilities', 75.00, 0.00),
('2025-10-22', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 45.00, 0.00),
('2025-10-25', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 145.00, 0.00),
('2025-10-28', '', 'Car Insurance', 'Monthly premium', 0, 1, 'Insurance', 128.00, 0.00),
('2025-10-30', '', 'Netflix', 'Streaming subscription', 0, 1, 'Entertainment', 15.99, 0.00);

-- November 2025
INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, MULTI_PART_TRAN_TOTAL, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT) VALUES
('2025-11-01', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2025-11-01', '2012', 'Rent', 'November rent', 0, 1, 'Housing', 1450.00, 0.00),
('2025-11-03', '', 'Water Bill', 'Quarterly water', 0, 1, 'Utilities', 85.00, 0.00),
('2025-11-05', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 128.00, 0.00),
('2025-11-07', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 52.00, 0.00),
('2025-11-10', '', 'Electric Bill', 'November power', 0, 1, 'Utilities', 110.00, 0.00),
('2025-11-12', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 135.00, 0.00),
('2025-11-15', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2025-11-15', '2013', 'Car Payment', 'Monthly auto loan', 0, 1, 'Auto', 385.00, 0.00),
('2025-11-18', '', 'Internet Bill', 'Monthly internet', 0, 1, 'Utilities', 65.00, 0.00),
('2025-11-20', '', 'Cell Phone', 'Monthly phone bill', 0, 1, 'Utilities', 75.00, 0.00),
('2025-11-22', '', 'Restaurant', 'Thanksgiving dinner', 0, 1, 'Food', 95.00, 0.00),
('2025-11-24', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 50.00, 0.00),
('2025-11-25', '', 'Grocery Store', 'Thanksgiving groceries', 0, 1, 'Food', 210.00, 0.00),
('2025-11-28', '', 'Car Insurance', 'Monthly premium', 0, 1, 'Insurance', 128.00, 0.00),
('2025-11-30', '', 'Netflix', 'Streaming subscription', 0, 1, 'Entertainment', 15.99, 0.00);

-- December 2025
INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, MULTI_PART_TRAN_TOTAL, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT) VALUES
('2025-12-01', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2025-12-01', '2014', 'Rent', 'December rent', 0, 1, 'Housing', 1450.00, 0.00),
('2025-12-03', '', 'Electric Bill', 'December power', 0, 1, 'Utilities', 125.00, 0.00),
('2025-12-05', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 140.00, 0.00),
('2025-12-08', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 47.00, 0.00),
('2025-12-10', '', 'Internet Bill', 'Monthly internet', 0, 1, 'Utilities', 65.00, 0.00),
('2025-12-12', '', 'Holiday Gifts', 'Christmas shopping', 0, 1, 'Shopping', 350.00, 0.00),
('2025-12-15', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2025-12-15', '2015', 'Car Payment', 'Monthly auto loan', 0, 1, 'Auto', 385.00, 0.00),
('2025-12-18', '', 'Cell Phone', 'Monthly phone bill', 0, 1, 'Utilities', 75.00, 0.00),
('2025-12-20', '', 'Grocery Store', 'Holiday groceries', 0, 1, 'Food', 225.00, 0.00),
('2025-12-22', '', 'Restaurant', 'Holiday dinner', 0, 1, 'Food', 85.00, 0.00),
('2025-12-24', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 50.00, 0.00),
('2025-12-28', '', 'Car Insurance', 'Monthly premium', 0, 1, 'Insurance', 128.00, 0.00),
('2025-12-30', '', 'Netflix', 'Streaming subscription', 0, 1, 'Entertainment', 15.99, 0.00),
('2025-12-31', '', 'Year-end Bonus', 'Annual bonus', 0, 1, 'Income', 0.00, 1500.00);

-- January 2026
INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, MULTI_PART_TRAN_TOTAL, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT) VALUES
('2026-01-01', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2026-01-01', '2016', 'Rent', 'January rent', 0, 1, 'Housing', 1450.00, 0.00),
('2026-01-04', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 125.00, 0.00),
('2026-01-06', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 46.00, 0.00),
('2026-01-08', '', 'Electric Bill', 'January power', 0, 1, 'Utilities', 130.00, 0.00),
('2026-01-10', '', 'Internet Bill', 'Monthly internet', 0, 1, 'Utilities', 65.00, 0.00),
('2026-01-12', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 118.00, 0.00),
('2026-01-15', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2026-01-15', '2017', 'Car Payment', 'Monthly auto loan', 0, 1, 'Auto', 385.00, 0.00),
('2026-01-18', '', 'Cell Phone', 'Monthly phone bill', 0, 1, 'Utilities', 75.00, 0.00),
('2026-01-20', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 130.00, 0.00),
('2026-01-22', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 49.00, 0.00),
('2026-01-25', '', 'Restaurant', 'Dinner out', 0, 1, 'Food', 55.00, 0.00),
('2026-01-28', '', 'Car Insurance', 'Monthly premium', 0, 1, 'Insurance', 128.00, 0.00),
('2026-01-30', '', 'Netflix', 'Streaming subscription', 0, 1, 'Entertainment', 15.99, 0.00);

-- February 2026 (current month - mix of posted and unposted)
INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, MULTI_PART_TRAN_TOTAL, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT) VALUES
('2026-02-01', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2026-02-01', '2018', 'Rent', 'February rent', 0, 1, 'Housing', 1450.00, 0.00),
('2026-02-03', '', 'Electric Bill', 'February power', 0, 1, 'Utilities', 105.00, 0.00),
('2026-02-05', '', 'Grocery Store', 'Weekly groceries', 0, 1, 'Food', 138.00, 0.00),
('2026-02-07', '', 'Gas Station', 'Fill up', 0, 1, 'Auto', 51.00, 0.00),
('2026-02-10', '', 'Internet Bill', 'Monthly internet', 0, 1, 'Utilities', 65.00, 0.00),
('2026-02-12', '', 'Grocery Store', 'Weekly groceries', 0, 0, 'Food', 122.00, 0.00),
('2026-02-14', '', 'Restaurant', 'Valentines dinner', 0, 0, 'Food', 120.00, 0.00),
('2026-02-15', '', 'Paycheck', 'Bi-weekly salary', 0, 1, 'Income', 0.00, 2800.00),
('2026-02-15', '2019', 'Car Payment', 'Monthly auto loan', 0, 1, 'Auto', 385.00, 0.00),
('2026-02-18', '', 'Cell Phone', 'Monthly phone bill', 0, 0, 'Utilities', 75.00, 0.00),
('2026-02-20', '', 'Grocery Store', 'Weekly groceries', 0, 0, 'Food', 115.00, 0.00),
('2026-02-22', '', 'Gas Station', 'Fill up', 0, 0, 'Auto', 48.00, 0.00),
('2026-02-24', '', 'Car Insurance', 'Monthly premium', 0, 0, 'Insurance', 128.00, 0.00),
('2026-02-25', '', 'Coffee Shop', 'Morning coffee', 0, 0, 'Food', 6.50, 0.00);
