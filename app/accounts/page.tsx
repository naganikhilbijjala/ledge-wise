import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { formatINR, toNumber, getAccountTypeColor } from "@/lib/utils";
import { Wallet, Building2, TrendingUp, TrendingDown, Plus, Pencil } from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

async function AccountsContent() {
  const userId = await requireAuth();

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "CASH":
        return <Wallet className="h-6 w-6" />;
      case "BANK":
        return <Building2 className="h-6 w-6" />;
      case "LOAN_GIVEN":
        return <TrendingUp className="h-6 w-6" />;
      case "LOAN_TAKEN":
        return <TrendingDown className="h-6 w-6" />;
      default:
        return <Wallet className="h-6 w-6" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "CASH":
        return "bg-green-100 text-green-600";
      case "BANK":
        return "bg-blue-100 text-blue-600";
      case "LOAN_GIVEN":
        return "bg-amber-100 text-amber-600";
      case "LOAN_TAKEN":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Calculate totals by type
  const totals = accounts.reduce(
    (acc, account) => {
      const balance = toNumber(account.currentBalance);
      switch (account.type) {
        case "CASH":
          acc.cash += balance;
          break;
        case "BANK":
          acc.bank += balance;
          break;
        case "LOAN_GIVEN":
          acc.loansGiven += balance;
          break;
        case "LOAN_TAKEN":
          acc.loansTaken += balance;
          break;
      }
      return acc;
    },
    { cash: 0, bank: 0, loansGiven: 0, loansTaken: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Total Cash</span>
            </div>
            <p className="text-xl font-bold text-green-800 mt-1">
              {formatINR(totals.cash)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-700">Total Bank</span>
            </div>
            <p className="text-xl font-bold text-blue-800 mt-1">
              {formatINR(totals.bank)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-700">Loans Given</span>
            </div>
            <p className="text-xl font-bold text-amber-800 mt-1">
              {formatINR(totals.loansGiven)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">Loans Taken</span>
            </div>
            <p className="text-xl font-bold text-red-800 mt-1">
              {formatINR(totals.loansTaken)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const balance = toNumber(account.currentBalance);
          return (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${getIconBg(account.type)}`}>
                      {getIcon(account.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {account.name}
                      </h3>
                      <Badge
                        className={getAccountTypeColor(account.type)}
                        variant="secondary"
                      >
                        {account.type.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/accounts/${account.id}/edit`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p
                    className={`text-2xl font-bold ${
                      balance >= 0 ? "text-gray-900" : "text-red-600"
                    }`}
                  >
                    {formatINR(balance)}
                  </p>
                </div>
                {account.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {account.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {accounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No accounts yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-500 text-sm">
              Manage cash, bank accounts, and loans
            </p>
          </div>
          <Link href="/accounts/new">
            <Button variant="warning">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <AccountsContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}
