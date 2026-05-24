import { HoleState, EnemyKnight, HeroKnight } from './WhamSprites';

const COLS = 4;
const GAME_DURATION = 60;

interface Hole {
  id: number;
  state: HoleState;
  timer: ReturnType<typeof setTimeout> | null;
}

interface WhamBoardProps {
  holes: Hole[];
  score: number;
  misses: number;
  timeLeft: number;
  combo: number;
  running: boolean;
  shaking: boolean;
  swinging: boolean;
  onHit: (id: number, e: React.MouseEvent) => void;
  onMiss: () => void;
  onStart: () => void;
  onStop: () => void;
}

export default function WhamBoard({
  holes, score, misses, timeLeft, combo, running, shaking, swinging,
  onHit, onMiss, onStart, onStop,
}: WhamBoardProps) {
  const timerPct = timeLeft / GAME_DURATION;
  const timerColor = timerPct > 0.5 ? '#00ff88' : timerPct > 0.25 ? '#ffcc00' : '#ff3333';

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* ── Игровое поле ── */}
      <div style={{ flex: '1 1 480px' }}>

        {/* HUD */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            padding: '8px 16px',
            background: 'hsl(224 20% 9%)',
            border: '2px solid hsl(42 90% 52% / 0.4)',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            color: 'hsl(42 90% 55%)',
            imageRendering: 'pixelated',
          }}>
            SCORE: {score.toString().padStart(4, '0')}
          </div>

          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: timerColor, marginBottom: 4 }}>
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
            <div style={{ height: 8, background: 'hsl(224 20% 9%)', border: '2px solid hsl(215 18% 25%)' }}>
              <div style={{ height: '100%', width: `${timerPct * 100}%`, background: timerColor, transition: 'width 0.9s linear, background 0.5s' }} />
            </div>
          </div>

          {combo >= 3 && (
            <div style={{
              padding: '8px 12px',
              background: 'hsl(40 90% 52% / 0.15)',
              border: '2px solid hsl(40 90% 52%)',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 8,
              color: '#ffaa00',
              textShadow: '0 0 8px #ffaa00',
            }}>
              COMBO x{combo}!
            </div>
          )}

          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: 'hsl(0 60% 55%)' }}>
            MISS: {misses}
          </div>
        </div>

        {/* Поле с лунками */}
        <div
          className={shaking ? 'wham-shake' : ''}
          onClick={running ? onMiss : undefined}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 12,
            padding: 20,
            background: 'linear-gradient(180deg, hsl(224 20% 7%) 0%, hsl(220 20% 5%) 100%)',
            border: '3px solid hsl(42 90% 52% / 0.25)',
            borderRadius: 2,
            cursor: running ? 'crosshair' : 'default',
            position: 'relative',
          }}
        >
          {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', width: 8, height: 8, background: 'hsl(42 90% 52% / 0.5)', ...pos }} />
          ))}

          {holes.map(hole => (
            <div
              key={hole.id}
              style={{
                position: 'relative',
                height: 80,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              onClick={e => { if (hole.state === 'up') { e.stopPropagation(); onHit(hole.id, e); } }}
            >
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 52,
                height: 18,
                background: 'hsl(220 20% 4%)',
                border: '2px solid hsl(215 18% 18%)',
                borderRadius: '50%',
                boxShadow: 'inset 0 4px 12px hsl(0 0% 0% / 0.8)',
                zIndex: 2,
              }} />

              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 10,
                background: 'hsl(28 30% 18%)',
                zIndex: 1,
              }} />

              {hole.state !== 'empty' && (
                <div style={{ position: 'absolute', bottom: 8, zIndex: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <EnemyKnight state={hole.state} />
                </div>
              )}

              {hole.state === 'hit' && (
                <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: 18 }}>
                  ✨
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Кнопки */}
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          {!running && (
            <button
              onClick={onStart}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 10,
                padding: '10px 20px',
                background: 'hsl(42 90% 52%)',
                color: 'hsl(224 20% 6%)',
                border: '3px solid hsl(42 90% 38%)',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 hsl(42 90% 28%)',
                transition: 'transform 0.1s, box-shadow 0.1s',
                imageRendering: 'pixelated',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 hsl(42 90% 28%)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '3px 3px 0 hsl(42 90% 28%)'; }}
            >
              ▶ НАЧАТЬ
            </button>
          )}
          {running && (
            <button
              onClick={onStop}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 8,
                padding: '10px 16px',
                background: 'hsl(0 60% 40%)',
                color: '#fff',
                border: '3px solid hsl(0 60% 28%)',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 hsl(0 60% 18%)',
                imageRendering: 'pixelated',
              }}
            >
              ⏹ СТОП
            </button>
          )}
        </div>
      </div>

      {/* ── Персонаж-герой ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 40 }}>
        <HeroKnight swinging={swinging} />
        <div style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 6,
          color: 'hsl(42 90% 52% / 0.6)',
          textAlign: 'center',
          maxWidth: 110,
          lineHeight: 1.8,
        }}>
          СЭР<br />НЕАДЕКВАТ
        </div>
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          background: 'hsl(224 20% 9%)',
          border: '2px solid hsl(42 90% 52% / 0.3)',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 6,
          color: 'hsl(215 18% 45%)',
          textAlign: 'center',
          lineHeight: 2,
        }}>
          <div style={{ color: 'hsl(42 90% 52%)', marginBottom: 4 }}>КАК ИГРАТЬ</div>
          <div>Кликай по</div>
          <div>рыцарям!</div>
          <div style={{ marginTop: 4 }}>Комбо x3 = 2 очка</div>
          <div>Комбо x5 = 3 очка</div>
        </div>
      </div>
    </div>
  );
}
