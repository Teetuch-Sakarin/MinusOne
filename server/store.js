import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedProject, DomainError } from './domain.js';

export function createStore(filename, seed = true) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    'PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, role TEXT NOT NULL, created_at INTEGER NOT NULL);',
  );
  const store = {
    db,
    list: () =>
      db
        .prepare('SELECT body FROM projects ORDER BY rowid DESC')
        .all()
        .map((row) => JSON.parse(row.body)),
    get(id) {
      const row = db.prepare('SELECT body FROM projects WHERE id=?').get(id);
      if (!row) throw new DomainError('Project not found.', 404);
      return JSON.parse(row.body);
    },
    put(p) {
      db.prepare(
        'INSERT INTO projects (id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
      ).run(p.id, JSON.stringify(p));
      return p;
    },
    mutate(id, version, fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const p = store.get(id);
        if (version != null && Number(version) !== p.version)
          throw new DomainError('This project changed in another tab. Refresh and try again.', 409);
        fn(p);
        p.version++;
        for (const task of p.tasks) if (!task.createdAt) task.createdAt = new Date().toISOString();
        store.put(p);
        db.exec('COMMIT');
        return p;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  if (seed && !store.list().length) store.put(seedProject());
  return store;
}
