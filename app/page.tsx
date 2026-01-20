import { Suspense } from "react";
import { getDashboardStats } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatINR,
  formatINRShort,
  getAmountColor,
  getAccountTypeColor,
} from "@/lib/utils";
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function DashboardContent() {
  const data = await getDashboardStats();
  const { netPosition, accounts, recentTransactions, stockSummary, totals } =
    data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Overview of your financial position
          </p>
        </div>
        <Link
          href="/entry"
          className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <span>Quick Entry</span>
          <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Net Position Card */}
      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-sm font-medium">
            Net Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold">
            {formatINR(netPosition.netPosition)}
          </div>
          <p className="text-amber-100 text-sm mt-1">
            Cash + Bank + Receivables - Payables
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Cash
            </CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <Wallet className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {formatINRShort(netPosition.totalCash)}
            </div>
          </CardContent>
        </Card>

        {/* Bank */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Bank
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {formatINRShort(netPosition.totalBank)}
            </div>
          </CardContent>
        </Card>

        {/* Receivables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Receivables
            </CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {formatINRShort(totals.totalReceivables)}
            </div>
          </CardContent>
        </Card>

        {/* Payables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Payables
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {formatINRShort(totals.totalPayables)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Accounts</CardTitle>
            <Link
              href="/accounts"
              className="text-sm text-amber-600 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-gray-500 text-sm">No accounts yet</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={getAccountTypeColor(account.type)}
                        variant="secondary"
                      >
                        {account.type}
                      </Badge>
                      <span className="font-medium text-gray-900">
                        {account.name}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${getAmountColor(
                        account.currentBalance
                      )}`}
                    >
                      {formatINR(account.currentBalance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Link
              href="/transactions"
              className="text-sm text-amber-600 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          tx.type === "IN"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {tx.type === "IN" ? (
                          <ArrowDownRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {tx.description || tx.category || "Transaction"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.accountName}
                          {tx.partyName && ` • ${tx.partyName}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        tx.type === "IN" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "IN" ? "+" : "-"}
                      {formatINR(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Stock Inventory</CardTitle>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="font-bold text-amber-600">
              {formatINR(totals.totalStockValue)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {stockSummary.length === 0 ? (
            <p className="text-gray-500 text-sm">No stock entries yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockSummary.map((stock) => (
                <div
                  key={stock.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">
                      {stock.commodityType.replace("_", " ")}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-gray-900">{stock.name}</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-semibold">
                        {stock.quantity.toLocaleString("en-IN")} {stock.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Value</p>
                      <p className="font-semibold text-amber-600">
                        {formatINRShort(stock.totalValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
