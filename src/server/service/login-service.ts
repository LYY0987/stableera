import { orm } from '@/server/infra/db'
import { userTab } from "@/server/entity/user";
import { eq } from "drizzle-orm";
import BizError from "@/server/error/biz-error";
import { verifyPassword } from '@/server/lib/crypto';
import { createId } from '@/server/lib/id';
import { createLoginToken } from '@/server/lib/jwt';
import { type LoginBo } from '@/server/entity/bo/login';
import { type AuthInfo } from '@/server/entity/vo/auth';
import { type LoginFailInfo } from '@/server/entity/vo/login';
import { UserStatusEnum } from '@/server/enums/user-enum';
import { cache } from '@/server/infra/cache';
import { AUTH_CACHE_TTL, LOGIN_FAIL_MAX, LOGIN_LOCK_TTL } from '@/server/const/global';
import { AUTH_CACHE_KEY, LOGIN_FAIL_CACHE_KEY } from '@/server/const/cache';
import { captchaService } from '@/server/service/captcha-service';

// 这个模块处理登录认证相关业务。

// 当前时间戳（秒），统一用于锁定到期判断。
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

const loginService = {

  // 把用户信息写入登录缓存，并返回本次会话 uuid；最多保留 30 个会话，超出淘汰最旧的。
  async saveAuthInfo(user: { userId: string, username: string, avatar: string, type: number }): Promise<string> {
    const uuid = createId()
    const oldAuthInfo = await cache.get<AuthInfo>(AUTH_CACHE_KEY + user.userId)
    // 追加新会话，超出 20 个时淘汰数组最前面的旧会话。
    const uuidList = [...(oldAuthInfo?.uuidList ?? []), uuid].slice(-20)

    const authInfo: AuthInfo = {
      userId: user.userId,
      username: user.username,
      avatar: user.avatar,
      type: user.type,
      uuidList,
    }

    await cache.set(AUTH_CACHE_KEY + user.userId, authInfo, { ttl: AUTH_CACHE_TTL })
    return uuid
  },

  // 拼接登录失败计数缓存 key，按用户名小写归一，避免大小写差异绕过锁定。
  getFailKey(username: string): string {
    return LOGIN_FAIL_CACHE_KEY + username.toLowerCase()
  },

  // 检查账号是否处于锁定中，锁定则抛出业务异常，登录流程不再继续。
  async checkLocked(username: string): Promise<void> {
    const info = await cache.get<LoginFailInfo>(this.getFailKey(username))

    if (info?.lockedUntil && info.lockedUntil > nowSeconds()) {
      throw new BizError("login.accountLocked")
    }
  },

  // 记录一次登录失败，连续失败达到上限则锁定账号 15 分钟。
  async recordFailure(username: string): Promise<void> {
    const key = this.getFailKey(username)
    const now = nowSeconds()
    const info = (await cache.get<LoginFailInfo>(key)) ?? { failCount: 0, lockedUntil: 0 }

    // 上次锁定已过期，重新开始计数。
    if (info.lockedUntil && info.lockedUntil <= now) {
      info.failCount = 0
      info.lockedUntil = 0
    }

    info.failCount += 1

    // 连续失败达到上限，设置锁定到期时间。
    if (info.failCount >= LOGIN_FAIL_MAX) {
      info.lockedUntil = now + LOGIN_LOCK_TTL
    }

    // 缓存 TTL 与锁定时长一致，过期自动清理失败记录。
    await cache.set(key, info, { ttl: LOGIN_LOCK_TTL })
  },

  // 登录成功后清除该账号的失败计数。
  async clearFailures(username: string): Promise<void> {
    await cache.delete(this.getFailKey(username))
  },

  // 校验验证码、用户名和密码，登录成功后生成 JWT。
  async login(params: LoginBo): Promise<string> {

    if (!params.username?.trim() || !params.password?.trim()) {
      throw new BizError("login.credentialsRequired");
    }

    // 锁定中直接拒绝，避免继续消耗验证码与查库。
    await this.checkLocked(params.username)

    // 先校验验证码，避免无效请求继续查库。
    const isCaptchaValid = await captchaService.verify(params.captchaId, params.captchaCode);

    if (!isCaptchaValid) {
      throw new BizError("login.invalidCaptcha");
    }

    const [user] = await orm.select().from(userTab).where(eq(userTab.username, params.username)).limit(1);

    if (!user) {
      // 用户不存在同样记录失败，避免通过锁定状态枚举用户是否存在。
      await this.recordFailure(params.username)
      throw new BizError("login.invalidCredentials");
    }

    if (user.status === UserStatusEnum.DISABLE) {
      throw new BizError("user.disabled");
    }

    const isValidPassword = await verifyPassword(params.password, user.salt, user.password);

    if (!isValidPassword) {
      await this.recordFailure(params.username)
      throw new BizError("login.invalidCredentials");
    }

    const uuid = await this.saveAuthInfo(user);
    // 登录成功清除失败计数。
    await this.clearFailures(params.username)
    return createLoginToken(user.userId, uuid);
  },

  // 退出登录时从缓存移除当前会话 uuid。
  async logout(userId: string | null, uuid: string | null): Promise<void> {

    if (!userId || !uuid) {
      return
    }

    const authInfo = await cache.get<AuthInfo>(AUTH_CACHE_KEY + userId)

    if (!authInfo) {
      return
    }

    const uuidList = authInfo.uuidList.filter((item) => item !== uuid)

    if (!uuidList.length) {
      await cache.delete(AUTH_CACHE_KEY + userId)
      return
    }

    await cache.set(AUTH_CACHE_KEY + userId, {
      ...authInfo,
      uuidList,
    }, { ttl: AUTH_CACHE_TTL })
  },

}

export { loginService }
