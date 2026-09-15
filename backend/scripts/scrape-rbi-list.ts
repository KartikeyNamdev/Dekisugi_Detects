/**
 * Populates /data/rbi-regulated-lending-apps.json from RBI's public
 * "Digital Lending Apps (DLAs) Deployed by Regulated Entities" directory,
 * live on rbi.org.in since 2025-07-01 (Citizen's Corner section).
 *
 * TODO: the exact page URL / export format wasn't confirmed at scaffold
 * time — find it under rbi.org.in > Citizen's Corner > "DLAs Deployed by
 * Regulated Entities" and wire the real fetch + parse below. Until then,
 * /data/rbi-regulated-lending-apps.json ships with an empty `apps` list
 * so GET /api/lending-check works end-to-end (every lookup reports
 * "not matched") without blocking the rest of the build.
 *
 * Run with: npx ts-node scripts/scrape-rbi-list.ts
 */
import { writeFileSync } from "fs";
import path from "path";

const OUTPUT_PATH = path.resolve(__dirname, "../../data/rbi-regulated-lending-apps.json");
const SOURCE_URL = "https://www.rbi.org.in/"; // TODO: replace with the exact DLA directory URL

async function main() {
  console.log(`TODO: fetch and parse the DLA directory from ${SOURCE_URL}`);
  console.log("Writing an empty placeholder list so downstream code keeps working.");

  const payload = {
    source: SOURCE_URL + " — Citizen's Corner > DLAs Deployed by Regulated Entities",
    lastUpdated: new Date().toISOString().slice(0, 10),
    apps: [] as string[],
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
