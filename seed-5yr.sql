-- Clear existing transactions and reseed with 5 years of data
TRUNCATE transactions RESTART IDENTITY;

-- ============================================================
-- 5 years of transactions: Jan 2021 - Mar 2026
-- 30+ transaction types, mostly debits
-- Credits: Paychecks (bi-weekly) and periodic transfers
-- ============================================================

DO $$
DECLARE
  cur_date DATE := '2021-01-01';
  end_date DATE := '2026-03-08';
  day_of_month INT;
  cur_month INT;
  cur_year INT;
  check_num INT := 1001;
  base_salary NUMERIC := 2650.00;
  salary NUMERIC;
  rent NUMERIC;
BEGIN

WHILE cur_date <= end_date LOOP
  cur_month := EXTRACT(MONTH FROM cur_date);
  cur_year := EXTRACT(YEAR FROM cur_date);
  day_of_month := EXTRACT(DAY FROM cur_date);

  -- Salary increases ~3% per year
  salary := ROUND((base_salary * POWER(1.03, cur_year - 2021))::numeric, 2);
  -- Rent increases over time
  rent := CASE
    WHEN cur_year <= 2021 THEN 1200
    WHEN cur_year = 2022 THEN 1275
    WHEN cur_year = 2023 THEN 1350
    WHEN cur_year = 2024 THEN 1400
    ELSE 1450
  END;

  -- ===== CREDITS =====

  -- Paycheck: 1st and 15th of each month
  IF day_of_month = 1 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'PAYCHECK - DIRECT DEPOSIT', 'Bi-weekly salary', 1, 'Income', 0, salary);
  END IF;
  IF day_of_month = 15 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'PAYCHECK - DIRECT DEPOSIT', 'Bi-weekly salary', 1, 'Income', 0, salary);
  END IF;

  -- Savings transfer in: quarterly (Mar, Jun, Sep, Dec) on the 20th
  IF day_of_month = 20 AND cur_month IN (3, 6, 9, 12) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'TRANSFER FROM SAVINGS', 'Quarterly savings transfer', 1, 'Transfer', 0, ROUND(500 + random()::numeric * 300, 2));
  END IF;

  -- Venmo/Zelle income: random months, around the 10th
  IF day_of_month = 10 AND random() < 0.3 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'VENMO TRANSFER', 'Reimbursement from friend', 1, 'Transfer', 0, ROUND(20 + random()::numeric * 150, 2));
  END IF;

  -- ===== DEBITS =====

  -- Rent: 1st of month
  IF day_of_month = 1 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, check_num::TEXT, 'RENT PAYMENT', cur_month || '/' || cur_year || ' rent', 1, 'Housing', rent, 0);
    check_num := check_num + 1;
  END IF;

  -- Electric: 3rd of month
  IF day_of_month = 3 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'ELECTRIC COMPANY', 'Monthly electric bill', 1, 'Utilities',
      CASE WHEN cur_month IN (6,7,8) THEN ROUND(140 + random()::numeric*40, 2)
           WHEN cur_month IN (12,1,2) THEN ROUND(120 + random()::numeric*30, 2)
           ELSE ROUND(80 + random()::numeric*30, 2) END, 0);
  END IF;

  -- Water: 5th, every other month
  IF day_of_month = 5 AND cur_month IN (1,3,5,7,9,11) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'WATER DEPARTMENT', 'Bi-monthly water bill', 1, 'Utilities', ROUND(55 + random()::numeric*25, 2), 0);
  END IF;

  -- Internet: 8th
  IF day_of_month = 8 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'INTERNET PROVIDER', 'Monthly internet', 1, 'Utilities', 65.00, 0);
  END IF;

  -- Cell phone: 12th
  IF day_of_month = 12 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'CELL PHONE BILL', 'Monthly phone bill', 1, 'Telecom', 75.00, 0);
  END IF;

  -- Car payment: 15th
  IF day_of_month = 15 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, check_num::TEXT, 'AUTO LOAN PAYMENT', 'Monthly car payment', 1, 'Auto Loan', 385.00, 0);
    check_num := check_num + 1;
  END IF;

  -- Car insurance: 18th
  IF day_of_month = 18 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'AUTO INSURANCE', 'Monthly premium', 1, 'Auto Insurance', 128.00, 0);
  END IF;

  -- Gas: twice a month (6th and 22nd)
  IF day_of_month = 6 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'SHELL GAS STATION', 'Fill up', 1, 'Gas', ROUND(38 + random()::numeric*20, 2), 0);
  END IF;
  IF day_of_month = 22 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'EXXON GAS STATION', 'Fill up', 1, 'Gas', ROUND(38 + random()::numeric*20, 2), 0);
  END IF;

  -- Groceries: weekly (every ~7 days)
  IF day_of_month IN (4, 11, 19, 26) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE (day_of_month % 3)
        WHEN 0 THEN 'KROGER'
        WHEN 1 THEN 'WALMART GROCERY'
        ELSE 'ALDI'
      END,
      'Weekly groceries', 1, 'Groceries', ROUND(85 + random()::numeric*80, 2), 0);
  END IF;

  -- Restaurant/dining: ~3x per month
  IF day_of_month IN (7, 17, 27) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE (cur_month % 5)
        WHEN 0 THEN 'CHIPOTLE'
        WHEN 1 THEN 'OLIVE GARDEN'
        WHEN 2 THEN 'MCDONALDS'
        WHEN 3 THEN 'CHILIS'
        ELSE 'PANERA BREAD'
      END,
      'Dining out', 1, 'Dining', ROUND(15 + random()::numeric*60, 2), 0);
  END IF;

  -- Coffee: ~4x per month
  IF day_of_month IN (2, 9, 16, 23) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'STARBUCKS', 'Coffee', 1, 'Coffee', ROUND(4.50 + random()::numeric*4, 2), 0);
  END IF;

  -- Netflix: 1st
  IF day_of_month = 1 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'NETFLIX', 'Monthly subscription', 1, 'Streaming', 15.99, 0);
  END IF;

  -- Spotify: 5th
  IF day_of_month = 5 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'SPOTIFY', 'Monthly subscription', 1, 'Streaming', 10.99, 0);
  END IF;

  -- Gym: 1st
  IF day_of_month = 1 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'PLANET FITNESS', 'Monthly membership', 1, 'Fitness', 25.00, 0);
  END IF;

  -- Amazon: ~2x per month
  IF day_of_month IN (10, 24) AND random() < 0.7 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'AMAZON.COM', 'Online purchase', 1, 'Shopping', ROUND(15 + random()::numeric*120, 2), 0);
  END IF;

  -- Target: once a month
  IF day_of_month = 14 AND random() < 0.6 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'TARGET', 'Household items', 1, 'Shopping', ROUND(25 + random()::numeric*80, 2), 0);
  END IF;

  -- Clothing: occasional
  IF day_of_month = 20 AND random() < 0.25 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'OLD NAVY' ELSE 'TJ MAXX' END,
      'Clothing purchase', 1, 'Clothing', ROUND(30 + random()::numeric*100, 2), 0);
  END IF;

  -- Medical: occasional
  IF day_of_month = 13 AND random() < 0.2 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'DR SMITH OFFICE' ELSE 'CVS PHARMACY' END,
      'Medical expense', 1, 'Medical', ROUND(25 + random()::numeric*200, 2), 0);
  END IF;

  -- Dental: twice a year
  IF day_of_month = 15 AND cur_month IN (4, 10) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'DENTAL ASSOCIATES', 'Dental cleaning', 1, 'Dental', ROUND(80 + random()::numeric*60, 2), 0);
  END IF;

  -- Vision: once a year
  IF day_of_month = 10 AND cur_month = 6 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'VISION CENTER', 'Annual eye exam', 1, 'Vision', ROUND(150 + random()::numeric*100, 2), 0);
  END IF;

  -- Health insurance: monthly on 1st
  IF day_of_month = 1 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'HEALTH INSURANCE PREMIUM', 'Monthly health insurance', 1, 'Health Insurance', 245.00, 0);
  END IF;

  -- Haircut: monthly
  IF day_of_month = 25 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'BARBER SHOP', 'Haircut', 1, 'Personal Care', 25.00, 0);
  END IF;

  -- Laundry/dry cleaning: bi-weekly
  IF day_of_month IN (8, 22) AND random() < 0.5 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'DRY CLEANERS', 'Dry cleaning', 1, 'Laundry', ROUND(12 + random()::numeric*20, 2), 0);
  END IF;

  -- Pet expenses: monthly
  IF day_of_month = 16 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.7 THEN 'PETCO' ELSE 'VET CLINIC' END,
      'Pet supplies/vet', 1, 'Pet Care', ROUND(30 + random()::numeric*60, 2), 0);
  END IF;

  -- Parking: occasional
  IF day_of_month IN (3, 13, 23) AND random() < 0.3 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'PARKING GARAGE', 'Parking fee', 1, 'Parking', ROUND(5 + random()::numeric*15, 2), 0);
  END IF;

  -- Tolls: occasional
  IF day_of_month IN (7, 21) AND random() < 0.25 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'EZ PASS', 'Toll charges', 1, 'Tolls', ROUND(3 + random()::numeric*12, 2), 0);
  END IF;

  -- Car maintenance: quarterly-ish
  IF day_of_month = 15 AND cur_month IN (2, 5, 8, 11) AND random() < 0.7 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'JIFFY LUBE', 'Oil change / maintenance', 1, 'Auto Maintenance', ROUND(40 + random()::numeric*80, 2), 0);
  END IF;

  -- Home maintenance: occasional
  IF day_of_month = 20 AND random() < 0.15 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'HOME DEPOT' ELSE 'LOWES' END,
      'Home repair/maintenance', 1, 'Home Maintenance', ROUND(30 + random()::numeric*150, 2), 0);
  END IF;

  -- Subscriptions: various
  IF day_of_month = 10 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'AMAZON PRIME', 'Annual membership / monthly', 1, 'Subscriptions', 14.99, 0);
  END IF;

  -- Education/books: occasional
  IF day_of_month = 28 AND random() < 0.2 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'UDEMY' ELSE 'BARNES AND NOBLE' END,
      'Books/courses', 1, 'Education', ROUND(10 + random()::numeric*50, 2), 0);
  END IF;

  -- Charity/donations: occasional
  IF day_of_month = 25 AND random() < 0.15 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'CHARITABLE DONATION', 'Donation', 1, 'Charity', ROUND(25 + random()::numeric*75, 2), 0);
  END IF;

  -- Entertainment (movies, events): occasional
  IF day_of_month IN (11, 28) AND random() < 0.35 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'AMC THEATERS' ELSE 'TICKETMASTER' END,
      'Entertainment', 1, 'Entertainment', ROUND(12 + random()::numeric*80, 2), 0);
  END IF;

  -- Alcohol/bars: occasional
  IF day_of_month IN (9, 23) AND random() < 0.3 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'TOTAL WINE' ELSE 'LOCAL BAR' END,
      'Drinks', 1, 'Alcohol', ROUND(15 + random()::numeric*50, 2), 0);
  END IF;

  -- Travel: a few times per year
  IF day_of_month = 5 AND cur_month IN (3, 7, 11) AND random() < 0.6 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'AIRLINE TICKET', 'Travel booking', 1, 'Travel', ROUND(200 + random()::numeric*400, 2), 0);
  END IF;
  IF day_of_month = 6 AND cur_month IN (3, 7, 11) AND random() < 0.5 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'HOTEL BOOKING', 'Hotel stay', 1, 'Travel', ROUND(150 + random()::numeric*300, 2), 0);
  END IF;

  -- Gifts: holiday months and birthdays
  IF day_of_month = 15 AND cur_month IN (2, 5, 12) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'GIFT PURCHASE', 'Gift for occasion', 1, 'Gifts', ROUND(30 + random()::numeric*120, 2), 0);
  END IF;

  -- Lawn care: spring/summer months
  IF day_of_month = 1 AND cur_month IN (4, 5, 6, 7, 8, 9) THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'LAWN SERVICE', 'Monthly lawn care', 1, 'Lawn Care', 45.00, 0);
  END IF;

  -- Rideshare: occasional
  IF day_of_month IN (14, 28) AND random() < 0.2 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '',
      CASE WHEN random() < 0.5 THEN 'UBER' ELSE 'LYFT' END,
      'Rideshare', 1, 'Transportation', ROUND(10 + random()::numeric*30, 2), 0);
  END IF;

  -- Savings transfer out: monthly on 2nd
  IF day_of_month = 2 THEN
    INSERT INTO transactions (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES (cur_date, '', 'TRANSFER TO SAVINGS', 'Monthly savings', 1, 'Savings', ROUND(200 + random()::numeric*100, 2), 0);
  END IF;

  cur_date := cur_date + 1;
END LOOP;

-- Mark recent transactions as unposted (last 2 weeks)
UPDATE transactions SET POSTED_FLAG = 0
WHERE TRANSACTION_DATE >= CURRENT_DATE - INTERVAL '14 days';

END $$;
