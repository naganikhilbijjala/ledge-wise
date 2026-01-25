import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { formatINR, formatIndianNumber, toNumber } from "@/lib/utils";
import { Package, Plus, Truck, Pencil } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

async function StockContent() {
  const userId = await requireAuth();

  const stocks = await prisma.stock.findMany({
    where: { userId, isDeleted: false },
    orderBy: { name: "asc" },
  });

  // Calculate totals
  const totals = stocks.reduce(
    (acc, stock) => {
      const qty = toNumber(stock.quantity);
      const cost = toNumber(stock.avgCostPerKg);
      const value = qty * cost;
      acc.totalQty += qty;
      acc.totalValue += value;
      return acc;
    },
    { totalQty: 0, totalValue: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-700">Total Items</span>
            </div>
            <p className="text-xl font-bold text-amber-800 mt-1">
              {stocks.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Total Quantity</span>
            </div>
            <p className="text-xl font-bold text-green-800 mt-1">
              {formatIndianNumber(totals.totalQty / 100)} Quintals
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-100" />
              <span className="text-sm text-amber-100">Total Stock Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatINR(totals.totalValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stocks.map((stock) => {
          const qtyInKg = toNumber(stock.quantity);
          const costPerKg = toNumber(stock.avgCostPerKg);
          const value = qtyInKg * costPerKg;

          // Convert quantity and cost for display based on unit preference
          // Internally everything is stored in KG
          const isQuintal = stock.unit === "QUINTAL" || stock.unit === "Quintals";
          const displayQty = isQuintal ? qtyInKg / 100 : qtyInKg;
          const displayCost = isQuintal ? costPerKg * 100 : costPerKg;
          const displayUnit = isQuintal ? "Quintals" : "KG";

          return (
            <Card key={stock.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {stock.name}
                  </h3>
                  <Link href={`/stock/${stock.id}/edit`}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Pencil className="h-3 w-3 text-gray-500" />
                    </Button>
                  </Link>
                </div>
                {stock.location && (
                  <p className="text-xs text-gray-500 mb-3">{stock.location}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatIndianNumber(displayQty)}{" "}
                      <span className="text-sm font-normal">{displayUnit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Cost</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatINR(displayCost)}
                      <span className="text-sm font-normal text-gray-500">
                        /{displayUnit}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatINR(value)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {stocks.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No stock entries yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function StockPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Inventory</h1>
            <p className="text-gray-500 text-sm">
              Track your commodities inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/stock/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </Link>
            <Link href="/entry">
              <Button variant="warning">
                <Truck className="h-4 w-4 mr-2" />
                Add Movement
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <StockContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}
