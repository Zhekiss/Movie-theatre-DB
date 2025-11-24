const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Импортируем маршруты
const filmsRoutes = require('./routes/films');
const hallsRoutes = require('./routes/halls');
const sessionsRoutes = require('./routes/sessions');
const ticketsRoutes = require('./routes/tickets');

const app = express();
const port = 3000;

// Middleware для безопасности
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));

// Лимит запросов
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Подключение к PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'cinema_db',
    password: '1234',
    port: 5432,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Подключаем маршруты
app.use('/api/films', filmsRoutes(pool));
app.use('/api/halls', hallsRoutes(pool));
app.use('/api/sessions', sessionsRoutes(pool));
app.use('/api/tickets', ticketsRoutes(pool));

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});