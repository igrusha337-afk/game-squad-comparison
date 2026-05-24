import { useState, useEffect, useCallback, useRef } from 'react';
import { gameApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PIXEL_CSS, HitSplash, ComboFloat } from './wham/WhamSprites';
import type { HoleState } from './wham/WhamSprites';
import WhamBoard from './wham/WhamBoard';
import WhamGameOver from './wham/WhamGameOver';
import WhamLeaderboard from './wham/WhamLeaderboard';
import type { LeaderRow } from './wham/WhamLeaderboard';

const COLS = 4;
const ROWS = 3;
const HOLES = COLS * ROWS;
const GAME_DURATION = 60;

interface Hole {
  id: number;
  state: HoleState;
  timer: ReturnType<typeof setTimeout> | null;
}

export default function WhamPage() {
  const { user } = useAuth();
  const [holes, setHoles] = useState<Hole[]>(
    Array.from({ length: HOLES }, (_, i) => ({ id: i, state: 'empty', timer: null }))
  );
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [combo, setCombo] = useState(0);
  const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([]);
  const [combos, setCombos] = useState<{ id: number; value: number; x: number; y: number }[]>([]);
  const splashIdRef = useRef(0);

  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [scoreSaved, setScoreSaved] = useState(false);
  const finalScore = useRef(0);
  const finalMisses = useRef(0);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const data = await gameApi.leaderboard();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  useEffect(() => { finalScore.current = score; }, [score]);
  useEffect(() => { finalMisses.current = misses; }, [misses]);

  const holesRef = useRef(holes);
  holesRef.current = holes;

  const hideHole = useCallback((id: number) => {
    setHoles(prev => {
      const next = [...prev];
      const h = { ...next[id] };
      if (h.timer) clearTimeout(h.timer);
      h.state = 'hiding';
      h.timer = setTimeout(() => {
        setHoles(p => {
          const n = [...p];
          n[id] = { ...n[id], state: 'empty', timer: null };
          return n;
        });
      }, 300);
      next[id] = h;
      return next;
    });
    setCombo(0);
  }, []);

  const showHole = useCallback((id: number) => {
    setHoles(prev => {
      const next = [...prev];
      const h = { ...next[id] };
      if (h.state !== 'empty') return prev;
      if (h.timer) clearTimeout(h.timer);
      h.state = 'rising';
      h.timer = setTimeout(() => {
        setHoles(p => {
          const n = [...p];
          if (n[id].state !== 'hit') n[id] = { ...n[id], state: 'up' };
          return n;
        });
        const upTimer = setTimeout(() => {
          setHoles(p => {
            if (p[id].state === 'up') hideHole(id);
            return p;
          });
        }, 1000 + Math.random() * 1200);
        setHoles(p => {
          const n = [...p];
          if (n[id].state !== 'hit') n[id] = { ...n[id], timer: upTimer };
          return n;
        });
      }, 250);
      next[id] = h;
      return next;
    });
  }, [hideHole]);

  useEffect(() => {
    if (!running) return;
    let active = true;
    const spawn = () => {
      if (!active) return;
      const available = holesRef.current.filter(h => h.state === 'empty').map(h => h.id);
      if (available.length > 0) {
        const id = available[Math.floor(Math.random() * available.length)];
        showHole(id);
      }
      const delay = Math.max(400, 1100 - score * 3);
      setTimeout(spawn, delay);
    };
    const t = setTimeout(spawn, 400);
    return () => { active = false; clearTimeout(t); };
  }, [running, showHole, score]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          setRunning(false);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!gameOver || !user) return;
    setScoreSaved(false);
    gameApi.saveScore(finalScore.current, finalMisses.current)
      .then(() => { setScoreSaved(true); loadLeaderboard(); })
      .catch(() => {});
  }, [gameOver, user, loadLeaderboard]);

  const handleHit = useCallback((id: number, e: React.MouseEvent) => {
    const hole = holesRef.current[id];
    if (hole.state !== 'up') return;
    const cx = e.clientX;
    const cy = e.clientY;
    setHoles(prev => {
      const next = [...prev];
      const h = { ...next[id] };
      if (h.timer) clearTimeout(h.timer);
      h.state = 'hit';
      h.timer = setTimeout(() => {
        setHoles(p => {
          const n = [...p];
          n[id] = { ...n[id], state: 'empty', timer: null };
          return n;
        });
      }, 400);
      next[id] = h;
      return next;
    });
    setCombo(c => {
      const nc = c + 1;
      setScore(s => s + (nc >= 5 ? 3 : nc >= 3 ? 2 : 1));
      const sid = splashIdRef.current++;
      setSplashes(p => [...p, { id: sid, x: cx, y: cy }]);
      setTimeout(() => setSplashes(p => p.filter(s => s.id !== sid)), 450);
      if (nc >= 3) {
        const cid = splashIdRef.current++;
        setCombos(p => [...p, { id: cid, value: nc, x: cx, y: cy }]);
        setTimeout(() => setCombos(p => p.filter(s => s.id !== cid)), 800);
      }
      return nc;
    });
    setSwinging(true);
    setTimeout(() => setSwinging(false), 350);
  }, []);

  const handleMiss = useCallback(() => {
    setMisses(m => m + 1);
    setCombo(0);
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  const startGame = () => {
    setHoles(Array.from({ length: HOLES }, (_, i) => ({ id: i, state: 'empty', timer: null })));
    setScore(0);
    setMisses(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setSplashes([]);
    setCombos([]);
    setGameOver(false);
    setScoreSaved(false);
    finalScore.current = 0;
    finalMisses.current = 0;
    setRunning(true);
  };

  return (
    <div className="wham-root" style={{ userSelect: 'none' }}>
      <style>{PIXEL_CSS}</style>

      {splashes.map(s => <HitSplash key={s.id} x={s.x} y={s.y} />)}
      {combos.map(c => <ComboFloat key={c.id} value={c.value} x={c.x} y={c.y} />)}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 'clamp(10px, 2vw, 16px)',
          color: 'hsl(42 90% 52%)',
          textShadow: '2px 2px 0 #7a4500, 0 0 20px hsl(42 90% 52% / 0.4)',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}>
          ⚔ ИГРА В NEADEKVATA ⚔
        </h1>
        <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: 'hsl(215 18% 45%)', letterSpacing: '0.1em' }}>
          Бей рыцарей молотом! Не упусти ни одного!
        </p>
      </div>

      <WhamBoard
        holes={holes}
        score={score}
        misses={misses}
        timeLeft={timeLeft}
        combo={combo}
        running={running}
        shaking={shaking}
        swinging={swinging}
        onHit={handleHit}
        onMiss={handleMiss}
        onStart={startGame}
        onStop={() => { setRunning(false); setGameOver(true); }}
      />

      {gameOver && (
        <WhamGameOver
          score={score}
          misses={misses}
          scoreSaved={scoreSaved}
          isLoggedIn={!!user}
          onRestart={startGame}
        />
      )}

      <WhamLeaderboard
        leaderboard={leaderboard}
        loading={lbLoading}
        currentUsername={user?.username}
      />
    </div>
  );
}
