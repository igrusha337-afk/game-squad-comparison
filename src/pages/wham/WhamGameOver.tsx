interface WhamGameOverProps {
  score: number;
  misses: number;
  scoreSaved: boolean;
  isLoggedIn: boolean;
  onRestart: () => void;
}

export default function WhamGameOver({ score, misses, scoreSaved, isLoggedIn, onRestart }: WhamGameOverProps) {
  return (
    <div style={{
      marginTop: 24,
      padding: 24,
      background: 'hsl(224 20% 7%)',
      border: '3px solid hsl(42 90% 52% / 0.5)',
      textAlign: 'center',
      maxWidth: 480,
      imageRendering: 'pixelated',
    }}>
      <div style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 'clamp(12px, 3vw, 20px)',
        color: 'hsl(42 90% 52%)',
        textShadow: '2px 2px 0 #7a4500',
        marginBottom: 16,
      }}>
        GAME OVER
      </div>

      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: 'hsl(38 15% 70%)', marginBottom: 8 }}>
        ИТОГ: {score} ОЧКОВ
      </div>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: 'hsl(0 60% 55%)', marginBottom: 16 }}>
        ПРОМАХОВ: {misses}
      </div>

      <div style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 9,
        color: score >= 40 ? '#ffaa00' : score >= 20 ? '#aaddff' : '#778899',
        textShadow: score >= 40 ? '0 0 12px #ffaa00' : 'none',
        marginBottom: 16,
        lineHeight: 2,
      }}>
        {score >= 60 ? '👑 ЛЕГЕНДА ТУРНИРА' :
         score >= 40 ? '⚔ МАСТЕР МОЛОТА' :
         score >= 20 ? '🛡 ДОСТОЙНЫЙ РЫЦАРЬ' :
         '🤡 НОВОБРАНЕЦ'}
      </div>

      {isLoggedIn ? (
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, marginBottom: 16,
          color: scoreSaved ? '#00ff88' : 'hsl(215 18% 45%)' }}>
          {scoreSaved ? '✓ РЕЗУЛЬТАТ СОХРАНЁН' : '... СОХРАНЯЮ...'}
        </div>
      ) : (
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, marginBottom: 16, color: 'hsl(42 90% 52% / 0.6)', lineHeight: 2 }}>
          Войди в аккаунт,<br />чтобы попасть в рейтинг!
        </div>
      )}

      <button
        onClick={onRestart}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 10,
          padding: '12px 24px',
          background: 'hsl(42 90% 52%)',
          color: 'hsl(224 20% 6%)',
          border: '3px solid hsl(42 90% 38%)',
          cursor: 'pointer',
          boxShadow: '3px 3px 0 hsl(42 90% 28%)',
          imageRendering: 'pixelated',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 hsl(42 90% 28%)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '3px 3px 0 hsl(42 90% 28%)'; }}
      >
        ↺ СНОВА
      </button>
    </div>
  );
}
