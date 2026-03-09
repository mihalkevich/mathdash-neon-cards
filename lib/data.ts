import type { SolvedProblem, WeakSpot, LeaderboardEntry } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const HISTORY_KEY = 'mathdash_v3_history';
const LEADERBOARD_KEY = 'mathdash_v3_leaderboard';
const SESSION_KEY = 'mathdash_session_id';
const HISTORY_LIMIT = 50;

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function saveSolvedProblem(
  problem: SolvedProblem,
  playerName: string,
  difficultyLevel: number,
  gameMode: string
): Promise<void> {
  const enriched = {
    ...problem,
    operation: problem.operation,
    pattern: problem.pattern,
    gameMode,
    ageBracket: difficultyLevel,
    difficulty: problem.difficulty ?? problem.difficulty,
  };

  const local = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const updated = [enriched, ...local].slice(0, HISTORY_LIMIT);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  if (isSupabaseConfigured() && supabase) {
    await supabase.from('solved_problems').insert({
      session_id: getSessionId(),
      player_name: playerName,
      age_bracket: difficultyLevel,
      game_mode: gameMode,
      question: problem.question,
      answer: problem.answer,
      user_answer: problem.userAnswer,
      is_correct: problem.isCorrect,
      difficulty: problem.difficulty ?? 1,
      operation: problem.operation ?? null,
      pattern: problem.pattern ?? null,
    }).then(() => {});
  }
}

export async function getHistory(limit = 50, offset = 0): Promise<SolvedProblem[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('solved_problems')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (data?.length) {
      return data.map((r: any) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        userAnswer: r.user_answer,
        isCorrect: r.is_correct,
        timestamp: new Date(r.created_at).getTime(),
        operation: r.operation,
        pattern: r.pattern,
      }));
    }
  }
  const local = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  return local.slice(offset, offset + limit);
}

export async function getWeakSpots(): Promise<WeakSpot[]> {
  const history = await getHistory(200, 0);
  const wrong = history.filter((h) => !h.isCorrect && h.operation && h.pattern);
  const map = new Map<string, WeakSpot>();
  for (const h of wrong) {
    const key = `${h.operation}_${h.pattern}`;
    const existing = map.get(key);
    if (existing) {
      existing.errorCount++;
      existing.lastSeen = Math.max(existing.lastSeen, h.timestamp);
    } else {
      map.set(key, {
        operation: h.operation as '+' | '-' | '*',
        pattern: h.pattern!,
        errorCount: 1,
        lastSeen: h.timestamp,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.errorCount - a.errorCount);
}

export async function saveLeaderboard(entry: LeaderboardEntry): Promise<void> {
  const local = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
  const updated = [entry, ...local]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));

  if (isSupabaseConfigured() && supabase) {
    await supabase.from('leaderboard').insert({
      player_name: entry.name,
      score: entry.score,
      level: entry.level,
      game_mode: entry.mode,
    }).then(() => {});
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('leaderboard')
      .select('player_name, score, level, game_mode, created_at')
      .order('score', { ascending: false })
      .limit(20);
    if (data?.length) {
      return data.map((r: any) => ({
        name: r.player_name,
        score: r.score,
        level: r.level,
        mode: r.game_mode,
        date: r.created_at?.split('T')[0] ?? '',
      }));
    }
  }
  return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
}
