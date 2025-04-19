import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.mts'],
    sourcemap: false,
    format: ['cjs', 'esm'],
    outDir: 'helpers',
    clean: true,
    dts: true,
    minify: true,
  },
  {
    entry: ['src/main.mts'],
    outDir: 'dist',
    clean: true,
    dts: true,
  },
])
