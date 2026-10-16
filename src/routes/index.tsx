import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Trash2,
  Clipboard,
  FileText,
  Check,
  ArrowDownUp,
  Sparkles,
  Code2,
  ListFilter,
  AlertCircle,
  Calculator,
  Layers,
  Hash,
  Boxes,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: JsonExtractorPage,
});

interface ExtractedItem {
  number: string;
  amount: number;
  orderNumber?: number;
  finalAmount?: number;
}

interface ParseResult {
  items: ExtractedItem[];
  declaredTotalAmount?: number;
}

// Sample JSON containing 1-100, 3-digit (111, 222, 333, 888), and 4-digit (4444, 5555, 6666)
const SAMPLE_JSON = `[
  { "Number": "44", "Amount": 50, "OrderNumber": 1 },
  { "Number": "99", "Amount": 50, "OrderNumber": 2 },
  { "Number": "32", "Amount": 50, "OrderNumber": 3 },
  { "Number": "87", "Amount": 35, "OrderNumber": 4 },
  { "Number": "67", "Amount": 40, "OrderNumber": 5 },
  { "Number": "50", "Amount": 25, "OrderNumber": 6 },
  { "Number": "5", "Amount": 50, "OrderNumber": 7 },
  { "Number": "95", "Amount": 90, "OrderNumber": 8 },
  { "Number": "59", "Amount": 60, "OrderNumber": 9 },
  { "Number": "111", "Amount": 20, "OrderNumber": 10 },
  { "Number": "222", "Amount": 25, "OrderNumber": 11 },
  { "Number": "333", "Amount": 30, "OrderNumber": 12 },
  { "Number": "888", "Amount": 30, "OrderNumber": 13 },
  { "Number": "4444", "Amount": 10, "OrderNumber": 14 },
  { "Number": "5555", "Amount": 15, "OrderNumber": 15 },
  { "Number": "6666", "Amount": 20, "OrderNumber": 16 }
]`;

function extractNumberAmountPairs(input: string): ParseResult {
  if (!input || !input.trim()) return { items: [] };
  const list: ExtractedItem[] = [];
  let declaredTotal: number | undefined = undefined;

  // 1. Try JSON.parse
  try {
    const parsed = JSON.parse(input);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof parsed.TotalAmount === "number") declaredTotal = parsed.TotalAmount;
      else if (typeof parsed.totalAmount === "number") declaredTotal = parsed.totalAmount;
      else if (typeof parsed.total_amount === "number") declaredTotal = parsed.total_amount;
    }

    function deepSearch(obj: any) {
      if (!obj) return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item && typeof item === "object") {
            const num = item.Number ?? item.number ?? item.Num ?? item.num;
            const amt = item.Amount ?? item.amount ?? item.Amt ?? item.amt;
            if (num !== undefined && amt !== undefined) {
              list.push({
                number: String(num).trim(),
                amount: Number(amt),
                orderNumber: item.OrderNumber ?? item.orderNumber ?? item.order,
                finalAmount: item.FinalAmount ?? item.finalAmount,
              });
              continue;
            }
          }
          deepSearch(item);
        }
      } else if (typeof obj === "object") {
        const num = obj.Number ?? obj.number ?? obj.Num ?? obj.num;
        const amt = obj.Amount ?? obj.amount ?? obj.Amt ?? obj.amt;
        if (num !== undefined && amt !== undefined && !Array.isArray(obj.Detail)) {
          list.push({
            number: String(num).trim(),
            amount: Number(amt),
            orderNumber: obj.OrderNumber ?? obj.orderNumber,
            finalAmount: obj.FinalAmount ?? obj.finalAmount,
          });
        }
        for (const key of Object.keys(obj)) {
          deepSearch(obj[key]);
        }
      }
    }
    deepSearch(parsed);
    if (list.length > 0) return { items: list, declaredTotalAmount: declaredTotal };
  } catch {
    // Fall through to regex
  }

  // 2. Regex fallback for partial/malformed text
  const totalMatch = /"(?:TotalAmount|totalAmount)"\s*:\s*(\d+(?:\.\d+)?)/.exec(input);
  if (totalMatch) declaredTotal = Number(totalMatch[1]);

  const blockRegex = /\{[^{}]*?"(?:Number|number)"\s*:\s*"?([^",\s}]+)"?[^{}]*?"(?:Amount|amount)"\s*:\s*"?([^",\s}]+)"?[^{}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(input)) !== null) {
    list.push({
      number: match[1].trim(),
      amount: Number(match[2].trim()),
    });
  }

  if (list.length === 0) {
    const reverseBlockRegex = /\{[^{}]*?"(?:Amount|amount)"\s*:\s*"?([^",\s}]+)"?[^{}]*?"(?:Number|number)"\s*:\s*"?([^",\s}]+)"?[^{}]*\}/g;
    while ((match = reverseBlockRegex.exec(input)) !== null) {
      list.push({
        number: match[2].trim(),
        amount: Number(match[1].trim()),
      });
    }
  }

  return { items: list, declaredTotalAmount: declaredTotal };
}

// Category classification helper
export function getItemCategoryInfo(numStr: string): {
  is1to100: boolean;
  isAbove100: boolean;
  is3Digit: boolean;
  is4Digit: boolean;
  categoryKey: "1-100" | "3-digit" | "4-digit" | "other-above-100";
  categoryLabel: string;
} {
  const clean = String(numStr).trim();
  const digits = clean.replace(/\D/g, "");
  const numVal = Number(clean);
  const isNumeric = !isNaN(numVal);

  const is1to100 = isNumeric && numVal >= 1 && numVal <= 100;
  const isAbove100 = (isNumeric && numVal > 100) || digits.length >= 3;
  const is3Digit = digits.length === 3 && (numVal > 100 || !isNumeric);
  const is4Digit = digits.length === 4;

  let categoryKey: "1-100" | "3-digit" | "4-digit" | "other-above-100" = "1-100";
  let categoryLabel = "1 - 100";

  if (is1to100) {
    categoryKey = "1-100";
    categoryLabel = "1 - 100";
  } else if (is3Digit) {
    categoryKey = "3-digit";
    categoryLabel = "3-Digit";
  } else if (is4Digit) {
    categoryKey = "4-digit";
    categoryLabel = "4-Digit";
  } else if (isAbove100) {
    categoryKey = "other-above-100";
    categoryLabel = "Above 100";
  }

  return { is1to100, isAbove100, is3Digit, is4Digit, categoryKey, categoryLabel };
}

export function JsonExtractorPage() {
  const [rawInput, setRawInput] = useState(SAMPLE_JSON);
  const [order, setOrder] = useState<"original" | "reverse" | "asc" | "desc">("original");
  const [pairDelim, setPairDelim] = useState("#");
  const [kvDelim, setKvDelim] = useState("=");
  const [activeTab, setActiveTab] = useState("all");
  const [tableFilter, setTableFilter] = useState<"all" | "1-100" | "above-100" | "3-digit" | "4-digit">("all");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const parsedData = useMemo(() => extractNumberAmountPairs(rawInput), [rawInput]);

  // Extracted and sorted data (Preserves Original Functionality!)
  const extractedList = useMemo(() => {
    const sorted = [...parsedData.items];
    if (order === "reverse") {
      sorted.reverse();
    } else if (order === "asc") {
      sorted.sort((a, b) => Number(a.number) - Number(b.number));
    } else if (order === "desc") {
      sorted.sort((a, b) => Number(b.number) - Number(a.number));
    }
    return sorted;
  }, [parsedData.items, order]);

  // Category splits
  const categories = useMemo(() => {
    const list1to100: ExtractedItem[] = [];
    const listAbove100: ExtractedItem[] = [];
    const list3Digit: ExtractedItem[] = [];
    const list4Digit: ExtractedItem[] = [];

    for (const item of extractedList) {
      const info = getItemCategoryInfo(item.number);
      if (info.is1to100) list1to100.push(item);
      if (info.isAbove100) listAbove100.push(item);
      if (info.is3Digit) list3Digit.push(item);
      if (info.is4Digit) list4Digit.push(item);
    }

    const calcSum = (arr: ExtractedItem[]) => arr.reduce((s, x) => s + (isNaN(x.amount) ? 0 : x.amount), 0);
    const toFormat = (arr: ExtractedItem[]) => arr.map((x) => `${x.number}${kvDelim}${x.amount}`).join(pairDelim);

    return {
      all: {
        items: extractedList,
        count: extractedList.length,
        sum: calcSum(extractedList),
        formatted: toFormat(extractedList),
      },
      oneToHundred: {
        items: list1to100,
        count: list1to100.length,
        sum: calcSum(list1to100),
        formatted: toFormat(list1to100),
      },
      aboveHundred: {
        items: listAbove100,
        count: listAbove100.length,
        sum: calcSum(listAbove100),
        formatted: toFormat(listAbove100),
      },
      threeDigit: {
        items: list3Digit,
        count: list3Digit.length,
        sum: calcSum(list3Digit),
        formatted: toFormat(list3Digit),
      },
      fourDigit: {
        items: list4Digit,
        count: list4Digit.length,
        sum: calcSum(list4Digit),
        formatted: toFormat(list4Digit),
      },
    };
  }, [extractedList, pairDelim, kvDelim]);

  // Clean JSON array of only { "Number": "...", "Amount": ... }
  const cleanJsonString = useMemo(() => {
    let targetList = extractedList;
    if (activeTab === "1-100") targetList = categories.oneToHundred.items;
    else if (activeTab === "above-100") targetList = categories.aboveHundred.items;
    else if (activeTab === "3-digit") targetList = categories.threeDigit.items;
    else if (activeTab === "4-digit") targetList = categories.fourDigit.items;

    const cleanArray = targetList.map((item) => ({
      Number: item.number,
      Amount: item.amount,
    }));
    return JSON.stringify(cleanArray, null, 2);
  }, [extractedList, activeTab, categories]);

  // Stats
  const totalCount = extractedList.length;
  const calculatedSum = categories.all.sum;
  const uniqueNumbers = new Set(extractedList.map((x) => x.number)).size;
  const averageAmount = totalCount > 0 ? (calculatedSum / totalCount).toFixed(1) : "0";
  const declaredTotal = parsedData.declaredTotalAmount;
  const hasMismatch = declaredTotal !== undefined && declaredTotal !== calculatedSum;

  // Calculation formula string
  const formulaString = useMemo(() => {
    if (extractedList.length === 0) return "";
    return extractedList.map((x) => x.amount).join(" + ") + ` = ${calculatedSum}`;
  }, [extractedList, calculatedSum]);

  // Filtered list for table
  const filteredTableList = useMemo(() => {
    if (tableFilter === "1-100") return categories.oneToHundred.items;
    if (tableFilter === "above-100") return categories.aboveHundred.items;
    if (tableFilter === "3-digit") return categories.threeDigit.items;
    if (tableFilter === "4-digit") return categories.fourDigit.items;
    return extractedList;
  }, [extractedList, tableFilter, categories]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) {
      toast.error(`Nothing to copy for ${label}!`);
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawInput(text);
      toast.success("Pasted from clipboard!");
    } catch {
      toast.error("Please press Ctrl+V inside the text area.");
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    if (!content) {
      toast.error("No content to download!");
      return;
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  // Get active tab's formatted string
  const currentFormattedString = useMemo(() => {
    switch (activeTab) {
      case "1-100":
        return categories.oneToHundred.formatted;
      case "above-100":
        return categories.aboveHundred.formatted;
      case "3-digit":
        return categories.threeDigit.formatted;
      case "4-digit":
        return categories.fourDigit.formatted;
      case "all":
      default:
        return categories.all.formatted;
    }
  }, [activeTab, categories]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-400 py-1 px-3 uppercase tracking-wider text-xs font-semibold">
            <Sparkles className="size-3.5 mr-1.5 inline" /> Fast Number & Amount Extractor
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
            Extract & Categorize <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">Numbers & Amount</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Paste JSON data. Automatically divides into categories: <span className="text-blue-300 font-semibold">1–100</span>, <span className="text-amber-300 font-semibold">3-Digit (111, 222, 333, 888)</span>, <span className="text-purple-300 font-semibold">4-Digit (4444, 5555, 6666)</span>, aur <span className="text-emerald-300 font-semibold">Above 100</span> with 1-click copy!
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Items Count</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-mono text-white">{totalCount} items</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Items Sum (Calculated)</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-mono text-emerald-400">₹ {calculatedSum.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Unique Numbers</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-mono text-indigo-400">{uniqueNumbers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Average Amount</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-mono text-amber-400">₹ {averageAmount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Categories Breakdown Quick Cards (NEW FEATURE!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category 1: 1 - 100 */}
          <div
            onClick={() => setActiveTab("1-100")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative overflow-hidden ${
              activeTab === "1-100"
                ? "bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40"
                : "bg-slate-900/70 border-slate-800/80 hover:border-blue-500/30 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                <Hash className="size-3.5" /> 1 – 100 Numbers
              </span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[11px] font-mono">
                {categories.oneToHundred.count} items
              </Badge>
            </div>
            <div className="text-xl font-mono font-bold text-white mb-2">
              ₹ {categories.oneToHundred.sum.toLocaleString()}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(categories.oneToHundred.formatted, "1–100 Numbers");
              }}
              className="w-full text-xs h-7 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-500/30"
            >
              {copiedType === "1–100 Numbers" ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
              Copy 1–100 ({categories.oneToHundred.count})
            </Button>
          </div>

          {/* Category 2: 3-Digit Numbers */}
          <div
            onClick={() => setActiveTab("3-digit")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative overflow-hidden ${
              activeTab === "3-digit"
                ? "bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
                : "bg-slate-900/70 border-slate-800/80 hover:border-amber-500/30 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Boxes className="size-3.5" /> 3-Digit (111, 222, 333, 888)
              </span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[11px] font-mono">
                {categories.threeDigit.count} items
              </Badge>
            </div>
            <div className="text-xl font-mono font-bold text-white mb-2">
              ₹ {categories.threeDigit.sum.toLocaleString()}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(categories.threeDigit.formatted, "3-Digit Numbers");
              }}
              className="w-full text-xs h-7 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-500/30"
            >
              {copiedType === "3-Digit Numbers" ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
              Copy 3-Digit ({categories.threeDigit.count})
            </Button>
          </div>

          {/* Category 3: 4-Digit Numbers */}
          <div
            onClick={() => setActiveTab("4-digit")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative overflow-hidden ${
              activeTab === "4-digit"
                ? "bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40"
                : "bg-slate-900/70 border-slate-800/80 hover:border-purple-500/30 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                <Zap className="size-3.5" /> 4-Digit (4444, 5555, 6666)
              </span>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[11px] font-mono">
                {categories.fourDigit.count} items
              </Badge>
            </div>
            <div className="text-xl font-mono font-bold text-white mb-2">
              ₹ {categories.fourDigit.sum.toLocaleString()}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(categories.fourDigit.formatted, "4-Digit Numbers");
              }}
              className="w-full text-xs h-7 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border-purple-500/30"
            >
              {copiedType === "4-Digit Numbers" ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
              Copy 4-Digit ({categories.fourDigit.count})
            </Button>
          </div>

          {/* Category 4: Above 100 (Total 100+) */}
          <div
            onClick={() => setActiveTab("above-100")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative overflow-hidden ${
              activeTab === "above-100"
                ? "bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                : "bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/30 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Layers className="size-3.5" /> Total Above 100
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px] font-mono">
                {categories.aboveHundred.count} items
              </Badge>
            </div>
            <div className="text-xl font-mono font-bold text-white mb-2">
              ₹ {categories.aboveHundred.sum.toLocaleString()}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(categories.aboveHundred.formatted, "Above 100 Numbers");
              }}
              className="w-full text-xs h-7 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/30"
            >
              {copiedType === "Above 100 Numbers" ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
              Copy Above 100 ({categories.aboveHundred.count})
            </Button>
          </div>
        </div>

        {/* Calculation Audit / Breakdown Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400 font-medium">Sum Breakdown:</span>
            <span className="font-mono text-slate-200 overflow-x-auto max-w-xl block whitespace-nowrap">
              {formulaString || "0"}
            </span>
          </div>
          {hasMismatch && (
            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-md">
              <AlertCircle className="size-3.5" />
              <span>Parent TotalAmount ({declaredTotal}) vs Items Sum ({calculatedSum}) Diff: {declaredTotal - calculatedSum}</span>
            </div>
          )}
        </div>

        {/* Control Toolbar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                <ArrowDownUp className="size-3.5" /> Order:
              </span>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="original">Original Order (44=50#99=50#...)</option>
                <option value="reverse">Reverse Order (59=60#95=90#...)</option>
                <option value="asc">Ascending by Number</option>
                <option value="desc">Descending by Number</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Pair Sep:</span>
              <input
                type="text"
                value={pairDelim}
                onChange={(e) => setPairDelim(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md w-12 text-center py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Value Sep:</span>
              <input
                type="text"
                value={kvDelim}
                onChange={(e) => setKvDelim(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md w-12 text-center py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.all.formatted, "All Numbers")}
              className="bg-blue-600 hover:bg-blue-700 text-white border-transparent text-xs"
            >
              {copiedType === "All Numbers" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy All ({totalCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.oneToHundred.formatted, "1-100 Numbers")}
              className="bg-sky-600 hover:bg-sky-700 text-white border-transparent text-xs"
            >
              {copiedType === "1-100 Numbers" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy 1–100 ({categories.oneToHundred.count})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.threeDigit.formatted, "3-Digit Numbers")}
              className="bg-amber-600 hover:bg-amber-700 text-white border-transparent text-xs"
            >
              {copiedType === "3-Digit Numbers" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy 3-Digit ({categories.threeDigit.count})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.fourDigit.formatted, "4-Digit Numbers")}
              className="bg-purple-600 hover:bg-purple-700 text-white border-transparent text-xs"
            >
              {copiedType === "4-Digit Numbers" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy 4-Digit ({categories.fourDigit.count})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(cleanJsonString, "Clean JSON")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-transparent text-xs"
            >
              {copiedType === "Clean JSON" ? <Check className="size-3.5 mr-1" /> : <Code2 className="size-3.5 mr-1" />}
              Copy Clean JSON
            </Button>
          </div>
        </div>

        {/* Input & Output Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-indigo-400" />
                <CardTitle className="text-sm font-semibold text-slate-200">Paste JSON Textarea</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={handlePaste} className="text-xs h-8 text-slate-300 hover:text-white">
                  <Clipboard className="size-3.5 mr-1" /> Paste
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRawInput(SAMPLE_JSON)} className="text-xs h-8 text-slate-300 hover:text-white">
                  Sample Data
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRawInput("")} className="text-xs h-8 text-rose-400 hover:text-rose-300">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste your JSON text here..."
                rows={16}
                className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </CardContent>
          </Card>

          {/* Output Panel with Category Tabs */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                    <TabsList className="bg-slate-950 border border-slate-800 h-8 flex flex-wrap">
                      <TabsTrigger value="all" className="text-xs h-6 px-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        All ({categories.all.count})
                      </TabsTrigger>
                      <TabsTrigger value="1-100" className="text-xs h-6 px-2.5 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
                        1–100 ({categories.oneToHundred.count})
                      </TabsTrigger>
                      <TabsTrigger value="3-digit" className="text-xs h-6 px-2.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        3-Digit ({categories.threeDigit.count})
                      </TabsTrigger>
                      <TabsTrigger value="4-digit" className="text-xs h-6 px-2.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        4-Digit ({categories.fourDigit.count})
                      </TabsTrigger>
                      <TabsTrigger value="above-100" className="text-xs h-6 px-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                        100+ ({categories.aboveHundred.count})
                      </TabsTrigger>
                      <TabsTrigger value="split" className="text-xs h-6 px-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        Split View
                      </TabsTrigger>
                      <TabsTrigger value="json" className="text-xs h-6 px-2.5 data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                        Clean JSON
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const text = activeTab === "json" ? cleanJsonString : currentFormattedString;
                      copyToClipboard(text, activeTab.toUpperCase());
                    }}
                    className="text-xs h-8 text-slate-300 hover:text-white"
                  >
                    <Copy className="size-3.5 mr-1" /> Copy Active
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadFile(activeTab === "json" ? cleanJsonString : currentFormattedString, `${activeTab}-numbers.txt`, activeTab === "json" ? "application/json" : "text/plain")}
                    className="text-xs h-8 text-slate-300 hover:text-white"
                  >
                    <Download className="size-3.5 mr-1" /> Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              {activeTab === "split" ? (
                /* Split View: All Categories Shown Simultaneously */
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {/* Category 1-100 Card */}
                  <div className="bg-slate-950 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-blue-400">1 – 100 Numbers ({categories.oneToHundred.count} items | ₹ {categories.oneToHundred.sum})</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(categories.oneToHundred.formatted, "1-100")} className="h-6 text-[11px] text-blue-300 hover:text-white">
                        <Copy className="size-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      value={categories.oneToHundred.formatted || "No 1-100 numbers found."}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-blue-300 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Category 3-Digit Card */}
                  <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-400">3-Digit Numbers (111, 222, 333, 888...) ({categories.threeDigit.count} items | ₹ {categories.threeDigit.sum})</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(categories.threeDigit.formatted, "3-Digit")} className="h-6 text-[11px] text-amber-300 hover:text-white">
                        <Copy className="size-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      value={categories.threeDigit.formatted || "No 3-digit numbers found."}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-amber-300 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Category 4-Digit Card */}
                  <div className="bg-slate-950 border border-purple-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-purple-400">4-Digit Numbers (4444, 5555, 6666...) ({categories.fourDigit.count} items | ₹ {categories.fourDigit.sum})</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(categories.fourDigit.formatted, "4-Digit")} className="h-6 text-[11px] text-purple-300 hover:text-white">
                        <Copy className="size-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      value={categories.fourDigit.formatted || "No 4-digit numbers found."}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-purple-300 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Category Above 100 Total Card */}
                  <div className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-emerald-400">Total Above 100 ({categories.aboveHundred.count} items | ₹ {categories.aboveHundred.sum})</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(categories.aboveHundred.formatted, "Above 100")} className="h-6 text-[11px] text-emerald-300 hover:text-white">
                        <Copy className="size-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      value={categories.aboveHundred.formatted || "No 100+ numbers found."}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-emerald-300 resize-none focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <textarea
                  readOnly
                  value={activeTab === "json" ? cleanJsonString : currentFormattedString}
                  rows={16}
                  className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 leading-relaxed resize-none focus:outline-none"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Extracted Items Table with Category Filter & Badges */}
        <Card className="bg-slate-900/80 border-slate-800 overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListFilter className="size-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-slate-200">
                Extracted Items Breakdown ({filteredTableList.length} of {totalCount} items)
              </CardTitle>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Button
                size="sm"
                variant={tableFilter === "all" ? "default" : "outline"}
                onClick={() => setTableFilter("all")}
                className={`h-7 text-xs ${tableFilter === "all" ? "bg-indigo-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                All ({totalCount})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === "1-100" ? "default" : "outline"}
                onClick={() => setTableFilter("1-100")}
                className={`h-7 text-xs ${tableFilter === "1-100" ? "bg-blue-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                1–100 ({categories.oneToHundred.count})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === "3-digit" ? "default" : "outline"}
                onClick={() => setTableFilter("3-digit")}
                className={`h-7 text-xs ${tableFilter === "3-digit" ? "bg-amber-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                3-Digit ({categories.threeDigit.count})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === "4-digit" ? "default" : "outline"}
                onClick={() => setTableFilter("4-digit")}
                className={`h-7 text-xs ${tableFilter === "4-digit" ? "bg-purple-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                4-Digit ({categories.fourDigit.count})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === "above-100" ? "default" : "outline"}
                onClick={() => setTableFilter("above-100")}
                className={`h-7 text-xs ${tableFilter === "above-100" ? "bg-emerald-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                Above 100 ({categories.aboveHundred.count})
              </Button>
            </div>
          </CardHeader>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16">#</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Number</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Formatted Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTableList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No items found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredTableList.map((item, idx) => {
                    const info = getItemCategoryInfo(item.number);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 text-slate-400">{item.orderNumber ?? idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-white text-sm">{item.number}</td>
                        <td className="py-2.5 px-4">
                          {info.is4Digit ? (
                            <Badge className="bg-purple-500/15 border-purple-500/40 text-purple-300 text-[10px]">4-Digit</Badge>
                          ) : info.is3Digit ? (
                            <Badge className="bg-amber-500/15 border-amber-500/40 text-amber-300 text-[10px]">3-Digit</Badge>
                          ) : info.is1to100 ? (
                            <Badge className="bg-blue-500/15 border-blue-500/40 text-blue-300 text-[10px]">1 – 100</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 border-emerald-500/40 text-emerald-300 text-[10px]">Above 100</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400 font-bold">₹ {item.amount}</td>
                        <td className="py-2.5 px-4">
                          <span className="bg-blue-950/80 border border-blue-800/50 text-blue-300 px-2 py-0.5 rounded text-[11px]">
                            {item.number}{kvDelim}{item.amount}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
