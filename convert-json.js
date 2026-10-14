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
  const totalAmount = pairs.reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);

  console.log(`\nExtracted ${pairs.length} items (Total Amount: ${totalAmount}) from: ${targetPath}`);
  console.log(`Order: ${order}\n`);
  console.log('--- FORMATTED RESULT ---');
  console.log(formatPairs(pairs, { order }));
  console.log('------------------------\n');
}
