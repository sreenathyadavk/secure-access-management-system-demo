// Toggle Forms
document.getElementById('showRegister').onclick = (e) => {
    e.preventDefault();
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
};
document.getElementById('showLogin').onclick = (e) => {
    e.preventDefault();
    document.getElementById('register-form-container').style.display = 'none';
    document.getElementById('login-form-container').style.display = 'block';
};

// using global api instance from api.js

// Login Handler
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const res = await api.post('/auth/login', { email, password });
        api.setToken(res.token);
        // Redirect based on role
        const profile = await api.get('/user/dashboard');
        if (profile.data.user.role === 'ADMIN') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/dashboard.html';
        }
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
    }
};

// Register Handler
document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('register-error');

    try {
        const res = await api.post('/auth/register', { email, password });
        api.setToken(res.token);
        window.location.href = '/dashboard.html';
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
    }
};
