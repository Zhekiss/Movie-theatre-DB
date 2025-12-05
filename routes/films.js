const express = require('express');

function filmsRoutes(pool) {
    const router = express.Router();

    function sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.replace(/[;'"\\]/g, '');
        }
        return input;
    }

    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM Films ORDER BY film_id');
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера при загрузке фильмов' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { film_title, duration_minutes, rating } = req.body;
            
            const sanitizedTitle = sanitizeInput(film_title);
            const sanitizedDuration = parseInt(duration_minutes);
            const sanitizedRating = parseFloat(rating);

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
            if (err.code === '23505') {
                res.status(400).json({ error: `Фильм "${req.body.film_title}" уже существует` });
            } else {
                res.status(500).json({ error: 'Ошибка при добавлении фильма: ' + err.message });
            }
        }
    });

    router.put('/:id', async (req, res) => {
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

    router.delete('/:id', async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { id } = req.params;
            
            const filmCheck = await client.query('SELECT * FROM Films WHERE film_id = $1', [id]);
            if (filmCheck.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Фильм не найден' });
            }

            const sessionsCheck = await client.query(
                'SELECT * FROM Sessions WHERE film_id = $1',
                [id]
            );

            let totalTicketsDeleted = 0;
            for (const session of sessionsCheck.rows) {
                const ticketsResult = await client.query(
                    'DELETE FROM Tickets WHERE session_id = $1',
                    [session.session_id]
                );
                totalTicketsDeleted += ticketsResult.rowCount;
            }

            const sessionsDeleted = await client.query(
                'DELETE FROM Sessions WHERE film_id = $1',
                [id]
            );

            const result = await client.query('DELETE FROM Films WHERE film_id = $1', [id]);
            
            await client.query('COMMIT');
            
            res.json({ 
                message: `Фильм успешно удален. Также удалено ${sessionsDeleted.rowCount} сеансов и ${totalTicketsDeleted} билетов, связанных с этим фильмом.`,
                deletedFilm: filmCheck.rows[0],
                deletedSessionsCount: sessionsDeleted.rowCount,
                deletedTicketsCount: totalTicketsDeleted
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: 'Ошибка при удалении фильма: ' + err.message });
        } finally {
            client.release();
        }
    });

    router.get('/revenue', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                f.film_id,
                f.film_title,
                COALESCE(SUM(s.price * occupied_tickets.ticket_count), 0) AS revenue
            FROM Films f
            LEFT JOIN Sessions s ON f.film_id = s.film_id
            LEFT JOIN (
                SELECT 
                    session_id,
                    COUNT(*) AS ticket_count
                FROM Tickets 
                WHERE is_occupied = true
                GROUP BY session_id
            ) AS occupied_tickets ON s.session_id = occupied_tickets.session_id
            GROUP BY f.film_id, f.film_title
            ORDER BY revenue DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при расчете дохода фильмов: ' + err.message });
    }
});

    return router;
}

module.exports = filmsRoutes;