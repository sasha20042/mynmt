# НМТ — Пробне тестування

Веб-застосунок для пробного проходження Національного мультипредметного тесту (НМТ). Питання, результати та фото — **Airtable** або localStorage.

## Технології

- **Next.js** (App Router)
- **Tailwind CSS**, **Lucide React**
- **Airtable** — питання, результати, фото до питань (таблиці Questions, Results, ImageStorage)
- Без Airtable — дані в браузері (localStorage) для локальної розробки

## Локальний запуск

```bash
npm install
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000). Без Airtable тести та результати зберігаються в localStorage.

---

## Підключення Airtable

Якщо використовуєш Airtable для питань і результатів:

1. У **.env.local** мають бути:
   - `AIRTABLE_API_KEY` — Personal Access Token ([airtable.com/create/tokens](https://airtable.com/create/tokens))
   - `AIRTABLE_BASE_ID` — **Base ID** з URL бази (частина **appXXXXXXXXXX**, не table id `tbl...`). Відкрий базу в Airtable — у рядку буде `https://airtable.com/appXXXXXXXXXX/...`
   - `NEXT_PUBLIC_USE_AIRTABLE=true`

2. Таблиці в базі:
   - **Questions** — Grade, Subject, SortOrder, **Type** (Single select: Multiple, **multiple_correct**, Matching, short_answer), Question, Options, CorrectIndex, **CorrectIndices** (JSON-масив індексів для типу «Декілька правильних», напр. `[0,2,4]`), Pairs, CorrectAnswer, Image, OptionImages, ImageScale, Weight. (Назву таблиці можна змінити через `AIRTABLE_QUESTIONS_TABLE` у .env.)
   - **Results** — Name, Invitation, Grade, Date, Subjects, AnswerDetails.
   - **ImageStorage** — для фото питань/відповідей: поля **Content** (Long text, base64) та **Type** (Single line text, напр. `image/png`). Макс. розмір зображення ~70 КБ.

3. **Токен Airtable** має мати доступ на читання та запис до всіх цих таблиць у базі (при створенні токена в [airtable.com/create/tokens](https://airtable.com/create/tokens) оберіть потрібну базу й права **data.records:read** та **data.records:write**).

4. Після перезапуску (`npm run dev`) застосунок читає/пише питання та результати через Airtable; фото зберігаються в таблиці ImageStorage і віддаються через `/api/image?id=...`. Якщо питання не зберігаються — у адмінці з’явиться текст помилки від Airtable (перевір назву таблиці та права токена).

---

## Деплой на Render

- Підключіть репозиторій GitHub.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- У **Environment** додайте ті самі змінні, що й у `.env.local` (Airtable: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `NEXT_PUBLIC_USE_AIRTABLE=true`).

Після деплою тести та результати зберігаються в Airtable; фото до питань — у таблиці ImageStorage.

---

## Функціонал

- **Головна** (`/`) — ПІБ, номер запрошення, клас (8, 9, 10, 11). Старт тесту (спочатку І блок).
- **Тест** — І блок: українська мова + математика (1 год); ІІ блок: історія + англійська (1 год). Таймер, навігація по питаннях, підтримка **фото до питання**.
- **Результати** (`/results`) — бали по всіх 4 предметах, збереження в Airtable або localStorage.
- **Результати вчителя** (`/admin-results`) — таблиця з фільтром за класом.
- **Внесення тестів** (`/admin`) — додавання/редагування питань по класу та предмету, **завантаження фото** (зберігаються в Airtable ImageStorage).

Питання з фото: в адмінці при створенні/редагуванні питання можна завантажити зображення — воно зберігається в Airtable і показується учням над текстом питання.
