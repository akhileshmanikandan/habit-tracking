import type { LightingConfig } from "./lighting";

// Procedural tree drawing on Canvas
// Each tree species has a distinct silhouette

type TreeStage = 0 | 1 | 2 | 3;
type TreeSpecies = "running" | "gym" | "general";

interface DrawTreeOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  species: TreeSpecies;
  stage: TreeStage;
  isDormant: boolean;
  isGlowing: boolean;
  lighting: LightingConfig;
  time: number; // animation time in ms
}

// Color palettes per species
const COLORS = {
  running: {
    trunk: "#6B4F3A",
    leaves: ["#2D5016", "#3A6B20", "#4A7F2E"],
    dormant: ["#8B8B6B", "#9B9B7B", "#7B7B5B"],
  },
  gym: {
    trunk: "#5C4033",
    leaves: ["#4A6741", "#5B7B52", "#3D5A35"],
    dormant: ["#7B8B6B", "#8B9B7B", "#6B7B5B"],
  },
  general: {
    trunk: "#7B5B47",
    leaves: ["#8FAE7E", "#A5C294", "#7B9A6A"],
    dormant: ["#AAA08B", "#BBB09B", "#9A907B"],
    petals: ["#F5B5C5", "#FFD0D9", "#E8A0B0"],
  },
};

export function drawTree(opts: DrawTreeOptions) {
  const { ctx, x, y, species, stage, isDormant, isGlowing, lighting, time } = opts;

  ctx.save();
  ctx.translate(x, y);

  // Glow effect
  if (isGlowing) {
    const glowIntensity = 0.3 + Math.sin(time / 800) * 0.15;
    ctx.shadowColor = `rgba(255, 200, 50, ${glowIntensity})`;
    ctx.shadowBlur = 20;
  }

  const colors = COLORS[species];
  const leafColors = isDormant ? colors.dormant : colors.leaves;

  switch (stage) {
    case 0:
      drawSeed(ctx, leafColors[0]);
      break;
    case 1:
      drawSprout(ctx, colors.trunk, leafColors);
      break;
    case 2:
      drawSapling(ctx, species, colors.trunk, leafColors, time);
      break;
    case 3:
      drawMatureTree(ctx, species, colors.trunk, leafColors, time);
      break;
  }

  // Dormant: falling leaves
  if (isDormant && stage > 0) {
    drawFallingLeaves(ctx, leafColors[0], time);
  }

  ctx.restore();
}

function drawSeed(ctx: CanvasRenderingContext2D, color: string) {
  // Small bump in the ground
  ctx.fillStyle = "#8B7355";
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tiny green dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -3, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSprout(ctx: CanvasRenderingContext2D, trunkColor: string, leafColors: string[]) {
  // Thin stem
  ctx.strokeStyle = trunkColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -18);
  ctx.stroke();

  // Two small leaves
  ctx.fillStyle = leafColors[0];
  ctx.beginPath();
  ctx.ellipse(-5, -16, 5, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = leafColors[1];
  ctx.beginPath();
  ctx.ellipse(5, -14, 5, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSapling(
  ctx: CanvasRenderingContext2D,
  species: TreeSpecies,
  trunkColor: string,
  leafColors: string[],
  time: number
) {
  const sway = Math.sin(time / 2000) * 1;

  // Trunk
  ctx.fillStyle = trunkColor;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-2, -30);
  ctx.lineTo(2, -30);
  ctx.lineTo(3, 0);
  ctx.fill();

  ctx.save();
  ctx.translate(sway, 0);

  if (species === "running") {
    // Pine sapling — triangular
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = leafColors[i % leafColors.length];
      const baseY = -20 - i * 12;
      ctx.beginPath();
      ctx.moveTo(0, baseY - 14);
      ctx.lineTo(-12 + i * 2, baseY);
      ctx.lineTo(12 - i * 2, baseY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (species === "gym") {
    // Oak sapling — round canopy
    ctx.fillStyle = leafColors[0];
    ctx.beginPath();
    ctx.arc(0, -35, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leafColors[1];
    ctx.beginPath();
    ctx.arc(-3, -33, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cherry blossom sapling — spreading
    ctx.fillStyle = leafColors[0];
    ctx.beginPath();
    ctx.arc(-6, -32, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leafColors[1];
    ctx.beginPath();
    ctx.arc(6, -30, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMatureTree(
  ctx: CanvasRenderingContext2D,
  species: TreeSpecies,
  trunkColor: string,
  leafColors: string[],
  time: number
) {
  const sway = Math.sin(time / 2500) * 1.5;

  // Thick trunk
  ctx.fillStyle = trunkColor;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-4, -40);
  ctx.lineTo(4, -40);
  ctx.lineTo(5, 0);
  ctx.fill();

  // Branches
  ctx.strokeStyle = trunkColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-2, -30);
  ctx.lineTo(-14, -38);
  ctx.moveTo(2, -28);
  ctx.lineTo(14, -36);
  ctx.stroke();

  ctx.save();
  ctx.translate(sway, 0);

  if (species === "running") {
    // Pine — tall triangular layers
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = leafColors[i % leafColors.length];
      const baseY = -28 - i * 14;
      const width = 20 - i * 3;
      ctx.beginPath();
      ctx.moveTo(0, baseY - 16);
      ctx.lineTo(-width, baseY);
      ctx.lineTo(width, baseY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (species === "gym") {
    // Oak — large round canopy
    ctx.fillStyle = leafColors[0];
    ctx.beginPath();
    ctx.arc(0, -48, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leafColors[1];
    ctx.beginPath();
    ctx.arc(-6, -46, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leafColors[2];
    ctx.beginPath();
    ctx.arc(8, -44, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cherry blossom — wide spreading with petals
    ctx.fillStyle = leafColors[0];
    ctx.beginPath();
    ctx.arc(-10, -46, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leafColors[1];
    ctx.beginPath();
    ctx.arc(10, -44, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leafColors[2];
    ctx.beginPath();
    ctx.arc(0, -50, 14, 0, Math.PI * 2);
    ctx.fill();

    // Petals
    const petalColors = COLORS.general.petals || [];
    for (let i = 0; i < 5; i++) {
      const px = Math.sin(time / 1000 + i * 1.2) * 18;
      const py = -50 + Math.cos(time / 1500 + i) * 8;
      ctx.fillStyle = petalColors[i % petalColors.length];
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawFallingLeaves(ctx: CanvasRenderingContext2D, color: string, time: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const progress = ((time / 3000 + i * 0.33) % 1);
    const lx = Math.sin(progress * Math.PI * 2 + i) * 15;
    const ly = -40 + progress * 50;
    const size = 2 - progress;
    ctx.globalAlpha = 1 - progress;
    ctx.beginPath();
    ctx.arc(lx, ly, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
