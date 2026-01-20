"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export function TallyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentLedgerType = searchParams.get("ledgerType") || "ALL";
  const currentReconciled = searchParams.get("reconciled") || "";
  const currentStartDate = searchParams.get("startDate") || "";
  const currentEndDate = searchParams.get("endDate") || "";

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/tally?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/tally");
  };

  const hasFilters =
    currentLedgerType !== "ALL" ||
    currentReconciled ||
    currentStartDate ||
    currentEndDate;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-gray-500"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Ledger Type */}
          <div className="space-y-2">
            <Label>Ledger Type</Label>
            <Select
              value={currentLedgerType}
              onChange={(e) => updateFilters({ ledgerType: e.target.value })}
            >
              <option value="ALL">All Transactions</option>
              <option value="OFFICIAL">Official Only</option>
              <option value="PARALLEL">Parallel Only</option>
            </Select>
          </div>

          {/* Reconciled Status */}
          <div className="space-y-2">
            <Label>Tally Status</Label>
            <Select
              value={currentReconciled}
              onChange={(e) => updateFilters({ reconciled: e.target.value })}
            >
              <option value="">All</option>
              <option value="false">Pending Entry</option>
              <option value="true">Already in Tally</option>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input
              type="date"
              value={currentStartDate}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input
              type="date"
              value={currentEndDate}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
            />
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={currentLedgerType === "OFFICIAL" && currentReconciled === "false" ? "warning" : "outline"}
            size="sm"
            onClick={() =>
              updateFilters({ ledgerType: "OFFICIAL", reconciled: "false" })
            }
          >
            Pending for Tally
          </Button>
          <Button
            variant={currentLedgerType === "OFFICIAL" ? "outline" : "ghost"}
            size="sm"
            onClick={() =>
              updateFilters({ ledgerType: "OFFICIAL", reconciled: "" })
            }
          >
            All Official
          </Button>
          <Button
            variant={currentLedgerType === "PARALLEL" ? "outline" : "ghost"}
            size="sm"
            onClick={() =>
              updateFilters({ ledgerType: "PARALLEL", reconciled: "" })
            }
          >
            Parallel Only
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
