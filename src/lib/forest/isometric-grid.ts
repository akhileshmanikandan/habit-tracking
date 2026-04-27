// Isometric coordinate helpers
// Converts grid (col, row) → screen (x, y) for an isometric view

export const TILE_WIDTH = 80;
export const TILE_HEIGHT = 40;

export function gridToIso(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

export function isoToGrid(x: number, y: number): { col: number; row: number } {
  return {
    col: (x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2,
    row: (y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2,
  };
}

// Plot layout: 2x2 grid for 4 users, with shared center
export interface PlotLayout {
  userId: string;
  username: string;
  avatarUrl: string | null;
  gridCol: number;
  gridRow: number;
  trees: TreeData[];
}

export interface TreeData {
  habitId: string;
  category: "running" | "gym" | "general";
  stage: 0 | 1 | 2 | 3; // seed, sprout, sapling, mature
  isDormant: boolean;
  isGlowing: boolean;
  offsetX: number; // sub-grid offset for multiple trees
  offsetY: number;
}

const PLOT_POSITIONS = [
  { col: 0, row: 0 },
  { col: 3, row: 0 },
  { col: 0, row: 3 },
  { col: 3, row: 3 },
];

export function buildPlotLayouts(
  members: { id: string; username: string; avatar_url: string | null }[],
  habitsByUser: Map<string, { habitId: string; category: string; logsThisWeek: number; isDormant: boolean; isGlowing: boolean }[]>
): PlotLayout[] {
  return members.slice(0, 4).map((member, idx) => {
    const pos = PLOT_POSITIONS[idx];
    const userHabits = habitsByUser.get(member.id) || [];

    const trees: TreeData[] = userHabits.map((h, treeIdx) => {
      let stage: 0 | 1 | 2 | 3 = 0;
      if (h.logsThisWeek >= 6) stage = 3;
      else if (h.logsThisWeek >= 4) stage = 2;
      else if (h.logsThisWeek >= 2) stage = 1;

      // Spread trees within the plot (2x2 sub-grid)
      const subCol = treeIdx % 2;
      const subRow = Math.floor(treeIdx / 2);

      return {
        habitId: h.habitId,
        category: h.category as TreeData["category"],
        stage,
        isDormant: h.isDormant,
        isGlowing: h.isGlowing,
        offsetX: subCol * 35 - 15,
        offsetY: subRow * 20 - 5,
      };
    });

    return {
      userId: member.id,
      username: member.username,
      avatarUrl: member.avatar_url,
      gridCol: pos.col,
      gridRow: pos.row,
      trees,
    };
  });
}
