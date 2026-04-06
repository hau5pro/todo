import '@testing-library/jest-dom';
import { IDBFactory } from 'fake-indexeddb';
import { _resetForTesting } from '../db/client';
beforeEach(() => {
    global.indexedDB = new IDBFactory();
    _resetForTesting();
});
