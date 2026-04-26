# Supabase Setup

В проекте уже есть SQL-дамп для переноса данных: `render_dump.sql`.

## Что использовать

- Для Supabase используй `render_dump.sql`.
- `instan_fixed.sql` лучше не импортировать: в нём есть `OWNER TO postgres`, это часто ломает восстановление в управляемой БД.
- Файл `render_dump.dump` нужен только если будешь восстанавливать через `pg_restore`. Для Supabase проще SQL-файл.

## Строка подключения

В `database.py` приложение читает `DATABASE_URL`.

Для Supabase укажи `DATABASE_URL` в таком виде:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:6543/postgres?sslmode=require
```

Замечания:

- Для внешнего приложения лучше брать `Connection pooling` строку из Supabase.
- Если Supabase показывает порт `6543`, это pooler, он обычно удобнее для деплоя.
- Если строка вдруг начинается с `postgres://`, приложение теперь тоже её примет.
- Для хоста `*.supabase.com` приложение автоматически добавит `sslmode=require`, если ты его не указал.

## Как залить дамп в Supabase

### Вариант 1: через SQL Editor

Подходит, если дамп небольшой.

1. Открой Supabase project.
2. Перейди в `SQL Editor`.
3. Открой `render_dump.sql`.
4. Выполни содержимое файла частями, если редактор не принимает весь файл сразу.

### Вариант 2: через psql

Если установлен PostgreSQL client, выполни:

```powershell
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:6543/postgres?sslmode=require" -f .\render_dump.sql
```

Если Supabase выдал прямой хост вместо pooler, подставь его URL из панели проекта.

## Что важно после импорта

- При старте приложение вызывает `init_db()`, поэтому недостающие таблицы и колонки оно дозаполнит само.
- Медиафайлы в БД не лежат. Картинки из `frontend/uploads` в Supabase этим SQL не перенесутся.
- Если сайт будет крутиться не локально, для картинок нужно отдельно решить хранение файлов: оставить локальный диск хостинга или вынести файлы в object storage.

## Что поставить в хостинге

Для backend-хостинга достаточно задать env-переменные:

```env
DATABASE_URL=...
JWT_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
MEDIA_ROOT=/var/data/uploads
```

## Быстрая проверка

После запуска backend проверь:

1. открывается `/`
2. работает регистрация и логин
3. видны старые пользователи и посты
4. загружаются картинки, если файлы тоже перенесены
