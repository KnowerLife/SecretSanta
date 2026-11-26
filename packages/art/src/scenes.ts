export type ThemeName = 'winter' | 'midnight' | 'cozy';
export type SceneCategory = 'cover' | 'hero' | 'mode' | 'state' | 'guide';

export interface SceneDescriptor {
  readonly id: string;
  readonly titleRu: string;
  readonly titleEn: string;
  readonly category: SceneCategory;
  readonly width: number;
  readonly height: number;
}

export const SCENES = [
  { id: 'social-cover', titleRu: 'Обложка для соцсетей', titleEn: 'Social cover', category: 'cover', width: 1200, height: 630 },

  { id: 'hero-winter-scene', titleRu: 'Зимняя сцена на первом экране', titleEn: 'Winter hero scene', category: 'hero', width: 1200, height: 675 },
  { id: 'rules-fair-draw', titleRu: 'Правила честной жеребьёвки', titleEn: 'Fair draw rules', category: 'hero', width: 1200, height: 675 },
  { id: 'testimonials-friends', titleRu: 'Отзывы участников', titleEn: "Friends' testimonials", category: 'hero', width: 1200, height: 675 },
  { id: 'faq-help', titleRu: 'Помощь и частые вопросы', titleEn: 'Help and FAQ', category: 'hero', width: 1200, height: 675 },
  { id: 'create-game-head', titleRu: 'Создание игры', titleEn: 'Create a game', category: 'hero', width: 1200, height: 675 },
  { id: 'join-game-head', titleRu: 'Вход в игру', titleEn: 'Join a game', category: 'hero', width: 1200, height: 675 },
  { id: 'quick-draw-head', titleRu: 'Быстрая жеребьёвка', titleEn: 'Quick draw', category: 'hero', width: 1200, height: 675 },
  { id: 'privacy-who-sees', titleRu: 'Кто что видит', titleEn: 'Who sees what', category: 'hero', width: 1200, height: 675 },
  { id: 'gift-ideas', titleRu: 'Идеи подарков', titleEn: 'Gift ideas', category: 'hero', width: 1200, height: 675 },
  { id: 'cta-celebration', titleRu: 'Праздничный финал', titleEn: 'Celebration CTA', category: 'hero', width: 1200, height: 675 },
  { id: 'quick-draw-success', titleRu: 'Жеребьёвка завершена', titleEn: 'Quick draw success', category: 'hero', width: 1200, height: 675 },

  { id: 'mode-online', titleRu: 'Полная игра', titleEn: 'Full online game', category: 'mode', width: 1200, height: 800 },
  { id: 'mode-quick', titleRu: 'Режим быстрой жеребьёвки', titleEn: 'Quick draw mode', category: 'mode', width: 1200, height: 800 },
  { id: 'mode-demo', titleRu: 'Демо-игра', titleEn: 'Demo game', category: 'mode', width: 1200, height: 800 },
  { id: 'dashboard-empty', titleRu: 'Пустая комната', titleEn: 'Empty dashboard', category: 'mode', width: 1200, height: 800 },
  { id: 'step-create-game', titleRu: 'Шаг 1. Создайте игру', titleEn: 'Step 1. Create a game', category: 'mode', width: 1200, height: 800 },
  { id: 'step-invite-friends', titleRu: 'Шаг 2. Пригласите друзей', titleEn: 'Step 2. Invite friends', category: 'mode', width: 1200, height: 800 },
  { id: 'step-draw-gifts', titleRu: 'Шаг 3. Проведите жеребьёвку', titleEn: 'Step 3. Draw gifts', category: 'mode', width: 1200, height: 800 },

  { id: 'access-empty', titleRu: 'Нет серий доступа', titleEn: 'No access codes', category: 'state', width: 1200, height: 900 },
  { id: 'activity-empty', titleRu: 'Пустой лог событий', titleEn: 'Empty activity log', category: 'state', width: 1200, height: 900 },
  { id: 'audience-remote', titleRu: 'Для любой компании', titleEn: 'For any team', category: 'state', width: 1200, height: 900 },
  { id: 'chat-empty', titleRu: 'Пустой чат', titleEn: 'Empty chat', category: 'state', width: 1200, height: 900 },
  { id: 'chat-waiting', titleRu: 'Чат до жеребьёвки', titleEn: 'Chat before the draw', category: 'state', width: 1200, height: 900 },
  { id: 'feature-anonymous-chat', titleRu: 'Анонимный чат', titleEn: 'Anonymous chat', category: 'state', width: 1200, height: 900 },
  { id: 'invite-share', titleRu: 'Приглашение и ссылка', titleEn: 'Share an invite', category: 'state', width: 1200, height: 900 },
  { id: 'profile-empty', titleRu: 'Пустой профиль получателя', titleEn: 'Empty recipient profile', category: 'state', width: 1200, height: 900 },
  { id: 'recipient-waiting', titleRu: 'Получатель пока не известен', titleEn: 'Recipient not revealed yet', category: 'state', width: 1200, height: 900 },
  { id: 'wishlist-empty', titleRu: 'Пустой вишлист', titleEn: 'Empty wishlist', category: 'state', width: 1200, height: 900 },

  { id: 'guide-format', titleRu: 'Гид. Выберите формат', titleEn: 'Guide. Choose a format', category: 'guide', width: 800, height: 600 },
  { id: 'guide-prep', titleRu: 'Гид. Подготовка', titleEn: 'Guide. Preparation', category: 'guide', width: 800, height: 600 },
  { id: 'guide-room-team', titleRu: 'Гид. Команда', titleEn: 'Room guide. Team', category: 'guide', width: 800, height: 600 },
  { id: 'guide-room-wishes', titleRu: 'Гид. Желания', titleEn: 'Room guide. Wishes', category: 'guide', width: 800, height: 600 },
  { id: 'guide-room-profile', titleRu: 'Гид. Профиль', titleEn: 'Room guide. Profile', category: 'guide', width: 800, height: 600 },
  { id: 'guide-room-draw', titleRu: 'Гид. Жеребьёвка', titleEn: 'Room guide. Draw', category: 'guide', width: 800, height: 600 },
  { id: 'guide-room-gift', titleRu: 'Гид. Подарок', titleEn: 'Room guide. Gift', category: 'guide', width: 800, height: 600 },
] as const;

export type SceneId = (typeof SCENES)[number]['id'];

export function getScene(id: SceneId): (typeof SCENES)[number] {
  const scene = SCENES.find((candidate) => candidate.id === id);
  if (!scene) {
    throw new Error(`Unknown scene: ${id}`);
  }
  return scene;
}
