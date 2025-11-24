// Расширяем класс CinemaManager для функциональности фильмов
Object.assign(CinemaManager.prototype, {
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
    },

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

        document.querySelectorAll('.edit-film-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const title = e.target.getAttribute('data-title');
                const duration = e.target.getAttribute('data-duration');
                const rating = e.target.getAttribute('data-rating');
                this.editFilm(id, title, duration, rating);
            });
        });

        document.querySelectorAll('.delete-film-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const title = e.target.getAttribute('data-title');
                this.deleteFilm(id, title);
            });
        });
    },

    editFilm(id, title, duration, rating) {
        document.getElementById('filmId').value = id;
        document.getElementById('filmTitle').value = title;
        document.getElementById('filmTitle').readOnly = true;
        document.getElementById('duration').value = duration;
        document.getElementById('rating').value = rating;
        document.getElementById('filmFormTitle').textContent = 'Редактировать фильм';
        this.currentEditingFilmId = id;
        
        document.getElementById('filmForm').scrollIntoView({ behavior: 'smooth' });
    },

    resetFilmForm() {
        document.getElementById('filmForm').reset();
        document.getElementById('filmId').value = '';
        document.getElementById('filmTitle').readOnly = false;
        document.getElementById('filmFormTitle').textContent = 'Добавить фильм';
        this.currentEditingFilmId = null;
    },

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
    },

    async deleteFilm(id, title) {
        const confirmed = confirm(`Вы уверены, что хотите удалить фильм "${title}"?\n\nЭто действие также удалит ВСЕ сеансы этого фильма и ВСЕ билеты на эти сеансы.\n\nЭто действие нельзя отменить.`);
        
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
                await this.loadTickets();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении фильма: ' + error.message, 'error');
        }
    }
});