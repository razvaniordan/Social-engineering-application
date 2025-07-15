// As the name suggests, it is for the checkbox of pass visibility
function togglePasswordVisibility() {
    var passwordInput = document.getElementById('passd');
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
}

// This is the login function in order to check the user from database
document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('accessToken');
    if (token) {
        window.location.href = '/home'; // Redirect to login if no token
    } else {
        document.querySelector('.wrapper').style.display = 'block'; 
    }

    const loginForm = document.querySelector('form');
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission

        const formData = new FormData(loginForm);
        const username = formData.get('username');
        const password = formData.get('password');

        fetch('/login', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Invalid username or password') {
            // Handle login failure, e.g., show an error message
            alert('Invalid username or password');
            formData.set('username', ''); // Clear username from formData
            formData.set('password', ''); // Clear password from formData
            document.querySelector('input[name="username"]').value = ''; // Clear username input field
            document.querySelector('input[name="password"]').value = ''; // Clear password input field
            } else {
            // Handle login success, e.g., redirect to another page
            const accessToken = data.accessToken;
            localStorage.setItem('accessToken', accessToken);
            const token = localStorage.getItem('accessToken');
            fetch('/home', {
                headers: {
                'Authorization': `Bearer ${token}`
                }
            })

            window.location.href = '/home';
            }
        })
        .catch(error => console.error('Error:', error));
    });
});