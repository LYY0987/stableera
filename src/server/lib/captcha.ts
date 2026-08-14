// 这个模块提供 SVG 验证码生成方法。

// 排除易混淆字符后的字符集。
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'

// 生成指定长度的随机验证码文本。
function randomText(length: number): string {
  let text = ''
  for (let i = 0; i < length; i++) {
    text += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return text
}

// 生成指定范围内的随机数。
function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// 生成单条干扰线的路径字符串。
function randomLine(width: number, height: number): string {
  const x1 = randomRange(0, width)
  const y1 = randomRange(0, height)
  const x2 = randomRange(0, width)
  const y2 = randomRange(0, height)
  return `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`
}

// 生成单条干扰点的坐标字符串。
function randomDot(width: number, height: number): string {
  const cx = randomRange(0, width)
  const cy = randomRange(0, height)
  const r = randomRange(0.5, 1.5)
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"/>`
}

// 生成验证码 SVG 字符串，包含文本、干扰线和干扰点。
export function generateCaptchaSvg(text: string, width = 120, height = 40): string {
  // 字符颜色调色板，与登录页配色呼应。
  const colors = ['#f472b6', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
  const charCount = text.length
  // 单字符宽度，用于均匀分布。
  const slotWidth = width / (charCount + 1)

  const chars = text.split('').map((char, index) => {
    const x = slotWidth * (index + 1)
    const y = height / 2 + randomRange(-6, 6)
    const rotate = randomRange(-25, 25)
    const fontSize = randomRange(20, 26)
    const color = colors[Math.floor(Math.random() * colors.length)]
    // 围绕字符基线做随机旋转，增加识别难度。
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fontSize.toFixed(1)}" fill="${color}" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${char}</text>`
  }).join('')

  // 干扰线和干扰点，提升机器识别难度。
  const lines = Array.from({ length: 4 }, () => {
    const color = colors[Math.floor(Math.random() * colors.length)]
    return `<path d="${randomLine(width, height)}" stroke="${color}" stroke-width="1" opacity="0.5"/>`
  }).join('')

  const dots = Array.from({ length: 20 }, () => randomDot(width, height)).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f8fafc" rx="6"/>${dots}${lines}${chars}</svg>`
}

// 生成验证码文本和对应的 SVG 字符串。
export function createCaptcha(length = 4): { text: string; svg: string } {
  const text = randomText(length)
  const svg = generateCaptchaSvg(text)
  return { text, svg }
}
