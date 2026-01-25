"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdjustBalanceDialog } from "@/components/adjust-balance-dialog";
import { Scale } from "lucide-react";

interface AdjustBalanceButtonProps {
  type: "account" | "stock" | "party";
  id: string;
  name: string;
  currentValue: number;
  unit?: string;
}

export function AdjustBalanceButton({
  type,
  id,
  name,
  currentValue,
  unit,
}: AdjustBalanceButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Scale className="h-4 w-4" />
        Adjust {type === "stock" ? "Qty" : "Balance"}
      </Button>

      {showDialog && (
        <AdjustBalanceDialog
          type={type}
          id={id}
          name={name}
          currentValue={currentValue}
          unit={unit}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
