// Функционал для работы с билетами
Object.assign(CinemaManager.prototype, {
    // Загрузка билетов
    async loadTickets(filters = {}) {
        try {
            const url = new URL('/api/tickets', window.location.origin);
            
            // Добавляем фильтры, если есть
            if (filters.session_id) {
                url.searchParams.append('session_id', filters.session_id);
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            
            this.tickets = await response.json();
            this.renderTicketsTable(this.tickets);
        } catch (error) {
            this.showMessage('Ошибка при загрузке билетов: ' + error.message, 'error');
        }
    },

    // Показать заголовок сеанса
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

    // Скрыть заголовок сеанса
    hideSessionHeader() {
        const header = document.getElementById('ticketSessionHeader');
        const mainTitle = document.getElementById('ticketsMainTitle');

        if (header && mainTitle) {
            mainTitle.style.display = 'block';
            header.style.display = 'none';
            this.currentSessionInfo = null;
        }
    },

    // Отрисовка таблицы билетов
    renderTicketsTable(tickets) {
        const tbody = document.getElementById('ticketsTableBody');
        const thead = document.getElementById('ticketsTableHeader');
        
        if (!tbody || !thead) {
            console.error('Элементы таблицы билетов не найдены');
            return;
        }
        
        tbody.innerHTML = '';

        if (tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-results">
                        Билеты не найдены.
                    </td>
                </tr>
            `;
            return;
        }

        // Определяем, показываем ли мы информацию о сеансе в заголовке
        const showSessionInfo = this.currentSessionInfo;
        
        // Обновляем заголовок таблицы в зависимости от режима
        if (showSessionInfo) {
            // В режиме просмотра сеанса показываем упрощенный заголовок
            thead.innerHTML = `
                <tr>
                    <th>ID</th>
                    <th>Покупатель</th>
                    <th>Ряд</th>
                    <th>Место</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            `;
        } else {
            // В общем режиме показываем полный заголовок
            thead.innerHTML = `
                <tr>
                    <th>ID</th>
                    <th>Сеанс</th>
                    <th>Фильм</th>
                    <th>Зал</th>
                    <th>Покупатель</th>
                    <th>Ряд</th>
                    <th>Место</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            `;
        }

        tickets.forEach(ticket => {
            const row = document.createElement('tr');
            const statusText = ticket.is_occupied ? 'Занято' : 'Свободно';
            const statusClass = ticket.is_occupied ? 'occupied' : 'free';
            
            if (showSessionInfo) {
                // Упрощенный вид для режима сеанса
                row.innerHTML = `
                    <td>${ticket.ticket_id}</td>
                    <td>${this.escapeHtml(ticket.customer_name || '')}</td>
                    <td>${ticket.row_number}</td>
                    <td>${ticket.seat_number}</td>
                    <td><span class="ticket-status ${statusClass}">${statusText}</span></td>
                    <td class="actions-cell">
                        <button class="edit-ticket-btn" data-id="${ticket.ticket_id}" data-customer="${this.escapeHtml(ticket.customer_name || '')}" data-occupied="${ticket.is_occupied}" data-row="${ticket.row_number}" data-seat="${ticket.seat_number}">Редактировать</button>
                    </td>
                `;
            } else {
                // Полный вид для общего режима
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
            }
            
            tbody.appendChild(row);
        });

        this.attachTicketEventListeners();
    },

    // Привязка обработчиков событий к кнопкам редактирования
    attachTicketEventListeners() {
        document.querySelectorAll('.edit-ticket-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const customer = e.target.getAttribute('data-customer');
                const occupied = e.target.getAttribute('data-occupied');
                const row = e.target.getAttribute('data-row');
                const seat = e.target.getAttribute('data-seat');
                
                if (this.currentSessionInfo) {
                    // В режиме сеанса используем информацию из currentSessionInfo
                    this.editTicket(id, customer, occupied, row, seat);
                } else {
                    // В общем режиме получаем дополнительные данные из data-атрибутов
                    const film = e.target.getAttribute('data-film');
                    const time = e.target.getAttribute('data-time');
                    const hall = e.target.getAttribute('data-hall');
                    this.editTicket(id, customer, occupied, row, seat, film, time, hall);
                }
            });
        });
    },

    // Редактирование билета
    editTicket(id, customer, occupied, row, seat, film = null, time = null, hall = null) {
        document.getElementById('editTicketId').value = id;
        document.getElementById('editTicketCustomer').value = customer || '';
        document.getElementById('editTicketOccupied').value = occupied;
        
        const ticketInfo = document.getElementById('editTicketInfo');
        
        if (this.currentSessionInfo) {
            // Используем информацию из сеанса
            ticketInfo.innerHTML = `
                <div class="ticket-details">
                    <p><strong>Фильм:</strong> ${this.currentSessionInfo.filmTitle}</p>
                    <p><strong>Время сеанса:</strong> ${new Date(this.currentSessionInfo.sessionTime).toLocaleString('ru-RU')}</p>
                    <p><strong>Зал:</strong> ${this.currentSessionInfo.hallNumber}</p>
                    <p><strong>Место:</strong> Ряд ${row}, Место ${seat}</p>
                </div>
            `;
        } else if (film && time && hall) {
            // Используем информацию из атрибутов
            ticketInfo.innerHTML = `
                <div class="ticket-details">
                    <p><strong>Фильм:</strong> ${film}</p>
                    <p><strong>Время сеанса:</strong> ${time}</p>
                    <p><strong>Зал:</strong> ${hall}</p>
                    <p><strong>Место:</strong> Ряд ${row}, Место ${seat}</p>
                </div>
            `;
        } else {
            ticketInfo.innerHTML = `
                <div class="ticket-details">
                    <p><strong>Место:</strong> Ряд ${row}, Место ${seat}</p>
                </div>
            `;
        }
        
        this.openModal('editTicketModal');
    },

    // Сохранение изменений билета
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
                
                // Перезагружаем билеты с текущими фильтрами
                if (this.currentSessionInfo && this.currentSessionInfo.sessionId) {
                    await this.loadTickets({ session_id: this.currentSessionInfo.sessionId });
                } else {
                    await this.loadTickets();
                }
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при обновлении билета: ' + error.message, 'error');
        }
    },

    // Показать все билеты (обработчик для кнопки "Показать все билеты")
    showAllTickets() {
        this.currentSessionInfo = null;
        this.hideSessionHeader();
        this.loadTickets();
    },

    // Настройка обработчиков событий (должна вызываться из main.js)
    setupTicketEventListeners() {
        // Кнопка "Показать все билеты"
        document.getElementById('showAllTickets')?.addEventListener('click', () => {
            this.showAllTickets();
        });

        // Кнопка отмены в модальном окне редактирования билета
        document.getElementById('cancelEditTicket')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editTicketModal'));
        });
    }
});