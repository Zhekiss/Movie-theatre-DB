// Расширяем класс CinemaManager для функциональности сеансов
Object.assign(CinemaManager.prototype, {
    // Session management
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет данных о сеансах</td></tr>';
            return;
        }

        sessions.forEach(session => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${session.session_id}</td>
                <td>${this.escapeHtml(session.film_title)}</td>
                <td>${session.hall_number}</td>
                <td>${new Date(session.start_time).toLocaleString('ru-RU')}</td>
                <td>${session.price} руб.</td>
                <td class="actions-cell">
                    <button class="edit-session-btn" data-id="${session.session_id}" data-film-id="${session.film_id}" data-hall-id="${session.hall_id}" data-time="${session.start_time}" data-price="${session.price}">Редактировать</button>
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
        const hallSelect = document.getElementById('sessionHall');

        filmSelect.innerHTML = '<option value="">Выберите фильм</option>';
        this.films.forEach(film => {
            const option = document.createElement('option');
            option.value = film.film_id;
            option.textContent = film.film_title;
            filmSelect.appendChild(option);
        });

        hallSelect.innerHTML = '<option value="">Выберите зал</option>';
        this.halls.forEach(hall => {
            const option = document.createElement('option');
            option.value = hall.hall_id;
            option.textContent = `Зал ${hall.hall_number} (${hall.capacity} мест)`;
            hallSelect.appendChild(option);
        });
    },

    editSession(id, filmId, hallId, time, price) {
        document.getElementById('sessionId').value = id;
        document.getElementById('sessionFilm').value = filmId;
        document.getElementById('sessionHall').value = hallId;
        
        const date = new Date(time);
        const formattedTime = date.toISOString().slice(0, 16);
        document.getElementById('sessionTime').value = formattedTime;
        
        document.getElementById('sessionPrice').value = price;
        document.getElementById('sessionFormTitle').textContent = 'Редактировать сеанс';
        this.currentEditingSessionId = id;
        
        document.getElementById('sessionForm').scrollIntoView({ behavior: 'smooth' });
    },

    resetSessionForm() {
        document.getElementById('sessionForm').reset();
        document.getElementById('sessionId').value = '';
        document.getElementById('sessionFormTitle').textContent = 'Добавить сеанс';
        this.currentEditingSessionId = null;
    },

    async saveSession() {
        const sessionData = {
            film_id: document.getElementById('sessionFilm').value,
            hall_id: document.getElementById('sessionHall').value,
            start_time: document.getElementById('sessionTime').value,
            price: document.getElementById('sessionPrice').value
        };

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
            const url = this.currentEditingSessionId ? `/api/sessions/${this.currentEditingSessionId}` : '/api/sessions';
            const method = this.currentEditingSessionId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionData)
            });

            const result = await response.json();

            if (response.ok) {
                const message = this.currentEditingSessionId ? 'Сеанс обновлен' : 'Сеанс добавлен';
                this.showMessage(message, 'success');
                this.resetSessionForm();
                await this.loadSessions();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении сеанса: ' + error.message, 'error');
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
                await this.loadTickets();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении сеанса: ' + error.message, 'error');
        }
    }
});