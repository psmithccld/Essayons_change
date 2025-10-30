import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock implementation of RateLimitStore based on server/rateLimit.ts
interface RateLimitStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

class MemoryRateLimitStore<T> implements RateLimitStore<T> {
  private store: Map<string, { value: T; expiry?: number }>;
  private maxSize: number;

  constructor(maxSize: number = 100000) {
    this.store = new Map();
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    const expiry = ttlMs ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiry });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface LoginAttemptEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore<RateLimitEntry>;

  beforeEach(() => {
    store = new MemoryRateLimitStore<RateLimitEntry>();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      const entry: RateLimitEntry = { count: 5, windowStart: Date.now() };
      await store.set('test-key', entry);
      
      const retrieved = await store.get('test-key');
      expect(retrieved).toEqual(entry);
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await store.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should delete keys', async () => {
      await store.set('test-key', { count: 1, windowStart: Date.now() });
      const deleted = await store.delete('test-key');
      
      expect(deleted).toBe(true);
      expect(await store.get('test-key')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await store.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists with has()', async () => {
      await store.set('test-key', { count: 1, windowStart: Date.now() });
      
      expect(await store.has('test-key')).toBe(true);
      expect(await store.has('non-existent')).toBe(false);
    });

    it('should return correct size', async () => {
      expect(await store.size()).toBe(0);
      
      await store.set('key1', { count: 1, windowStart: Date.now() });
      expect(await store.size()).toBe(1);
      
      await store.set('key2', { count: 2, windowStart: Date.now() });
      expect(await store.size()).toBe(2);
    });

    it('should return all keys', async () => {
      await store.set('key1', { count: 1, windowStart: Date.now() });
      await store.set('key2', { count: 2, windowStart: Date.now() });
      
      const keys = await store.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should clear all entries', async () => {
      await store.set('key1', { count: 1, windowStart: Date.now() });
      await store.set('key2', { count: 2, windowStart: Date.now() });
      
      await store.clear();
      
      expect(await store.size()).toBe(0);
      expect(await store.get('key1')).toBeUndefined();
      expect(await store.get('key2')).toBeUndefined();
    });
  });

  describe('TTL (Time-To-Live) Functionality', () => {
    it('should expire entries after TTL', async () => {
      await store.set('test-key', { count: 1, windowStart: Date.now() }, 100); // 100ms TTL
      
      expect(await store.get('test-key')).toBeDefined();
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await store.get('test-key')).toBeUndefined();
    });

    it('should auto-remove expired entries on get()', async () => {
      await store.set('test-key', { count: 1, windowStart: Date.now() }, 100);
      expect(await store.size()).toBe(1);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await store.get('test-key'); // Should trigger removal
      expect(await store.size()).toBe(0);
    });

    it('should auto-remove expired entries on has()', async () => {
      await store.set('test-key', { count: 1, windowStart: Date.now() }, 100);
      expect(await store.has('test-key')).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await store.has('test-key')).toBe(false);
      expect(await store.size()).toBe(0);
    });

    it('should not expire entries without TTL', async () => {
      await store.set('test-key', { count: 1, windowStart: Date.now() });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await store.get('test-key')).toBeDefined();
    });
  });

  describe('Eviction and Size Limits', () => {
    it('should evict oldest entry when max size reached', async () => {
      const smallStore = new MemoryRateLimitStore<RateLimitEntry>(3);
      
      await smallStore.set('key1', { count: 1, windowStart: Date.now() });
      await smallStore.set('key2', { count: 2, windowStart: Date.now() });
      await smallStore.set('key3', { count: 3, windowStart: Date.now() });
      
      expect(await smallStore.size()).toBe(3);
      
      // Adding 4th entry should evict key1
      await smallStore.set('key4', { count: 4, windowStart: Date.now() });
      
      expect(await smallStore.size()).toBe(3);
      expect(await smallStore.get('key1')).toBeUndefined();
      expect(await smallStore.get('key4')).toBeDefined();
    });

    it('should not evict when updating existing key', async () => {
      const smallStore = new MemoryRateLimitStore<RateLimitEntry>(2);
      
      await smallStore.set('key1', { count: 1, windowStart: Date.now() });
      await smallStore.set('key2', { count: 2, windowStart: Date.now() });
      
      // Update key1 (should not trigger eviction)
      await smallStore.set('key1', { count: 10, windowStart: Date.now() });
      
      expect(await smallStore.size()).toBe(2);
      expect(await smallStore.get('key1')).toEqual({ count: 10, windowStart: expect.any(Number) });
      expect(await smallStore.get('key2')).toBeDefined();
    });

    it('should handle rapid insertions near capacity', async () => {
      const smallStore = new MemoryRateLimitStore<RateLimitEntry>(5);
      
      for (let i = 0; i < 10; i++) {
        await smallStore.set(`key${i}`, { count: i, windowStart: Date.now() });
      }
      
      expect(await smallStore.size()).toBeLessThanOrEqual(5);
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should track request counts per IP', async () => {
      const ipStore = new MemoryRateLimitStore<RateLimitEntry>();
      const ip = '192.168.1.1';
      const windowStart = Date.now();
      
      await ipStore.set(ip, { count: 1, windowStart });
      
      let entry = await ipStore.get(ip);
      expect(entry?.count).toBe(1);
      
      // Increment count
      if (entry) {
        await ipStore.set(ip, { count: entry.count + 1, windowStart: entry.windowStart });
      }
      
      entry = await ipStore.get(ip);
      expect(entry?.count).toBe(2);
    });

    it('should track login attempts per username', async () => {
      const loginStore = new MemoryRateLimitStore<LoginAttemptEntry>();
      const username = 'testuser';
      const now = Date.now();
      
      await loginStore.set(username, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      
      let attempts = await loginStore.get(username);
      expect(attempts?.attempts).toBe(1);
      
      // Simulate failed login
      if (attempts) {
        await loginStore.set(username, {
          attempts: attempts.attempts + 1,
          firstAttempt: attempts.firstAttempt,
          lastAttempt: Date.now()
        });
      }
      
      attempts = await loginStore.get(username);
      expect(attempts?.attempts).toBe(2);
    });

    it('should reset rate limit window after expiry', async () => {
      const ipStore = new MemoryRateLimitStore<RateLimitEntry>();
      const ip = '192.168.1.1';
      
      await ipStore.set(ip, { count: 10, windowStart: Date.now() }, 100); // 100ms window
      
      expect((await ipStore.get(ip))?.count).toBe(10);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Window expired, entry removed
      expect(await ipStore.get(ip)).toBeUndefined();
      
      // New window can start
      await ipStore.set(ip, { count: 1, windowStart: Date.now() });
      expect((await ipStore.get(ip))?.count).toBe(1);
    });
  });

  describe('Cleanup Behavior', () => {
    it('should clean up expired entries from size calculation', async () => {
      await store.set('key1', { count: 1, windowStart: Date.now() }, 100);
      await store.set('key2', { count: 2, windowStart: Date.now() }, 100);
      await store.set('key3', { count: 3, windowStart: Date.now() }); // No TTL
      
      expect(await store.size()).toBe(3);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger cleanup by checking expired keys
      await store.has('key1');
      await store.has('key2');
      
      expect(await store.size()).toBe(1);
      expect(await store.get('key3')).toBeDefined();
    });

    it('should handle mixed expired and active entries', async () => {
      await store.set('expired1', { count: 1, windowStart: Date.now() }, 50);
      await store.set('active1', { count: 2, windowStart: Date.now() });
      await store.set('expired2', { count: 3, windowStart: Date.now() }, 50);
      await store.set('active2', { count: 4, windowStart: Date.now() });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await store.get('expired1')).toBeUndefined();
      expect(await store.get('active1')).toBeDefined();
      expect(await store.get('expired2')).toBeUndefined();
      expect(await store.get('active2')).toBeDefined();
    });
  });
});
