import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/*.ts'],
    format: ['cjs', 'esm'],
    target: 'es2022',
    sourcemap: true,
    clean: true,
    dts: true,
    minify: true
})
