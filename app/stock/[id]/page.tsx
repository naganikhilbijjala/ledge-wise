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
} from "@/lib/utils";
import {
  ArrowLeft,
  Pencil,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
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

async function StockDetailContent({ id }: { id: string }) {
  const userId = await requireAuth();

  // Fetch stock with its transactions (new approach - stock data embedded in Transaction)
  const stock = await prisma.stock.findFirst({
    where: { id, userId, isDeleted: false },
    include: {
      transactions: {
        where: { isDeleted: false, stockMovementType: { not: null } },
        orderBy: { date: "desc" },
        include: {
          party: { select: { name: true } },
        },
      },
    },
  });

  if (!stock) {
    notFound();
  }

  const quantityInKg = toNumber(stock.quantity);
  const quantityInQuintals = quantityInKg / 100;
  const avgCostPerKg = toNumber(stock.avgCostPerKg);
  const totalValue = quantityInKg * avgCostPerKg;

  const movementTypeIcons: Record<string, React.ReactNode> = {
    PURCHASE: <TrendingUp className="h-4 w-4 text-green-600" />,
    SALE: <TrendingDown className="h-4 w-4 text-red-600" />,
    PROCESSING: <RefreshCw className="h-4 w-4 text-blue-600" />,
    ADJUSTMENT: <Settings className="h-4 w-4 text-gray-600" />,
  };

  const movementTypeColors: Record<string, string> = {
    PURCHASE: "bg-green-100 text-green-800",
    SALE: "bg-red-100 text-red-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    ADJUSTMENT: "bg-gray-100 text-gray-800",
  };

  // Calculate running quantity by working backwards from current stock
  // Start with current stock and subtract/add as we go back in time
  let runningQuantity = quantityInKg;
  const transactionsWithBalance = stock.transactions.map((tx) => {
    const qtyInKg = toNumber(tx.stockQuantity);
    const movementType = tx.stockMovementType;
    const txType = tx.type; // IN or OUT
    let qtyChange = 0;

    if (movementType === "PURCHASE") {
      qtyChange = qtyInKg;
    } else if (movementType === "SALE" || movementType === "PROCESSING") {
      qtyChange = -qtyInKg;
    } else if (movementType === "ADJUSTMENT") {
      // For adjustments, use transaction type to determine direction
      // IN = stock increased, OUT = stock decreased
      qtyChange = txType === "IN" ? qtyInKg : -qtyInKg;
    }

    // This transaction's balance is the running quantity at this point
    const balanceAtThisPoint = runningQuantity;
    // Then go back in time (subtract the change to get previous balance)
    runningQuantity -= qtyChange;

    return { ...tx, runningQuantity: balanceAtThisPoint / 100, qtyChangeInQuintals: qtyChange / 100 };
  });

  return (
    <div className="space-y-6">
      {/* Stock Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Package className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{stock.name}</h2>
                <Badge variant="secondary">
                  {stock.commodityType.replace("_", " ")}
                </Badge>
                {stock.location && (
                  <p className="mt-2 text-sm text-gray-500">Location: {stock.location}</p>
                )}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <p className="text-sm text-gray-500">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quantityInQuintals.toFixed(2)} Quintals
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Cost</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatINR(avgCostPerKg * 100)}/Quintal
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatINR(totalValue)}
                </p>
              </div>
              <div className="pt-2">
                <AdjustBalanceButton
                  type="stock"
                  id={stock.id}
                  name={stock.name}
                  currentValue={quantityInKg}
                  unit={stock.unit || "QUINTAL"}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsWithBalance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No stock movements yet
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
                      Type
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Description
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      In (Qtl)
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Out (Qtl)
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Rate/Qtl
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Balance (Qtl)
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalance.map((tx) => {
                    const qtyInQuintals = toNumber(tx.stockQuantity) / 100;
                    const pricePerKg = toNumber(tx.stockPricePerKg);
                    const pricePerQuintal = pricePerKg * 100;
                    const totalAmount = toNumber(tx.amount);
                    const movementType = tx.stockMovementType || "PURCHASE";
                    const isIncoming = movementType === "PURCHASE" || (movementType === "ADJUSTMENT" && tx.qtyChangeInQuintals > 0);

                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-2 text-gray-600">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${movementTypeColors[movementType]?.split(" ")[0]}`}>
                              {movementTypeIcons[movementType]}
                            </div>
                            <Badge className={movementTypeColors[movementType]} variant="secondary">
                              {movementType}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="text-gray-900">
                              {tx.description || movementType}
                            </p>
                            {tx.party && (
                              <p className="text-xs text-gray-500">
                                {tx.party.name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isIncoming ? (
                            <span className="text-green-600 font-medium">
                              {qtyInQuintals.toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {!isIncoming ? (
                            <span className="text-red-600 font-medium">
                              {qtyInQuintals.toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600">
                          {formatINR(pricePerQuintal)}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatINR(totalAmount)}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-gray-900">
                          {tx.runningQuantity.toFixed(2)}
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
                              description={tx.description || movementType}
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

export default async function StockDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stock">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Details</h1>
              <p className="text-gray-500 text-sm">View stock movement history</p>
            </div>
          </div>
          <Link href={`/stock/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Stock
            </Button>
          </Link>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <StockDetailContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
