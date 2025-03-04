
    const hamBurger = document.querySelector(".toggle-btn");

    hamBurger.addEventListener("click", function () {
    document.querySelector("#sidebar").classList.toggle("expand");
    });

    function home() {
        window.location.href = '/home';
    }

    function editEmp() {
        window.location.href = '/edit';
    }

    function sendingProfiles() {
        window.location.href = '/profiles';
    }

    function sendEmails() {
        window.location.href = '/send';
    }

    function groups() {
        window.location.href = '/groups';
    }

    function refreshToken() {
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

    document.addEventListener('DOMContentLoaded', () => {

        refreshToken().then(() => {
            // After successfully refreshing the token, display the content and load data:
            document.querySelector('.wrapper').style.display = 'block';
        }).catch(() => {
            // If the token refresh fails, logout and redirect to the login page:
            logout(true);
        });
    });

    function logout(failedAuth = false) {
        if (failedAuth) {
            alert('Session expired, please login again.');
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