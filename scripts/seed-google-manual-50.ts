import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

type ActivityType =
  | "Cafe"
  | "Bakery"
  | "Restaurant"
  | "Museum"
  | "Landmark"
  | "Walk Area"
  | "Dessert";

type SeedActivity = {
  name: string;
  type: ActivityType;
  booking_required: boolean;
  price: string;
};

type ExistingActivity = {
  id: string;
  name: string;
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

const TARGET_COUNT = 50;

const ACTIVITIES: SeedActivity[] = [
  { name: "Café de Flore", type: "Cafe", booking_required: false, price: "€8-20 pp" },
  { name: "Les Deux Magots", type: "Cafe", booking_required: false, price: "€10-25 pp" },
  { name: "Coutume Café", type: "Cafe", booking_required: false, price: "€8-18 pp" },
  { name: "KB Coffee Roasters", type: "Cafe", booking_required: false, price: "€6-16 pp" },
  { name: "Café Verlet", type: "Cafe", booking_required: false, price: "€10-22 pp" },
  { name: "Carette", type: "Cafe", booking_required: false, price: "€12-28 pp" },
  { name: "Boot Café", type: "Cafe", booking_required: false, price: "€5-14 pp" },
  { name: "La Caféothèque", type: "Cafe", booking_required: false, price: "€6-16 pp" },

  { name: "Du Pain et des Idées", type: "Bakery", booking_required: false, price: "€4-14 pp" },
  { name: "Mamiche", type: "Bakery", booking_required: false, price: "€4-14 pp" },
  { name: "BO&MIE", type: "Bakery", booking_required: false, price: "€5-16 pp" },
  { name: "Boulangerie Utopie", type: "Bakery", booking_required: false, price: "€4-14 pp" },
  { name: "Poilâne", type: "Bakery", booking_required: false, price: "€5-16 pp" },
  { name: "La Maison d’Isabelle", type: "Bakery", booking_required: false, price: "€4-12 pp" },
  { name: "Maison Landemaine", type: "Bakery", booking_required: false, price: "€4-14 pp" },

  { name: "Pink Mamma", type: "Restaurant", booking_required: true, price: "€25-45 pp" },
  { name: "Septime", type: "Restaurant", booking_required: true, price: "€60-120 pp" },
  { name: "Bistrot Paul Bert", type: "Restaurant", booking_required: true, price: "€35-65 pp" },
  { name: "Le Train Bleu", type: "Restaurant", booking_required: true, price: "€45-90 pp" },
  { name: "Bouillon Chartier", type: "Restaurant", booking_required: false, price: "€15-30 pp" },
  { name: "Chez Janou", type: "Restaurant", booking_required: true, price: "€25-45 pp" },
  { name: "Le Relais de l’Entrecôte", type: "Restaurant", booking_required: false, price: "€35-55 pp" },
  { name: "L’As du Fallafel", type: "Restaurant", booking_required: false, price: "€10-20 pp" },
  { name: "Clamato", type: "Restaurant", booking_required: true, price: "€35-70 pp" },
  { name: "Frenchie", type: "Restaurant", booking_required: true, price: "€55-110 pp" },

  { name: "Louvre Museum", type: "Museum", booking_required: true, price: "€17-22 pp" },
  { name: "Musée d’Orsay", type: "Museum", booking_required: true, price: "€16-18 pp" },
  { name: "Musée de l’Orangerie", type: "Museum", booking_required: true, price: "€12-14 pp" },
  { name: "Musée Rodin", type: "Museum", booking_required: true, price: "€14-16 pp" },
  { name: "Centre Pompidou", type: "Museum", booking_required: true, price: "€15-18 pp" },
  { name: "Musée Picasso", type: "Museum", booking_required: true, price: "€14-16 pp" },
  { name: "Palais Galliera", type: "Museum", booking_required: true, price: "€0-16 pp" },

  { name: "Eiffel Tower", type: "Landmark", booking_required: true, price: "€18-35 pp" },
  { name: "Arc de Triomphe", type: "Landmark", booking_required: true, price: "€13-16 pp" },
  { name: "Sainte-Chapelle", type: "Landmark", booking_required: true, price: "€11-15 pp" },
  { name: "Panthéon", type: "Landmark", booking_required: true, price: "€13-16 pp" },
  { name: "Notre-Dame de Paris", type: "Landmark", booking_required: false, price: "Free-€10 pp" },
  { name: "Sacré-Cœur Basilica", type: "Landmark", booking_required: false, price: "Free-€8 pp" },

  { name: "Montmartre", type: "Walk Area", booking_required: false, price: "Free" },
  { name: "Le Marais", type: "Walk Area", booking_required: false, price: "Free" },
  { name: "Canal Saint-Martin", type: "Walk Area", booking_required: false, price: "Free" },
  { name: "Saint-Germain-des-Prés", type: "Walk Area", booking_required: false, price: "Free" },
  { name: "Latin Quarter", type: "Walk Area", booking_required: false, price: "Free" },

  { name: "Angelina Paris", type: "Dessert", booking_required: false, price: "€12-30 pp" },
  { name: "Pierre Hermé Paris", type: "Dessert", booking_required: false, price: "€10-28 pp" },
  { name: "Ladurée Champs-Élysées", type: "Dessert", booking_required: false, price: "€12-30 pp" },
  { name: "Stohrer", type: "Dessert", booking_required: false, price: "€8-22 pp" },
  { name: "Berthillon", type: "Dessert", booking_required: false, price: "€6-14 pp" },
  { name: "La Crème de Paris", type: "Dessert", booking_required: false, price: "€8-20 pp" },
  { name: "Yann Couvreur Pâtisserie", type: "Dessert", booking_required: false, price: "€8-24 pp" },
];

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
  const dbUrl = process.env.SUPABASE_DB_URL ?? envAdmin.SUPABASE_DB_URL;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, anonKey, serviceRoleKey, userEmail, userPassword, dbUrl };
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

function mapsLink(name: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${name} Paris`)}`;
}

function printGrouped(rows: SeedActivity[]): void {
  const order: ActivityType[] = [
    "Cafe",
    "Bakery",
    "Restaurant",
    "Museum",
    "Landmark",
    "Walk Area",
    "Dessert",
  ];

  for (const type of order) {
    const group = rows.filter((row) => row.type === type);
    console.log(`\n${type}:`);
    for (const row of group) {
      console.log(
        `- ${row.name} | booking_required=${row.booking_required ? "yes" : "no"} | price=${row.price}`,
      );
    }
  }
}

async function main() {
  const { url, anonKey, serviceRoleKey, userEmail, userPassword, dbUrl } = resolveEnv();
  let existingNames: string[] = [];
  let insertMode: "postgres" | "supabase" = "supabase";
  let supabase:
    | ReturnType<typeof createClient>
    | null = null;

  if (dbUrl) {
    insertMode = "postgres";
    const pgClient = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pgClient.connect();
    const rows = await pgClient.query<ExistingActivity>("select id, name from public.activities");
    existingNames = rows.rows.map((row) => row.name);
    await pgClient.end();
  } else {
    supabase = createClient(url, serviceRoleKey ?? anonKey, {
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
    existingNames = ((existingRows ?? []) as ExistingActivity[]).map((row) => row.name);
  }

  const selected: SeedActivity[] = [];
  for (const candidate of ACTIVITIES) {
    const duplicateExisting = existingNames.some((name) => isSimilarName(name, candidate.name));
    const duplicateInBatch = selected.some((item) => isSimilarName(item.name, candidate.name));
    if (duplicateExisting || duplicateInBatch) continue;
    selected.push(candidate);
    if (selected.length >= TARGET_COUNT) break;
  }

  if (selected.length < TARGET_COUNT) {
    throw new Error(`Could not collect ${TARGET_COUNT} unique activities. Found ${selected.length}.`);
  }

  const payload = selected.map((item) => ({
    name: item.name,
    type: item.type,
    google_maps_link: mapsLink(item.name),
    source_type: "google",
    booking_required: item.booking_required,
    price: item.price,
  }));

  if (insertMode === "postgres" && dbUrl) {
    const pgClient = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pgClient.connect();
    try {
      await pgClient.query("begin");
      for (const item of payload) {
        await pgClient.query(
          `insert into public.activities (name, type, google_maps_link, source_type, booking_required, price)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            item.name,
            item.type,
            item.google_maps_link,
            item.source_type,
            item.booking_required,
            item.price,
          ],
        );
      }
      await pgClient.query("commit");
    } catch (error) {
      await pgClient.query("rollback");
      throw error;
    } finally {
      await pgClient.end();
    }
  } else {
    const { error: insertError } = await supabase!.from("activities").insert(payload);
    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }
  }

  console.log(`Inserted ${payload.length} activities.`);
  printGrouped(selected);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Manual Google seed failed: ${message}`);
  process.exit(1);
});
