// Wildlife that appears at streak milestones

export interface Wildlife {
  type: "butterfly" | "bird" | "deer";
  x: number;
  y: number;
}

export function drawWildlife(
  ctx: CanvasRenderingContext2D,
  type: Wildlife["type"],
  x: number,
  y: number,
  time: number
) {
  ctx.save();
  ctx.translate(x, y);

  switch (type) {
    case "butterfly":
      drawButterfly(ctx, time);
      break;
    case "bird":
      drawBird(ctx, time);
      break;
    case "deer":
      drawDeer(ctx, time);
      break;
  }

  ctx.restore();
}

function drawButterfly(ctx: CanvasRenderingContext2D, time: number) {
  const wingAngle = Math.sin(time / 200) * 0.6;
  const hover = Math.sin(time / 1000) * 3;

  ctx.save();
  ctx.translate(0, hover);

  // Left wing
  ctx.save();
  ctx.scale(Math.cos(wingAngle), 1);
  ctx.fillStyle = "#E8915A";
  ctx.beginPath();
  ctx.ellipse(-4, 0, 5, 3.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFB088";
  ctx.beginPath();
  ctx.ellipse(-3, 0, 3, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.scale(Math.cos(wingAngle), 1);
  ctx.fillStyle = "#E8915A";
  ctx.beginPath();
  ctx.ellipse(4, 0, 5, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFB088";
  ctx.beginPath();
  ctx.ellipse(3, 0, 3, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = "#3A2A1A";
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, time: number) {
  const bob = Math.sin(time / 800) * 1.5;

  ctx.save();
  ctx.translate(0, bob);

  // Body
  ctx.fillStyle = "#5C4033";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#6B4F3A";
  ctx.beginPath();
  ctx.arc(5, -2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#E8915A";
  ctx.beginPath();
  ctx.moveTo(8, -2);
  ctx.lineTo(10, -1.5);
  ctx.lineTo(8, -1);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#1A1A1A";
  ctx.beginPath();
  ctx.arc(6, -3, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = "#4A3828";
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-9, -2);
  ctx.lineTo(-8, 1);
  ctx.fill();

  ctx.restore();
}

function drawDeer(ctx: CanvasRenderingContext2D, time: number) {
  const headBob = Math.sin(time / 2000) * 2;

  // Body
  ctx.fillStyle = "#B8860B";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 5);
  ctx.lineTo(-7, 14);
  ctx.moveTo(-2, 5);
  ctx.lineTo(-1, 14);
  ctx.moveTo(3, 5);
  ctx.lineTo(4, 14);
  ctx.moveTo(7, 5);
  ctx.lineTo(8, 14);
  ctx.stroke();

  // Neck + head
  ctx.save();
  ctx.translate(10, -4 + headBob);

  ctx.fillStyle = "#C4960F";
  ctx.beginPath();
  ctx.ellipse(4, -4, 4, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#B8860B";
  ctx.beginPath();
  ctx.ellipse(7, -8, 3.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Antlers
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, -11);
  ctx.lineTo(4, -16);
  ctx.lineTo(2, -14);
  ctx.moveTo(4, -16);
  ctx.lineTo(5, -19);
  ctx.moveTo(8, -11);
  ctx.lineTo(10, -16);
  ctx.lineTo(12, -14);
  ctx.moveTo(10, -16);
  ctx.lineTo(9, -19);
  ctx.stroke();

  // Eye
  ctx.fillStyle = "#1A1A1A";
  ctx.beginPath();
  ctx.arc(8.5, -9, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // White spot
  ctx.fillStyle = "#FFF8DC";
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
