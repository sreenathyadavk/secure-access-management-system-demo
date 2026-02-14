// using global api instance from api.js

function escapeHtml(str) {
    if (str == null) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // Find the button that called this function - tricky without 'event' or 'this' in inline
    // But we are moving away from inline. 
    // We will attach event listeners in this script instead of onclick in HTML.

    // Actually, for simplicity in migration, I'll export this or attach to window.
    // Better: Attach to window for now to match the onclick="switchTab()" pattern which I am keeping?
    // NO! "onclick" in HTML IS inline script! CSP blocks it too usually?
    // Wait, CSP `script-src` 'self' blocks `<script>...</script>`.
    // Does it block `onclick="..."`? YES. It blocks inline event handlers.

    // I MUST remove onclick attributes and add event listeners.

    // Logic for tabs
    const usersTab = document.getElementById('users-tab');
    const auditTab = document.getElementById('audit-tab');

    if (tab === 'users') {
        usersTab.style.display = 'block';
        auditTab.style.display = 'none';
        loadUsers();
        document.getElementById('btn-users').classList.add('active');
        document.getElementById('btn-audit').classList.remove('active');
    } else {
        usersTab.style.display = 'none';
        auditTab.style.display = 'block';
        loadAuditLogs();
        document.getElementById('btn-users').classList.remove('active');
        document.getElementById('btn-audit').classList.add('active');
    }
}

async function loadUsers() {
    try {
        const res = await api.get('/admin/users');
        const tbody = document.getElementById('usersTableBody');
        const users = res.data?.users ?? [];
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${escapeHtml(user.email)}</td>
                <td>
                    <select class="role-select" data-userid="${escapeHtml(user.id)}" style="padding: 0.25rem;">
                        <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>USER</option>
                        <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                    </select>
                </td>
                <td>${escapeHtml(new Date(user.created_at).toLocaleDateString())}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-btn" data-userid="${escapeHtml(user.id)}">Delete</button>
                </td>
            </tr>
        `).join('');

        // Attach listeners to new elements
        document.querySelectorAll('.role-select').forEach(select => {
            select.onchange = (e) => updateRole(e.target.dataset.userid, e.target.value);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => deleteUser(e.target.dataset.userid);
        });

    } catch (err) {
        console.error(err);
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="error-msg">Failed to load users: ' + err.message + '</td></tr>';
    }
}

async function updateRole(userId, newRole) {
    if (!confirm(`Change role to ${newRole}?`)) return loadUsers();
    try {
        await api.patch(`/admin/users/${userId}/role`, { role: newRole });
        alert('Role updated');
    } catch (err) {
        alert(err.message);
        loadUsers();
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
        await api.delete(`/admin/users/${userId}`);
        loadUsers();
    } catch (err) {
        alert(err.message);
    }
}

async function loadAuditLogs() {
    try {
        const res = await api.get('/admin/audit-logs');
        const tbody = document.getElementById('auditTableBody');
        const logs = res.data?.logs ?? [];
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No logs found</td></tr>';
            return;
        }
        tbody.innerHTML = logs.map(log => {
            const action = String(log.action || '');
            const badgeClass = action.includes('FAIL') || action.includes('DELETE') ? 'badge-user' : 'badge-admin';
            const detailsStr = log.details != null ? JSON.stringify(log.details) : '';
            return `
                <tr>
                    <td>${escapeHtml(new Date(log.timestamp).toLocaleString())}</td>
                    <td><span class="badge ${badgeClass}">${escapeHtml(action)}</span></td>
                    <td>${escapeHtml(log.user ? log.user.email : 'Unknown')}</td>
                    <td style="font-family: monospace; font-size: 0.8em;">${escapeHtml(detailsStr)}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        const tbody = document.getElementById('auditTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="error-msg">Failed to load logs: ' + err.message + '</td></tr>';
    }
}

// Initial Load & Event Listeners
// Initial Load & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => api.logout());
    }

    // Tab Listeners
    const btnUsers = document.getElementById('btn-users');
    const btnAudit = document.getElementById('btn-audit');

    if (btnUsers) btnUsers.addEventListener('click', () => switchTab('users'));
    if (btnAudit) btnAudit.addEventListener('click', () => switchTab('audit'));

    // Refresh Buttons
    const refreshUsers = document.getElementById('refresh-users');
    const refreshAudit = document.getElementById('refresh-audit');

    if (refreshUsers) refreshUsers.addEventListener('click', loadUsers);
    if (refreshAudit) refreshAudit.addEventListener('click', loadAuditLogs);

    loadUsers();
});
