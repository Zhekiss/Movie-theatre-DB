// Основной класс приложения
class CinemaManager {
    constructor() {
        this.currentEditingFilmId = null;
        this.currentEditingHallId = null;
        this.currentEditingSessionId = null;
        this.currentEditingTicketId = null;
        this.films = [];
        this.halls = [];
        this.sessions = [];
        this.tickets = [];
        this.currentTicketFilters = {};
        this.currentSessionInfo = null; // Информация о текущем сеансе для показа билетов
        this.init();
    }

    init() {
        this.loadFilms();
        this.loadHalls();
        this.loadSessions();
        this.loadTickets();
        this.setupEventListeners();
        this.setupModalEvents();
        this.setupTicketEventListeners(); // Добавляем обработчики для билетов
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.openTab(e.target.getAttribute('data-tab'));
            });
        });

        // Кнопки показа форм добавления
        document.getElementById('showAddFilmForm')?.addEventListener('click', () => {
            this.showAddForm('addFilmForm');
        });
        document.getElementById('showAddHallForm')?.addEventListener('click', () => {
            this.showAddForm('addHallForm');
        });
        document.getElementById('showAddSessionForm')?.addEventListener('click', () => {
            this.showAddForm('addSessionForm');
            this.populateFilmAndHallSelects();
        });

        // Формы добавления
        document.getElementById('filmForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFilm();
        });
        document.getElementById('hallForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHall();
        });
        document.getElementById('sessionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSession();
        });

        // Кнопки отмены в формах добавления
        document.getElementById('cancelFilm')?.addEventListener('click', () => {
            this.hideAddForm('addFilmForm');
        });
        document.getElementById('cancelHall')?.addEventListener('click', () => {
            this.hideAddForm('addHallForm');
        });
        document.getElementById('cancelSession')?.addEventListener('click', () => {
            this.hideAddForm('addSessionForm');
        });

        // Формы редактирования в модальных окнах
        document.getElementById('editFilmForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFilmEdit();
        });
        document.getElementById('editSessionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSessionEdit();
        });
        document.getElementById('editTicketForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTicketEdit();
        });
        document.getElementById('showFilmRevenue')?.addEventListener('click', () => {
        this.showFilmRevenue();
        });
    }

    setupModalEvents() {
        // Закрытие модальных окон
        document.querySelectorAll('.close-modal, .modal').forEach(element => {
            if (element.classList.contains('close-modal')) {
                element.addEventListener('click', () => {
                    this.closeModal(element.closest('.modal'));
                });
            } else {
                element.addEventListener('click', (e) => {
                    if (e.target === element) {
                        this.closeModal(element);
                    }
                });
            }
        });

        // Кнопки отмены в модальных окнах
        document.getElementById('cancelEditFilm')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editFilmModal'));
        });
        document.getElementById('cancelEditSession')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editSessionModal'));
        });
        document.getElementById('cancelEditTicket')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editTicketModal'));
        });

        const revenueModal = document.getElementById('revenueModal');
    if (revenueModal) {
        revenueModal.addEventListener('click', (e) => {
            if (e.target === revenueModal || e.target.classList.contains('close-modal')) {
                this.closeModal(revenueModal);
            }
        });
    }
    }

    setupTicketEventListeners() {
        // Кнопка "Показать все билеты"
        document.getElementById('showAllTickets')?.addEventListener('click', () => {
            this.showAllTickets();
        });
    }

    // Утилиты для форм добавления
    showAddForm(formId) {
        const formElement = document.getElementById(formId);
        if (formElement) {
            formElement.style.display = 'block';
            formElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideAddForm(formId) {
        const formElement = document.getElementById(formId);
        if (formElement) {
            formElement.style.display = 'none';
            if (formId === 'addFilmForm') this.resetFilmForm();
            if (formId === 'addHallForm') this.resetHallForm();
            if (formId === 'addSessionForm') this.resetSessionForm();
        }
    }

    // Утилиты для модальных окон
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
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
        
        // При переключении на вкладку билетов
        if (tabName === 'tickets') {
            // Если есть информация о сеансе, показываем билеты только этого сеанса
            if (this.currentSessionInfo && this.currentSessionInfo.sessionId) {
                this.showSessionHeader();
                this.loadTickets({ session_id: this.currentSessionInfo.sessionId });
            } else {
                // Иначе показываем все билеты
                this.hideSessionHeader();
                this.loadTickets();
            }
        }
    }

    // Показать все билеты
    showAllTickets() {
        this.currentSessionInfo = null;
        this.hideSessionHeader();
        this.loadTickets();
    }

    // Utility functions
    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        if (!messageDiv) return;
        
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

    // Методы для работы с формами (будут переопределены в других файлах)
    loadFilms() {}
    loadHalls() {}
    loadSessions() {}
    loadTickets() {}
    renderFilmsTable() {}
    renderHallsTable() {}
    renderSessionsTable() {}
    renderTicketsTable() {}
    populateFilmAndHallSelects() {}
    populateSessionSelect() {}
    editFilm() {}
    editSession() {}
    editTicket() {}
    saveFilm() {}
    saveFilmEdit() {}
    saveHall() {}
    saveSession() {}
    saveSessionEdit() {}
    saveTicketEdit() {}
    resetFilmForm() {}
    resetHallForm() {}
    resetSessionForm() {}
    resetTicketForm() {}
    deleteFilm() {}
    deleteHall() {}
    deleteSession() {}
    showSessionHeader() {}
    hideSessionHeader() {}
    showFilmRevenue() {}
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    window.cinemaManager = new CinemaManager();
});