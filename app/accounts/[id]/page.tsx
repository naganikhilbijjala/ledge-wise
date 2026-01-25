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
  getAccountTypeColor,
} from "@/lib/utils";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Pencil,
  Wallet,
  Building2,
} from "lucide-react";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";

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

async function AccountDetailContent({ id }: { id: string }) {
  const userId = await requireAuth();

  const account = await prisma.account.findFirst({
    where: { id, userId, isDeleted: false },
    include: {
      transactionsFrom: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
        include: {
          party: { select: { name: true } },
          account: { select: { name: true } },
          toAccount: { select: { name: true } },
        },
      },
      transactionsTo: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
        include: {
          party: { select: { name: true } },
          account: { select: { name: true } },
          toAccount: { select: { name: true } },
        },
      },
    },
  });

  if (!account) {
    notFound();
  }

  // Combine and sort all transactions
  const allTransactions = [
    ...account.transactionsFrom.map((tx) => ({ ...tx, isFromAccount: true })),
    ...account.transactionsTo.map((tx) => ({ ...tx, isFromAccount: false })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const balance = toNumber(account.currentBalance);

  const accountTypeIcons: Record<string, React.ReactNode> = {
    CASH: <Wallet className="h-6 w-6 text-green-600" />,
    BANK: <Building2 className="h-6 w-6 text-blue-600" />,
    LOAN_GIVEN: <ArrowUpRight className="h-6 w-6 text-amber-600" />,
    LOAN_TAKEN: <ArrowDownRight className="h-6 w-6 text-red-600" />,
  };

  // Calculate running balance (from oldest to newest, then reverse)
  let runningBalance = 0;
  const transactionsWithBalance = [...allTransactions]
    .reverse()
    .map((tx) => {
      const amount = toNumber(tx.amount);
      let balanceChange = 0;

      if (tx.isFromAccount) {
        // This account is the source
        if (tx.type === "IN") {
          balanceChange = amount; // Credit to this account
        } else if (tx.type === "OUT") {
          balanceChange = -amount; // Debit from this account
        } else if (tx.type === "TRANSFER") {
          balanceChange = -amount; // Transfer out from this account
        }
      } else {
        // This account is the destination (only for transfers)
        balanceChange = amount; // Transfer in to this account
      }

      runningBalance += balanceChange;
      return { ...tx, runningBalance, balanceChange };
    })
    .reverse();

  return (
    <div className="space-y-6">
      {/* Account Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                {accountTypeIcons[account.type]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{account.name}</h2>
                <Badge
                  className={getAccountTypeColor(account.type)}
                  variant="secondary"
                >
                  {account.type.replace("_", " ")}
                </Badge>
                {account.description && (
                  <p className="mt-2 text-sm text-gray-500">{account.description}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatINR(balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
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
                    <th className="text-center py-3 px-2 font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalance.map((tx) => {
                    const amount = toNumber(tx.amount);
                    const isCredit = tx.balanceChange > 0;
                    const isDebit = tx.balanceChange < 0;

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
                            <div
                              className={`p-1 rounded-full ${
                                tx.type === "IN"
                                  ? "bg-green-100"
                                  : tx.type === "TRANSFER"
                                  ? "bg-blue-100"
                                  : "bg-red-100"
                              }`}
                            >
                              {tx.type === "IN" ? (
                                <ArrowDownRight className="h-3 w-3 text-green-600" />
                              ) : tx.type === "TRANSFER" ? (
                                <ArrowLeftRight className="h-3 w-3 text-blue-600" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-gray-900">
                                {tx.description || tx.category || (tx.type === "TRANSFER" ? "Transfer" : "Transaction")}
                              </p>
                              <p className="text-xs text-gray-500">
                                {tx.type === "TRANSFER" ? (
                                  tx.isFromAccount ? (
                                    <>To: {tx.toAccount?.name}</>
                                  ) : (
                                    <>From: {tx.account?.name}</>
                                  )
                                ) : tx.party ? (
                                  tx.party.name
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isCredit ? (
                            <span className="text-green-600 font-medium">
                              {formatINR(Math.abs(tx.balanceChange))}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isDebit ? (
                            <span className="text-red-600 font-medium">
                              {formatINR(Math.abs(tx.balanceChange))}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-semibold ${
                            tx.runningBalance >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatINR(Math.abs(tx.runningBalance))}
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

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/accounts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Ledger</h1>
              <p className="text-gray-500 text-sm">View transaction history</p>
            </div>
          </div>
          <Link href={`/accounts/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Account
            </Button>
          </Link>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <AccountDetailContent id={id} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
