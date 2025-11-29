const express = require('express');

function sessionsRoutes(pool) {
    const router = express.Router();

    function sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.replace(/[;'"\\]/g, '');
        }
        return input;
    }

    router.get('/', async (req, res) => {
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

    router.post('/', async (req, res) => {
        try {
            const { film_id, hall_id, start_time, price } = req.body;
            
            const sanitizedFilmId = parseInt(film_id);
            const sanitizedHallId = parseInt(hall_id);
            const sanitizedPrice = parseFloat(price);

            const filmCheck = await pool.query('SELECT * FROM Films WHERE film_id = $1', [sanitizedFilmId]);
            const hallCheck = await pool.query('SELECT * FROM Halls WHERE hall_id = $1', [sanitizedHallId]);

            if (filmCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный фильм не существует' });
            }

            if (hallCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный зал не существует' });
            }

            const timeConflictCheck = await pool.query(
                `SELECT * FROM Sessions 
                 WHERE hall_id = $1 
                 AND start_time <= $2::timestamp + INTERVAL '30 minutes'
                 AND $2::timestamp <= start_time + INTERVAL '30 minutes'`,
                [sanitizedHallId, start_time]
            );

            if (timeConflictCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Время сеанса пересекается с другим сеансом в этом зале. Минимальный интервал - 30 минут.' 
                });
            }

            const result = await pool.query(
                'INSERT INTO Sessions (film_id, hall_id, start_time, price) VALUES ($1, $2, $3, $4) RETURNING *',
                [sanitizedFilmId, sanitizedHallId, start_time, sanitizedPrice]
            );

            const fullSession = await pool.query(`
                SELECT s.*, f.film_title, h.hall_number 
                FROM Sessions s 
                JOIN Films f ON s.film_id = f.film_id 
                JOIN Halls h ON s.hall_id = h.hall_id 
                WHERE s.session_id = $1
            `, [result.rows[0].session_id]);

            res.json(fullSession.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при добавлении сеанса: ' + err.message });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { film_id, hall_id, start_time, price } = req.body;
            
            const sanitizedFilmId = parseInt(film_id);
            const sanitizedHallId = parseInt(hall_id);
            const sanitizedPrice = parseFloat(price);

            const filmCheck = await pool.query('SELECT * FROM Films WHERE film_id = $1', [sanitizedFilmId]);
            const hallCheck = await pool.query('SELECT * FROM Halls WHERE hall_id = $1', [sanitizedHallId]);

            if (filmCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный фильм не существует' });
            }

            if (hallCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный зал не существует' });
            }

            const timeConflictCheck = await pool.query(
                `SELECT * FROM Sessions 
                 WHERE hall_id = $1 
                 AND session_id != $2
                 AND start_time <= $3::timestamp + INTERVAL '30 minutes'
                 AND $3::timestamp <= start_time + INTERVAL '30 minutes'`,
                [sanitizedHallId, id, start_time]
            );

            if (timeConflictCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Время сеанса пересекается с другим сеансом в этом зале. Минимальный интервал - 30 минут.' 
                });
            }

            const result = await pool.query(
                'UPDATE Sessions SET film_id = $1, hall_id = $2, start_time = $3, price = $4 WHERE session_id = $5 RETURNING *',
                [sanitizedFilmId, sanitizedHallId, start_time, sanitizedPrice, id]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Сеанс не найден' });
            }

            const fullSession = await pool.query(`
                SELECT s.*, f.film_title, h.hall_number 
                FROM Sessions s 
                JOIN Films f ON s.film_id = f.film_id 
                JOIN Halls h ON s.hall_id = h.hall_id 
                WHERE s.session_id = $1
            `, [id]);

            res.json(fullSession.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при обновлении сеанса: ' + err.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const sessionCheck = await pool.query('SELECT * FROM Sessions WHERE session_id = $1', [id]);
            if (sessionCheck.rowCount === 0) {
                return res.status(404).json({ error: 'Сеанс не найден' });
            }

            const ticketsDeleted = await pool.query(
                'DELETE FROM Tickets WHERE session_id = $1 RETURNING *',
                [id]
            );

            const result = await pool.query('DELETE FROM Sessions WHERE session_id = $1', [id]);
            
            res.json({ 
                message: `Сеанс успешно удален. Также удалено ${ticketsDeleted.rowCount} билетов, связанных с этим сеансом.`,
                deletedSession: sessionCheck.rows[0],
                deletedTicketsCount: ticketsDeleted.rowCount
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при удалении сеанса: ' + err.message });
        }
    });

    return router;
}

module.exports = sessionsRoutes;