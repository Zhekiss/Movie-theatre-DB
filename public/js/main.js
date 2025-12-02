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
        this.ticketStatsLoaded = false;
        this.init();
    }

    init() {
        this.loadFilms();
        this.loadHalls();
        this.loadSessions();
        this.loadTickets();
        this.setupEventListeners();
        this.setupSearchForm();
        this.loadTicketStats();
        this.setupModalEvents();
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
        document.getElementById('showAddTicketForm')?.addEventListener('click', () => {
            this.showAddForm('addTicketForm');
            this.populateSessionSelect();
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
        document.getElementById('ticketForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTicket();
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
        document.getElementById('cancelTicket')?.addEventListener('click', () => {
            this.hideAddForm('addTicketForm');
        });

        // Формы редактирования в модальных окнах
        document.getElementById('editFilmForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFilmEdit();
        });
        document.getElementById('editHallForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHallEdit();
        });
        document.getElementById('editSessionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSessionEdit();
        });
        document.getElementById('editTicketForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTicketEdit();
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
        document.getElementById('cancelEditHall')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editHallModal'));
        });
        document.getElementById('cancelEditSession')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editSessionModal'));
        });
        document.getElementById('cancelEditTicket')?.addEventListener('click', () => {
            this.closeModal(document.getElementById('editTicketModal'));
        });
    }

    // Утилиты для форм добавления
    showAddForm(formId) {
        document.getElementById(formId).style.display = 'block';
        document.getElementById(formId).scrollIntoView({ behavior: 'smooth' });
    }

    hideAddForm(formId) {
        document.getElementById(formId).style.display = 'none';
        if (formId === 'addFilmForm') this.resetFilmForm();
        if (formId === 'addHallForm') this.resetHallForm();
        if (formId === 'addSessionForm') this.resetSessionForm();
        if (formId === 'addTicketForm') this.resetTicketForm();
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
        
        // При переключении на вкладку билетов обновляем список сеансов
        if (tabName === 'tickets') {
            this.populateSessionSelect();
            this.loadTickets(this.currentTicketFilters);
            
            if (!this.ticketStatsLoaded) {
                this.loadTicketStats();
            }
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    window.cinemaManager = new CinemaManager();
});