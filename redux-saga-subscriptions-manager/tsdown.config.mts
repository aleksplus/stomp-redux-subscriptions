import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  target: 'es2020',
  outDir: 'lib',
  clean: true,
  fixedExtension: false,
});
