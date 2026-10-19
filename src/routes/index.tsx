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
  Hash,
  Boxes,
  Layers,
  Columns2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Sample JSON containing 1-100 numbers and 101-9999 numbers (like 999, 888, 4444)
const SAMPLE_JSON = `[
  { "Number": "39", "Amount": 250, "OrderNumber": 1 },
  { "Number": "79", "Amount": 250, "OrderNumber": 2 },
  { "Number": "89", "Amount": 250, "OrderNumber": 3 },
  { "Number": "99", "Amount": 250, "OrderNumber": 4 },
  { "Number": "999", "Amount": 100, "OrderNumber": 5 },
  { "Number": "11", "Amount": 100, "OrderNumber": 6 },
  { "Number": "12", "Amount": 100, "OrderNumber": 7 },
  { "Number": "13", "Amount": 100, "OrderNumber": 8 },
  { "Number": "16", "Amount": 100, "OrderNumber": 9 },
  { "Number": "17", "Amount": 100, "OrderNumber": 10 },
  { "Number": "18", "Amount": 100, "OrderNumber": 11 },
  { "Number": "21", "Amount": 100, "OrderNumber": 12 },
  { "Number": "888", "Amount": 50, "OrderNumber": 13 },
  { "Number": "4444", "Amount": 20, "OrderNumber": 14 }
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

// Categorization logic: 1-100 (or 1-101) vs 101-9999
export function categorizeNumber(
  numStr: string,
  cutoff: number = 100
): {
  is1to100: boolean;
  is101to9999: boolean;
  categoryKey: "1-100" | "101-9999";
  categoryLabel: string;
} {
  const clean = String(numStr).trim();
  const digits = clean.replace(/\D/g, "");
  const numVal = Number(clean);
  const isNumeric = !isNaN(numVal);

  // If number is <= cutoff (100 or 101) and within standard range
  const is1to100 = isNumeric && numVal >= 1 && numVal <= cutoff;
  // If number is > cutoff or has 3 or 4 digits (e.g. 999, 888, 4444) up to 9999
  const is101to9999 = (isNumeric && numVal > cutoff && numVal <= 9999) || (!is1to100 && digits.length >= 3);

  return {
    is1to100,
    is101to9999,
    categoryKey: is1to100 ? "1-100" : "101-9999",
    categoryLabel: is1to100 ? (cutoff === 101 ? "1 – 101" : "1 – 100") : "101 – 9999",
  };
}

export function JsonExtractorPage() {
  const [rawInput, setRawInput] = useState(SAMPLE_JSON);
  const [order, setOrder] = useState<"original" | "reverse" | "asc" | "desc">("original");
  const [cutoff, setCutoff] = useState<number>(100); // 100 by default (1-100 & 101-9999) or 101
  const [pairDelim, setPairDelim] = useState("#");
  const [kvDelim, setKvDelim] = useState("=");
  // Default active tab is 'split' (shows BOTH 1-100 and 101-9999 side-by-side cleanly separated!)
  const [activeTab, setActiveTab] = useState<"split" | "1-100" | "101-9999" | "all" | "json">("split");
  const [tableFilter, setTableFilter] = useState<"all" | "1-100" | "101-9999">("all");
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

  // Two primary categories: 1-100 & 101-9999
  const categories = useMemo(() => {
    const list1to100: ExtractedItem[] = [];
    const list101to9999: ExtractedItem[] = [];

    for (const item of extractedList) {
      const cat = categorizeNumber(item.number, cutoff);
      if (cat.is1to100) {
        list1to100.push(item);
      } else {
        list101to9999.push(item);
      }
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
        items: list101to9999,
        count: list101to9999.length,
        sum: calcSum(list101to9999),
        formatted: toFormat(list101to9999),
      },
    };
  }, [extractedList, pairDelim, kvDelim, cutoff]);

  // Clean JSON array of only { "Number": "...", "Amount": ... }
  const cleanJsonString = useMemo(() => {
    let targetList = extractedList;
    if (activeTab === "1-100") targetList = categories.oneToHundred.items;
    else if (activeTab === "101-9999") targetList = categories.aboveHundred.items;

    const cleanArray = targetList.map((item) => ({
      Number: item.number,
      Amount: item.amount,
    }));
    return JSON.stringify(cleanArray, null, 2);
  }, [extractedList, activeTab, categories]);

  // Overall Stats
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
    if (tableFilter === "101-9999") return categories.aboveHundred.items;
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

  const label1to100 = cutoff === 101 ? "1 – 101" : "1 – 100";
  const label101to9999 = cutoff === 101 ? "102 – 9999" : "101 – 9999";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-400 py-1 px-3 uppercase tracking-wider text-xs font-semibold">
            <Sparkles className="size-3.5 mr-1.5 inline" /> Fast Number & Amount Extractor
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
            <span className="text-blue-400">{label1to100}</span> &{" "}
            <span className="bg-gradient-to-r from-purple-400 to-amber-300 bg-clip-text text-transparent">
              {label101to9999}
            </span>{" "}
            Separate Extractor
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Paste JSON data. Automatically divides into two clean, separate categories:{" "}
            <span className="text-blue-300 font-bold">{label1to100} Numbers</span> aur{" "}
            <span className="text-amber-300 font-bold">{label101to9999} Numbers</span> (jaise 999, 888, 4444).
          </p>
        </div>

        {/* Two Spotlight Category Cards: 1-100 & 101-9999 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Spotlight Card 1: 1 - 100 */}
          <div
            onClick={() => setActiveTab("1-100")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              activeTab === "1-100" || activeTab === "split"
                ? "bg-blue-950/40 border-blue-500/60 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/50"
                : "bg-slate-900/70 border-slate-800/80 hover:border-blue-500/30 hover:bg-slate-900"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-400">
                  <Hash className="size-4" /> Category: {label1to100} Numbers
                </span>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs px-2.5 py-0.5 font-mono">
                  {categories.oneToHundred.count} items
                </Badge>
              </div>
              <div className="text-3xl font-mono font-extrabold text-white mb-1">
                ₹ {categories.oneToHundred.sum.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mb-4">Standard 1 to 100 single & double digit numbers</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(categories.oneToHundred.formatted, label1to100);
                }}
                className="flex-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
              >
                {copiedType === label1to100 ? <Check className="size-3.5 mr-1.5" /> : <Copy className="size-3.5 mr-1.5" />}
                Copy {label1to100} ({categories.oneToHundred.count})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("1-100");
                }}
                className="text-xs border-blue-500/30 text-blue-300 hover:bg-blue-950/50"
              >
                View
              </Button>
            </div>
          </div>

          {/* Spotlight Card 2: 101 - 9999 */}
          <div
            onClick={() => setActiveTab("101-9999")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              activeTab === "101-9999" || activeTab === "split"
                ? "bg-purple-950/40 border-purple-500/60 shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/50"
                : "bg-slate-900/70 border-slate-800/80 hover:border-purple-500/30 hover:bg-slate-900"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-400">
                  <Boxes className="size-4" /> Category: {label101to9999} Numbers
                </span>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs px-2.5 py-0.5 font-mono">
                  {categories.aboveHundred.count} items
                </Badge>
              </div>
              <div className="text-3xl font-mono font-extrabold text-white mb-1">
                ₹ {categories.aboveHundred.sum.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mb-4">3-digit & 4-digit numbers (jaise 999, 888, 111, 4444...)</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(categories.aboveHundred.formatted, label101to9999);
                }}
                className="flex-1 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
              >
                {copiedType === label101to9999 ? <Check className="size-3.5 mr-1.5" /> : <Copy className="size-3.5 mr-1.5" />}
                Copy {label101to9999} ({categories.aboveHundred.count})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("101-9999");
                }}
                className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-950/50"
              >
                View
              </Button>
            </div>
          </div>
        </div>

        {/* Global Summary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Items</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl font-mono text-white">{totalCount} items</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Amount Sum</CardDescription>
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
            {/* Order Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                <ArrowDownUp className="size-3.5" /> Order:
              </span>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="original">Original Order (As Pasted)</option>
                <option value="reverse">Reverse Order</option>
                <option value="asc">Ascending by Number</option>
                <option value="desc">Descending by Number</option>
              </select>
            </div>

            {/* Range Cutoff Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                <Layers className="size-3.5" /> Range Cutoff:
              </span>
              <select
                value={cutoff}
                onChange={(e) => setCutoff(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value={100}>1–100 & 101–9999 (Standard)</option>
                <option value={101}>1–101 & 102–9999</option>
              </select>
            </div>

            {/* Delimiters */}
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

          {/* Quick Copy Toolbar Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.oneToHundred.formatted, label1to100)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-transparent text-xs"
            >
              {copiedType === label1to100 ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy {label1to100} ({categories.oneToHundred.count})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.aboveHundred.formatted, label101to9999)}
              className="bg-purple-600 hover:bg-purple-700 text-white border-transparent text-xs"
            >
              {copiedType === label101to9999 ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy {label101to9999} ({categories.aboveHundred.count})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(categories.all.formatted, "All Numbers")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
            >
              {copiedType === "All Numbers" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy All ({totalCount})
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
                className="w-full h-[420px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </CardContent>
          </Card>

          {/* Output Panel with Clean Tabs: Separate View / 1-100 / 101-9999 / All / Clean JSON */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                    <TabsList className="bg-slate-950 border border-slate-800 h-8 flex flex-wrap">
                      <TabsTrigger value="split" className="text-xs h-6 px-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Columns2 className="size-3 mr-1 inline" /> Separate View (Both)
                      </TabsTrigger>
                      <TabsTrigger value="1-100" className="text-xs h-6 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        {label1to100} ({categories.oneToHundred.count})
                      </TabsTrigger>
                      <TabsTrigger value="101-9999" className="text-xs h-6 px-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        {label101to9999} ({categories.aboveHundred.count})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="text-xs h-6 px-2.5 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                        All ({categories.all.count})
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
                      if (activeTab === "split") {
                        copyToClipboard(`${categories.oneToHundred.formatted}\n\n${categories.aboveHundred.formatted}`, "Both Categories");
                      } else if (activeTab === "1-100") {
                        copyToClipboard(categories.oneToHundred.formatted, label1to100);
                      } else if (activeTab === "101-9999") {
                        copyToClipboard(categories.aboveHundred.formatted, label101to9999);
                      } else if (activeTab === "json") {
                        copyToClipboard(cleanJsonString, "Clean JSON");
                      } else {
                        copyToClipboard(categories.all.formatted, "All Numbers");
                      }
                    }}
                    className="text-xs h-8 text-slate-300 hover:text-white"
                  >
                    <Copy className="size-3.5 mr-1" /> Copy Active
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const text =
                        activeTab === "1-100"
                          ? categories.oneToHundred.formatted
                          : activeTab === "101-9999"
                          ? categories.aboveHundred.formatted
                          : activeTab === "json"
                          ? cleanJsonString
                          : categories.all.formatted;
                      downloadFile(text, `${activeTab}-numbers.txt`, activeTab === "json" ? "application/json" : "text/plain");
                    }}
                    className="text-xs h-8 text-slate-300 hover:text-white"
                  >
                    <Download className="size-3.5 mr-1" /> Download
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1">
              {/* SEPARATE VIEW: Shows 1-100 & 101-9999 in two clean separate boxes! */}
              {activeTab === "split" && (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {/* Category 1: 1 - 100 */}
                  <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                          {label1to100} Numbers ({categories.oneToHundred.count} items | ₹ {categories.oneToHundred.sum})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(categories.oneToHundred.formatted, label1to100)}
                        className="h-6 text-[11px] px-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-500/30"
                      >
                        <Copy className="size-3 mr-1" /> Copy {label1to100}
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={4}
                      value={categories.oneToHundred.formatted || `No ${label1to100} numbers found.`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-blue-300 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Category 2: 101 - 9999 */}
                  <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                          {label101to9999} Numbers (jaise 999, 888...) ({categories.aboveHundred.count} items | ₹ {categories.aboveHundred.sum})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(categories.aboveHundred.formatted, label101to9999)}
                        className="h-6 text-[11px] px-2.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border-purple-500/30"
                      >
                        <Copy className="size-3 mr-1" /> Copy {label101to9999}
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      rows={4}
                      value={categories.aboveHundred.formatted || `No ${label101to9999} numbers found.`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-purple-300 resize-none focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Single Category Focus Views */}
              {activeTab === "1-100" && (
                <textarea
                  readOnly
                  value={categories.oneToHundred.formatted || `No ${label1to100} numbers found.`}
                  rows={16}
                  className="w-full h-[420px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-blue-300 leading-relaxed resize-none focus:outline-none"
                />
              )}

              {activeTab === "101-9999" && (
                <textarea
                  readOnly
                  value={categories.aboveHundred.formatted || `No ${label101to9999} numbers found.`}
                  rows={16}
                  className="w-full h-[420px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-purple-300 leading-relaxed resize-none focus:outline-none"
                />
              )}

              {activeTab === "all" && (
                <textarea
                  readOnly
                  value={categories.all.formatted || "No numbers found."}
                  rows={16}
                  className="w-full h-[420px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 leading-relaxed resize-none focus:outline-none"
                />
              )}

              {activeTab === "json" && (
                <textarea
                  readOnly
                  value={cleanJsonString}
                  rows={16}
                  className="w-full h-[420px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-pink-300 leading-relaxed resize-none focus:outline-none"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Extracted Items Table with Clean Category Filter (1-100 & 101-9999) */}
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
                variant={tableFilter === "1-100" ? "default" : "outline"}
                onClick={() => setTableFilter("1-100")}
                className={`h-7 text-xs ${tableFilter === "1-100" ? "bg-blue-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                {label1to100} ({categories.oneToHundred.count})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === "101-9999" ? "default" : "outline"}
                onClick={() => setTableFilter("101-9999")}
                className={`h-7 text-xs ${tableFilter === "101-9999" ? "bg-purple-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                {label101to9999} ({categories.aboveHundred.count})
              </Button>
              <Button
                size="sm"
                variant={tableFilter === "all" ? "default" : "outline"}
                onClick={() => setTableFilter("all")}
                className={`h-7 text-xs ${tableFilter === "all" ? "bg-indigo-600 text-white" : "border-slate-800 text-slate-400"}`}
              >
                All ({totalCount})
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
                    const cat = categorizeNumber(item.number, cutoff);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 text-slate-400">{item.orderNumber ?? idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-white text-sm">{item.number}</td>
                        <td className="py-2.5 px-4">
                          {cat.is1to100 ? (
                            <Badge className="bg-blue-500/15 border-blue-500/40 text-blue-300 text-[10px]">
                              {label1to100}
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/15 border-purple-500/40 text-purple-300 text-[10px]">
                              {label101to9999}
                            </Badge>
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
