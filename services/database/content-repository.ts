import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  ContentRecord,
  ContentStatus,
  CreateContentInput,
  ListContentsOptions,
  UpdateContentInput,
} from "@/types/content";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseContentRow = {
  id: string;
  title: string;
  type: string;
  content: string;
  status: string;
  created_at: string;
};

type LocalContentState = {
  version: number;
  items: ContentRecord[];
};

const LOCAL_CONTENT_STATE_VERSION = 1;
const CONTENTS_TABLE = "contents";

let mutationLock = Promise.resolve();

function getContentDataDir() {
  const configuredDir = process.env.CONTENT_DATA_DIR?.trim();

  if (configuredDir) {
    return path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDir);
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), ".rbsite-data");
}

function getContentStatePath() {
  return path.join(getContentDataDir(), "contents.json");
}

function normalizeRecord(record: ContentRecord): ContentRecord {
  return {
    ...record,
    title: record.title.trim(),
    content: record.content.trim(),
    hashtags: (record.hashtags ?? []).filter(Boolean),
    status: (record.status ?? "draft") as ContentStatus,
    updatedAt: record.updatedAt || record.createdAt,
    source: record.source ?? "manual",
  };
}

function createInitialLocalState(): LocalContentState {
  return {
    version: LOCAL_CONTENT_STATE_VERSION,
    items: [],
  };
}

function normalizeLocalState(state: LocalContentState): LocalContentState {
  return {
    version: LOCAL_CONTENT_STATE_VERSION,
    items: (state.items ?? [])
      .map((item) => normalizeRecord(item))
      .sort((left, right) => {
        return (
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      }),
  };
}

async function ensureLocalStorage() {
  await mkdir(getContentDataDir(), { recursive: true });
}

async function writeLocalState(state: LocalContentState) {
  await ensureLocalStorage();

  const filePath = getContentStatePath();
  const tempPath = `${filePath}.${randomUUID()}.tmp`;

  await writeFile(tempPath, JSON.stringify(normalizeLocalState(state), null, 2), {
    encoding: "utf8",
  });
  await rename(tempPath, filePath);
}

async function readLocalState() {
  try {
    const raw = await readFile(getContentStatePath(), "utf8");
    return normalizeLocalState(JSON.parse(raw) as LocalContentState);
  } catch {
    const initialState = createInitialLocalState();
    await writeLocalState(initialState);
    return initialState;
  }
}

async function mutateLocalState<T>(
  mutator: (state: LocalContentState) => Promise<T> | T,
) {
  const task = mutationLock.then(async () => {
    const state = await readLocalState();
    const result = await mutator(state);
    await writeLocalState(state);
    return result;
  });

  mutationLock = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

function filterRecords(items: ContentRecord[], options: ListContentsOptions = {}) {
  const normalizedSearch = options.search?.trim().toLowerCase();
  const order = options.order ?? "newest";

  let filtered = [...items];

  if (options.type && options.type !== "all") {
    filtered = filtered.filter((item) => item.type === options.type);
  }

  if (options.status && options.status !== "all") {
    filtered = filtered.filter((item) => item.status === options.status);
  }

  if (normalizedSearch) {
    filtered = filtered.filter((item) => {
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.content.toLowerCase().includes(normalizedSearch) ||
        item.theme?.toLowerCase().includes(normalizedSearch) ||
        item.caption?.toLowerCase().includes(normalizedSearch)
      );
    });
  }

  filtered.sort((left, right) => {
    const delta =
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

    return order === "oldest" ? delta * -1 : delta;
  });

  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

function mapSupabaseRowToRecord(row: SupabaseContentRow): ContentRecord {
  return {
    id: row.id,
    title: row.title,
    type: row.type as ContentRecord["type"],
    content: row.content,
    status: (row.status || "draft") as ContentStatus,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    hashtags: [],
    source: "manual",
  };
}

function buildSupabaseInsertPayload(input: CreateContentInput) {
  return {
    id: input.id ?? randomUUID(),
    title: input.title,
    type: input.type,
    content: input.content,
    status: input.status ?? "draft",
    created_at: new Date().toISOString(),
  };
}

function buildLocalRecord(input: CreateContentInput): ContentRecord {
  const createdAt = new Date().toISOString();

  return normalizeRecord({
    id: input.id ?? randomUUID(),
    title: input.title,
    type: input.type,
    content: input.content,
    status: input.status ?? "draft",
    createdAt,
    updatedAt: createdAt,
    theme: input.theme,
    objective: input.objective,
    platform: input.platform,
    funnelStage: input.funnelStage,
    caption: input.caption,
    hashtags: input.hashtags ?? [],
    imageUrl: input.imageUrl,
    provider: input.provider,
    source: input.source ?? "manual",
  });
}

export function buildContentSummaryText(input: {
  subtitle?: string;
  facebookCaption?: string;
  instagramCaption?: string;
}) {
  const facebookParagraph = input.facebookCaption?.split("\n\n")[0]?.trim();
  const instagramParagraph = input.instagramCaption?.split("\n\n")[0]?.trim();

  return (
    input.subtitle?.trim() ||
    facebookParagraph ||
    instagramParagraph ||
    "Conteudo gerado pela IA da RB Site."
  );
}

export async function listContents(options: ListContentsOptions = {}) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    let query = supabase
      .from(CONTENTS_TABLE)
      .select("id,title,type,content,status,created_at");

    if (options.type && options.type !== "all") {
      query = query.eq("type", options.type);
    }

    if (options.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    if (options.search?.trim()) {
      const search = options.search.trim();
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query =
      options.order === "oldest"
        ? query.order("created_at", { ascending: true })
        : query.order("created_at", { ascending: false });

    if (options.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Falha ao listar conteudos no Supabase: ${error.message}`);
    }

    return (data ?? []).map((row) => mapSupabaseRowToRecord(row as SupabaseContentRow));
  }

  const localState = await readLocalState();
  return filterRecords(localState.items, options);
}

export async function createContent(input: CreateContentInput) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const payload = buildSupabaseInsertPayload(input);
    const { data, error } = await supabase
      .from(CONTENTS_TABLE)
      .insert(payload)
      .select("id,title,type,content,status,created_at")
      .single();

    if (error) {
      throw new Error(`Falha ao criar conteudo no Supabase: ${error.message}`);
    }

    return normalizeRecord({
      ...mapSupabaseRowToRecord(data as SupabaseContentRow),
      theme: input.theme,
      objective: input.objective,
      platform: input.platform,
      funnelStage: input.funnelStage,
      caption: input.caption,
      hashtags: input.hashtags ?? [],
      imageUrl: input.imageUrl,
      provider: input.provider,
      source: input.source ?? "manual",
    });
  }

  return mutateLocalState((state) => {
    const record = buildLocalRecord(input);
    state.items.unshift(record);
    return record;
  });
}

export async function getContentById(id: string) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from(CONTENTS_TABLE)
      .select("id,title,type,content,status,created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao carregar conteudo no Supabase: ${error.message}`);
    }

    return data ? mapSupabaseRowToRecord(data as SupabaseContentRow) : null;
  }

  const state = await readLocalState();
  return state.items.find((item) => item.id === id) ?? null;
}

export async function updateContent(id: string, input: UpdateContentInput) {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const payload: Record<string, string> = {};

    if (input.title) {
      payload.title = input.title;
    }

    if (input.type) {
      payload.type = input.type;
    }

    if (input.content) {
      payload.content = input.content;
    }

    if (input.status) {
      payload.status = input.status;
    }

    if (Object.keys(payload).length === 0) {
      return getContentById(id);
    }

    const { data, error } = await supabase
      .from(CONTENTS_TABLE)
      .update(payload)
      .eq("id", id)
      .select("id,title,type,content,status,created_at")
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar conteudo no Supabase: ${error.message}`);
    }

    return data ? mapSupabaseRowToRecord(data as SupabaseContentRow) : null;
  }

  return mutateLocalState((state) => {
    const index = state.items.findIndex((item) => item.id === id);

    if (index === -1) {
      return null;
    }

    state.items[index] = normalizeRecord({
      ...state.items[index],
      ...input,
      updatedAt: new Date().toISOString(),
      hashtags: input.hashtags ?? state.items[index].hashtags,
    });

    return state.items[index];
  });
}
