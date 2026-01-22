"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, X, Calendar } from "lucide-react";
import type { AccountType } from "@/lib/types";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
}

interface DayBookFiltersProps {
  accounts: Account[];
  selectedAccountId: string | null;
  startDate: string;
  endDate: string;
}

export function DayBookFilters({
  accounts,
  selectedAccountId,
  startDate,
  endDate,
}: DayBookFiltersProps) {
  const router = useRouter();

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams();

    // Start with current values
    if (selectedAccountId) params.set("accountId", selectedAccountId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/daybook?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/daybook");
  };

  // Quick date range helpers
  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    updateFilters({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  const setCurrentMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);

    updateFilters({
      startDate: start.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    });
  };

  const setLastMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);

    updateFilters({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  const hasCustomFilters = selectedAccountId !== null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {hasCustomFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-gray-500"
            >
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Account Filter */}
          <div className="space-y-2">
            <Label>Account</Label>
            <Select
              value={selectedAccountId || ""}
              onChange={(e) => updateFilters({ accountId: e.target.value })}
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
            />
          </div>

          {/* Quick Date Actions */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange(1)}
                className="flex-1 text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange(7)}
                className="flex-1 text-xs"
              >
                7 Days
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={setCurrentMonth}
          >
            <Calendar className="h-3 w-3 mr-1" />
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={setLastMonth}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Last Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(30)}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(90)}
          >
            Last 90 Days
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
