"use client";

import { AlignCenter, AlignLeft, AlignRight, Crop, Maximize2 } from "lucide-react";

export type ImagePlacement = {
  width: number;
  align: "left" | "center" | "right" | "full";
  fit: "cover" | "contain";
  focalX: number;
  focalY: number;
  caption: string;
  alt: string;
};

type Props = {
  value: ImagePlacement;
  onChange: (next: ImagePlacement) => void;
};

export default function ImagePlacementControls({ value, onChange }: Props) {
  const patch = (next: Partial<ImagePlacement>) => onChange({ ...value, ...next });

  return (
    <div className="image-controls">
      <div className="image-control-row">
        <span>Placement</span>
        <div className="segmented-control four-up">
          <button className={value.align === "left" ? "active" : ""} onClick={() => patch({ align: "left" })} aria-label="Align image left"><AlignLeft size={14} /></button>
          <button className={value.align === "center" ? "active" : ""} onClick={() => patch({ align: "center" })} aria-label="Center image"><AlignCenter size={14} /></button>
          <button className={value.align === "right" ? "active" : ""} onClick={() => patch({ align: "right" })} aria-label="Align image right"><AlignRight size={14} /></button>
          <button className={value.align === "full" ? "active" : ""} onClick={() => patch({ align: "full", width: 100 })} aria-label="Full width image"><Maximize2 size={14} /></button>
        </div>
      </div>

      <label className="range-field">
        <span>Width <strong>{value.width}%</strong></span>
        <input type="range" min="30" max="100" step="5" value={value.width} onChange={(event) => patch({ width: Number(event.target.value) })} />
      </label>

      <div className="image-control-row">
        <span>Fit</span>
        <div className="segmented-control">
          <button className={value.fit === "cover" ? "active" : ""} onClick={() => patch({ fit: "cover" })}><Crop size={13} /> Cover</button>
          <button className={value.fit === "contain" ? "active" : ""} onClick={() => patch({ fit: "contain" })}>Contain</button>
        </div>
      </div>

      <label className="range-field">
        <span>Horizontal focal point <strong>{value.focalX}%</strong></span>
        <input type="range" min="0" max="100" value={value.focalX} onChange={(event) => patch({ focalX: Number(event.target.value) })} />
      </label>
      <label className="range-field">
        <span>Vertical focal point <strong>{value.focalY}%</strong></span>
        <input type="range" min="0" max="100" value={value.focalY} onChange={(event) => patch({ focalY: Number(event.target.value) })} />
      </label>

      <label className="stacked-field"><span>Caption</span><textarea rows={3} value={value.caption} onChange={(event) => patch({ caption: event.target.value })} /></label>
      <label className="stacked-field"><span>Alt text</span><input value={value.alt} onChange={(event) => patch({ alt: event.target.value })} placeholder="Describe this image" /></label>
    </div>
  );
}
