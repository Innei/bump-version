import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.mts'],
  splitting: false,
  sourcemap: false,
  format: ['cjs', 'esm'],
  outDir: 'helpers',
  clean: true,
  dts: true,
})
