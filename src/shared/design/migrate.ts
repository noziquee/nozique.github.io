import { CURRENT_DESIGN_VERSION } from './schema';

type Raw = Record<string, unknown>;

/** Upgrades a design by exactly one version. It must set `version` to the next number. */
export type Migration = (design: Raw) => Raw;

/**
 * Upgrade steps, keyed by the version they upgrade FROM. Empty while version 1 is the only one.
 * When the format changes: raise CURRENT_DESIGN_VERSION, add `1: (design) => ({...})` here, and
 * add a test with an old design.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type MigrationResult = { ok: true; raw: Raw; from: number } | { ok: false; error: string };

function isRaw(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Bring a stored design up to the current version. The result still needs validating. */
export function migrateDesign(
  input: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  current: number = CURRENT_DESIGN_VERSION,
): MigrationResult {
  if (!isRaw(input)) return { ok: false, error: 'A design must be an object.' };
  const from = input.version;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    return { ok: false, error: 'The design has no valid version number.' };
  }
  if (from > current) {
    return {
      ok: false,
      error: `This design was made with a newer version (${from}) than this editor knows (${current}).`,
    };
  }

  let design: Raw = input;
  for (let version = from; version < current; version += 1) {
    const step = migrations[version];
    if (!step) return { ok: false, error: `There is no upgrade from design version ${version}.` };
    design = step(design);
    if (design.version !== version + 1) {
      return {
        ok: false,
        error: `The upgrade from version ${version} did not set the next version.`,
      };
    }
  }
  return { ok: true, raw: design, from };
}
