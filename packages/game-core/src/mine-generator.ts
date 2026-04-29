export interface MineTemplate {
  id: string;
  width: number;
  height: number;
  depthMeters?: number;
  strata: MineStratum[];
  guaranteedObjects?: GuaranteedObject[];
}

export interface MineStratum {
  id: string;
  fromRow: number;
  toRow: number;
  blockWeights: Record<string, number>;
}

export interface GuaranteedObject {
  type: "vein" | "chest";
  blockTypeId?: string;
  veinTypeId?: string;
  rowRange: [number, number];
  count: number;
}

export interface GeneratedBlock {
  row: number;
  col: number;
  blockTypeId: string;
  special?: GuaranteedObject["type"];
  veinTypeId?: string;
}

export interface GeneratedMine {
  templateId: string;
  seed: string;
  width: number;
  height: number;
  depthMeters: number;
  blocks: GeneratedBlock[][];
}

export function generateMine(template: MineTemplate, seed: string): GeneratedMine {
  validateTemplate(template);

  const random = createSeededRandom(`${template.id}:${seed}`);
  const blocks = Array.from({ length: template.height }, (_, row) =>
    Array.from({ length: template.width }, (_, col): GeneratedBlock => {
      const stratum = findStratum(template, row);
      return {
        row,
        col,
        blockTypeId: pickWeighted(stratum.blockWeights, random)
      };
    })
  );

  for (const object of template.guaranteedObjects ?? []) {
    placeGuaranteedObject(blocks, object, random);
  }

  return {
    templateId: template.id,
    seed,
    width: template.width,
    height: template.height,
    depthMeters: template.depthMeters ?? template.height,
    blocks
  };
}

function validateTemplate(template: MineTemplate): void {
  if (template.width <= 0 || template.height <= 0) {
    throw new Error("Mine dimensions must be positive");
  }

  if (template.strata.length === 0) {
    throw new Error("Mine template must have at least one stratum");
  }
}

function findStratum(template: MineTemplate, row: number): MineStratum {
  const stratum = template.strata.find((item) => row >= item.fromRow && row <= item.toRow);
  if (!stratum) {
    throw new Error(`No stratum covers row ${row}`);
  }
  return stratum;
}

function pickWeighted(weights: Record<string, number>, random: () => number): string {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

  if (total <= 0) {
    throw new Error("Weighted table must have positive total weight");
  }

  let roll = random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return id;
    }
  }

  return entries[entries.length - 1]?.[0] ?? "";
}

function placeGuaranteedObject(blocks: GeneratedBlock[][], object: GuaranteedObject, random: () => number): void {
  const [fromRow, toRow] = object.rowRange;
  const candidates = blocks
    .flat()
    .filter((block) => block.row >= fromRow && block.row <= toRow && block.special === undefined);

  if (candidates.length < object.count) {
    throw new Error(`Not enough cells for guaranteed object ${object.type}`);
  }

  for (let index = 0; index < object.count; index++) {
    const candidateIndex = Math.floor(random() * candidates.length);
    const [candidate] = candidates.splice(candidateIndex, 1);
    if (!candidate) {
      throw new Error(`Failed to place guaranteed object ${object.type}`);
    }

    candidate.special = object.type;
    if (object.blockTypeId) {
      candidate.blockTypeId = object.blockTypeId;
    }
    if (object.veinTypeId) {
      candidate.veinTypeId = object.veinTypeId;
    }
  }
}

function createSeededRandom(seed: string): () => number {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index++) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
