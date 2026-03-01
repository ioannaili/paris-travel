import { Database } from "@/types/database";

type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];
export type ActivitySourceType = "manual" | "reddit" | "google" | "ai" | "tiktok";
type ActivityNameRow = { id: string; name: string };
type ActivitySearchResult = { data: ActivityNameRow[] | null; error: { message: string } | null };
type ActivitySingleRowResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};
type ActivitiesTableClient = {
  select: (columns: "id, name" | "*") => {
    ilike?: (column: "name", pattern: string) => PromiseLike<ActivitySearchResult>;
    eq: (column: "id", value: string) => {
      single: () => PromiseLike<ActivitySingleRowResult>;
    };
    single?: () => PromiseLike<ActivitySingleRowResult>;
  };
  insert: (values: ActivityInsert[]) => {
    select: (columns: "*") => {
      single: () => PromiseLike<ActivitySingleRowResult>;
    };
  };
};
type ActivityDbClient = {
  from: (table: "activities") => {
    select: ActivitiesTableClient["select"];
    insert: ActivitiesTableClient["insert"];
  };
};

const allowedSourceTypes: ActivitySourceType[] = [
  "manual",
  "reddit",
  "google",
  "ai",
  "tiktok",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value: string) {
  const normalized = normalizeText(value);
  if (normalized.length < 2) {
    return [normalized];
  }

  const result: string[] = [];
  for (let i = 0; i < normalized.length - 1; i += 1) {
    result.push(normalized.slice(i, i + 2));
  }
  return result;
}

function similarity(a: string, b: string) {
  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);

  if (aBigrams.length === 0 || bBigrams.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  aBigrams.forEach((gram) => counts.set(gram, (counts.get(gram) ?? 0) + 1));

  let overlap = 0;
  bBigrams.forEach((gram) => {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  });

  return (2 * overlap) / (aBigrams.length + bBigrams.length);
}

export function coerceSourceType(sourceType: string | null | undefined): ActivitySourceType {
  if (sourceType && allowedSourceTypes.includes(sourceType as ActivitySourceType)) {
    return sourceType as ActivitySourceType;
  }
  return "manual";
}

export async function findSimilarActivity(
  supabase: unknown,
  name: string,
) {
  const db = supabase as ActivityDbClient;
  const searchName = name.trim();
  const prefix = searchName.slice(0, Math.max(3, Math.min(searchName.length, 16)));

  const queryBuilder = db.from("activities").select("id, name");
  if (!queryBuilder.ilike) {
    return { error: "Failed to create similarity query", activity: null };
  }
  const { data, error } = await queryBuilder.ilike("name", `%${prefix}%`);

  if (error) {
    return { error: error.message, activity: null };
  }

  const normalizedInput = normalizeText(searchName);
  const similar = (data ?? []).find((item) => {
    const normalizedExisting = normalizeText(item.name);
    if (normalizedExisting === normalizedInput) {
      return true;
    }
    if (
      normalizedExisting.includes(normalizedInput) ||
      normalizedInput.includes(normalizedExisting)
    ) {
      return true;
    }
    return similarity(normalizedExisting, normalizedInput) >= 0.86;
  });

  return { error: null, activity: similar ?? null };
}

export function buildActivityInsertPayload(
  body: Partial<ActivityInsert>,
  defaultSourceType: ActivitySourceType,
  userId: string,
): ActivityInsert {
  return {
    name: body.name?.trim() ?? "",
    description: body.description ?? null,
    area: body.area ?? null,
    type: body.type ?? null,
    duration: body.duration ?? null,
    price: body.price ?? null,
    booking_required: body.booking_required ?? false,
    booking_link: body.booking_link ?? null,
    google_maps_link: body.google_maps_link ?? null,
    source_type: coerceSourceType(body.source_type ?? defaultSourceType),
    source_name: body.source_name ?? null,
    notes: body.notes ?? null,
    reddit_link: body.reddit_link ?? null,
    tiktok_link: body.tiktok_link ?? null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    voting_phase: body.voting_phase ?? false,
    last_updated: new Date().toISOString(),
    created_by_user_id: body.created_by_user_id ?? userId,
    popularity: body.popularity ?? 0,
  };
}

type InsertResult = {
  duplicate: boolean;
  activity: Record<string, unknown> | null;
  error: string | null;
};

export async function createActivityWithDedup(
  supabase: unknown,
  body: Partial<ActivityInsert>,
  userId: string,
  defaultSourceType: ActivitySourceType,
): Promise<InsertResult> {
  const db = supabase as ActivityDbClient;
  if (!body.name?.trim()) {
    return { duplicate: false, activity: null, error: "name is required" };
  }

  const dedupeCheck = await findSimilarActivity(db, body.name);
  if (dedupeCheck.error) {
    return { duplicate: false, activity: null, error: dedupeCheck.error };
  }

  if (dedupeCheck.activity) {
    const { data: existingActivity, error: existingError } = await db
      .from("activities")
      .select("*")
      .eq("id", dedupeCheck.activity.id)
      .single();

    if (existingError) {
      return { duplicate: false, activity: null, error: existingError.message };
    }

    return { duplicate: true, activity: existingActivity, error: null };
  }

  const payload = buildActivityInsertPayload(body, defaultSourceType, userId);

  const { data, error } = await db
    .from("activities")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    return { duplicate: false, activity: null, error: error.message };
  }

  return { duplicate: false, activity: data, error: null };
}
