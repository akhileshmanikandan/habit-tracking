"use client";

import { useRef, useEffect, useCallback } from "react";
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
  streaksByUser: Map<string, number>; // userId → max streak
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

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const time = Date.now() - startTimeRef.current;
      const lighting = getLighting();
      const tod = getTimeOfDay();

      // Clear
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

      // Center the grid
      const centerX = width / 2;
      const centerY = height * 0.35;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw ground tiles for each plot
      for (const plot of plots) {
        for (let dc = 0; dc < 2; dc++) {
          for (let dr = 0; dr < 2; dr++) {
            const iso = gridToIso(plot.gridCol + dc, plot.gridRow + dr);
            drawIsometricTile(ctx, iso.x, iso.y, tod === "night");
          }
        }
      }

      // Draw campfire area (center)
      const campfireIso = gridToIso(1.5, 1.5);

      // Draw trees for each plot
      for (const plot of plots) {
        const plotCenter = gridToIso(plot.gridCol + 0.5, plot.gridRow + 0.5);

        // Username label
        ctx.fillStyle = tod === "night" ? "#B5D1A8" : "#3A5A28";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(plot.username, plotCenter.x, plotCenter.y + 35);

        // Draw trees
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

        // Wildlife based on streak
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

      ctx.restore();

      // Particles (screen space)
      if (particlesRef.current) {
        if (groupStreakDays > 5 || tod === "night") {
          particlesRef.current.spawnFireflies(8);
        }
        particlesRef.current.spawnLeaves(3);
        particlesRef.current.update(16);
        particlesRef.current.draw(ctx);
      }

      // Canvas overlay for lighting
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

  // Handle tap on canvas
  const handleCanvasTap = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!onPlotTap) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height * 0.35;

    // Find closest plot
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

    if (closestUserId) onPlotTap(closestUserId);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none"
      onClick={handleCanvasTap}
      onTouchStart={handleCanvasTap}
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
