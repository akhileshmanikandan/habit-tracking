import { getTimeOfDay } from "@/lib/utils/time-of-day";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "firefly" | "leaf" | "spark" | "water";
}

export class ParticleSystem {
  particles: Particle[] = [];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  spawnFireflies(count: number) {
    const tod = getTimeOfDay();
    if (tod !== "night" && tod !== "golden") return;

    while (this.particles.filter((p) => p.type === "firefly").length < count) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.7 + this.height * 0.1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: 3000 + Math.random() * 4000,
        size: 1.5 + Math.random() * 1.5,
        color: tod === "night" ? "#FFEB3B" : "#FFC107",
        type: "firefly",
      });
    }
  }

  spawnLeaves(count: number) {
    while (this.particles.filter((p) => p.type === "leaf").length < count) {
      this.particles.push({
        x: Math.random() * this.width,
        y: -10,
        vx: 0.2 + Math.random() * 0.3,
        vy: 0.3 + Math.random() * 0.4,
        life: 0,
        maxLife: 8000 + Math.random() * 4000,
        size: 2 + Math.random() * 2,
        color: ["#8FAE7E", "#A5C294", "#6B8A5E", "#D4A76A"][Math.floor(Math.random() * 4)],
        type: "leaf",
      });
    }
  }

  spawnCampfireSparks(cx: number, cy: number, count: number) {
    while (this.particles.filter((p) => p.type === "spark").length < count) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random() * 2,
        life: 0,
        maxLife: 1000 + Math.random() * 1500,
        size: 1 + Math.random() * 2,
        color: ["#FF6B35", "#FF9F1C", "#FFD166"][Math.floor(Math.random() * 3)],
        type: "spark",
      });
    }
  }

  spawnWaterDrops(cx: number, cy: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy - 40 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1.5 + Math.random() * 2,
        life: Math.random() * 500,
        maxLife: 1500 + Math.random() * 1000,
        size: 1.5 + Math.random() * 2,
        color: ["#64B5F6", "#42A5F5", "#90CAF9", "#BBDEFB"][Math.floor(Math.random() * 4)],
        type: "water",
      });
    }
  }

  update(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      if (p.life > p.maxLife) return false;

      if (p.type === "firefly") {
        // Sinusoidal movement
        p.x += p.vx + Math.sin(p.life / 500) * 0.2;
        p.y += p.vy + Math.cos(p.life / 700) * 0.15;
      } else if (p.type === "leaf") {
        p.x += p.vx + Math.sin(p.life / 800) * 0.5;
        p.y += p.vy;
      } else if (p.type === "spark") {
        // Spark — rises and fades
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.01; // slight deceleration
      } else if (p.type === "water") {
        // Water drops — fall down with slight sway
        p.x += p.vx + Math.sin(p.life / 300) * 0.3;
        p.y += p.vy;
        p.vy += 0.05; // gravity
      }

      return true;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      let alpha: number;

      if (p.type === "firefly") {
        // Pulse in and out
        alpha = Math.sin(progress * Math.PI) * 0.8;
      } else if (p.type === "leaf") {
        alpha = Math.min(1, (1 - progress) * 2) * 0.6;
      } else {
        alpha = (1 - progress) * 0.9;
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.type === "firefly") {
        // Glowing dot
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === "leaf") {
        // Small ellipse
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, progress * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "spark") {
        // Spark dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "water") {
        // Water droplet — teardrop shape
        ctx.shadowColor = "#42A5F5";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
