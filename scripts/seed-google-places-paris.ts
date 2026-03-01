import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

type TargetType =
  | "Cafe"
  | "Bakery"
  | "Restaurant"
  | "Museum"
  | "Landmark"
  | "Walk Area"
  | "Dessert";

type ExistingActivity = {
  id: string;
  name: string;
};

type Place = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  types?: string[];
};

type SearchResponse = {
  places?: Place[];
  nextPageToken?: string;
};

type Candidate = {
  name: string;
  type: TargetType;
  google_maps_link: string;
  rating: number;
  reviews: number;
  address: string;
};

const TARGETS: Record<TargetType, number> = {
  Cafe: 6,
  Bakery: 5,
  Restaurant: 6,
  Museum: 4,
  Landmark: 3,
  "Walk Area": 3,
  Dessert: 3,
};

const MIN_RATING = 4.3;
const MIN_REVIEWS = 200;
const DISALLOWED_NAME_KEYWORDS = [
  "pharmacy",
  "pharmacie",
  "bank",
  "dentist",
  "laundry",
  "logistics",
  "storage",
  "car rental",
  "repair",
  "office",
  "insurance",
  "clinic",
  "hospital",
  "supermarket",
  "carrefour",
  "monoprix",
  "aldi",
  "lidl",
  "salon",
  "coiffeur",
];

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
]);

const QUERIES: Record<TargetType, string[]> = {
  Cafe: [
    "best cafe Paris France",
    "famous cafe Paris France",
    "instagrammable cafe Paris France",
  ],
  Bakery: [
    "best bakery Paris France",
    "famous boulangerie Paris France",
    "top pastry shop Paris France",
  ],
  Restaurant: [
    "best restaurant Paris France",
    "famous restaurant Paris France",
    "popular bistro Paris France",
  ],
  Museum: [
    "best museum Paris France",
    "famous museum Paris France",
    "top art museum Paris France",
  ],
  Landmark: [
    "famous landmarks Paris France",
    "top tourist attractions Paris France",
    "must visit landmarks Paris France",
  ],
  "Walk Area": [
    "best neighborhoods to walk in Paris France",
    "famous walk areas Paris France",
    "scenic streets Paris France",
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
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY ?? envLocal.GOOGLE_PLACES_API_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!googleApiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY.");
  }

  return { url, anonKey, serviceRoleKey, userEmail, userPassword, googleApiKey };
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
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersection / union;
  return jaccard >= 0.8;
}

function isParisAddress(address: string): boolean {
  const normalized = normalizeText(address);
  if (!normalized.includes("paris")) return false;
  if (normalized.includes("france")) return true;
  return /\b75\d{3}\b/.test(address);
}

function mapsLinkFor(name: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${name} Paris`)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function searchPlaces(
  googleApiKey: string,
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

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,nextPageToken",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Google Places API failed (${response.status}): ${raw}`);
  }

  return (await response.json()) as SearchResponse;
}

function placeToCandidate(place: Place, type: TargetType): Candidate | null {
  const name = place.displayName?.text?.trim();
  const rating = place.rating ?? 0;
  const reviews = place.userRatingCount ?? 0;
  const address = place.formattedAddress?.trim() ?? "";

  if (!name) return null;
  const normalizedName = normalizeText(name);
  if (DISALLOWED_NAME_KEYWORDS.some((keyword) => normalizedName.includes(keyword))) return null;
  if (!address || !isParisAddress(address)) return null;
  if (rating < MIN_RATING) return null;
  if (reviews < MIN_REVIEWS) return null;

  return {
    name,
    type,
    google_maps_link: mapsLinkFor(name),
    rating,
    reviews,
    address,
  };
}

async function collectTypeCandidates(
  googleApiKey: string,
  type: TargetType,
  targetCount: number,
  existingNames: string[],
  acceptedNames: string[],
): Promise<Candidate[]> {
  const output: Candidate[] = [];
  const queries = QUERIES[type];

  for (const query of queries) {
    let pageToken: string | undefined;
    let pages = 0;

    while (pages < 3) {
      const response = await searchPlaces(googleApiKey, query, pageToken);
      const places = response.places ?? [];

      const ranked = places
        .map((place) => placeToCandidate(place, type))
        .filter((candidate): candidate is Candidate => candidate !== null)
        .sort((a, b) => {
          const ratingDiff = b.rating - a.rating;
          if (ratingDiff !== 0) return ratingDiff;
          return b.reviews - a.reviews;
        });

      for (const candidate of ranked) {
        const duplicateExisting = existingNames.some((name) => isSimilarName(name, candidate.name));
        const duplicateGlobal = acceptedNames.some((name) => isSimilarName(name, candidate.name));
        const duplicateType = output.some((item) => isSimilarName(item.name, candidate.name));
        if (duplicateExisting || duplicateGlobal || duplicateType) continue;

        output.push(candidate);
        acceptedNames.push(candidate.name);
        if (output.length >= targetCount) return output;
      }

      pages += 1;
      if (!response.nextPageToken) break;
      pageToken = response.nextPageToken;
      await sleep(2200);
    }
  }

  return output;
}

function printGrouped(candidates: Candidate[]): void {
  const order: TargetType[] = [
    "Cafe",
    "Bakery",
    "Restaurant",
    "Museum",
    "Landmark",
    "Walk Area",
    "Dessert",
  ];

  for (const type of order) {
    const rows = candidates.filter((c) => c.type === type);
    console.log(`\n${type}:`);
    for (const row of rows) {
      console.log(row.name);
    }
  }
}

async function main() {
  const { url, anonKey, serviceRoleKey, userEmail, userPassword, googleApiKey } = resolveEnv();

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
  const acceptedNames: string[] = [];
  const selected: Candidate[] = [];

  for (const type of Object.keys(TARGETS) as TargetType[]) {
    const wanted = TARGETS[type];
    const gathered = await collectTypeCandidates(
      googleApiKey,
      type,
      wanted,
      existingNames,
      acceptedNames,
    );

    if (gathered.length < wanted) {
      throw new Error(`Could not find enough ${type}. Needed ${wanted}, found ${gathered.length}.`);
    }
    selected.push(...gathered);
  }

  if (selected.length !== 30) {
    throw new Error(`Expected 30 places, found ${selected.length}.`);
  }

  const payload = selected.map((row) => ({
    name: row.name,
    type: row.type,
    google_maps_link: row.google_maps_link,
    source_type: "google",
  }));

  const { error: insertError } = await supabase.from("activities").insert(payload);
  if (insertError) {
    throw new Error(`Insert failed: ${insertError.message}`);
  }

  printGrouped(selected);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Google Places seed failed: ${message}`);
  process.exit(1);
});
