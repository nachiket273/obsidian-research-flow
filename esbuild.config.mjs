import esbuild from "esbuild";
import process from "process";

const isProduction = process.argv[2] === "production";

await esbuild.build({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
	],
	format: "cjs",
	target: "es2018",
	sourcemap: isProduction ? false : "inline",
	treeShaking: true,
	minify: isProduction,
	logLevel: "info",
	outfile: "main.js",
});

if (!isProduction) {
	console.log("ResearchFlow development build complete.");
}
