# ✅ Чеклист релиза SwipeShot в App Store

## 📋 Этап 1: Подготовка кода ✅ ЗАВЕРШЕН

- [x] Privacy Policy создана (3 языка)
- [x] Privacy Policy опубликована на GitHub Pages
- [x] Privacy Policy URL добавлен в приложение
- [x] Кнопка Privacy Policy работает
- [x] Все console.log удалены
- [x] TypeScript компилируется без ошибок
- [x] Иконка приложения обновлена
- [x] Splash screen обновлен
- [x] Код сохранен в Git

---

## 📋 Этап 2: Метаданные ✅ ЗАВЕРШЕН

- [x] Описание приложения написано (EN, RU, UK)
- [x] Ключевые слова подобраны
- [x] Категория выбрана (Utilities)
- [x] Возрастной рейтинг определен (4+)
- [x] Privacy Policy URL готов

---

## 📋 Этап 3: Скриншоты (СЛЕДУЮЩИЙ)

### Что нужно сделать:

1. **Запусти приложение на симуляторе:**
   ```bash
   npm run ios
   ```

2. **Сделай скриншоты:**
   - Главный экран (список годов/месяцев)
   - Экран свайпа с карточкой
   - Экран подтверждения удаления
   - Экран настроек

3. **Размеры для App Store:**
   - iPhone 6.7": 1290 x 2796 px (обязательно)
   - iPhone 6.5": 1242 x 2688 px (обязательно)

4. **Как сделать скриншот:**
   - Cmd+S в симуляторе
   - Или: Simulator → File → Save Screen

---

## 📋 Этап 4: Apple Developer Account

### Что нужно:

1. **Зарегистрироваться:**
   - Зайди на [developer.apple.com](https://developer.apple.com)
   - Нажми "Account"
   - Зарегистрируйся ($99/год)

2. **Подтвердить email**

3. **Оплатить** ($99)

4. **Подождать** активации (1-2 дня)

---

## 📋 Этап 5: App Store Connect

### После активации аккаунта:

1. **Зайди на** [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

2. **Создай новое приложение:**
   - My Apps → + → New App
   - Platform: iOS
   - Name: SwipeShot
   - Primary Language: English
   - Bundle ID: создай новый (например: com.ustym.swipeshot)
   - SKU: swipeshot-001

3. **Заполни метаданные:**
   - Используй файл `APP_STORE_METADATA.md`
   - Скопируй описание, ключевые слова
   - Загрузи скриншоты
   - Загрузи иконку 1024x1024

---

## 📋 Этап 6: Сборка приложения

### Вариант A: EAS Build (Рекомендуется)

1. **Установи EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Войди в Expo:**
   ```bash
   eas login
   ```

3. **Настрой проект:**
   ```bash
   eas build:configure
   ```

4. **Создай сборку для iOS:**
   ```bash
   eas build --platform ios --profile production
   ```

5. **Подожди** (15-30 минут)

6. **Скачай .ipa файл**

7. **Загрузи в App Store Connect:**
   ```bash
   eas submit --platform ios
   ```

### Вариант B: Xcode (Если есть Mac)

1. **Сгенерируй нативный проект:**
   ```bash
   npx expo prebuild
   ```

2. **Открой в Xcode:**
   ```bash
   open ios/swipeshot.xcworkspace
   ```

3. **Настрой Signing:**
   - Выбери свой Team
   - Проверь Bundle ID

4. **Создай архив:**
   - Product → Archive

5. **Загрузи в App Store:**
   - Distribute App → App Store Connect

---

## 📋 Этап 7: Отправка на проверку

### В App Store Connect:

1. **Выбери сборку:**
   - App Store → iOS App → Build
   - Выбери загруженную сборку

2. **Заполни все поля:**
   - Screenshots ✓
   - Description ✓
   - Keywords ✓
   - Support URL ✓
   - Privacy Policy URL ✓

3. **Export Compliance:**
   - "Does your app use encryption?" → NO
   - (SwipeShot не использует шифрование)

4. **Content Rights:**
   - "Does your app contain third-party content?" → NO

5. **Advertising Identifier:**
   - "Does your app use the Advertising Identifier?" → NO

6. **Нажми "Submit for Review"**

---

## 📋 Этап 8: Ожидание проверки

### Что происходит:

1. **Waiting for Review** (1-24 часа)
2. **In Review** (24-48 часов)
3. **Approved** или **Rejected**

### Если Approved:

- ✅ Приложение появится в App Store через 1-2 часа
- ✅ Получишь email от Apple
- ✅ Можешь праздновать! 🎉

### Если Rejected:

- ❌ Получишь email с причиной
- 📝 Исправь проблему
- 🔄 Отправь заново

---

## 📋 Частые причины отклонения

1. **Incomplete Information**
   - Не заполнены все поля
   - Нет скриншотов
   - Нет Privacy Policy

2. **Crashes**
   - Приложение крашится при запуске
   - Не работают основные функции

3. **Privacy Issues**
   - Нет описания разрешений
   - Privacy Policy недоступна

4. **Guideline Violations**
   - Приложение не делает то, что обещает
   - Слишком простое

---

## 🎯 Текущий статус

### ✅ Готово:
- Код очищен
- Privacy Policy опубликована
- Метаданные подготовлены
- Приложение работает

### 🔄 В процессе:
- Скриншоты (нужно сделать)
- Apple Developer Account (нужно зарегистрироваться)

### ⏳ Ожидает:
- Сборка приложения
- Загрузка в App Store Connect
- Отправка на проверку

---

## 📞 Нужна помощь?

Скажи на каком этапе застрял:
- "Как сделать скриншоты?"
- "Как зарегистрироваться в Apple Developer?"
- "Как собрать приложение?"
- "Как загрузить в App Store?"

Я помогу! 🚀
