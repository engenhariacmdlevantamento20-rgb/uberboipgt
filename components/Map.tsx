"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type Pt = { lng: number; lat: number; color?: string; draggable?: boolean; title?: string };
type Props = {
  points: Pt[]; line?: [number, number][]; onMapClick?: (lng: number, lat: number) => void;
  onDrag?: (i: number, lng: number, lat: number) => void; height?: number;
};

const TILES = process.env.NEXT_PUBLIC_MAP_TILES_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const SAT = process.env.NEXT_PUBLIC_SAT_TILES_URL || "";

export default function MapView({ points, line, onMapClick, onDrag, height = 320 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const click = useRef(onMapClick); click.current = onMapClick;
  const drag = useRef(onDrag); drag.current = onDrag;
  const [ready, setReady] = useState(false);
  const [sat, setSat] = useState(false);
  const sig = useRef("");

  useEffect(() => {
    if (!box.current) return;
    const sources: Record<string, maplibregl.RasterSourceSpecification> = {
      base: { type: "raster", tiles: [TILES], tileSize: 256, attribution: "© OpenStreetMap" },
    };
    const layers: maplibregl.LayerSpecification[] = [{ id: "base", type: "raster", source: "base" }];
    if (SAT) { sources.sat = { type: "raster", tiles: [SAT], tileSize: 256 }; layers.push({ id: "sat", type: "raster", source: "sat", layout: { visibility: "none" } }); }
    const m = new maplibregl.Map({ container: box.current, style: { version: 8, sources, layers }, center: [-49.25, -16.68], zoom: 5 });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("line", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
      m.addLayer({ id: "line", type: "line", source: "line", paint: { "line-color": "#1E6FD9", "line-width": 5 }, layout: { "line-cap": "round", "line-join": "round" } });
      setReady(true);
    });
    m.on("click", (e) => click.current?.(e.lngLat.lng, e.lngLat.lat));
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m || !SAT) return;
    m.setLayoutProperty("sat", "visibility", sat ? "visible" : "none");
  }, [sat, ready]);

  useEffect(() => {
    const m = map.current; if (!m || !ready) return;
    markers.current.forEach((x) => x.remove());
    markers.current = points.map((p, i) => {
      const mk = new maplibregl.Marker({ color: p.color ?? "#1E3B2A", draggable: !!p.draggable }).setLngLat([p.lng, p.lat]);
      if (p.title) mk.setPopup(new maplibregl.Popup({ offset: 24 }).setText(p.title));
      mk.on("dragend", () => { const l = mk.getLngLat(); drag.current?.(i, l.lng, l.lat); });
      return mk.addTo(m);
    });
    const b = new maplibregl.LngLatBounds();
    (line ?? []).forEach((c) => b.extend(c)); points.forEach((p) => b.extend([p.lng, p.lat]));
    const next = `${points.length}|${line?.length ?? 0}`;
    if (next === sig.current) return; // só reenquadra quando muda a quantidade de pontos ou a rota
    sig.current = next;
    if (!b.isEmpty()) { if (points.length === 1 && !line?.length) m.easeTo({ center: [points[0].lng, points[0].lat], zoom: Math.max(m.getZoom(), 12) }); else m.fitBounds(b, { padding: 50, maxZoom: 15, duration: 400 }); }
  }, [points, line, ready]);

  useEffect(() => {
    const m = map.current; if (!m || !ready) return;
    (m.getSource("line") as maplibregl.GeoJSONSource).setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line ?? [] } });
  }, [line, ready]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={box} style={{ height, borderRadius: 14, overflow: "hidden", border: "2px solid var(--linha)" }} />
      {SAT && <button type="button" className="btn sec" onClick={() => setSat(!sat)} style={{ position: "absolute", left: 8, bottom: 8, width: "auto", minHeight: 40, padding: "6px 12px", marginBottom: 0, background: "#fff" }}>{sat ? "Mapa" : "Satélite"}</button>}
    </div>
  );
}
