import { describe, expect, it } from 'vitest';
import { buildContentDisposition, formatFileTimestamp, splitFileName } from '@/server/lib/file';

// 这个模块测试文件名处理工具函数。

describe('splitFileName', () => {
  // 普通文件名拆分出扩展名。
  it('拆分普通文件名与扩展名', () => {
    expect(splitFileName('photo.jpg')).toEqual({ baseName: 'photo', extName: '.jpg' });
  });

  // 无扩展名的文件名原样返回。
  it('无扩展名时原样返回', () => {
    expect(splitFileName('photo')).toEqual({ baseName: 'photo', extName: '' });
  });

  // 隐藏文件只保留最后一个点之后的扩展名。
  it('隐藏文件点开头不当作扩展名', () => {
    expect(splitFileName('.gitignore')).toEqual({ baseName: '.gitignore', extName: '' });
  });
});

describe('formatFileTimestamp', () => {
  // 固定时间生成 YYYYMMDD_HHmmss_毫秒 格式。
  it('格式化为年月日_时分秒_毫秒', () => {
    const date = new Date(2026, 0, 5, 9, 7, 3, 42);
    expect(formatFileTimestamp(date)).toBe('20260105_090703_042');
  });
});

describe('buildContentDisposition', () => {
  // 中文文件名被 URL 编码。
  it('中文文件名生成 UTF-8 编码的 Content-Disposition', () => {
    expect(buildContentDisposition('照片 1.jpg')).toBe("inline; filename*=UTF-8''%E7%85%A7%E7%89%87%201.jpg");
  });

  // 普通 ASCII 文件名保持可读。
  it('ASCII 文件名原样保留', () => {
    expect(buildContentDisposition('photo.jpg')).toBe("inline; filename*=UTF-8''photo.jpg");
  });
});
