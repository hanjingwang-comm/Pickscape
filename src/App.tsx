import { isMiniTool } from "./platform";
import {
  useGeneration,
  queueGeneration,
  generationLabel,
  generationActive,
} from "./generation";
import { ModelThumbnail } from "./ModelThumbnail";
import { gardenPropCatalog } from "./gardenProps";
import { uprightRotation, isFloorCovering } from "./placement";
import { spaceBounds, maxSpaceSize, spaceStep } from "./space";
import { paintingGlb } from "./painting";
import { wallsForDesign, mountedWall, wallCenter } from "./walls";
import { inScene, inventoryFor } from "./furnishings";
import { referenceCollection, loadReferencePhotos } from "./collection";
import { useMemo, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowSquareOut,
  ArrowsOutCardinal,
  Camera,
  Check,
  CheckCircle,
  Cube,
  DownloadSimple,
  Eye,
  GridFour,
  ImageSquare,
  LockSimple,
  LockSimpleOpen,
  MagnifyingGlass,
  Minus,
  Plus,
  Sun,
  Trash,
  UploadSimple,
  X,
  Copy,
  Cursor,
  ArrowsOut,
  SpinnerGap,
  FolderOpen,
  HouseLine,
  Stack,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { useApp, emptyProject } from "./store";
import {
  defaultDesign,
  projectDisplayName,
  scenes,
  uid,
  type Asset,
  type Photo,
  type Project,
  type V3,
} from "./types";
import {
  download,
  exportProject,
  importProject,
  initialProject,
  listProjects,
  readProject,
  saveProject,
  validatePhoto,
} from "./storage";
import { AssetPreview, EditorCanvas, type SceneBridge } from "./Scene";
import { parseModel, disposeModel } from "./models";
import "./style.css";
import { surfaceTexture } from "./textures";
const pondReference = new URL(
  "./assets/references/pond/reference.png",
  import.meta.url,
).href;
const wisteriaReference = new URL(
  "./assets/references/wisteria/reference.png",
  import.meta.url,
).href;
function BlobImage({
  blob,
  ...props
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return <img src={url || undefined} {...props} />;
}
function Button({
  children,
  label,
  onClick,
  active,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`icon-button ${active ? "active" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <Button label="关闭" onClick={onClose}>
          <X />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
function NumberField({
  label,
  value,
  onChange,
  disabled = false,
  min = -100,
  max = 100,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Math.round(value * 100) / 100)), [value]);
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text);
          if (text !== "" && Number.isFinite(n)) {
            const v = Math.min(max, Math.max(min, n));
            if (v !== value) onChange(v);
            setText(String(v));
          } else setText(String(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="range">
      <span>{label}</span>
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output>{Math.round(value * 100)}%</output>
    </label>
  );
}
function DesignPanel({ onView }: { onView: () => void }) {
  const d = useApp((s) => s.project!.design),
    change = useApp((s) => s.design);
  const bounds = spaceBounds(d);
  const expand = (axis: "width" | "depth") =>
    Math.min(maxSpaceSize, Math.round((bounds[axis] + spaceStep) * 10) / 10);
  const thumbnails = useMemo(
    () =>
      Object.fromEntries(
        [
          "wood",
          "herringbone",
          "terrazzo",
          "checker",
          "plain",
          "linen",
          "stripes",
          "botanical",
        ].map((kind) => {
          const t = surfaceTexture(kind, d.color);
          const url = (t.image as HTMLCanvasElement).toDataURL();
          t.dispose();
          return [kind, url];
        }),
      ),
    [d.color],
  );
  return (
    <div className="design-controls">
      <section className="space-expansion">
        <h3>拓宽空间</h3>
        <p className="space-dimensions" aria-live="polite">
          宽 {bounds.width.toFixed(1)} × 深 {bounds.depth.toFixed(1)}{" "}
          <small>空间单位</small>
        </p>
        <div className="expansion-actions">
          <button
            disabled={bounds.width >= maxSpaceSize}
            onClick={() => change({ width: expand("width") })}
          >
            加宽 +1.6
          </button>
          <button
            disabled={bounds.depth >= maxSpaceSize}
            onClick={() => change({ depth: expand("depth") })}
          >
            加深 +1.6
          </button>
          <button
            disabled={
              bounds.width >= maxSpaceSize && bounds.depth >= maxSpaceSize
            }
            onClick={() =>
              change({ width: expand("width"), depth: expand("depth") })
            }
          >
            整体扩展
          </button>
          <button onClick={onView}>查看全景</button>
        </div>
      </section>
      {d.scene === "garden" ? (
        <section>
          <h3>草地</h3>
        </section>
      ) : (
        <section>
          <h3>地板</h3>
          <div className="swatches">
            {(
              [
                ["wood", "浅木"],
                ["herringbone", "人字拼"],
                ["terrazzo", "水磨石"],
                ["checker", "棋盘格"],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                aria-pressed={d.floor === id}
                onClick={() => change({ floor: id })}
              >
                <span
                  className={`swatch ${id} ${d.floor === id ? "chosen" : ""}`}
                  style={{
                    backgroundImage: `url(${thumbnails[id]})`,
                    backgroundSize: "cover",
                  }}
                >
                  {d.floor === id && <CheckCircle weight="fill" />}
                </span>
                <span>{name}</span>
              </button>
            ))}
          </div>
          <Range
            label="纹理大小"
            value={d.textureScale}
            min={0.3}
            max={3}
            onChange={(textureScale) => change({ textureScale })}
          />
        </section>
      )}
      <section>
        <h3>墙面</h3>
        <div className="swatches">
          {(
            [
              ["plain", "素白"],
              ["linen", "亚麻"],
              ["stripes", "细条纹"],
              ["botanical", "浅色花纹"],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              aria-pressed={d.wall === id}
              onClick={() => change({ wall: id })}
            >
              <span
                className={`swatch ${id} ${d.wall === id ? "chosen" : ""}`}
                style={{
                  backgroundColor: d.color,
                  backgroundImage: `url(${thumbnails[id]})`,
                  backgroundSize: "cover",
                }}
              >
                {d.wall === id && <CheckCircle weight="fill" />}
              </span>
              <span>{name}</span>
            </button>
          ))}
        </div>
        <label className="color-field">
          底色
          <input
            type="color"
            aria-label="墙面底色"
            value={d.color}
            onChange={(e) => change({ color: e.target.value })}
          />
          <span>{d.color.toUpperCase()}</span>
        </label>
        {["blank", "garden"].includes(d.scene) && (
          <p className="helper">当前场景为开放空间。墙纸适用于客厅与画廊。</p>
        )}
      </section>
      <section>
        <h3>光影</h3>
        <div className="times">
          {(
            [
              ["morning", "清晨"],
              ["noon", "正午"],
              ["evening", "傍晚"],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              aria-pressed={d.time === id}
              onClick={() => change({ time: id })}
            >
              <span
                className={`time-image ${id} ${d.time === id ? "chosen" : ""}`}
              >
                <span />
                {d.time === id && <CheckCircle weight="fill" />}
              </span>
              {name}
            </button>
          ))}
        </div>
        <Range
          label="光照强度"
          value={d.intensity}
          min={0.2}
          max={2}
          onChange={(intensity) => change({ intensity })}
        />
        <Range
          label="阴影柔和"
          value={d.softness / 8}
          min={0}
          max={1}
          onChange={(softness) => change({ softness: softness * 8 })}
        />
      </section>
      <button
        className="text-button reset"
        onClick={() => change({ ...defaultDesign, scene: d.scene })}
      >
        <ArrowCounterClockwise />
        恢复默认材质
      </button>
    </div>
  );
}
function ItemText({
  label,
  value,
  onCommit,
  disabled = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const props = {
    "aria-label": label,
    value: draft,
    disabled,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: () => {
      if (draft !== value) onCommit(draft);
    },
  };
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          {...props}
          maxLength={1000}
          placeholder="写下这件物品的故事…"
        />
      ) : (
        <input {...props} maxLength={80} />
      )}
    </label>
  );
}
function PagedItems({ children }: { children: ReactNode[] }) {
  const [page, setPage] = useState(0);
  const count = Math.max(1, Math.ceil(children.length / 12));
  const current = Math.min(page, count - 1);
  return (
    <>
      {children.slice(current * 12, current * 12 + 12)}
      {count > 1 && (
        <div className="list-pages">
          <button disabled={current === 0} onClick={() => setPage(current - 1)}>
            上一页
          </button>
          <span>
            {current + 1} / {count}
          </span>
          <button
            disabled={current === count - 1}
            onClick={() => setPage(current + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </>
  );
}
function ObjectPanel() {
  const state = useApp(),
    p = state.project!;
  const { stored, placed, elsewhere } = inventoryFor(p);
  const [inventoryTab, setInventoryTab] = useState<
    "placed" | "stored" | "catalog"
  >("placed");
  const selectedItem = p.instances.find((item) => item.id === state.selected);
  useEffect(() => {
    if (selectedItem)
      setInventoryTab(selectedItem.stowed ? "stored" : "placed");
  }, [selectedItem?.id, selectedItem?.stowed, p.design.scene]);
  const place = (id: string) => {
    state.placeItem(id);
    setInventoryTab("placed");
  };
  const addFixture = (
    kind: (typeof gardenPropCatalog)[number]["kind"] | "pond" | "wisteria",
  ) => {
    if (kind === "pond") state.addPond();
    else if (kind === "wisteria") state.addWisteria();
    else state.addGardenProp(kind);
    const id = useApp.getState().selected;
    if (id) place(id);
  };
  const rows = (items: typeof p.instances) => (
    <PagedItems key={items[0]?.stowed ? "stored" : items[0]?.scene || "placed"}>
      {items.map((i) => (
        <div
          className={`inventory-row ${i.id === state.selected ? "current" : ""}`}
          key={i.id}
          onDragEnd={() => useApp.setState({ draggingItem: null })}
          draggable={!!i.stowed && !i.locked}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-yidu-instance", i.id);
            useApp.setState({ draggingItem: i.id });
            e.dataTransfer.effectAllowed = "move";
          }}
        >
          <button
            onClick={() => {
              if (!i.stowed && i.scene && !inScene(i, p.design.scene))
                state.design({ scene: i.scene });
              state.select(i.id);
            }}
            aria-pressed={i.id === state.selected}
          >
            <ModelThumbnail
              fixture={i.fixture}
              fixtureModel={i.fixtureModel}
              asset={p.assets.find((a) => a.id === i.assetId)}
              name={
                i.name ||
                p.assets.find((a) => a.id === i.assetId)?.name ||
                "物件"
              }
              fallbackBlob={
                p.photos.find(
                  (photo) =>
                    photo.id ===
                    p.assets.find((a) => a.id === i.assetId)?.photoId,
                )?.thumb
              }
              fallback={
                gardenPropCatalog.find((entry) => entry.kind === i.fixture)
                  ?.reference
              }
            />
            <span className="inventory-label">
              {i.name ||
                p.assets.find((a) => a.id === i.assetId)?.name ||
                "物件"}
              <small>
                {i.stowed
                  ? "已收起"
                  : `${scenes.find((scene) => scene.id === (i.scene || p.design.scene))?.name} · 已摆放${i.locked ? " · 已固定" : ""}`}
              </small>
            </span>
          </button>
          {i.stowed && (
            <button
              className="restore-item"
              disabled={i.locked}
              onClick={() => place(i.id)}
            >
              放置
            </button>
          )}
        </div>
      ))}
    </PagedItems>
  );
  return (
    <>
      <div className="inventory-tabs" role="tablist" aria-label="物件状态">
        {(
          [
            ["placed", "已摆放", placed.length],
            ["stored", "已收起", stored.length],
            ["catalog", "添加", null],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            id={`inventory-tab-${id}`}
            aria-controls="inventory-content"
            aria-selected={inventoryTab === id}
            onClick={() => {
              state.select(null);
              setInventoryTab(id);
            }}
          >
            {label}
            {count !== null && <span>{count}</span>}
          </button>
        ))}
      </div>
      {state.selected && <SelectedObjectPanel />}
      <div
        id="inventory-content"
        role="tabpanel"
        aria-labelledby={`inventory-tab-${inventoryTab}`}
      >
        {inventoryTab === "placed" && (
          <>
            <section
              className="scene-inventory"
              aria-label="当前场景已摆放物件"
            >
              <h3>
                {scenes.find((scene) => scene.id === p.design.scene)?.name}
                <span>{placed.length} 件</span>
              </h3>
              {placed.length ? (
                rows(placed)
              ) : (
                <p className="helper">当前场景还没有物件。</p>
              )}
            </section>
            {elsewhere.length > 0 && (
              <details className="scene-inventory">
                <summary>其他场景 · {elsewhere.length} 件</summary>
                {rows(elsewhere)}
              </details>
            )}
          </>
        )}
        {inventoryTab === "stored" && (
          <section className="scene-inventory" aria-label="已收起物件">
            {stored.length ? (
              rows(stored)
            ) : (
              <p className="helper">没有已收起的物件。</p>
            )}
          </section>
        )}
        {inventoryTab === "catalog" && (
          <>
            {p.assets
              .filter((asset) => asset.status === "ready")
              .map((asset) => (
                <section className="botanical-item" key={asset.id}>
                  <ModelThumbnail
                    asset={asset}
                    name={asset.name}
                    fallbackBlob={
                      p.photos.find((photo) => photo.id === asset.photoId)
                        ?.thumb
                    }
                  />
                  <div>
                    <h3>{asset.name}</h3>
                    <button
                      onClick={() => {
                        state.add(asset.id);
                        setInventoryTab("placed");
                      }}
                    >
                      <Plus size={16} /> 放入场景
                    </button>
                  </div>
                </section>
              ))}
            <PagedItems>
              {[
                ...gardenPropCatalog,
                {
                  kind: "pond" as const,
                  name: "鸢尾石岸池塘",
                  reference: pondReference,
                },
                {
                  kind: "wisteria" as const,
                  name: "紫藤花树",
                  reference: wisteriaReference,
                },
              ].map((entry) => (
                <section className="botanical-item" key={entry.kind}>
                  <ModelThumbnail
                    fixture={entry.kind}
                    name={entry.name}
                    fallback={entry.reference}
                  />
                  <div>
                    <h3>{entry.name}</h3>
                    <button
                      aria-label={`放入${entry.name}`}
                      onClick={() => addFixture(entry.kind)}
                    >
                      <Plus size={16} /> 放入场景
                    </button>
                  </div>
                </section>
              ))}
            </PagedItems>
          </>
        )}
      </div>
    </>
  );
}

function SelectedObjectPanel() {
  const state = useApp(),
    item = state.project!.instances.find((i) => i.id === state.selected),
    a = state.project!.assets.find((a) => a.id === item?.assetId);
  if (!item)
    return (
      <div className="empty-inspector">
        <Cursor size={32} />
        <h3>选择一件物品</h3>
        <p>点击场景中的物品，调整它的位置、角度与大小。</p>
      </div>
    );
  const wall = mountedWall(item, state.project!.design);
  const floorCovering = isFloorCovering(item);
  const transform = (
    field: "position" | "rotation",
    index: number,
    value: number,
  ) => {
    const v = [...item[field]] as V3;
    v[index] = field === "rotation" ? (value * Math.PI) / 180 : value;
    state.transform(item.id, { [field]: v });
  };
  return (
    <div className="object-controls">
      <div className="object-title">
        <h3>{item.name || a?.name || "场景物件"}</h3>
        {item.locked && <LockSimple />}
      </div>
      {item.locked && <p className="helper">物件已固定，解锁后可编辑。</p>}
      <section className="item-information" key={item.id}>
        <ItemText
          label="物件名称"
          value={item.name || a?.name || "场景物件"}
          disabled={item.locked}
          onCommit={(name) => {
            if (name.trim()) state.transform(item.id, { name: name.trim() });
          }}
        />
        <ItemText
          label="收藏笔记"
          value={item.notes || ""}
          disabled={item.locked}
          multiline
          onCommit={(notes) => state.transform(item.id, { notes })}
        />
        <p className="helper">
          {item.fixture
            ? "可自由布置，也可收起后带到其他场景。"
            : "此处修改只影响这一件物品。"}
        </p>
      </section>
      <div className="placement-actions">
        <button
          className="primary"
          disabled={item.locked}
          onClick={() => {
            if (item.stowed) state.placeItem(item.id);
            else {
              state.setMode("select");
              state.select(null);
            }
          }}
        >
          <Check /> {item.stowed ? "放入当前场景" : "完成放置"}
        </button>
        <button
          disabled={item.locked || item.stowed}
          onClick={() => {
            state.transform(item.id, { stowed: true });
            state.select(null);
          }}
        >
          <DownloadSimple /> 收起物件
        </button>
      </div>
      {(item.fixture === "art" || item.wall !== undefined) &&
        (state.project!.design.scene === "gallery" ||
          (item.fixture === "gearClock" &&
            state.project!.design.scene === "living")) && (
          <section>
            <label className="wall-placement">
              摆放方式
              <select
                aria-label={
                  item.fixture === "gearClock" ? "挂钟摆放方式" : "画作摆放方式"
                }
                value={item.wall || "back"}
                disabled={item.locked}
                onChange={(e) => {
                  const surface = wallsForDesign(state.project!.design).find(
                    (w) => w.id === e.target.value,
                  );
                  if (surface)
                    state.transform(item.id, {
                      wall: surface.id,
                      rotation: [...surface.rotation],
                      position:
                        surface.id === wall?.id
                          ? item.position
                          : wallCenter(surface),
                    });
                  else state.transform(item.id, { wall: "free" });
                }}
              >
                {wallsForDesign(state.project!.design).map((surface) => (
                  <option key={surface.id} value={surface.id}>
                    沿{surface.name}移动
                  </option>
                ))}
                <option value="free">自由摆放</option>
              </select>
            </label>
          </section>
        )}
      <p className="helper">
        {floorCovering
          ? "地毯始终平铺贴地，可水平移动、转向和缩放，不会吸附到桌面。"
          : wall
            ? "拖动物件可沿墙上下左右移动，物件会保持在墙面前方。可切换墙面，或选择自由摆放。"
            : "选中后，拖动箭头或物品来移动，拖动外圈来水平转向。自动贴合桌面、展台或地面；需要抬高时可修改下方高度。"}
      </p>
      <section>
        <h3>位置</h3>
        <div className="numeric-row">
          {["X", "Y", "Z"].map((axis, i) => (
            <NumberField
              key={axis}
              label={`位置 ${axis}`}
              value={item.position[i]}
              disabled={
                item.locked || wall?.axis === i || (floorCovering && i === 1)
              }
              onChange={(n) => transform("position", i, n)}
            />
          ))}
        </div>
        <button
          className="text-button"
          disabled={item.locked || item.stowed}
          onClick={() => state.settle(item.id)}
        >
          {floorCovering ? "贴合地面" : wall ? "贴合墙面" : "贴合承托面"}
        </button>
        <button
          disabled={item.locked || !!wall}
          className="text-button"
          onClick={() =>
            state.transform(item.id, {
              position: [item.position[0], 0, item.position[2]],
            })
          }
        >
          放到地面
        </button>
      </section>
      <section>
        <h3>{wall ? "画作角度" : "水平转向"}</h3>
        {!wall && (
          <>
            <NumberField
              label="朝向角度 °"
              value={(item.rotation[1] * 180) / Math.PI}
              min={-360}
              max={360}
              step={15}
              disabled={item.locked}
              onChange={(angle) =>
                state.transform(item.id, {
                  rotation: uprightRotation((angle * Math.PI) / 180),
                })
              }
            />
            <div className="placement-actions">
              <button
                disabled={item.locked}
                onClick={() =>
                  state.transform(item.id, {
                    rotation: uprightRotation(item.rotation[1] - Math.PI / 12),
                  })
                }
              >
                左转 15°
              </button>
              <button
                disabled={item.locked}
                onClick={() =>
                  state.transform(item.id, {
                    rotation: uprightRotation(item.rotation[1] + Math.PI / 12),
                  })
                }
              >
                右转 15°
              </button>
            </div>
            <button
              className="text-button"
              disabled={item.locked}
              onClick={() =>
                state.transform(item.id, {
                  rotation: uprightRotation(item.rotation[1]),
                  settleOnLoad: !item.stowed,
                })
              }
            >
              恢复平放并贴合承托面
            </button>
          </>
        )}
        {!floorCovering && (
          <details className="advanced-rotation">
            <summary>{wall ? "调整画作角度" : "高级旋转（倾斜物件）"}</summary>
            <div className="numeric-row">
              {["X", "Y", "Z"].map((axis, i) => (
                <NumberField
                  key={axis}
                  label={`旋转 ${axis}`}
                  value={(item.rotation[i] * 180) / Math.PI}
                  min={-360}
                  max={360}
                  step={15}
                  disabled={item.locked}
                  onChange={(n) => transform("rotation", i, n)}
                />
              ))}
            </div>
          </details>
        )}
      </section>
      <section>
        <h3>大小</h3>
        <NumberField
          label="等比缩放 %"
          value={item.scale * 100}
          min={5}
          max={1000}
          step={5}
          disabled={item.locked}
          onChange={(n) => state.transform(item.id, { scale: n / 100 })}
        />
      </section>
      <div className="object-actions">
        <Button label="复制物件" onClick={state.duplicate}>
          <Copy />
          <span>复制</span>
        </Button>
        <Button
          label={item.locked ? "解锁物件" : "锁定物件"}
          onClick={state.lock}
        >
          {item.locked ? <LockSimpleOpen /> : <LockSimple />}
          <span>{item.locked ? "解锁" : "固定"}</span>
        </Button>
        <Button label="删除物件" disabled={item.locked} onClick={state.remove}>
          <Trash />
          <span>删除</span>
        </Button>
      </div>
    </div>
  );
}
let saveQueue = Promise.resolve();
export default function App() {
  const state = useApp(),
    p = state.project;
  const [view, setView] = useState<"editor" | "gallery">("editor"),
    [drawer, setDrawer] = useState<"inspector" | null>(null),
    [scenesOpen, setScenesOpen] = useState(false),
    [panel, setPanel] = useState<"object" | "space">("space"),
    [detail, setDetail] = useState<string | null>(null),
    [filter, setFilter] = useState("all"),
    [reordering, setReordering] = useState(false),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [projects, setProjects] = useState<Project[] | null>(null),
    [candidate, setCandidate] = useState<Asset | null>(null),
    [help, setHelp] = useState(false),
    [generationSettings, setGenerationSettings] = useState(false),
    [autoGenerate, setAutoGenerate] = useState(false);
  const persistGeneration = async () => {
    saveQueue = saveQueue
      .catch(() => {})
      .then(async () => {
        const current = useApp.getState().project;
        if (current) await saveProject(current);
      });
    try {
      await saveQueue;
    } catch (e) {
      useApp.setState({
        saving: "error",
        saveError: "生成任务或模型保存失败，请检查浏览器存储空间并导出备份。",
      });
      throw e;
    }
  };
  const { config: generationService, refresh: refreshGeneration } =
    useGeneration(persistGeneration);
  const upload = useRef<HTMLInputElement>(null),
    restore = useRef<HTMLInputElement>(null),
    modelInput = useRef<HTMLInputElement>(null),
    bridge = useRef<SceneBridge | null>(null);
  const notify = (m: string) => setToast(m);
  useEffect(() => {
    const save = () => {
      const s = useApp.getState();
      if (s.project && s.saving === "saving")
        void saveProject(s.project).catch(() => {});
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    initialProject()
      .then((p) => useApp.getState().load(p))
      .catch((e) => {
        useApp.getState().load(emptyProject());
        useApp.setState({ saving: "error", saveError: e.message });
      });
  }, []);
  useEffect(() => {
    if (!p) return;
    let cancelled = false;
    const projectId = p.id;
    loadReferencePhotos(p.photos)
      .then(({ photos, failures }) => {
        if (cancelled || useApp.getState().project?.id !== projectId) return;
        if (photos.length)
          useApp.getState().updateMeta((current) => {
            for (const photo of photos) {
              if (
                !current.photos.some(
                  (existing) =>
                    existing.id === photo.id ||
                    existing.referenceKey === photo.referenceKey,
                )
              )
                current.photos.push(photo);
            }
          });
        if (failures) notify(`${failures} 张参考照片加载失败，请刷新重试。`);
      })
      .catch(() => {
        if (!cancelled) notify("参考照片加载失败，请刷新重试。");
      });
    return () => {
      cancelled = true;
    };
  }, [p?.id]);
  useEffect(() => {
    if (!p || state.saving === "loading") return;
    const rev = state.revision;
    const timer = setTimeout(() => {
      const current = useApp.getState().project!;
      saveQueue = saveQueue
        .catch(() => {})
        .then(() => saveProject(current))
        .then(() => {
          if (useApp.getState().revision === rev)
            useApp.setState({ saving: "saved", saveError: "" });
        })
        .catch((e) =>
          useApp.setState({
            saving: "error",
            saveError: `保存失败：${e.name === "QuotaExceededError" ? "浏览器空间不足，请导出备份。" : e.message}`,
          }),
        );
    }, 350);
    return () => clearTimeout(timer);
  }, [state.revision]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,dialog"))
        return;
      const s = useApp.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s.duplicate();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.remove();
      }
      if (e.key === "Escape") {
        s.select(null);
        setDrawer(null);
        setScenesOpen(false);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  useEffect(() => {
    if (state.selected) setPanel("object");
  }, [state.selected]);
  useEffect(() => {
    if (state.selected && panel === "object")
      document.querySelector(".inspector")?.scrollTo({ top: 0 });
  }, [state.selected, panel]);
  async function handlePhotos(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    let count = 0;
    const uploadProject = p?.id;
    for (const file of Array.from(files)) {
      try {
        const thumb = await validatePhoto(file),
          id = uid(),
          name = file.name.replace(/\.[^.]+$/, ""),
          assetId = uid();
        if (useApp.getState().project?.id !== uploadProject) break;
        state.addPhoto(
          { id, name, blob: file, thumb, example: false },
          { id: assetId, photoId: id, name, kind: "glb", status: "pending" },
        );
        if (autoGenerate && generationService.configured)
          queueGeneration(assetId);
        count++;
      } catch (e) {
        notify(`${file.name}：${(e as Error).message}`);
      }
    }
    if (count) {
      setFilter("all");
      setView("gallery");
      notify(
        `已收藏 ${count} 张照片。${autoGenerate && generationService.configured ? "已加入 3D 生成队列，可在照片档案查看进度。" : isMiniTool ? "可以在照片档案制成装框画作。" : "打开照片档案即可导入 3D 模型。"}`,
      );
    }
    setBusy(false);
    if (upload.current) upload.current.value = "";
  }
  async function doExport() {
    if (!p) return;
    setBusy(true);
    try {
      download(
        await exportProject(p),
        `${projectDisplayName(p.name)}.pickscape`,
      );
      notify("备份已导出，包含原始照片、模型与空间设置。");
    } catch (e) {
      notify(`导出失败：${(e as Error).message}`);
    }
    setBusy(false);
  }
  async function doImport(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const project = await importProject(file);
      await saveProject(project);
      state.load(project);
      setView("editor");
      notify("已作为独立项目恢复，原项目仍保留。");
    } catch (e) {
      notify(`无法导入：${(e as Error).message}`);
    }
    setBusy(false);
    if (restore.current) restore.current.value = "";
  }
  async function makePainting() {
    if (!photo || !asset || !p) return;
    const projectId = p.id,
      photoId = photo.id;
    setBusy(true);
    try {
      const model = await paintingGlb(photo.blob);
      if (useApp.getState().project?.id !== projectId) return;
      const current = useApp
        .getState()
        .project!.assets.find((a) => a.photoId === photoId);
      if (current)
        setCandidate({
          ...current,
          model,
          kind: "glb",
          status: "ready",
          preserveScale: true,
          placement: "wall",
        });
    } catch (e) {
      notify(`制作画作失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }
  async function modelImport(file?: File) {
    if (!file || !detail || !p) return;
    setBusy(true);
    try {
      const group = await parseModel(file);
      disposeModel(group);
      const a = p.assets.find((a) => a.photoId === detail);
      if (!a) throw new Error("未找到对应照片");
      setCandidate({ ...a, kind: "glb", model: file, status: "ready" });
    } catch (e) {
      notify((e as Error).message);
    }
    setBusy(false);
    if (modelInput.current) modelInput.current.value = "";
  }
  async function switchProject(id: string) {
    await saveQueue;
    const current = useApp.getState().project;
    if (current) await saveProject(current);
    const next = await readProject(id);
    if (next) state.load(next);
    setProjects(null);
  }
  if (!p)
    return (
      <div className="loading">
        <HouseLine size={36} />
        <h1>拾境 · Pickscape</h1>
        <p>正在打开你的创作室…</p>
      </div>
    );
  const photos = p.photos.filter(
    (x) => filter === "all" || (filter === "mine" ? !x.example : x.example),
  );
  const photo = p.photos.find((ph) => ph.id === detail),
    asset = p.assets.find((a) => a.photoId === detail);
  return (
    <div className={`app ${view}`}>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => setView("editor")}
          aria-label="拾境 · Pickscape 首页"
        >
          <HouseLine size={32} weight="light" />
          <span className="brand-cn">拾境</span>
          <span className="brand-dot">·</span>
          <span className="brand-en">Pickscape</span>
        </button>
        <nav>
          <button
            className={view === "editor" ? "selected" : ""}
            onClick={() => setView("editor")}
          >
            造境
          </button>
          <button
            className={view === "gallery" ? "selected" : ""}
            onClick={() => setView("gallery")}
          >
            拾影
          </button>
        </nav>
        <div className="header-actions">
          {generationService.enabled && (
            <Button
              label="图片转 3D 设置"
              onClick={() => {
                setGenerationSettings(true);
                void refreshGeneration();
              }}
            >
              <Cube />
            </Button>
          )}
          <span className={`save-status ${state.saving}`} role="status">
            {state.saving === "saved" ? (
              <Check />
            ) : state.saving === "error" ? (
              <span>!</span>
            ) : (
              <SpinnerGap className="spin" />
            )}
            {state.saving === "saved"
              ? "已保存"
              : state.saving === "error"
                ? "保存失败"
                : "保存中"}
          </span>
          <Button
            label={isMiniTool ? "我的项目" : "项目与备份"}
            onClick={() =>
              listProjects()
                .then(setProjects)
                .catch((e) => notify(e.message))
            }
          >
            <FolderOpen />
          </Button>
          {!isMiniTool && (
            <button
              className="export-button"
              onClick={doExport}
              disabled={busy}
            >
              <DownloadSimple />
              导出备份
            </button>
          )}
        </div>
      </header>
      {state.saveError && (
        <div className="save-alert" role="alert">
          {state.saveError}
          <button onClick={() => useApp.getState().commit()}>重试</button>
          {!isMiniTool && <button onClick={doExport}>导出备份</button>}
        </div>
      )}
      {view === "editor" ? (
        <main
          className={`studio ${drawer ? `drawer-${drawer}` : ""} ${scenesOpen ? "drawer-scenes" : ""}`}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            const trigger = e.currentTarget.querySelector<HTMLButtonElement>(
              scenesOpen
                ? ".scene-launcher"
                : panel === "object"
                  ? "#objects-toggle"
                  : "#design-toggle",
            );
            setDrawer(null);
            setScenesOpen(false);
            trigger?.focus();
          }}
        >
          {(drawer || scenesOpen) && (
            <button
              className="drawer-backdrop"
              aria-label="关闭侧栏"
              onClick={() => {
                setDrawer(null);
                setScenesOpen(false);
              }}
              tabIndex={-1}
            />
          )}
          <nav className="panel-launchers glass-surface" aria-label="创作工具">
            <button
              id="objects-toggle"
              aria-expanded={drawer === "inspector" && panel === "object"}
              aria-controls="inspector-panel"
              className={
                drawer === "inspector" && panel === "object" ? "active" : ""
              }
              onClick={() => {
                setPanel("object");
                setDrawer(
                  drawer === "inspector" && panel === "object"
                    ? null
                    : "inspector",
                );
                setScenesOpen(false);
              }}
            >
              <Cube weight="light" />
              <span>物件</span>
            </button>
            <button
              id="design-toggle"
              aria-expanded={drawer === "inspector" && panel === "space"}
              aria-controls="inspector-panel"
              className={
                drawer === "inspector" && panel === "space" ? "active" : ""
              }
              onClick={() => {
                setPanel("space");
                setDrawer(
                  drawer === "inspector" && panel === "space"
                    ? null
                    : "inspector",
                );
                setScenesOpen(false);
              }}
            >
              <Sun weight="light" />
              <span>空间设计</span>
            </button>
          </nav>
          <nav className="scene-rail glass-surface" aria-label="场景工具">
            <button
              className={`scene-launcher ${scenesOpen ? "active" : ""}`}
              aria-expanded={scenesOpen}
              aria-controls="scenes-panel"
              onClick={() => {
                setScenesOpen(!scenesOpen);
                setDrawer(null);
              }}
            >
              <Stack weight="light" />
              <span>场景</span>
              <small>{scenes.find((s) => s.id === p.design.scene)?.name}</small>
              {scenesOpen ? (
                <CaretRight className="rail-caret" />
              ) : (
                <CaretLeft className="rail-caret" />
              )}
            </button>
          </nav>
          <aside
            id="scenes-panel"
            className="scene-panel glass-surface"
            aria-label="场景列表"
            hidden={!scenesOpen}
          >
            <div className="side-heading">
              <div>
                <h2>场景</h2>
              </div>
              <Button label="收起场景列表" onClick={() => setScenesOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="scene-options">
              {scenes.map((s) => (
                <button
                  key={s.id}
                  className={`scene-option ${p.design.scene === s.id ? "active" : ""}`}
                  aria-pressed={p.design.scene === s.id}
                  onClick={() => {
                    if (p.design.scene !== s.id) state.design({ scene: s.id });
                    setScenesOpen(false);
                  }}
                >
                  <span
                    className={`scene-mini scene-mini-${s.id}`}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                    <b />
                  </span>
                  <span className="scene-option-name">
                    {s.name}
                    {p.design.scene === s.id && <CheckCircle weight="fill" />}
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <section className="workspace">
            <EditorCanvas bridge={bridge} />
            {p.instances.some(
              (i) =>
                i.id === state.selected &&
                !i.stowed &&
                !i.locked &&
                inScene(i, p.design.scene),
            ) && (
              <div className="placement-hint" role="status">
                {mountedWall(
                  p.instances.find((i) => i.id === state.selected),
                  p.design,
                )
                  ? "拖动箭头沿墙移动 · 点击空白完成"
                  : "拖箭头移动 · 拖圆环转向 · 点击空白完成"}
              </div>
            )}
            <div className="toolbar">
              {(
                [
                  { mode: "select", name: "选择", icon: Cursor },
                  { mode: "move", name: "移动", icon: ArrowsOutCardinal },
                  { mode: "rotate", name: "旋转", icon: ArrowClockwise },
                  { mode: "scale", name: "缩放", icon: ArrowsOut },
                ] as const
              ).map((t) => (
                <Button
                  key={t.mode}
                  label={t.name}
                  active={state.mode === t.mode}
                  onClick={() => state.setMode(t.mode)}
                >
                  <t.icon />
                  <span>{t.name}</span>
                </Button>
              ))}
              <i />
              <Button label="俯视" onClick={() => bridge.current?.view(true)}>
                <Eye />
              </Button>
              <Button
                label="恢复视角"
                onClick={() => bridge.current?.view(false)}
              >
                <Camera />
              </Button>
              <Button
                label="网格吸附"
                active={state.snap}
                onClick={() => useApp.setState({ snap: !state.snap })}
              >
                <GridFour />
              </Button>
              <i />
              <Button
                label="撤销"
                disabled={!state.past.length}
                onClick={state.undo}
              >
                <ArrowCounterClockwise />
              </Button>
              <Button
                label="重做"
                disabled={!state.future.length}
                onClick={state.redo}
              >
                <ArrowClockwise />
              </Button>
            </div>
            {state.selected && (
              <div className="selection-strip">
                <span>
                  {p.instances.find((i) => i.id === state.selected)?.name ||
                    p.assets.find(
                      (a) =>
                        a.id ===
                        p.instances.find((i) => i.id === state.selected)
                          ?.assetId,
                    )?.name ||
                    "场景物件"}
                </span>
                <button
                  onClick={() => {
                    setPanel("object");
                    setDrawer("inspector");
                    setScenesOpen(false);
                  }}
                >
                  修改信息
                </button>
                <button
                  onClick={() => {
                    state.setMode("select");
                    state.select(null);
                  }}
                >
                  完成放置
                </button>
              </div>
            )}
          </section>
          <aside
            id="inspector-panel"
            className="inspector glass-surface"
            aria-label={panel === "space" ? "空间设计" : "物件"}
            hidden={drawer !== "inspector"}
          >
            <div className="side-heading">
              <div>
                <h2>{panel === "space" ? "空间设计" : "物件"}</h2>
              </div>
              <button
                className="drawer-close"
                aria-label="关闭设计面板"
                onClick={() => setDrawer(null)}
              >
                <X />
              </button>
            </div>
            {panel === "space" ? (
              <DesignPanel onView={() => bridge.current?.view(false)} />
            ) : (
              <ObjectPanel />
            )}
          </aside>
        </main>
      ) : (
        <main className="gallery-page">
          <div className="gallery-head">
            <div>
              <h1>拾影</h1>
            </div>
            <button
              className="primary"
              onClick={() => upload.current?.click()}
              disabled={busy}
            >
              <Plus />
              上传照片
            </button>
          </div>
          <div className="gallery-tools">
            <div>
              {[
                ["all", "全部"],
                ["mine", "我的"],
                ["examples", "示例"],
              ].map(([id, name]) => (
                <button
                  key={id}
                  className={filter === id ? "selected" : ""}
                  onClick={() => setFilter(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              className={reordering ? "selected" : ""}
              onClick={() => setReordering(!reordering)}
            >
              <GridFour />
              {reordering ? "完成排序" : "排列顺序"}
            </button>
          </div>
          <div className="photo-grid">
            <PagedItems>
              {photos.map((ph) => {
                const a = p.assets.find((a) => a.photoId === ph.id),
                  index = p.photos.findIndex((v) => v.id === ph.id);
                return (
                  <article className="polaroid" key={ph.id}>
                    <button
                      className="photo-image"
                      onClick={() => setDetail(ph.id)}
                    >
                      <BlobImage
                        blob={ph.thumb}
                        alt={ph.name}
                        className={ph.id === "mug" ? "focal-mug" : undefined}
                      />
                      <span className="zoom-photo">
                        <MagnifyingGlass />
                      </span>
                    </button>
                    <div className="photo-caption">
                      <button onClick={() => setDetail(ph.id)}>
                        {ph.name}
                      </button>
                      <span>
                        {ph.example ? "示例" : "我的"} ·{" "}
                        {a?.status === "ready" || ph.referenceKey
                          ? "已有 3D"
                          : generationLabel(a)}
                      </span>
                      {reordering && (
                        <div className="reorder">
                          <Button
                            label={`前移${ph.name}`}
                            disabled={index === 0}
                            onClick={() =>
                              state.updateMeta((p) => {
                                [p.photos[index - 1], p.photos[index]] = [
                                  p.photos[index],
                                  p.photos[index - 1],
                                ];
                              })
                            }
                          >
                            <ArrowLeft />
                          </Button>
                          <Button
                            label={`后移${ph.name}`}
                            disabled={index === p.photos.length - 1}
                            onClick={() =>
                              state.updateMeta((p) => {
                                [p.photos[index + 1], p.photos[index]] = [
                                  p.photos[index],
                                  p.photos[index + 1],
                                ];
                              })
                            }
                          >
                            <ArrowLeft
                              style={{ transform: "rotate(180deg)" }}
                            />
                          </Button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </PagedItems>
          </div>
          {!photos.length && (
            <div className="gallery-empty">
              <ImageSquare size={44} weight="light" />
              <h2>这里，留给你的日常</h2>
              <p>上传一张照片，开始你的私人收藏。</p>
              <button
                className="primary"
                onClick={() => upload.current?.click()}
              >
                上传第一张照片
              </button>
            </div>
          )}
          <footer className="gallery-footer">
            <button onClick={() => setView("editor")}>
              进入造境 <ArrowSquareOut />
            </button>
            <span>{photos.length} 张照片 · 仅保存在此浏览器</span>
          </footer>
        </main>
      )}
      <input
        ref={upload}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => handlePhotos(e.target.files)}
      />
      {!isMiniTool && (
        <input
          ref={restore}
          type="file"
          accept=".pickscape,.yidu"
          hidden
          onChange={(e) => doImport(e.target.files?.[0])}
        />
      )}
      {!isMiniTool && (
        <input
          ref={modelInput}
          type="file"
          accept=".glb"
          hidden
          onChange={(e) => modelImport(e.target.files?.[0])}
        />
      )}
      {photo && !asset && (
        <Modal title={photo.name} onClose={() => setDetail(null)}>
          <div className="reference-photo">
            <BlobImage blob={photo.blob} alt={photo.name} />
          </div>
          <div className="detail-body">
            {referenceCollection
              .find((entry) => entry.key === photo.referenceKey)
              ?.items.map((entry) => (
                <section className="botanical-item" key={entry.kind}>
                  <ModelThumbnail fixture={entry.kind} name={entry.name} />
                  <div>
                    <h3>{entry.name}</h3>
                    <button
                      onClick={() => {
                        if (entry.kind === "pond") state.addPond();
                        else if (entry.kind === "wisteria") state.addWisteria();
                        else state.addGardenProp(entry.kind);
                        const id = useApp.getState().selected;
                        if (id) state.placeItem(id);
                        setDetail(null);
                        setView("editor");
                      }}
                    >
                      <Plus size={16} /> 放入场景
                    </button>
                  </div>
                </section>
              ))}
          </div>
        </Modal>
      )}
      {photo && asset && (
        <Modal
          title="物件档案"
          onClose={() => {
            setDetail(null);
            setCandidate(null);
          }}
        >
          <div className="detail-visuals">
            <div>
              <BlobImage blob={photo.blob} alt={photo.name} />
              <span>原始照片</span>
            </div>
            <div className="detail-model">
              {(candidate || asset).status === "ready" ? (
                <AssetPreview asset={candidate || asset} interactive />
              ) : (
                <div className="pending">
                  <Cube size={38} weight="light" />
                  <p role="status">{generationLabel(asset)}</p>
                  <span>
                    {asset.generation?.message ||
                      (generationService.enabled
                        ? "照片已收藏。生成完成后自动加入物件，可预览并放入任意空间。"
                        : isMiniTool
                          ? "照片已收藏，可以制成装框画作。"
                          : "照片已收藏。导入对应的 GLB 模型后，即可预览并放入任意空间。")}
                  </span>
                  {asset.generation?.state === "active" &&
                    asset.generation.step === "poll" &&
                    asset.generation.progress !== undefined && (
                      <progress
                        aria-label="3D 生成进度"
                        max={100}
                        value={asset.generation.progress}
                      />
                    )}
                </div>
              )}
              <span>
                {candidate
                  ? "模型预览 · 确认后加入物件"
                  : asset.status === "ready"
                    ? "3D 预览 · 拖动旋转"
                    : generationLabel(asset)}
              </span>
            </div>
          </div>
          <div className="detail-body">
            <label className="rename">
              名称
              <input
                aria-label="照片名称"
                value={photo.name}
                maxLength={60}
                onChange={(e) =>
                  state.updateMeta((p) => {
                    const ph = p.photos.find((p) => p.id === photo.id)!,
                      a = p.assets.find((a) => a.photoId === photo.id)!;
                    ph.name = e.target.value;
                    a.name = e.target.value;
                  })
                }
              />
            </label>
            {asset.generatedBy && (
              <p className="helper">
                由 Meshy
                根据照片近似生成，背面与真实尺寸需要检查。可旋转预览后再放入空间。
              </p>
            )}
            {photo.example && (
              <p className="helper">
                依照片制作的近似示例；遮挡与背面部分为推测，不代表真实尺寸。
              </p>
            )}
            {photo.source && (
              <p className="source">
                摄影：{photo.source.author} ·{" "}
                {isMiniTool ? (
                  <span>{photo.source.author}</span>
                ) : (
                  <a href={photo.source.url} target="_blank" rel="noreferrer">
                    查看来源 ↗
                  </a>
                )}{" "}
                · {photo.source.license}
              </p>
            )}
            {generationService.enabled &&
              asset.status === "pending" &&
              !candidate && (
                <div className="generation-controls">
                  <p className="helper">
                    图片转 3D 使用 Meshy
                    云端服务，会发送这张照片的缩小副本并消耗你的 Meshy
                    额度。单次生成通常需要等待，进度来自服务端。
                  </p>
                  {generationActive(asset) ? (
                    <button
                      onClick={() =>
                        state.updateMeta((p) => {
                          const a = p.assets.find((a) => a.id === asset.id)!;
                          if (a.generation)
                            a.generation = {
                              ...a.generation,
                              state: "paused",
                              message:
                                "已暂停本页连接；云端任务仍会继续，恢复连接即可取回。",
                            };
                        })
                      }
                    >
                      暂停连接
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        generationService.configured
                          ? queueGeneration(asset.id)
                          : setGenerationSettings(true)
                      }
                    >
                      {!generationService.configured
                        ? "配置 3D 生成服务"
                        : asset.generation?.state === "paused" ||
                            asset.generation?.state === "uncertain"
                          ? "恢复连接 / 取回模型"
                          : asset.generation?.state === "failed"
                            ? "重新生成（消耗额度）"
                            : "发送照片并生成 3D"}
                    </button>
                  )}
                  {asset.generation?.state === "uncertain" && (
                    <p className="helper">
                      请到 Meshy 后台核对提交结果；也可以下载已完成的
                      GLB，再用下方入口导入。
                    </p>
                  )}
                </div>
              )}
            <div className="detail-actions">
              {candidate ? (
                <>
                  <button
                    className="primary"
                    onClick={() => {
                      state.updateMeta((p) => {
                        p.assets = p.assets.map((a) =>
                          a.id === candidate.id ? candidate : a,
                        );
                      });
                      setCandidate(null);
                      notify("模型已加入物件。");
                    }}
                  >
                    确认使用此模型
                  </button>
                  <button onClick={() => setCandidate(null)}>取消导入</button>
                </>
              ) : (
                <>
                  {!isMiniTool && (
                    <button
                      className="primary"
                      onClick={() => modelInput.current?.click()}
                      disabled={busy}
                    >
                      <UploadSimple />
                      {asset.status === "ready"
                        ? "替换 GLB 模型"
                        : "导入 GLB 模型"}
                    </button>
                  )}
                  {asset.status === "pending" && (
                    <button onClick={makePainting} disabled={busy}>
                      制成装框画作
                    </button>
                  )}
                  {asset.status === "ready" && (
                    <button
                      onClick={() => {
                        state.add(asset.id);
                        setDetail(null);
                        setView("editor");
                      }}
                    >
                      添加到空间 <Plus />
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="helper">
              {isMiniTool
                ? "画作可直接装框并保留原图比例。"
                : "支持自包含 GLB，最大 50 MB。也可手动导入模型；画作可直接装框并保留原图比例。建议使用单一物件、主体完整、背景干净的照片。"}
            </p>
          </div>
        </Modal>
      )}
      {projects && (
        <Modal title="项目与备份" onClose={() => setProjects(null)}>
          <div className="project-list">
            {projects.map((pr) => (
              <button key={pr.id} onClick={() => switchProject(pr.id)}>
                <FolderOpen />
                <span>
                  <strong>{projectDisplayName(pr.name)}</strong>
                  <small>
                    {pr.photos.length} 张照片 · {pr.instances.length} 件物品
                  </small>
                </span>
                {p.id === pr.id && <Check />}
              </button>
            ))}
          </div>
          <div className="backup-actions">
            <button
              onClick={async () => {
                await saveProject(p);
                state.load(emptyProject());
                setProjects(null);
              }}
            >
              <Plus />
              新建空白项目
            </button>
            {!isMiniTool && (
              <button onClick={() => restore.current?.click()} disabled={busy}>
                <UploadSimple />
                导入项目备份
              </button>
            )}
            {!isMiniTool && (
              <button onClick={doExport} disabled={busy}>
                <DownloadSimple />
                导出当前项目
              </button>
            )}
          </div>
          <p className="helper">
            {isMiniTool
              ? "照片和布置保存在此小工具中。清理小工具数据后无法恢复。"
              : "照片和模型只保存在当前浏览器。支持 .pickscape 与旧版 .yidu 备份，导入会新建项目。清理浏览器数据前，请导出备份。"}
          </p>
        </Modal>
      )}
      {generationService.enabled && generationSettings && (
        <Modal title="图片转 3D" onClose={() => setGenerationSettings(false)}>
          <div className="help-body generation-settings">
            <p role="status">
              <strong>
                Meshy ·{" "}
                {generationService.configured ? "本机密钥已配置" : "服务未配置"}
              </strong>
            </p>
            <p>
              上传照片 → 云端生成 → 检查模型 →
              自动加入物件。生成期间仍可布置空间；关闭页面后，重新打开原项目即可继续取回结果。
            </p>
            {!generationService.configured && (
              <>
                <p>
                  在项目目录创建 <code>.env.local</code>，填写{" "}
                  <code>MESHY_API_KEY=你的密钥</code>，再重新运行{" "}
                  <code>npm run dev</code>。不要把密钥填入聊天、前端代码或 VITE_
                  变量。
                </p>
                {generationService.error && (
                  <p role="alert">{generationService.error}</p>
                )}
                <button onClick={() => void refreshGeneration()}>
                  重新检查连接
                </button>
              </>
            )}
            <p>
              启用后，新上传照片的缩小副本会发送到
              Meshy，并使用你账户的付费额度。原图保存在浏览器；已有照片可从档案单独生成。模型为
              AI 近似重建，需要检查背面和尺寸。
            </p>
            <label className="generation-consent">
              <input
                type="checkbox"
                checked={autoGenerate && generationService.configured}
                disabled={!generationService.configured}
                onChange={(e) => setAutoGenerate(e.target.checked)}
              />
              允许发送新照片到 Meshy，上传后自动生成（本次打开有效）
            </label>
            <p className="helper">
              同时处理一张照片，完成后处理下一张。暂停连接不会取消云端任务。备份包含已完成模型；未完成任务只可在原浏览器项目与原本机服务中恢复。
            </p>
            <a
              href="https://www.meshy.ai/settings/api"
              target="_blank"
              rel="noreferrer"
            >
              打开 Meshy 获取 API 密钥 ↗
            </a>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="在拾境里，自由布置" onClose={() => setHelp(false)}>
          <div className="help-body">
            <p>
              <strong>收藏</strong>　上传 JPG、PNG、WebP
              照片，在拾影查看和命名。
            </p>
            <p>
              <strong>成为立体</strong>　打开照片档案，导入对应的 GLB
              模型并检查预览。
            </p>
            <p>
              <strong>布置</strong>　把素材拖入场景，或点击 ＋
              添加。选择模式可直接拖动物件。
            </p>
            <p>
              <strong>视角</strong>　拖动空白处旋转，滚轮缩放，右键拖动平移。
            </p>
            <p>
              <strong>编辑</strong>
              　使用移动／旋转工具或右侧数值输入。固定后需先解锁。
            </p>
            <p>
              <strong>空间</strong>　切换场景、地板、墙纸与早中晚光影。
            </p>
            <p>
              <strong>快捷键</strong>　⌘/Ctrl Z 撤销，⇧ ⌘/Ctrl Z 重做，⌘/Ctrl D
              复制，Delete 删除。
            </p>
          </div>
        </Modal>
      )}
      {busy && (
        <div className="busy" role="status">
          <SpinnerGap className="spin" />
          正在处理文件…
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
