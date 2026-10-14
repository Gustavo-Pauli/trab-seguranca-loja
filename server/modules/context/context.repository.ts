import { db } from '../../lib/database.js';
import type { Location } from '../../../shared/context/types.js';

export function baselineFor(userId: string): Location | null {
  const row = db
    .prepare('SELECT location_json FROM access_contexts WHERE user_id = ?')
    .get(userId) as { location_json: string } | undefined;
  return row ? (JSON.parse(row.location_json) as Location) : null;
}

export function rememberBaseline(userId: string, location: Location): void {
  const baseline = baselineFor(userId);
  if (!baseline || (baseline.kind === 'local' && location.kind === 'public')) {
    db.prepare(
      `INSERT INTO access_contexts VALUES (?, ?)
   ON CONFLICT(user_id) DO UPDATE SET location_json = excluded.location_json`,
    ).run(userId, JSON.stringify(location));
  }
}
