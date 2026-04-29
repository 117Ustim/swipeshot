# 🔗 Как обновить URL Privacy Policy в приложении

## Проблема

Ты нажимаешь на кнопку "Privacy Policy" в Settings, и видишь:
```
Посилання ще не задано
```

Это потому что в коде стоит временный URL.

---

## Решение

### Шаг 1: Опубликуй Privacy Policy на GitHub Pages

Следуй инструкции в файле `DEPLOYMENT.md`

После публикации ты получишь URL вида:
```
https://твой-username.github.io/название-репо/privacy-policy/
```

**Пример:**
```
https://ustymkovalchuk.github.io/swipeshot/privacy-policy/
```

### Шаг 2: Обнови URL в коде

Открой файл:
```
constants/privacy.ts
```

Замени:
```typescript
export const PRIVACY_POLICY_URL = 'https://example.com/privacy-policy';
```

На свой URL:
```typescript
export const PRIVACY_POLICY_URL = 'https://твой-username.github.io/swipeshot/privacy-policy/';
```

### Шаг 3: Перезапусти приложение

```bash
# Останови текущий процесс (Ctrl+C)
# Запусти заново
npm run ios
```

### Шаг 4: Проверь

1. Открой приложение
2. Зайди в Settings (⚙️)
3. Нажми "Privacy Policy"
4. Должен открыться браузер с твоей Privacy Policy

---

## ✅ Готово!

Теперь кнопка работает и открывает твою Privacy Policy.

---

## 🎯 Что дальше?

После того как URL работает, скажи:
```
Этап 1 завершен
URL: https://твой-url.github.io/...
```

И я перейду к **Этапу 2**: очистка кода и подготовка к релизу! 🚀
