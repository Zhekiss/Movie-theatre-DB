const express = require('express');

function hallsRoutes(pool) {
    const router = express.Router();

    function sanitizeInput(input) {
        if (typeof input === 'string') {
            return input.replace(/[;'"\\]/g, '');
        }
        return input;
    }

    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM Halls ORDER BY hall_id');
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка сервера при загрузке залов' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { hall_number, rows_count, seats_per_row } = req.body;
            
            const sanitizedNumber = parseInt(hall_number);
            const sanitizedRows = parseInt(rows_count);
            const sanitizedSeats = parseInt(seats_per_row);

            // Проверяем уникальность номера зала
            const existingHall = await pool.query(
                'SELECT * FROM Halls WHERE hall_number = $1',
                [sanitizedNumber]
            );

            if (existingHall.rows.length > 0) {
                return res.status(400).json({ 
                    error: `Зал с номером ${sanitizedNumber} уже существует` 
                });
            }

            // Проверяем валидность данных
            if (sanitizedRows <= 0) {
                return res.status(400).json({ error: 'Количество рядов должно быть больше 0' });
            }
            
            if (sanitizedSeats <= 0) {
                return res.status(400).json({ error: 'Количество мест в ряду должно быть больше 0' });
            }

            const result = await pool.query(
                'INSERT INTO Halls (hall_number, rows_count, seats_per_row) VALUES ($1, $2, $3) RETURNING *',
                [sanitizedNumber, sanitizedRows, sanitizedSeats]
            );
            
            // Добавляем вычисляемое поле capacity для обратной совместимости
            const hallWithCapacity = {
                ...result.rows[0],
                capacity: result.rows[0].rows_count * result.rows[0].seats_per_row
            };
            
            res.json(hallWithCapacity);
        } catch (err) {
            console.error(err);
            if (err.code === '23505') {
                res.status(400).json({ error: `Зал с номером ${req.body.hall_number} уже существует` });
            } else {
                res.status(500).json({ error: 'Ошибка при добавлении зала: ' + err.message });
            }
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { hall_number, rows_count, seats_per_row } = req.body;
            
            const sanitizedNumber = parseInt(hall_number);
            const sanitizedRows = parseInt(rows_count);
            const sanitizedSeats = parseInt(seats_per_row);

            // Проверяем уникальность номера зала (исключая текущий)
            const duplicateCheck = await pool.query(
                'SELECT * FROM Halls WHERE hall_number = $1 AND hall_id != $2',
                [sanitizedNumber, id]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: `Зал с номером ${sanitizedNumber} уже существует` 
                });
            }

            // Проверяем валидность данных
            if (sanitizedRows <= 0) {
                return res.status(400).json({ error: 'Количество рядов должно быть больше 0' });
            }
            
            if (sanitizedSeats <= 0) {
                return res.status(400).json({ error: 'Количество мест в ряду должно быть больше 0' });
            }

            const result = await pool.query(
                'UPDATE Halls SET hall_number = $1, rows_count = $2, seats_per_row = $3 WHERE hall_id = $4 RETURNING *',
                [sanitizedNumber, sanitizedRows, sanitizedSeats, id]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Зал не найден' });
            }
            
            // Добавляем вычисляемое поле capacity для обратной совместимости
            const hallWithCapacity = {
                ...result.rows[0],
                capacity: result.rows[0].rows_count * result.rows[0].seats_per_row
            };
            
            res.json(hallWithCapacity);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при обновлении зала: ' + err.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { id } = req.params;
            
            const hallCheck = await client.query('SELECT * FROM Halls WHERE hall_id = $1', [id]);
            if (hallCheck.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Зал не найден' });
            }

            const sessionsCheck = await client.query(
                'SELECT * FROM Sessions WHERE hall_id = $1',
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
                'DELETE FROM Sessions WHERE hall_id = $1',
                [id]
            );

            const result = await client.query('DELETE FROM Halls WHERE hall_id = $1', [id]);
            
            await client.query('COMMIT');
            
            res.json({ 
                message: `Зал успешно удален. Также удалено ${sessionsDeleted.rowCount} сеансов и ${totalTicketsDeleted} билетов, связанных с этим залом.`,
                deletedHall: hallCheck.rows[0],
                deletedSessionsCount: sessionsDeleted.rowCount,
                deletedTicketsCount: totalTicketsDeleted
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: 'Ошибка при удалении зала: ' + err.message });
        } finally {
            client.release();
        }
    });

    return router;
}

module.exports = hallsRoutes;