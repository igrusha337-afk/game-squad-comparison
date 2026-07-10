export interface VideoEmbed {
  type: 'iframe' | 'link';
  embedUrl?: string;
}

/** Преобразует ссылку на YouTube/VK/Rutube/Twitch в embed-URL для iframe-плеера.
 * Видео воспроизводится напрямую с площадки — наше хранилище не используется. */
export function getVideoEmbed(url: string): VideoEmbed {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return { type: 'iframe', embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').pop();
      if (id) return { type: 'iframe', embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith('rutube.ru')) {
      const match = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
      if (match) return { type: 'iframe', embedUrl: `https://rutube.ru/play/embed/${match[1]}` };
    }
    if (host.endsWith('vk.com') || host.endsWith('vkvideo.ru')) {
      const match = u.pathname.match(/video(-?\d+)_(\d+)/) || u.search.match(/video(-?\d+)_(\d+)/);
      if (match) return { type: 'iframe', embedUrl: `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}` };
    }
    if (host.endsWith('twitch.tv')) {
      if (host.startsWith('clips.')) {
        const clipId = u.pathname.split('/').pop();
        if (clipId) return { type: 'iframe', embedUrl: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}` };
      }
      const match = u.pathname.match(/\/videos\/(\d+)/);
      if (match) return { type: 'iframe', embedUrl: `https://player.twitch.tv/?video=${match[1]}&parent=${window.location.hostname}` };
      const channel = u.pathname.split('/').filter(Boolean)[0];
      if (channel) return { type: 'iframe', embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}` };
    }
  } catch {
    // ignore
  }
  return { type: 'link' };
}
