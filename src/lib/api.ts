const URLS = {
  auth: 'https://functions.poehali.dev/23d99d84-1616-4b50-9313-b88ca1a4a272',
  unitsApi: 'https://functions.poehali.dev/1332b379-06bb-41c1-83f8-e8bc6369fd8e',
  treatiesApi: 'https://functions.poehali.dev/c9428367-4953-41ff-9034-681a2f9d5d89',
  buildsApi: 'https://functions.poehali.dev/0f095936-748b-4a92-bdcb-14ee8f0ca92d',
  seed: 'https://functions.poehali.dev/95ab29ef-b38b-4e5b-9578-0456fb855829',
  upload: 'https://functions.poehali.dev/26151075-4ef3-4b29-8d16-c82a04dd0e83',
  forum: 'https://functions.poehali.dev/914f3bd8-b9e4-4dfa-b16a-e3dda3710d6e',
  battle: 'https://functions.poehali.dev/e55b6676-4af3-410b-99a4-d9faac5243bb',
  referenceApi: 'https://functions.poehali.dev/be68749b-b171-4cda-b1ff-a6df6ad8ae7f',
  gameApi: 'https://functions.poehali.dev/23edd385-7e13-41cb-a5d2-0a5cc4b4b5f7',
  statsApi: 'https://functions.poehali.dev/702bf411-49ba-4d48-b8ae-b79614b4a03b',
  profileApi: 'https://functions.poehali.dev/d236c13e-b58c-46b9-b37c-4f4fab797124',
  messagesApi: 'https://functions.poehali.dev/9c322351-b8b6-4513-a2d3-b3658d79f8e0',
  guidesApi: 'https://functions.poehali.dev/7c42af4f-b3f5-4363-b971-9823b6d05f6c',
  housesApi: 'https://functions.poehali.dev/b0631df5-a77f-4c46-8f6b-670ee8f4958c',
  streamersApi: 'https://functions.poehali.dev/7bc4b649-d323-4989-8c62-0063fa2d8923',
};

function getSessionId(): string {
  return localStorage.getItem('session_id') || '';
}

async function request(url: string, options: RequestInit = {}) {
  const sessionId = getSessionId();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

// Auth
export const authApi = {
  me: () => request(URLS.auth),
  register: (body: { username: string; email: string; password: string; confirmPassword: string }) =>
    request(URLS.auth, { method: 'POST', body: JSON.stringify({ action: 'register', ...body }) }),
  login: (body: { email: string; password: string }) =>
    request(URLS.auth, { method: 'POST', body: JSON.stringify({ action: 'login', ...body }) }),
  logout: () =>
    request(URLS.auth, { method: 'POST', body: JSON.stringify({ action: 'logout' }) }),
  forgotPassword: (email: string) =>
    request(URLS.auth, { method: 'POST', body: JSON.stringify({ action: 'forgot-password', email }) }),
  resetPassword: (token: string, password: string, confirmPassword: string) =>
    request(URLS.auth, { method: 'POST', body: JSON.stringify({ action: 'reset-password', token, password, confirmPassword }) }),
  makeAdmin: (secret: string) =>
    request(URLS.auth, { method: 'POST', body: JSON.stringify({ action: 'make-admin', secret }) }),
};

// Units
export const unitsApi = {
  list: () => request(URLS.unitsApi),
  create: (data: Record<string, unknown>) =>
    request(URLS.unitsApi, { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) }),
  update: (id: string, data: Record<string, unknown>) =>
    request(URLS.unitsApi, { method: 'POST', body: JSON.stringify({ action: 'update', id, ...data }) }),
  delete: (id: string) =>
    request(URLS.unitsApi, { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
};

// Seed
export const seedApi = {
  run: () => request(URLS.seed, { method: 'POST', body: JSON.stringify({}) }),
};

// Upload
export const uploadApi = {
  upload: (file: string, content_type: string, folder = 'avatars') =>
    request(URLS.upload, { method: 'POST', body: JSON.stringify({ file, content_type, folder }) }),
};

// Forum
export const forumApi = {
  getTopics: () => request(URLS.forum),
  getTopic: (id: number) => request(`${URLS.forum}?action=topic&id=${id}`),
  createTopic: (title: string, content: string, cover_file?: string, cover_content_type?: string) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'create_topic', title, content, ...(cover_file ? { cover_file, cover_content_type } : {}) }) }),
  createPost: (topic_id: number, content: string, reply_to_post_id?: number) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'create_post', topic_id, content, ...(reply_to_post_id ? { reply_to_post_id } : {}) }) }),
  editTopic: (topic_id: number, title: string, content: string) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'edit_topic', topic_id, title, content }) }),
  editPost: (post_id: number, content: string) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'edit_post', post_id, content }) }),
  pinTopic: (topic_id: number) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'pin_topic', topic_id }) }),
  lockTopic: (topic_id: number) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'lock_topic', topic_id }) }),
  hidePost: (post_id: number) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'hide_post', post_id }) }),
  deleteTopic: (topic_id: number) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'delete_topic', topic_id }) }),
  voteTopic: (topic_id: number, vote: 1 | -1) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'vote_topic', topic_id, vote }) }),
  getNotifications: () => request(`${URLS.forum}?action=notifications`),
  readNotifications: () => request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'read_notifications' }) }),
  getPendingTopics: () => request(`${URLS.forum}?action=pending_topics`),
  publishTopic: (topic_id: number, approve: boolean) =>
    request(URLS.forum, { method: 'POST', body: JSON.stringify({ action: 'publish_topic', topic_id, approve }) }),
};

// Formations
export const formationsApi = {
  list: () => request(`${URLS.referenceApi}?type=formations`),
  create: (data: { name: string; description: string; avatar_url: string }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'formations', action: 'create', ...data }) }),
  update: (id: number, data: { name: string; description: string; avatar_url: string }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'formations', action: 'update', id, ...data }) }),
  delete: (id: number) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'formations', action: 'delete', id }) }),
};

// Roles
export const rolesApi = {
  list: () => request(`${URLS.referenceApi}?type=roles`),
  create: (data: { name: string; description: string }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'roles', action: 'create', ...data }) }),
  update: (id: number, data: { name: string; description: string }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'roles', action: 'update', id, ...data }) }),
  delete: (id: number) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'roles', action: 'delete', id }) }),
};

// Game
export const gameApi = {
  leaderboard: () => request(URLS.gameApi),
  saveScore: (score: number, misses: number) =>
    request(URLS.gameApi, { method: 'POST', body: JSON.stringify({ action: 'save', score, misses }) }),
};

// Traits
export const traitsApi = {
  list: () => request(`${URLS.referenceApi}?type=traits`),
  create: (data: { name: string; description: string; color: string }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'traits', action: 'create', ...data }) }),
  update: (id: number, data: { name: string; description: string; color: string }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'traits', action: 'update', id, ...data }) }),
  delete: (id: number) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'traits', action: 'delete', id }) }),
};

// Special Stats
export const specialStatsApi = {
  list: () => request(`${URLS.referenceApi}?type=special_stats`),
  create: (data: { key: string; label: string; maxValue: number; sortOrder: number }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'special_stats', action: 'create', ...data }) }),
  update: (id: number, data: { label: string; maxValue: number; sortOrder: number }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'special_stats', action: 'update', id, ...data }) }),
  delete: (id: number) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'special_stats', action: 'delete', id }) }),
};

// Abilities
export const abilitiesApi = {
  list: () => request(`${URLS.referenceApi}?type=abilities`),
  create: (data: { name: string; description: string; adminComment: string; statModifiers: Record<string, number>; statModifiersEx: Record<string, { value: number; type: string }> }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'abilities', action: 'create', ...data }) }),
  update: (id: number, data: { name: string; description: string; adminComment: string; statModifiers: Record<string, number>; statModifiersEx: Record<string, { value: number; type: string }> }) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'abilities', action: 'update', id, ...data }) }),
  delete: (id: number) =>
    request(URLS.referenceApi, { method: 'POST', body: JSON.stringify({ type: 'abilities', action: 'delete', id }) }),
};

// Stats
export const statsApi = {
  track: (path: string) => {
    const sessionId = getSessionId();
    return fetch(URLS.statsApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify({ action: 'track', path }),
    }).catch(() => {});
  },
  getStats: () => request(URLS.statsApi),
};

// Profile
export const profileApi = {
  getPublicProfile: (userId: number) => request(`${URLS.profileApi}?user_id=${userId}`),
  getUser: (userId: number) => request(`${URLS.profileApi}?user_id=${userId}`),
  updateProfile: (data: { bio?: string; avatar_file?: string; avatar_content_type?: string; cover_file?: string; cover_content_type?: string }) =>
    request(URLS.profileApi, { method: 'POST', body: JSON.stringify({ action: 'update_profile', ...data }) }),
};

// Messages
export const messagesApi = {
  getConversations: () => request(`${URLS.messagesApi}?action=conversations`),
  getMessages: (withUserId: number) => request(`${URLS.messagesApi}?action=messages&with=${withUserId}`),
  getUnreadCount: () => request(`${URLS.messagesApi}?action=unread_count`),
  send: (receiver_id: number, content: string) =>
    request(URLS.messagesApi, { method: 'POST', body: JSON.stringify({ action: 'send', receiver_id, content }) }),
  markRead: (with_user_id: number) =>
    request(URLS.messagesApi, { method: 'POST', body: JSON.stringify({ action: 'mark_read', with_user_id }) }),
};

// Guides
export const guidesApi = {
  list: () => request(URLS.guidesApi),
  getGuide: (id: number) => request(`${URLS.guidesApi}?action=guide&id=${id}`),
  create: (data: { title: string; content: string; avatar_file?: string; avatar_content_type?: string }) =>
    request(URLS.guidesApi, { method: 'POST', body: JSON.stringify({ action: 'create_guide', ...data }) }),
  update: (guide_id: number, data: { title: string; content: string }) =>
    request(URLS.guidesApi, { method: 'POST', body: JSON.stringify({ action: 'update_guide', guide_id, ...data }) }),
  vote: (guide_id: number, vote: 1 | -1) =>
    request(URLS.guidesApi, { method: 'POST', body: JSON.stringify({ action: 'vote', guide_id, vote }) }),
  uploadFile: (file_data: string, content_type: string, filename: string) =>
    request(URLS.guidesApi, { method: 'POST', body: JSON.stringify({ action: 'upload_file', file_data, content_type, filename }) }),
  getPendingGuides: () => request(`${URLS.guidesApi}?action=pending_guides`),
  publishGuide: (guide_id: number, approve: boolean) =>
    request(URLS.guidesApi, { method: 'POST', body: JSON.stringify({ action: 'publish_guide', guide_id, approve }) }),
  deleteGuide: (guide_id: number) =>
    request(URLS.guidesApi, { method: 'POST', body: JSON.stringify({ action: 'delete_guide', guide_id }) }),
};

// Houses
export const HOUSE_ROLES: Record<string, string> = {
  owner: 'Глава дома',
  diplomat: 'Сенешаль',
  marshal: 'Маршал',
  lord: 'Лорд',
  knight: 'Рыцарь',
};

export const HOUSE_TROPHY_TYPES: Record<string, string> = {
  capital: 'Главная столица',
  secondary_capital: 'Второстепенная столица',
};

export type HouseSort = 'points' | 'members' | 'date_new' | 'date_old';

export const housesApi = {
  list: (sort?: HouseSort) => request(sort ? `${URLS.housesApi}?sort=${sort}` : URLS.housesApi),
  getHouse: (id: number) => request(`${URLS.housesApi}?action=house&id=${id}`),
  adminList: () => request(`${URLS.housesApi}?action=admin_list`),
  create: (data: { name: string; short_desc: string; server: string; emblem_file?: string; emblem_content_type?: string }) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'create_house', ...data }) }),
  update: (house_id: number, data: {
    name?: string; short_desc?: string; server?: string; emblem_file?: string; emblem_content_type?: string;
    description?: string; photo_file?: string; photo_content_type?: string;
    telegram_url?: string; discord_url?: string; vk_url?: string; youtube_url?: string; rutube_url?: string; twitch_url?: string;
    telegram_visible?: boolean; discord_visible?: boolean; vk_visible?: boolean; youtube_visible?: boolean; rutube_visible?: boolean; twitch_visible?: boolean;
  }) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'update_house', house_id, ...data }) }),
  join: (house_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'join_house', house_id }) }),
  leave: () =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'leave_house' }) }),
  kickMember: (house_id: number, member_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'kick_member', house_id, member_id }) }),
  deleteHouse: (house_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'delete_house', house_id }) }),
  transferOwnership: (house_id: number, new_owner_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'transfer_ownership', house_id, new_owner_id }) }),
  addVideo: (house_id: number, data: { video_url: string; title?: string }) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'add_video', house_id, ...data }) }),
  deleteVideo: (video_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'delete_video', video_id }) }),
  deletePhoto: (photo_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'delete_photo', photo_id }) }),
  uploadAudioChunk: (house_id: number, data: { upload_id: string; chunk_index: number; chunk_data: string }) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'upload_audio_chunk', house_id, ...data }) }),
  finishAudioUpload: (house_id: number, data: { upload_id: string; content_type: string; title?: string }) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'finish_audio_upload', house_id, ...data }) }),
  deleteAudio: (audio_id: number) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'delete_audio', audio_id }) }),
  setMemberRole: (house_id: number, member_id: number, role: string) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'set_member_role', house_id, member_id, role }) }),
  awardTrophy: (house_id: number, trophy_type: string) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'award_trophy', house_id, trophy_type }) }),
  revokeTrophy: (house_id: number, trophy_type: string) =>
    request(URLS.housesApi, { method: 'POST', body: JSON.stringify({ action: 'revoke_trophy', house_id, trophy_type }) }),
};

// Treaties
export const treatiesApi = {
  list: () => request(URLS.treatiesApi),
  create: (data: Record<string, unknown>) =>
    request(URLS.treatiesApi, { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) }),
  update: (id: string, data: Record<string, unknown>) =>
    request(URLS.treatiesApi, { method: 'POST', body: JSON.stringify({ action: 'update', id, ...data }) }),
  delete: (id: string) =>
    request(URLS.treatiesApi, { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
  createCategory: (data: { name: string; description: string; sortOrder: number }) =>
    request(URLS.treatiesApi, { method: 'POST', body: JSON.stringify({ action: 'create_category', ...data }) }),
  updateCategory: (id: number, data: { name: string; description: string; sortOrder: number }) =>
    request(URLS.treatiesApi, { method: 'POST', body: JSON.stringify({ action: 'update_category', id, ...data }) }),
  deleteCategory: (id: number) =>
    request(URLS.treatiesApi, { method: 'POST', body: JSON.stringify({ action: 'delete_category', id }) }),
};

// Builds
export const buildsApi = {
  getById: (id: string) => request(`${URLS.buildsApi}?id=${id}`),
  getMy: () => request(`${URLS.buildsApi}?action=my`),
  create: (data: { unitId: string; treatyIds: string[]; title: string; description: string }) =>
    request(URLS.buildsApi, { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) }),
  delete: (id: string) =>
    request(URLS.buildsApi, { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
};

// Streamers
export const streamersApi = {
  list: () => request(URLS.streamersApi),
  adminList: () => request(`${URLS.streamersApi}?action=admin_list`),
  add: (twitch_login: string, display_name?: string, youtube_channel?: string) =>
    request(URLS.streamersApi, { method: 'POST', body: JSON.stringify({ action: 'add', twitch_login, display_name, youtube_channel }) }),
  update: (id: number, data: { display_name?: string; is_active?: boolean; sort_order?: number; youtube_channel?: string }) =>
    request(URLS.streamersApi, { method: 'POST', body: JSON.stringify({ action: 'update', id, ...data }) }),
  delete: (id: number) =>
    request(URLS.streamersApi, { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
};