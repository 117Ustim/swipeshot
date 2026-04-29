# Requirements Document

## Introduction

SwipeShot — это мобильное приложение для iOS и Android, которое помогает пользователям быстро очистить галерею от ненужных фотографий и видео с помощью интуитивного swipe-интерфейса в стиле Tinder. Приложение группирует медиафайлы по месяцам, позволяет сортировать их жестами и безопасно удаляет выбранные файлы после подтверждения.

## Glossary

- **SwipeShot_App**: Мобильное приложение для управления галереей фотографий
- **Gallery_Service**: Сервис для загрузки и группировки медиафайлов из галереи устройства
- **Swipe_Handler**: Компонент обработки жестов свайпа (влево/вправо/вверх)
- **Media_Item**: Фотография или видео из галереи пользователя
- **Monthly_Session**: Сессия просмотра фотографий за один месяц
- **Deletion_Queue**: Список медиафайлов, помеченных к удалению
- **Favorites_Collection**: Коллекция избранных медиафайлов
- **Safe_Items**: Медиафайлы, помеченные как безопасные (оставить)
- **Screenshot_Filter**: Фильтр для идентификации скриншотов
- **Large_Video_Filter**: Фильтр для идентификации больших видеофайлов
- **Confirmation_Screen**: Экран подтверждения удаления файлов
- **Card_Animation**: Анимация карточки при свайпе

## Requirements

### Requirement 1: Доступ к галерее устройства

**User Story:** Как пользователь, я хочу, чтобы приложение получило доступ к моей галерее, чтобы я мог управлять своими фотографиями

#### Acceptance Criteria

1. WHEN SwipeShot_App запускается впервые, THE SwipeShot_App SHALL запросить разрешение на доступ к медиабиблиотеке устройства
2. IF пользователь отклоняет разрешение, THEN THE SwipeShot_App SHALL отобразить экран с объяснением необходимости доступа и кнопкой перехода в настройки
3. WHEN разрешение предоставлено, THE Gallery_Service SHALL загрузить все фотографии и видео из галереи устройства
4. THE Gallery_Service SHALL сгруппировать Media_Item по месяцам в хронологическом порядке (от новых к старым)

### Requirement 2: Swipe-интерфейс для сортировки фотографий

**User Story:** Как пользователь, я хочу сортировать фотографии жестами свайпа, чтобы быстро принимать решения о каждом файле

#### Acceptance Criteria

1. WHEN пользователь свайпает карточку вправо, THE Swipe_Handler SHALL пометить Media_Item как Safe_Items
2. WHEN пользователь свайпает карточку влево, THE Swipe_Handler SHALL добавить Media_Item в Deletion_Queue
3. WHEN пользователь свайпает карточку вверх, THE Swipe_Handler SHALL добавить Media_Item в Favorites_Collection
4. THE Card_Animation SHALL выполняться со скоростью не менее 60 кадров в секунду
5. WHEN свайп завершен, THE SwipeShot_App SHALL отобразить следующий Media_Item из текущего Monthly_Session

### Requirement 3: Плавные анимации карточек

**User Story:** Как пользователь, я хочу видеть плавные анимации при свайпе, чтобы интерфейс был приятным в использовании

#### Acceptance Criteria

1. WHILE пользователь перетаскивает карточку, THE Card_Animation SHALL отображать поворот и смещение карточки в реальном времени
2. WHEN пользователь отпускает карточку без завершения свайпа, THE Card_Animation SHALL вернуть карточку в исходное положение с пружинной анимацией
3. WHEN свайп завершен, THE Card_Animation SHALL анимировать исчезновение карточки в направлении свайпа
4. THE Card_Animation SHALL использовать нативный драйвер анимации для достижения 60fps
5. WHILE карточка анимируется, THE SwipeShot_App SHALL предзагрузить следующий Media_Item

### Requirement 4: Организация по месяцам

**User Story:** Как пользователь, я хочу просматривать фотографии по месяцам, чтобы систематически очистить всю галерею

#### Acceptance Criteria

1. THE Gallery_Service SHALL создать отдельный Monthly_Session для каждого месяца с фотографиями
2. WHEN пользователь открывает приложение, THE SwipeShot_App SHALL отобразить список доступных Monthly_Session с количеством фотографий в каждом
3. WHEN пользователь выбирает Monthly_Session, THE SwipeShot_App SHALL загрузить все Media_Item этого месяца
4. WHEN все Media_Item в Monthly_Session просмотрены, THE SwipeShot_App SHALL автоматически перейти к Confirmation_Screen

### Requirement 5: Экран подтверждения удаления

**User Story:** Как пользователь, я хочу видеть список файлов перед удалением и подтвердить действие, чтобы случайно не удалить важные фотографии

#### Acceptance Criteria

1. WHEN Monthly_Session завершена, THE SwipeShot_App SHALL отобразить Confirmation_Screen со списком всех Media_Item из Deletion_Queue
2. THE Confirmation_Screen SHALL отображать превью каждого Media_Item в Deletion_Queue
3. WHEN пользователь нажимает кнопку подтверждения, THE SwipeShot_App SHALL удалить все Media_Item из Deletion_Queue из галереи устройства
4. WHEN пользователь нажимает кнопку отмены, THE SwipeShot_App SHALL вернуться к списку Monthly_Session без удаления файлов
5. THE Confirmation_Screen SHALL отображать общее количество файлов к удалению и освобождаемое место на диске

### Requirement 6: Умная фильтрация скриншотов

**User Story:** Как пользователь, я хочу, чтобы приложение помогало мне находить скриншоты, чтобы быстрее очистить галерею от временных файлов

#### Acceptance Criteria

1. THE Screenshot_Filter SHALL анализировать метаданные Media_Item для определения скриншотов
2. WHEN Media_Item идентифицирован как скриншот, THE SwipeShot_App SHALL отобразить визуальный индикатор на карточке
3. WHERE пользователь активирует режим "Только скриншоты", THE SwipeShot_App SHALL отображать только Media_Item, идентифицированные как скриншоты
4. THE Screenshot_Filter SHALL использовать имя файла, путь к файлу и размеры изображения для идентификации

### Requirement 7: Фильтрация больших видео

**User Story:** Как пользователь, я хочу быстро находить большие видеофайлы, чтобы освободить место на устройстве

#### Acceptance Criteria

1. THE Large_Video_Filter SHALL идентифицировать видеофайлы размером более 50 МБ
2. WHEN Media_Item идентифицирован как большое видео, THE SwipeShot_App SHALL отобразить размер файла на карточке
3. WHERE пользователь активирует режим "Большие видео", THE SwipeShot_App SHALL отображать только видео размером более 50 МБ
4. THE SwipeShot_App SHALL отображать общий размер всех больших видео в текущем Monthly_Session

### Requirement 8: Dark Mode интерфейс

**User Story:** Как пользователь, я хочу использовать темную тему, чтобы комфортно работать с приложением в любое время суток

#### Acceptance Criteria

1. THE SwipeShot_App SHALL использовать темную цветовую схему по умолчанию
2. THE SwipeShot_App SHALL использовать контрастные цвета для текста и элементов управления
3. THE SwipeShot_App SHALL использовать мягкие тени и градиенты для создания глубины интерфейса
4. THE SwipeShot_App SHALL соответствовать системным настройкам темной темы iOS и Android

### Requirement 9: Управление избранным

**User Story:** Как пользователь, я хочу сохранять избранные фотографии в отдельную коллекцию, чтобы быстро находить важные снимки

#### Acceptance Criteria

1. WHEN Media_Item добавлен в Favorites_Collection, THE SwipeShot_App SHALL создать альбом "SwipeShot Favorites" в галерее устройства (если не существует)
2. THE SwipeShot_App SHALL добавить Media_Item в альбом "SwipeShot Favorites"
3. THE SwipeShot_App SHALL отобразить экран со всеми Media_Item из Favorites_Collection
4. WHEN пользователь открывает экран избранного, THE SwipeShot_App SHALL отобразить все Media_Item, добавленные в Favorites_Collection

### Requirement 10: Навигация и роутинг

**User Story:** Как пользователь, я хочу легко перемещаться между экранами приложения, чтобы эффективно управлять галереей

#### Acceptance Criteria

1. THE SwipeShot_App SHALL использовать Expo Router для навигации между экранами
2. THE SwipeShot_App SHALL иметь следующие основные экраны: главный экран со списком месяцев, экран свайпа, экран подтверждения удаления, экран избранного
3. WHEN пользователь нажимает кнопку "Назад", THE SwipeShot_App SHALL сохранить прогресс текущего Monthly_Session
4. THE SwipeShot_App SHALL отображать индикатор прогресса для текущего Monthly_Session

### Requirement 11: Управление состоянием приложения

**User Story:** Как пользователь, я хочу, чтобы приложение сохраняло мой прогресс, чтобы продолжить работу после закрытия приложения

#### Acceptance Criteria

1. THE SwipeShot_App SHALL использовать Zustand для управления глобальным состоянием
2. WHEN пользователь закрывает приложение, THE SwipeShot_App SHALL сохранить состояние Deletion_Queue и Favorites_Collection
3. WHEN пользователь открывает приложение, THE SwipeShot_App SHALL восстановить сохраненное состояние
4. THE SwipeShot_App SHALL сохранять позицию пользователя в текущем Monthly_Session

### Requirement 12: Обработка ошибок

**User Story:** Как пользователь, я хочу получать понятные сообщения об ошибках, чтобы понимать, что пошло не так

#### Acceptance Criteria

1. IF Gallery_Service не может загрузить медиафайлы, THEN THE SwipeShot_App SHALL отобразить сообщение об ошибке с предложением повторить попытку
2. IF удаление Media_Item не удалось, THEN THE SwipeShot_App SHALL отобразить сообщение об ошибке и исключить файл из Deletion_Queue
3. IF приложение теряет доступ к галерее, THEN THE SwipeShot_App SHALL отобразить экран с просьбой предоставить разрешение
4. THE SwipeShot_App SHALL логировать все ошибки для отладки

### Requirement 13: Производительность и оптимизация

**User Story:** Как пользователь, я хочу, чтобы приложение работало быстро и плавно, чтобы эффективно обрабатывать большое количество фотографий

#### Acceptance Criteria

1. THE SwipeShot_App SHALL загружать превью Media_Item с оптимизированным разрешением для экономии памяти
2. THE SwipeShot_App SHALL предзагружать следующие 3 Media_Item в Monthly_Session
3. THE SwipeShot_App SHALL использовать виртуализацию списков для отображения большого количества Monthly_Session
4. THE Card_Animation SHALL использовать react-native-reanimated для нативной производительности
5. THE SwipeShot_App SHALL освобождать память от просмотренных Media_Item

### Requirement 14: Privacy Policy

**User Story:** Как пользователь, я хочу иметь доступ к Privacy Policy внутри приложения, чтобы понимать, как обрабатываются мои данные

#### Acceptance Criteria

1. THE SwipeShot_App SHALL содержать пункт "Privacy Policy", доступный из основного интерфейса
2. WHEN пользователь нажимает "Privacy Policy", THE SwipeShot_App SHALL открыть внешний URL политики конфиденциальности
3. IF Privacy Policy URL не задан, THEN THE SwipeShot_App SHALL показать понятное сообщение и не вызывать ошибку
