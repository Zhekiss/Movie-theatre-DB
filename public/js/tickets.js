Object.assign(CinemaManager.prototype, {
    async loadTickets(filters = {}) {
        try {
            const url = new URL('/api/tickets', window.location.origin);
            
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    url.searchParams.append(key, filters[key]);
                }
            });

            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            
            this.tickets = await response.json();
            this.renderTicketsTable(this.tickets);
            this.updateSearchResultsCount(this.tickets.length);
        } catch (error) {
            this.showMessage('Ошибка при загрузке билетов: ' + error.message, 'error');
        }
    },

    async loadTicketStats() {
        try {
            console.log('Загрузка статистики для фильтров...');
            const response = await fetch('/api/tickets/stats');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const stats = await response.json();
            console.log('Получена статистика:', stats);
            this.populateSearchFilters(stats);
            this.ticketStatsLoaded = true;
        } catch (error) {
            console.error('Ошибка при загрузке статистики билетов:', error);
            this.showMessage('Ошибка при загрузке данных для фильтров', 'error');
        }
    },

    populateSearchFilters(stats) {
        console.log('Заполнение фильтров поиска...');
        
        const filmSelect = document.getElementById('searchFilm');
        if (filmSelect) {
            filmSelect.innerHTML = '<option value="">Все фильмы</option>';
            if (stats.films && stats.films.length > 0) {
                stats.films.forEach(film => {
                    const option = document.createElement('option');
                    option.value = film.film_id;
                    option.textContent = film.film_title;
                    filmSelect.appendChild(option);
                });
                console.log(`Добавлено ${stats.films.length} фильмов в фильтр`);
            } else {
                console.log('Нет данных о фильмах для фильтра');
            }
        } else {
            console.error('Элемент searchFilm не найден');
        }

        const hallSelect = document.getElementById('searchHall');
        if (hallSelect) {
            hallSelect.innerHTML = '<option value="">Все залы</option>';
            if (stats.halls && stats.halls.length > 0) {
                stats.halls.forEach(hall => {
                    const option = document.createElement('option');
                    option.value = hall.hall_id;
                    option.textContent = `Зал ${hall.hall_number}`;
                    hallSelect.appendChild(option);
                });
                console.log(`Добавлено ${stats.halls.length} залов в фильтр`);
            } else {
                console.log('Нет данных о залах для фильтра');
            }
        } else {
            console.error('Элемент searchHall не найден');
        }

        const sessionSelect = document.getElementById('searchSession');
        if (sessionSelect) {
            sessionSelect.innerHTML = '<option value="">Все сеансы</option>';
            if (stats.sessions && stats.sessions.length > 0) {
                stats.sessions.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.session_id;
                    const sessionDate = new Date(session.start_time).toLocaleString('ru-RU');
                    option.textContent = `${session.film_title} - ${sessionDate}`;
                    sessionSelect.appendChild(option);
                });
                console.log(`Добавлено ${stats.sessions.length} сеансов в фильтр`);
            } else {
                console.log('Нет данных о сеансах для фильтра');
            }
        } else {
            console.error('Элемент searchSession не найден');
        }
        
        console.log('Заполнение фильтров завершено');
    },

    renderTicketsTable(tickets) {
        const tbody = document.getElementById('ticketsTable');
        if (!tbody) {
            console.error('Элемент ticketsTable не найден');
            return;
        }
        
        tbody.innerHTML = '';

        if (tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-results">
                        Билеты не найдены. Попробуйте изменить параметры поиска.
                    </td>
                </tr>
            `;
            return;
        }

        tickets.forEach(ticket => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ticket.ticket_id}</td>
                <td>${new Date(ticket.start_time).toLocaleString('ru-RU')}</td>
                <td>${this.escapeHtml(ticket.film_title)}</td>
                <td>${ticket.hall_number}</td>
                <td>${this.escapeHtml(ticket.customer_name)}</td>
                <td>${ticket.row_number}</td>
                <td>${ticket.seat_number}</td>
                <td class="actions-cell">
                    <button class="edit-ticket-btn" data-id="${ticket.ticket_id}" data-session-id="${ticket.session_id}" data-customer="${this.escapeHtml(ticket.customer_name)}" data-row="${ticket.row_number}" data-seat="${ticket.seat_number}">Редактировать</button>
                    <button class="delete delete-ticket-btn" data-id="${ticket.ticket_id}" data-customer="${this.escapeHtml(ticket.customer_name)}" data-film="${this.escapeHtml(ticket.film_title)}" data-time="${new Date(ticket.start_time).toLocaleString('ru-RU')}">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.attachTicketEventListeners();
    },

    attachTicketEventListeners() {
        document.querySelectorAll('.edit-ticket-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const sessionId = e.target.getAttribute('data-session-id');
                const customer = e.target.getAttribute('data-customer');
                const row = e.target.getAttribute('data-row');
                const seat = e.target.getAttribute('data-seat');
                this.editTicket(id, sessionId, customer, row, seat);
            });
        });

        document.querySelectorAll('.delete-ticket-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const customer = e.target.getAttribute('data-customer');
                const film = e.target.getAttribute('data-film');
                const time = e.target.getAttribute('data-time');
                this.deleteTicket(id, customer, film, time);
            });
        });
    },

    updateSearchResultsCount(count) {
        const oldCounter = document.getElementById('resultsCounter');
        if (oldCounter) {
            oldCounter.remove();
        }

        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            const counter = document.createElement('div');
            counter.id = 'resultsCounter';
            counter.className = 'results-count';
            counter.textContent = `Найдено билетов: ${count}`;
            
            const searchForm = document.getElementById('searchTicketForm');
            if (searchForm) {
                searchForm.parentNode.insertBefore(counter, searchForm.nextSibling);
            }
        }
    },

    setupSearchForm() {
        const searchForm = document.getElementById('searchTicketForm');
        const resetButton = document.getElementById('resetSearch');

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        } else {
            console.error('Форма поиска searchTicketForm не найдена');
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetSearch();
            });
        } else {
            console.error('Кнопка сброса поиска resetSearch не найдена');
        }
    },

    performSearch() {
        const filters = {
            film_id: document.getElementById('searchFilm') ? document.getElementById('searchFilm').value : '',
            hall_id: document.getElementById('searchHall') ? document.getElementById('searchHall').value : '',
            session_id: document.getElementById('searchSession') ? document.getElementById('searchSession').value : '',
            customer_name: document.getElementById('searchCustomer') ? document.getElementById('searchCustomer').value : ''
        };

        this.currentTicketFilters = filters;
        this.loadTickets(filters);
    },

    resetSearch() {
        const searchForm = document.getElementById('searchTicketForm');
        if (searchForm) {
            searchForm.reset();
        }
        this.currentTicketFilters = {};
        this.loadTickets();
    },

    populateSessionSelect() {
        const sessionSelect = document.getElementById('ticketSession');
        if (!sessionSelect) {
            console.error('Элемент ticketSession не найден');
            return;
        }
        
        sessionSelect.innerHTML = '<option value="">Выберите сеанс</option>';
        
        if (this.sessions.length === 0) {
            this.loadSessions().then(() => {
                this.populateSessionSelect();
            });
            return;
        }
        
        this.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.session_id;
            option.textContent = `${session.film_title} - Зал ${session.hall_number} - ${new Date(session.start_time).toLocaleString('ru-RU')}`;
            sessionSelect.appendChild(option);
        });
    },

    editTicket(id, sessionId, customer, row, seat) {
        document.getElementById('ticketId').value = id;
        document.getElementById('ticketSession').value = sessionId;
        document.getElementById('ticketSession').disabled = true;
        document.getElementById('ticketCustomer').value = customer;
        document.getElementById('ticketRow').value = row;
        document.getElementById('ticketSeat').value = seat;
        document.getElementById('ticketFormTitle').textContent = 'Редактировать билет';
        this.currentEditingTicketId = id;
        
        document.getElementById('ticketForm').scrollIntoView({ behavior: 'smooth' });
    },

    resetTicketForm() {
        document.getElementById('ticketForm').reset();
        document.getElementById('ticketId').value = '';
        document.getElementById('ticketSession').disabled = false;
        document.getElementById('ticketFormTitle').textContent = 'Добавить билет';
        this.currentEditingTicketId = null;
    },

    async saveTicket() {
        const ticketData = {
            session_id: document.getElementById('ticketSession').value,
            customer_name: document.getElementById('ticketCustomer').value.trim(),
            row_number: document.getElementById('ticketRow').value,
            seat_number: document.getElementById('ticketSeat').value
        };

        if (!ticketData.session_id) {
            this.showMessage('Выберите сеанс', 'error');
            return;
        }

        if (!ticketData.customer_name) {
            this.showMessage('Введите имя покупателя', 'error');
            return;
        }

        if (ticketData.row_number <= 0) {
            this.showMessage('Номер ряда должен быть положительным числом', 'error');
            return;
        }

        if (ticketData.seat_number <= 0) {
            this.showMessage('Номер места должен быть положительным числом', 'error');
            return;
        }

        try {
            const url = this.currentEditingTicketId ? `/api/tickets/${this.currentEditingTicketId}` : '/api/tickets';
            const method = this.currentEditingTicketId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticketData)
            });

            const result = await response.json();

            if (response.ok) {
                const message = this.currentEditingTicketId ? 'Билет обновлен' : 'Билет добавлен';
                this.showMessage(message, 'success');
                this.resetTicketForm();
                await this.loadTickets(this.currentTicketFilters);
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении билета: ' + error.message, 'error');
        }
    },

    async deleteTicket(id, customer, film, time) {
        const confirmed = confirm(`Вы уверены, что хотите удалить билет?\nПокупатель: ${customer}\nФильм: ${film}\nВремя: ${time}`);
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/tickets/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(result.message, 'success');
                await this.loadTickets(this.currentTicketFilters);
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении билета: ' + error.message, 'error');
        }
    }
});