import esbuild from "esbuild";
import process from "process";

const isProduction = process.argv[2] === "production";

const banner = `/*
ResearchFlow
https://github.com/nachiket273/obsidian-research-flow
*/`;

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
  logLevel: "info",
  minify: isProduction,
  outfile: "main.js",
  banner: {
    js: banner,
  },
});

if (!isProduction) {
  console.log("ResearchFlow development build complete.");
}