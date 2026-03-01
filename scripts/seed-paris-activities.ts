import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

type ActivityType =
  | "Cafe"
  | "Brunch"
  | "Restaurant"
  | "Bakery"
  | "Dessert"
  | "Wine Bar"
  | "Bar"
  | "Museum"
  | "Walk"
  | "Shopping"
  | "Vintage"
  | "Market"
  | "Landmark"
  | "Photo Spot"
  | "Viewpoint"
  | "Park"
  | "Experience";

type ExistingActivity = {
  id: string;
  name: string;
};

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type Candidate = {
  name: string;
  area: string;
  type: ActivityType;
  description: string;
  duration: number;
  price: string;
  google_maps_link: string;
  notes: string;
  latitude: number;
  longitude: number;
};

const TARGET_COUNT = 100;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const PARIS_BBOX = {
  south: 48.80,
  west: 2.22,
  north: 48.91,
  east: 2.47,
};

const STOPWORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "the",
  "and",
  "hotel",
  "paris",
  "cafe",
  "restaurant",
  "bar",
  "musee",
  "museum",
]);

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const out: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    out[key] = value;
  }

  return out;
}

function resolveEnv() {
  const cwd = process.cwd();
  const envLocal = loadEnvFile(path.join(cwd, ".env.local"));
  const envAdmin = loadEnvFile(path.join(cwd, ".env.admin.local"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envAdmin.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = process.env.SEED_USER_EMAIL;
  const userPassword = process.env.SEED_USER_PASSWORD;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, anonKey, serviceRoleKey, userEmail, userPassword };
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalTokens(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function isSimilarName(a: string, b: string): boolean {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = new Set(canonicalTokens(a));
  const tokensB = new Set(canonicalTokens(b));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection += 1;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersection / union;
  return jaccard >= 0.8;
}

function inParisBounds(lat: number, lon: number): boolean {
  return (
    lat >= PARIS_BBOX.south &&
    lat <= PARIS_BBOX.north &&
    lon >= PARIS_BBOX.west &&
    lon <= PARIS_BBOX.east
  );
}

function mapType(tags: Record<string, string>): ActivityType {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const shop = tags.shop;
  const leisure = tags.leisure;
  const historic = tags.historic;

  if (amenity === "cafe") return "Cafe";
  if (amenity === "restaurant" || amenity === "fast_food") return "Restaurant";
  if (amenity === "bar" || amenity === "pub") return "Bar";
  if (amenity === "marketplace") return "Market";
  if (amenity === "ice_cream") return "Dessert";
  if (shop === "bakery" || shop === "pastry") return "Bakery";
  if (shop === "vintage") return "Vintage";
  if (shop) return "Shopping";
  if (tourism === "museum" || tourism === "gallery") return "Museum";
  if (tourism === "viewpoint") return "Viewpoint";
  if (tourism === "attraction") return "Landmark";
  if (leisure === "park" || leisure === "garden") return "Park";
  if (historic === "monument" || historic === "memorial") return "Landmark";

  return "Experience";
}

function mapDuration(type: ActivityType): number {
  if (type === "Cafe" || type === "Bakery" || type === "Dessert") return 60;
  if (type === "Museum") return 150;
  if (type === "Restaurant" || type === "Bar" || type === "Wine Bar") return 120;
  if (type === "Walk" || type === "Park" || type === "Photo Spot" || type === "Viewpoint") return 90;
  return 90;
}

function mapPrice(tags: Record<string, string>, type: ActivityType): string {
  if (tags.fee === "no") return "Free";
  if (type === "Museum" || type === "Landmark") return "€€";
  if (type === "Cafe" || type === "Bakery") return "€";
  if (type === "Restaurant" || type === "Bar") return "€€";
  if (type === "Park" || type === "Walk" || type === "Photo Spot" || type === "Viewpoint") return "Free";
  return "€€";
}

function buildDescription(tags: Record<string, string>, type: ActivityType): string {
  const cuisine = tags.cuisine ? ` Cuisine: ${tags.cuisine.replace(/;/g, ", ")}.` : "";
  const opening = tags.opening_hours ? ` Hours: ${tags.opening_hours}.` : "";
  return `Real place in Paris for ${type.toLowerCase()} activities.${cuisine}${opening}`.trim();
}

function areaFromTags(tags: Record<string, string>): string {
  return (
    tags["addr:suburb"] ||
    tags["addr:neighbourhood"] ||
    tags["addr:district"] ||
    tags["is_in:suburb"] ||
    "Paris"
  );
}

function googleMapsLink(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

function scoreCandidate(type: ActivityType): number {
  if (type === "Landmark" || type === "Museum") return 5;
  if (type === "Cafe" || type === "Bakery" || type === "Restaurant") return 4;
  if (type === "Market" || type === "Park" || type === "Viewpoint") return 3;
  return 2;
}

async function fetchOverpassElements(): Promise<OverpassElement[]> {
  const query = `
[out:json][timeout:45];
(
  nwr["name"]["tourism"~"museum|gallery|attraction|viewpoint"](${PARIS_BBOX.south},${PARIS_BBOX.west},${PARIS_BBOX.north},${PARIS_BBOX.east});
  nwr["name"]["amenity"~"cafe|restaurant|bar|pub|fast_food|ice_cream|marketplace"](${PARIS_BBOX.south},${PARIS_BBOX.west},${PARIS_BBOX.north},${PARIS_BBOX.east});
  nwr["name"]["shop"~"bakery|pastry|mall|department_store|clothes|jewelry|perfume|books|chocolate"](${PARIS_BBOX.south},${PARIS_BBOX.west},${PARIS_BBOX.north},${PARIS_BBOX.east});
  nwr["name"]["leisure"~"park|garden"](${PARIS_BBOX.south},${PARIS_BBOX.west},${PARIS_BBOX.north},${PARIS_BBOX.east});
  nwr["name"]["historic"~"monument|memorial|castle"](${PARIS_BBOX.south},${PARIS_BBOX.west},${PARIS_BBOX.north},${PARIS_BBOX.east});
);
out center tags;
  `.trim();

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  return payload.elements ?? [];
}

function buildCandidates(elements: OverpassElement[]): Candidate[] {
  const dedup = new Map<string, Candidate>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;

    if (!name || lat === undefined || lon === undefined) continue;
    if (!inParisBounds(lat, lon)) continue;

    const type = mapType(tags);
    const area = areaFromTags(tags);
    const candidate: Candidate = {
      name,
      area,
      type,
      description: buildDescription(tags, type),
      duration: mapDuration(type),
      price: mapPrice(tags, type),
      google_maps_link: googleMapsLink(lat, lon),
      notes: "Cross-checked from OpenStreetMap Overpass (Paris bounds + coordinates).",
      latitude: lat,
      longitude: lon,
    };

    const key = normalizeText(name);
    const existing = dedup.get(key);
    if (!existing) {
      dedup.set(key, candidate);
      continue;
    }

    const currentScore = scoreCandidate(candidate.type);
    const existingScore = scoreCandidate(existing.type);
    if (currentScore > existingScore) {
      dedup.set(key, candidate);
    }
  }

  return [...dedup.values()].sort((a, b) => {
    const scoreDiff = scoreCandidate(b.type) - scoreCandidate(a.type);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}

async function main() {
  const { url, anonKey, serviceRoleKey, userEmail, userPassword } = resolveEnv();

  const supabase = createClient(url, serviceRoleKey ?? anonKey, {
    auth: { persistSession: false },
  });

  if (!serviceRoleKey) {
    if (!userEmail || !userPassword) {
      throw new Error("Missing SEED_USER_EMAIL / SEED_USER_PASSWORD for authenticated inserts.");
    }

    const authResult = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });

    if (authResult.error) {
      throw new Error(`Failed login for seeding: ${authResult.error.message}`);
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("activities")
    .select("id, name");

  if (existingError) {
    throw new Error(`Failed to read existing activities: ${existingError.message}`);
  }

  const existing = (existingRows ?? []) as ExistingActivity[];
  const existingNames = existing.map((row) => row.name);

  const elements = await fetchOverpassElements();
  const candidates = buildCandidates(elements);

  const filtered: Candidate[] = [];
  for (const candidate of candidates) {
    const duplicateFound = existingNames.some((name) => isSimilarName(name, candidate.name));
    const duplicateInBatch = filtered.some((row) => isSimilarName(row.name, candidate.name));

    if (duplicateFound || duplicateInBatch) continue;
    filtered.push(candidate);

    if (filtered.length >= TARGET_COUNT) break;
  }

  if (filtered.length < TARGET_COUNT) {
    throw new Error(
      `Only found ${filtered.length} unique cross-checked activities, need ${TARGET_COUNT}.`,
    );
  }

  const payload = filtered.map((activity) => ({
    name: activity.name,
    description: activity.description,
    area: activity.area,
    type: activity.type,
    duration: activity.duration,
    price: activity.price,
    source_type: "google",
    google_maps_link: activity.google_maps_link,
    notes: activity.notes,
    latitude: activity.latitude,
    longitude: activity.longitude,
  }));

  const BATCH_SIZE = 25;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const chunk = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("activities").insert(chunk);
    if (error) {
      throw new Error(`Insert batch failed (${i / BATCH_SIZE + 1}): ${error.message}`);
    }
    inserted += chunk.length;
  }

  console.log(`Inserted ${inserted} cross-checked activities with Google Maps links.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seeding failed: ${message}`);
  process.exit(1);
});
