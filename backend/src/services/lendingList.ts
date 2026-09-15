import { readFileSync } from "fs";
import path from "path";

export interface RegulatedLendingList {
  source: string;
  lastUpdated: string | null;
  apps: string[];
}

const DATA_PATH = path.resolve(__dirname, "../../../data/rbi-regulated-lending-apps.json");

let cache: RegulatedLendingList | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 60_000;

function load(): RegulatedLendingList {
  const now = Date.now();
  if (cache && now - cachedAtMs < CACHE_TTL_MS) return cache;
  const raw = readFileSync(DATA_PATH, "utf-8");
  cache = JSON.parse(raw) as RegulatedLendingList;
  cachedAtMs = now;
  return cache;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface LendingCheckResult {
  appName: string;
  matched: boolean;
  matchedEntry?: string;
  listLastUpdated: string | null;
  listSource: string;
}

export function checkLendingApp(appName: string): LendingCheckResult {
  const list = load();
  const needle = normalize(appName);
  const matchedEntry = list.apps.find((entry) => normalize(entry) === needle);
  return {
    appName,
    matched: Boolean(matchedEntry),
    matchedEntry,
    listLastUpdated: list.lastUpdated,
    listSource: list.source,
  };
}
