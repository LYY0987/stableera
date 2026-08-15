import type { Context, Next } from 'hono';
import result from '@/server/model/result';
import { t } from '@/server/i18n';
import type { HonoEnv } from '@/server/hono/type';

// 这个模块提供基于内存滑动窗口的接口限流中间件。

// 每分钟普通接口最大请求数，可用 RATE_LIMIT_PER_MIN 覆盖。
const API_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 300);
// 每分钟登录/验证码接口最大请求数，更严格以降低爆破风险。
const AUTH_LIMIT_PER_MIN = Number(process.env.AUTH_RATE_LIMIT_PER_MIN ?? 10);

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// 内存桶：key 为 类型:IP，每分钟自动重置。
const buckets = new Map<string, RateLimitEntry>();

// 定期清理过期桶，防止内存无限增长；unref 避免阻塞进程退出。
const cleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of buckets) {
    if (now - entry.windowStart >= 60_000) {
      buckets.delete(key);
    }
  }
}, 60_000);

cleanupTimer.unref?.();

// 检查并记录一次请求：窗口内未超限返回 true，超限返回 false。
function checkRateLimit(key: string, limit: number) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= 60_000) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= limit;
}

// 从请求头解析客户端 IP，兼容常见反向代理转发头。
function getClientIp(c: Context<HonoEnv>) {
  const forwarded = c.req.header('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return c.req.header('x-real-ip') ?? 'unknown';
}

// 限流中间件：登录类接口从严限制，其余接口按每分钟额度限制。
// 注意：内存实现适合单实例部署；多实例/Serverless 场景建议换成 Redis 计数。
async function rateLimit(c: Context<HonoEnv>, next: Next) {
  const path = c.req.path.replace(/^\/api/, '');
  const isAuthPath = path.startsWith('/login') || path.startsWith('/captcha');
  const ip = getClientIp(c);
  const key = `${isAuthPath ? 'auth' : 'api'}:${ip}`;
  const limit = isAuthPath ? AUTH_LIMIT_PER_MIN : API_LIMIT_PER_MIN;

  if (!checkRateLimit(key, limit)) {
    return c.json(result.fail(t('common.rateLimited'), 429), 429);
  }

  return next();
}

export { rateLimit };
