const API_URL = '/api/';

async function fetchUsers() {
    const response = await fetch(`${API_URL}users/`);
    return await response.json();
}

async function fetchGames() {
    const response = await fetch(`${API_URL}games/`);
    return await response.json();
}

async function createUser(data) {
    const response = await fetch(`${API_URL}users/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function createGame(data) {
    const response = await fetch(`${API_URL}games/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return await response.json();
}

// Add similar functions for update and delete operations

