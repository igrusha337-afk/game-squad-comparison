import { useRef, useEffect, useCallback } from 'react';
import { GameState } from './types';
import { MAP_W, MAP_H } from './engine';
import {
  renderBackground,
  renderDecorUnder,
  renderDecorOver,
  renderCapturePoints,
  renderUnits,
  renderCommanders,
  renderBuildings,
} from './gameCanvas/renderLayers';

interface Props {
  state: GameState;
  onMapClick: (x: number, y: number) => void;
  camera: { x: number; y: number; zoom: number };
  setCamera: (fn: (prev: { x: number; y: number; zoom: number }) => { x: number; y: number; zoom: number }) => void;
}

export default function GameCanvas({ state, onMapClick, camera, setCamera }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const tickRef = useRef(0);

  useEffect(() => { tickRef.current = state.tick; }, [state.tick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-camera.x * camera.zoom + W / 2, -camera.y * camera.zoom + H / 2);
    ctx.scale(camera.zoom, camera.zoom);

    renderBackground(ctx);
    renderDecorUnder(ctx);
    renderCapturePoints(ctx, state);
    renderDecorOver(ctx);
    renderBuildings(ctx, state);
    renderUnits(ctx, state, tickRef.current);
    renderCommanders(ctx, state, tickRef.current);

    ctx.restore();
  });

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX, py = (e.clientY - rect.top) * scaleY;
    const worldX = (px - canvas.width/2) / camera.zoom + camera.x;
    const worldY = (py - canvas.height/2) / camera.zoom + camera.y;
    onMapClick(worldX, worldY);
  }, [camera, onMapClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) { dragging.current = true; dragStart.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y }; }
  }, [camera]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const dx = (e.clientX-dragStart.current.x)/camera.zoom, dy = (e.clientY-dragStart.current.y)/camera.zoom;
    setCamera(prev => ({ ...prev, x: Math.max(0,Math.min(MAP_W,dragStart.current.cx-dx)), y: Math.max(0,Math.min(MAP_H,dragStart.current.cy-dy)) }));
  }, [camera.zoom, setCamera]);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setCamera(prev => ({ ...prev, zoom: Math.max(0.4, Math.min(2.5, prev.zoom - e.deltaY*0.001)) }));
  }, [setCamera]);

  return (
    <canvas
      ref={canvasRef}
      width={1200} height={800}
      style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
    />
  );
}
