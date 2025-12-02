const express = require('express');

function sessionsRoutes(pool) {
    const router = express.Router();

    function sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.replace(/[;'"\\]/g, '');
        }
        return input;
    }

    // Функция для создания билетов при создании сеанса
    async function createTicketsForSession(client, sessionId, hallId) {
        // Получаем информацию о зале
        const hallInfo = await client.query(
            'SELECT rows_count, seats_per_row FROM Halls WHERE hall_id = $1',
            [hallId]
        );

        if (hallInfo.rows.length === 0) {
            throw new Error('Зал не найден');
        }

        const { rows_count, seats_per_row } = hallInfo.rows[0];
        const tickets = [];

        // Создаем билеты для всех мест в зале
        for (let row = 1; row <= rows_count; row++) {
            for (let seat = 1; seat <= seats_per_row; seat++) {
                tickets.push({
                    session_id: sessionId,
                    row_number: row,
                    seat_number: seat,
                    customer_name: null,
                    is_occupied: false
                });
            }
        }

        // Вставляем все билеты
        for (const ticket of tickets) {
            await client.query(
                'INSERT INTO Tickets (session_id, customer_name, seat_number, row_number, is_occupied) VALUES ($1, $2, $3, $4, $5)',
                [ticket.session_id, ticket.customer_name, ticket.seat_number, ticket.row_number, ticket.is_occupied]
            );
        }

        return tickets.length;
    }

    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT s.*, f.film_title, h.hall_number, h.rows_count, h.seats_per_row
                FROM Sessions s 
                JOIN Films f ON s.film_id = f.film_id 
                JOIN Halls h ON s.hall_id = h.hall_id 
                ORDER BY s.start_time DESC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера при загрузке сеансов' });
        }
    });

    router.post('/', async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { film_id, hall_id, start_time, price } = req.body;
            
            const sanitizedFilmId = parseInt(film_id);
            const sanitizedHallId = parseInt(hall_id);
            const sanitizedPrice = parseFloat(price);

            // Проверяем существование фильма и зала
            const filmCheck = await client.query('SELECT * FROM Films WHERE film_id = $1', [sanitizedFilmId]);
            const hallCheck = await client.query('SELECT * FROM Halls WHERE hall_id = $1', [sanitizedHallId]);

            if (filmCheck.rows.length === 0) {
                throw new Error('Указанный фильм не существует');
            }

            if (hallCheck.rows.length === 0) {
                throw new Error('Указанный зал не существует');
            }

            // Проверяем конфликты времени
            const timeConflictCheck = await client.query(
                `SELECT * FROM Sessions 
                 WHERE hall_id = $1 
                 AND start_time <= $2::timestamp + INTERVAL '30 minutes'
                 AND $2::timestamp <= start_time + INTERVAL '30 minutes'`,
                [sanitizedHallId, start_time]
            );

            if (timeConflictCheck.rows.length > 0) {
                throw new Error('Время сеанса пересекается с другим сеансом в этом зале. Минимальный интервал - 30 минут.');
            }

            // Создаем сеанс
            const sessionResult = await client.query(
                'INSERT INTO Sessions (film_id, hall_id, start_time, price) VALUES ($1, $2, $3, $4) RETURNING *',
                [sanitizedFilmId, sanitizedHallId, start_time, sanitizedPrice]
            );

            const sessionId = sessionResult.rows[0].session_id;

            // Создаем билеты для этого сеанса
            const ticketsCount = await createTicketsForSession(client, sessionId, sanitizedHallId);

            await client.query('COMMIT');

            // Получаем полную информацию о сеансе
            const fullSession = await pool.query(`
                SELECT s.*, f.film_title, h.hall_number, h.rows_count, h.seats_per_row
                FROM Sessions s 
                JOIN Films f ON s.film_id = f.film_id 
                JOIN Halls h ON s.hall_id = h.hall_id 
                WHERE s.session_id = $1
            `, [sessionId]);

            res.json({
                ...fullSession.rows[0],
                tickets_created: ticketsCount
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: 'Ошибка при добавлении сеанса: ' + err.message });
        } finally {
            client.release();
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { film_id, hall_id, start_time, price } = req.body;
            
            const sanitizedFilmId = parseInt(film_id);
            const sanitizedHallId = parseInt(hall_id);
            const sanitizedPrice = parseFloat(price);

            // Проверки существования
            const filmCheck = await pool.query('SELECT * FROM Films WHERE film_id = $1', [sanitizedFilmId]);
            const hallCheck = await pool.query('SELECT * FROM Halls WHERE hall_id = $1', [sanitizedHallId]);

            if (filmCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный фильм не существует' });
            }

            if (hallCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный зал не существует' });
            }

            // Проверка конфликтов времени
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
                SELECT s.*, f.film_title, h.hall_number, h.rows_count, h.seats_per_row
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
            
            const sessionCheck = await pool.query(
                `SELECT s.*, f.film_title, h.hall_number 
                 FROM Sessions s 
                 JOIN Films f ON s.film_id = f.film_id 
                 JOIN Halls h ON s.hall_id = h.hall_id 
                 WHERE s.session_id = $1`,
                [id]
            );
            
            if (sessionCheck.rowCount === 0) {
                return res.status(404).json({ error: 'Сеанс не найден' });
            }

            // Удаляем билеты
            const ticketsDeleted = await pool.query(
                'DELETE FROM Tickets WHERE session_id = $1 RETURNING *',
                [id]
            );

            // Удаляем сеанс
            const result = await pool.query('DELETE FROM Sessions WHERE session_id = $1', [id]);
            
            res.json({ 
                message: `Сеанс успешно удален. Удалено ${ticketsDeleted.rowCount} билетов.`,
                deletedSession: sessionCheck.rows[0],
                deletedTicketsCount: ticketsDeleted.rowCount
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при удалении сеанса: ' + err.message });
        }
    });

    router.get('/:id/tickets', async (req, res) => {
        try {
            const { id } = req.params;
            
            const sessionCheck = await pool.query(
                `SELECT s.*, f.film_title, h.hall_number, h.rows_count, h.seats_per_row
                 FROM Sessions s 
                 JOIN Films f ON s.film_id = f.film_id 
                 JOIN Halls h ON s.hall_id = h.hall_id 
                 WHERE s.session_id = $1`,
                [id]
            );
            
            if (sessionCheck.rowCount === 0) {
                return res.status(404).json({ error: 'Сеанс не найден' });
            }

            const tickets = await pool.query(
                `SELECT * FROM Tickets WHERE session_id = $1 ORDER BY row_number, seat_number`,
                [id]
            );

            res.json({
                session: sessionCheck.rows[0],
                tickets: tickets.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при загрузке билетов сеанса: ' + err.message });
        }
    });

    return router;
}

module.exports = sessionsRoutes;