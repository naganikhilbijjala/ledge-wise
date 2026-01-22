"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTransaction, updateTransaction } from "@/lib/transaction-actions";
import { createParty } from "@/lib/party-actions";
import { ArrowDownLeft, ArrowUpRight, Check, Loader2, Plus, X, Package } from "lucide-react";
import type { LedgerType, TransactionType, PartyType } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Party {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
}

interface Stock {
  id: string;
  name: string;
}

interface TransactionData {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  partyId: string | null;
  description: string | null;
  category: string | null;
  ledgerType: LedgerType;
}

interface Props {
  accounts: Account[];
  parties: Party[];
  categories: Category[];
  stocks?: Stock[];
  editTransaction?: TransactionData;
}

export function QuickEntryForm({ accounts, parties: initialParties, categories, stocks = [], editTransaction }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const isEditMode = !!editTransaction;

  // Party management
  const [parties, setParties] = useState(initialParties);
  const [showAddParty, setShowAddParty] = useState(false);
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [newParty, setNewParty] = useState({
    name: "",
    type: "CUSTOMER" as PartyType,
    phone: "",
  });

  // Stock purchase state
  const [isStockPurchase, setIsStockPurchase] = useState(false);
  const [stockData, setStockData] = useState({
    stockId: "",
    quantity: "",
    quantityUnit: "QUINTAL" as "KG" | "QUINTAL",
    pricePerUnit: "",
    includeTax: false,
  });

  const [formData, setFormData] = useState({
    accountId: editTransaction?.accountId || accounts[0]?.id || "",
    amount: editTransaction?.amount?.toString() || "",
    type: (editTransaction?.type || "OUT") as "IN" | "OUT",
    partyId: editTransaction?.partyId || "",
    description: editTransaction?.description || "",
    category: editTransaction?.category || "",
    ledgerType: (editTransaction?.ledgerType || "PARALLEL") as "OFFICIAL" | "PARALLEL",
  });

  // Get selected party type
  const selectedParty = parties.find(p => p.id === formData.partyId);
  const isTraderPurchase = selectedParty && selectedParty.type !== "CUSTOMER";

  // Calculate amount from stock data
  const calculateStockAmount = () => {
    const qty = parseFloat(stockData.quantity) || 0;
    const price = parseFloat(stockData.pricePerUnit) || 0;
    return qty * price;
  };

  // Calculate tax amount (5% for trader purchases)
  const calculateTaxAmount = () => {
    if (!isTraderPurchase || !stockData.includeTax) return 0;
    return calculateStockAmount() * 0.05;
  };

  // Total amount including tax
  const totalAmount = calculateStockAmount() + calculateTaxAmount();

  // Auto-update amount and description when stock data changes
  const handleStockDataChange = (updates: Partial<typeof stockData>) => {
    const newStockData = { ...stockData, ...updates };
    setStockData(newStockData);

    // Calculate and update amount
    const qty = parseFloat(newStockData.quantity) || 0;
    const price = parseFloat(newStockData.pricePerUnit) || 0;
    const baseAmount = qty * price;

    if (baseAmount > 0) {
      // Build stock description
      const stockName = stocks.find(s => s.id === newStockData.stockId)?.name || "";
      const stockDesc = stockName && qty > 0 && price > 0
        ? `Stock: ${qty} ${newStockData.quantityUnit} @ ₹${price}/${newStockData.quantityUnit}`
        : "";

      setFormData(prev => ({
        ...prev,
        amount: baseAmount.toString(),
        description: stockDesc,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountId || !formData.amount) {
      return;
    }

    startTransition(async () => {
      try {
        if (isEditMode && editTransaction) {
          await updateTransaction({
            id: editTransaction.id,
            accountId: formData.accountId,
            amount: parseFloat(formData.amount),
            type: formData.type,
            partyId: formData.partyId || undefined,
            description: formData.description || undefined,
            category: formData.category || undefined,
            ledgerType: formData.ledgerType,
          });

          setSuccess(true);
          setTimeout(() => {
            router.push("/transactions");
          }, 1500);
        } else {
          await createTransaction({
            accountId: formData.accountId,
            amount: parseFloat(formData.amount),
            type: formData.type,
            partyId: formData.partyId || undefined,
            description: formData.description || undefined,
            category: formData.category || undefined,
            ledgerType: formData.ledgerType,
            // Stock purchase fields
            stockId: isStockPurchase && stockData.stockId ? stockData.stockId : undefined,
            quantity: isStockPurchase && stockData.quantity ? parseFloat(stockData.quantity) : undefined,
            quantityUnit: isStockPurchase ? stockData.quantityUnit : undefined,
            pricePerUnit: isStockPurchase && stockData.pricePerUnit ? parseFloat(stockData.pricePerUnit) : undefined,
            includeTax: isStockPurchase ? stockData.includeTax : undefined,
          });

          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setFormData((prev) => ({
              ...prev,
              amount: "",
              description: "",
            }));
            // Reset stock data too
            setIsStockPurchase(false);
            setStockData({
              stockId: "",
              quantity: "",
              quantityUnit: "QUINTAL",
              pricePerUnit: "",
              includeTax: false,
            });
          }, 1500);
        }
      } catch (error) {
        console.error("Failed to save transaction:", error);
      }
    });
  };

  const handleAddParty = async () => {
    if (!newParty.name.trim()) return;

    setIsAddingParty(true);
    try {
      const created = await createParty({
        name: newParty.name.trim(),
        type: newParty.type,
        phone: newParty.phone || undefined,
      });

      // Add to local parties list and select it
      setParties((prev) => [...prev, { id: created.id, name: created.name, type: created.type }]);
      setFormData((prev) => ({ ...prev, partyId: created.id }));

      // Reset and close
      setNewParty({ name: "", type: "CUSTOMER", phone: "" });
      setShowAddParty(false);
    } catch (error) {
      console.error("Failed to create party:", error);
      alert("Failed to create party. Please try again.");
    } finally {
      setIsAddingParty(false);
    }
  };

  if (success) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-800">
            Transaction {isEditMode ? "Updated" : "Saved"}!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "IN" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "IN"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowDownLeft size={20} />
              Money In
            </button>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "OUT" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "OUT"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowUpRight size={20} />
              Money Out
            </button>
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">Account *</Label>
            <Select
              id="account"
              value={formData.accountId}
              onChange={(e) =>
                setFormData((p) => ({ ...p, accountId: e.target.value }))
              }
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData((p) => ({ ...p, amount: e.target.value }))
              }
              className="text-2xl font-bold h-14"
              min="0"
              step="0.01"
              required
              autoFocus
            />
          </div>

          {/* Stock Purchase Toggle - Only show for Money Out and if stocks exist */}
          {formData.type === "OUT" && stocks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isStockPurchase"
                  checked={isStockPurchase}
                  onChange={(e) => {
                    setIsStockPurchase(e.target.checked);
                    if (!e.target.checked) {
                      setStockData({
                        stockId: "",
                        quantity: "",
                        quantityUnit: "QUINTAL",
                        pricePerUnit: "",
                        includeTax: false,
                      });
                    }
                  }}
                  className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <Label htmlFor="isStockPurchase" className="flex items-center gap-2 cursor-pointer">
                  <Package size={16} className="text-amber-600" />
                  This is a stock purchase
                </Label>
              </div>

              {isStockPurchase && (
                <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  {/* Stock Selection */}
                  <div className="space-y-1">
                    <Label htmlFor="stock" className="text-sm">Select Stock *</Label>
                    <Select
                      id="stock"
                      value={stockData.stockId}
                      onChange={(e) => handleStockDataChange({ stockId: e.target.value })}
                      required={isStockPurchase}
                    >
                      <option value="">Select stock item</option>
                      {stocks.map((stock) => (
                        <option key={stock.id} value={stock.id}>
                          {stock.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Quantity and Unit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="quantity" className="text-sm">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="0"
                        value={stockData.quantity}
                        onChange={(e) => handleStockDataChange({ quantity: e.target.value })}
                        min="0"
                        step="0.01"
                        required={isStockPurchase}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="quantityUnit" className="text-sm">Unit</Label>
                      <Select
                        id="quantityUnit"
                        value={stockData.quantityUnit}
                        onChange={(e) => handleStockDataChange({ quantityUnit: e.target.value as "KG" | "QUINTAL" })}
                      >
                        <option value="QUINTAL">Quintals</option>
                        <option value="KG">KG</option>
                      </Select>
                    </div>
                  </div>

                  {/* Price per Unit */}
                  <div className="space-y-1">
                    <Label htmlFor="pricePerUnit" className="text-sm">
                      Price per {stockData.quantityUnit === "QUINTAL" ? "Quintal" : "KG"} (₹) *
                    </Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      placeholder="0"
                      value={stockData.pricePerUnit}
                      onChange={(e) => handleStockDataChange({ pricePerUnit: e.target.value })}
                      min="0"
                      step="0.01"
                      required={isStockPurchase}
                    />
                  </div>

                  {/* Tax checkbox - only show for non-farmer (trader) purchases */}
                  {isTraderPurchase && (
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                      <input
                        type="checkbox"
                        id="includeTax"
                        checked={stockData.includeTax}
                        onChange={(e) => handleStockDataChange({ includeTax: e.target.checked })}
                        className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <Label htmlFor="includeTax" className="text-sm cursor-pointer">
                        Include 5% tax (buying from trader)
                      </Label>
                    </div>
                  )}

                  {/* Amount Summary */}
                  {calculateStockAmount() > 0 && (
                    <div className="pt-2 border-t border-amber-200 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Base Amount:</span>
                        <span className="font-medium">{formatINR(calculateStockAmount())}</span>
                      </div>
                      {stockData.includeTax && calculateTaxAmount() > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax (5%):</span>
                          <span className="font-medium text-amber-600">{formatINR(calculateTaxAmount())}</span>
                        </div>
                      )}
                      {stockData.includeTax && calculateTaxAmount() > 0 && (
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total:</span>
                          <span className="text-red-600">{formatINR(totalAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Party Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="party">Party (Optional)</Label>
              <button
                type="button"
                onClick={() => setShowAddParty(!showAddParty)}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                {showAddParty ? (
                  <>
                    <X size={14} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Add New
                  </>
                )}
              </button>
            </div>

            {showAddParty ? (
              <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="space-y-2">
                  <Input
                    placeholder="Party name *"
                    value={newParty.name}
                    onChange={(e) =>
                      setNewParty((p) => ({ ...p, name: e.target.value }))
                    }
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={newParty.type}
                    onChange={(e) =>
                      setNewParty((p) => ({ ...p, type: e.target.value as PartyType }))
                    }
                  >
                    <option value="CUSTOMER">Seller (Farmer)</option>
                    <option value="VENDOR">Buyer (Company)</option>
                    <option value="LENDER">Lender</option>
                    <option value="BORROWER">Borrower</option>
                  </Select>
                  <Input
                    placeholder="Phone (optional)"
                    value={newParty.phone}
                    onChange={(e) =>
                      setNewParty((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="warning"
                  size="sm"
                  className="w-full"
                  onClick={handleAddParty}
                  disabled={isAddingParty || !newParty.name.trim()}
                >
                  {isAddingParty ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Party
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Select
                id="party"
                value={formData.partyId}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, partyId: e.target.value }))
                }
              >
                <option value="">No party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name} ({party.type})
                  </option>
                ))}
              </Select>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData((p) => ({ ...p, category: e.target.value }))
              }
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Add a note..."
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          {/* Ledger Type Toggle */}
          <div className="space-y-2">
            <Label>Ledger Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({ ...p, ledgerType: "PARALLEL" }))
                }
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.ledgerType === "PARALLEL"
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Parallel (Private)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({ ...p, ledgerType: "OFFICIAL" }))
                }
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.ledgerType === "OFFICIAL"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Official (Tally)
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            variant={formData.type === "IN" ? "success" : "destructive"}
            disabled={isPending || !formData.accountId || !formData.amount}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isEditMode ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                {isEditMode ? "Update" : "Save"} {formData.type === "IN" ? "Income" : "Expense"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
