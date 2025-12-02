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
            const { session_id, film_id, hall_id, customer_name } = req.query;
            
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

            if (session_id) {
                paramCount++;
                conditions.push(`t.session_id = $${paramCount}`);
                params.push(parseInt(session_id));
            }

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

            if (customer_name) {
                paramCount++;
                conditions.push(`LOWER(t.customer_name) LIKE LOWER($${paramCount})`);
                params.push(`%${sanitizeInput(customer_name)}%`);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY t.row_number, t.seat_number`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера при загрузке билетов' });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { customer_name, is_occupied } = req.body;
            
            const sanitizedCustomerName = sanitizeInput(customer_name);
            const sanitizedIsOccupied = is_occupied === true || is_occupied === 'true';

            const currentTicket = await pool.query(
                `SELECT t.*, s.start_time, f.film_title, h.hall_number 
                 FROM Tickets t 
                 JOIN Sessions s ON t.session_id = s.session_id
                 JOIN Films f ON s.film_id = f.film_id
                 JOIN Halls h ON s.hall_id = h.hall_id
                 WHERE t.ticket_id = $1`,
                [id]
            );
            
            if (currentTicket.rows.length === 0) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            // Если место освобождается, очищаем имя покупателя
            let finalCustomerName = sanitizedCustomerName;
            if (!sanitizedIsOccupied && sanitizedCustomerName) {
                finalCustomerName = null;
            }

            const result = await pool.query(
                'UPDATE Tickets SET customer_name = $1, is_occupied = $2 WHERE ticket_id = $3 RETURNING *',
                [finalCustomerName, sanitizedIsOccupied, id]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Билет не найден' });
            }

            const fullTicket = await pool.query(
                `SELECT t.*, s.start_time, f.film_title, h.hall_number 
                 FROM Tickets t 
                 JOIN Sessions s ON t.session_id = s.session_id
                 JOIN Films f ON s.film_id = f.film_id
                 JOIN Halls h ON s.hall_id = h.hall_id
                 WHERE t.ticket_id = $1`,
                [id]
            );

            res.json(fullTicket.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при обновлении билета: ' + err.message });
        }
    });

    return router;
}

module.exports = ticketsRoutes;