import { describe, it, expect } from 'vitest';
import { getDB } from '../../db/client';
describe('getDB', () => {
    it('opens the database and creates object stores', async () => {
        const db = await getDB();
        expect(db.objectStoreNames.contains('lists')).toBe(true);
        expect(db.objectStoreNames.contains('tasks')).toBe(true);
        expect(db.objectStoreNames.contains('habit_completions')).toBe(true);
    });
    it('returns the same instance on repeated calls', async () => {
        const db1 = await getDB();
        const db2 = await getDB();
        expect(db1).toBe(db2);
    });
});
