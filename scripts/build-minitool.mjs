import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import ts from "typescript";
import postcss from "postcss";
const root = process.cwd(),
  out = path.join(root, "dist-minitool");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
const assets = new Map();
const python = process.env.PICKSCAPE_PYTHON || "python3";
function asset(file) {
  file = path.resolve(file);
  if (assets.has(file)) return assets.get(file);
  const image = /\.(png|jpe?g|webp)$/i.test(file);
  const name =
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex")
      .slice(0, 12) + (image ? ".webp" : path.extname(file));
  const dest = path.join(out, "assets", name);
  if (image)
    execFileSync(python, [
      "-c",
      `from PIL import Image\nimport sys\nim=Image.open(sys.argv[1]);im.thumbnail((640,640));im.save(sys.argv[2],'WEBP',quality=76,method=6)`,
      file,
      dest,
    ]);
  else fs.copyFileSync(file, dest);
  const url = "./assets/" + name;
  assets.set(file, url);
  return url;
}
function replaceFunction(code, filename, name, replacement) {
  const sf = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = false;
  for (const node of sf.statements)
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      code =
        code.slice(0, node.getStart(sf)) + replacement + code.slice(node.end);
      found = true;
      break;
    }
  if (!found) throw Error(`Missing function ${name} in ${filename}`);
  return code;
}
const plugin = {
  name: "offline-container",
  setup(b) {
    b.onResolve({ filter: /^\.\.\/\.\/assets\// }, (args) => ({
      path: args.path,
      external: true,
    }));
    b.onResolve({ filter: /^three$/ }, () => ({
      path: path.join(root, "node_modules/three/src/Three.js"),
    }));
    b.onResolve({ filter: /^\.\/generation$/ }, (args) =>
      args.importer.endsWith("/src/App.tsx")
        ? { path: path.join(root, "src/minitool/generation.ts") }
        : null,
    );
    b.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
      let code = fs.readFileSync(args.path, "utf8");
      const name = args.path;
      if (name.endsWith("/src/App.tsx"))
        code = code
          .replaceAll("generationService.enabled", "false")
          .replaceAll("generationService.configured", "false");
      if (name.endsWith("/src/platform.ts"))
        return { contents: "export const isMiniTool = true;", loader: "ts" };
      if (name.endsWith("/src/storage.ts")) {
        code = 'import {localImageBlob} from "./minitool/images";\n' + code;
        code = code.replace(
          /const res = await fetch\(`\/assets\/\$\{s.id\}\.jpg`\);\s*if \(!res.ok\) throw new Error\("[^"]+"\);\s*const blob = await res.blob\(\);/,
          `const blob = await localImageBlob(({mug:${JSON.stringify(asset("public/assets/mug.jpg"))},lamp:${JSON.stringify(asset("public/assets/lamp.jpg"))},chair:${JSON.stringify(asset("public/assets/chair.jpg"))}})[s.id]);`,
        );
        for (const fn of ["exportProject", "importProject"])
          code = replaceFunction(
            code,
            name,
            fn,
            `export async function ${fn}(...args:any[]):Promise<any> { throw new Error("小工具不支持项目文件导入导出"); }`,
          );
        code = replaceFunction(
          code,
          name,
          "download",
          "export function download(...args:any[]) {}",
        );
      }
      if (name.endsWith("/src/collection.ts")) {
        code = 'import {localImageBlob} from "./minitool/images";\n' + code;
        code = code
          .replace(
            "missing.map(async (entry): Promise<Photo> => ({",
            "missing.map((entry) => async (): Promise<Photo> => ({",
          )
          .replace(
            "const results = await Promise.allSettled(",
            "const results = await serialSettled(",
          );
        code =
          'async function serialSettled(tasks:any[]) { const results=[]; for(const task of tasks) { try { results.push({status:"fulfilled",value:await task()}); } catch(reason) {results.push({status:"rejected",reason});} await new Promise(resolve=>setTimeout(resolve,0)); } return results; }\n' +
          code;
        code = code.replace(
          /const response = await fetch\(url\);\s*if \(!response.ok\) throw new Error\("[^"]+"\);\s*const blob = await response.blob\(\);/,
          "const blob = await localImageBlob(url);",
        );
      }
      if (name.includes("/src/") && !name.includes("node_modules")) {
        code = code.replace(
          /new URL\(\s*(["'])([^"']+)\1,\s*import.meta.url,?\s*\)\.href/g,
          (_, q, url) =>
            JSON.stringify(asset(path.resolve(path.dirname(name), url))),
        );
        code = code.replace(
          /\(\s*import.meta as ImportMeta & \{ hot\?: \{ dispose\(callback: \(\) => void\): void \} \}\s*\)\.hot\?\.dispose\([\s\S]*?\n\}\);/g,
          "",
        );
      }
      // Three's URL loaders and XR are excluded from this local-only build.
      if (name.endsWith("/three/src/loaders/FileLoader.js"))
        code = `import {Loader} from './Loader.js'; export class FileLoader extends Loader { setResponseType(v){this.responseType=v;return this;} setMimeType(v){return this;} load(url,onLoad,onProgress,onError){const error=new Error('URL buffers are unavailable in the offline tool');if(onError)onError(error);else throw error;} abort(){return this;} }`;
      if (name.endsWith("/three/src/loaders/ImageBitmapLoader.js"))
        code = `import {ImageLoader} from './ImageLoader.js';export class ImageBitmapLoader extends ImageLoader {setOptions(){return this;}}`;
      if (name.endsWith("/three/src/renderers/webxr/WebXRManager.js"))
        code = `import {EventDispatcher} from '../../core/EventDispatcher.js';export class WebXRManager extends EventDispatcher {enabled=false;isPresenting=false;cameraAutoUpdate=false;setAnimationLoop(){}dispose(){}getSession(){return null;}getEnvironmentBlendMode(){return "opaque";}hasDepthSensing(){return false;}}`;
      // GLB textures are embedded image buffers; ImageLoader supports their object URLs without fetch.
      if (name.endsWith("/examples/jsm/loaders/GLTFLoader.js"))
        code = code.replace("typeof createImageBitmap === 'undefined'", "true");
      return {
        contents: code,
        loader: name.endsWith("tsx")
          ? "tsx"
          : name.endsWith("ts")
            ? "ts"
            : "js",
        resolveDir: path.dirname(name),
      };
    });
    b.onLoad({ filter: /\.css$/ }, (args) => {
      let css = fs
        .readFileSync(args.path, "utf8")
        .replace(
          /url\(["']?(\/fonts\/[^)'"\s]+)["']?\)/g,
          (_, url) => `url(../${asset(path.join("public", url))})`,
        );
      return {
        contents: css,
        loader: "css",
        resolveDir: path.dirname(args.path),
      };
    });
  },
};
const buildResult = await build({
  entryPoints: ["src/minitool/main.tsx"],
  outfile: path.join(out, "assets/app.js"),
  bundle: true,
  format: "iife",
  target: ["es2017", "chrome61"],
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env.MODE": '"minitool"',
    "import.meta.hot": "undefined",
  },
  plugins: [plugin],
  metafile: true,
});
// Add local fallbacks before modern declarations. Preserve modern enhancements.
const csspath = path.join(out, "assets/app.css");
const tree = postcss.parse(fs.readFileSync(csspath, "utf8"));
tree.walkDecls((d) => {
  if (d.prop === "gap") {
    d.cloneBefore({ prop: "grid-gap" });
    const rule = d.parent;
    const row = rule.nodes?.some(
      (n) => n.prop === "flex-direction" && n.value === "column",
    );
    if (rule.selector) {
      const fallback = postcss.rule({
        selector: rule.selectors
          .map((s) => ":root:not(.supports-flex-gap) " + s + " > * + *")
          .join(","),
      });
      const values = d.value.split(/\s+/);
      fallback.append({
        prop: row ? "margin-top" : "margin-left",
        value: row ? values[0] : values[1] || values[0],
      });
      rule.parent.insertAfter(rule, fallback);
    }
  }
  if (d.prop === "aspect-ratio") {
    d.cloneBefore({ prop: "min-height", value: "120px" });
  }
  if (d.value.startsWith("clamp("))
    d.cloneBefore({ value: d.value.slice(6, -1).split(",")[1].trim() });
  if (d.value.startsWith("min(")) {
    const match = d.value.match(/^min\(([^,]+),(.+)\)$/);
    if (match) {
      d.cloneBefore({ value: match[2].trim() });
      if (d.prop === "width")
        d.cloneBefore({ prop: "max-width", value: match[1].trim() });
    }
  }

  if (d.prop === "inset") {
    const v = d.value.split(/\s+/);
    ["top", "right", "bottom", "left"].forEach((p, i) =>
      d.cloneBefore({ prop: p, value: v[i] || v[i % 2] || v[0] }),
    );
  }
  if (d.value.includes("dvh"))
    d.cloneBefore({ value: d.value.replaceAll("dvh", "vh") });
  if (d.prop === "overflow" && d.value === "clip")
    d.cloneBefore({ value: "hidden" });
  if (["backdrop-filter", "user-select", "appearance"].includes(d.prop))
    d.cloneBefore({ prop: "-webkit-" + d.prop });
});
fs.writeFileSync(csspath, tree.toString());
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><title>拾境 · Pickscape</title><link rel="stylesheet" href="./assets/app.css"></head><body><div id="root"></div><script src="./assets/app.js"></script></body></html>\n`,
);
// License text is retained as an allowed JSON asset, not an unsupported .txt file.
fs.writeFileSync(
  path.join(out, "assets/font-licenses.json"),
  JSON.stringify(
    Object.fromEntries(
      ["NotoSansSC-OFL.txt", "NotoSerifSC-OFL.txt"].map((f) => [
        f,
        fs.readFileSync("public/fonts/" + f, "utf8"),
      ]),
    ),
  ),
);
console.log(`Built ${out}; ${assets.size} local resources.`);

const licenses = {};
const meta = buildResult.metafile;
for (const input of Object.keys(meta.inputs)) {
  const m = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (!m || licenses[m[1]]) continue;
  const folder = path.join(root, "node_modules", m[1]);
  const files = fs
    .readdirSync(folder)
    .filter((file) => /^licen[sc]e(?:\.|$)/i.test(file));
  licenses[m[1]] =
    files
      .map((file) => fs.readFileSync(path.join(folder, file), "utf8"))
      .join("\n") ||
    JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"))
      .license ||
    "See package author";
}
fs.writeFileSync(
  path.join(out, "assets/third-party-licenses.json"),
  JSON.stringify(licenses),
);
// Hard local gates supplement the official skill's size audit.
const js = fs.readFileSync(path.join(out, "assets/app.js"), "utf8");
for (const pattern of [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /new\s+(?:Worker|SharedWorker|WebSocket|EventSource|RTCPeerConnection)\s*\(/,
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /WebAssembly/,
  /import\.meta/,
  /\bimport\s*\(/,
  /_blank/,
  /\.download\s*=/,
])
  if (pattern.test(js)) throw Error("Blocked capability remains: " + pattern);
execFileSync(
  python,
  [
    "-c",
    `import pathlib,zipfile,sys
root=pathlib.Path(sys.argv[1]);target=pathlib.Path(sys.argv[2])
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for file in sorted(root.rglob('*')):
  if file.is_file():z.write(file,file.relative_to(root).as_posix())
assert target.stat().st_size<=10*1024*1024
print(str(target)+' '+str(target.stat().st_size)+' bytes')`,
    out,
    path.join(root, "pickscape-minitool-0.1.0.zip"),
  ],
  { stdio: "inherit" },
);
