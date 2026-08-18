# porooch

PWA для ситуативних зустрічей. React + Vite + Supabase + Tailwind CSS.

## Швидкий старт

### 1. Налаштування оточення

```bash
cp .env.example .env
# Відкрий .env та встав свої Supabase URL та Anon Key
```

Ключі знайдеш у Supabase Dashboard → Project Settings → API.

### 2. База даних

Відкрий **Supabase Dashboard → SQL Editor** і виконай файл:

```
supabase/migrations/001_initial.sql
```

Він створить всі таблиці, тригери, RLS-правила та PostGIS функції.

### 3. Google OAuth

У Supabase Dashboard → Authentication → Providers → Google:
- Увімкни Google provider
- Додай Client ID і Client Secret з Google Cloud Console
- Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

У Google Cloud Console → OAuth 2.0 → Authorized redirect URIs:
```
https://your-project.supabase.co/auth/v1/callback
```

### 4. Storage (для аватарів)

У Supabase Dashboard → Storage → New bucket:
- Name: `avatars`
- Public: ✅

### 5. Запуск

```bash
npm install
npm run dev
```

Відкрий http://localhost:5173

## Структура

```
src/
├── contexts/AuthContext.tsx   # Auth стан + Google OAuth
├── hooks/
│   ├── useActivities.ts       # Лента + геофільтрація
│   ├── useMatches.ts          # Список мэтчів
│   └── useMessages.ts         # Realtime чат
├── pages/
│   ├── Onboarding.tsx         # Google sign-in
│   ├── Onboarding/CompleteProfile.tsx
│   ├── Feed.tsx               # Лента активностей
│   ├── CreateActivity.tsx     # Форма створення
│   ├── Matches.tsx            # Список мэтчів
│   ├── Chat.tsx               # Realtime чат
│   └── Profile.tsx            # Профіль
├── components/
│   ├── ActivityCard.tsx       # Картка активності
│   ├── AdCard.tsx             # Рекламна картка
│   ├── BottomNav.tsx          # Нижня навігація
│   └── ProtectedRoute.tsx     # Захист маршрутів
└── lib/
    ├── supabase.ts            # Supabase клієнт
    ├── geo.ts                 # Геолокація (fallback: Чернігів)
    └── activityMeta.ts        # Типи активностей
```

## PWA іконки

Замінити `public/icons/icon-192.png` та `public/icons/icon-512.png` на реальні PNG перед виходом в прод.

## Build

```bash
npm run build
npm run preview
```
