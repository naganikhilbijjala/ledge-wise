# Claude Instructions for LedgeWise

## Build Instructions
- Do NOT run `npm run build` or `npx tsc` after every change
- Only build when explicitly asked to "build" or "fix build errors"
- Skip automatic build verification unless requested

## Project Context
- This is a Next.js 15 application with Prisma ORM
- Uses PostgreSQL (Neon) as the database
- Tailwind CSS for styling
- Server actions pattern for data mutations

## Terminology (Tally-style accounting)

### Voucher Types (UI)
- Receipt = Cash/Bank received (type: IN, paymentMode: CASH)
- Payment = Cash/Bank paid out (type: OUT, paymentMode: CASH)
- Sales = Sold on credit/Udhar (type: IN, paymentMode: CREDIT)
- Purchase = Bought on credit/Udhar (type: OUT, paymentMode: CREDIT)
- Contra = Bank ↔ Cash transfers (type: TRANSFER)

### Internal Data Model
- IN = Money/goods coming in (increases our assets or receivables)
- OUT = Money/goods going out (decreases our assets or increases payables)
- TRANSFER = Money moving between accounts

### Ledger Display (Standard Accounting)
- Debit column = Balance increase (money IN to account, or party owes us more)
- Credit column = Balance decrease (money OUT from account, or we owe party more)

### Party Balances
- Debtors = People who owe us money (positive balance, Dr)
- Creditors = People we owe money to (negative balance, Cr)

### Stock
- Stock quantities are stored in KG but displayed in Quintals (1 Quintal = 100 KG)

### GST (Goods and Services Tax)
- Business state: Telangana
- GST Rate: 5% total
- Intra-state (same state): CGST 2.5% + SGST 2.5%
- Inter-state (different state): IGST 5%
- GST is calculated based on party's state vs business state
- GST amounts are posted to separate accounts:
  - Purchase: GST_RECEIVABLE accounts (CGST Input, SGST Input, IGST Input)
  - Sale: GST_PAYABLE accounts (CGST Output, SGST Output, IGST Output)
- Party must have state set to enable GST calculation
