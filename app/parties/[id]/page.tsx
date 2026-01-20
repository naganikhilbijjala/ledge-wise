import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
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
  ArrowDownRight,
  ArrowUpRight,
  Phone,
  MapPin,
} from "lucide-react";

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
  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      transactions: {
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

  const due = toNumber(party.totalDue);

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

  // Calculate running balance for ledger view
  let runningBalance = 0;
  const transactionsWithBalance = [...party.transactions]
    .reverse()
    .map((tx) => {
      const amount = toNumber(tx.amount);
      // IN = they paid us = decrease their due
      // OUT = we paid them = decrease their due (if we owe them)
      // For customer: IN = they gave us goods (we owe), OUT = we paid
      const balanceChange = tx.type === "OUT" ? amount : -amount;
      runningBalance += balanceChange;
      return { ...tx, runningBalance };
    })
    .reverse();

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
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {due >= 0 ? "They Owe Us" : "We Owe Them"}
              </p>
              <p className={`text-2xl font-bold ${getAmountColor(due)}`}>
                {formatINR(Math.abs(due))}
              </p>
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
                      Credit
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Debit
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Balance
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
                            <p className="text-gray-900">
                              {tx.description || tx.category || "Transaction"}
                            </p>
                            <p className="text-xs text-gray-500">
                              via {tx.account.name}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {tx.type === "OUT" ? (
                            <span className="text-green-600 font-medium">
                              {formatINR(amount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {tx.type === "IN" ? (
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

        <Suspense fallback={<LoadingSkeleton />}>
          <PartyLedgerContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
