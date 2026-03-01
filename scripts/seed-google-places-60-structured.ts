import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

type AllowedType =
  | "Cafe"
  | "Bakery"
  | "Restaurant"
  | "Wine Bar"
  | "Bar"
  | "Museum"
  | "Landmark"
  | "Park"
  | "Market"
  | "Viewpoint"
  | "Walk Area"
  | "Shopping Area"
  | "Dessert";

type ExistingActivity = {
  id: string;
  name: string;
};

type GooglePriceLevel =
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE"
  | "PRICE_LEVEL_UNSPECIFIED";

type Place = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: GooglePriceLevel;
  types?: string[];
};

type SearchResponse = {
  places?: Place[];
  nextPageToken?: string;
};

type Candidate = {
  name: string;
  type: AllowedType;
  rating: number;
  reviews: number;
  price_level: string;
  description_gr: string;
  google_maps_link: string;
  address: string;
};

const MIN_RATING = 4.3;
const MIN_REVIEWS = 80;
const TARGET_TOTAL = 60;

const TARGETS: Record<AllowedType, number> = {
  Cafe: 5,
  Bakery: 5,
  Restaurant: 7,
  "Wine Bar": 4,
  Bar: 4,
  Museum: 5,
  Landmark: 5,
  Park: 4,
  Market: 4,
  Viewpoint: 3,
  "Walk Area": 4,
  "Shopping Area": 5,
  Dessert: 5,
};

const PARIS_VIEWPORT = {
  low: { latitude: 48.80, longitude: 2.22 },
  high: { latitude: 48.91, longitude: 2.47 },
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
  "paris",
  "cafe",
  "restaurant",
  "museum",
  "musee",
  "bar",
  "shop",
]);

const DISALLOWED_KEYWORDS = [
  "pharmacy",
  "pharmacie",
  "dentist",
  "dental",
  "bank",
  "office",
  "logistics",
  "repair",
  "warehouse",
  "storage",
  "car rental",
  "clinic",
  "hospital",
];

const DISALLOWED_GOOGLE_TYPES = new Set([
  "pharmacy",
  "drugstore",
  "dentist",
  "bank",
  "atm",
  "car_rental",
  "storage",
  "warehouse_store",
  "post_office",
  "insurance_agency",
  "accounting",
  "hospital",
  "doctor",
]);

const QUERIES: Record<AllowedType, string[]> = {
  Cafe: [
    "famous cafe Paris France",
    "best coffee shop Paris France",
    "aesthetic cafe Paris France",
  ],
  Bakery: [
    "best bakery Paris France",
    "famous boulangerie Paris France",
    "top pastry bakery Paris France",
  ],
  Restaurant: [
    "famous restaurant Paris France",
    "best bistro Paris France",
    "top lunch restaurant Paris France",
  ],
  "Wine Bar": [
    "best wine bar Paris France",
    "famous wine bar Paris France",
    "natural wine bar Paris France",
  ],
  Bar: [
    "best cocktail bar Paris France",
    "famous bar Paris France",
    "speakeasy bar Paris France",
  ],
  Museum: [
    "best museum Paris France",
    "famous art museum Paris France",
    "top museum Paris France",
  ],
  Landmark: [
    "famous landmarks Paris France",
    "top tourist attractions Paris France",
    "must visit landmarks Paris France",
  ],
  Park: [
    "best parks Paris France",
    "famous garden Paris France",
    "beautiful park Paris France",
  ],
  Market: [
    "best market Paris France",
    "famous food market Paris France",
    "marche paris france",
  ],
  Viewpoint: [
    "best viewpoint Paris France",
    "panoramic view Paris France",
    "rooftop viewpoint Paris France",
  ],
  "Walk Area": [
    "best areas to walk Paris France",
    "beautiful neighborhood Paris France",
    "scenic walk paris france",
  ],
  "Shopping Area": [
    "best shopping area Paris France",
    "famous shopping street Paris France",
    "shopping district Paris France",
  ],
  Dessert: [
    "best dessert Paris France",
    "famous patisserie Paris France",
    "best ice cream Paris France",
  ],
};

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const out: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

function resolveEnv() {
  const cwd = process.cwd();
  const envLocal = loadEnvFile(path.join(cwd, ".env.local"));
  const envAdmin = loadEnvFile(path.join(cwd, ".env.admin.local"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY ?? envLocal.GOOGLE_PLACES_API_KEY;
  const dbUrl = process.env.SUPABASE_DB_URL ?? envAdmin.SUPABASE_DB_URL;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!googleApiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY.");
  }

  return { url, anonKey, googleApiKey, dbUrl };
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
  if (normA === normB || normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = new Set(canonicalTokens(a));
  const tokensB = new Set(canonicalTokens(b));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union >= 0.8;
}

function isParisAddress(address: string): boolean {
  const normalized = normalizeText(address);
  if (!normalized.includes("paris")) return false;
  return /\b750(0[1-9]|1[0-9]|20)\b/.test(address) || normalized.includes("france");
}

function toPriceLevel(level?: GooglePriceLevel): string {
  if (!level || level === "PRICE_LEVEL_UNSPECIFIED") return "";
  if (level === "PRICE_LEVEL_FREE" || level === "PRICE_LEVEL_INEXPENSIVE") return "€";
  if (level === "PRICE_LEVEL_MODERATE") return "€€";
  if (level === "PRICE_LEVEL_EXPENSIVE") return "€€€";
  if (level === "PRICE_LEVEL_VERY_EXPENSIVE") return "€€€€";
  return "";
}

function mapsLink(name: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${name} Paris`)}`;
}

function descriptionGr(type: AllowedType, address: string): string {
  const arrondissementMatch = address.match(/\b750(0[1-9]|1[0-9]|20)\b/);
  const area = arrondissementMatch ? `${arrondissementMatch[0]} Παρίσι` : "κεντρικό Παρίσι";

  switch (type) {
    case "Cafe":
      return `Δημοφιλές καφέ στο ${area}, καλό για πρωινό καφέ και χαλαρό διάλειμμα μέσα στη μέρα.`;
    case "Bakery":
      return `Αξιόπιστο bakery στο ${area} με πολύ καλά αρτοσκευάσματα και γλυκά για γρήγορο stop.`;
    case "Restaurant":
      return `Πολύ καλή επιλογή για φαγητό στο ${area}, ιδανική στάση για lunch ή dinner στο πρόγραμμα.`;
    case "Wine Bar":
      return `Wine bar στο ${area} με ωραία λίστα κρασιών και ατμόσφαιρα για βραδινή έξοδο.`;
    case "Bar":
      return `Αγαπημένο bar στο ${area} για κοκτέιλ και βραδινό ποτό σε ωραίο σημείο.`;
    case "Museum":
      return `Σημαντικό μουσείο στο ${area}, αξίζει για 1-2 ώρες με κλασικές ή σύγχρονες συλλογές.`;
    case "Landmark":
      return `Κλασικό αξιοθέατο στο ${area}, ταιριάζει εύκολα σε καθημερινή βόλτα και φωτογραφίες.`;
    case "Park":
      return `Όμορφο πάρκο στο ${area} για χαλαρό περπάτημα και διάλειμμα ανάμεσα σε δραστηριότητες.`;
    case "Market":
      return `Ζωντανή αγορά στο ${area} με local προϊόντα και καλές επιλογές για street food.`;
    case "Viewpoint":
      return `Σημείο με πολύ καλή θέα στο ${area}, ιδανικό για sunset και φωτογραφίες.`;
    case "Walk Area":
      return `Περιοχή για περπάτημα στο ${area} με ωραία αρχιτεκτονική και ευχάριστη διαδρομή.`;
    case "Shopping Area":
      return `Εμπορική περιοχή στο ${area} με καλό συνδυασμό από concept stores και γνωστά μαγαζιά.`;
    case "Dessert":
      return `Δυνατό spot για γλυκό στο ${area}, ιδανικό για παύση μετά από βόλτα ή φαγητό.`;
    default:
      return `Προτεινόμενο σημείο στο ${area} για στάση μέσα στο ταξιδιωτικό πρόγραμμα.`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchPlaces(
  apiKey: string,
  textQuery: string,
  pageToken?: string,
): Promise<SearchResponse> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "en",
    regionCode: "FR",
    pageSize: 20,
    locationRestriction: {
      rectangle: {
        low: PARIS_VIEWPORT.low,
        high: PARIS_VIEWPORT.high,
      },
    },
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,nextPageToken",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Google Places API failed (${res.status}): ${raw}`);
  }

  return (await res.json()) as SearchResponse;
}

function placeToCandidate(place: Place, type: AllowedType): Candidate | null {
  const name = place.displayName?.text?.trim();
  const address = place.formattedAddress?.trim() ?? "";
  const rating = place.rating ?? 0;
  const reviews = place.userRatingCount ?? 0;
  const types = place.types ?? [];

  if (!name || !address) return null;
  if (!isParisAddress(address)) return null;
  if (rating < MIN_RATING || reviews < MIN_REVIEWS) return null;

  const normalized = normalizeText(name);
  if (DISALLOWED_KEYWORDS.some((k) => normalized.includes(k))) return null;
  if (types.some((t) => DISALLOWED_GOOGLE_TYPES.has(t))) return null;

  return {
    name,
    type,
    rating: Number(rating.toFixed(1)),
    reviews,
    price_level: toPriceLevel(place.priceLevel),
    description_gr: descriptionGr(type, address),
    google_maps_link: mapsLink(name),
    address,
  };
}

async function collectByType(
  apiKey: string,
  type: AllowedType,
  wanted: number,
  existingNames: string[],
  acceptedNames: string[],
): Promise<Candidate[]> {
  const out: Candidate[] = [];

  for (const query of QUERIES[type]) {
    let token: string | undefined;
    let pages = 0;

    while (pages < 4) {
      const response = await searchPlaces(apiKey, query, token);
      const candidates = (response.places ?? [])
        .map((p) => placeToCandidate(p, type))
        .filter((c): c is Candidate => c !== null)
        .sort((a, b) => {
          const ratingDiff = b.rating - a.rating;
          if (ratingDiff !== 0) return ratingDiff;
          return b.reviews - a.reviews;
        });

      for (const row of candidates) {
        const duplicateExisting = existingNames.some((n) => isSimilarName(n, row.name));
        const duplicateBatch = acceptedNames.some((n) => isSimilarName(n, row.name));
        const duplicateType = out.some((n) => isSimilarName(n.name, row.name));
        if (duplicateExisting || duplicateBatch || duplicateType) continue;

        out.push(row);
        acceptedNames.push(row.name);
        if (out.length >= wanted) return out;
      }

      pages += 1;
      if (!response.nextPageToken) break;
      token = response.nextPageToken;
      await sleep(2200);
    }
  }

  return out;
}

function printStructured(rows: Candidate[]) {
  rows.forEach((row, idx) => {
    console.log(`\nPlace ${idx + 1}:`);
    console.log(`name:\n${row.name}`);
    console.log(`type:\n${row.type}`);
    console.log(`rating:\n${row.rating}`);
    console.log(`price_level:\n${row.price_level}`);
    console.log(`description_gr:\n${row.description_gr}`);
    console.log(`google_maps_link:\n${row.google_maps_link}`);
  });
}

async function getExistingNames(url: string, anonKey: string, dbUrl?: string): Promise<string[]> {
  if (dbUrl) {
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    try {
      const result = await pg.query<ExistingActivity>("select id, name from public.activities");
      return result.rows.map((r) => r.name);
    } finally {
      await pg.end();
    }
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("activities").select("id, name");
  if (error) throw new Error(`Failed to read existing activities: ${error.message}`);
  return ((data ?? []) as ExistingActivity[]).map((r) => r.name);
}

async function insertRows(url: string, anonKey: string, dbUrl: string | undefined, rows: Candidate[]) {
  const payload = rows.map((r) => ({
    name: r.name,
    type: r.type,
    description: r.description_gr,
    price: r.price_level || null,
    google_maps_link: r.google_maps_link,
    source_type: "google",
    notes: `Google rating ${r.rating} (${r.reviews} reviews)`,
  }));

  if (dbUrl) {
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    try {
      await pg.query("begin");
      for (const row of payload) {
        await pg.query(
          `insert into public.activities (name, type, description, price, google_maps_link, source_type, notes)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [row.name, row.type, row.description, row.price, row.google_maps_link, row.source_type, row.notes],
        );
      }
      await pg.query("commit");
      return;
    } catch (err) {
      await pg.query("rollback");
      throw err;
    } finally {
      await pg.end();
    }
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await supabase.from("activities").insert(payload);
  if (error) throw new Error(`Insert failed: ${error.message}`);
}

async function main() {
  const { url, anonKey, googleApiKey, dbUrl } = resolveEnv();
  const existingNames = await getExistingNames(url, anonKey, dbUrl);

  const selected: Candidate[] = [];
  const acceptedNames: string[] = [];

  for (const type of Object.keys(TARGETS) as AllowedType[]) {
    const wanted = TARGETS[type];
    const found = await collectByType(googleApiKey, type, wanted, existingNames, acceptedNames);
    if (found.length < wanted) {
      throw new Error(`Not enough ${type}: needed ${wanted}, found ${found.length}.`);
    }
    selected.push(...found);
  }

  if (selected.length !== TARGET_TOTAL) {
    throw new Error(`Expected ${TARGET_TOTAL} places, found ${selected.length}.`);
  }

  await insertRows(url, anonKey, dbUrl, selected);
  printStructured(selected);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Structured Google seed failed: ${message}`);
  process.exit(1);
});
