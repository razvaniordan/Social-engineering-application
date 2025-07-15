import { initSidebar, attachNavHandlers, showMessage } from "../shared/app.js";
import { refreshToken, handleResponse, logout } from "../shared/auth.js";

initSidebar();

function goToHome() { window.location.href = '/home'; }
function goToEmployees() { window.location.href = '/employees'; }
function goToSendingProfiles() { window.location.href = '/profiles'; }
function goToCampaigns() { window.location.href = '/campaigns'; }
function goToGroups() { window.location.href = '/groups'; }

let currentPage = 0; // Current page index
let totalProfiles = 0; // Total number of profiles
const pageSize = 10; // Profiles per page

let globalProfiles = [];
const searchInput = document.getElementById('searchProfileName');

function changePage(direction) {

    const newPage = currentPage + direction;
    // Check new page is within range
    if (newPage < 0 || newPage * pageSize >= totalProfiles) return;
    currentPage = newPage;
    fetchProfiles();
}

function updatePageIndicator(total, currentPage, pageSize) {
    document.getElementById('pageIndicator').textContent = `Page ${currentPage + 1} of ${Math.ceil(total / pageSize)}`;
}

let debounceTimeout;
const debounceDelay = 300; // milliseconds

function debouncedLoadProfiles() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        currentPage = 0; // Reset to first page when searching
        fetchProfiles();
    }, debounceDelay);
}

document.getElementById('searchProfileName').addEventListener('input', debouncedLoadProfiles);

document.addEventListener('DOMContentLoaded', () => {
    refreshToken().then(() => {
        // After successfully refreshing the token, display the content and load data:
        document.querySelector('.wrapper').style.display = 'block';
        fetchProfiles();
        attachNavHandlers({
            home: goToHome,
            employees: goToEmployees,
            profiles: goToSendingProfiles,
            groups: goToGroups,
            campaigns: goToCampaigns,
            logoutFn: logout
        });
    }).catch(() => {
        // If the token refresh fails, redirect to the login page:
        logout(true);
    });

    document.getElementById('btnAddProfile')?.addEventListener('click', addProfile);
    document.getElementById('btnSaveProfileChanges')?.addEventListener('click', saveProfileChanges);
    document.getElementById('btnNextPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(1);
    });
    document.getElementById('btnPrevPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(-1);
    });
});

function fetchProfiles() {
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };

    fetch(`/getProfiles?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`, fetchOptions)
        .then(handleResponse) // This will check for 401 status and attempt to refresh the token.
        //.then(response => response.json())
        .then(data => {
            globalProfiles = data.rows;
            totalProfiles = data.count;
            loadProfiles(globalProfiles);
            // Check if the current page is beyond the new total pages and adjust accordingly
            const totalPageCount = Math.ceil(totalProfiles / pageSize);
            if (currentPage >= totalPageCount) {
                currentPage = Math.max(0, totalPageCount - 1); // Adjust to the last page if current page exceeds total pages
                if (totalPageCount > 0){
                    fetchProfiles(); // Refetch employees for the new current page
                } else {
                    loadProfiles([]); // Prevent further execution in this call
                }
            } else {
                updatePageIndicator(totalProfiles, currentPage, pageSize);
                loadProfiles(globalProfiles);
            }

        }).catch(error => console.error('Error fetching sending profiles:', error.message));
}

function loadProfiles(profiles) { 
    const listContainer = document.getElementById('profileList');
    listContainer.innerHTML = '';
    //console.log(profiles);

    if (Array.isArray(profiles) && profiles.length > 0) {
        const table = document.createElement('table');
        table.className = 'table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th scope="col">Name</th>
                <th scope="col">Interface Type</th>
                <th scope="col">Last modified date</th>
                <th scope="col">Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        profiles.forEach(profile => {
            const row = document.createElement('tr');
            const updatedAt = new Date(profile.updatedAt);

            const readableDate = updatedAt.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            row.innerHTML = `
                <td>${profile.name}</td>
                <td>SMTP</td>
                <td>${readableDate}</td>
                <td>
                    <button class="btn btn-warning btn-sm" id="btnEditProfile">Edit</button>
                    <button class="btn btn-danger btn-sm" id="btnRemoveProfile">Remove</button>
                </td>
            `;
            tbody.appendChild(row);

            const editBtn      = row.querySelector('.btn-warning');
            const removeBtn    = row.querySelector('.btn-danger');

            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                editProfile(profile.id);
            });
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                removeProfile(profile.id, profile.name);
            });
        });

        table.appendChild(tbody);
        listContainer.appendChild(table);
    } else {
        listContainer.textContent = 'No profile found.';
    }
}

function addProfile() {
    const name = document.getElementById('modalProfileName').value;
    const smtpHost = document.getElementById('modalHost').value;
    const smtpPort = document.getElementById('modalPort').value;
    const username = document.getElementById('modalUsername').value;
    const password = document.getElementById('modalPassword').value;

    const sendAddProfileRequest = (token) => {
        fetch('/addSendingProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, smtpHost, smtpPort, username, password }),
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                console.error('Token expired. Attempting to refresh token...');
                throw new Error('Token expired or invalid'); // if we get this error
            } else if (response.status === 400) {
                throw new Error('The filling of all fields is required!');
            } else if (response.status === 413) {
                throw new Error('SMTP Port must be a number!');
            } else if (response.status === 409) {
                //throw new Error('Name already exists!');
                return response.json();
            }
        })
        .then(data => {
            showMessage(data.message, 'danger');
            if (data.message.includes('Sending profile added')) {
                messageDisplay.className = 'alert alert-success';
                fetchProfiles();
            }
            var modalElement = document.getElementById('addProfileModal');
            var modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            document.getElementById('modalProfileName').value = '';
            document.getElementById('modalHost').value = '';
            document.getElementById('modalPort').value = '';
            document.getElementById('modalUsername').value = '';
            document.getElementById('modalPassword').value = '';
        })
        .catch(error => {
            if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                refreshToken().then(newToken => {
                    sendAddProfileRequest(newToken); // try to send the request again with the new token
                    console.log('Token refreshed successfully!');
                }).catch(error => {
                    showMessage('Failed to refresh token. Please log in again.', 'danger');
                    logout(true); // redirect to the login page and logout
                });
            } else {
                showMessage(error.message, 'danger');
                var modalElement = document.getElementById('addProfileModal');
                var modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
                document.getElementById('modalProfileName').value = '';
                document.getElementById('modalHost').value = '';
                document.getElementById('modalPort').value = '';
                document.getElementById('modalUsername').value = '';
                document.getElementById('modalPassword').value = '';
            }
        });
    };

    sendAddProfileRequest(localStorage.getItem('accessToken'));
}

function removeProfile(id, profileName) {
    const confirmExit = confirm(`Are you sure you want to delete the profile ${profileName}?`);
    if (!confirmExit) {
        return; // Stop the function if the user cancels the operation
    }

    const attemptRemoveProfile = (token) => { // This attemptRemoveProfile function will be called recursively if the token needs to be refreshed
        fetch('/removeProfile', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, profileName }),
        })
        .then(result => {
            if(!result.ok) {
                if (result.status === 401 || result.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    return refreshToken().then(newToken => { // Refresh the token
                        console.log('Token refreshed successfully.');
                        return attemptRemoveProfile(newToken); // Retry the original request with the new token
                    });
                }
                if (result.status === 404) {
                    throw new Error('Profile not found');
                }
                throw new Error(`${result.status} - ${result.statusText}`);
            }
            return result.json();
        })
        .then(data => {
            showMessage(data.message, 'info'); // Show succes or failure
            fetchProfiles(); // Refresh the profile list
        })
        .catch(error => {
            console.error(error);
            showMessage(error.message, 'danger');
        });
    };

    // Start the process with the current token
    attemptRemoveProfile(localStorage.getItem('accessToken'));

}

function editProfile(profileId) {

    const profile = globalProfiles.find(p => p.id == profileId);

    if(!profile) {
        console.error('Profile not found');
        return;
    }

    document.getElementById('editModalProfileName').value = profile.name;
    document.getElementById('editModalHost').value = profile.smtpHost;
    document.getElementById('editModalPort').value = profile.smtpPort;
    document.getElementById('editModalUsername').value = profile.username;
    document.getElementById('editModalPassword').value = profile.password;
    document.getElementById('originalProfileName').value = profile.name;
    document.getElementById('originalHost').value = profile.smtpHost;
    document.getElementById('originalPort').value = profile.smtpPort;
    document.getElementById('originalUsername').value = profile.username;
    document.getElementById('originalPassword').value = profile.password;
    document.getElementById('originalProfileId').value = profile.id;

    var editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    editModal.show();
}

function saveProfileChanges() {
    const profileId = document.getElementById('originalProfileId').value;
    const oldName = document.getElementById('originalProfileName').value;
    const oldHost = document.getElementById('originalHost').value;
    const oldPort = document.getElementById('originalPort').value;
    const oldUsername = document.getElementById('originalUsername').value;
    const oldPassword = document.getElementById('originalPassword').value;
    const newName = document.getElementById('editModalProfileName').value;
    const newHost = document.getElementById('editModalHost').value;
    const newPort = document.getElementById('editModalPort').value;
    const newUsername = document.getElementById('editModalUsername').value;
    const newPassword = document.getElementById('editModalPassword').value;

    const attemptEditProfile = (token) => {
        fetch('/updateProfile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ profileId, oldName, oldHost, oldPort, oldUsername, oldPassword, newName, newHost, newPort, newUsername, newPassword }),
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                console.log('Token expired. Attempting to refresh token...');
                throw new Error('Token expired or invalid'); // if we get this error
            } else if (response.status === 413) {
                throw new Error('SMTP Port must be a number!');
            } else if (response.status === 400) {
                throw new Error('All fields are required!');
            } 
        })
        .then(data => {
            showMessage(data.message, 'danger');
            if (data.message.includes('Profile updated successfully') || data.message.includes('No changes made')) {
                messageDisplay.className = 'alert alert-warning';
            }
            fetchProfiles();
            const editModal = document.getElementById('editProfileModal');
            var modalInstance = bootstrap.Modal.getInstance(editModal);
            if (modalInstance) {
                modalInstance.hide();
            }
        })
        .catch(error => {
            if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                refreshToken().then(newToken => { // the token is refreshed
                    attemptEditEmployee(newToken); // Retry with new token
                    console.log('Token refreshed successfully.');
                }).catch(error => {
                    showMessage('Failed to refresh token. Please log in again.', 'danger');
                });
            } else {
                showMessage(error.message, 'danger');
                var modalElement = document.getElementById('editProfileModal');
                var modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
                document.getElementById('modalProfileName').value = '';
                document.getElementById('modalHost').value = '';
                document.getElementById('modalPort').value = '';
                document.getElementById('modalUsername').value = '';
                document.getElementById('modalPassword').value = '';

            }
        });
    };
    attemptEditProfile(localStorage.getItem('accessToken'));
}

document.getElementById('showPasswordCheckbox').addEventListener('change', function () {
    const passwordInput = document.getElementById('modalPassword');
    if (this.checked) {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
});

document.getElementById('editShowPasswordCheckbox').addEventListener('change', function () {
    const passwordInput = document.getElementById('editModalPassword');
    if (this.checked) {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
});