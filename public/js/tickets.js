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

    async loadTicketsForSession(sessionId) {
        try {
            // Показываем заголовок сеанса
            this.showSessionHeader();
            
            // Загружаем билеты только для этого сеанса
            const response = await fetch(`/api/sessions/${sessionId}/tickets`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            this.tickets = data.tickets;
            this.renderTicketsTable(this.tickets);
            this.updateSearchResultsCount(this.tickets.length);
        } catch (error) {
            this.showMessage('Ошибка при загрузке билетов сеанса: ' + error.message, 'error');
        }
    },

    showSessionHeader() {
        if (this.currentSessionInfo) {
            const header = document.getElementById('ticketSessionHeader');
            const title = document.getElementById('ticketSessionTitle');
            const info = document.getElementById('ticketSessionInfo');
            const mainTitle = document.getElementById('ticketsMainTitle');

            if (header && title && info && mainTitle) {
                mainTitle.style.display = 'none';
                header.style.display = 'block';
                title.textContent = `Билеты на сеанс: ${this.currentSessionInfo.filmTitle}`;
                info.innerHTML = `
                    <p><strong>Фильм:</strong> ${this.currentSessionInfo.filmTitle}</p>
                    <p><strong>Зал:</strong> ${this.currentSessionInfo.hallNumber}</p>
                    <p><strong>Время:</strong> ${new Date(this.currentSessionInfo.sessionTime).toLocaleString('ru-RU')}</p>
                    <p><strong>Цена:</strong> ${this.currentSessionInfo.sessionPrice} руб.</p>
                    <p><strong>Мест в зале:</strong> ${this.currentSessionInfo.rowsCount} × ${this.currentSessionInfo.seatsPerRow} = ${this.currentSessionInfo.rowsCount * this.currentSessionInfo.seatsPerRow} мест</p>
                `;
            }
        }
    },

    hideSessionHeader() {
        const header = document.getElementById('ticketSessionHeader');
        const mainTitle = document.getElementById('ticketsMainTitle');

        if (header && mainTitle) {
            mainTitle.style.display = 'block';
            header.style.display = 'none';
            this.currentSessionInfo = null;
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
                    <td colspan="9" class="no-results">
                        Билеты не найдены. Попробуйте изменить параметры поиска.
                    </td>
                </tr>
            `;
            return;
        }

        tickets.forEach(ticket => {
            const row = document.createElement('tr');
            const statusText = ticket.is_occupied ? 'Занято' : 'Свободно';
            const statusClass = ticket.is_occupied ? 'occupied' : 'free';
            
            row.innerHTML = `
                <td>${ticket.ticket_id}</td>
                <td>${new Date(ticket.start_time).toLocaleString('ru-RU')}</td>
                <td>${this.escapeHtml(ticket.film_title)}</td>
                <td>${ticket.hall_number}</td>
                <td>${this.escapeHtml(ticket.customer_name || '')}</td>
                <td>${ticket.row_number}</td>
                <td>${ticket.seat_number}</td>
                <td><span class="ticket-status ${statusClass}">${statusText}</span></td>
                <td class="actions-cell">
                    <button class="edit-ticket-btn" data-id="${ticket.ticket_id}" data-customer="${this.escapeHtml(ticket.customer_name || '')}" data-occupied="${ticket.is_occupied}" data-row="${ticket.row_number}" data-seat="${ticket.seat_number}" data-film="${this.escapeHtml(ticket.film_title)}" data-time="${new Date(ticket.start_time).toLocaleString('ru-RU')}" data-hall="${ticket.hall_number}">Редактировать</button>
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
                const customer = e.target.getAttribute('data-customer');
                const occupied = e.target.getAttribute('data-occupied');
                const row = e.target.getAttribute('data-row');
                const seat = e.target.getAttribute('data-seat');
                const film = e.target.getAttribute('data-film');
                const time = e.target.getAttribute('data-time');
                const hall = e.target.getAttribute('data-hall');
                this.editTicket(id, customer, occupied, row, seat, film, time, hall);
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
        const showAllButton = document.getElementById('showAllTickets');

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

        if (showAllButton) {
            showAllButton.addEventListener('click', () => {
                this.showAllTickets();
            });
        }
    },

    performSearch() {
        const filters = {
            film_id: document.getElementById('searchFilm') ? document.getElementById('searchFilm').value : '',
            hall_id: document.getElementById('searchHall') ? document.getElementById('searchHall').value : '',
            session_id: document.getElementById('searchSession') ? document.getElementById('searchSession').value : '',
            customer_name: document.getElementById('searchCustomer') ? document.getElementById('searchCustomer').value : '',
            is_occupied: document.getElementById('searchOccupied') ? document.getElementById('searchOccupied').value : ''
        };

        this.currentTicketFilters = filters;
        this.loadTickets(filters);
        this.hideSessionHeader();
    },

    resetSearch() {
        const searchForm = document.getElementById('searchTicketForm');
        if (searchForm) {
            searchForm.reset();
        }
        this.currentTicketFilters = {};
        this.loadTickets();
        this.hideSessionHeader();
    },

    showAllTickets() {
        this.resetSearch();
    },

    populateSessionSelect() {
        // Этот метод теперь не нужен, так как билеты добавляются автоматически
    },

    editTicket(id, customer, occupied, row, seat, film, time, hall) {
        document.getElementById('editTicketId').value = id;
        document.getElementById('editTicketCustomer').value = customer || '';
        document.getElementById('editTicketOccupied').value = occupied;
        
        const ticketInfo = document.getElementById('editTicketInfo');
        ticketInfo.innerHTML = `
            <div class="ticket-details">
                <p><strong>Фильм:</strong> ${film}</p>
                <p><strong>Время сеанса:</strong> ${time}</p>
                <p><strong>Зал:</strong> ${hall}</p>
                <p><strong>Место:</strong> Ряд ${row}, Место ${seat}</p>
            </div>
        `;
        
        this.openModal('editTicketModal');
    },

    async saveTicketEdit() {
        const ticketData = {
            customer_name: document.getElementById('editTicketCustomer').value.trim(),
            is_occupied: document.getElementById('editTicketOccupied').value === 'true'
        };

        const ticketId = document.getElementById('editTicketId').value;

        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticketData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Билет обновлен', 'success');
                this.closeModal(document.getElementById('editTicketModal'));
                
                // Перезагружаем билеты в зависимости от текущего контекста
                if (this.currentSessionInfo && this.currentSessionInfo.sessionId) {
                    await this.loadTicketsForSession(this.currentSessionInfo.sessionId);
                } else {
                    await this.loadTickets(this.currentTicketFilters);
                }
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при обновлении билета: ' + error.message, 'error');
        }
    }
});