import { describe, expect, it } from 'vitest';
import { formatPhotoTakenDate, parseTime, parseUtcTime } from '@/lib/date';

// 这个模块测试时间解析与格式化工具函数。

describe('parseTime', () => {
  // 合法 ISO 字符串解析为 Date。
  it('解析合法 ISO 时间', () => {
    const date = parseTime('2026-01-05T09:07:03Z');
    expect(date?.getTime()).toBe(new Date('2026-01-05T09:07:03Z').getTime());
  });

  // 非法字符串返回 null。
  it('非法时间返回 null', () => {
    expect(parseTime('not-a-date')).toBeNull();
  });
});

describe('parseUtcTime', () => {
  // 无时区后缀的旧格式按 UTC 处理。
  it('无时区后缀按 UTC 解析', () => {
    const time = parseUtcTime('2026-01-05T09:07:03');
    expect(time).toBe(new Date('2026-01-05T09:07:03Z').getTime());
  });

  // 带 Z 后缀直接解析。
  it('带 Z 后缀直接解析', () => {
    const time = parseUtcTime('2026-01-05T09:07:03Z');
    expect(time).toBe(new Date('2026-01-05T09:07:03Z').getTime());
  });
});

describe('formatPhotoTakenDate', () => {
  // 空值返回 null。
  it('空值返回 null', () => {
    expect(formatPhotoTakenDate(null)).toBeNull();
  });

  // 固定时间按指定语言格式化，包含年份。
  it('按指定语言格式化日期', () => {
    const text = formatPhotoTakenDate('2026-01-05T00:00:00Z', 'zh');
    expect(text).toContain('2026');
    expect(text).toContain('1月');
  });
});
