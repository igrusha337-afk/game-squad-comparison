import { MAP_W, MAP_H } from '../engine';

export interface MapDecor {
  trees: { x: number; y: number; r: number; variant: number }[];
  rocks: { x: number; y: number; r: number }[];
  patches: { x: number; y: number; w: number; h: number; type: 'dark' | 'light' | 'mud' }[];
  roads: { x1: number; y1: number; x2: number; y2: number }[];
  river: { x: number; y: number }[];
}

export function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

export function generateMapDecor(): MapDecor {
  const rnd = seededRand(42);
  const trees: MapDecor['trees'] = [];
  const treeZones = [
    { cx: 60,          cy: 60,          spread: 140, count: 22 },
    { cx: MAP_W - 60,  cy: 60,          spread: 140, count: 20 },
    { cx: 60,          cy: MAP_H - 60,  spread: 140, count: 20 },
    { cx: MAP_W - 60,  cy: MAP_H - 60,  spread: 140, count: 22 },
    { cx: MAP_W / 2,   cy: 40,          spread: 120, count: 14 },
    { cx: MAP_W / 2,   cy: MAP_H - 40,  spread: 120, count: 14 },
    { cx: 40,          cy: MAP_H / 2,   spread: 80,  count: 10 },
    { cx: MAP_W - 40,  cy: MAP_H / 2,   spread: 80,  count: 10 },
    { cx: 200,         cy: 400,         spread: 70,  count: 8  },
    { cx: MAP_W - 200, cy: 500,         spread: 70,  count: 8  },
    { cx: 500,         cy: 700,         spread: 60,  count: 7  },
    { cx: 700,         cy: 200,         spread: 60,  count: 7  },
  ];
  for (const z of treeZones) {
    for (let i = 0; i < z.count; i++) {
      const angle = rnd() * Math.PI * 2;
      trees.push({
        x: z.cx + Math.cos(angle) * rnd() * z.spread,
        y: z.cy + Math.sin(angle) * rnd() * z.spread,
        r: 8 + rnd() * 10,
        variant: Math.floor(rnd() * 3),
      });
    }
  }

  const rocks: MapDecor['rocks'] = [];
  for (let i = 0; i < 30; i++) {
    rocks.push({ x: rnd() * MAP_W, y: rnd() * MAP_H, r: 4 + rnd() * 7 });
  }

  const patches: MapDecor['patches'] = [];
  const patchTypes: MapDecor['patches'][number]['type'][] = ['dark', 'light', 'mud'];
  for (let i = 0; i < 18; i++) {
    patches.push({ x: rnd() * MAP_W, y: rnd() * MAP_H, w: 60 + rnd() * 120, h: 40 + rnd() * 80, type: patchTypes[Math.floor(rnd() * 3)] });
  }

  const roads: MapDecor['roads'] = [
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: 300,          y2: MAP_H / 2        },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: MAP_W - 300,  y2: MAP_H / 2        },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: MAP_W / 2,    y2: 250              },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: MAP_W / 2,    y2: MAP_H - 250      },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: 400,           y2: 220              },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: MAP_W - 400,   y2: 220              },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: 400,           y2: MAP_H - 220      },
    { x1: MAP_W / 2, y1: MAP_H / 2, x2: MAP_W - 400,   y2: MAP_H - 220      },
  ];

  const river: { x: number; y: number }[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    river.push({ x: MAP_W * 0.68 + Math.sin(t * Math.PI * 3) * 60, y: t * MAP_H });
  }

  return { trees, rocks, patches, roads, river };
}

export const MAP_DECOR = generateMapDecor();
