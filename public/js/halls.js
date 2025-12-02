// Расширяем класс CinemaManager для функциональности залов
Object.assign(CinemaManager.prototype, {
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
    },

    renderHallsTable(halls) {
        const tbody = document.getElementById('hallsTable');
        tbody.innerHTML = '';

        if (halls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет данных о залах</td></tr>';
            return;
        }

        halls.forEach(hall => {
            const totalSeats = hall.rows_count * hall.seats_per_row;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${hall.hall_id}</td>
                <td>${hall.hall_number}</td>
                <td>${hall.rows_count}</td>
                <td>${hall.seats_per_row}</td>
                <td>${totalSeats}</td>
                <td class="actions-cell">
                    <button class="edit-hall-btn" data-id="${hall.hall_id}" data-number="${hall.hall_number}" data-rows="${hall.rows_count}" data-seats="${hall.seats_per_row}">Редактировать</button>
                    <button class="delete delete-hall-btn" data-id="${hall.hall_id}" data-number="${hall.hall_number}">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.edit-hall-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const number = e.target.getAttribute('data-number');
                const rows = e.target.getAttribute('data-rows');
                const seats = e.target.getAttribute('data-seats');
                this.editHall(id, number, rows, seats);
            });
        });

        document.querySelectorAll('.delete-hall-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const number = e.target.getAttribute('data-number');
                this.deleteHall(id, number);
            });
        });
    },

    editHall(id, number, rows, seats) {
        document.getElementById('editHallId').value = id;
        document.getElementById('editHallNumber').value = number;
        document.getElementById('editRowsCount').value = rows;
        document.getElementById('editSeatsPerRow').value = seats;
        
        this.openModal('editHallModal');
    },

    resetHallForm() {
        const form = document.getElementById('hallForm');
        if (form) form.reset();
        document.getElementById('hallId').value = '';
        this.currentEditingHallId = null;
    },

    async saveHall() {
        const hallData = {
            hall_number: document.getElementById('hallNumber').value,
            rows_count: document.getElementById('rowsCount').value,
            seats_per_row: document.getElementById('seatsPerRow').value
        };

        // Валидация
        if (hallData.hall_number <= 0) {
            this.showMessage('Номер зала должен быть положительным числом', 'error');
            return;
        }
        if (hallData.rows_count <= 0) {
            this.showMessage('Количество рядов должно быть положительным числом', 'error');
            return;
        }
        if (hallData.seats_per_row <= 0) {
            this.showMessage('Количество мест в ряду должно быть положительным числом', 'error');
            return;
        }

        try {
            const url = '/api/halls';
            const method = 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(hallData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Зал добавлен', 'success');
                this.hideAddForm('addHallForm');
                await this.loadHalls();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при сохранении зала: ' + error.message, 'error');
        }
    },

    async saveHallEdit() {
        const hallData = {
            hall_number: document.getElementById('editHallNumber').value,
            rows_count: document.getElementById('editRowsCount').value,
            seats_per_row: document.getElementById('editSeatsPerRow').value
        };

        const hallId = document.getElementById('editHallId').value;

        // Валидация
        if (hallData.hall_number <= 0) {
            this.showMessage('Номер зала должен быть положительным числом', 'error');
            return;
        }
        if (hallData.rows_count <= 0) {
            this.showMessage('Количество рядов должно быть положительным числом', 'error');
            return;
        }
        if (hallData.seats_per_row <= 0) {
            this.showMessage('Количество мест в ряду должно быть положительным числом', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/halls/${hallId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(hallData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Зал обновлен', 'success');
                this.closeModal(document.getElementById('editHallModal'));
                await this.loadHalls();
            } else {
                this.showMessage(result.error || 'Произошла ошибка', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при обновлении зала: ' + error.message, 'error');
        }
    },

    async deleteHall(id, hallNumber) {
        const confirmed = confirm(`Вы уверены, что хотите удалить зал №${hallNumber}?\n\nЭто действие также удалит ВСЕ сеансы в этом зале и ВСЕ билеты на эти сеансы.\n\nЭто действие нельзя отменить.`);
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/halls/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(result.message, 'success');
                await this.loadHalls();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении зала: ' + error.message, 'error');
        }
    }
});