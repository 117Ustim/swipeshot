# 🚀 Инструкция по публикации Privacy Policy на GitHub Pages

## Вариант 1: GitHub Pages (Рекомендуется) ⭐

### Шаг 1: Создай репозиторий

1. Зайди на [github.com](https://github.com)
2. Нажми "New repository"
3. Название: `swipeshot` (или любое другое)
4. Сделай репозиторий **Public**
5. Нажми "Create repository"

### Шаг 2: Загрузи файлы

**Вариант A: Через веб-интерфейс GitHub**

1. В репозитории нажми "Add file" → "Upload files"
2. Перетащи файлы:
   - `privacy-policy-en.md`
   - `privacy-policy-ru.md`
   - `privacy-policy-uk.md`
3. Нажми "Commit changes"

**Вариант B: Через Git (если умеешь)**

```bash
cd /path/to/swipe_shot
git init
git add privacy-policy/
git commit -m "Add Privacy Policy"
git remote add origin https://github.com/твой-username/swipeshot.git
git push -u origin main
```

### Шаг 3: Включи GitHub Pages

1. В репозитории зайди в **Settings**
2. Слева найди **Pages**
3. В разделе "Source" выбери:
   - Branch: `main`
   - Folder: `/ (root)`
4. Нажми "Save"
5. Подожди 1-2 минуты

### Шаг 4: Получи URL

GitHub покажет URL:
```
https://твой-username.github.io/swipeshot/privacy-policy/privacy-policy-en.md
```

**Проблема:** GitHub Pages показывает Markdown как текст, а не HTML.

**Решение:** Нужно создать HTML версию.

---

## Вариант 2: Конвертация в HTML

### Способ 1: Онлайн конвертер

1. Открой [markdowntohtml.com](https://markdowntohtml.com/)
2. Скопируй содержимое `privacy-policy-en.md`
3. Вставь в конвертер
4. Скачай HTML файл
5. Переименуй в `index.html`
6. Загрузи в репозиторий

Твой URL станет:
```
https://твой-username.github.io/swipeshot/privacy-policy/
```

### Способ 2: Я создам HTML (следующий этап)

Я могу создать готовый HTML файл с:
- Красивым дизайном
- Переключателем языков [EN] [RU] [UK]
- Адаптивной версткой для мобильных

---

## Вариант 3: Notion (Альтернатива)

Если не хочешь возиться с GitHub:

1. Создай страницу в [Notion](https://notion.so)
2. Скопируй текст Privacy Policy
3. Нажми "Share" → "Publish to web"
4. Скопируй публичный URL

**Минусы:**
- URL будет длинным (notion.site/...)
- Менее профессионально выглядит

---

## Вариант 4: Свой домен (Профессионально)

Если у тебя есть домен (например, `swipeshot.app`):

1. Создай файл `privacy-policy.html`
2. Загрузи на хостинг
3. URL будет: `https://swipeshot.app/privacy-policy`

**Плюсы:**
- Профессионально
- Короткий URL
- Полный контроль

**Минусы:**
- Нужен домен ($10-15/год)
- Нужен хостинг (или GitHub Pages с custom domain)

---

## 🎯 Рекомендация

**Для быстрого старта:**
→ **GitHub Pages** (бесплатно, просто, надежно)

**Для профессионального вида:**
→ **Свой домен** (если планируешь развивать приложение)

---

## ❓ Что дальше?

После публикации:

1. **Скопируй URL** Privacy Policy
2. **Добавь в App Store Connect** (Privacy URL field)
3. **Добавь в приложение** (Settings → Privacy Policy button)

Я помогу с шагами 2 и 3 на следующих этапах! 🚀
