import { initSidebar, showMessage, attachNavHandlers } from "../shared/app.js";
import { refreshToken, handleResponse, logout } from "../shared/auth.js";

initSidebar();

function goToHome() { window.location.href = '/home'; }
function goToEmployees() { window.location.href = '/employees'; }
function goToSendingProfiles() { window.location.href = '/profiles'; }
function goToCampaigns() { window.location.href = '/campaigns'; }
function goToGroups() { window.location.href = '/groups'; }

document.getElementById('searchEmail').addEventListener('input', debouncedLoadEmployees);

document.addEventListener('DOMContentLoaded', () => {

    refreshToken().then(() => {
        // After successfully refreshing the token, display the content and load data:
        document.querySelector('.wrapper').style.display = 'block';
        fetchEmployees();
        attachNavHandlers({
            home: goToHome,
            employees: goToEmployees,
            profiles: goToSendingProfiles,
            groups: goToGroups,
            campaigns: goToCampaigns,
            logoutFn: logout
        });
    }).catch(() => {
        // If the token refresh fails, logout the user and redirect to the login page:
        logout(true);
    });

    document.getElementById('btnAddEmployee')?.addEventListener('click', addEmployee);
    document.getElementById('btnSaveEmployeeChanges')?.addEventListener('click', saveEmployeeChanges);
    document.getElementById('btnNextPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(1);
    });
    document.getElementById('btnPrevPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(-1);
    });
    document.getElementById('btnNextGroupPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changeGroupPage(1);
    });
    document.getElementById('btnPrevGroupPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changeGroupPage(-1);
    });
    
});

let currentPage = 0; // Current page index
let totalEmployees = 0; // Total number of employees
const pageSize = 10; // Employees per page

let globalEmployees = [];
const searchInput = document.getElementById('searchEmail');

function fetchEmployees() {
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };

    fetch(`/employeesList?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`, fetchOptions)
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
    //console.log(employees);

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
                    <button class="btn btn-warning btn-sm">Edit</button>
                    <button class="btn btn-danger btn-sm">Remove</button>
                    ${groupName === '<span style="color: grey;">NULL</span>' 
                        ? `<button class="btn btn-info btn-sm" data-bs-toggle="modal" data-bs-target="#assignGroupModal">Assign group</button>`
                        : `<button class="btn btn-secondary btn-sm">Exit group</button>`}
                </td>
            `;
            tbody.appendChild(row);

            const assignGroupBtn    = row.querySelector('.btn-info');
            const editBtn           = row.querySelector('.btn-warning');
            const removeBtn         = row.querySelector('.btn-danger');
            const exitGroupBtn      = row.querySelector('.btn-secondary');

            if(assignGroupBtn){
                assignGroupBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showAssignGroupModal(employee.id);
                });
            }
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                editEmployee(employee.id);
            });
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                removeEmployee(employee.email, employee.firstName, employee.lastName);
            });
            if(exitGroupBtn){
                exitGroupBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    employeeExitGroup(employee.id);
                });
            }

        });

        table.appendChild(tbody);
        listContainer.appendChild(table);
    } else {
        listContainer.textContent = 'No employees found.';
    }
}

function changePage(direction) {
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
    var modalElement = document.getElementById('editEmployeeModal');
    var modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }

    attemptEditEmployee(localStorage.getItem('accessToken'));
}

let totalGroups = 0; // Total number of groups
const pageSizeGroup = 10; // Groups per page
let globalGroups = [];
let currentPageGroup = 1;

function changeGroupPage(direction) {
    const newGroupPage = currentPageGroup + direction;
    //console.log('New page:', currentPageGroup);
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

    fetch(`/groupsList?page=${currentPageGroup}&size=10&search=${encodeURIComponent(searchQuery)}`, { // this route is from Group routes not Employees
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
    })
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
                        selectButton.onclick = (e) => {
                            e.preventDefault();
                            assignGroupToEmployee(selectedEmployeeId, group.id);
                        };
                        selectCell.appendChild(selectButton);
                        //console.log('Employee:', selectedEmployeeId);
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
                    selectButton.onclick = (e) => {
                        e.preventDefault();
                        assignGroupToEmployee(selectedEmployeeId, group.id);
                    }
                    selectCell.appendChild(selectButton);
                    //console.log('Employee:', selectedEmployeeId);
                });
            }
        })
        .catch(error => console.error('Error loading groups:', error));
}

function showAssignGroupModal(employeeId) {
    document.getElementById('selectedEmployeeId').value = employeeId;
    document.getElementById('searchGroupInput').value = '';
    fetchGroups(0);
    // Store the employeeId in a hidden field in the modal for later use
    const tableBody = document.getElementById('groupListModal').querySelector('tbody');
    tableBody.innerHTML = ''; // Clear existing content
}

function assignGroupToEmployee(employeeId, groupId) {
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

function employeeExitGroup(employeeId) {

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