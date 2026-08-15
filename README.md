# MathDash: Neon Cards

Математическая игра в неоновом стиле — тренировка счёта с адаптивной сложностью и отслеживанием слабых мест.


## Возможности

- **Режимы игры**: Classic, Blitz (60 сек), Trio (три числа), Multiplayer
- **Уровни сложности**: Easy, Medium, Hard
- **Адаптивная сложность**: level up при серии из 3 правильных, level down при ошибке
- **Слабые места**: отслеживание ошибок по типам задач, подмешивание проблемных типов
- **История**: фильтры, пагинация, блок «Слабые места»
- **PWA**: установка на устройство, офлайн-поддержка
- **Supabase**: история, лидерборд, слабые места

## Стек

- React 19, TypeScript, Vite
- Tailwind CSS 4
- Express + WebSocket (multiplayer)
- Supabase (PostgreSQL)
- PWA (vite-plugin-pwa)

## Быстрый старт

**Требования:** Node.js 20+

```bash
npm install
npm run dev
```

Открой http://localhost:3000

## Переменные окружения

Скопируй `.env.example` в `.env`:

```bash
cp .env.example .env
```

| Переменная | Описание |
|------------|----------|
| `PORT` | Порт сервера (по умолчанию 3000) |
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
| `VITE_ENABLE_MULTIPLAYER` | `true` включает режим Multiplayer. Требует запущенный `server.ts` |

## Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Выполни SQL из `supabase/migrations/20240309000000_initial_schema.sql` в SQL Editor
3. Добавь `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` в `.env`

## Деплой

### Vercel (текущий прод)

`vercel.json` уже настроен, `.github/workflows/deploy.yml` собирает и деплоит.
Нужен один секрет репозитория — `VERCEL_TOKEN` (Settings → Secrets and variables
→ Actions). Опционально `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`: без них
история и лидерборд живут в localStorage.

Деплой идёт на каждый push в `main` либо вручную из вкладки Actions.

**Multiplayer на Vercel недоступен.** Режиму нужен постоянный WebSocket-сервер из
`server.ts` с комнатами в памяти, а serverless-функции не держат сокет открытым и
не делят память между инстансами. Поэтому `VITE_ENABLE_MULTIPLAYER` не выставлен
и режим скрыт — вместо зависающего лобби. Остальные режимы полностью клиентские
и работают. `/api/math-fact` вынесен в serverless-функцию `api/math-fact.ts`.

### Хост с постоянным процессом (Railway, Render, Fly.io)

Там работает всё, включая Multiplayer: `server.ts` раздаёт `dist` и держит WebSocket.
Конфиги `railway.json` и `nixpacks.toml` лежат в репозитории. Не забудь выставить
`VITE_ENABLE_MULTIPLAYER=true` на этапе сборки, иначе режим останется скрытым.

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev-сервера с hot reload |
| `npm run build` | Сборка для production |
| `npm run start` | Запуск production-сервера |
| `npm run preview` | Превью production-сборки |
| `npm run lint` | Проверка TypeScript |

## Структура проекта

```
├── App.tsx           # Основной компонент, логика игры
├── components/       # GameCard, NeonButton
├── lib/              # data.ts, supabase.ts, problemUtils.ts
├── services/         # (пусто)
├── constants.ts      # Уровни, факты, подсказки
├── types.ts          # Типы
├── server.ts         # Express + WebSocket
├── supabase/         # Миграции SQL
└── public/           # Иконки, manifest
```

## Уровни сложности

| Режим | maxNumber (Level 10) | Умножение |
|-------|----------------------|-----------|
| Easy | до 120 | с Level 5 |
| Medium | до 160 | с Level 4 |
| Hard | до 200 | с Level 4, таблица ×12 |

## Лицензия

MIT
