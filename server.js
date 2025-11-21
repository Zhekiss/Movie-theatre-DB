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
        res.status(500).json({ error: 'Ошибка сервера при загрузке фильмов' });
    }
});

app.post('/api/films', async (req, res) => {
    try {
        const { film_title, duration_minutes, rating } = req.body;
        
        const sanitizedTitle = sanitizeInput(film_title);
        const sanitizedDuration = parseInt(duration_minutes);
        const sanitizedRating = parseFloat(rating);

        // Проверка на существующий фильм
        const existingFilm = await pool.query(
            'SELECT * FROM Films WHERE film_title = $1',
            [sanitizedTitle]
        );

        if (existingFilm.rows.length > 0) {
            return res.status(400).json({ 
                error: `Фильм "${sanitizedTitle}" уже существует в базе данных` 
            });
        }

        const result = await pool.query(
            'INSERT INTO Films (film_title, duration_minutes, rating) VALUES ($1, $2, $3) RETURNING *',
            [sanitizedTitle, sanitizedDuration, sanitizedRating]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // unique violation
            res.status(400).json({ error: `Фильм "${req.body.film_title}" уже существует` });
        } else {
            res.status(500).json({ error: 'Ошибка при добавлении фильма: ' + err.message });
        }
    }
});

app.put('/api/films/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { duration_minutes, rating } = req.body;
        
        const sanitizedDuration = parseInt(duration_minutes);
        const sanitizedRating = parseFloat(rating);

        const result = await pool.query(
            'UPDATE Films SET duration_minutes = $1, rating = $2 WHERE film_id = $3 RETURNING *',
            [sanitizedDuration, sanitizedRating, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Фильм не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при обновлении фильма: ' + err.message });
    }
});

app.delete('/api/films/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем существование фильма
        const filmCheck = await pool.query('SELECT * FROM Films WHERE film_id = $1', [id]);
        if (filmCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Фильм не найден' });
        }

        const result = await pool.query('DELETE FROM Films WHERE film_id = $1', [id]);
        
        res.json({ 
            message: 'Фильм и все связанные сеансы успешно удалены',
            deletedFilm: filmCheck.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении фильма: ' + err.message });
    }
});

// API routes для Halls
app.get('/api/halls', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Halls ORDER BY hall_id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера при загрузке залов' });
    }
});

app.post('/api/halls', async (req, res) => {
    try {
        const { hall_number, capacity } = req.body;
        
        const sanitizedNumber = parseInt(hall_number);
        const sanitizedCapacity = parseInt(capacity);

        // Проверка на существующий зал
        const existingHall = await pool.query(
            'SELECT * FROM Halls WHERE hall_number = $1',
            [sanitizedNumber]
        );

        if (existingHall.rows.length > 0) {
            return res.status(400).json({ 
                error: `Зал с номером ${sanitizedNumber} уже существует` 
            });
        }

        const result = await pool.query(
            'INSERT INTO Halls (hall_number, capacity) VALUES ($1, $2) RETURNING *',
            [sanitizedNumber, sanitizedCapacity]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // unique violation
            res.status(400).json({ error: `Зал с номером ${req.body.hall_number} уже существует` });
        } else {
            res.status(500).json({ error: 'Ошибка при добавлении зала: ' + err.message });
        }
    }
});

app.put('/api/halls/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hall_number, capacity } = req.body;
        
        const sanitizedNumber = parseInt(hall_number);
        const sanitizedCapacity = parseInt(capacity);

        // Проверка на дубликат номера зала (кроме текущего)
        const duplicateCheck = await pool.query(
            'SELECT * FROM Halls WHERE hall_number = $1 AND hall_id != $2',
            [sanitizedNumber, id]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: `Зал с номером ${sanitizedNumber} уже существует` 
            });
        }

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
        res.status(500).json({ error: 'Ошибка при обновлении зала: ' + err.message });
    }
});

app.delete('/api/halls/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем существование зала
        const hallCheck = await pool.query('SELECT * FROM Halls WHERE hall_id = $1', [id]);
        if (hallCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Зал не найден' });
        }

        // Проверяем, есть ли связанные сеансы
        const sessionsCheck = await pool.query(
            'SELECT * FROM Sessions WHERE hall_id = $1',
            [id]
        );

        if (sessionsCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Невозможно удалить зал, так как есть связанные сеансы. Сначала удалите все сеансы в этом зале.' 
            });
        }

        const result = await pool.query('DELETE FROM Halls WHERE hall_id = $1', [id]);
        
        res.json({ 
            message: 'Зал успешно удален',
            deletedHall: hallCheck.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении зала: ' + err.message });
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
        res.status(500).json({ error: 'Ошибка сервера при загрузке сеансов' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});