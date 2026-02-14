// using global api instance from api.js
async function loadDashboard() {
    try {
        const res = await api.get('/user/dashboard');
        const user = res.data.user;

        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('userId').textContent = user.id;

        const roleEl = document.getElementById('profileRole');
        roleEl.textContent = user.role;
        roleEl.className = 'badge ' + (user.role === 'ADMIN' ? 'badge-admin' : 'badge-user');

        if (user.role === 'ADMIN') {
            // Show link to admin panel
            const nav = document.querySelector('.nav-links');
            const adminLink = document.createElement('a');
            adminLink.href = '/admin.html';
            adminLink.textContent = 'Admin Panel';
            adminLink.style.marginRight = '1rem';
            nav.prepend(adminLink);
        }
    } catch (err) {
        console.error(err);
        // Auth failure handled by api.js
    }
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => api.logout());
    }
}
loadDashboard();
