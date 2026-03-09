
import { LevelConfig, PlayerStats, DifficultyLevel, LeaderboardEntry, GameMode } from './types';

const DIFFICULTY_BASE: Record<DifficultyLevel, number> = {
  easy: 6,
  medium: 8,
  hard: 10,
};

export const GET_LEVELS = (difficulty: DifficultyLevel): LevelConfig[] => {
  const base = DIFFICULTY_BASE[difficulty];
  const hasMultiplication = difficulty !== 'easy'; // easy: +,- only until level 5
  return [
    { title: "Level 1: Genesis", operations: ['+'], maxNumber: base + 5, timeLimit: 15 },
    { title: "Level 2: Pulse", operations: ['+', '-'], maxNumber: base * 2, timeLimit: 12 },
    { title: "Level 3: Velocity", operations: ['+', '-'], maxNumber: base * 3, timeLimit: 10 },
    { title: "Level 4: Electron", operations: hasMultiplication ? ['+', '-', '*'] : ['+', '-'], maxNumber: base * 4, timeLimit: 12 },
    { title: "Level 5: Supernova", operations: ['+', '-', '*'], maxNumber: base * 6, timeLimit: 10 },
    { title: "Level 6: Quantum", operations: ['+', '-', '*'], maxNumber: base * 8, timeLimit: 9 },
    { title: "Level 7: Nebula", operations: ['+', '-', '*'], maxNumber: base * 10, timeLimit: 8 },
    { title: "Level 8: Pulsar", operations: ['+', '-', '*'], maxNumber: base * 12, timeLimit: 7 },
    { title: "Level 9: Singularity", operations: ['+', '-', '*'], maxNumber: base * 15, timeLimit: 6 },
    { title: "Level 10: Infinity", operations: ['+', '-', '*'], maxNumber: base * 20, timeLimit: 5 },
  ];
};

export const INITIAL_STATS: PlayerStats = {
  score: 0,
  level: 1,
  experience: 0,
  highScore: 0,
  combos: 0,
  totalSolved: 0,
  duelProgress: 0,
  botProgress: 0,
  maxCombo: 0
};

export const BOT_NAMES = ["NeonGhost", "CyberAce", "LogicDash", "BitRunner", "ZenMaster", "VoidLogic", "NovaKid"];
export const BOT_COMMENTS = [
  "This level is intense!",
  "Calculated.",
  "Almost failed that one!",
  "Pure logic.",
  "Neon power activated!",
  "Who's top of the board?",
  "Keep dashing!"
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { name: "NeonGhost", score: 2500, level: 5, mode: GameMode.CLASSIC, date: "2024-05-20" },
  { name: "CyberAce", score: 1800, level: 4, mode: GameMode.BLITZ, date: "2024-05-21" },
  { name: "LogicDash", score: 1200, level: 3, mode: GameMode.DUEL, date: "2024-05-19" }
];

export const CORRECT_STREAK_FOR_LEVEL_UP = 3;

export const MATH_FACTS: string[] = [
  "Zero is the only number that cannot be represented in Roman numerals.",
  "A circle has 360 degrees because ancient Babylonians used base-60.",
  "The number 9 is magical: any multiple of 9 has digits that sum to 9.",
  "Pi's first 6 digits (314159) appear in order at position 0.",
  "There are 43,252,003,274,489,856,000 ways to scramble a Rubik's cube.",
  "The Fibonacci sequence appears in nature: sunflowers, pinecones, shells.",
  "111,111,111 × 111,111,111 = 12,345,678,987,654,321.",
  "Zero was invented in India around the 5th century.",
  "A googol is 10^100 — more than atoms in the observable universe.",
  "The number 142857 cycles its digits when multiplied by 1–6.",
  "Euler's identity: e^(iπ) + 1 = 0 connects five fundamental constants.",
  "There are 52! ways to shuffle a deck — about 8×10^67.",
  "The golden ratio (1.618...) appears in art, architecture, and nature.",
  "Prime numbers become less frequent as numbers get larger.",
  "Infinity is not a number — it's a concept of endlessness.",
];

export const ENCOURAGEMENTS: string[] = [
  "NEURAL SYNC OPTIMAL!",
  "PURE LOGIC!",
  "UNSTOPPABLE!",
  "NEON MASTER!",
  "CALCULATED!",
  "SYSTEM OVERDRIVE!",
  "PERFECT EXECUTION!",
  "NEURAL PATH CLEAR!",
  "AMAZING STREAK!",
  "GEOMETRY DASH MODE!",
  "CYBER ACE!",
  "LOGIC PERFECT!",
  "NEON POWER!",
  "INCREDIBLE!",
  "KEEP DASHING!",
];
