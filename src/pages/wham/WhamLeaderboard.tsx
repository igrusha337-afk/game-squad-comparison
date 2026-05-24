export interface LeaderRow {
  username: string;
  best_score: number;
  best_misses: number;
  games_played: number;
}

interface WhamLeaderboardProps {
  leaderboard: LeaderRow[];
  loading: boolean;
  currentUsername?: string;
}

export default function WhamLeaderboard({ leaderboard, loading, currentUsername }: WhamLeaderboardProps) {
  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <div style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 11,
        color: 'hsl(42 90% 52%)',
        textShadow: '2px 2px 0 #7a4500',
        marginBottom: 16,
        letterSpacing: '0.08em',
      }}>
        🏆 ТАБЛИЦА РЕЙТИНГА
      </div>

      <div style={{
        background: 'hsl(224 20% 7%)',
        border: '3px solid hsl(42 90% 52% / 0.3)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 90px 70px 60px',
          gap: 0,
          padding: '10px 14px',
          background: 'hsl(42 90% 52% / 0.1)',
          borderBottom: '2px solid hsl(42 90% 52% / 0.25)',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 6,
          color: 'hsl(42 90% 52%)',
          letterSpacing: '0.06em',
        }}>
          <div>#</div>
          <div>ИГРОК</div>
          <div style={{ textAlign: 'right' }}>РЕКОРД</div>
          <div style={{ textAlign: 'right' }}>ПРОМАХИ</div>
          <div style={{ textAlign: 'right' }}>ИГР</div>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: 'hsl(215 18% 40%)' }}>
            ЗАГРУЗКА...
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: 'hsl(215 18% 40%)', lineHeight: 2 }}>
            Пока никто не играл.<br />Будь первым!
          </div>
        ) : (
          leaderboard.map((row, idx) => {
            const isMe = currentUsername === row.username;
            const medals = ['🥇', '🥈', '🥉'];
            const place = idx < 3 ? medals[idx] : `${idx + 1}`;
            const isTop = idx < 3;
            return (
              <div
                key={row.username}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 90px 70px 60px',
                  gap: 0,
                  padding: '9px 14px',
                  borderBottom: '1px solid hsl(215 18% 12%)',
                  background: isMe
                    ? 'hsl(42 90% 52% / 0.08)'
                    : isTop ? 'hsl(224 20% 9%)' : 'transparent',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 7,
                  alignItems: 'center',
                  borderLeft: isMe ? '3px solid hsl(42 90% 52%)' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: idx < 3 ? 14 : 7, color: isTop ? 'hsl(42 90% 52%)' : 'hsl(215 18% 35%)' }}>
                  {place}
                </div>
                <div style={{ color: isMe ? 'hsl(42 90% 55%)' : 'hsl(38 15% 72%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.username}{isMe ? ' ◀' : ''}
                </div>
                <div style={{ textAlign: 'right', color: isTop ? '#ffdd66' : 'hsl(38 15% 60%)', fontWeight: 700 }}>
                  {row.best_score}
                </div>
                <div style={{ textAlign: 'right', color: 'hsl(0 60% 55%)' }}>
                  {row.best_misses}
                </div>
                <div style={{ textAlign: 'right', color: 'hsl(215 18% 40%)' }}>
                  {row.games_played}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 10, fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: 'hsl(215 18% 30%)', lineHeight: 2 }}>
        Топ-20 · Учитывается лучший результат за все игры
      </div>
    </div>
  );
}
