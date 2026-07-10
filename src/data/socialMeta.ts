export type SocialKey = 'telegram' | 'discord' | 'vk' | 'youtube' | 'rutube' | 'twitch';

export interface SocialMetaItem {
  key: SocialKey;
  label: string;
  icon: string;
  imageUrl?: string;
  color: string;
}

export const SOCIAL_META: SocialMetaItem[] = [
  { key: 'telegram', label: 'Telegram', icon: 'Send', imageUrl: 'https://cdn.poehali.dev/projects/455c24fb-ce5d-4076-9543-1ca6ad6daa72/bucket/95b47ddd-8552-4efa-8076-cd3bb06fa1c3.png', color: 'hsl(200 85% 55%)' },
  { key: 'discord', label: 'Discord', icon: 'MessageCircle', imageUrl: 'https://cdn.poehali.dev/projects/455c24fb-ce5d-4076-9543-1ca6ad6daa72/bucket/6dfc9754-ac15-4a12-9cdf-c66167a7fcec.png', color: 'hsl(235 85% 65%)' },
  { key: 'vk', label: 'ВКонтакте', icon: 'Share2', imageUrl: 'https://cdn.poehali.dev/projects/455c24fb-ce5d-4076-9543-1ca6ad6daa72/bucket/639aded0-9a61-438b-81b2-50eaa9b9e596.png', color: 'hsl(210 78% 58%)' },
  { key: 'youtube', label: 'YouTube', icon: 'Youtube', imageUrl: 'https://cdn.poehali.dev/projects/455c24fb-ce5d-4076-9543-1ca6ad6daa72/bucket/899256be-9b73-4bf7-8e4c-aa5702ec24ac.png', color: 'hsl(0 72% 55%)' },
  { key: 'rutube', label: 'Rutube', icon: 'Video', imageUrl: 'https://cdn.poehali.dev/projects/455c24fb-ce5d-4076-9543-1ca6ad6daa72/bucket/6c0b2865-7747-46aa-84b4-5ff282f1c12a.png', color: 'hsl(20 85% 55%)' },
  { key: 'twitch', label: 'Twitch', icon: 'Twitch', color: 'hsl(262 60% 60%)' },
];
