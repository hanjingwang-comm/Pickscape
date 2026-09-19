import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
export function surfaceTexture(kind: string, color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  let seed = 9283;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  x.fillStyle = color;
  x.fillRect(0, 0, 512, 512);
  if (kind === "wood" || kind === "herringbone") {
    x.fillStyle = "#c9af89";
    x.fillRect(0, 0, 512, 512);
    const plank = (a: number, b: number, w: number, h: number) => {
      x.fillStyle = `hsl(35 30% ${65 + random() * 12}%)`;
      x.fillRect(a, b, w, h);
      x.strokeStyle = "rgba(90,62,33,.14)";
      x.lineWidth = 1;
      x.strokeRect(a, b, w, h);
      for (let i = 0; i < 16; i++) {
        x.strokeStyle = `rgba(96,65,34,${random() * 0.07})`;
        x.beginPath();
        x.moveTo(a + random() * w, b + random() * h);
        x.lineTo(a + w, b + random() * h);
        x.stroke();
      }
    };
    if (kind === "wood") {
      for (let row = 0; row < 8; row++)
        for (let col = -1; col < 3; col++)
          plank(col * 256 + (row % 2) * 128, row * 64, 256, 64);
    } else {
      for (let i = -4; i < 20; i++)
        for (let j = -4; j < 20; j++) {
          const d = (((i - j) % 8) + 8) % 8;
          if (d === 0) plank(i * 32, j * 32, 128, 32);
          if (d === 7) {
            x.save();
            x.translate(i * 32 + 32, j * 32);
            x.rotate(Math.PI / 2);
            plank(0, 0, 128, 32);
            x.restore();
          }
        }
    }
  }
  if (kind === "checker") {
    x.fillStyle = "#e8e7d9";
    x.fillRect(0, 0, 512, 512);
    x.fillStyle = "#97a18b";
    x.fillRect(0, 0, 256, 256);
    x.fillRect(256, 256, 256, 256);
  }
  if (kind === "terrazzo") {
    x.fillStyle = "#e7e1d5";
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 950; i++) {
      x.fillStyle = ["#c2b09c", "#919585", "#d0bcad", "#f8f6ed"][i % 4];
      x.beginPath();
      const a = random() * 512,
        b = random() * 512,
        r = 1 + random() * 5;
      x.moveTo(a, b);
      x.lineTo(a + r, b + r * 0.3);
      x.lineTo(a + r * 0.6, b + r * 1.5);
      x.closePath();
      x.fill();
    }
  }
  if (kind === "stripes") {
    x.fillStyle = "#b0b69f";
    for (let i = 0; i < 512; i += 32) x.fillRect(i, 0, 7, 512);
  }
  if (kind === "linen") {
    for (let i = 0; i < 512; i += 3) {
      x.strokeStyle = "rgba(95,85,60,.08)";
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 512);
      x.stroke();
      x.beginPath();
      x.moveTo(0, i);
      x.lineTo(512, i);
      x.stroke();
    }
  }
  if (kind === "botanical") {
    x.strokeStyle = "#a6ae96";
    x.fillStyle = "#a6ae9655";
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 5; j++) {
        const a = i * 112 + (j % 2) * 35,
          b = j * 112;
        x.beginPath();
        x.moveTo(a, b + 90);
        x.quadraticCurveTo(a + 40, b + 40, a + 20, b + 5);
        x.stroke();
        for (let k = 0; k < 4; k++) {
          x.beginPath();
          x.ellipse(
            a + 20 + (k % 2 ? 13 : -7),
            b + 15 + k * 18,
            7,
            15,
            k % 2 ? 0.7 : -0.7,
            0,
            Math.PI * 2,
          );
          x.fill();
        }
      }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  if (kind === "herringbone") {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 4;
  }
  return t;
}
