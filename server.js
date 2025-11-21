const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

// Вспомогательная функция для защиты от SQL-инъекций
function sanitizeInput(input) {
    if (typeof input === 'string') {
        return input.replace(/[;'"\\]/g, '');
    }
    return input;
}

// API routes для Films
app.get('/api/films', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Films ORDER BY film_id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/films', async (req, res) => {
    try {
        const { film_title, duration_minutes, rating } = req.body;
        
        const sanitizedTitle = sanitizeInput(film_title);
        const sanitizedDuration = parseInt(duration_minutes);
        const sanitizedRating = parseFloat(rating);

        const result = await pool.query(
            'INSERT INTO Films (film_title, duration_minutes, rating) VALUES ($1, $2, $3) RETURNING *',
            [sanitizedTitle, sanitizedDuration, sanitizedRating]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при добавлении фильма' });
    }
});

app.put('/api/films/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { film_title, duration_minutes, rating } = req.body;
        
        const sanitizedTitle = sanitizeInput(film_title);
        const sanitizedDuration = parseInt(duration_minutes);
        const sanitizedRating = parseFloat(rating);

        const result = await pool.query(
            'UPDATE Films SET film_title = $1, duration_minutes = $2, rating = $3 WHERE film_id = $4 RETURNING *',
            [sanitizedTitle, sanitizedDuration, sanitizedRating, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Фильм не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при обновлении фильма' });
    }
});

app.delete('/api/films/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM Films WHERE film_id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Фильм не найден' });
        }
        
        res.json({ message: 'Фильм удален' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении фильма' });
    }
});

// API routes для Halls
app.get('/api/halls', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Halls ORDER BY hall_id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/halls', async (req, res) => {
    try {
        const { hall_number, capacity } = req.body;
        
        const sanitizedNumber = parseInt(hall_number);
        const sanitizedCapacity = parseInt(capacity);

        const result = await pool.query(
            'INSERT INTO Halls (hall_number, capacity) VALUES ($1, $2) RETURNING *',
            [sanitizedNumber, sanitizedCapacity]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при добавлении зала' });
    }
});

app.put('/api/halls/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hall_number, capacity } = req.body;
        
        const sanitizedNumber = parseInt(hall_number);
        const sanitizedCapacity = parseInt(capacity);

        const result = await pool.query(
            'UPDATE Halls SET hall_number = $1, capacity = $2 WHERE hall_id = $3 RETURNING *',
            [sanitizedNumber, sanitizedCapacity, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Зал не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при обновлении зала' });
    }
});

app.delete('/api/halls/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM Halls WHERE hall_id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Зал не найден' });
        }
        
        res.json({ message: 'Зал удален' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении зала' });
    }
});

// API routes для Sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, f.film_title, h.hall_number 
            FROM Sessions s 
            JOIN Films f ON s.film_id = f.film_id 
            JOIN Halls h ON s.hall_id = h.hall_id 
            ORDER BY s.session_id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});