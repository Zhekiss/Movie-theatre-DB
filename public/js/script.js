class CinemaManager {
    constructor() {
        this.currentEditingFilmId = null;
        this.currentEditingHallId = null;
        this.currentEditingSessionId = null;
        this.films = [];
        this.halls = [];
        this.init();
    }

    init() {
        this.loadFilms();
        this.loadHalls();
        this.loadSessions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.openTab(e.target.getAttribute('data-tab'));
            });
        });

        // Film form
        document.getElementById('filmForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFilm();
        });

        document.getElementById('cancelFilm').addEventListener('click', () => {
            this.resetFilmForm();
        });

        // Hall form
        document.getElementById('hallForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHall();
        });

        document.getElementById('cancelHall').addEventListener('click', () => {
            this.resetHallForm();
        });

        // Session form
        document.getElementById('sessionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSession();
        });

        document.getElementById('cancelSession').addEventListener('click', () => {
            this.resetSessionForm();
        });
    }

    // Tab management
    openTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // При переключении на вкладку сеансов обновляем списки фильмов и залов
        if (tabName === 'sessions') {
            this.populateFilmAndHallSelects();
        }
    }

    // Film management
    async loadFilms() {
        try {
            const response = await fetch('/api/films');
            if (!response.ok) throw new Error('Network response was not ok');
            
            this.films = await response.json();
            this.renderFilmsTable(this.films);
        } catch (error) {
            this.showMessage('Ошибка при загрузке фильмов: ' + error.message, 'error');
        }
    }

    renderFilmsTable(films) {
        const tbody = document.getElementById('filmsTable');
        tbody.innerHTML = '';

        if (films.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Нет данных о фильмах</td></tr>';
            return;
        }

        films.forEach(film => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${film.film_id}</td>
                <td>${this.escapeHtml(film.film_title)}</td>
                <td>${film.duration_minutes}</td>
                <td>${film.rating}</td>
                <td class="actions-cell">
                    <button class="edit-film-btn" data-id="${film.film_id}" data-title="${this.escapeHtml(film.film_title)}" data-duration="${film.duration_minutes}" data-rating="${film.rating}">Редактировать</button>
                    <button class="delete delete-film-btn" data-id="${film.film_id}" data-title="${this.escapeHtml(film.film_title)}">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Добавляем обработчики для кнопок редактирования фильмов
        document.querySelectorAll('.edit-film-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const title = e.target.getAttribute('data-title');
                const duration = e.target.getAttribute('data-duration');
                const rating = e.target.getAttribute('data-rating');
                this.editFilm(id, title, duration, rating);
            });
        });

        // Добавляем обработчики для кнопок удаления фильмов
        document.querySelectorAll('.delete-film-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const title = e.target.getAttribute('data-title');
                this.deleteFilm(id, title);
            });
        });
    }

    editFilm(id, title, duration, rating) {
        document.getElementById('filmId').value = id;
        document.getElementById('filmTitle').value = title;
        document.getElementById('filmTitle').readOnly = true;
        document.getElementById('duration').value = duration;
        document.getElementById('rating').value = rating;
        document.getElementById('filmFormTitle').textContent = 'Редактировать фильм';
        this.currentEditingFilmId = id;
        
        document.getElementById('filmForm').scrollIntoView({ behavior: 'smooth' });
    }

    resetFilmForm() {
        document.getElementById('filmForm').reset();
        document.getElementById('filmId').value = '';
        document.getElementById('filmTitle').readOnly = false;
        document.getElementById('filmFormTitle').textContent = 'Добавить фильм';
        this.currentEditingFilmId = null;
    }

    async saveFilm() {
        const filmData = {
            film_title: document.getElementById('filmTitle').value.trim(),
            duration_minutes: document.getElementById('duration').value,
            rating: document.getElementById('rating').value
        };

        if (!filmData.film_title) {
            this.showMessage('Название фильма не может быть пустым', 'error');
            return;
        }

        if (filmData.duration_minutes <= 0) {
            this.showMessage('Длительность фильма должна быть положительным числом', 'error');
            return;
        }

        if (filmData.rating < 0 || filmData.rating > 10) {
            this.showMessage('Рейтинг должен быть от 0 до 10', 'error');
            return;
        }

        try {
            const url = this.currentEditingFilmId ? `/api/films/${this.currentEditingFilmId}` : '/api/films';
            const method = this.currentEditingFilmId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filmData)
            });

            const result = await response.json();

            if (response.ok) {
                const message = this.currentEditingFilmId ? 'Фильм обновлен' : 'Фильм добавлен';
                this.showMessage(message, 'success');
                this.resetFilmForm();
                await this.loadFilms();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении фильма: ' + error.message, 'error');
        }
    }

    async deleteFilm(id, title) {
        const confirmed = confirm(`Вы уверены, что хотите удалить фильм "${title}"? Это действие также удалит все связанные сеансы и не может быть отменено.`);
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/films/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(result.message, 'success');
                await this.loadFilms();
                await this.loadSessions();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении фильма: ' + error.message, 'error');
        }
    }

    // Hall management
    async loadHalls() {
        try {
            const response = await fetch('/api/halls');
            if (!response.ok) throw new Error('Network response was not ok');
            
            this.halls = await response.json();
            this.renderHallsTable(this.halls);
        } catch (error) {
            this.showMessage('Ошибка при загрузке залов: ' + error.message, 'error');
        }
    }

    renderHallsTable(halls) {
        const tbody = document.getElementById('hallsTable');
        tbody.innerHTML = '';

        if (halls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Нет данных о залах</td></tr>';
            return;
        }

        halls.forEach(hall => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${hall.hall_id}</td>
                <td>${hall.hall_number}</td>
                <td>${hall.capacity}</td>
                <td class="actions-cell">
                    <button class="edit-hall-btn" data-id="${hall.hall_id}" data-number="${hall.hall_number}" data-capacity="${hall.capacity}">Редактировать</button>
                    <button class="delete delete-hall-btn" data-id="${hall.hall_id}" data-number="${hall.hall_number}">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.edit-hall-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const number = e.target.getAttribute('data-number');
                const capacity = e.target.getAttribute('data-capacity');
                this.editHall(id, number, capacity);
            });
        });

        document.querySelectorAll('.delete-hall-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const number = e.target.getAttribute('data-number');
                this.deleteHall(id, number);
            });
        });
    }

    editHall(id, number, capacity) {
        document.getElementById('hallId').value = id;
        document.getElementById('hallNumber').value = number;
        document.getElementById('capacity').value = capacity;
        document.getElementById('hallFormTitle').textContent = 'Редактировать зал';
        this.currentEditingHallId = id;
        
        document.getElementById('hallForm').scrollIntoView({ behavior: 'smooth' });
    }

    resetHallForm() {
        document.getElementById('hallForm').reset();
        document.getElementById('hallId').value = '';
        document.getElementById('hallFormTitle').textContent = 'Добавить зал';
        this.currentEditingHallId = null;
    }

    async saveHall() {
        const hallData = {
            hall_number: document.getElementById('hallNumber').value,
            capacity: document.getElementById('capacity').value
        };

        if (hallData.hall_number <= 0) {
            this.showMessage('Номер зала должен быть положительным числом', 'error');
            return;
        }

        if (hallData.capacity <= 0) {
            this.showMessage('Вместимость зала должна быть положительным числом', 'error');
            return;
        }

        try {
            const url = this.currentEditingHallId ? `/api/halls/${this.currentEditingHallId}` : '/api/halls';
            const method = this.currentEditingHallId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(hallData)
            });

            const result = await response.json();

            if (response.ok) {
                const message = this.currentEditingHallId ? 'Зал обновлен' : 'Зал добавлен';
                this.showMessage(message, 'success');
                this.resetHallForm();
                await this.loadHalls();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении зала: ' + error.message, 'error');
        }
    }

    async deleteHall(id, hallNumber) {
        const confirmed = confirm(`Вы уверены, что хотите удалить зал №${hallNumber}? Это действие не может быть отменено.`);
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/halls/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(result.message, 'success');
                await this.loadHalls();
                await this.loadSessions();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении зала: ' + error.message, 'error');
        }
    }

    // Session management
    async loadSessions() {
        try {
            const response = await fetch('/api/sessions');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const sessions = await response.json();
            this.renderSessionsTable(sessions);
        } catch (error) {
            this.showMessage('Ошибка при загрузке сеансов: ' + error.message, 'error');
        }
    }

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
    }

    populateFilmAndHallSelects() {
        const filmSelect = document.getElementById('sessionFilm');
        const hallSelect = document.getElementById('sessionHall');

        // Заполняем список фильмов
        filmSelect.innerHTML = '<option value="">Выберите фильм</option>';
        this.films.forEach(film => {
            const option = document.createElement('option');
            option.value = film.film_id;
            option.textContent = film.film_title;
            filmSelect.appendChild(option);
        });

        // Заполняем список залов
        hallSelect.innerHTML = '<option value="">Выберите зал</option>';
        this.halls.forEach(hall => {
            const option = document.createElement('option');
            option.value = hall.hall_id;
            option.textContent = `Зал ${hall.hall_number} (${hall.capacity} мест)`;
            hallSelect.appendChild(option);
        });
    }

    editSession(id, filmId, hallId, time, price) {
        document.getElementById('sessionId').value = id;
        document.getElementById('sessionFilm').value = filmId;
        document.getElementById('sessionHall').value = hallId;
        
        // Форматируем время для datetime-local input
        const date = new Date(time);
        const formattedTime = date.toISOString().slice(0, 16);
        document.getElementById('sessionTime').value = formattedTime;
        
        document.getElementById('sessionPrice').value = price;
        document.getElementById('sessionFormTitle').textContent = 'Редактировать сеанс';
        this.currentEditingSessionId = id;
        
        document.getElementById('sessionForm').scrollIntoView({ behavior: 'smooth' });
    }

    resetSessionForm() {
        document.getElementById('sessionForm').reset();
        document.getElementById('sessionId').value = '';
        document.getElementById('sessionFormTitle').textContent = 'Добавить сеанс';
        this.currentEditingSessionId = null;
    }

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
    }

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

    // Utility functions
    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
        
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.innerHTML.includes(text)) {
                    messageDiv.innerHTML = '';
                }
            }, 5000);
        }
        
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.cinemaManager = new CinemaManager();
});