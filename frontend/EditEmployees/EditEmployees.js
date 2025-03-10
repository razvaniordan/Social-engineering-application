    function home() {
        window.location.href = '/home';
    }

    console.log("Loaded succesfully");

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

    function copyLink() { // The Clipboard API works on https:// (secure contexts) websites and might require user interaction to function correctly
        event.preventDefault(); // Prevent the default action of the event
        const copyText = document.querySelector('#generator .form-control[type="text"]'); // Ensure we select the correct input
        if (copyText.value === "Press GENERATE in order to generate the link") {
            alert("You need to generate the link first");
            return;
        }
        
        // Using the Clipboard API to write text to the clipboard
        navigator.clipboard.writeText(copyText.value).then(() => {
            // This function is executed if the text is successfully copied
            alert('Link copied to clipboard!');
        }).catch(err => {
            // This function is executed if there was an error during copying
            console.error('Could not copy text: ', err);
            alert('Error copying text to clipboard, please try manually.');
        });
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

    let currentPage = 0; // Current page index
    let totalEmployees = 0; // Total number of employees
    const pageSize = 10; // Employees per page
    
    let globalEmployees = [];
    const listContainer = document.getElementById('employeeList');
    const searchInput = document.getElementById('searchEmail');

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

    function fetchEmployees() {
        const fetchOptions = {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        };

        fetch(`/employees?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`)
            .then(handleResponse) // This will check for 401 status and attempt to refresh the token.
            //.then(response => response.json())
            .then(data => {
                globalEmployees = data.rows;
                totalEmployees = data.count;
                loadEmployees(globalEmployees);
                // Check if the current page is beyond the new total pages and adjust accordingly
                const totalPageCount = Math.ceil(totalEmployees / pageSize);
                if (currentPage >= totalPageCount) {
                    currentPage = Math.max(0, totalPageCount - 1); // Adjust to the last page if current page exceeds total pages
                    if (totalPageCount > 0){
                        fetchEmployees(); // Refetch employees for the new current page
                    } else {
                        loadEmployees([]); // Prevent further execution in this call
                    }
                } else {
                    updatePageIndicator(totalEmployees, currentPage, pageSize);
                    loadEmployees(globalEmployees);
                }

            }).catch(error => console.error('Error fetching employees:', error.message));
    }

    function loadEmployees(employees) { 
        const listContainer = document.getElementById('employeeList');
        listContainer.innerHTML = '';
        console.log(employees);

        if (Array.isArray(employees) && employees.length > 0) {
            const table = document.createElement('table');
            table.className = 'table';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th scope="col">First Name</th>
                    <th scope="col">Last Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Group</th>
                    <th scope="col">Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            employees.forEach(employee => {
                const row = document.createElement('tr');
                const groupName = employee.Group ? employee.Group.name : '<span style="color: grey;">NULL</span>';
                const uniqueLink = `http://localhost:4000/${employee.token}`;
                row.innerHTML = `
                    <td>${employee.firstName}</td>
                    <td>${employee.lastName}</td>
                    <td>${employee.email}</td>
                    <td>${groupName}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editEmployee('${employee.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="removeEmployee('${employee.email}', '${employee.firstName} ${employee.lastName}')">Remove</button>
                        ${groupName === '<span style="color: grey;">NULL</span>' 
                            ? `<button class="btn btn-info btn-sm" data-bs-toggle="modal" data-bs-target="#assignGroupModal" onclick="showAssignGroupModal('${employee.id}')">Assign group</button>`
                            : `<button class="btn btn-secondary btn-sm" onclick="exitGroup('${employee.id}')">Exit group</button>`}
                    </td>
                `;
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            listContainer.appendChild(table);
        } else {
            listContainer.textContent = 'No employees found.';
        }
    }

    function displayLink(uniqueLink, employeeName, isRetry = false) {
        if (!isRetry) event.preventDefault();

        fetch('/validateToken', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
        .then(response => {
            if (response.ok) {
                // The token is valid, proceed with displaying the link
                const linkInput = document.querySelector('#generator .form-control[type="text"]');
                linkInput.value = uniqueLink;
                showMessage(`Link generated successfully for employee ${employeeName}!`, 'success');
            } else if (response.status === 401 || response.status === 403) {
                // Token might be expired or invalid, try to refresh it
                console.log('Token expired. Attempting to refresh token...');
                return refreshToken().then(newToken => {
                    // Retry the operation with the new token
                    displayLink(uniqueLink, employeeName, true); // by that "true" we are telling the function that it is a retry to avoid using the event.preventDefault() again
                    console.log('Token refreshed successfully.');
                });
            } else {
                throw new Error('An error occurred.');
            }
        })
        .catch(error => {
            console.error('Error validating or refreshing the token:', error);
            logout(true);
        });
    }



    function changePage(direction) {
        event.preventDefault();
        const newPage = currentPage + direction;
        // Check new page is within range
        if (newPage < 0 || newPage * pageSize >= totalEmployees) return;
        currentPage = newPage;
        fetchEmployees();
    }

    function updatePageIndicator(total, currentPage, pageSize) {
        document.getElementById('pageIndicator').textContent = `Page ${currentPage + 1} of ${Math.ceil(total / pageSize)}`;
    }

    let debounceTimeout;
    const debounceDelay = 300; // milliseconds

    function debouncedLoadEmployees() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            currentPage = 0; // Reset to first page when searching
            fetchEmployees();
        }, debounceDelay);
    }

    document.getElementById('searchEmail').addEventListener('input', debouncedLoadEmployees);
    document.addEventListener('DOMContentLoaded', fetchEmployees);

    document.addEventListener('DOMContentLoaded', () => {

        refreshToken().then(() => {
            // After successfully refreshing the token, display the content and load data:
            document.querySelector('.wrapper').style.display = 'block';
            fetchEmployees();
        }).catch(() => {
            // If the token refresh fails, logout the user and redirect to the login page:
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

    function showMessage(message, type) {
        const messageDisplay = document.getElementById('messageDisplay');
        messageDisplay.textContent = message; // Set the text of the message display area
        messageDisplay.style.display = 'block'; // Make the message display area visible
        messageDisplay.className = `alert alert-${type}`;
    }

    function addEmployee() {
        const firstName = document.getElementById('modalEmployeeFirstName').value;
        const lastName = document.getElementById('modalEmployeeLastName').value;
        const email = document.getElementById('modalEmployeeEmail').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Email validation regex - forces the user to add the format of email address
        //const emailRegex = /^[^\s@]+@gmail\.com$/; -> if we want to restrict the email to only gmail
        if(!emailRegex.test(email)){
            showMessage('Please enter a valid email address!', 'danger');
            var modalElement = document.getElementById('addEmployeeModal');
            var modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            document.getElementById('modalEmployeeFirstName').value = '';
            document.getElementById('modalEmployeeLastName').value = '';
            document.getElementById('modalEmployeeEmail').value = '';
            return;
        }

        const sendAddEmployeeRequest = (token) => { // This sendAddEmployeeRequest function will be called recursively if the token needs to be refreshed
            fetch('/addEmployee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ firstName, lastName, email }),
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else if (response.status === 400) {
                    throw new Error('First name, last name and email are required');
                } else if (response.status === 409) {
                    return response.json();
                }
            })
            .then(data => {
                showMessage(data.message, 'danger');
                if (data.message.includes('Employee added')) {
                    messageDisplay.className = 'alert alert-success';
                    fetchEmployees(); // Refresh the employee list
                }
                document.getElementById('modalEmployeeFirstName').value = '';
                document.getElementById('modalEmployeeLastName').value = '';
                document.getElementById('modalEmployeeEmail').value = '';
            })
            .catch(error => {
                if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                    refreshToken().then(newToken => { // the token is refreshed
                        sendAddEmployeeRequest(newToken); // Retry with new token
                        console.log('Token refreshed successfully.');
                    }).catch(error => {
                        showMessage('Failed to refresh token. Please log in again.', 'danger');
                    });
                } else {
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
        };
        var modalElement = document.getElementById('addEmployeeModal');
        var modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        }

        sendAddEmployeeRequest(localStorage.getItem('accessToken'));
    }


    function removeEmployee(email, employeeName) {
        event.preventDefault();
        const confirmExit = confirm(`Are you sure you want to delete the employee ${employeeName} with the email ${email}?`);
        if (!confirmExit) {
            return; // Stop the function if the user cancels the operation
        }

        const attemptRemoveEmployee = (token) => { // This attemptRemoveEmployee function will be called recursively if the token needs to be refreshed
            fetch('/removeEmployee', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, employeeName }),
            })
            .then(result => {
                if(!result.ok) {
                    if (result.status === 401 || result.status === 403) { // Unauthorized, so try to refresh the token
                        console.log('Token expired. Attempting to refresh token...');
                        return refreshToken().then(newToken => { // Refresh the token
                            console.log('Token refreshed successfully.');
                            return attemptRemoveEmployee(newToken); // Retry the original request with the new token
                        });
                    }
                    if (result.status === 404) {
                        throw new Error('Employee not found');
                    }
                    throw new Error(`${result.status} - ${result.statusText}`);
                }
                return result.json();
            })
            .then(data => {
                showMessage(data.message, 'info'); // Show succes or failure
                fetchEmployees(); // Refresh the employee list
            })
            .catch(error => {
                console.error(error);
                showMessage(error.message, 'danger');
            });
        };

        // Start the process with the current token
        attemptRemoveEmployee(localStorage.getItem('accessToken'));

    }

    function editEmployee(employeeId) {
        event.preventDefault();

        const employee = globalEmployees.find(e => e.id == employeeId);

        if(!employee) {
            console.error('Employee not found');
            return;
        }

        document.getElementById('editModalEmployeeFirstName').value = employee.firstName;
        document.getElementById('editModalEmployeeLastName').value = employee.lastName;
        document.getElementById('editModalEmployeeEmail').value = employee.email;
        document.getElementById('originalModalEmployeeFirstName').value = employee.firstName;
        document.getElementById('originalModalEmployeeLastName').value = employee.lastName;
        document.getElementById('originalModalEmployeeEmail').value = employee.email;
        document.getElementById('originalEmployeeId').value = employee.id;

        var editModal = new bootstrap.Modal(document.getElementById('editEmployeeModal'));
        editModal.show();
    }

    function saveEmployeeChanges() {
        const employeeId = document.getElementById('originalEmployeeId').value;
        const oldFirstName = document.getElementById('originalModalEmployeeFirstName').value;
        const oldLastName = document.getElementById('originalModalEmployeeLastName').value;
        const oldEmail = document.getElementById('originalModalEmployeeEmail').value;
        const newFirstName = document.getElementById('editModalEmployeeFirstName').value;
        const newLastName = document.getElementById('editModalEmployeeLastName').value;
        const newEmail = document.getElementById('editModalEmployeeEmail').value;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(newEmail)){
            showMessage('Please enter a valid email address!', 'danger');
            var modalElement = document.getElementById('editEmployeeModal');
            var modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            return;
        }

        const attemptEditEmployee = (token) => {
            fetch('/updateEmployee', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ employeeId, oldFirstName, oldLastName, oldEmail, newFirstName, newLastName, newEmail }),
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else if (response.status === 400) {
                    throw new Error('All fields are required!');
                } else if (response.status === 409) {
                    return response.json();
                }
            })
            .then(data => {
                showMessage(data.message, 'danger');
                if (data.message.includes('Employee updated') || data.message.includes('Employee email updated') || data.message.includes('Employee name updated') || data.message.includes('No changes made')) {
                    messageDisplay.className = 'alert alert-warning';
                }
                fetchEmployees();
                const editModal = document.getElementById('editEmployeeModal');
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
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
        };
        attemptEditEmployee(localStorage.getItem('accessToken'));
    }

    let totalGroups = 0; // Total number of groups
    const pageSizeGroup = 10; // Groups per page
    let globalGroups = [];
    let currentPageGroup = 1;

    function changeGroupPage(direction) {
        event.preventDefault();
        const newGroupPage = currentPageGroup + direction;
        console.log('New page:', currentPageGroup);
        if (newGroupPage < 0 || newGroupPage * pageSizeGroup >= totalGroups) return;

        currentPageGroup = newGroupPage;
        fetchGroups(currentPageGroup);
    }

    function debouncedLoadGroups() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            fetchGroups(0);
        }, debounceDelay);
    }

    function fetchGroups(page) {
        currentPageGroup = page;
        const searchQuery = document.getElementById('searchGroupInput').value;
        const tableBody = document.getElementById('groupListModal').querySelector('tbody');
        tableBody.innerHTML = ''; // Clear existing content

        fetch(`/groupsList?page=${currentPageGroup}&size=10&search=${encodeURIComponent(searchQuery)}`)
            .then(response => response.json())
            .then(data => {
                totalGroups = data.count;
                globalGroups = data.rows;
                const totalPageCount = Math.ceil(totalGroups / pageSizeGroup);
                if (currentPageGroup >= totalPageCount) {
                    currentPageGroup = Math.max(0, totalPageCount - 1); // Adjust to the last page if current page exceeds total pages
                    if (totalPageCount > 0){
                        data.rows.forEach(group => {
                            const row = tableBody.insertRow();
                            row.insertCell().textContent = group.name;
                            const selectCell = row.insertCell();
                            const selectButton = document.createElement('button');
                            selectButton.textContent = 'Select';
                            selectButton.className = 'btn btn-primary btn-sm';
                            const selectedEmployeeId = document.getElementById('selectedEmployeeId').value;
                            selectButton.onclick = () => assignGroupToEmployee(selectedEmployeeId, group.id);
                            selectCell.appendChild(selectButton);
                            console.log('Employee:', selectedEmployeeId);
                        });
                    }
                } else {
                    data.rows.forEach(group => {
                        const row = tableBody.insertRow();
                        row.insertCell().textContent = group.name;
                        const selectCell = row.insertCell();
                        const selectButton = document.createElement('button');
                        selectButton.textContent = 'Select';
                        selectButton.className = 'btn btn-primary btn-sm';
                        const selectedEmployeeId = document.getElementById('selectedEmployeeId').value;
                        selectButton.onclick = () => assignGroupToEmployee(selectedEmployeeId, group.id);
                        selectCell.appendChild(selectButton);
                        console.log('Employee:', selectedEmployeeId);
                    });
                }
            })
            .catch(error => console.error('Error loading groups:', error));
    }

    function showAssignGroupModal(employeeId) {
        event.preventDefault();
        document.getElementById('selectedEmployeeId').value = employeeId;
        document.getElementById('searchGroupInput').value = '';
        fetchGroups(0);
        // Store the employeeId in a hidden field in the modal for later use
        const tableBody = document.getElementById('groupListModal').querySelector('tbody');
        tableBody.innerHTML = ''; // Clear existing content
    }

    function assignGroupToEmployee(employeeId, groupId) {
        event.preventDefault();
        const sendAssignGroupRequest = (token) => { // This sendAssignGroupRequest function will be called recursively if the token needs to be refreshed
            fetch('/assignEmployeeToGroup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ employeeId, groupId })
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else if (response.status === 400) {
                    throw new Error('First name, last name and email are required');
                } else if (response.status === 409) {
                    return response.json();
                }
            })
            .then(data => {
                showMessage(data.message, "info"); // Show a success message
                // Refresh the employee list or close the modal as needed
                const editModal = document.getElementById('assignGroupModal');
                var modalInstance = bootstrap.Modal.getInstance(editModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
                fetchEmployees();
            })
            .catch(error => { 
                if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                    refreshToken().then(newToken => { // the token is refreshed
                        sendAssignGroupRequest(newToken); // Retry with new token
                        console.log('Token refreshed successfully.');
                    }).catch(error => {
                        alert('Failed to refresh token. Please log in again.', 'danger');
                        logout(true);
                    });
                } else {
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
        };

        sendAssignGroupRequest(localStorage.getItem('accessToken'));
    }

    function exitGroup(employeeId) {
        event.preventDefault(); // Prevent the default action of the event

        const confirmExit = confirm("Are you sure you want to remove this employee from their group?");
        if (!confirmExit) {
            return; // Stop the function if the user cancels the operation
        }

        const sendExitGroupRequest = (token) => { // This sendExitGroupRequest function will be called recursively if the token needs to be refreshed
            fetch('/exitEmployeeFromGroup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ employeeId })
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    throw new Error('Token expired or invalid'); // if we get this error
                } else if (response.status === 400) {
                    throw new Error('First name, last name and email are required');
                } else if (response.status === 409) {
                    return response.json();
                }
            })
            .then(data => {
                showMessage(data.message, "info"); // Show a success message
                fetchEmployees(); // Refresh the employees list to show the updated group assignment
            })
            .catch(error => {
                if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                    refreshToken().then(newToken => { // the token is refreshed
                        sendExitGroupRequest(newToken); // Retry with new token
                        console.log('Token refreshed successfully.');
                    }).catch(error => {
                        alert('Failed to refresh token. Please log in again.', 'danger');
                        logout(true);
                    });
                } else {
                    showMessage('Error: ' + error.message, 'danger');
                }
            });
        };

        sendExitGroupRequest(localStorage.getItem('accessToken'));
    }