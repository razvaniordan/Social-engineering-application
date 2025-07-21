export function refreshToken() {
    return fetch('/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTTP status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken); // Update the stored access token
            return data.accessToken;
        } else {
            throw new Error('Missing access token');
        }
    })
    .catch(error => {
        localStorage.removeItem('accessToken'); // Clear invalid or expired tokens
        throw error; // Rethrow the error for the next catch block
    });
}

export function handleResponse(response) {
    if (response.ok) return response.json();
    if (response.status === 401) {
        // Unauthorized, attempt to refresh the token
        return refreshToken().then(() => {
            // After refresh, retry the original request
            return fetch(response.url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            }).then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch after token refresh');
            });
        });
    }
    throw new Error('Network response was not ok.');
}

export function logout(failedAuth = false) {
    if (failedAuth) {
        //alert('Session expired, please login again.');
    }
    // Here we send a request to the server to remove the refresh token from the database
    fetch('/logout', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: refreshToken })
    }).then(() => {
        localStorage.removeItem('accessToken');
        window.location.href = '/'; // Redirect to the login page
    }).catch(error => {
        console.error('Error invalidating refresh token:', error);
    });
}
