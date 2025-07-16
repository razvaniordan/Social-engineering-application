import { initSidebar, showMessage, attachNavHandlers } from "../shared/app.js";
import { refreshToken, handleResponse, logout } from "../shared/auth.js";

initSidebar();

function goToHome() { window.location.href = '/home'; }
function goToEmployees() { window.location.href = '/employees'; }
function goToSendingProfiles() { window.location.href = '/profiles'; }
function goToCampaigns() { window.location.href = '/campaigns'; }
function goToGroups() { window.location.href = '/groups'; }

document
  .getElementById('addGroupModal')
  .addEventListener('shown.bs.modal', () => {
      const desc = document.getElementById('modalGroupDescription');
      const counter = document.getElementById('descriptionCharCount');
      if (!desc || !counter) return; // just in case

      desc.addEventListener('input', () => {
          counter.textContent =
              `${desc.value.length}/${desc.maxLength}`;
      });
  });

document
  .getElementById('editGroupModal')
  .addEventListener('shown.bs.modal', () => {
      const desc = document.getElementById('editModalGroupDescription');
      const counter = document.getElementById('editDescriptionCharCount');
      if (!desc || !counter) return; // just in case

      desc.addEventListener('input', () => {
          counter.textContent =
              `${desc.value.length}/${desc.maxLength}`;
      });
  });


document.addEventListener('DOMContentLoaded', () => {

    refreshToken().then(() => {
        // After successfully refreshing the token, display the content and load data:
        document.querySelector('.wrapper').style.display = 'block';
        attachNavHandlers({
            home: goToHome,
            employees: goToEmployees,
            profiles: goToSendingProfiles,
            groups: goToGroups,
            campaigns: goToCampaigns,
            logoutFn: logout
        });
        fetchGroups();
    }).catch(() => {
        // If the token refresh fails, logout the user and redirect to the login page:
        logout(true);
    });

    // Added event listeners for each button of the page
    document.getElementById('btnAddGroup')?.addEventListener('click', addGroup);
    document.getElementById('btnSaveGroupChanges')?.addEventListener('click', saveGroupChanges);
    document.getElementById('btnRemoveSelected')?.addEventListener('click', () => removeSelectedMembers(currentGroupName));
    document.getElementById('btnNextPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(1);
    });
    document.getElementById('btnPrevPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(-1);
    });
    document.getElementById('membersPrev')?.addEventListener('click', (e) => {
        e.preventDefault();
        changeMembersPage(-1, currentGroupName);
    });
    document.getElementById('membersNext')?.addEventListener('click', (e) => {
        e.preventDefault();
        changeMembersPage(1, currentGroupName);
    });
    
    document.getElementById('searchGroup').addEventListener('input', debouncedLoadGroups);
    document.getElementById('searchMemberInput').addEventListener('input', debouncedLoadMembers);
});

let currentPage = 0; // Current page index
let totalGroups = 0; // Total number of groups
const pageSize = 10; // Groups per page

let globalGroups = [];
const searchInput = document.getElementById('searchGroup');

function fetchGroups() {
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };

    fetch(`/groupsList?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`, fetchOptions)
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

        })
        .catch(error => console.error('Error fetching groups:', error.message));
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
                    <button type="button" class="btn btn-warning btn-sm">Edit</button>
                    <button type="button" class="btn btn-info btn-sm">Members</button>
                    <button type="button" class="btn btn-danger btn-sm">Remove</button>
                </td>
            `;
            tbody.appendChild(row);

            const membersBtn   = row.querySelector('.btn-info');
            const editBtn      = row.querySelector('.btn-warning');
            const removeBtn    = row.querySelector('.btn-danger');

            membersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showMembersModal(group.name, e);
            });
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                editGroup(group.id);
            });
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                removeGroup(group.name);
            });

        });

        table.appendChild(tbody);
        listContainer.appendChild(table);
    } else {
        listContainer.textContent = 'No groups found.';
    }
}

let currentGroupName = '';

function showMembersModal(groupName) {
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
    var modalElement = document.getElementById('addGroupModal');
    var modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }
    document.getElementById('descriptionCharCount').textContent = '0/100';

    attemptEditGroup(localStorage.getItem('accessToken'));
}