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
        this.init();
    }

    init() {
        this.loadFilms();
        this.loadHalls();
        this.loadSessions();
        this.loadTickets();
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

        // Ticket form
        document.getElementById('ticketForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTicket();
        });

        document.getElementById('cancelTicket').addEventListener('click', () => {
            this.resetTicketForm();
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
        
        // При переключении на вкладку билетов обновляем список сеансов и показываем билеты
        if (tabName === 'tickets') {
            this.populateSessionSelect();
            this.loadTickets(this.currentTicketFilters);
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