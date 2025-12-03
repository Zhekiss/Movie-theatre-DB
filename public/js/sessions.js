Object.assign(CinemaManager.prototype, {
    async loadSessions() {
        try {
            const response = await fetch('/api/sessions');
            if (!response.ok) throw new Error('Network response was not ok');
            
            this.sessions = await response.json();
            this.renderSessionsTable(this.sessions);
        } catch (error) {
            this.showMessage('Ошибка при загрузке сеансов: ' + error.message, 'error');
        }
    },

    renderSessionsTable(sessions) {
        const tbody = document.getElementById('sessionsTable');
        tbody.innerHTML = '';

        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Нет данных о сеансах</td></tr>';
            return;
        }

        sessions.forEach(session => {
            const totalSeats = session.rows_count * session.seats_per_row;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${session.session_id}</td>
                <td>${this.escapeHtml(session.film_title)}</td>
                <td>${session.hall_number}</td>
                <td>${new Date(session.start_time).toLocaleString('ru-RU')}</td>
                <td>${session.price} руб.</td>
                <td>${totalSeats} мест</td>
                <td class="actions-cell">
                    <button class="edit-session-btn" data-id="${session.session_id}" data-film-id="${session.film_id}" data-hall-id="${session.hall_id}" data-time="${session.start_time}" data-price="${session.price}">Редактировать</button>
                    <button class="view-tickets-btn warning" data-id="${session.session_id}" data-film="${this.escapeHtml(session.film_title)}" data-hall="${session.hall_number}" data-time="${session.start_time}" data-price="${session.price}" data-rows="${session.rows_count}" data-seats="${session.seats_per_row}">Показать билеты</button>
                    <button class="delete delete-session-btn" data-id="${session.session_id}" data-film="${this.escapeHtml(session.film_title)}" data-hall="${session.hall_number}" data-time="${new Date(session.start_time).toLocaleString('ru-RU')}">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.edit-session-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const filmId = e.target.getAttribute('data-film-id');
                const hallId = e.target.getAttribute('data-hall-id');
                const time = e.target.getAttribute('data-time');
                const price = e.target.getAttribute('data-price');
                this.editSession(id, filmId, hallId, time, price);
            });
        });

        document.querySelectorAll('.view-tickets-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const sessionId = e.target.getAttribute('data-id');
                const filmTitle = e.target.getAttribute('data-film');
                const hallNumber = e.target.getAttribute('data-hall');
                const sessionTime = e.target.getAttribute('data-time');
                const sessionPrice = e.target.getAttribute('data-price');
                const rowsCount = e.target.getAttribute('data-rows');
                const seatsPerRow = e.target.getAttribute('data-seats');
                
                window.cinemaManager.currentSessionInfo = {
                    sessionId,
                    filmTitle,
                    hallNumber,
                    sessionTime,
                    sessionPrice,
                    rowsCount,
                    seatsPerRow
                };
                
                window.cinemaManager.openTab('tickets');
            });
        });

        document.querySelectorAll('.delete-session-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const film = e.target.getAttribute('data-film');
                const hall = e.target.getAttribute('data-hall');
                const time = e.target.getAttribute('data-time');
                this.deleteSession(id, film, hall, time);
            });
        });
    },

    populateFilmAndHallSelects() {
        const filmSelect = document.getElementById('sessionFilm');
        const editFilmSelect = document.getElementById('editSessionFilm');
        const hallSelect = document.getElementById('sessionHall');
        const editHallSelect = document.getElementById('editSessionHall');

        // Заполняем select для добавления сеанса
        if (filmSelect) {
            filmSelect.innerHTML = '<option value="">Выберите фильм</option>';
            this.films.forEach(film => {
                const option = document.createElement('option');
                option.value = film.film_id;
                option.textContent = film.film_title;
                filmSelect.appendChild(option);
            });
        }

        if (hallSelect) {
            hallSelect.innerHTML = '<option value="">Выберите зал</option>';
            this.halls.forEach(hall => {
                const option = document.createElement('option');
                option.value = hall.hall_id;
                const totalSeats = hall.rows_count * hall.seats_per_row;
                option.textContent = `Зал ${hall.hall_number} (${totalSeats} мест, ${hall.rows_count}×${hall.seats_per_row})`;
                hallSelect.appendChild(option);
            });
        }

        // Заполняем select для редактирования сеанса
        if (editFilmSelect) {
            editFilmSelect.innerHTML = '<option value="">Выберите фильм</option>';
            this.films.forEach(film => {
                const option = document.createElement('option');
                option.value = film.film_id;
                option.textContent = film.film_title;
                editFilmSelect.appendChild(option);
            });
        }

        if (editHallSelect) {
            editHallSelect.innerHTML = '<option value="">Выберите зал</option>';
            this.halls.forEach(hall => {
                const option = document.createElement('option');
                option.value = hall.hall_id;
                const totalSeats = hall.rows_count * hall.seats_per_row;
                option.textContent = `Зал ${hall.hall_number} (${totalSeats} мест, ${hall.rows_count}×${hall.seats_per_row})`;
                editHallSelect.appendChild(option);
            });
        }
    },

    editSession(id, filmId, hallId, time, price) {
        // Сначала открываем модальное окно
        this.openModal('editSessionModal');
        
        // Затем заполняем select'ы и устанавливаем значения
        this.populateFilmAndHallSelects();
        
        // Устанавливаем значения с небольшой задержкой, чтобы DOM успел обновиться
        setTimeout(() => {
            document.getElementById('editSessionId').value = id;
            document.getElementById('editSessionFilm').value = filmId;
            document.getElementById('editSessionHall').value = hallId;
            
            const date = new Date(time);
            const formattedTime = date.toISOString().slice(0, 16);
            document.getElementById('editSessionTime').value = formattedTime;
            
            document.getElementById('editSessionPrice').value = price;
        }, 50);
    },

    resetSessionForm() {
        const form = document.getElementById('sessionForm');
        if (form) form.reset();
        document.getElementById('sessionId').value = '';
        this.currentEditingSessionId = null;
    },

    async saveSession() {
        const sessionData = {
            film_id: document.getElementById('sessionFilm').value,
            hall_id: document.getElementById('sessionHall').value,
            start_time: document.getElementById('sessionTime').value,
            price: document.getElementById('sessionPrice').value
        };

        // Валидация
        if (!sessionData.film_id) {
            this.showMessage('Выберите фильм', 'error');
            return;
        }
        if (!sessionData.hall_id) {
            this.showMessage('Выберите зал', 'error');
            return;
        }
        if (!sessionData.start_time) {
            this.showMessage('Укажите время начала сеанса', 'error');
            return;
        }
        if (sessionData.price <= 0) {
            this.showMessage('Цена должна быть положительным числом', 'error');
            return;
        }

        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(`Сеанс добавлен. Создано ${result.tickets_created} билетов`, 'success');
                this.hideAddForm('addSessionForm');
                await this.loadSessions();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении сеанса: ' + error.message, 'error');
        }
    },

    async saveSessionEdit() {
        const sessionData = {
            film_id: document.getElementById('editSessionFilm').value,
            hall_id: document.getElementById('editSessionHall').value,
            start_time: document.getElementById('editSessionTime').value,
            price: document.getElementById('editSessionPrice').value
        };

        const sessionId = document.getElementById('editSessionId').value;

        console.log('Данные для отправки:', sessionData);
        console.log('ID сеанса:', sessionId);

        // Валидация
        if (!sessionData.film_id) {
            this.showMessage('Выберите фильм', 'error');
            return;
        }
        if (!sessionData.hall_id) {
            this.showMessage('Выберите зал', 'error');
            return;
        }
        if (!sessionData.start_time) {
            this.showMessage('Укажите время начала сеанса', 'error');
            return;
        }
        if (sessionData.price <= 0) {
            this.showMessage('Цена должна быть положительным числом', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData)
            });

            const result = await response.json();
            console.log('Ответ сервера:', result);

            if (response.ok) {
                this.showMessage('Сеанс обновлен', 'success');
                this.closeModal(document.getElementById('editSessionModal'));
                await this.loadSessions();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            console.error('Ошибка при обновлении сеанса:', error);
            this.showMessage('Ошибка при обновлении сеанса: ' + error.message, 'error');
        }
    },

    async deleteSession(id, film, hall, time) {
        const confirmed = confirm(`Вы уверены, что хотите удалить сеанс?\nФильм: ${film}\nЗал: ${hall}\nВремя: ${time}\n\nПри удалении сеанса все связанные билеты также будут удалены.`);
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/sessions/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(result.message, 'success');
                await this.loadSessions();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении сеанса: ' + error.message, 'error');
        }
    }
});