# НМТ — Пробне тестування

Веб-застосунок для пробного проходження Національного мультипредметного тесту (НМТ). Підтримка **Supabase** (тести, результати, фото до питань) та деплой на **Render**.

## Технології

- **Next.js** (App Router)
- **Tailwind CSS**, **Lucide React**
- **Supabase** — база даних (питання, результати) та Storage (фото до питань)
- Без Supabase — дані в браузері (localStorage) для локальної розробки

## Локальний запуск

```bash
npm install
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000). Без змінних Supabase тести та результати зберігаються в localStorage.

---

## Деплой на Render + підключення Supabase

### 1. Supabase

1. Створіть проєкт на [supabase.com](https://supabase.com).
2. **SQL Editor** → New query → вставте вміст файлу **`supabase/schema.sql`** → Run.
3. **Storage** → New bucket → назва **`question-images`**, увімкніть **Public bucket** (щоб посилання на фото відкривалися).
4. **Project Settings** → API — скопіюйте **Project URL** та **anon public** key.

### 2. Змінні середовища на Render

У вашому Web Service на Render додайте **Environment**:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ваш-проєкт.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ваш anon key |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `question-images` |

(Для локальної розробки з Supabase скопіюйте `.env.local.example` у `.env.local` і заповніть значення.)

### 3. Render

- Підключіть репозиторій GitHub.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Root directory: залиште порожнім, якщо проєкт в корені репо.

Після деплою тести та результати зберігаються в Supabase; фото до питань — у Storage.

---

## Функціонал

- **Головна** (`/`) — ПІБ, номер запрошення, клас (8, 9, 10–11). Старт тесту (спочатку І блок).
- **Тест** — І блок: українська мова + математика (1 год); ІІ блок: історія + англійська (1 год). Таймер, навігація по питаннях, підтримка **фото до питання**.
- **Результати** (`/results`) — бали по всіх 4 предметах, збереження в Supabase або localStorage.
- **Результати вчителя** (`/admin-results`) — таблиця з фільтром за класом.
- **Внесення тестів** (`/admin`) — додавання/редагування питань по класу та предмету, **завантаження фото** (при підключеному Supabase).

Питання з фото: в адмінці при створенні/редагуванні питання можна завантажити зображення — воно зберігається в Supabase Storage і показується учням над текстом питання.
