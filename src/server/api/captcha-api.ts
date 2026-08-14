import { app } from '../hono/hono';
import { Context } from "hono";
import result from "@/server/model/result";
import { captchaService } from "@/server/service/captcha-service";

// 这个模块注册验证码相关接口。

// 生成并返回验证码图片，登录页打开时和点击刷新时调用。
app.get('/captcha', async (c: Context) => {
  const data = await captchaService.generate();
  return c.json(result.ok(data));
})
