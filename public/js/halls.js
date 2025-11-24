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
    },

    editHall(id, number, capacity) {
        document.getElementById('hallId').value = id;
        document.getElementById('hallNumber').value = number;
        document.getElementById('capacity').value = capacity;
        document.getElementById('hallFormTitle').textContent = 'Редактировать зал';
        this.currentEditingHallId = id;
        
        document.getElementById('hallForm').scrollIntoView({ behavior: 'smooth' });
    },

    resetHallForm() {
        document.getElementById('hallForm').reset();
        document.getElementById('hallId').value = '';
        document.getElementById('hallFormTitle').textContent = 'Добавить зал';
        this.currentEditingHallId = null;
    },

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
                await this.loadSessions();
                await this.loadTickets();
            } else {
                this.showMessage(result.error || 'Произошла ошибка при удалении', 'error');
            }
        } catch (error) {
            this.showMessage('Ошибка при удалении зала: ' + error.message, 'error');
        }
    }
});