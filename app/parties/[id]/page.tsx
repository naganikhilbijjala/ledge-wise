import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import {
  formatINR,
  formatDate,
  toNumber,
  getAmountColor,
} from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Pencil,
} from "lucide-react";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { AdjustBalanceButton } from "@/components/adjust-balance-button";

interface Props {
  params: Promise<{ id: string }>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  );
}

async function PartyLedgerContent({ id }: { id: string }) {
  const userId = await requireAuth();

  const party = await prisma.party.findFirst({
    where: { id, userId, isDeleted: false },
    include: {
      transactions: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
        include: {
          account: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!party) {
    notFound();
  }

  const partyTypeColors: Record<string, string> = {
    CUSTOMER: "bg-blue-100 text-blue-800",
    VENDOR: "bg-purple-100 text-purple-800",
    LENDER: "bg-amber-100 text-amber-800",
    BORROWER: "bg-green-100 text-green-800",
  };

  const partyTypeLabels: Record<string, string> = {
    CUSTOMER: "Seller",
    VENDOR: "Buyer",
    LENDER: "Lender",
    BORROWER: "Borrower",
  };

  // Calculate running balance for ledger view from transactions
  // From our perspective tracking what's owed:
  //
  // For CREDIT (Udhar) transactions only:
  // - IN (Credit) = We sold goods/services on credit → they owe us more → +amount
  // - OUT (Debit) = We bought goods/services on credit → we owe them more → -amount
  //
  // For CASH transactions:
  // - No balance change - money already exchanged, transaction is settled
  //
  // Positive balance = They owe us (Dr) - Debtors/Receivables
  // Negative balance = We owe them (Cr) - Creditors/Payables
  let runningBalance = 0;
  const transactionsWithBalance = [...party.transactions]
    .reverse()
    .map((tx) => {
      const amount = toNumber(tx.amount);
      // Only CREDIT (Udhar) transactions affect the running balance
      // CASH transactions show in history but don't change party balance
      const isCredit = tx.paymentMode === "CREDIT";
      const balanceChange = isCredit
        ? (tx.type === "IN" ? amount : -amount)
        : 0;
      runningBalance += balanceChange;
      return { ...tx, runningBalance, isCredit };
    })
    .reverse();

  // The final running balance IS the current due (calculated only from CREDIT transactions)
  const due = runningBalance;

  return (
    <div className="space-y-6">
      {/* Party Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-600">
                  {party.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{party.name}</h2>
                <Badge
                  className={partyTypeColors[party.type]}
                  variant="secondary"
                >
                  {partyTypeLabels[party.type]}
                </Badge>
                {party.phone && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                    <Phone className="h-3 w-3" />
                    {party.phone}
                  </div>
                )}
                {party.address && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {party.address}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-sm text-gray-500">
                  {due >= 0 ? "They Owe Us" : "We Owe Them"}
                </p>
                <p className={`text-2xl font-bold ${getAmountColor(due)}`}>
                  {formatINR(Math.abs(due))}
                </p>
              </div>
              <AdjustBalanceButton
                type="party"
                id={party.id}
                name={party.name}
                currentValue={due}
              />
            </div>
          </div>
          {party.notes && (
            <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {party.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ledger / Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History (Khata)</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsWithBalance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Description
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Debit
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Credit
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Balance
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalance.map((tx) => {
                    const amount = toNumber(tx.amount);
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-2 text-gray-600">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-900">
                                {tx.description || tx.category || "Transaction"}
                              </p>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                tx.isCredit
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {tx.isCredit ? "Udhar" : "Cash"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              via {tx.account.name}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {/* Debit column = IN (sales/receipts) - they owe us more */}
                          {tx.type === "IN" ? (
                            <span className="text-green-600 font-medium">
                              {formatINR(amount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {/* Credit column = OUT (purchases/payments) - we paid them */}
                          {tx.type === "OUT" ? (
                            <span className="text-red-600 font-medium">
                              {formatINR(amount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-semibold ${getAmountColor(
                            tx.runningBalance
                          )}`}
                        >
                          {formatINR(Math.abs(tx.runningBalance))}
                          <span className="text-xs ml-1">
                            {tx.runningBalance >= 0 ? "Dr" : "Cr"}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/transactions/${tx.id}/edit`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4 text-gray-500" />
                              </Button>
                            </Link>
                            <DeleteTransactionButton
                              transactionId={tx.id}
                              description={tx.description || tx.category || undefined}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function PartyLedgerPage({ params }: Props) {
  const { id } = await params;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/parties">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Party Ledger</h1>
              <p className="text-gray-500 text-sm">View transaction history</p>
            </div>
          </div>
          <Link href={`/parties/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Party
            </Button>
          </Link>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <PartyLedgerContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
