import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { formatINR, formatDate, toNumber } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Plus, IndianRupee } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

async function TransactionsContent() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      account: { select: { name: true } },
      party: { select: { name: true } },
    },
  });

  return (
    <Card>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <IndianRupee className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No transactions yet</p>
            <Link href="/entry" className="mt-4">
              <Button variant="warning">Add First Transaction</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const amount = toNumber(tx.amount);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        tx.type === "IN" ? "bg-green-100" : "bg-red-100"
                      }`}
                    >
                      {tx.type === "IN" ? (
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {tx.description || tx.category || "Transaction"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{tx.account.name}</span>
                        {tx.party && (
                          <>
                            <span>•</span>
                            <span>{tx.party.name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.type === "IN" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "IN" ? "+" : "-"}
                        {formatINR(amount)}
                      </p>
                      <Badge
                        variant={
                          tx.ledgerType === "OFFICIAL" ? "info" : "secondary"
                        }
                        className="text-xs"
                      >
                        {tx.ledgerType === "OFFICIAL" ? "Official" : "Parallel"}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TransactionsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 text-sm">View all transaction history</p>
          </div>
          <Link href="/entry">
            <Button variant="warning">
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          </Link>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <TransactionsContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}
