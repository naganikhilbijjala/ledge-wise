import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, formatIndianNumber, toNumber } from "@/lib/utils";
import { Package, Plus, Truck } from "lucide-react";

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
  const stocks = await prisma.stock.findMany({
    orderBy: [{ commodityType: "asc" }, { name: "asc" }],
  });

  const commodityColors: Record<string, string> = {
    TURMERIC_RAW: "bg-amber-100 text-amber-800",
    TURMERIC_POWDER: "bg-yellow-100 text-yellow-800",
    MAIZE: "bg-green-100 text-green-800",
    OTHER: "bg-gray-100 text-gray-800",
  };

  const commodityLabels: Record<string, string> = {
    TURMERIC_RAW: "Raw Turmeric",
    TURMERIC_POWDER: "Turmeric Powder",
    MAIZE: "Maize",
    OTHER: "Other",
  };

  // Calculate totals
  const totals = stocks.reduce(
    (acc, stock) => {
      const qty = toNumber(stock.quantity);
      const cost = toNumber(stock.avgCostPerKg);
      const value = qty * cost;

      if (stock.commodityType.startsWith("TURMERIC")) {
        acc.turmericQty += qty;
        acc.turmericValue += value;
      } else if (stock.commodityType === "MAIZE") {
        acc.maizeQty += qty;
        acc.maizeValue += value;
      } else {
        acc.otherValue += value;
      }
      acc.totalValue += value;
      return acc;
    },
    {
      turmericQty: 0,
      turmericValue: 0,
      maizeQty: 0,
      maizeValue: 0,
      otherValue: 0,
      totalValue: 0,
    }
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-700">Turmeric Stock</span>
            </div>
            <p className="text-xl font-bold text-amber-800 mt-1">
              {formatIndianNumber(totals.turmericQty)} KG
            </p>
            <p className="text-sm text-amber-600">
              {formatINR(totals.turmericValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Maize Stock</span>
            </div>
            <p className="text-xl font-bold text-green-800 mt-1">
              {formatIndianNumber(totals.maizeQty)} KG
            </p>
            <p className="text-sm text-green-600">
              {formatINR(totals.maizeValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
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
          const qty = toNumber(stock.quantity);
          const cost = toNumber(stock.avgCostPerKg);
          const value = qty * cost;

          return (
            <Card key={stock.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    className={commodityColors[stock.commodityType]}
                    variant="secondary"
                  >
                    {commodityLabels[stock.commodityType]}
                  </Badge>
                  {stock.location && (
                    <span className="text-xs text-gray-500">
                      {stock.location}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 text-lg">
                  {stock.name}
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatIndianNumber(qty)}{" "}
                      <span className="text-sm font-normal">{stock.unit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Cost</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatINR(cost)}
                      <span className="text-sm font-normal text-gray-500">
                        /KG
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Inventory</h1>
          <p className="text-gray-500 text-sm">
            Track turmeric, maize, and other commodities
          </p>
        </div>
        <Link href="/stock/movement">
          <Button variant="warning">
            <Plus className="h-4 w-4 mr-2" />
            Add Movement
          </Button>
        </Link>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <StockContent />
      </Suspense>
    </div>
  );
}
