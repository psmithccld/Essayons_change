import Redis from 'ioredis';

// SECURITY: Rate limit store interface for production-ready distributed rate limiting
export interface RateLimitStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

// In-memory Map implementation (default, current behavior)
export class MemoryRateLimitStore<T> implements RateLimitStore<T> {
  private store: Map<string, T>;
  private name: string;

  constructor(name: string = 'memory-store') {
    this.store = new Map<string, T>();
    this.name = name;
  }

  async get(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, value);
    
    // Optional TTL support for memory store (auto-cleanup)
    if (ttlMs && ttlMs > 0) {
      setTimeout(() => {
        this.store.delete(key);
      }, ttlMs);
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
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

// Redis implementation with JSON serialization, TTL support, and robust error handling
export class RedisRateLimitStore<T> implements RateLimitStore<T> {
  private client: Redis;
  private name: string;
  private keyPrefix: string;
  private fallbackToMemory: boolean;
  private memoryFallback: MemoryRateLimitStore<T>;
  private isConnected: boolean;
  private connectionAttempts: number;
  private maxConnectionAttempts: number;

  constructor(name: string, redisUrl?: string) {
    this.name = name;
    this.keyPrefix = `ratelimit:${name}:`;
    this.fallbackToMemory = false;
    this.memoryFallback = new MemoryRateLimitStore<T>(name);
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;

    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    // Initialize Redis client with robust configuration
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > this.maxConnectionAttempts) {
          console.error(`🚨 REDIS: Max connection attempts (${this.maxConnectionAttempts}) exceeded for ${this.name}. Falling back to memory store.`);
          this.fallbackToMemory = true;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000); // Exponential backoff up to 2s
        console.warn(`⚠️  REDIS: Retry attempt ${times} for ${this.name} in ${delay}ms...`);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          console.warn(`⚠️  REDIS: READONLY error detected for ${this.name}, attempting reconnect...`);
          return true; // Reconnect on READONLY errors
        }
        return false;
      },
      lazyConnect: false,
      enableOfflineQueue: true,
      showFriendlyErrorStack: process.env.NODE_ENV === 'development',
    });

    // Connection event handlers
    this.client.on('connect', () => {
      console.log(`✅ REDIS: Connected to Redis for ${this.name}`);
      this.isConnected = true;
      this.fallbackToMemory = false;
      this.connectionAttempts = 0;
    });

    this.client.on('ready', () => {
      console.log(`✅ REDIS: Redis client ready for ${this.name}`);
      this.isConnected = true;
    });

    this.client.on('error', (err: Error) => {
      console.error(`🚨 REDIS: Connection error for ${this.name}:`, err.message);
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error(`🚨 REDIS: Falling back to memory store for ${this.name} due to persistent errors`);
        this.fallbackToMemory = true;
      }
    });

    this.client.on('close', () => {
      console.warn(`⚠️  REDIS: Connection closed for ${this.name}`);
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log(`🔄 REDIS: Reconnecting for ${this.name}...`);
    });

    this.client.on('end', () => {
      console.warn(`⚠️  REDIS: Connection ended for ${this.name}`);
      this.isConnected = false;
    });
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private async executeWithFallback<R>(
    operation: () => Promise<R>,
    fallbackOperation: () => Promise<R>,
    operationName: string
  ): Promise<R> {
    if (this.fallbackToMemory) {
      return fallbackOperation();
    }

    try {
      return await operation();
    } catch (error) {
      console.error(`🚨 REDIS: ${operationName} failed for ${this.name}, using memory fallback:`, error);
      return fallbackOperation();
    }
  }

  async get(key: string): Promise<T | undefined> {
    return this.executeWithFallback(
      async () => {
        const data = await this.client.get(this.getKey(key));
        if (!data) return undefined;
        try {
          return JSON.parse(data) as T;
        } catch (parseError) {
          console.error(`🚨 REDIS: Failed to parse JSON for key ${key}:`, parseError);
          return undefined;
        }
      },
      () => this.memoryFallback.get(key),
      'get'
    );
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    return this.executeWithFallback(
      async () => {
        const serialized = JSON.stringify(value);
        const redisKey = this.getKey(key);
        
        if (ttlMs && ttlMs > 0) {
          await this.client.psetex(redisKey, ttlMs, serialized);
        } else {
          await this.client.set(redisKey, serialized);
        }
      },
      () => this.memoryFallback.set(key, value, ttlMs),
      'set'
    );
  }

  async delete(key: string): Promise<boolean> {
    return this.executeWithFallback(
      async () => {
        const result = await this.client.del(this.getKey(key));
        return result > 0;
      },
      () => this.memoryFallback.delete(key),
      'delete'
    );
  }

  async has(key: string): Promise<boolean> {
    return this.executeWithFallback(
      async () => {
        const result = await this.client.exists(this.getKey(key));
        return result === 1;
      },
      () => this.memoryFallback.has(key),
      'has'
    );
  }

  async size(): Promise<number> {
    return this.executeWithFallback(
      async () => {
        const keys = await this.client.keys(`${this.keyPrefix}*`);
        return keys.length;
      },
      () => this.memoryFallback.size(),
      'size'
    );
  }

  async keys(): Promise<string[]> {
    return this.executeWithFallback(
      async () => {
        const keys = await this.client.keys(`${this.keyPrefix}*`);
        return keys.map(key => key.substring(this.keyPrefix.length));
      },
      () => this.memoryFallback.keys(),
      'keys'
    );
  }

  async clear(): Promise<void> {
    return this.executeWithFallback(
      async () => {
        const keys = await this.client.keys(`${this.keyPrefix}*`);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      },
      () => this.memoryFallback.clear(),
      'clear'
    );
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      console.log(`✅ REDIS: Disconnected gracefully for ${this.name}`);
    } catch (error) {
      console.error(`🚨 REDIS: Error during disconnect for ${this.name}:`, error);
    }
  }
}

// Factory function that returns correct implementation based on USE_REDIS_RATE_LIMIT env var
export function createRateLimitStore<T>(name: string): RateLimitStore<T> {
  const useRedis = process.env.USE_REDIS_RATE_LIMIT === 'true';
  
  if (useRedis) {
    console.log(`📦 RATE LIMIT: Creating Redis-backed store for '${name}'`);
    return new RedisRateLimitStore<T>(name);
  }
  
  console.log(`📦 RATE LIMIT: Creating memory-backed store for '${name}'`);
  return new MemoryRateLimitStore<T>(name);
}
