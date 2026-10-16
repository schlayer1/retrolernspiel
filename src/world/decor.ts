/**
 * Darstellung & Kollision der Welt-Dekoration aus dem Atlas `world`.
 * Die Pack-Sprites sind für 32/48-px-Charaktere gezeichnet, unsere Figuren sind 16×32 px groß.
 * Darum bekommt jede Sprite-Familie einen harmonischen Maßstab und eine eigene Fußkollisionsbox (in Welt-Pixeln).
 * Die Box sitzt immer am Fuß des Sprites (Stamm, Sockel, Wandunterkante) – Kronen und Dächer sind begehbar dahinter.
 */

export interface DecorSpec {
  /** Maßstab des Sprites in der Welt. */
  scale: number;
  /** Fußkollision in Welt-Pixeln (zentriert auf x, Unterkante `by` über dem Fußpunkt). `null` = keine Kollision. */
  hb: { w: number; h: number; by: number } | null;
}

interface Rule {
  test: (id: string) => boolean;
  scale: number;
  /** Box als Anteil der skalierten Spritegröße (fw/fh) oder feste Pixel. */
  box: (w: number, h: number) => { w: number; h: number; by: number } | null;
}

const starts = (...p: string[]) => (id: string) => p.some((x) => id.startsWith(x));

const RULES: Rule[] = [
  // Große Bäume: nur der Stamm am Fuß blockiert, Baumkrone dahinter frei begehbar
  { test: starts('tree_pine_tall', 'tree_oak_tall', 'tree_pine_slim'), scale: 0.56, box: () => ({ w: 10, h: 6, by: 2 }) },
  { test: starts('tree_dead', 'tree_bare', 'tree_small'), scale: 0.72, box: () => ({ w: 7, h: 5, by: 2 }) },
  { test: starts('tree_'), scale: 0.72, box: (w) => ({ w: Math.max(8, Math.min(12, w * 0.16)), h: 6, by: 2 }) },
  // Holz & Baumstümpfe
  { test: starts('stump_'), scale: 0.58, box: (w) => ({ w: Math.max(10, w * 0.68), h: 8, by: 2 }) },
  { test: starts('logs_'), scale: 0.56, box: (w) => ({ w: Math.max(12, w * 0.78), h: 9, by: 2 }) },
  { test: starts('log_tall'), scale: 0.48, box: () => ({ w: 8, h: 6, by: 1 }) },
  // Kleine Steine & Kiesel ohne Kollision
  { test: starts('rock_small', 'pebbles', 'rock_flat'), scale: 0.55, box: () => null },
  { test: starts('rock_tall'), scale: 0.58, box: (w) => ({ w: w * 0.7, h: 10, by: 3 }) },
  { test: starts('rock_'), scale: 0.58, box: (w) => ({ w: w * 0.76, h: 14, by: 3 }) },
  // Büsche & Hecken
  { test: starts('bush_big', 'bush_huge'), scale: 0.52, box: (w) => ({ w: w * 0.6, h: 11, by: 3 }) },
  { test: starts('bush_tall'), scale: 0.58, box: (w) => ({ w: w * 0.65, h: 9, by: 2 }) },
  { test: starts('bush_'), scale: 0.68, box: (w) => ({ w: Math.max(10, w * 0.62), h: 8, by: 2 }) },
  { test: starts('hedge_'), scale: 0.62, box: (w) => ({ w: w * 0.88, h: 8, by: 2 }) },
  // Bodenbewuchs (Gras, Farne, Blumen, Pilze) komplett ohne Kollision und passend klein skaliert
  { test: starts('flower_bunch'), scale: 0.45, box: () => null },
  { test: starts('flower_'), scale: 0.36, box: () => null },
  { test: starts('grass_s'), scale: 0.55, box: () => null },
  { test: starts('grass_', 'fern_big'), scale: 0.45, box: () => null },
  { test: starts('fern_', 'mushroom_'), scale: 0.45, box: () => null },
  // Zäune
  { test: starts('fence_post'), scale: 0.58, box: () => ({ w: 5, h: 4, by: 1 }) },
  { test: starts('fence_'), scale: 0.58, box: (w) => ({ w: Math.max(12, w * 0.9), h: 5, by: 2 }) },
  // Dorf & Hof
  { test: starts('well'), scale: 0.62, box: (w) => ({ w: w * 0.78, h: 12, by: 3 }) },
  { test: starts('scarecrow'), scale: 0.65, box: () => ({ w: 7, h: 5, by: 2 }) },
  { test: starts('sign_'), scale: 0.55, box: () => ({ w: 7, h: 5, by: 1 }) },
  { test: starts('hay_bale'), scale: 0.55, box: (w) => ({ w: w * 0.86, h: 9, by: 2 }) },
  { test: starts('trough_'), scale: 0.42, box: (w) => ({ w: w * 0.88, h: 9, by: 2 }) },
  { test: starts('wheelbarrow'), scale: 0.42, box: (w) => ({ w: w * 0.72, h: 9, by: 2 }) },
  { test: starts('beehive'), scale: 0.42, box: (w) => ({ w: w * 0.72, h: 9, by: 2 }) },
  { test: starts('barrel', 'crate', 'sack', 'basket'), scale: 0.52, box: (w) => ({ w: w * 0.78, h: 8, by: 2 }) },
  { test: starts('torch', 'lantern', 'banner'), scale: 0.62, box: () => null },
  // Gebäude und Zelte: nur der untere Sockel blockiert, das Dach ist begehbar dahinter
  { test: starts('hut_', 'house_', 'cabin_', 'shelter_'), scale: 0.72, box: (w) => ({ w: w * 0.84, h: 20, by: 3 }) },
  { test: starts('tent_'), scale: 0.65, box: (w) => ({ w: w * 0.7, h: 16, by: 3 }) },
  // Lager, Kult & Höhle
  { test: starts('campfire', 'stone_ring'), scale: 0.58, box: () => null },
  { test: starts('cauldron'), scale: 0.55, box: (w) => ({ w: w * 0.68, h: 10, by: 3 }) },
  { test: starts('hide_rack', 'meat_rack', 'fish_rack'), scale: 0.58, box: (w) => ({ w: w * 0.82, h: 8, by: 2 }) },
  { test: starts('totem', 'gravestone', 'skull_bull'), scale: 0.58, box: (w) => ({ w: w * 0.55, h: 9, by: 3 }) },
  { test: starts('skulls_pair', 'bones_'), scale: 0.55, box: () => null },
  { test: starts('cave_mouth'), scale: 0.92, box: (w) => ({ w: w * 0.86, h: 18, by: 4 }) },
  { test: starts('stone_arch'), scale: 0.68, box: (w) => ({ w: w * 0.86, h: 12, by: 3 }) },
  { test: starts('stone_wall'), scale: 0.65, box: (w) => ({ w: w * 0.94, h: 14, by: 3 }) },
  { test: starts('bridge_', 'ladder'), scale: 0.62, box: () => null },
];

const FALLBACK: Rule = { test: () => true, scale: 0.65, box: (w) => ({ w: w * 0.6, h: 9, by: 2 }) };

/** Liefert Maßstab und Kollisionsbox für ein Atlas-Sprite der Größe fw × fh. */
export function decorSpec(id: string, fw: number, fh: number): DecorSpec {
  const rule = RULES.find((r) => r.test(id)) ?? FALLBACK;
  const sw = fw * rule.scale;
  const b = rule.box(sw, fh * rule.scale);
  return { scale: rule.scale, hb: b ? { w: Math.round(b.w), h: Math.round(b.h), by: b.by } : null };
}
