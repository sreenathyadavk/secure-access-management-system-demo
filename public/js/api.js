class API {
    constructor() {
        this.baseUrl = '/api';
    }

    getToken() {
        return localStorage.getItem('token');
    }

    setToken(token) {
        localStorage.setItem('token', token);
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        let data = null;
        if (isJson && response.status !== 204) {
            try {
                data = await response.json();
            } catch (_) {
                // ignore parse error for malformed JSON
            }
        }

        if (!response.ok) {
            if (response.status === 401 && !endpoint.includes('login')) {
                this.logout();
            }
            const message = (data && data.message) || 'Something went wrong';
            throw new Error(message);
        }

        return data;
    }

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET',
        });
    }

    async patch(endpoint, body) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    }
}

const api = new API();
