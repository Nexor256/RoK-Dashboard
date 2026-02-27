export interface Governor {
  id: string;
  name: string;
  alliance: string;
  power: number;
  t4Kills: number;
  t5Kills: number;
  deaths: number;
  deadTroops: number;
  healed: number;
  resourceGathered: number;
  powerGrowth: number;
}

export interface Snapshot {
  id: string;
  date: string;
  governors: Governor[];
}

function calcDKP(g: Governor) {
  return g.t4Kills * 4 + g.t5Kills * 10 + g.deadTroops * 15;
}

export { calcDKP };

const alliances = ['R|OK', 'FURY', 'DAWN', 'WOLF'];

const names = [
  'DragonSlayer', 'ShadowKnight', 'IronFist', 'StormBringer', 'BlazeFury',
  'NightHawk', 'ThunderBolt', 'FrostBite', 'WarLord', 'SteelFang',
  'PhoenixRise', 'DarkViper', 'GoldRush', 'SilverArrow', 'CrimsonBlade',
  'EagleEye', 'WolfPack', 'BearClaw', 'TigerStrike', 'LionHeart',
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function seed(n: number) {
  // deterministic-ish generator
  let s = n;
  return () => {
    s = (s * 16807 + 12345) % 2147483647;
    return s / 2147483647;
  };
}

function generateGovernors(dateSeed: number): Governor[] {
  const rng = seed(dateSeed);
  return names.map((name, i) => {
    const r = () => rng();
    const power = Math.floor(40000000 + r() * 60000000);
    return {
      id: `gov-${i}`,
      name,
      alliance: alliances[i % alliances.length],
      power,
      t4Kills: Math.floor(r() * 5000000),
      t5Kills: Math.floor(r() * 2000000),
      deaths: Math.floor(r() * 3000000),
      deadTroops: Math.floor(r() * 2000000),
      healed: Math.floor(r() * 4000000),
      resourceGathered: Math.floor(r() * 500000000),
      powerGrowth: Math.floor((r() - 0.3) * 5000000),
    };
  });
}

export const snapshots: Snapshot[] = [
  { id: 'snap-1', date: '2026-01-15', governors: generateGovernors(1) },
  { id: 'snap-2', date: '2026-02-01', governors: generateGovernors(2) },
  { id: 'snap-3', date: '2026-02-15', governors: generateGovernors(3) },
  { id: 'snap-4', date: '2026-02-25', governors: generateGovernors(4) },
];

export const currentGovernors = snapshots[snapshots.length - 1].governors;

export interface KvKGovernor extends Governor {
  honor: number;
  contribution: number;
  passesUsed: number;
  ralliesJoined: number;
  garrisonsJoined: number;
  kvkKills: number;
  kvkDeaths: number;
}

function generateKvKGovernors(dateSeed: number): KvKGovernor[] {
  const govs = generateGovernors(dateSeed);
  const rng = seed(dateSeed + 999);
  return govs.map((g) => {
    const r = () => rng();
    return {
      ...g,
      honor: Math.floor(r() * 50000000),
      contribution: Math.floor(r() * 30000000),
      passesUsed: Math.floor(r() * 80),
      ralliesJoined: Math.floor(r() * 200),
      garrisonsJoined: Math.floor(r() * 150),
      kvkKills: Math.floor(r() * 3000000),
      kvkDeaths: Math.floor(r() * 1500000),
    };
  });
}

export const kvkSnapshots = [
  { id: 'kvk-1', date: '2026-01-20', label: 'KvK Season 3 - Week 1', governors: generateKvKGovernors(10) },
  { id: 'kvk-2', date: '2026-02-03', label: 'KvK Season 3 - Week 3', governors: generateKvKGovernors(20) },
  { id: 'kvk-3', date: '2026-02-17', label: 'KvK Season 3 - Week 5', governors: generateKvKGovernors(30) },
];

export const currentKvKGovernors = kvkSnapshots[kvkSnapshots.length - 1].governors;

export const kingdomInfo = {
  number: 1942,
  name: 'Kingdom of Valoria',
  lastUpdated: '2026-02-25',
};
