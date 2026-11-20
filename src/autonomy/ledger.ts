/**
 * Ledger format: one JSON entry per line, append-only.
 * @req FR:autonomy/ledger.@file
 */

import type { LedgerEntry } from './types';

/** One ledger line, without the newline. */
export function formatEntry(entry: LedgerEntry): string {
  return JSON.stringify(entry);
}

/**
 * Entries from ledger text, skipping lines that are not valid entries.
 * @req FR:autonomy/ledger.unreadable
 */
export function parseLedger(text: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {continue;}
    try {
      const e = JSON.parse(line) as LedgerEntry;
      if (e && typeof e.at === 'string' && typeof e.action === 'string') {entries.push(e);}
    } catch {
      // Unreadable line: skip
    }
  }
  return entries;
}
