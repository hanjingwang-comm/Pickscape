import { imageElement } from "./images";
// Only the small runtime APIs actually used by this app are supplemented.
const scope = window as any;
if (!scope.globalThis) scope.globalThis = scope;
if (!scope.queueMicrotask)
  scope.queueMicrotask = (f: () => void) => Promise.resolve().then(f);
if (!scope.structuredClone)
  scope.structuredClone = function clone(value: any): any {
    if (value === null || typeof value !== "object" || value instanceof Blob)
      return value;
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Date) return new Date(value.getTime());
    const out: any = {};
    Object.keys(value).forEach((key) => (out[key] = clone(value[key])));
    return out;
  };
if (!crypto.randomUUID)
  (crypto as any).randomUUID = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
if (!Promise.allSettled)
  (Promise as any).allSettled = (values: any[]) =>
    Promise.all(
      values.map((value) =>
        Promise.resolve(value).then(
          (value) => ({ status: "fulfilled", value }),
          (reason) => ({ status: "rejected", reason }),
        ),
      ),
    );
if (!Promise.prototype.finally)
  (Promise.prototype as any).finally = function (done: () => any) {
    return this.then(
      (value: any) => Promise.resolve(done()).then(() => value),
      (error: any) =>
        Promise.resolve(done()).then(() => {
          throw error;
        }),
    );
  };
if (!Array.prototype.flatMap)
  (Array.prototype as any).flatMap = function (fn: any) {
    return [].concat(...this.map(fn));
  };
if (!Array.prototype.flat)
  (Array.prototype as any).flat = function () {
    return [].concat(...this);
  };
if (!Object.fromEntries)
  (Object as any).fromEntries = (entries: any) => {
    const result: any = {};
    for (const [key, value] of entries) result[key] = value;
    return result;
  };
if (!Blob.prototype.arrayBuffer)
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
// Image elements are also usable CanvasImageSources on older WebViews.
if (!scope.createImageBitmap)
  scope.createImageBitmap = async (blob: Blob) => {
    const img: any = await imageElement(blob);
    img.close = () => {};
    return img;
  };
if (!scope.ResizeObserver)
  scope.ResizeObserver = class {
    listener: () => void;
    timer: number = 0;
    constructor(callback: any) {
      this.listener = () => callback([]);
    }
    observe() {
      window.addEventListener("resize", this.listener);
      this.listener();
    }
    unobserve() {
      this.disconnect();
    }
    disconnect() {
      window.removeEventListener("resize", this.listener);
    }
  };
function viewport() {
  document.documentElement.style.setProperty(
    "--app-height",
    `${window.visualViewport?.height || window.innerHeight}px`,
  );
}
window.addEventListener("resize", viewport);
window.visualViewport?.addEventListener("resize", viewport);
viewport();
// Detect actual flex gap layout, not merely parser support.
const probe = document.createElement("div");
probe.style.cssText =
  "position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px";
probe.appendChild(document.createElement("div"));
probe.appendChild(document.createElement("div"));
document.body.appendChild(probe);
if (probe.scrollHeight === 1)
  document.documentElement.classList.add("supports-flex-gap");
probe.remove();
