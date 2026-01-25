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
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Check, Loader2, Plus, X, Package } from "lucide-react";
import type { LedgerType, TransactionType, PartyType, PaymentMode } from "@/lib/types";
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

interface StockMovementData {
  id: string;
  stockId: string;
  quantity: number;
  pricePerKg: number;
  type: string | null;
  stock: { id: string; name: string; unit: string } | null;
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
  paymentMode: PaymentMode;
  date: Date;
  stockMovement?: StockMovementData | null;
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

  // Stock purchase state - initialize from editTransaction if available
  const hasStockMovement = !!editTransaction?.stockMovement;
  const stockUnit = editTransaction?.stockMovement?.stock?.unit || "QUINTAL";
  const isQuintalUnit = stockUnit === "QUINTAL" || stockUnit === "Quintals";

  // Convert stored KG values to display unit for edit mode
  const initialStockQty = hasStockMovement
    ? (isQuintalUnit ? editTransaction.stockMovement!.quantity / 100 : editTransaction.stockMovement!.quantity).toString()
    : "";
  const initialStockPrice = hasStockMovement
    ? (isQuintalUnit ? editTransaction.stockMovement!.pricePerKg * 100 : editTransaction.stockMovement!.pricePerKg).toString()
    : "";

  const [isStockPurchase, setIsStockPurchase] = useState(hasStockMovement);
  const [stockData, setStockData] = useState({
    stockId: editTransaction?.stockMovement?.stockId || "",
    quantity: initialStockQty,
    quantityUnit: (isQuintalUnit ? "QUINTAL" : "KG") as "KG" | "QUINTAL",
    pricePerUnit: initialStockPrice,
    includeTax: false,
  });

  // Format date for datetime-local input field (YYYY-MM-DDTHH:mm)
  const formatDateTimeForInput = (date: Date | undefined) => {
    const d = date ? new Date(date) : new Date();
    // Format: YYYY-MM-DDTHH:mm (local time)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    accountId: editTransaction?.accountId || accounts[0]?.id || "",
    toAccountId: "",
    amount: editTransaction?.amount?.toString() || "",
    type: (editTransaction?.type || "OUT") as "IN" | "OUT" | "TRANSFER",
    partyId: editTransaction?.partyId || "",
    description: editTransaction?.description || "",
    category: editTransaction?.category || "",
    ledgerType: (editTransaction?.ledgerType || "PARALLEL") as "OFFICIAL" | "PARALLEL",
    paymentMode: (editTransaction?.paymentMode || "CASH") as "CASH" | "CREDIT",
    date: formatDateTimeForInput(editTransaction?.date),
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

    // For transfers, require a destination account
    if (formData.type === "TRANSFER" && !formData.toAccountId) {
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
            paymentMode: formData.partyId ? formData.paymentMode : "CASH",
            date: new Date(formData.date),
            // Stock purchase fields for edit
            stockId: hasStockMovement && stockData.stockId ? stockData.stockId : undefined,
            quantity: hasStockMovement && stockData.quantity ? parseFloat(stockData.quantity) : undefined,
            quantityUnit: hasStockMovement ? stockData.quantityUnit : undefined,
            pricePerUnit: hasStockMovement && stockData.pricePerUnit ? parseFloat(stockData.pricePerUnit) : undefined,
            includeTax: hasStockMovement ? stockData.includeTax : undefined,
          });

          setSuccess(true);
          setTimeout(() => {
            router.back();
          }, 1500);
        } else {
          await createTransaction({
            accountId: formData.accountId,
            toAccountId: formData.type === "TRANSFER" ? formData.toAccountId : undefined,
            amount: parseFloat(formData.amount),
            type: formData.type,
            partyId: formData.partyId || undefined,
            description: formData.description || undefined,
            category: formData.category || undefined,
            ledgerType: formData.ledgerType,
            paymentMode: formData.partyId ? formData.paymentMode : "CASH",
            date: new Date(formData.date),
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
              toAccountId: "",
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
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "OUT", toAccountId: "" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "OUT"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowUpRight size={20} />
              Debit
            </button>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "IN", toAccountId: "" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "IN"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowDownLeft size={20} />
              Credit
            </button>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: "TRANSFER", partyId: "" }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors",
                formData.type === "TRANSFER"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ArrowLeftRight size={20} />
              Transfer
            </button>
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">{formData.type === "TRANSFER" ? "From Account *" : "Account *"}</Label>
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

          {/* To Account Selection - Only for Transfers */}
          {formData.type === "TRANSFER" && (
            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account *</Label>
              <Select
                id="toAccount"
                value={formData.toAccountId}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, toAccountId: e.target.value }))
                }
                required
              >
                <option value="">Select destination account</option>
                {accounts
                  .filter((account) => account.id !== formData.accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
              </Select>
            </div>
          )}

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

          {/* Stock Transaction Toggle - Show for both Credit (sale) and Debit (purchase) */}
          {(formData.type === "OUT" || formData.type === "IN") && (stocks.length > 0 || hasStockMovement) && (
            <div className="space-y-2">
              {/* In edit mode with stock, show editable fields; in create mode, show toggle */}
              {isEditMode && hasStockMovement ? (
                <div className={`space-y-3 p-3 rounded-lg border ${formData.type === "OUT" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-amber-600" />
                    <span className="text-sm font-medium">
                      Stock {editTransaction?.stockMovement?.type === "PURCHASE" ? "Purchase" : "Sale"}
                    </span>
                  </div>

                  {/* Stock Selection */}
                  <div className="space-y-1">
                    <Label htmlFor="stock" className="text-sm">Select Stock *</Label>
                    <Select
                      id="stock"
                      value={stockData.stockId}
                      onChange={(e) => handleStockDataChange({ stockId: e.target.value })}
                      required
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
                        required
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
                      required
                    />
                  </div>

                  {/* Tax checkbox - only show for purchases from non-farmer (trader) */}
                  {formData.type === "OUT" && isTraderPurchase && (
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
                    <div className={`pt-2 border-t space-y-1 ${formData.type === "OUT" ? "border-amber-200" : "border-green-200"}`}>
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
                          <span className={formData.type === "OUT" ? "text-red-600" : "text-green-600"}>{formatINR(totalAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : !isEditMode && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isStockTransaction"
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
                    <Label htmlFor="isStockTransaction" className="flex items-center gap-2 cursor-pointer">
                      <Package size={16} className="text-amber-600" />
                      {formData.type === "OUT" ? "This is a stock purchase" : "This is a stock sale"}
                    </Label>
                  </div>

                  {isStockPurchase && (
                    <div className={`space-y-3 p-3 rounded-lg border ${formData.type === "OUT" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
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

                      {/* Tax checkbox - only show for purchases from non-farmer (trader) */}
                      {formData.type === "OUT" && isTraderPurchase && (
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
                        <div className={`pt-2 border-t space-y-1 ${formData.type === "OUT" ? "border-amber-200" : "border-green-200"}`}>
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
                              <span className={formData.type === "OUT" ? "text-red-600" : "text-green-600"}>{formatINR(totalAmount)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Party Selection - Hide for Transfers */}
          {formData.type !== "TRANSFER" && (
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
          )}

          {/* Payment Mode - Only show when party is selected */}
          {formData.type !== "TRANSFER" && formData.partyId && (
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, paymentMode: "CASH" }))
                  }
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium transition-colors",
                    formData.paymentMode === "CASH"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Cash (Paid)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, paymentMode: "CREDIT" }))
                  }
                  className={cn(
                    "py-2 rounded-lg text-sm font-medium transition-colors",
                    formData.paymentMode === "CREDIT"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Credit (Udhar)
                </button>
              </div>
              {formData.paymentMode === "CREDIT" && (
                <p className="text-xs text-orange-600">
                  This will affect party outstanding balance
                </p>
              )}
            </div>
          )}

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

          {/* Date & Time */}
          <div className="space-y-2">
            <Label htmlFor="date">Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) =>
                setFormData((p) => ({ ...p, date: e.target.value }))
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 text-lg"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 text-lg"
              variant={formData.type === "IN" ? "success" : formData.type === "TRANSFER" ? "warning" : "destructive"}
              disabled={isPending || !formData.accountId || !formData.amount || (formData.type === "TRANSFER" && !formData.toAccountId)}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
