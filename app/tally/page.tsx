import { Suspense } from "react";
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
} from "@/lib/utils";
import { FileText, Download, Check, Filter } from "lucide-react";
import { TallyFilters } from "@/components/tally-filters";

interface SearchParams {
  ledgerType?: string;
  reconciled?: string;
  startDate?: string;
  endDate?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

async function TallyContent({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireAuth();
  const { ledgerType, reconciled, startDate, endDate } = searchParams;

  const where: Record<string, unknown> = {
    userId,
    isDeleted: false,
  };

  if (ledgerType && ledgerType !== "ALL") {
    where.ledgerType = ledgerType;
  }

  if (reconciled === "true") {
    where.isReconciled = true;
  } else if (reconciled === "false") {
    where.isReconciled = false;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      (where.date as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.date as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      account: { select: { name: true } },
      party: { select: { name: true } },
    },
  });

  // Calculate totals
  const totals = transactions.reduce(
    (acc, tx) => {
      const amount = toNumber(tx.amount);
      if (tx.type === "IN") {
        acc.totalIn += amount;
      } else {
        acc.totalOut += amount;
      }
      return acc;
    },
    { totalIn: 0, totalOut: 0 }
  );

  const officialTransactions = transactions.filter(
    (tx) => tx.ledgerType === "OFFICIAL"
  );
  const unreconciledCount = officialTransactions.filter(
    (tx) => !tx.isReconciled
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total In</p>
            <p className="text-2xl font-bold text-green-600">
              {formatINR(totals.totalIn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Out</p>
            <p className="text-2xl font-bold text-red-600">
              {formatINR(totals.totalOut)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pending for Tally</p>
            <p className="text-2xl font-bold text-amber-600">
              {unreconciledCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TallyFilters />

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Transactions
            {ledgerType === "OFFICIAL" && (
              <Badge variant="info" className="ml-2">
                Official Only
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions match the current filters
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
                      Account
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Party
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Description
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Type
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">
                      Ledger
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">
                      Tally
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const amount = toNumber(tx.amount);
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-2 text-gray-600">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-2 text-gray-900">
                          {tx.account.name}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {tx.party?.name || "-"}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {tx.description || tx.category || "-"}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={tx.type === "IN" ? "success" : "destructive"}
                          >
                            {tx.type}
                          </Badge>
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-medium ${
                            tx.type === "IN"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatINR(amount)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge
                            variant={
                              tx.ledgerType === "OFFICIAL"
                                ? "info"
                                : "secondary"
                            }
                          >
                            {tx.ledgerType === "OFFICIAL"
                              ? "Official"
                              : "Parallel"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {tx.isReconciled ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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

export default async function TallyExportPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tally Export</h1>
              <p className="text-gray-500 text-sm">
                Filter and export official transactions for Tally
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <TallyContent searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
