import { cache } from '@/server/infra/cache'
import { createId } from '@/server/lib/id'
import { createCaptcha } from '@/server/lib/captcha'
import { CAPTCHA_CACHE_KEY } from '@/server/const/cache'
import { CAPTCHA_CACHE_TTL, CAPTCHA_LENGTH } from '@/server/const/global'
import { type CaptchaVo } from '@/server/entity/vo/captcha'

// 这个模块处理验证码生成与校验。

const captchaService = {

  // 生成验证码并写入缓存，返回 captchaId 和 base64 SVG 图片。
  async generate(): Promise<CaptchaVo> {
    const { text, svg } = createCaptcha(CAPTCHA_LENGTH)
    const captchaId = createId()

    // 将验证码文本小写后写入缓存，校验时统一小写比较。
    await cache.set(`${CAPTCHA_CACHE_KEY}${captchaId}`, { text: text.toLowerCase() }, { ttl: CAPTCHA_CACHE_TTL })

    // 转 base64 data URL，前端可直接作为 img src 使用。
    const base64 = Buffer.from(svg, 'utf-8').toString('base64')
    const image = `data:image/svg+xml;base64,${base64}`

    return { captchaId, image }
  },

  // 校验验证码，无论成功或失败都立即删除（一次性使用），返回是否通过。
  async verify(captchaId: string, input: string): Promise<boolean> {
    // 入参缺失直接拒绝，避免无效缓存查询。
    if (!captchaId || !input) {
      return false
    }

    const key = `${CAPTCHA_CACHE_KEY}${captchaId}`
    const record = await cache.get<{ text: string }>(key)

    // 校验后立即删除，防止验证码被重复使用。
    await cache.delete(key)

    if (!record) {
      return false
    }

    return record.text === input.toLowerCase()
  },
}

export { captchaService }
