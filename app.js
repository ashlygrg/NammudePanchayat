/**
 * Nammude Panchayat - Core Logic
 */

// --- DATA MODELS ---

const CATEGORIES = [
    { id: 'road', name: 'Broken Road / Pothole', icon: '🛣️' },
    { id: 'light', name: 'Streetlight Issue', icon: '💡' },
    { id: 'water', name: 'Water Leak / Pipe', icon: '💧' },
    { id: 'drain', name: 'Drainage / Flood', icon: '🌊' },
    { id: 'waste', name: 'Garbage / Waste', icon: '🗑️' },
    { id: 'power', name: 'Electricity', icon: '⚡' },
    { id: 'prop', name: 'Public Damage', icon: '🏛️' },
    { id: 'other', name: 'Other', icon: '📋' }
];

const KERALA_LOCATIONS = [
    "Thiruvananthapuram, Palayam", "Kochi, Edappally", "Kozhikode, Mananchira",
    "Thrissur, Round North", "Kollam, Chinnakada", "Alappuzha, Beach Rd",
    "Kannur, Fort Rd", "Kottayam, Thirunakkara"
];

const OFFICERS = [
    { id: 'admin', pass: 'admin', role: 'admin', name: 'Super Admin' },
    { id: 'officer_road', pass: '123', role: 'officer', cat: 'road', name: 'Road Officer' },
    { id: 'officer_water', pass: '123', role: 'officer', cat: 'water', name: 'Water Officer' },
    { id: 'officer_light', pass: '123', role: 'officer', cat: 'light', name: 'Light Officer' }
];

// --- STORAGE MANAGER ---

class StorageManager {
    constructor() {
        this.key = 'np_issues';
        if (!localStorage.getItem(this.key)) {
            localStorage.setItem(this.key, JSON.stringify([]));
        }
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    }

    add(issue) {
        const issues = this.getAll();
        issues.push(issue);
        localStorage.setItem(this.key, JSON.stringify(issues));
    }

    updateStatus(id, newStatus) {
        const issues = this.getAll();
        const idx = issues.findIndex(i => i.id === id);
        if (idx !== -1) {
            issues[idx].status = newStatus;
            issues[idx].statusHistory.push({ status: newStatus, date: new Date().toISOString() });
            localStorage.setItem(this.key, JSON.stringify(issues));
            return true;
        }
        return false;
    }

    getById(id) {
        return this.getAll().find(i => i.id === id);
    }
}

const db = new StorageManager();

// --- AUTHENTICATION ---

class Auth {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('np_user') || 'null');
    }

    login(e) {
        e.preventDefault();
        const role = document.getElementById('login-role').value;
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        // Simple mock auth
        const account = OFFICERS.find(o => o.id === user && o.pass === pass && o.role === role);

        if (account) {
            this.user = account;
            localStorage.setItem('np_user', JSON.stringify(account));
            app.router.navigate('dashboard');
        } else {
            alert('Invalid credentials!');
        }
    }

    logout() {
        this.user = null;
        localStorage.removeItem('np_user');
        app.router.navigate('home');
    }
}

// --- CONTROLLERS ---

const ReportController = {
    selectedCategory: null,
    images: [],

    init: () => {
        const grid = document.getElementById('category-list');
        grid.innerHTML = CATEGORIES.map(c => `
            <div class="cat-card" onclick="app.controllers.report.selectCat('${c.id}', this)">
                <span class="cat-icon">${c.icon}</span>
                <span>${c.name}</span>
            </div>
        `).join('');

        // Char counter
        document.getElementById('issue-title').addEventListener('input', (e) => {
            document.getElementById('title-count').innerText = e.target.value.length;
        });
    },

    selectCat: (id, el) => {
        ReportController.selectedCategory = id;
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    },

    setLocationTab: (mode) => {
        document.querySelectorAll('.tab-content').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        document.getElementById(`loc-${mode}`).classList.remove('hidden');
        // Find the button that triggered this? Simplified selector:
        // Actually, just toggle classes based on click is safer in pure JS
        const btns = document.querySelectorAll('.tabs .tab-btn');
        if (mode === 'auto') {
            btns[0].classList.add('active');
            btns[1].classList.remove('active');
        } else {
            btns[1].classList.add('active');
            btns[0].classList.remove('active');
        }
    },

    detectLocation: () => {
        const btn = document.querySelector('#loc-auto button');
        btn.innerText = "🛰️ Locating...";

        setTimeout(() => {
            // Mock Location
            const randLoc = KERALA_LOCATIONS[Math.floor(Math.random() * KERALA_LOCATIONS.length)];
            const lat = (8 + Math.random() * 2).toFixed(4);
            const lng = (76 + Math.random() * 1).toFixed(4);

            document.getElementById('detected-address').innerText = `✅ Found: ${randLoc} (${lat}, ${lng})`;
            document.getElementById('final-location').value = randLoc;
            btn.innerText = "📍 Detect Again";
        }, 1500);
    },

    manualLocationInput: (el) => {
        document.getElementById('final-location').value = el.value;
    },

    handleFiles: (input) => {
        const files = Array.from(input.files).slice(0, 3);
        ReportController.images = [];
        const preview = document.getElementById('preview-area');
        preview.innerHTML = '';
        document.getElementById('photo-count').innerText = `${files.length}/3 images selected`;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                ReportController.images.push(e.target.result); // Base64
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '60px'; img.style.height = '60px'; img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    },

    toggleContact: (el) => {
        const fields = document.getElementById('contact-fields');
        fields.style.display = el.checked ? 'none' : 'block';
    },

    submit: (e) => {
        e.preventDefault();
        if (!ReportController.selectedCategory) { alert('Please select a category'); return; }
        if (!document.getElementById('final-location').value) { alert('Please set a location'); return; }

        const issue = {
            id: 'PTH-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
            category: ReportController.selectedCategory,
            title: document.getElementById('issue-title').value,
            desc: document.getElementById('issue-desc').value,
            images: ReportController.images,
            location: document.getElementById('final-location').value,
            urgency: document.querySelector('input[name="urgency"]:checked').value,
            isAnonymous: document.getElementById('anon-check').checked,
            contact: {
                phone: document.getElementById('contact-phone').value,
                email: document.getElementById('contact-email').value
            },
            status: 'Submitted',
            date: new Date().toLocaleDateString(),
            statusHistory: [{ status: 'Submitted', date: new Date().toISOString() }]
        };

        db.add(issue);
        document.getElementById('success-tracking-id').innerText = issue.id;
        app.router.navigate('success');
        e.target.reset();
        ReportController.images = [];
        ReportController.selectedCategory = null;
        document.getElementById('preview-area').innerHTML = '';
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
    },

    copyId: () => {
        const text = document.getElementById('success-tracking-id').innerText;
        navigator.clipboard.writeText(text);
        alert('Copied ID: ' + text);
    }
};

const TrackController = {
    search: () => {
        const id = document.getElementById('track-input').value.trim();
        const issue = db.getById(id);
        const resDiv = document.getElementById('track-result');
        const errDiv = document.getElementById('track-error');

        if (!issue) {
            resDiv.classList.add('hidden');
            errDiv.classList.remove('hidden');
            return;
        }

        errDiv.classList.add('hidden');
        resDiv.classList.remove('hidden');

        const catName = CATEGORIES.find(c => c.id === issue.category)?.name || issue.category;

        resDiv.innerHTML = `
            <div class="card-action" style="text-align: left; cursor: default; margin-top: 1rem;">
                <div style="display:flex; justify-content:space-between;">
                   <span class="badge badge-${issue.status.replace(' ', '')}">${issue.status}</span>
                   <small>${issue.date}</small>
                </div>
                <h3 style="margin: 0.5rem 0;">${issue.title}</h3>
                <p><strong>Category:</strong> ${catName}</p>
                <p><strong>Location:</strong> ${issue.location}</p>
                <p style="margin-top: 0.5rem; color: var(--text-muted);">${issue.desc}</p>
                <div style="margin-top: 1rem; display:flex; gap: 0.5rem;">
                   ${issue.images.map(src => `<img src="${src}" style="width:50px; height:50px; border-radius:4px;">`).join('')}
                </div>
                <div class="timeline" style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <h4>Tracking Timeline</h4>
                    ${issue.statusHistory.map(h => `
                        <div class="timeline-item">
                            <small>${new Date(h.date).toLocaleDateString()}</small>
                            <strong>${h.status}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

const DashboardController = {
    currentUser: null,

    load: () => {
        const user = app.auth.user;
        if (!user) { app.router.navigate('login'); return; }
        document.getElementById('dash-role-badge').innerText = user.role.toUpperCase() + (user.cat ? ` (${user.cat})` : '');

        DashboardController.renderStats();
        DashboardController.renderList();
    },

    renderStats: () => {
        const issues = db.getAll();
        const total = issues.length;
        const pending = issues.filter(i => i.status === 'Submitted').length;
        const resolved = issues.filter(i => i.status === 'Resolved').length;

        document.getElementById('dash-stats').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${total}</div>
                <div class="stat-label">Total Reports</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: var(--warning);">${pending}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: var(--success);">${resolved}</div>
                <div class="stat-label">Resolved</div>
            </div>
        `;
    },

    renderList: () => {
        const user = app.auth.user;
        const statusFilter = document.getElementById('filter-status').value;
        let issues = db.getAll();

        // 1. Filter by Officer Role
        if (user.role === 'officer') {
            issues = issues.filter(i => i.category === user.cat);
        }

        // 2. Filter by dropdown
        if (statusFilter !== 'all') {
            issues = issues.filter(i => i.status === statusFilter);
        }

        const tbody = document.getElementById('dash-table-body');
        tbody.innerHTML = issues.map(i => `
            <tr>
                <td>${i.id}</td>
                <td>${CATEGORIES.find(c => c.id === i.category)?.name || i.category}</td>
                <td>${i.location}</td>
                <td>${i.date}</td>
                <td><span class="badge badge-${i.status.replace(' ', '')}">${i.status}</span></td>
                <td>
                    ${i.status !== 'Resolved' ?
                `<button class="btn-sm btn-primary" onclick="app.controllers.dashboard.resolve('${i.id}')">Resolve</button>` :
                '<span style="color:var(--success)">Done</span>'}
                </td>
            </tr>
        `).join('');
    },

    resolve: (id) => {
        if (confirm('Mark this issue as Resolved?')) {
            db.updateStatus(id, 'Resolved');
            DashboardController.renderList();
            DashboardController.renderStats();
        }
    },

    switchTab: (tabId) => {
        document.querySelectorAll('.dash-tab').forEach(d => d.classList.add('hidden'));
        document.getElementById(`dash-tab-${tabId}`).classList.remove('hidden');

        // Update buttons
        const btnIndex = tabId === 'list' ? 0 : 1;
        const btns = document.querySelectorAll('.dash-controls .tab-btn');
        btns.forEach(b => b.classList.remove('active'));
        if (btns[btnIndex]) btns[btnIndex].classList.add('active');
    },

    exportData: () => {
        alert('Data export simulation: Downloading report.csv...');
    }
};

// --- ROUTER ---

const app = {
    auth: new Auth(),
    controllers: {
        report: ReportController,
        track: TrackController,
        auth: new Auth(), // Alias
        dashboard: DashboardController
    },
    router: {
        navigate: (viewId, skipCheck = false) => {
            // Guard clauses
            if (viewId === 'dashboard' && !app.auth.user) {
                viewId = 'login';
            }

            // Hide all
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

            // Show Target
            const target = document.getElementById(`view-${viewId}`);
            if (target) {
                target.classList.remove('hidden');

                // Initialize specific views
                if (viewId === 'report') ReportController.init();
                if (viewId === 'dashboard') DashboardController.load();
                window.scrollTo(0, 0);
            }
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in? 
    // For now simple routing
    app.router.navigate('home');

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            themeBtn.innerText = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeBtn.innerText = '☀️';
        }
    });

    // Populate Category Filter in Dashboard
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
        CATEGORIES.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name;
            catSelect.appendChild(opt);
        });
    }
});
