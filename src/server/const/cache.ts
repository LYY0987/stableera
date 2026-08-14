// 这个模块定义缓存 key 常量。

const STORAGE_LIST_CACHE_KEY = 'storage-list:'
const ALBUM_LIST_CACHE_KEY = 'album-list:'
const AUTH_CACHE_KEY = 'auth:'
const CAPTCHA_CACHE_KEY = 'captcha:'
// 登录失败计数缓存 key，按用户名小写归一拼接。
const LOGIN_FAIL_CACHE_KEY = 'login-fail:'

export { STORAGE_LIST_CACHE_KEY, ALBUM_LIST_CACHE_KEY, AUTH_CACHE_KEY, CAPTCHA_CACHE_KEY, LOGIN_FAIL_CACHE_KEY }
