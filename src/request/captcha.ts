import { http } from "@/request/request";
import { type CaptchaVo } from "@/server/entity/vo/captcha";

// 这个模块封装验证码相关接口请求。

// 获取一张新的验证码图片。
export function getCaptcha() {
  return http.get<CaptchaVo>('/captcha');
}
