# LedgeWise - Test Cases Document

## Module 1: Authentication

### TC-1.1: User Signup
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Signup with valid credentials | Enter unique username & password, submit | Account created, redirected to dashboard | Critical |
| 2 | Signup with existing username | Enter a username that already exists | Error message shown, no duplicate created | Critical |
| 3 | Signup with empty fields | Leave username or password blank | Validation error, form not submitted | High |
| 4 | Signup with very long username | Enter 256+ character username | Graceful error or truncation | Low |

### TC-1.2: User Login
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Login with valid credentials | Enter correct username & password | Redirected to dashboard | Critical |
| 2 | Login with wrong password | Enter valid username, wrong password | Error message, no access | Critical |
| 3 | Login with non-existent user | Enter username that doesn't exist | Error message, no access | Critical |
| 4 | Session persistence | Login, close tab, reopen app | User stays logged in | High |
| 5 | Logout | Click sign out in sidebar | Session ended, redirected to login | High |

### TC-1.3: Authorization
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Access dashboard without login | Navigate to `/` without session | Redirected to login page | Critical |
| 2 | Access other user's data | Login as User A, try to access User B's account/party | Data not accessible, 404 or error | Critical |
| 3 | API route protection | Call server actions without valid session | Unauthorized error returned | Critical |

---

## Module 2: Accounts

### TC-2.1: Create Account
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Create CASH account | Enter name, select type CASH, optional balance | Account created, appears in list | Critical |
| 2 | Create BANK account | Enter name, select type BANK | Account created with correct type | Critical |
| 3 | Create LOAN_GIVEN account | Enter name, select type LOAN_GIVEN | Account created | High |
| 4 | Create LOAN_TAKEN account | Enter name, select type LOAN_TAKEN | Account created | High |
| 5 | Create with initial balance | Enter name, type, set opening balance to 5000 | Account shows balance of 5000 | High |
| 6 | Create with zero balance | Enter name, type, leave balance as 0 | Account created with 0 balance | Medium |
| 7 | Create with empty name | Leave name blank, submit | Validation error | High |
| 8 | Create duplicate name | Create two accounts with same name | Either blocked or both created (verify expected behavior) | Medium |

### TC-2.2: Edit Account
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Edit account name | Change name from "Cash" to "Main Cash" | Name updated in list and ledger | High |
| 2 | Edit account type | Change type from CASH to BANK | Type updated correctly | Medium |
| 3 | Edit account description | Add/change description | Description saved and displayed | Low |

### TC-2.3: Delete Account
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Delete account with no transactions | Delete an unused account | Account soft-deleted, not visible in list | High |
| 2 | Delete account with transactions | Try to delete account that has transactions | Error: cannot delete, has transactions | Critical |
| 3 | Deleted account not in dropdowns | Delete account, go to Quick Entry | Account not available in account dropdown | High |

### TC-2.4: Account Ledger
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | View ledger with transactions | Click account with transactions | Shows transaction table with Debit/Credit columns | Critical |
| 2 | Running balance calculation | View ledger with multiple transactions | Running balance updates correctly row by row | Critical |
| 3 | Debit column shows OUT | Make a Payment transaction | Amount appears in Debit column | High |
| 4 | Credit column shows IN | Make a Receipt transaction | Amount appears in Credit column | High |
| 5 | View empty ledger | Click account with no transactions | Empty state message, no errors | Medium |
| 6 | Edit transaction from ledger | Click edit icon on a transaction row | Navigates to edit page with pre-filled data | High |
| 7 | Delete transaction from ledger | Click delete icon, confirm | Transaction removed, balance recalculated | Critical |

### TC-2.5: Balance Adjustment
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Increase balance | Open adjust dialog, enter positive amount | Balance increased, adjustment transaction created (type IN) | Critical |
| 2 | Decrease balance | Open adjust dialog, enter negative amount | Balance decreased, adjustment transaction created (type OUT) | Critical |
| 3 | Adjustment appears in ledger | Adjust balance, view ledger | Adjustment transaction visible with description | High |
| 4 | Adjust to zero | Set adjustment to make balance exactly 0 | Balance shows 0 | Medium |

---

## Module 3: Parties

### TC-3.1: Create Party
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Create CUSTOMER party | Enter name, select CUSTOMER type | Party created, visible in list | Critical |
| 2 | Create VENDOR party | Enter name, select VENDOR type | Party created | Critical |
| 3 | Create LENDER party | Enter name, select LENDER | Party created | High |
| 4 | Create BORROWER party | Enter name, select BORROWER | Party created | High |
| 5 | Create with phone number | Enter name + phone | Party saved with phone | Medium |
| 6 | Create with address | Enter name + full address | Address saved and displayed | Medium |
| 7 | Create with state (for GST) | Enter name + state "Telangana" | State saved, enables GST for this party | High |
| 8 | Create with GST number | Enter name + state + GST number | GST number saved | Medium |
| 9 | Create with notes | Enter name + notes | Notes saved and visible on party page | Low |
| 10 | Create with empty name | Leave name blank | Validation error | High |

### TC-3.2: Edit Party
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Edit party name | Change party name | Updated everywhere (ledger, dropdowns) | High |
| 2 | Add state to existing party | Edit party, add state | GST now available for this party's transactions | High |
| 3 | Change party type | Switch from CUSTOMER to VENDOR | Type updated | Medium |

### TC-3.3: Delete Party
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Delete party with no transactions | Delete unused party | Soft-deleted, not visible | High |
| 2 | Delete party with transactions | Try to delete party with transactions | Error: cannot delete | Critical |

### TC-3.4: Party Ledger (Khata)
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | View party ledger | Click a party with transactions | Ledger table with Debit/Credit/Balance columns | Critical |
| 2 | Running balance with Dr/Cr | View ledger with mixed IN/OUT | Balance shows correct Dr/Cr suffix | Critical |
| 3 | Only CREDIT transactions affect balance | Make CASH and CREDIT transactions for same party | Only CREDIT ones appear in party balance | Critical |
| 4 | Payment mode indicator | View ledger | Each row shows Cash or Udhar tag | Medium |
| 5 | Party contact info displayed | View party with phone & address | Contact info shown in header | Low |

### TC-3.5: Party Balance Adjustment
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Increase party balance | Adjust balance upward | CREDIT IN transaction created, balance reflects change | Critical |
| 2 | Decrease party balance | Adjust balance downward | CREDIT OUT transaction created | Critical |
| 3 | Adjustment uses default account | Adjust party balance | Transaction linked to default CASH account | High |

---

## Module 4: Quick Entry (Transaction Creation)

### TC-4.1: Voucher Type Selection
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Select Receipt | Click Receipt button | Type=IN, PaymentMode=CASH, green highlight | Critical |
| 2 | Select Payment | Click Payment button | Type=OUT, PaymentMode=CASH, red highlight | Critical |
| 3 | Select Sales | Click Sales button | Type=IN, PaymentMode=CREDIT | Critical |
| 4 | Select Purchase | Click Purchase button | Type=OUT, PaymentMode=CREDIT | Critical |
| 5 | Select Contra | Click Contra button | Type=TRANSFER, blue highlight, "To Account" field appears | Critical |
| 6 | Switch between types | Select Receipt, then switch to Payment | Form resets correctly, fields update | High |
| 7 | Helper text displayed | Select each type | Correct description shown (e.g., "Receipt: Cash/Bank received") | Low |

### TC-4.2: Basic Transaction Entry
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Create Receipt (cash in) | Select Receipt, pick account, enter amount 1000, submit | Transaction created, account balance +1000 | Critical |
| 2 | Create Payment (cash out) | Select Payment, pick account, enter amount 500, submit | Transaction created, account balance -500 | Critical |
| 3 | Create Sales (credit in) | Select Sales, pick account, pick party, enter amount 2000 | Transaction created, party balance +2000, account unchanged | Critical |
| 4 | Create Purchase (credit out) | Select Purchase, pick account, pick party, enter amount 1500 | Transaction created, party balance -1500, account unchanged | Critical |
| 5 | Create Contra (transfer) | Select Contra, pick source & destination accounts, enter amount | Source -amount, destination +amount | Critical |
| 6 | Submit with no amount | Leave amount blank or 0 | Validation error, not submitted | High |
| 7 | Submit with no account | Don't select an account | Validation error | High |
| 8 | Submit CREDIT without party | Select Sales/Purchase, no party selected | Validation error or warning | High |
| 9 | Large amount transaction | Enter amount 99,99,999 | Transaction created, balances correct | Medium |
| 10 | Decimal amount | Enter amount 1234.56 | Amount stored and displayed with decimals | Medium |

### TC-4.3: Payment Mode Toggle
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Receipt defaults to CASH | Select Receipt | Payment mode shows CASH | High |
| 2 | Sales defaults to CREDIT | Select Sales | Payment mode shows CREDIT | High |
| 3 | Toggle Receipt to CREDIT | Select Receipt, switch to CREDIT | Mode changes, party field becomes relevant | High |
| 4 | Toggle Sales to CASH | Select Sales, switch to CASH | Mode changes, account balance will be affected | High |
| 5 | CASH mode doesn't affect party balance | Make CASH IN with party | Party's totalDue unchanged | Critical |
| 6 | CREDIT mode doesn't affect account balance | Make CREDIT transaction | Account balance unchanged | Critical |

### TC-4.4: Date and Time
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Default date is today | Open Quick Entry | Date field shows today's date | Medium |
| 2 | Set past date | Change date to last week | Transaction saved with past date | High |
| 3 | Set future date | Change date to next week | Transaction saved with future date (or blocked if not allowed) | Medium |

### TC-4.5: Category and Description
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Select category | Choose a category from dropdown | Category saved with transaction | Medium |
| 2 | Add description | Type a note in description field | Description saved, visible in ledger | Medium |
| 3 | No category | Leave category blank | Transaction created without category | Low |

### TC-4.6: Ledger Type
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Default ledger type | Create transaction | Check default (OFFICIAL or PARALLEL) | Medium |
| 2 | Set as OFFICIAL | Mark transaction as OFFICIAL | Visible in Tally export | High |
| 3 | Set as PARALLEL | Mark transaction as PARALLEL | Not visible in OFFICIAL Tally filter | High |

### TC-4.7: Party Quick-Add
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Add party inline | Click add party button in form, enter name | New party created and auto-selected | High |
| 2 | Quick-add with type | Add party with CUSTOMER type | Party created with correct type | Medium |

---

## Module 5: Stock Transactions

### TC-5.1: Stock Purchase (via Quick Entry)
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Purchase stock with quantity | Select Purchase, pick stock, enter qty=10 quintals, price=5000/quintal | Stock qty increased by 1000 KG, amount auto-calculated to 50,000 | Critical |
| 2 | Weighted average cost update | Stock has 500 KG at Rs 40/KG. Purchase 500 KG at Rs 60/KG | New avg cost = (500×40 + 500×60) / 1000 = Rs 50/KG | Critical |
| 3 | Unit conversion (Quintal to KG) | Enter qty in quintals | Stored as KG internally (×100) | Critical |
| 4 | Amount auto-calculation | Enter qty=5 quintals, price=4000/quintal | Amount field auto-fills to 20,000 | High |
| 5 | Stock dropdown shows available stocks | Open Quick Entry, enable stock | All active stocks visible in dropdown | Medium |

### TC-5.2: Stock Sale (via Quick Entry)
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Sell stock | Select Sales/Receipt with stock, qty=5 quintals | Stock qty decreased by 500 KG | Critical |
| 2 | Avg cost unchanged after sale | Sell some stock | avgCostPerKg remains the same | Critical |
| 3 | Sell more than available | Try to sell 100 quintals when only 50 available | Error or warning about insufficient stock | High |

### TC-5.3: Stock Management
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Create stock item | Enter name, commodity type, initial qty, unit | Stock created, visible in list | Critical |
| 2 | Edit stock item | Change name or location | Updated in list and dropdown | High |
| 3 | Delete stock with no movements | Delete unused stock | Soft-deleted | High |
| 4 | Delete stock with movements | Try to delete stock that has transactions | Error: cannot delete | Critical |
| 5 | View stock detail page | Click stock item | Shows qty in quintals, avg cost, total value | High |
| 6 | Stock movement history | View stock with transactions | Table shows Purchase/Sale/Adjustment with In/Out columns | High |
| 7 | Running balance in stock ledger | View movement history | Running balance in quintals, calculated correctly | High |

### TC-5.4: Stock Adjustment
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Increase stock quantity | Adjust qty upward | IN adjustment transaction created, qty increased | High |
| 2 | Decrease stock quantity | Adjust qty downward | OUT adjustment transaction created, qty decreased | High |
| 3 | Adjustment linked to default account | Perform adjustment | Transaction linked to CASH account | Medium |

---

## Module 6: GST Calculations

### TC-6.1: Intra-State GST (Same State - Telangana)
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Purchase with GST (intra-state) | Purchase from party in Telangana, amount=10,000, enable GST | CGST 2.5% = 250, SGST 2.5% = 250, Total = 10,500 | Critical |
| 2 | Sale with GST (intra-state) | Sell to party in Telangana, amount=20,000, enable GST | CGST = 500, SGST = 500, Total = 21,000 | Critical |
| 3 | GST posted to correct accounts | Purchase with GST intra-state | CGST Input & SGST Input accounts get separate transactions | Critical |
| 4 | Sale GST to payable accounts | Sale with GST | CGST Output & SGST Output accounts debited | Critical |

### TC-6.2: Inter-State GST (Different State)
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Purchase with IGST | Purchase from party in Maharashtra, amount=10,000 | IGST 5% = 500, Total = 10,500 | Critical |
| 2 | Sale with IGST | Sell to party in Karnataka, amount=20,000 | IGST = 1000, Total = 21,000 | Critical |
| 3 | IGST posted correctly | Inter-state purchase | IGST Input account gets transaction | Critical |

### TC-6.3: GST Edge Cases
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | No GST without party state | Create transaction with party that has no state set | GST toggle not available or disabled | High |
| 2 | GST on zero amount | Enable GST with amount = 0 | GST = 0, no error | Medium |
| 3 | GST on large amount | Amount = 10,00,000 with GST | Correct calculation: 50,000 GST | Medium |
| 4 | GST on decimal amount | Amount = 1234.56 with GST | GST calculated correctly with decimals | Medium |
| 5 | GST accounts auto-created | First GST transaction when no GST accounts exist | CGST/SGST/IGST accounts created automatically | Critical |
| 6 | GST description in transaction | Create GST transaction | Description includes GST breakdown | Medium |

---

## Module 7: Transaction Edit & Delete

### TC-7.1: Edit Transaction
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Edit amount | Change amount from 1000 to 1500 | Old balance reversed, new balance applied | Critical |
| 2 | Edit account | Change from Cash to Bank | Old account balance reversed, new account updated | Critical |
| 3 | Edit party | Change party on CREDIT transaction | Old party balance reversed, new party updated | Critical |
| 4 | Edit stock quantity | Change stock qty from 10 to 15 quintals | Old stock qty reversed, new qty applied, avg cost recalculated | Critical |
| 5 | Edit voucher type | Change from Receipt to Payment | Transaction type and balances recalculated | High |
| 6 | Edit date | Change transaction date | Date updated, ledger order may change | Medium |
| 7 | Pre-filled form | Open edit page | All original values pre-populated correctly | High |

### TC-7.2: Delete Transaction
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Delete basic transaction | Delete a Receipt of 1000 | Account balance reversed by -1000 | Critical |
| 2 | Delete CREDIT transaction | Delete a Sales (credit) of 2000 | Party balance reversed by -2000 | Critical |
| 3 | Delete stock transaction | Delete a stock purchase | Stock quantity reversed, avg cost recalculated | Critical |
| 4 | Delete GST transaction | Delete a transaction that had GST | GST account balances also reversed | Critical |
| 5 | Delete transfer (Contra) | Delete a transfer transaction | Both source and destination balances reversed | Critical |
| 6 | Confirmation dialog | Click delete | Confirmation dialog appears before deletion | High |
| 7 | Soft delete verification | Delete transaction, check database | isDeleted = true, data still exists | Medium |

---

## Module 8: Dashboard

### TC-8.1: Account Summary
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Cash balance displayed | View dashboard | Total cash account balance shown | Critical |
| 2 | Bank balance displayed | View dashboard | Total bank balance shown | Critical |
| 3 | Loan Given displayed | View dashboard | Outstanding loans given shown | High |
| 4 | Loan Taken displayed | View dashboard | Outstanding loans taken shown | High |
| 5 | Balance updates after transaction | Create a receipt, return to dashboard | Cash balance reflects new transaction | Critical |

### TC-8.2: Debtors & Creditors
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Debtors list | View dashboard | Parties with positive balance (they owe us) listed | Critical |
| 2 | Creditors list | View dashboard | Parties with negative balance (we owe them) listed | Critical |
| 3 | Debtor amount correct | Check debtor entry | Amount matches sum of CREDIT transactions for that party | Critical |
| 4 | Party with zero balance | Party has equal IN and OUT credits | Not shown in debtors or creditors | Medium |
| 5 | Click debtor/creditor | Click a party name | Navigates to party ledger (Khata) | High |

### TC-8.3: Stock Summary
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Stock quantity in quintals | View dashboard stock section | Quantity displayed in quintals (not KG) | High |
| 2 | Stock value correct | View stock summary | Value = qty × avg cost | High |
| 3 | Click stock item | Click a stock in summary | Navigates to stock detail page | Medium |

---

## Module 9: Day Book

### TC-9.1: Day Book Display
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Default date range | Open day book | Shows today's transactions (or sensible default) | High |
| 2 | Custom date range | Set start and end dates | Only transactions within range shown | Critical |
| 3 | Opening balance | Set date range starting mid-month | Opening balance = sum of all transactions before start date | Critical |
| 4 | Daily summaries | View day book with multiple days | Each day shows opening, inflow, outflow, net change, closing | Critical |
| 5 | Closing balance = opening + net | Verify any day's numbers | Closing = Opening + Inflow - Outflow | Critical |
| 6 | Running balance across days | View multi-day range | Day 2 opening = Day 1 closing | Critical |

### TC-9.2: Day Book Filters
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Filter by account | Select a specific account | Only that account's transactions shown | High |
| 2 | Filter all accounts | Select "All accounts" | All transactions shown | High |
| 3 | Empty date range | Select range with no transactions | Shows opening/closing balance, no transactions | Medium |

---

## Module 10: Tally Export

### TC-10.1: Tally Filters
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Filter OFFICIAL only | Select OFFICIAL ledger type | Only OFFICIAL transactions shown | Critical |
| 2 | Filter PARALLEL only | Select PARALLEL ledger type | Only PARALLEL transactions shown | Critical |
| 3 | Filter by reconciliation | Filter unreconciled only | Pending Tally entries shown | High |
| 4 | Date range filter | Set date range | Only transactions within range | High |
| 5 | Pending Tally count | View Tally page | Count of unreconciled OFFICIAL transactions displayed | Medium |

---

## Module 11: Navigation & UI

### TC-11.1: Sidebar Navigation
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Navigate to each page | Click each sidebar link | Correct page loads, active state highlighted | High |
| 2 | Current page highlighted | Navigate to Accounts | Accounts link highlighted in sidebar | Medium |
| 3 | User info displayed | View sidebar | Username/email shown | Low |
| 4 | Sign out button | Click sign out | Session ended, redirected to login | High |

### TC-11.2: Responsive Design
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Mobile view | Resize to 375px width | Layout adapts, content readable | High |
| 2 | Tablet view | Resize to 768px width | Layout adapts appropriately | Medium |
| 3 | Desktop view | Full screen | Sidebar visible, content well spaced | Medium |

### TC-11.3: Account & Stock Cards
| # | Test Case | Steps | Expected Result | Severity |
|---|-----------|-------|-----------------|----------|
| 1 | Account card clickable | Click an account card on accounts page | Navigates to account ledger | High |
| 2 | Stock card clickable | Click a stock card on stock page | Navigates to stock detail page | High |

---

## Module 12: Complex / End-to-End Scenarios

### TC-12.1: Full Purchase Cycle
| Steps | Expected Result |
|-------|-----------------|
| 1. Create a CUSTOMER party (state: Maharashtra) | Party created |
| 2. Create a CASH account with balance 1,00,000 | Account with 1L balance |
| 3. Create a stock item "Turmeric Finger" (0 qty) | Stock created |
| 4. Quick Entry: Purchase, Cash, Stock=Turmeric Finger, Qty=50 quintals, Price=5000/quintal, Party=customer, Enable GST | Transaction created |
| 5. Verify: Amount = 2,50,000 | Correct base amount |
| 6. Verify: IGST = 12,500 (inter-state, 5%) | Correct GST |
| 7. Verify: Total = 2,62,500 | Correct total |
| 8. Verify: Cash account balance = 1,00,000 - 2,62,500 = -1,62,500 | Account balance updated |
| 9. Verify: Stock qty = 5000 KG (50 quintals) | Stock quantity updated |
| 10. Verify: Stock avg cost = 5000/quintal = 50/KG | Avg cost set |
| 11. Verify: IGST Input account balance = 12,500 | GST account updated |

### TC-12.2: Full Sales Cycle with Credit
| Steps | Expected Result |
|-------|-----------------|
| 1. Create VENDOR party (state: Telangana) | Party created |
| 2. Quick Entry: Sales (Credit/Udhar), Stock=Turmeric Finger, Qty=20 quintals, Price=6000/quintal, Party=vendor, Enable GST | Transaction created |
| 3. Verify: Amount = 1,20,000 | Correct base amount |
| 4. Verify: CGST = 3,000, SGST = 3,000 (intra-state) | Correct split GST |
| 5. Verify: Total = 1,26,000 | Correct total |
| 6. Verify: Account balance unchanged (CREDIT mode) | No account impact |
| 7. Verify: Party balance = +1,26,000 (Debtor/Dr) | Party owes us |
| 8. Verify: Stock qty decreased by 2000 KG | Stock reduced |
| 9. Verify: CGST Output = 3,000, SGST Output = 3,000 | GST payable updated |

### TC-12.3: Credit Settlement
| Steps | Expected Result |
|-------|-----------------|
| 1. Party has balance of +1,26,000 (Dr - they owe us) | Starting state |
| 2. Quick Entry: Receipt, Cash, Amount=1,26,000, Party=vendor | Cash received |
| 3. Verify: Cash account balance +1,26,000 | Cash increased |
| 4. Verify: Party balance unchanged (CASH mode doesn't affect party) | Party still Dr |
| **Note**: CASH receipt settles the physical cash but party CREDIT balance is tracked separately via CREDIT transactions only | |

### TC-12.4: Contra (Bank to Cash Transfer)
| Steps | Expected Result |
|-------|-----------------|
| 1. Cash account = 50,000, Bank account = 2,00,000 | Starting balances |
| 2. Quick Entry: Contra, From=Bank, To=Cash, Amount=30,000 | Transfer created |
| 3. Verify: Bank balance = 1,70,000 | Bank decreased |
| 4. Verify: Cash balance = 80,000 | Cash increased |
| 5. Verify: Transaction shows as TRANSFER type | Correct type |

### TC-12.5: Edit and Reversal Accuracy
| Steps | Expected Result |
|-------|-----------------|
| 1. Create Receipt: Cash account, Amount=10,000 | Cash = +10,000 |
| 2. Edit transaction: Change amount to 15,000 | Cash = +15,000 (not +25,000) |
| 3. Verify: Original 10,000 was reversed, then 15,000 applied | Net effect correct |
| 4. Edit again: Change account from Cash to Bank | Cash = 0, Bank = +15,000 |
| 5. Delete the transaction | Bank = 0 (reversed) |

### TC-12.6: Stock Weighted Average Cost
| Steps | Expected Result |
|-------|-----------------|
| 1. Purchase 100 KG at Rs 40/KG | Qty=100, Avg=40 |
| 2. Purchase 100 KG at Rs 60/KG | Qty=200, Avg=(100×40+100×60)/200 = 50 |
| 3. Sell 50 KG | Qty=150, Avg=50 (unchanged) |
| 4. Purchase 50 KG at Rs 80/KG | Qty=200, Avg=(150×50+50×80)/200 = 57.50 |
| 5. Verify stock detail page shows correct values | All values match |

### TC-12.7: Day Book Integrity
| Steps | Expected Result |
|-------|-----------------|
| 1. Record opening balance: Cash = 50,000 | Starting state |
| 2. Day 1: Receipt 10,000, Payment 5,000 | Net +5,000 |
| 3. Day 2: Receipt 20,000, Payment 8,000 | Net +12,000 |
| 4. Open Day Book for both days | Day 1: Open=50K, Close=55K. Day 2: Open=55K, Close=67K |
| 5. Change filter to specific account | Only that account's transactions, opening balance recalculated |

### TC-12.8: Parallel vs Official Ledger
| Steps | Expected Result |
|-------|-----------------|
| 1. Create transaction as OFFICIAL | Transaction created |
| 2. Create transaction as PARALLEL | Transaction created |
| 3. Open Tally page, filter OFFICIAL | Only official transaction visible |
| 4. Filter PARALLEL | Only parallel transaction visible |
| 5. Dashboard shows both | Both affect account balances |

### TC-12.9: Multi-Party Balance Verification
| Steps | Expected Result |
|-------|-----------------|
| 1. Create 3 parties (A, B, C) | Parties created |
| 2. Sales (credit) to A: 10,000 | A = +10,000 (Dr) |
| 3. Purchase (credit) from B: 15,000 | B = -15,000 (Cr) |
| 4. Sales (credit) to C: 5,000 then Purchase (credit) from C: 5,000 | C = 0 |
| 5. Dashboard Debtors: A = 10,000 | Correct |
| 6. Dashboard Creditors: B = 15,000 | Correct |
| 7. C not in debtors or creditors | Zero balance excluded |

### TC-12.10: Delete Transaction with GST + Stock Reversal
| Steps | Expected Result |
|-------|-----------------|
| 1. Purchase with stock (50 quintals, Rs 5000/q) + GST from inter-state party | Stock +5000 KG, IGST Input +12,500, Cash -2,62,500 |
| 2. Delete this transaction | All reversed: Stock -5000 KG, IGST Input -12,500, Cash +2,62,500 |
| 3. Verify all balances return to original | Every account, stock, and GST account back to pre-transaction state |

---

## Module 13: Edge Cases & Error Handling

| # | Test Case | Expected Result | Severity |
|---|-----------|-----------------|----------|
| 1 | Rapid double-submit of same transaction | Only one transaction created (no duplicates) | Critical |
| 2 | Create transaction with very large amount (10 Cr+) | Handles large decimals without overflow | High |
| 3 | Negative amount entry | Blocked or handled gracefully | High |
| 4 | Special characters in names | Account/Party names with quotes, &, etc. handled | Medium |
| 5 | Concurrent edits to same transaction | No data corruption, last write wins or error | High |
| 6 | Browser back button after form submit | No duplicate submission, correct page state | Medium |
| 7 | Network error during transaction save | User-friendly error, no partial data | High |
| 8 | Session expiry during form fill | Redirected to login, data not lost if possible | Medium |
| 9 | Stock quantity going negative after edit | Proper validation or warning | High |
| 10 | Deleting account used in GST auto-creation | Should not be deletable (has transactions) | Medium |
