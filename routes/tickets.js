const express = require('express');

function ticketsRoutes(pool) {
    const router = express.Router();

    function sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.replace(/[;'"\\]/g, '');
        }
        return input;
    }

    router.get('/', async (req, res) => {
        try {
            const { film_id, hall_id, session_id, customer_name } = req.query;
            
            let query = `
                SELECT t.*, s.start_time, f.film_title, h.hall_number 
                FROM Tickets t 
                JOIN Sessions s ON t.session_id = s.session_id
                JOIN Films f ON s.film_id = f.film_id
                JOIN Halls h ON s.hall_id = h.hall_id
            `;
            
            const conditions = [];
            const params = [];
            let paramCount = 0;

            // Добавляем условия фильтрации
            if (film_id) {
                paramCount++;
                conditions.push(`s.film_id = $${paramCount}`);
                params.push(parseInt(film_id));
            }

            if (hall_id) {
                paramCount++;
                conditions.push(`s.hall_id = $${paramCount}`);
                params.push(parseInt(hall_id));
            }

            if (session_id) {
                paramCount++;
                conditions.push(`t.session_id = $${paramCount}`);
                params.push(parseInt(session_id));
            }

            if (customer_name) {
                paramCount++;
                conditions.push(`LOWER(t.customer_name) LIKE LOWER($${paramCount})`);
                params.push(`%${sanitizeInput(customer_name)}%`);
            }

            // Добавляем условия WHERE если есть фильтры
            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY t.ticket_id`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера при загрузке билетов' });
        }
    });

    // Получение статистики по билетам для фильтров
    router.get('/stats', async (req, res) => {
        try {
            // Получаем уникальные значения для фильтров
            const filmsResult = await pool.query(`
                SELECT DISTINCT f.film_id, f.film_title 
                FROM Films f 
                JOIN Sessions s ON f.film_id = s.film_id
                JOIN Tickets t ON s.session_id = t.session_id
                ORDER BY f.film_title
            `);

            const hallsResult = await pool.query(`
                SELECT DISTINCT h.hall_id, h.hall_number 
                FROM Halls h 
                JOIN Sessions s ON h.hall_id = s.hall_id
                JOIN Tickets t ON s.session_id = t.session_id
                ORDER BY h.hall_number
            `);

            const sessionsResult = await pool.query(`
                SELECT DISTINCT s.session_id, s.start_time, f.film_title, h.hall_number
                FROM Sessions s
                JOIN Films f ON s.film_id = f.film_id
                JOIN Halls h ON s.hall_id = h.hall_id
                JOIN Tickets t ON s.session_id = t.session_id
                ORDER BY s.start_time DESC
            `);

            res.json({
                films: filmsResult.rows,
                halls: hallsResult.rows,
                sessions: sessionsResult.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера при загрузке статистики' });
        }
    });

    // Добавление билета
    router.post('/', async (req, res) => {
        try {
            const { session_id, customer_name, seat_number, row_number } = req.body;
            
            const sanitizedSessionId = parseInt(session_id);
            const sanitizedSeatNumber = parseInt(seat_number);
            const sanitizedRowNumber = parseInt(row_number);
            const sanitizedCustomerName = sanitizeInput(customer_name);

            // Проверяем существование сеанса
            const sessionCheck = await pool.query('SELECT * FROM Sessions WHERE session_id = $1', [sanitizedSessionId]);
            if (sessionCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Указанный сеанс не существует' });
            }

            // Проверяем, не занято ли место в этом сеансе
            const seatConflictCheck = await pool.query(
                'SELECT * FROM Tickets WHERE session_id = $1 AND seat_number = $2 AND row_number = $3',
                [sanitizedSessionId, sanitizedSeatNumber, sanitizedRowNumber]
            );

            if (seatConflictCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: `Место ${sanitizedRowNumber} ряд ${sanitizedSeatNumber} уже занято в этом сеансе.` 
                });
            }

            const result = await pool.query(
                'INSERT INTO Tickets (session_id, customer_name, seat_number, row_number) VALUES ($1, $2, $3, $4) RETURNING *',
                [sanitizedSessionId, sanitizedCustomerName, sanitizedSeatNumber, sanitizedRowNumber]
            );

            // Получаем полную информацию о созданном билете
            const fullTicket = await pool.query(`
                SELECT t.*, s.start_time, f.film_title, h.hall_number 
                FROM Tickets t 
                JOIN Sessions s ON t.session_id = s.session_id
                JOIN Films f ON s.film_id = f.film_id
                JOIN Halls h ON s.hall_id = h.hall_id
                WHERE t.ticket_id = $1
            `, [result.rows[0].ticket_id]);

            res.json(fullTicket.rows[0]);
        } catch (err) {
            console.error(err);
            if (err.code === '23505') {
                res.status(400).json({ error: 'Это место уже занято в данном сеансе' });
            } else {
                res.status(500).json({ error: 'Ошибка при добавлении билета: ' + err.message });
            }
        }
    });

    // Обновление билета
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { customer_name, seat_number, row_number } = req.body;
            
            const sanitizedSeatNumber = parseInt(seat_number);
            const sanitizedRowNumber = parseInt(row_number);
            const sanitizedCustomerName = sanitizeInput(customer_name);

            // Получаем текущий билет, чтобы узнать session_id
            const currentTicket = await pool.query('SELECT * FROM Tickets WHERE ticket_id = $1', [id]);
            if (currentTicket.rows.length === 0) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const sessionId = currentTicket.rows[0].session_id;

            // Проверяем, не занято ли место в этом сеансе другим билетом (кроме текущего)
            const seatConflictCheck = await pool.query(
                'SELECT * FROM Tickets WHERE session_id = $1 AND seat_number = $2 AND row_number = $3 AND ticket_id != $4',
                [sessionId, sanitizedSeatNumber, sanitizedRowNumber, id]
            );

            if (seatConflictCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: `Место ${sanitizedRowNumber} ряд ${sanitizedSeatNumber} уже занято в этом сеансе.` 
                });
            }

            const result = await pool.query(
                'UPDATE Tickets SET customer_name = $1, seat_number = $2, row_number = $3 WHERE ticket_id = $4 RETURNING *',
                [sanitizedCustomerName, sanitizedSeatNumber, sanitizedRowNumber, id]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            // Получаем полную информацию об обновленном билете
            const fullTicket = await pool.query(`
                SELECT t.*, s.start_time, f.film_title, h.hall_number 
                FROM Tickets t 
                JOIN Sessions s ON t.session_id = s.session_id
                JOIN Films f ON s.film_id = f.film_id
                JOIN Halls h ON s.hall_id = h.hall_id
                WHERE t.ticket_id = $1
            `, [id]);

            res.json(fullTicket.rows[0]);
        } catch (err) {
            console.error(err);
            if (err.code === '23505') {
                res.status(400).json({ error: 'Это место уже занято в данном сеансе' });
            } else {
                res.status(500).json({ error: 'Ошибка при обновлении билета: ' + err.message });
            }
        }
    });

    // Удаление билета
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const ticketCheck = await pool.query('SELECT * FROM Tickets WHERE ticket_id = $1', [id]);
            if (ticketCheck.rowCount === 0) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const result = await pool.query('DELETE FROM Tickets WHERE ticket_id = $1', [id]);
            
            res.json({ 
                message: 'Билет успешно удален',
                deletedTicket: ticketCheck.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при удалении билета: ' + err.message });
        }
    });

    return router;
}

module.exports = ticketsRoutes;