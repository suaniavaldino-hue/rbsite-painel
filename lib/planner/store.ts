import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { PlannerItem, PlannerState } from "@/types/planner";

const PLANNER_STATE_VERSION = 1;

let mutationLock = Promise.resolve();

function getPlannerDataDir() {
  const configuredDir = process.env.PLANNER_DATA_DIR?.trim();

  if (configuredDir) {
    return path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDir);
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), ".rbsite-planner");
}

function getPlannerStatePath() {
  return path.join(getPlannerDataDir(), "planner-state.json");
}

function createInitialState(): PlannerState {
  return {
    version: PLANNER_STATE_VERSION,
    items: [],
  };
}

function normalizePlannerState(state: PlannerState): PlannerState {
  return {
    version: PLANNER_STATE_VERSION,
    items: (state.items ?? [])
      .map((item) => ({
        ...item,
        metaBoard: item.metaBoard ?? {},
        assets: item.assets ?? {
          primaryUrl: "",
          carouselUrls: [],
        },
      }))
      .sort((left, right) => {
        return (
          new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime()
        );
      }),
  };
}

async function ensurePlannerStorage() {
  await mkdir(getPlannerDataDir(), { recursive: true });
}

async function writePlannerState(state: PlannerState) {
  await ensurePlannerStorage();

  const filePath = getPlannerStatePath();
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(normalizePlannerState(state), null, 2);

  await writeFile(tempPath, serialized, { encoding: "utf8" });
  await rename(tempPath, filePath);
}

export async function readPlannerState() {
  try {
    const raw = await readFile(getPlannerStatePath(), "utf8");
    return normalizePlannerState(JSON.parse(raw) as PlannerState);
  } catch {
    const initialState = createInitialState();
    await writePlannerState(initialState);
    return initialState;
  }
}

export async function mutatePlannerState<T>(
  mutator: (state: PlannerState) => Promise<T> | T,
) {
  const task = mutationLock.then(async () => {
    const state = await readPlannerState();
    const result = await mutator(state);
    await writePlannerState(state);
    return result;
  });

  mutationLock = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

export async function listPlannerItems() {
  const state = await readPlannerState();
  return state.items;
}

export async function getPlannerItemById(id: string) {
  const state = await readPlannerState();
  return state.items.find((item) => item.id === id) ?? null;
}

export async function savePlannerItems(items: PlannerItem[]) {
  return mutatePlannerState((state) => {
    const incomingIds = new Set(items.map((item) => item.id));
    const retainedItems = state.items.filter((item) => !incomingIds.has(item.id));

    state.items = [...retainedItems, ...items];
    return state.items;
  });
}

export async function updatePlannerItem(
  id: string,
  updater: (item: PlannerItem) => PlannerItem,
) {
  return mutatePlannerState((state) => {
    const index = state.items.findIndex((item) => item.id === id);

    if (index === -1) {
      return null;
    }

    state.items[index] = updater(state.items[index]);
    return state.items[index];
  });
}
