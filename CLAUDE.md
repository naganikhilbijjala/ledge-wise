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

## Terminology
- Credit = Money coming in (IN)
- Debit = Money going out (OUT)
- Transfer = Money moving between accounts (TRANSFER)
- Debtors = People who owe us money (receivables)
- Creditors = People we owe money to (payables)
- Stock quantities are stored in KG but displayed in Quintals (1 Quintal = 100 KG)
