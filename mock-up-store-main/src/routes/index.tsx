import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Copy, Download, Trash2, Clipboard, FileText, Check, ArrowDownUp, Sparkles, Code2, ListFilter, AlertCircle, Calculator } from "lucide-react";
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

const SAMPLE_JSON = `[
  { "Number": "44", "Amount": 50, "OrderNumber": 1 },
  { "Number": "99", "Amount": 50, "OrderNumber": 2 },
  { "Number": "32", "Amount": 50, "OrderNumber": 3 },
  { "Number": "87", "Amount": 35, "OrderNumber": 4 },
  { "Number": "67", "Amount": 40, "OrderNumber": 5 },
  { "Number": "50", "Amount": 25, "OrderNumber": 6 },
  { "Number": "5", "Amount": 50, "OrderNumber": 7 },
  { "Number": "95", "Amount": 90, "OrderNumber": 8 },
  { "Number": "59", "Amount": 60, "OrderNumber": 9 }
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
  } catch (err) {
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

export function JsonExtractorPage() {
  const [rawInput, setRawInput] = useState(SAMPLE_JSON);
  // Default to original order so 44=50#99=50#... matches user's exact paste
  const [order, setOrder] = useState<"original" | "reverse" | "asc" | "desc">("original");
  const [pairDelim, setPairDelim] = useState("#");
  const [kvDelim, setKvDelim] = useState("=");
  const [activeTab, setActiveTab] = useState("text");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const parsedData = useMemo(() => extractNumberAmountPairs(rawInput), [rawInput]);

  // Extracted and sorted data
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

  // Formatted string: Number=Amount#...
  const formattedString = useMemo(() => {
    return extractedList.map((item) => `${item.number}${kvDelim}${item.amount}`).join(pairDelim);
  }, [extractedList, pairDelim, kvDelim]);

  // Clean JSON array of only { "Number": "...", "Amount": ... }
  const cleanJsonString = useMemo(() => {
    const cleanArray = extractedList.map((item) => ({
      Number: item.number,
      Amount: item.amount,
    }));
    return JSON.stringify(cleanArray, null, 2);
  }, [extractedList]);

  // Stats
  const totalCount = extractedList.length;
  const calculatedSum = extractedList.reduce((sum, item) => sum + (isNaN(item.amount) ? 0 : item.amount), 0);
  const uniqueNumbers = new Set(extractedList.map((x) => x.number)).size;
  const averageAmount = totalCount > 0 ? (calculatedSum / totalCount).toFixed(1) : "0";
  const declaredTotal = parsedData.declaredTotalAmount;
  const hasMismatch = declaredTotal !== undefined && declaredTotal !== calculatedSum;

  // Calculation formula string: 50 + 50 + 50 + 35... = 450
  const formulaString = useMemo(() => {
    if (extractedList.length === 0) return "";
    return extractedList.map((x) => x.amount).join(" + ") + ` = ${calculatedSum}`;
  }, [extractedList, calculatedSum]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) {
      toast.error("Nothing to copy!");
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
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-400 py-1 px-3 uppercase tracking-wider text-xs font-semibold">
            <Sparkles className="size-3.5 mr-1.5 inline" /> Fast Number & Amount Extractor
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
            Extract <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Number & Amount</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Paste your JSON text below. It extracts only <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded text-xs font-mono">{`{ "Number": "1", "Amount": 5 }`}</code> in original sequence into <code className="text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded text-xs font-mono">Number=Amount#</code>.
          </p>
        </div>

        {/* Stats Row */}
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

        {/* Calculation Audit / Breakdown Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Sum Breakdown:</span>
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

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(formattedString, "Format String")}
              className="bg-blue-600 hover:bg-blue-700 text-white border-transparent text-xs"
            >
              {copiedType === "Format String" ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              Copy Number=Amount#
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
                className="w-full h-[380px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </CardContent>
          </Card>

          {/* Output Panel */}
          <Card className="bg-slate-900/80 border-slate-800 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList className="bg-slate-950 border border-slate-800 h-8">
                    <TabsTrigger value="text" className="text-xs h-6 px-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                      Formatted String ({totalCount})
                    </TabsTrigger>
                    <TabsTrigger value="json" className="text-xs h-6 px-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                      Clean JSON Array
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadFile(activeTab === "text" ? formattedString : cleanJsonString, activeTab === "text" ? "formatted-pairs.txt" : "clean-data.json", activeTab === "text" ? "text/plain" : "application/json")}
                  className="text-xs h-8 text-slate-300 hover:text-white"
                >
                  <Download className="size-3.5 mr-1" /> Download
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <textarea
                readOnly
                value={activeTab === "text" ? formattedString : cleanJsonString}
                rows={16}
                className="w-full h-[380px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 leading-relaxed resize-none focus:outline-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Extracted Items Table */}
        <Card className="bg-slate-900/80 border-slate-800 overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ListFilter className="size-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-slate-200">
                Extracted Items Breakdown ({totalCount} items)
              </CardTitle>
            </div>
          </CardHeader>
          <div className="max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16">#</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Number</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Formatted Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {extractedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                      No Number & Amount items found. Paste JSON above.
                    </td>
                  </tr>
                ) : (
                  extractedList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-slate-400">{item.orderNumber ?? idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{item.number}</td>
                      <td className="py-2.5 px-4 text-emerald-400 font-bold">₹ {item.amount}</td>
                      <td className="py-2.5 px-4">
                        <span className="bg-blue-950/80 border border-blue-800/50 text-blue-300 px-2 py-0.5 rounded text-[11px]">
                          {item.number}{kvDelim}{item.amount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
