import path from 'node:path';
import { defineConfig } from 'vitest/config';

// vitest 配置：复用项目 @/ 路径别名，只跑 src 下的单元测试。

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
