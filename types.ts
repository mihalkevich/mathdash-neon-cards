
export enum GameState {
  START = 'START',
  ONBOARDING = 'ONBOARDING',
  MODE_SELECT = 'MODE_SELECT',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LEADERBOARD = 'LEADERBOARD',
  HISTORY = 'HISTORY',
  MULTIPLAYER_LOBBY = 'MULTIPLAYER_LOBBY'
}

export enum GameMode {
  CLASSIC = 'CLASSIC',
  BLITZ = 'BLITZ',
  ZEN = 'ZEN',
  DUEL = 'DUEL',
  TRIO = 'TRIO',
  MULTIPLAYER = 'MULTIPLAYER'
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'comment' | 'level';
}

export interface MathProblem {
  id: string;
  question: string;
  answer: number;
  options: number[];
  difficulty: number;
}

export interface PlayerStats {
  score: number;
  level: number;
  experience: number;
  highScore: number;
  combos: number;
  totalSolved: number;
  duelProgress: number;
  botProgress: number;
  maxCombo: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  mode: GameMode;
  date: string;
}

export interface SolvedProblem {
  id: string;
  question: string;
  answer: number;
  userAnswer: number;
  isCorrect: boolean;
  timestamp: number;
  operation?: string;
  pattern?: string;
  gameMode?: string;
  ageBracket?: number;
  difficulty?: number;
}

export interface WeakSpot {
  operation: '+' | '-' | '*';
  pattern: string;
  errorCount: number;
  lastSeen: number;
}

export interface LevelConfig {
  title: string;
  operations: ('+' | '-' | '*')[];
  maxNumber: number;
  timeLimit: number;
}
