# 🚀 Интеграция Strapi для Halty

В этой папке подготовлены все схемы данных (Content-Types) и кастомные расширения для Strapi v4/v5.

## Быстрый запуск Strapi:

1. Создайте проект Strapi:
```bash
npx create-strapi-app@latest strapi-halty --quickstart
```

2. Скопируйте схемы коллекций:
- `content-types/vacancy/` -> в `strapi-halty/src/api/vacancy/content-types/vacancy/`
- `content-types/application/` -> в `strapi-halty/src/api/application/content-types/application/`

3. Настройте гео-поиск:
- Скопируйте `extensions/spatial-controller.js` в контроллер вакансий `src/api/vacancy/controllers/vacancy.js`.

4. Настройте WebSockets (для живого чата и мгновенных статусов):
- Вставьте код из `extensions/websocket-bootstrap.js` в `src/index.js`.

5. Включите Strapi в приложении Halty:
В файле `.env`:
```env
VITE_STRAPI_URL=http://localhost:1337
VITE_USE_STRAPI=true
```
