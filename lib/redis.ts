import { createClient, type RedisClientType } from 'redis';

// عميل واحد يُعاد استخدامه بين استدعاءات الدالة الدافئة (نفس نمط lib/prisma.ts)
const g = globalThis as unknown as { __redis?: RedisClientType; __redisConnecting?: Promise<RedisClientType> };

// يرجع null بدون REDIS_URL (تطوير محلي) أو عند تعذّر الاتصال، ليستخدم المستدعي بديلاً آمنًا
export async function getRedis(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;
  if (g.__redis?.isOpen) return g.__redis;

  if (!g.__redisConnecting) {
    const client = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 3000 } });
    client.on('error', (err) => console.error('Redis client error:', err));
    g.__redisConnecting = client.connect().then(() => {
      g.__redis = client;
      return client;
    });
  }

  try {
    return await g.__redisConnecting;
  } catch (error) {
    console.error('Redis connection failed:', error);
    g.__redisConnecting = undefined;
    return null;
  }
}
