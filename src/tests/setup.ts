import '@testing-library/jest-dom';
import { IDBFactory } from 'fake-indexeddb';
import { _resetForTesting } from '../db/client';

beforeEach(() => {
  (global as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  _resetForTesting();
});
