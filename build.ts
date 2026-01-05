import { build, $ } from 'bun'
import { join, sep as pathSeparator } from 'path'
import { watch } from 'fs'

// @ts-expect-error: we don't care about types, this is a string
import chromePolyfill from 'webextension-polyfill' with { type: 'text' }

type BuildTarget = 'chrome' | 'firefox' | 'safari'

async function buildExtension(target: BuildTarget = 'chrome') {
	const outdir = target === 'chrome' ? 'dist' : `dist-${target}`

	// remove dist folder (if present) before rebuild
	await $`rm -r ${outdir}`.nothrow().quiet()

	// Select the appropriate manifest and background script
	const manifestFile =
		target === 'chrome'
			? './public/manifest.json'
			: `./public/manifest.${target}.json`

	const backgroundScript =
		target === 'safari'
			? join('src', 'background.safari.ts')
			: join('src', 'background.ts')

	const manifest = (
		await import(manifestFile, {
			with: { type: 'json' },
		})
	).default

	// Build background script
	await build({
		entrypoints: [backgroundScript],
		outdir,
		target: 'browser',
		minify: false,
		banner: `/* ${manifest.name}\n * Copyright (c) ${new Date().getFullYear()} ${manifest.author}\n */\n\n${chromePolyfill}`,
	})

	// Build content scripts
	await build({
		entrypoints: [
			join('src', 'content-youtube.ts'),
			join('src', 'content-twitter.ts'),
		],
		outdir,
		target: 'browser',
		minify: false,
		banner: `/* ${manifest.name} Content Scripts\n * Copyright (c) ${new Date().getFullYear()} ${manifest.author}\n */`,
	})

	// copy public files (excluding browser-specific manifests)
	await $`cp public/icon*.png ${outdir}/`

	// Copy the appropriate manifest for the target browser
	if (target === 'chrome') {
		await $`cp public/manifest.json ${outdir}/`
	} else {
		await $`cp public/manifest.${target}.json ${outdir}/manifest.json`
	}

	// copy static asset folders preserving structure
	// - copy global styles (e.g., src/styles) -> dist/styles
	await $`mkdir -p ${outdir}/styles`
	await $`cp -r src/styles/* ${outdir}/styles`.nothrow().quiet()

	// copy UI files preserving directory structure
	await $`mkdir -p ${outdir}/ui/options`
	await $`cp -r src/ui/options/* ${outdir}/ui/options`.nothrow().quiet()

	// copy global CSS if it exists
	await $`cp src/ui/global.css ${outdir}/ui/`.nothrow().quiet()

	// remove manifest.json $schema key after build to prevent browser warning
	const contents = JSON.stringify(manifest, null, '\t')
	const newContents = contents
		.split('\n')
		.filter((a) => !a.trim().startsWith('"$schema"'))
		.join('\n')
	await Bun.write(Bun.file(join(outdir, 'manifest.json')), newContents)

	// Update options page links for Firefox and Safari
	if (target === 'firefox' || target === 'safari') {
		const optionsPath = join(outdir, 'ui', 'options', 'index.html')
		const optionsHtml = await Bun.file(optionsPath).text()
		const browserPrefix = target === 'firefox' ? 'about:addons' : 'safari'
		const updatedHtml = optionsHtml.replace(
			'chrome://extensions/shortcuts',
			target === 'firefox'
				? 'about:addons'
				: 'Open Safari → Settings → Extensions',
		)
		await Bun.write(Bun.file(optionsPath), updatedHtml)
	}

	console.log(`✓ Built ${target} extension to ${outdir}/`)
}

// Check if we're building for a specific target or all targets
const targetArg = process.argv[2]

if (process.env.NODE_ENV === 'production') {
	if (targetArg === 'all') {
		// Build all targets
		await buildExtension('chrome')
		await buildExtension('firefox')
		await buildExtension('safari')
	} else {
		// Build specific target or default to chrome
		const target = (targetArg as BuildTarget) || 'chrome'
		await buildExtension(target)
	}
	process.exit()
}

// Development mode - watch for changes (Chrome only)
await buildExtension('chrome')

console.log('Watching for changes...')
watch(
	import.meta.dir,
	{
		recursive: true,
	},
	async (_, filename) => {
		if (!filename) return
		// build script is auto-reloaded by bun
		if (filename === import.meta.file) return
		console.log(filename)

		// adapt to your project
		if (filename.startsWith('website' + pathSeparator)) return
		if (
			!filename.startsWith('src' + pathSeparator) &&
			!filename.startsWith('public' + pathSeparator) &&
			!filename.startsWith('src' + pathSeparator + 'styles' + pathSeparator) &&
			!filename.startsWith('src' + pathSeparator + 'ui' + pathSeparator)
		)
			return

		console.write(`Rebuilding, file ${filename} changed.`)
		await buildExtension('chrome')
		console.write(' Done.\n')
	},
)
