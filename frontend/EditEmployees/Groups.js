    function home() {
        window.location.href = '/home';
    }

    const hamBurger = document.querySelector(".toggle-btn");
    hamBurger.addEventListener("click", function () {
    document.querySelector("#sidebar").classList.toggle("expand");
    });

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

    document.addEventListener('DOMContentLoaded', () => {

        refreshToken().then(() => {
            // After successfully refreshing the token, display the content and load data:
            document.querySelector('.wrapper').style.display = 'block';
            fetchGroups();
        }).catch(() => {
            // If the token refresh fails, logout the user and redirect to the login page:
            logout(true);
        });
    });

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

    function showMessage(message, type) {
        const messageDisplay = document.getElementById('messageDisplay');
        messageDisplay.textContent = message; // Set the text of the message display area
        messageDisplay.style.display = 'block'; // Make the message display area visible
        messageDisplay.className = `alert alert-${type}`;
    }

    let currentPage = 0; // Current page index
    let totalGroups = 0; // Total number of groups
    const pageSize = 10; // Groups per page

    let globalGroups = [];
    const listConatiner = document.getElementById('groupList');
    const searchInput = document.getElementById('searchGroup');

    function handleResponse(response) {
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

    function fetchGroups() {
        const fetchOptions = {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        };

        fetch(`/groupsList?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`)
            .then(handleResponse) // This will check for 401 status and attempt to refresh the token.
            //.then(response => response.json())
            .then(data => {
                globalGroups = data.rows;
                totalGroups = data.count;
                // Check if the current page is beyond the new total pages and adjust accordingly
                const totalPageCount = Math.ceil(totalGroups / pageSize);
                if (currentPage >= totalPageCount) {
                    currentPage = Math.max(0, totalPageCount - 1); // Adjust to the last page if current page exceeds total pages
                    if (totalPageCount > 0){
                        fetchGroups(); // Refetch groups for the new current page
                    } else {
                        loadGroups([]); // Prevent further execution in this call
                    }
                } else {
                    updatePageIndicator(totalGroups, currentPage, pageSize);
                    loadGroups(globalGroups);
                }

            }).catch(error => console.error('Error fetching groups:', error.message));
    }

    function loadGroups(groups) { 
        const listContainer = document.getElementById('groupList');
        listContainer.innerHTML = '';

        // create table and headers if groups exist
        if (Array.isArray(groups) && groups.length > 0) {
            const table = document.createElement('table');
            table.className = 'table';

            // create table headers
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th scope="col">Group Name</th>
                    <th scope="col">Description</th>
                    <th scope="col">Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            // create table body
            const tbody = document.createElement('tbody');

            // populate table rows
            groups.forEach(group => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${group.name}</td>
                    <td>${group.description}</td>
                    <td>
                        <button onclick="editGroup(${group.id})" class="btn btn-warning btn-sm">Edit</button>
                        <button onclick="showMembersModal('${group.name}', event)" class="btn btn-info btn-sm">Members</button>
                        <button onclick="removeGroup('${group.name}')" class="btn btn-danger btn-sm">Remove</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            listContainer.appendChild(table);
        } else {
            listContainer.textContent = 'No groups found.';
        }
    }

    let currentGroupName = '';

    function showMembersModal(groupName) {
        event.preventDefault();
        currentGroupName = groupName;
        document.getElementById('searchMemberInput').value = ''; // Clear the search input
        document.getElementById('loadMembersModalLabel').textContent = `Members of ${groupName}`;
        fetchMembers(0, groupName);
        
        var modalElement = document.getElementById('loadMembersModal');
        var modal = new bootstrap.Modal(modalElement);
        modal.show();
    }

    let totalMembers = 0;
    const pageSizeMembers = 10;
    let currentPageMembers = 0;
    let globalMembers = [];
    const searchMemberInput = document.getElementById('searchMemberInput');

    function changeMembersPage(direction, groupName){
        event.preventDefault();
        const newMembersPage = currentPageMembers + direction;
        if (newMembersPage < 0 || newMembersPage * pageSizeMembers >= totalMembers) return;
        currentPageMembers = newMembersPage;
        fetchMembers(currentPageMembers, groupName, searchMemberInput.value);
    }

    function fetchMembers(page, groupName, search = '') {
        fetch(`/groupMembers?name=${encodeURIComponent(groupName)}&page=${page}&size=10&search=${encodeURIComponent(search)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            totalMembers = data.count;
            globalMembers = data.rows;
            const tbody = document.getElementById('employeeListModal').querySelector('tbody');
            tbody.innerHTML = ''; // Clear previous entries
            data.members.forEach(member => {
                const row = `<tr>
                    <td>${member.firstName} ${member.lastName}</td>
                    <td>${member.email}</td>
                    <td><input type="checkbox" class="form-check-input" value="${member.id}"</td>
                </tr>`;
                tbody.innerHTML += row;
            });
        })
        .catch(error => console.error('Error fetching group members:', error));
    }

    function removeSelectedMembers(groupName) {
        const confirmExit = confirm('Are you sure you want to remove the selected members from the group?');
        if (!confirmExit) {
            return; // Stop the function if the user cancels the operation
        }
        const checkedBoxes = document.querySelectorAll('#employeeListModal tbody input[type="checkbox"]:checked');
        const memberIds = Array.from(checkedBoxes).map(box => box.value);

        const attemptRemoveMembers = (token) => { // This attemptRemoveMembers function will be called recursively if the token needs to be refreshed
            fetch('/removeMembersFromGroup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ memberIds, groupName })
            })
            .then(response => {
                if (response.ok){
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Group not found');
                    });
                }
            })
            .then(data => {
                showMessage(data.message, 'info');
                const membersModal = document.getElementById('loadMembersModal');
                var modalInstance = bootstrap.Modal.getInstance(membersModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
                fetchMembers(currentPage, groupName); // Refresh the list after removal
            })
            .catch(error => {
                if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                    refreshToken().then(newToken => { // the token is refreshed
                        attemptRemoveMembers(newToken); // Retry with new token
                        console.log('Token refreshed successfully.');
                    }).catch(error => {
                        alert('Failed to refresh token. Please log in again.', 'danger');
                        logout(true);
                    });
                } else {
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
        }

        attemptRemoveMembers(localStorage.getItem('accessToken'));
    }

    function changePage(direction) {
        event.preventDefault();
        const newPage = currentPage + direction;
        // Check new page is within range
        if (newPage < 0 || newPage * pageSize >= totalGroups) return;
        currentPage = newPage;
        fetchGroups();
    }

    function updatePageIndicator(total, currentPage, pageSize) {
        document.getElementById('pageIndicator').textContent = `Page ${currentPage + 1} of ${Math.ceil(total / pageSize)}`;
    }

    let debounceTimeout;
    const debounceDelay = 300; // milliseconds

    function debouncedLoadGroups() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            currentPage = 0; // Reset to first page when searching
            fetchGroups();
        }, debounceDelay);
    }

    function debouncedLoadMembers() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const searchValue = document.getElementById('searchMemberInput').value.trim();
            fetchMembers(0, currentGroupName, searchValue);
        }, debounceDelay);
    }

    document.getElementById('searchGroup').addEventListener('input', debouncedLoadGroups);
    document.getElementById('searchMemberInput').addEventListener('input', debouncedLoadMembers);

    document.addEventListener('DOMContentLoaded', function() {
        // Existing event listener for the add group modal
        document.getElementById('modalGroupDescription').addEventListener('input', function() {
            const currentLength = this.value.length;
            const maxLength = this.getAttribute('maxlength');
            document.getElementById('descriptionCharCount').textContent = `${currentLength}/${maxLength}`;
        });

        // Add event listener for the edit group modal
        document.getElementById('editModalGroupDescription').addEventListener('input', function() {
            const currentLength = this.value.length;
            const maxLength = this.getAttribute('maxlength');
            document.getElementById('editDescriptionCharCount').textContent = `${currentLength}/${maxLength}`;
        });
    });



    function addGroup() {
        const name = document.getElementById('modalGroupName').value;
        const description = document.getElementById('modalGroupDescription').value;

        const sendAddGroupRequest = (token) => { // This sendAddGroupRequest function will be called recursively if the token needs to be refreshed
            fetch('/addGroup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, description }),
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else if (response.status === 400) {
                    throw new Error('Group name is required!');
                } else if (response.status === 409) {
                    return response.json();
                }
            })
            .then(data => {
                showMessage(data.message, 'danger');
                if (data.message.includes('Group added')) {
                    messageDisplay.className = 'alert alert-success';
                    fetchGroups(); // Refresh the group list
                }
                document.getElementById('modalGroupName').value = '';
                document.getElementById('modalGroupDescription').value = '';
            })
            .catch(error => {
                if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                    refreshToken().then(newToken => { // the token is refreshed
                        sendAddGroupRequest(newToken); // Retry with new token
                        console.log('Token refreshed successfully.');
                    }).catch(error => {
                        showMessage('Failed to refresh token. Please log in again.', 'danger');
                    });
                } else {
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
            var modalElement = document.getElementById('addGroupModal');
            var modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            document.getElementById('descriptionCharCount').textContent = '0/100';
        };

        sendAddGroupRequest(localStorage.getItem('accessToken'));
    }

    function removeGroup(name) {
        event.preventDefault();
        const attemptRemoveGroup = (token) => { // This attemptRemoveEmployee function will be called recursively if the token needs to be refreshed
            fetch('/removeGroup', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name }),
            })
            .then(result => {
                if(!result.ok) {
                    if (result.status === 401 || result.status === 403) { // Unauthorized, so try to refresh the token
                        console.log('Token expired. Attempting to refresh token...');
                        return refreshToken().then(newToken => { // Refresh the token
                            console.log('Token refreshed successfully.');
                            return attemptRemoveGroup(newToken); // Retry the original request with the new token
                        });
                    }
                    if (result.status === 404) {
                        throw new Error('Group not found');
                    }
                    throw new Error(`${result.status} - ${result.statusText}`);
                }
                return result.json();
            })
            .then(data => {
                showMessage(data.message, 'info'); // Show succes or failure
                fetchGroups(); // Refresh the group list
            })
            .catch(error => {
                console.error(error);
                showMessage(error.message, 'danger');
            });
        };
        fetch(`/checkGroupEmployees?name=${encodeURIComponent(name)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let message = `Are you sure you want to delete the group ${name}?`;
            if (data.hasEmployees) {
                message += `\nDeleting this group will also remove the employees' associations with it.`;
            } else{
                message += '\nThis group has no employees associated with it.';
            }

            const confirmExit = confirm(message);
            if (!confirmExit) {
                return; // Stop the function if the user cancels the operation
            }

            // Proceed with group deletion if confirmed
            attemptRemoveGroup(localStorage.getItem('accessToken'), name);
        })
        .catch(error => {
            console.error('Error checking group employees:', error);
            showMessage(error.message, 'danger');
        });
        

        // Start the process with the current token
        //attemptRemoveGroup(localStorage.getItem('accessToken'));
    }

    function editGroup(groupId) {
        event.preventDefault();
        
        const group = globalGroups.find(g => g.id === groupId);
        if(!group) {
            console.error('Group not found');
            return;
        }

        document.getElementById('editModalGroupName').value = group.name;
        document.getElementById('editModalGroupDescription').value = group.description;
        document.getElementById('originalGroupName').value = group.name; // hidden field to store the original name
        document.getElementById('originalGroupId').value = group.id; // hidden field to store the group id
        document.getElementById('originalGroupDescription').value = group.description; // hidden field to store the original description

        document.getElementById('editDescriptionCharCount').textContent = `${group.description.length}/100`;

        var editModal = new bootstrap.Modal(document.getElementById('editGroupModal'));
        editModal.show();
    }

    function saveGroupChanges() {
        const groupId = document.getElementById('originalGroupId').value;
        const oldName = document.getElementById('originalGroupName').value;
        const newName = document.getElementById('editModalGroupName').value;
        const description = document.getElementById('editModalGroupDescription').value;
        const oldDescription = document.getElementById('originalGroupDescription').value;

        const attemptEditGroup = (token) => {
            fetch('/updateGroup', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ groupId, oldName, newName, description, oldDescription }),
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else if (response.status === 400) {
                    throw new Error('Group name is required!');
                } else if (response.status === 409) {
                    return response.json();
                }
                
            })
            .then(data => {
                showMessage(data.message, 'danger');
                if (data.message.includes('Group updated') || data.message.includes('Group description updated') || data.message.includes('No changes made')) {
                    messageDisplay.className = 'alert alert-warning';
                }
                fetchGroups(); // Refresh the group list
                const editModal = document.getElementById('editGroupModal');
                var modalInstance = bootstrap.Modal.getInstance(editModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            })
            .catch(error => {
                if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                    refreshToken().then(newToken => { // the token is refreshed
                        attemptEditGroup(newToken); // Retry with new token
                        console.log('Token refreshed successfully.');
                    }).catch(error => {
                        showMessage('Failed to refresh token. Please log in again.', 'danger');
                    });
                } else {
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
        };

        attemptEditGroup(localStorage.getItem('accessToken'));
    }