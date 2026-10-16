#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Extracts Number and Amount pairs from JSON or raw text.
 * Works with full JSON, arrays, nested objects, or raw partial strings.
 */
export function extractNumberAmountPairs(input) {
  const list = [];

  // Try standard JSON parse first
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;

    function deepSearch(obj) {
      if (!obj) return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item && typeof item === 'object') {
            const num = item.Number ?? item.number ?? item.Num ?? item.num;
            const amt = item.Amount ?? item.amount ?? item.Amt ?? item.amt;
            if (num !== undefined && amt !== undefined) {
              list.push({ number: String(num).trim(), amount: Number(amt) });
              continue;
            }
          }
          deepSearch(item);
        }
      } else if (typeof obj === 'object') {
        const num = obj.Number ?? obj.number ?? obj.Num ?? obj.num;
        const amt = obj.Amount ?? obj.amount ?? obj.Amt ?? obj.amt;
        if (num !== undefined && amt !== undefined && !Array.isArray(obj.Detail)) {
          list.push({ number: String(num).trim(), amount: Number(amt) });
        }
        for (const key of Object.keys(obj)) {
          deepSearch(obj[key]);
        }
      }
    }

    deepSearch(parsed);
    if (list.length > 0) return list;
  } catch (err) {
    // Ignore JSON parse errors, proceed to regex fallback
  }

  // Fallback: Regex extraction if JSON parse failed or no pairs found
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  const blockRegex = /\{[^{}]*?"(?:Number|number)"\s*:\s*"?([^",\s}]+)"?[^{}]*?"(?:Amount|amount)"\s*:\s*"?([^",\s}]+)"?[^{}]*\}/g;
  let match;
  while ((match = blockRegex.exec(raw)) !== null) {
    list.push({
      number: match[1].trim(),
      amount: Number(match[2].trim())
    });
  }

  if (list.length === 0) {
    const reverseBlockRegex = /\{[^{}]*?"(?:Amount|amount)"\s*:\s*"?([^",\s}]+)"?[^{}]*?"(?:Number|number)"\s*:\s*"?([^",\s}]+)"?[^{}]*\}/g;
    while ((match = reverseBlockRegex.exec(raw)) !== null) {
      list.push({
        number: match[2].trim(),
        amount: Number(match[1].trim())
      });
    }
  }

  return list;
}

/**
 * Categorize a number string:
 * - 1-100: Numbers between 1 and 100
 * - 3-digit: Exactly 3 digits (111, 222, 333, 888...) and > 100
 * - 4-digit: Exactly 4 digits (4444, 5555, 6666...)
 * - above-100: All numbers > 100 or >= 3 digits
 */
export function categorizeItem(numStr) {
  const clean = String(numStr).trim();
  const digits = clean.replace(/\D/g, '').length;
  const val = Number(clean);
  const isNum = !isNaN(val);

  const is1to100 = isNum && val >= 1 && val <= 100;
  const isAbove100 = (isNum && val > 100) || digits >= 3;
  const is3Digit = digits === 3 && (val > 100 || !isNum);
  const is4Digit = digits === 4;

  let label = '1 – 100';
  if (is4Digit) label = '4-Digit';
  else if (is3Digit) label = '3-Digit';
  else if (isAbove100) label = 'Above 100';

  return { is1to100, isAbove100, is3Digit, is4Digit, label };
}

/**
 * Formats pairs into `<Number>=<Amount>#<Number>=<Amount>#...`
 */
export function formatPairs(pairs, options = {}) {
  const {
    pairDelimiter = '#',
    kvDelimiter = '=',
    order = 'original', // 'original' | 'reverse' | 'asc' | 'desc'
  } = options;

  let sorted = [...pairs];
  if (order === 'reverse') {
    sorted.reverse();
  } else if (order === 'asc') {
    sorted.sort((a, b) => Number(a.number) - Number(b.number));
  } else if (order === 'desc') {
    sorted.sort((a, b) => Number(b.number) - Number(a.number));
  }

  return sorted.map(p => `${p.number}${kvDelimiter}${p.amount}`).join(pairDelimiter);
}

// CLI execution
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const targetPath = args.find(a => !a.startsWith('--')) || 'C:/Users/Admin/.gemini/antigravity-ide/brain/c97c6dac-615a-4024-9b2d-537408191d57/browser/Untitled-1.js';
  const order = args.includes('--reverse') ? 'reverse' : (args.includes('--asc') ? 'asc' : (args.includes('--desc') ? 'desc' : 'original'));

  if (!fs.existsSync(targetPath)) {
    console.error(`Error: File not found: ${targetPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  const pairs = extractNumberAmountPairs(content);

  let sorted = [...pairs];
  if (order === 'reverse') sorted.reverse();
  else if (order === 'asc') sorted.sort((a, b) => Number(a.number) - Number(b.number));
  else if (order === 'desc') sorted.sort((a, b) => Number(b.number) - Number(a.number));

  const list1to100 = [];
  const listAbove100 = [];
  const list3Digit = [];
  const list4Digit = [];

  sorted.forEach(p => {
    const cat = categorizeItem(p.number);
    if (cat.is1to100) list1to100.push(p);
    if (cat.isAbove100) listAbove100.push(p);
    if (cat.is3Digit) list3Digit.push(p);
    if (cat.is4Digit) list4Digit.push(p);
  });

  const sumAll = sorted.reduce((s, x) => s + (isNaN(x.amount) ? 0 : x.amount), 0);
  const sum1to100 = list1to100.reduce((s, x) => s + (isNaN(x.amount) ? 0 : x.amount), 0);
  const sum3Digit = list3Digit.reduce((s, x) => s + (isNaN(x.amount) ? 0 : x.amount), 0);
  const sum4Digit = list4Digit.reduce((s, x) => s + (isNaN(x.amount) ? 0 : x.amount), 0);
  const sumAbove100 = listAbove100.reduce((s, x) => s + (isNaN(x.amount) ? 0 : x.amount), 0);

  console.log(`\n======================================================`);
  console.log(`Extracted: ${pairs.length} items (Total: ₹ ${sumAll}) from: ${targetPath}`);
  console.log(`Order: ${order}`);
  console.log(`======================================================\n`);

  console.log(`🔹 [1] ALL NUMBERS (${sorted.length} items, ₹ ${sumAll}):`);
  console.log(formatPairs(sorted, { order }));

  console.log(`\n🔹 [2] 1–100 NUMBERS (${list1to100.length} items, ₹ ${sum1to100}):`);
  console.log(formatPairs(list1to100, { order }) || 'None');

  console.log(`\n🔹 [3] 3-DIGIT NUMBERS (111, 222, 333, 888...) (${list3Digit.length} items, ₹ ${sum3Digit}):`);
  console.log(formatPairs(list3Digit, { order }) || 'None');

  console.log(`\n🔹 [4] 4-DIGIT NUMBERS (4444, 5555, 6666...) (${list4Digit.length} items, ₹ ${sum4Digit}):`);
  console.log(formatPairs(list4Digit, { order }) || 'None');

  console.log(`\n🔹 [5] TOTAL ABOVE 100 (${listAbove100.length} items, ₹ ${sumAbove100}):`);
  console.log(formatPairs(listAbove100, { order }) || 'None');
  console.log(`\n======================================================\n`);
}
