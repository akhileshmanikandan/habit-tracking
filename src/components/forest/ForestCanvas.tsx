"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { gridToIso, TILE_WIDTH, TILE_HEIGHT, type PlotLayout } from "@/lib/forest/isometric-grid";
import { drawTree } from "@/lib/forest/tree-renderer";
import { getLighting } from "@/lib/forest/lighting";
import { ParticleSystem } from "@/lib/forest/particle-system";
import { drawWildlife } from "@/lib/forest/wildlife";
import { getTimeOfDay } from "@/lib/utils/time-of-day";

interface ForestCanvasProps {
  plots: PlotLayout[];
  groupStreakDays: number;
  allLoggedToday: boolean;
  streaksByUser: Map<string, number>;
  onPlotTap?: (userId: string) => void;
}

export function ForestCanvas({
  plots,
  groupStreakDays,
  allLoggedToday,
  streaksByUser,
  onPlotTap,
}: ForestCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const wateringRef = useRef<{ x: number; y: number; framesLeft: number } | null>(null);

  // Zoom & pan state (refs to avoid re-renders on every frame)
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef<{
    type: "none" | "pan" | "pinch";
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startDist: number;
    startScale: number;
  }>({ type: "none", startX: 0, startY: 0, startPanX: 0, startPanY: 0, startDist: 0, startScale: 1 });

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const time = Date.now() - startTimeRef.current;
      const lighting = getLighting();
      const tod = getTimeOfDay();
      const scale = scaleRef.current;
      const pan = panRef.current;

      ctx.clearRect(0, 0, width, height);

      // Background
      if (tod === "night") {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#0D1508");
        grad.addColorStop(0.4, "#1A2412");
        grad.addColorStop(1, "#243318");
        ctx.fillStyle = grad;
      } else if (tod === "golden") {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#FFF3E0");
        grad.addColorStop(0.5, "#F5F0E8");
        grad.addColorStop(1, "#E8DCC8");
        ctx.fillStyle = grad;
      } else if (tod === "morning") {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#E3F0F7");
        grad.addColorStop(0.5, "#F5F0E8");
        grad.addColorStop(1, "#EDE8DC");
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#F5F0E8");
        grad.addColorStop(1, "#EDE8DC");
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, width, height);

      // Apply zoom + pan, centered on the middle of the canvas
      const centerX = width / 2;
      const centerY = height * 0.35;

      ctx.save();
      ctx.translate(centerX + pan.x, centerY + pan.y);
      ctx.scale(scale, scale);

      // Draw ground tiles for each plot
      for (const plot of plots) {
        for (let dc = 0; dc < 2; dc++) {
          for (let dr = 0; dr < 2; dr++) {
            const iso = gridToIso(plot.gridCol + dc, plot.gridRow + dr);
            drawIsometricTile(ctx, iso.x, iso.y, tod === "night");
          }
        }
      }

      const campfireIso = gridToIso(1.5, 1.5);

      // Draw trees for each plot
      for (const plot of plots) {
        const plotCenter = gridToIso(plot.gridCol + 0.5, plot.gridRow + 0.5);

        ctx.fillStyle = tod === "night" ? "#B5D1A8" : "#3A5A28";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(plot.username, plotCenter.x, plotCenter.y + 35);

        for (const tree of plot.trees) {
          const treeX = plotCenter.x + tree.offsetX;
          const treeY = plotCenter.y + tree.offsetY - 10;

          drawTree({
            ctx,
            x: treeX,
            y: treeY,
            species: tree.category,
            stage: tree.stage,
            isDormant: tree.isDormant,
            isGlowing: tree.isGlowing,
            lighting,
            time,
          });
        }

        const maxStreak = streaksByUser.get(plot.userId) || 0;
        if (maxStreak >= 7) {
          const bx = plotCenter.x + Math.sin(time / 2000) * 25;
          const by = plotCenter.y - 30 + Math.cos(time / 1500) * 10;
          drawWildlife(ctx, "butterfly", bx, by, time);
        }
        if (maxStreak >= 14) {
          drawWildlife(ctx, "bird", plotCenter.x + 25, plotCenter.y - 45, time);
        }
        if (maxStreak >= 30) {
          drawWildlife(ctx, "deer", plotCenter.x - 20, plotCenter.y + 15, time);
        }
      }

      // Campfire
      if (allLoggedToday) {
        drawCampfire(ctx, campfireIso.x, campfireIso.y, time);
        if (particlesRef.current) {
          particlesRef.current.spawnCampfireSparks(campfireIso.x, campfireIso.y - 5, 6);
        }
      }

      // Water animation particles (in world space, before ctx.restore)
      if (wateringRef.current && wateringRef.current.framesLeft > 0) {
        if (particlesRef.current) {
          particlesRef.current.spawnWaterDrops(wateringRef.current.x, wateringRef.current.y, 3);
        }
        wateringRef.current.framesLeft--;
        if (wateringRef.current.framesLeft <= 0) wateringRef.current = null;
      }

      ctx.restore();

      // Particles (screen space, not affected by zoom)
      if (particlesRef.current) {
        if (groupStreakDays > 5 || tod === "night") {
          particlesRef.current.spawnFireflies(8);
        }
        particlesRef.current.spawnLeaves(3);
        particlesRef.current.update(16);
        particlesRef.current.draw(ctx);
      }

      ctx.fillStyle = lighting.canvasOverlay;
      ctx.fillRect(0, 0, width, height);
    },
    [plots, groupStreakDays, allLoggedToday, streaksByUser]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      if (!particlesRef.current) {
        particlesRef.current = new ParticleSystem(rect.width, rect.height);
      } else {
        particlesRef.current.resize(rect.width, rect.height);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  // --- Touch gesture handlers for pan & pinch-zoom ---
  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      gestureRef.current = {
        type: "pinch",
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
        startDist: dist,
        startScale: scaleRef.current,
      };
    } else if (e.touches.length === 1) {
      // Pan start
      gestureRef.current = {
        type: "pan",
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
        startDist: 0,
        startScale: scaleRef.current,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const g = gestureRef.current;
    if (g.type === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const newScale = Math.min(3, Math.max(0.5, g.startScale * (dist / g.startDist)));
      scaleRef.current = newScale;

      // Also pan with two-finger drag
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      panRef.current = {
        x: g.startPanX + (midX - g.startX),
        y: g.startPanY + (midY - g.startY),
      };
    } else if (g.type === "pan" && e.touches.length === 1) {
      panRef.current = {
        x: g.startPanX + (e.touches[0].clientX - g.startX),
        y: g.startPanY + (e.touches[0].clientY - g.startY),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // If it was a quick single-finger tap (not a pan), fire onPlotTap
    if (gestureRef.current.type === "pan" && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - gestureRef.current.startX;
      const dy = e.changedTouches[0].clientY - gestureRef.current.startY;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        firePlotTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }
    gestureRef.current = { ...gestureRef.current, type: "none" };
  };

  // Mouse wheel zoom (desktop)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scaleRef.current = Math.min(3, Math.max(0.5, scaleRef.current + delta));
  };

  // Shared plot-tap logic
  const firePlotTap = (clientX: number, clientY: number) => {
    if (!onPlotTap) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    const pan = panRef.current;
    const x = (clientX - rect.left - rect.width / 2 - pan.x) / scale;
    const y = (clientY - rect.top - rect.height * 0.35 - pan.y) / scale;

    let closestUserId = "";
    let closestDist = Infinity;
    for (const plot of plots) {
      const plotCenter = gridToIso(plot.gridCol + 0.5, plot.gridRow + 0.5);
      const dist = Math.sqrt((x - plotCenter.x) ** 2 + (y - plotCenter.y) ** 2);
      if (dist < closestDist && dist < 60) {
        closestDist = dist;
        closestUserId = plot.userId;
      }
    }
    if (closestUserId) {
      // Trigger water animation at the tapped plot
      const tappedPlot = plots.find((p) => p.userId === closestUserId);
      if (tappedPlot) {
        const plotCenter = gridToIso(tappedPlot.gridCol + 0.5, tappedPlot.gridRow + 0.5);
        // Convert world coords to screen coords for particles
        const screenX = plotCenter.x * scale + canvas.getBoundingClientRect().width / 2 + pan.x;
        const screenY = plotCenter.y * scale + canvas.getBoundingClientRect().height * 0.35 + pan.y;
        wateringRef.current = { x: screenX, y: screenY, framesLeft: 45 };
      }
      onPlotTap(closestUserId);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    firePlotTap(e.clientX, e.clientY);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ touchAction: "none" }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    />
  );
}

function drawIsometricTile(ctx: CanvasRenderingContext2D, x: number, y: number, isNight: boolean) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  ctx.fillStyle = isNight ? "#1E3014" : "#C8D8A0";
  ctx.strokeStyle = isNight ? "#2A4018" : "#B0C48E";
  ctx.lineWidth = 0.5;

  ctx.beginPath();
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Log base
  ctx.fillStyle = "#5C4033";
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flames
  const flicker = Math.sin(time / 100) * 2;
  const flicker2 = Math.cos(time / 130) * 1.5;

  // Outer flame
  ctx.fillStyle = "rgba(255, 100, 0, 0.8)";
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.quadraticCurveTo(x - 4 + flicker, y - 16, x, y - 20 + flicker2);
  ctx.quadraticCurveTo(x + 4 - flicker, y - 16, x + 6, y);
  ctx.fill();

  // Inner flame
  ctx.fillStyle = "rgba(255, 200, 50, 0.9)";
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.quadraticCurveTo(x - 1 + flicker2, y - 10, x, y - 14 + flicker);
  ctx.quadraticCurveTo(x + 1 - flicker2, y - 10, x + 3, y);
  ctx.fill();

  // Warm glow
  const glowGrad = ctx.createRadialGradient(x, y - 5, 2, x, y - 5, 30);
  glowGrad.addColorStop(0, "rgba(255, 150, 50, 0.15)");
  glowGrad.addColorStop(1, "rgba(255, 150, 50, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x - 30, y - 35, 60, 60);
}
