import { useState, useEffect, useCallback, useRef } from 'react';
import { streamersApi } from '@/lib/api';

export interface StreamerPlatform {
  platform: 'twitch' | 'youtube';
  url: string;
  is_live: boolean;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  offline_thumbnail_url: string;
  started_at: string;
  game_name: string;
}

export interface Streamer {
  id: number;
  twitch_login: string;
  youtube_channel_id: string;
  display_name: string;
  channel_url: string;
  avatar_url: string;
  is_live: boolean;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  offline_thumbnail_url: string;
  started_at: string;
  game_name: string;
  platforms: StreamerPlatform[];
}

const POLL_INTERVAL = 15000;

/**
 * Список стримеров сообщества с live-статусом, обновляется раз в 15 секунд.
 * Используется во всех виджетах (шапка, сайдбар, каталог, страница "Стримеры"),
 * чтобы не плодить параллельные опросы backend.
 */
export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await streamersApi.list();
      setStreamers(d.streamers || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const liveStreamers = streamers.filter(s => s.is_live);

  return { streamers, liveStreamers, loading };
}