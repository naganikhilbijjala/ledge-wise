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
  Package,
  Users,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/app-layout";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function DashboardContent() {
  const data = await getDashboardStats();
  const { accounts, receivables, payables, stockSummary, totals } = data;

  // Separate accounts by type
  const cashAccounts = accounts.filter((a) => a.type === "CASH");
  const bankAccounts = accounts.filter((a) => a.type === "BANK");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Overview of your business
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

      {/* Main Grid - 2x2 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Accounts</CardTitle>
            </div>
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
                {/* Cash Accounts */}
                {cashAccounts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Wallet className="h-4 w-4" />
                      <span>Cash</span>
                    </div>
                    {cashAccounts.map((account) => (
                      <Link
                        key={account.id}
                        href={`/accounts/${account.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-medium text-gray-900">
                          {account.name}
                        </span>
                        <span
                          className={`font-semibold ${getAmountColor(
                            account.currentBalance
                          )}`}
                        >
                          {formatINR(account.currentBalance)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Bank Accounts */}
                {bankAccounts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building2 className="h-4 w-4" />
                      <span>Bank</span>
                    </div>
                    {bankAccounts.map((account) => (
                      <Link
                        key={account.id}
                        href={`/accounts/${account.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-medium text-gray-900">
                          {account.name}
                        </span>
                        <span
                          className={`font-semibold ${getAmountColor(
                            account.currentBalance
                          )}`}
                        >
                          {formatINR(account.currentBalance)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Inventory Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Stock Inventory</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-sm font-bold text-gray-900">
                {totals.totalStockQuantity.toFixed(2)} Quintals
              </p>
              <p className="text-sm font-bold text-amber-600">
                {formatINRShort(totals.totalStockValue)}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {stockSummary.length === 0 ? (
              <p className="text-gray-500 text-sm">No stock entries yet</p>
            ) : (
              <div className="space-y-3">
                {stockSummary.map((stock) => (
                  <Link
                    key={stock.id}
                    href={`/stock/${stock.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stock.commodityType.replace("_", " ")}
                        </Badge>
                        <span className="font-medium text-gray-900">
                          {stock.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {stock.quantity.toFixed(2)} {stock.unit}
                      </span>
                      <span className="font-semibold text-amber-600">
                        {formatINR(stock.totalValue)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debtors (People who owe us - Receivables) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-lg">Debtors</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">To Receive</p>
              <p className="text-sm font-bold text-green-600">
                {formatINRShort(totals.totalReceivables)}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <p className="text-gray-500 text-sm">No receivables</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {receivables.map((party) => (
                  <Link
                    key={party.id}
                    href={`/parties/${party.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{party.name}</p>
                      <Badge
                        className={getAccountTypeColor(party.type)}
                        variant="secondary"
                      >
                        {party.type}
                      </Badge>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatINR(party.totalDue)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creditors (People we owe - Payables) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-lg">Creditors</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">To Pay</p>
              <p className="text-sm font-bold text-red-600">
                {formatINRShort(totals.totalPayables)}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {payables.length === 0 ? (
              <p className="text-gray-500 text-sm">No payables</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {payables.map((party) => (
                  <Link
                    key={party.id}
                    href={`/parties/${party.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{party.name}</p>
                      <Badge
                        className={getAccountTypeColor(party.type)}
                        variant="secondary"
                      >
                        {party.type}
                      </Badge>
                    </div>
                    <span className="font-semibold text-red-600">
                      {formatINR(party.totalDue)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </AppLayout>
  );
}
