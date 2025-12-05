Object.assign(CinemaManager.prototype, {
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
        document.getElementById('editFilmId').value = id;
        document.getElementById('editFilmTitle').value = title;
        document.getElementById('editDuration').value = duration;
        document.getElementById('editRating').value = rating;
        
        this.openModal('editFilmModal');
    },

    resetFilmForm() {
        const form = document.getElementById('filmForm');
        if (form) form.reset();
        document.getElementById('filmId').value = '';
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
            const url = '/api/films';
            const method = 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filmData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Фильм добавлен', 'success');
                this.hideAddForm('addFilmForm');
                await this.loadFilms();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении фильма: ' + error.message, 'error');
        }
    },

    async saveFilmEdit() {
        const filmData = {
            duration_minutes: document.getElementById('editDuration').value,
            rating: document.getElementById('editRating').value
        };

        const filmId = document.getElementById('editFilmId').value;

        if (filmData.duration_minutes <= 0) {
            this.showMessage('Длительность фильма должна быть положительным числом', 'error');
            return;
        }
        if (filmData.rating < 0 || filmData.rating > 10) {
            this.showMessage('Рейтинг должен быть от 0 до 10', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/films/${filmId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filmData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Фильм обновлен', 'success');
                this.closeModal(document.getElementById('editFilmModal'));
                await this.loadFilms();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при обновлении фильма: ' + error.message, 'error');
        }
    },

    async showFilmRevenue() {
        try {
            const response = await fetch('/api/films/revenue');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const revenueData = await response.json();
            this.displayRevenueModal(revenueData);
        } catch (error) {
            this.showMessage('Ошибка при загрузке данных о доходе: ' + error.message, 'error');
        }
    },
    
    displayRevenueModal(revenueData) {
    const tbody = document.getElementById('revenueTableBody');
    const summary = document.getElementById('revenueSummary');
    const totalElement = document.getElementById('totalRevenue');
    
    if (!tbody || !summary || !totalElement) {
        console.error('Элементы модального окна дохода не найдены');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (revenueData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; color: #6c757d;">
                    Нет данных о доходе
                </td>
            </tr>
        `;
        summary.innerHTML = '<p>Нет данных для анализа</p>';
        totalElement.textContent = 'Общий доход: 0 руб.';
    } else {
        revenueData.sort((a, b) => b.revenue - a.revenue);
        
        const totalRevenue = revenueData.reduce((sum, film) => sum + parseFloat(film.revenue), 0);
        
        const averageRevenue = totalRevenue / revenueData.length;
        
        const maxRevenueFilm = revenueData.reduce((max, film) => 
            film.revenue > max.revenue ? film : max, revenueData[0]);
        
        const minRevenueFilm = revenueData.reduce((min, film) => 
            film.revenue < min.revenue ? film : min, revenueData[0]);
        
        summary.innerHTML = `
            <p><strong>Всего фильмов:</strong> ${revenueData.length}</p>
            <p><strong>Самый прибыльный фильм:</strong> ${maxRevenueFilm.film_title} (${parseFloat(maxRevenueFilm.revenue).toFixed(2)} руб.)</p>
            <p><strong>Самый убыточный фильм:</strong> ${minRevenueFilm.film_title} (${parseFloat(minRevenueFilm.revenue).toFixed(2)} руб.)</p>
            <p><strong>Средний доход на фильм:</strong> ${averageRevenue.toFixed(2)} руб.</p>
        `;
        
        revenueData.forEach(film => {
            const row = document.createElement('tr');
            const revenue = parseFloat(film.revenue);
            
            row.innerHTML = `
                <td>${this.escapeHtml(film.film_title)}</td>
                <td style="font-weight: bold;">${revenue.toFixed(2)} руб.</td>
            `;
            tbody.appendChild(row);
        });
        
        totalElement.textContent = `Общий доход: ${totalRevenue.toFixed(2)} руб.`;
    }
    
    this.openModal('revenueModal');
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
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении фильма: ' + error.message, 'error');
        }
    }
});