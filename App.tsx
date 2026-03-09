
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameMode, MathProblem, PlayerStats, LeaderboardEntry, DifficultyLevel, Notification, SolvedProblem, WeakSpot } from './types';
import { GET_LEVELS, INITIAL_STATS, INITIAL_LEADERBOARD, ENCOURAGEMENTS, CORRECT_STREAK_FOR_LEVEL_UP } from './constants';
import { saveSolvedProblem, getHistory, getLeaderboard, saveLeaderboard, getWeakSpots } from './lib/data';
import { extractOperationAndPattern } from './lib/problemUtils';
import NeonButton from './components/NeonButton';
import GameCard from './components/GameCard';
import { Trophy, Zap, Clock, BrainCircuit, RotateCcw, Play, Infinity as InfinityIcon, Timer, Info, Users, MessageSquare, Layers, History, Share2, Copy, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number>(60);
  const [combo, setCombo] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [mathFact, setMathFact] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [shaking, setShaking] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<SolvedProblem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'errors'>('all');
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  
  // Multiplayer State
  const [roomId, setRoomId] = useState<string>('');
  const [opponent, setOpponent] = useState<{ name: string; progress: number; score: number } | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [multiplayerStatus, setMultiplayerStatus] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('Player');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentProblems = useRef<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const timeoutTriggeredRef = useRef(false);
  const levels = GET_LEVELS(difficulty);

  const generateProblem = useCallback(async () => {
    const levelIdx = Math.min(stats.level - 1, levels.length - 1);
    const config = levels[levelIdx];
    const weakSpots = await getWeakSpots();
    const useWeakSpot = weakSpots.length > 0 && Math.random() < 0.3;
    const targetSpot = useWeakSpot ? weakSpots[Math.floor(Math.random() * Math.min(3, weakSpots.length))] : null;

    let n1, n2, n3, answer, question;
    let attempts = 0;

    do {
      if (gameMode === GameMode.TRIO) {
        const ops = config.operations.filter(o => o !== '*');
        if (ops.length === 0) ops.push('+');
        const op1 = ops[Math.floor(Math.random() * ops.length)];
        const op2 = ops[Math.floor(Math.random() * ops.length)];

        const limit = Math.max(10, Math.floor(config.maxNumber * 0.8));
        n1 = Math.floor(Math.random() * limit) + 5;
        n2 = Math.floor(Math.random() * limit) + 1;
        n3 = Math.floor(Math.random() * limit) + 1;

        let temp = op1 === '+' ? n1 + n2 : n1 - n2;
        if (temp < 0) { n1 += Math.abs(temp) + 5; temp = n1 - n2; }

        answer = op2 === '+' ? temp + n3 : temp - n3;
        if (answer < 0) { n1 += Math.abs(answer) + 5; answer = (op1 === '+' ? n1 + n2 : n1 - n2) + (op2 === '+' ? n3 : -n3); }

        question = `${n1} ${op1} ${n2} ${op2} ${n3}`;
      } else {
        const forceOp = useWeakSpot && targetSpot && config.operations.includes(targetSpot.operation) ? targetSpot.operation : null;
        const forceMissing = useWeakSpot && targetSpot?.pattern === 'missing_number' && stats.level > 2;
        const op = forceOp ?? config.operations[Math.floor(Math.random() * config.operations.length)];
        const isMissingNumber = forceMissing || (Math.random() > 0.7 && stats.level > 2);

        if (op === '*') {
          n1 = Math.floor(Math.random() * (difficulty === 'hard' ? 12 : 6)) + 1;
          n2 = Math.floor(Math.random() * 10) + 1;
          if (isMissingNumber) {
            answer = n2;
            question = `${n1} × ? = ${n1 * n2}`;
          } else {
            answer = n1 * n2;
            question = `${n1} × ${n2}`;
          }
        } else if (op === '-') {
          n1 = Math.floor(Math.random() * config.maxNumber) + 5;
          n2 = Math.floor(Math.random() * n1);
          if (isMissingNumber) {
            answer = n2;
            question = `${n1} - ? = ${n1 - n2}`;
          } else {
            answer = n1 - n2;
            question = `${n1} - ${n2}`;
          }
        } else {
          n1 = Math.floor(Math.random() * config.maxNumber);
          n2 = Math.floor(Math.random() * config.maxNumber);
          if (isMissingNumber) {
            answer = n2;
            question = `${n1} + ? = ${n1 + n2}`;
          } else {
            answer = n1 + n2;
            question = `${n1} + ${n2}`;
          }
        }
      }
      attempts++;
    } while (recentProblems.current.includes(question) && attempts < 20);

    recentProblems.current = [question, ...recentProblems.current].slice(0, 20);

    const options = new Set<number>();
    options.add(answer);
    while (options.size < 4) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const fake = Math.max(0, answer + (offset === 0 ? 3 : offset));
      options.add(fake);
    }

    setCurrentProblem({
      id: Math.random().toString(36).substr(2, 9),
      question,
      answer,
      options: Array.from(options).sort(() => Math.random() - 0.5),
      difficulty: stats.level
    });
    setTimeLeft(config.timeLimit + (gameMode === GameMode.TRIO ? 5 : 0));
    setIsAnswering(false);
  }, [stats.level, difficulty, levels, gameMode]);

  const handleWrongAnswer = useCallback((userAnswer: number) => {
    if (!currentProblem) return;
    const cfg = levels[Math.min(stats.level - 1, levels.length - 1)];
    const { operation, pattern } = extractOperationAndPattern(currentProblem.question, cfg?.maxNumber ?? 20);
    const solvedProblem: SolvedProblem = {
      ...currentProblem,
      userAnswer,
      isCorrect: false,
      timestamp: Date.now(),
      operation,
      pattern,
    };
    saveSolvedProblem(solvedProblem, playerName, difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3, gameMode).catch(() => {});
    setHistory(prev => [solvedProblem, ...prev].slice(0, 50));
    setShaking(true);
    setCombo(0);
    setStats(prev => ({ ...prev, level: Math.max(1, prev.level - 1) }));
    if (gameMode === GameMode.CLASSIC || gameMode === GameMode.DUEL || gameMode === GameMode.TRIO || gameMode === GameMode.MULTIPLAYER) {
      setIsVictory(false);
      setGameState(GameState.GAMEOVER);
      if (gameMode === GameMode.MULTIPLAYER && socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'GAME_OVER', winner: opponent?.name || 'Opponent' }));
      }
    } else {
      setGlobalTimeLeft(prev => Math.max(0, prev - 3));
      setTimeout(() => { setShaking(false); setIsAnswering(false); generateProblem(); }, 500);
    }
  }, [currentProblem, gameMode, opponent?.name, generateProblem, playerName, difficulty, levels, stats.level]);

  useEffect(() => {
    getLeaderboard().then(setLeaderboard).catch(() => {});
    getHistory(50, 0).then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    if (gameState === GameState.HISTORY) {
      getWeakSpots().then(setWeakSpots).catch(() => {});
      getHistory(50, 0).then((data) => {
        setHistory(data);
        setHasMoreHistory(data.length >= 50);
      }).catch(() => {});
      setHistoryOffset(0);
    }
  }, [gameState]);

  // Per-problem timer countdown
  useEffect(() => {
    if (gameState !== GameState.PLAYING || !currentProblem || timeLeft <= 0 || isAnswering) return;
    timeoutTriggeredRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, currentProblem?.id, isAnswering]);

  // Timeout: timeLeft hit 0 — treat as wrong answer
  useEffect(() => {
    if (gameState !== GameState.PLAYING || !currentProblem || timeLeft !== 0 || isAnswering || timeoutTriggeredRef.current) return;
    timeoutTriggeredRef.current = true;
    setIsAnswering(true);
    handleWrongAnswer(-1);
  }, [timeLeft, gameState, currentProblem, isAnswering, handleWrongAnswer]);

  // Blitz: global time expired — Game Over
  useEffect(() => {
    if (gameMode !== GameMode.BLITZ || gameState !== GameState.PLAYING || globalTimeLeft > 0) return;
    setIsVictory(false);
    setGameState(GameState.GAMEOVER);
  }, [gameMode, gameState, globalTimeLeft]);

  // Fetch math fact and save leaderboard on Game Over
  useEffect(() => {
    if (gameState !== GameState.GAMEOVER) return;
    setMathFact('');
    saveLeaderboard({
      name: playerName,
      score: stats.score,
      level: stats.level,
      mode: gameMode,
      date: new Date().toISOString().split('T')[0],
    }).then(() => getLeaderboard().then(setLeaderboard)).catch(() => {});
    fetch(`/api/math-fact?level=${stats.level}`)
      .then((r) => r.json())
      .then((d) => setMathFact(d.fact ?? ''))
      .catch(() => {});
  }, [gameState, stats.level, stats.score, playerName, gameMode]);

  // WebSocket Logic
  useEffect(() => {
    if (gameState === GameState.MULTIPLAYER_LOBBY || gameMode === GameMode.MULTIPLAYER) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("Connected to Multiplayer Server");
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'ROOM_UPDATE':
            const other = message.players.find((p: any) => p.name !== playerName);
            if (other) setOpponent({ name: other.name, progress: 0, score: 0 });
            setMultiplayerStatus(message.players.length === 1 ? 'Waiting for opponent...' : 'Opponent joined! Starting...');
            break;
          case 'START_GAME':
            setGameState(GameState.PLAYING);
            generateProblem();
            break;
          case 'OPPONENT_PROGRESS':
            setOpponent(prev => prev ? { ...prev, progress: message.progress, score: message.score } : null);
            break;
          case 'OPPONENT_DISCONNECTED':
            setFeedback('Opponent disconnected!');
            setGameState(GameState.GAMEOVER);
            break;
          case 'GAME_OVER':
            setIsVictory(message.winner === playerName);
            setGameState(GameState.GAMEOVER);
            break;
          case 'ERROR':
            setFeedback(message.message);
            break;
        }
      };

      return () => {
        socket.close();
      };
    }
  }, [gameState, gameMode, playerName]);

  const joinRoom = (id: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: id, name: playerName }));
    }
  };

  const handleAnswer = (userAnswer: number) => {
    if (isAnswering || !currentProblem) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnswering(true);
    
    const isCorrect = userAnswer === currentProblem.answer;
    
    const cfg = levels[Math.min(stats.level - 1, levels.length - 1)];
    const { operation, pattern } = extractOperationAndPattern(currentProblem.question, cfg?.maxNumber ?? 20);
    const solvedProblem: SolvedProblem = {
      ...currentProblem,
      userAnswer,
      isCorrect,
      timestamp: Date.now(),
      operation,
      pattern,
    };

    saveSolvedProblem(solvedProblem, playerName, difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3, gameMode).catch(() => {});
    setHistory(prev => [solvedProblem, ...prev].slice(0, 50));

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      const multiplier = Math.min(5, Math.floor(newCombo / 3) + 1);
      const points = 10 * stats.level * multiplier;
      
      setStats(prev => {
        const nextSolved = prev.totalSolved + 1;
        let nextLevel = prev.level;
        let nextDuel = prev.duelProgress;

        if (gameMode === GameMode.DUEL || gameMode === GameMode.MULTIPLAYER) {
          nextDuel += 10;
          if (nextDuel >= 100) {
            setIsVictory(true);
            setGameState(GameState.GAMEOVER);
            if (gameMode === GameMode.MULTIPLAYER && socketRef.current) {
              socketRef.current.send(JSON.stringify({ type: 'GAME_OVER', winner: playerName, finalScores: { [playerName]: prev.score + points } }));
            }
            return prev;
          }
          
          if (gameMode === GameMode.MULTIPLAYER && socketRef.current) {
            socketRef.current.send(JSON.stringify({ type: 'PROGRESS_UPDATE', progress: nextDuel, score: prev.score + points }));
          }
        }

        if (newCombo >= CORRECT_STREAK_FOR_LEVEL_UP && nextLevel < levels.length) nextLevel++;
        
        return {
          ...prev,
          score: prev.score + points,
          level: nextLevel,
          totalSolved: nextSolved,
          duelProgress: nextDuel,
          maxCombo: Math.max(prev.maxCombo, newCombo)
        };
      });

      if (newCombo % 3 === 0) {
        setFeedback(ENCOURAGEMENTS[Math.min(Math.max(0, Math.floor(newCombo / 3) - 1), ENCOURAGEMENTS.length - 1)] ?? `${multiplier}X MULTIPLIER!`);
        setTimeout(() => setFeedback(''), 1000);
      }
      setTimeout(() => generateProblem(), 200);
    } else {
      handleWrongAnswer(userAnswer);
    }
  };

  const startMultiplayer = () => {
    const id = Math.random().toString(36).substr(2, 6).toUpperCase();
    setRoomId(id);
    setGameMode(GameMode.MULTIPLAYER);
    setGameState(GameState.MULTIPLAYER_LOBBY);
    setIsHost(true);
  };

  const joinMultiplayer = (id: string) => {
    setRoomId(id.toUpperCase());
    setGameMode(GameMode.MULTIPLAYER);
    setGameState(GameState.MULTIPLAYER_LOBBY);
    setIsHost(false);
    joinRoom(id.toUpperCase());
  };

  const copyInvite = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setFeedback('Link Copied!');
    setTimeout(() => setFeedback(''), 2000);
  };

  return (
    <div className="min-h-screen bg-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full" />

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-slate-900/90 border border-cyan-400/30 p-3 rounded-lg shadow-lg animate-in slide-in-from-right duration-300">
            <p className="text-xs font-orbitron text-cyan-400">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Feedback Overlay */}
      {feedback && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <h2 className="text-6xl font-black font-orbitron text-pink-500 animate-bounce neon-text-pink">
            {feedback}
          </h2>
        </div>
      )}

      {gameState === GameState.START && (
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-9xl font-black font-orbitron tracking-tighter neon-text-cyan">
              MATH<span className="text-pink-500 neon-text-pink">DASH</span>
            </h1>
            <p className="text-cyan-400/60 font-orbitron tracking-[0.3em] uppercase text-sm">Neural Math Interface v4.0</p>
          </div>
          
          <GameCard className="max-w-md mx-auto space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-orbitron text-cyan-400 uppercase tracking-widest">Difficulty</label>
              <div className="flex justify-between gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold font-orbitron uppercase text-sm ${difficulty === d ? 'border-cyan-400 bg-cyan-400 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'border-cyan-400/30 text-cyan-400 hover:border-cyan-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="ENTER PILOT NAME" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border-2 border-cyan-400/30 p-3 font-orbitron text-cyan-400 focus:border-cyan-400 outline-none text-center"
              />
              <NeonButton onClick={() => setGameState(GameState.MODE_SELECT)} className="w-full py-4 text-xl">
                Initialize
              </NeonButton>
            </div>
          </GameCard>
        </div>
      )}

      {gameState === GameState.MODE_SELECT && (
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-center">
            <h2 className="text-4xl font-orbitron neon-text-cyan mb-2">SELECT PROTOCOL</h2>
            <div className="h-1 w-24 bg-cyan-400 mx-auto rounded-full shadow-[0_0_10px_#22d3ee]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModeCard 
              icon={<Zap className="w-8 h-8" />}
              title="Classic"
              desc="Standard neural test. 5 mistakes allowed."
              onClick={() => { setGameMode(GameMode.CLASSIC); setGameState(GameState.PLAYING); setStats(INITIAL_STATS); generateProblem(); }}
            />
            <ModeCard 
              icon={<Clock className="w-8 h-8" />}
              title="Blitz"
              desc="60 seconds. Maximize output."
              onClick={() => { setGameMode(GameMode.BLITZ); setGameState(GameState.PLAYING); setStats(INITIAL_STATS); setGlobalTimeLeft(60); generateProblem(); }}
            />
            <ModeCard 
              icon={<Users className="w-8 h-8" />}
              title="Multiplayer"
              desc="Battle real pilots in real-time."
              variant="pink"
              onClick={startMultiplayer}
            />
            <ModeCard 
              icon={<BrainCircuit className="w-8 h-8" />}
              title="Trio"
              desc="Three-number sequences. Advanced logic."
              onClick={() => { setGameMode(GameMode.TRIO); setGameState(GameState.PLAYING); setStats(INITIAL_STATS); generateProblem(); }}
            />
            <ModeCard 
              icon={<History className="w-8 h-8" />}
              title="History"
              desc="Review your past neural cycles."
              onClick={() => setGameState(GameState.HISTORY)}
            />
            <ModeCard 
              icon={<Trophy className="w-8 h-8" />}
              title="Ranks"
              desc="Global pilot leaderboard."
              onClick={() => setGameState(GameState.LEADERBOARD)}
            />
          </div>

          <div className="flex justify-center gap-4">
            <input 
              type="text" 
              placeholder="ROOM CODE" 
              className="bg-slate-950 border-2 border-pink-500/30 p-3 font-orbitron text-pink-500 focus:border-pink-500 outline-none text-center w-40"
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            />
            <NeonButton variant="pink" onClick={() => joinMultiplayer(roomId)}>Join Room</NeonButton>
          </div>
          
          <button onClick={() => setGameState(GameState.START)} className="block mx-auto text-cyan-400/50 font-orbitron hover:text-cyan-400 transition-colors">
            BACK TO MAIN
          </button>
        </div>
      )}

      {gameState === GameState.MULTIPLAYER_LOBBY && (
        <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in">
          <h2 className="text-4xl font-orbitron neon-text-pink">MULTIPLAYER LOBBY</h2>
          <GameCard variant="pink" className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-orbitron text-pink-400 uppercase tracking-widest">Room Code</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-5xl font-black font-orbitron text-white tracking-widest">{roomId}</span>
                <button onClick={copyInvite} className="p-2 hover:bg-pink-500/20 rounded-full transition-colors text-pink-400">
                  <Copy className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-cyan-400 flex items-center justify-center text-cyan-400 font-bold">P1</div>
                <div className="h-0.5 w-8 bg-pink-500/30" />
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${opponent ? 'border-pink-500 text-pink-500' : 'border-slate-700 text-slate-700'}`}>
                  {opponent ? 'P2' : '?'}
                </div>
              </div>
              <p className="font-orbitron text-pink-400 animate-pulse">{multiplayerStatus}</p>
            </div>

            {isHost && !opponent && (
              <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                <p className="text-xs text-pink-300">Share the code with a friend to start the battle!</p>
              </div>
            )}
          </GameCard>
          <NeonButton variant="pink" onClick={() => setGameState(GameState.MODE_SELECT)}>Cancel</NeonButton>
        </div>
      )}

      {gameState === GameState.PLAYING && currentProblem && (
        <div className="w-full max-w-2xl space-y-8 animate-in fade-in duration-300">
          {/* HUD */}
          <div className="flex justify-between items-center md:items-end gap-2">
            <div className="space-y-0 md:space-y-1">
              <p className="text-[8px] md:text-[10px] font-orbitron text-cyan-400 uppercase tracking-widest">Neural Level</p>
              <p className="text-xl md:text-3xl font-black font-orbitron">{stats.level}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] md:text-[10px] font-orbitron text-pink-400 uppercase tracking-widest">Score</p>
              <p className="text-3xl md:text-5xl font-black font-orbitron neon-text-pink">{stats.score}</p>
            </div>
            <div className="text-right space-y-0 md:space-y-1">
              {gameMode === GameMode.BLITZ ? (
                <>
                  <p className="text-[8px] md:text-[10px] font-orbitron text-pink-400 uppercase tracking-widest">Time</p>
                  <p className="text-xl md:text-3xl font-black font-orbitron text-pink-400">{globalTimeLeft}s</p>
                </>
              ) : (
                <>
                  <p className="text-[8px] md:text-[10px] font-orbitron text-cyan-400 uppercase tracking-widest">Combo</p>
                  <p className="text-xl md:text-3xl font-black font-orbitron">x{combo}</p>
                </>
              )}
            </div>
          </div>

          {/* Per-problem timer (non-Blitz) or Blitz countdown */}
          {gameMode === GameMode.BLITZ ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-orbitron uppercase tracking-widest">
                <span className="text-pink-400">Blitz Time</span>
                <span className="text-pink-400">{globalTimeLeft}s</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-pink-500/20">
                <div
                  className="h-full bg-pink-500 shadow-[0_0_10px_#ec4899] transition-all duration-300"
                  style={{ width: `${(globalTimeLeft / 60) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-orbitron uppercase tracking-widest">
                <span className="text-cyan-400">Time Left</span>
                <span className="text-cyan-400">{timeLeft}s</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-cyan-400/20">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-300"
                  style={{ width: `${(timeLeft / ((levels[Math.min(stats.level - 1, levels.length - 1)]?.timeLimit ?? 15) + (gameMode === GameMode.TRIO ? 5 : 0))) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Progress Bars (Duel/Multiplayer only) */}
          {(gameMode === GameMode.DUEL || gameMode === GameMode.MULTIPLAYER) && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-orbitron uppercase tracking-widest">
                <span className="text-cyan-400">Your Progress</span>
                <span className="text-cyan-400">{Math.round(stats.duelProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-cyan-400/20">
                <div 
                  className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-500" 
                  style={{ width: `${stats.duelProgress}%` }} 
                />
              </div>
            </div>

            {gameMode === GameMode.MULTIPLAYER && opponent && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-orbitron uppercase tracking-widest">
                  <span className="text-pink-500">{opponent.name}</span>
                  <span className="text-pink-500">{Math.round(opponent.progress)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-pink-500/20">
                <div 
                  className="h-full bg-pink-500 shadow-[0_0_10px_#ec4899] transition-all duration-500" 
                  style={{ width: `${opponent.progress}%` }} 
                />
              </div>
            </div>
          )}
          </div>
          )}

          {/* Problem Card */}
          <div className={`relative perspective-1000 ${shaking ? 'animate-shake' : ''}`}>
            <GameCard className="py-12 md:py-16 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
              <h3 className="text-5xl md:text-8xl font-black font-orbitron tracking-tighter mb-4">
                {currentProblem.question}
              </h3>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150" />
              </div>
            </GameCard>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {currentProblem.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={isAnswering}
                className="bg-slate-900/50 border-2 border-cyan-400/30 p-4 md:p-6 rounded-xl text-2xl md:text-3xl font-black font-orbitron hover:border-cyan-400 hover:bg-cyan-400/10 transition-all active:scale-95 disabled:opacity-50 min-h-[48px] touch-target"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === GameState.GAMEOVER && (
        <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="space-y-2">
            <h2 className={`text-6xl font-black font-orbitron ${isVictory ? 'text-emerald-400 neon-text-emerald' : 'text-pink-500 neon-text-pink'}`}>
              {isVictory ? 'VICTORY' : 'DEFEAT'}
            </h2>
            <p className="text-cyan-400/60 font-orbitron uppercase tracking-widest">Neural Cycle Terminated</p>
          </div>

          <GameCard variant={isVictory ? 'emerald' : 'pink'} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/50 rounded-lg">
                <p className="text-[10px] font-orbitron text-cyan-400 uppercase mb-1">Final Score</p>
                <p className="text-3xl font-black font-orbitron">{stats.score}</p>
              </div>
              <div className="p-4 bg-slate-950/50 rounded-lg">
                <p className="text-[10px] font-orbitron text-cyan-400 uppercase mb-1">Max Combo</p>
                <p className="text-3xl font-black font-orbitron">x{stats.maxCombo}</p>
              </div>
            </div>

            {mathFact && (
              <div className="p-4 border border-cyan-400/20 rounded-lg bg-cyan-400/5">
                <p className="text-[10px] font-orbitron text-cyan-400 uppercase mb-2 flex items-center justify-center gap-2">
                  <Info className="w-3 h-3" /> Neural Insight
                </p>
                <p className="text-sm italic text-cyan-100">{mathFact}</p>
              </div>
            )}

            <div className="space-y-3">
              <NeonButton onClick={() => setGameState(GameState.MODE_SELECT)} className="w-full">New Protocol</NeonButton>
              <NeonButton variant="pink" onClick={() => setGameState(GameState.START)} className="w-full">Main Menu</NeonButton>
            </div>
          </GameCard>
        </div>
      )}

      {gameState === GameState.HISTORY && (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-right duration-500">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-3xl font-orbitron neon-text-cyan">NEURAL LOGS</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-orbitron rounded-lg border transition-colors ${historyFilter === 'all' ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400' : 'border-cyan-400/30 text-cyan-400/70 hover:border-cyan-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setHistoryFilter('errors')}
                className={`px-3 py-1.5 text-xs font-orbitron rounded-lg border transition-colors ${historyFilter === 'errors' ? 'border-pink-500 bg-pink-500/20 text-pink-500' : 'border-pink-500/30 text-pink-500/70 hover:border-pink-500'}`}
              >
                Errors
              </button>
              <NeonButton onClick={() => setGameState(GameState.MODE_SELECT)} className="px-4 py-2 text-xs">Back</NeonButton>
            </div>
          </div>

          {weakSpots.length > 0 && (
            <GameCard variant="pink" className="p-4">
              <p className="text-xs font-orbitron text-pink-400 uppercase tracking-widest mb-3">Weak Spots — Practice These</p>
              <div className="flex flex-wrap gap-2">
                {weakSpots.slice(0, 5).map((s, i) => (
                  <span key={i} className="px-3 py-1.5 bg-pink-500/20 border border-pink-500/40 rounded-lg text-sm font-orbitron text-pink-300">
                    {s.operation} ({s.pattern}): {s.errorCount} errors
                  </span>
                ))}
              </div>
            </GameCard>
          )}
          
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {(() => {
              const filtered = historyFilter === 'errors' ? history.filter((h) => !h.isCorrect) : history;
              if (filtered.length === 0) {
                return <div className="text-center py-20 text-cyan-400/30 font-orbitron">NO LOGS FOUND</div>;
              }
              return filtered.map((h, i) => (
                <div key={i} className={`p-4 rounded-xl border-l-4 bg-slate-900/50 min-h-[44px] flex items-center ${h.isCorrect ? 'border-emerald-400' : 'border-pink-500'}`}>
                  <div className="flex justify-between items-center w-full">
                    <p className="text-lg md:text-xl font-orbitron">{h.question} = {h.answer}</p>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${h.isCorrect ? 'text-emerald-400' : 'text-pink-500'}`}>
                        {h.isCorrect ? 'OPTIMAL' : `ERROR: ${h.userAnswer === -1 ? 'TIMEOUT' : h.userAnswer}`}
                      </p>
                      <p className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
          {hasMoreHistory && history.length > 0 && (
            <button
              onClick={() => getHistory(50, historyOffset + 50).then((more) => {
                setHistory((p) => [...p, ...more]);
                setHistoryOffset((o) => o + 50);
                setHasMoreHistory(more.length >= 50);
              })}
              className="w-full py-2 text-sm font-orbitron text-cyan-400/70 hover:text-cyan-400 border border-cyan-400/30 rounded-lg min-h-[44px]"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {gameState === GameState.LEADERBOARD && (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-left duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-orbitron neon-text-cyan">TOP PILOTS</h2>
            <NeonButton onClick={() => setGameState(GameState.MODE_SELECT)} className="px-4 py-2 text-xs">Back</NeonButton>
          </div>

          <GameCard className="p-0 overflow-hidden">
            <table className="w-full text-left font-orbitron">
              <thead className="bg-cyan-400/10 text-cyan-400 text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Pilot</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-400/10">
                {leaderboard.map((entry, i) => (
                  <tr key={i} className="hover:bg-cyan-400/5 transition-colors">
                    <td className="p-4 font-black text-cyan-400">#{i + 1}</td>
                    <td className="p-4">{entry.name}</td>
                    <td className="p-4 text-pink-500 font-bold">{entry.score}</td>
                    <td className="p-4 text-xs opacity-60">{entry.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GameCard>
        </div>
      )}
    </div>
  );
};

const ModeCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick: () => void; variant?: 'cyan' | 'pink' }> = ({ icon, title, desc, onClick, variant = 'cyan' }) => (
  <button 
    onClick={onClick}
    className={`group relative p-6 bg-slate-900/50 border-2 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 active:scale-95 ${variant === 'cyan' ? 'border-cyan-400/30 hover:border-cyan-400' : 'border-pink-500/30 hover:border-pink-500'}`}
  >
    <div className={`mb-4 transition-colors ${variant === 'cyan' ? 'text-cyan-400 group-hover:text-cyan-300' : 'text-pink-500 group-hover:text-pink-400'}`}>
      {icon}
    </div>
    <h3 className="text-xl font-orbitron font-bold mb-2 uppercase tracking-wider">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    <div className={`absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${variant === 'cyan' ? 'text-cyan-400' : 'text-pink-500'}`}>
      <Play className="w-4 h-4 fill-current" />
    </div>
  </button>
);

export default App;
