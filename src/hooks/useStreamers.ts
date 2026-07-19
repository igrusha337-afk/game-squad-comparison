import { useSyncExternalStore } from 'react';
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

interface StreamersState {
  streamers: Streamer[];
  loading: boolean;
}

const POLL_INTERVAL = 30000;

/**
 * Общее хранилище списка стримеров на всё приложение (module-level singleton).
 * Опрос backend идёт ОДИН раз на весь сайт независимо от того, сколько
 * компонентов (шапка, сайдбар, каталог, страница "Стримеры") используют этот хук —
 * это критично для экономии вычислительного времени backend-функции.
 */
let state: StreamersState = { streamers: [], loading: true };
let subscriberCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function setState(next: Partial<StreamersState>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

async function load() {
  try {
    const d = await streamersApi.list();
    setState({ streamers: d.streamers || [], loading: false });
  } catch {
    setState({ loading: false });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscriberCount++;
  if (subscriberCount === 1) {
    load();
    timer = setInterval(load, POLL_INTERVAL);
  }
  return () => {
    listeners.delete(listener);
    subscriberCount--;
    if (subscriberCount === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  return state;
}

export function useStreamers() {
  const { streamers, loading } = useSyncExternalStore(subscribe, getSnapshot);
  const liveStreamers = streamers.filter(s => s.is_live);
  return { streamers, liveStreamers, loading };
}