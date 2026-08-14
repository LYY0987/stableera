// 这个模块定义登录接口返回对象及登录失败计数缓存对象。

interface LoginVo {
  token: string;
}

// 登录失败计数缓存对象：failCount 为连续失败次数，lockedUntil 为锁定到期时间戳（秒），0 表示未锁定。
interface LoginFailInfo {
  failCount: number;
  lockedUntil: number;
}

export type { LoginVo, LoginFailInfo };
