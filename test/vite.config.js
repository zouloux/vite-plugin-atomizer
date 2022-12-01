import { defineConfig } from 'vite'
import { atomizer } from "../dist/vite-plugin-atomizer.es2022.mjs"
import { resolve } from "path"

// -----------------------------------------------------------------------------

export default defineConfig( viteConfig => {
	const isDev = viteConfig.mode === 'development'
	return {
		root: 'src/',
		build: {
			outDir: resolve('public/'),
			rollupOptions: {
				input: resolve('src/index.html')
			},
			assetsDir: "./",
		},
		css: {
			modules: {
				generateScopedName: (
					isDev
					? "[name]__[local]__[hash:base64:5]"
					: "[hash:base64:5]"
				)
			},
			preprocessorOptions: {
				less: {
					math: 'always'
				}
			}
		},
		plugins: [
			atomizer({
				files: ['**/*.module.less'],
			})
		]
	}
})