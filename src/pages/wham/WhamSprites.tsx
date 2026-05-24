export type HoleState = 'empty' | 'rising' | 'up' | 'hit' | 'hiding';

export const PIXEL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

  .wham-root {
    font-family: 'Press Start 2P', monospace;
    image-rendering: pixelated;
  }

  @keyframes knightRise {
    0%   { transform: translateY(100%); }
    100% { transform: translateY(0%); }
  }
  @keyframes knightHide {
    0%   { transform: translateY(0%); }
    100% { transform: translateY(110%); }
  }
  @keyframes knightHit {
    0%   { transform: translateY(0%) scale(1); filter: brightness(3); }
    30%  { transform: translateY(-8px) scale(0.9) rotate(-6deg); filter: brightness(4) hue-rotate(40deg); }
    60%  { transform: translateY(20%) scale(0.85); filter: brightness(1); }
    100% { transform: translateY(110%); }
  }
  @keyframes hammerSwing {
    0%   { transform: rotate(0deg); }
    25%  { transform: rotate(-50deg) translateY(-4px); }
    55%  { transform: rotate(30deg) translateY(6px); }
    80%  { transform: rotate(-10deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes hitSplash {
    0%   { opacity: 1; transform: scale(0.4); }
    50%  { opacity: 1; transform: scale(1.3); }
    100% { opacity: 0; transform: scale(1.8); }
  }
  @keyframes screenShake {
    0%, 100% { transform: translate(0,0); }
    20%  { transform: translate(-3px, 2px); }
    40%  { transform: translate(3px, -2px); }
    60%  { transform: translate(-2px, 3px); }
    80%  { transform: translate(2px, -1px); }
  }
  @keyframes pixelBlink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes comboFloat {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-40px) scale(1.4); }
  }
  .wham-knight-rise  { animation: knightRise 0.25s ease-out forwards; }
  .wham-knight-hide  { animation: knightHide 0.3s ease-in forwards; }
  .wham-knight-hit   { animation: knightHit 0.4s ease-out forwards; }
  .wham-hammer-swing { animation: hammerSwing 0.35s ease-out forwards; }
  .wham-shake        { animation: screenShake 0.3s ease-out; }
  .wham-splash       { animation: hitSplash 0.45s ease-out forwards; }
  .wham-blink        { animation: pixelBlink 0.6s step-end infinite; }
  .wham-combo-float  { animation: comboFloat 0.8s ease-out forwards; }
`;

export function HeroKnight({ swinging }: { swinging: boolean }) {
  return (
    <div style={{ position: 'relative', width: 72, height: 96, imageRendering: 'pixelated' }}>
      <svg width="72" height="96" viewBox="0 0 18 24" style={{ imageRendering: 'pixelated' }}>
        <rect x="4" y="0" width="10" height="3" fill="#ff3399" />
        <rect x="3" y="1" width="2" height="4" fill="#ff6600" />
        <rect x="13" y="1" width="2" height="4" fill="#00ccff" />
        <rect x="6" y="0" width="6" height="1" fill="#ffff00" />
        <rect x="5" y="1" width="8" height="1" fill="#ff3399" />
        <rect x="4" y="3" width="10" height="7" fill="#8899aa" />
        <rect x="3" y="5" width="12" height="5" fill="#99aabb" />
        <rect x="5" y="5" width="8" height="5" fill="#ffcc88" />
        <rect x="8" y="8" width="2" height="2" fill="#ff2222" />
        <rect x="5" y="6" width="3" height="2" fill="#ffffff" />
        <rect x="10" y="6" width="3" height="2" fill="#ffffff" />
        <rect x="6" y="6" width="2" height="2" fill="#000000" />
        <rect x="11" y="6" width="2" height="2" fill="#000000" />
        <rect x="7" y="7" width="1" height="1" fill="#ffffff" />
        <rect x="12" y="7" width="1" height="1" fill="#ffffff" />
        <rect x="6" y="9" width="6" height="1" fill="#cc2222" />
        <rect x="5" y="8" width="1" height="2" fill="#cc2222" />
        <rect x="12" y="8" width="1" height="2" fill="#cc2222" />
        <rect x="4" y="10" width="10" height="8" fill="#778899" />
        <rect x="5" y="11" width="8" height="6" fill="#8899aa" />
        <rect x="7" y="12" width="4" height="4" fill="#99aacc" />
        <rect x="5" y="9" width="8" height="2" fill="#99aaaa" />
        <rect x="1" y="10" width="4" height="6" fill="#8899aa" />
        <rect x="13" y="10" width="4" height="6" fill="#8899aa" />
        <rect x="13" y="15" width="3" height="2" fill="#ffcc88" />
        <rect x="4" y="18" width="4" height="6" fill="#556677" />
        <rect x="4" y="22" width="5" height="2" fill="#445566" />
        <rect x="10" y="18" width="4" height="6" fill="#556677" />
        <rect x="9" y="22" width="5" height="2" fill="#445566" />
        <rect x="4" y="17" width="10" height="2" fill="#667788" />
        <rect x="7" y="17" width="4" height="2" fill="#ffaa00" />
      </svg>
      <div
        className={swinging ? 'wham-hammer-swing' : ''}
        style={{ position: 'absolute', right: -20, top: 16, transformOrigin: '8px 8px' }}
      >
        <svg width="36" height="48" viewBox="0 0 9 12" style={{ imageRendering: 'pixelated' }}>
          <rect x="3" y="4" width="2" height="8" fill="#8B5A2B" />
          <rect x="0" y="0" width="9" height="5" fill="#778899" />
          <rect x="1" y="1" width="7" height="3" fill="#99aabb" />
          <rect x="0" y="2" width="2" height="1" fill="#667788" />
          <rect x="7" y="2" width="2" height="1" fill="#667788" />
          <rect x="2" y="1" width="3" height="1" fill="#bbccdd" />
        </svg>
      </div>
    </div>
  );
}

export function EnemyKnight({ state }: { state: HoleState }) {
  const animCls =
    state === 'rising'  ? 'wham-knight-rise' :
    state === 'hiding'  ? 'wham-knight-hide' :
    state === 'hit'     ? 'wham-knight-hit'  : '';

  return (
    <div
      className={animCls}
      style={{
        width: 48,
        height: 64,
        imageRendering: 'pixelated',
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%) translateY(100%)',
        cursor: state === 'up' ? 'crosshair' : 'default',
        pointerEvents: state === 'up' ? 'auto' : 'none',
      }}
    >
      <svg width="48" height="64" viewBox="0 0 12 16" style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="0" width="8" height="7" fill="#445566" />
        <rect x="1" y="2" width="10" height="5" fill="#556677" />
        <rect x="3" y="3" width="6" height="4" fill="#334455" />
        <rect x="3" y="3" width="2" height="1" fill="#88aacc" />
        <rect x="7" y="3" width="2" height="1" fill="#88aacc" />
        <rect x="3" y="5" width="6" height="1" fill="#445566" />
        <rect x="5" y="0" width="2" height="1" fill="#cc3300" />
        <rect x="4" y="0" width="4" height="1" fill="#cc3300" />
        <rect x="0" y="6" width="12" height="3" fill="#445566" />
        <rect x="2" y="9" width="8" height="5" fill="#445566" />
        <rect x="3" y="10" width="6" height="3" fill="#556677" />
        <rect x="4" y="10" width="4" height="3" fill="#667788" />
        <rect x="0" y="7" width="2" height="5" fill="#445566" />
        <rect x="10" y="7" width="2" height="5" fill="#445566" />
        <rect x="2" y="14" width="3" height="2" fill="#334455" />
        <rect x="7" y="14" width="3" height="2" fill="#334455" />
        <rect x="11" y="3" width="1" height="8" fill="#aabbcc" />
        <rect x="10" y="4" width="3" height="1" fill="#889999" />
        <rect x="11" y="2" width="1" height="2" fill="#ccddee" />
      </svg>
    </div>
  );
}

export function HitSplash({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="wham-splash"
      style={{
        position: 'fixed',
        left: x - 24,
        top: y - 24,
        width: 48,
        height: 48,
        pointerEvents: 'none',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
      }}
    >
      💥
    </div>
  );
}

export function ComboFloat({ value, x, y }: { value: number; x: number; y: number }) {
  return (
    <div
      className="wham-combo-float"
      style={{
        position: 'fixed',
        left: x - 30,
        top: y - 20,
        pointerEvents: 'none',
        zIndex: 1000,
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: value >= 5 ? '#ffaa00' : '#00ffaa',
        textShadow: '0 0 8px currentColor',
        whiteSpace: 'nowrap',
      }}
    >
      {value >= 5 ? `x${value} 🔥` : `+${value}`}
    </div>
  );
}
