# Deploy on Render

## Что уже подготовлено в проекте

- `requirements.txt` для Python-зависимостей
- `render.yaml` для автоматического создания web service и Postgres
- поддержка `DATABASE_URL` через переменные окружения
- поддержка `MEDIA_ROOT` для хранения загруженных изображений
- поддержка `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` через env-переменные

## Как задеплоить

1. Залей проект в GitHub-репозиторий.
2. Открой Render и выбери `New` -> `Blueprint`.
3. Подключи GitHub-репозиторий с этим проектом.
4. Render найдёт файл `render.yaml` и предложит создать:
   - web service `instan-app`
   - Postgres `instan-db`
5. Для переменной `ADMIN_PASSWORD` Render попросит ввести значение вручную.
6. Нажми `Apply`.

## Важно

- Команда запуска: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Фронтенд уже раздаётся этим же FastAPI приложением, отдельный frontend service не нужен.
- База данных на Render будет доступна через `DATABASE_URL`, она автоматически подставляется из `render.yaml`.

## Файлы и картинки

- Посты и аватары сохраняются в `MEDIA_ROOT`.
- В `render.yaml` это путь `/var/data/uploads`.
- На Render данные на диске сохраняются между деплоями только если подключён persistent disk.

## Ограничение Render

- По документации Render persistent disk доступен только для платных web service.
- Это значит:
  - если нужен только сайт и база, можно стартовать без постоянного хранения загруженных картинок
  - если нужны сохранённые аватары и фото постов после рестартов и деплоев, оставляй `starter` и диск

## Если хочешь без Blueprint

Можно создать всё вручную:

1. `New` -> `Postgres`
2. `New` -> `Web Service`
3. Указать:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Добавить env vars:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `MEDIA_ROOT=/var/data/uploads`
5. Добавить disk с mount path `/var/data`
