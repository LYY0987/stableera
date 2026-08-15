import { describe, expect, it } from 'vitest';
import { formatHttpUrl, toMediaUrl } from '@/lib/url';

// 这个模块测试 URL 处理工具函数。

describe('formatHttpUrl', () => {
  // 空值返回空字符串。
  it('空值返回空字符串', () => {
    expect(formatHttpUrl(null)).toBe('');
    expect(formatHttpUrl('  ')).toBe('');
  });

  // 无协议时默认补 https。
  it('无协议时默认补 https', () => {
    expect(formatHttpUrl('cdn.example.com')).toBe('https://cdn.example.com');
  });

  // 已有协议保持不变，并去掉末尾斜杠。
  it('保留已有协议并去除末尾斜杠', () => {
    expect(formatHttpUrl('http://cdn.example.com/')).toBe('http://cdn.example.com');
  });
});

describe('toMediaUrl', () => {
  // 无域名时走 /media 代理。
  it('无域名时走 /media 代理', () => {
    expect(toMediaUrl('photos/u1/a.jpg')).toBe('/media/photos/u1/a.jpg');
  });

  // 配置域名时拼接域名。
  it('有域名时拼接完整地址', () => {
    expect(toMediaUrl('photos/u1/a.jpg', 'https://cdn.example.com')).toBe('https://cdn.example.com/photos/u1/a.jpg');
  });

  // 存储 key 中的特殊字符按段编码。
  it('key 中的空格按段 URL 编码', () => {
    expect(toMediaUrl('photos/u1/my photo.jpg')).toBe('/media/photos/u1/my%20photo.jpg');
  });
});
