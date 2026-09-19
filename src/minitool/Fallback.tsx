import { useApp } from "../store";
import { inScene } from "../furnishings";
import { spaceBounds } from "../space";
export function MiniFallback({
  message = "当前设备无法显示完整 3D，仍可通过布局图和物件面板继续编辑。",
}: {
  message?: string;
}) {
  const state = useApp(),
    p = state.project;
  if (!p) return <p>正在打开空间…</p>;
  const bounds = spaceBounds(p.design);
  const items = p.instances.filter(
    (i) => !i.stowed && inScene(i, p.design.scene),
  );
  return (
    <div className="mini-fallback">
      <h2>轻量布局</h2>
      <p role="status">{message}</p>
      <div className="mini-map" aria-label="空间俯视布局">
        {items.slice(0, 24).map((item) => (
          <button
            key={item.id}
            style={{
              left: `${Math.max(8, Math.min(92, ((item.position[0] - bounds.minX) / bounds.width) * 100))}%`,
              top: `${Math.max(8, Math.min(92, ((item.position[2] - bounds.minZ) / bounds.depth) * 100))}%`,
            }}
            onClick={() => {
              state.select(item.id);
              const trigger = document.getElementById("objects-toggle");
              if (trigger?.getAttribute("aria-expanded") !== "true")
                trigger?.click();
            }}
          >
            {item.name ||
              p.assets.find((a) => a.id === item.assetId)?.name ||
              "物件"}
          </button>
        ))}
      </div>
      <p>{items.length} 件物件；在物件面板调整位置、转向、复制或收起。</p>
    </div>
  );
}
