# Test_Task

### 1. Клонирование репозитория

```bash
git clone 
cd testTask
```

### 2. Установка зависимостей

```bash
pnpm install
```

### 3. Настройка окружения

Создайте файл `.env` в корне проекта (или скопируйте из `.env.example`):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=testuser
DB_PASSWORD=testpassword
DB_NAME=testdb

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
```

**Важно:** В production обязательно измените `JWT_SECRET` и `JWT_REFRESH_SECRET` на безопасные значения!

### 4. Запуск MySQL контейнера

```bash
docker-compose up -d
```

```bash
docker-compose ps
```

### 5. Генерация и применение миграций

```bash

pnpm db:generate


pnpm db:migrate
```

### 6. Запуск приложения

```bash
pnpm dev
```
or 

```bash

pnpm build

pnpm start
```

Сервер будет доступен по адресу: `http://localhost:3000`
