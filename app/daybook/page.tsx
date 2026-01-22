import { Suspense } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { getDayBookData, getDayBookAccounts } from "@/lib/daybook-actions";
import { formatINR, formatDateForInput } from "@/lib/utils";
import { DayBookFilters } from "@/components/daybook-filters";

interface SearchParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

async function DayBookContent({ searchParams }: { searchParams: SearchParams }) {
  const accounts = await getDayBookAccounts();

  // Default to current month
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEndDate = today;

  const accountId = searchParams.accountId || null;
  const startDate = searchParams.startDate || formatDateForInput(defaultStartDate);
  const endDate = searchParams.endDate || formatDateForInput(defaultEndDate);

  const data = await getDayBookData(accountId, startDate, endDate);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Opening Balance</p>
            <p className={`text-2xl font-bold ${data.overallOpeningBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
              {formatINR(data.overallOpeningBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">As of {startDate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Inflow</p>
            <p className="text-2xl font-bold text-green-600">
              {formatINR(data.totalIn)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{data.dailySummaries.reduce((sum, d) => sum + d.transactions.filter(t => t.type === "IN").length, 0)} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Outflow</p>
            <p className="text-2xl font-bold text-red-600">
              {formatINR(data.totalOut)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{data.dailySummaries.reduce((sum, d) => sum + d.transactions.filter(t => t.type === "OUT").length, 0)} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Closing Balance</p>
            <p className={`text-2xl font-bold ${data.overallClosingBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
              {formatINR(data.overallClosingBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">As of {endDate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <DayBookFilters
        accounts={accounts}
        selectedAccountId={accountId}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Account Info */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">Showing:</span>
        <Badge variant="secondary">{data.accountName}</Badge>
        {data.accountType && (
          <Badge variant="outline">{data.accountType}</Badge>
        )}
        <span className="text-gray-400">|</span>
        <span>{data.dailySummaries.length} day(s) with transactions</span>
      </div>

      {/* Daily Summaries */}
      {data.dailySummaries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No transactions found for the selected date range and account.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.dailySummaries.map((day) => (
            <Card key={day.date}>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="font-semibold">{day.displayDate}</span>
                    <Badge variant="secondary" className="text-xs">
                      {day.transactionCount} txn{day.transactionCount !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      Open: <span className="font-medium text-gray-700">{formatINR(day.openingBalance)}</span>
                    </span>
                    <span className="text-gray-500">
                      Close: <span className={`font-medium ${day.closingBalance >= 0 ? "text-gray-700" : "text-red-600"}`}>{formatINR(day.closingBalance)}</span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day Summary Bar */}
                <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">In:</span>
                    <span className="font-medium text-green-600">{formatINR(day.totalIn)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-gray-600">Out:</span>
                    <span className="font-medium text-red-600">{formatINR(day.totalOut)}</span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-sm text-gray-600">Net:</span>
                    <span className={`font-medium ml-1 ${day.netChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {day.netChange >= 0 ? "+" : ""}{formatINR(day.netChange)}
                    </span>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Account</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Party</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Description</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Type</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Inflow</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Outflow</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Ledger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-900">{tx.accountName}</td>
                          <td className="py-2 px-2 text-gray-600">{tx.partyName || "-"}</td>
                          <td className="py-2 px-2 text-gray-600">
                            {tx.description || tx.category || "-"}
                            {tx.receiptNumber && (
                              <span className="text-xs text-gray-400 ml-1">
                                (#{tx.receiptNumber})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant={tx.type === "IN" ? "success" : "destructive"}>
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right text-green-600 font-medium">
                            {tx.type === "IN" ? formatINR(tx.amount) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-red-600 font-medium">
                            {tx.type === "OUT" ? formatINR(tx.amount) : "-"}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant={tx.ledgerType === "OFFICIAL" ? "info" : "secondary"}>
                              {tx.ledgerType === "OFFICIAL" ? "Official" : "Parallel"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DayBookPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Day Book</h1>
              <p className="text-gray-500 text-sm">
                Daily transaction summary with opening and closing balances
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <DayBookContent searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
