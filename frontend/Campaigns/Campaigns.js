import { initSidebar, showMessage, attachNavHandlers } from "../shared/app.js";
import { refreshToken, handleResponse, logout } from "../shared/auth.js";

initSidebar();

function goToHome() { window.location.href = '/home'; }
function goToEmployees() { window.location.href = '/employees'; }
function goToSendingProfiles() { window.location.href = '/profiles'; }
function goToCampaigns() { window.location.href = '/campaigns'; }
function goToGroups() { window.location.href = '/groups'; }

let currentPage = 0; // Current page index
let totalCampaigns = 0; // Total number of campaigns
const pageSize = 10; // Campaigns per page

let globalCampaigns = [];
const searchInput = document.getElementById('searchCampaign');
document.getElementById('searchCampaign').addEventListener('input', debouncedLoadCampaigns);

document.addEventListener('DOMContentLoaded', () => {

    refreshToken().then(() => {
        // After successfully refreshing the token, display the content and load data:
        document.querySelector('.wrapper').style.display = 'block';
        fetchCampaigns();
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

    document.getElementById('btnAddCampaign')?.addEventListener('click', addCampaign);
    document.getElementById('btnNextPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(1);
    });
    document.getElementById('btnPrevPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(-1);
    });

    var groupSelectElement = document.getElementById('modalGroups');
    var groupChoices = new Choices(groupSelectElement, {
        removeItemButton: true,
        placeholderValue: 'Select groups',
        searchPlaceholderValue: 'Search groups',
        maxItemCount: -1, // No limit on the number of items that can be selected
    });

    // Function to populate groups with the Choices instance
    function populateGroups(groups) {
        groupChoices.clearStore();  // Clear existing choices
        groups.forEach(group => {
            groupChoices.setChoices([
                {value: group.id, label: group.name, selected: false, disabled: false},
            ], 'value', 'label', false);
        });
    }

    // Function to load and populate form dropdowns including groups
    async function populateFormDropdowns() {
        const fetchOptions = {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        };
        const [templates, landingPages, sendingProfiles, groups] = await Promise.all([
            fetch('/email-templates', fetchOptions).then(response => response.json()),
            fetch('/landing-pages', fetchOptions).then(response => response.json()),
            fetch('/sending-profiles', fetchOptions).then(response => response.json()),
            fetch('/getGroups', fetchOptions).then(response => response.json()),
        ]);
        populateDropdown('modalEmailTemplate', templates);
        //populateDropdown('modalLandingPage', landingPages);
        populateDropdown('modalSendingProfile', sendingProfiles);
        groupChoices.clearStore(); // Clear existing choices
        populateGroups(groups); // Use refactored populateGroups
    }

    // Attach the event listener for modal show event
    const newCampaignModal = new bootstrap.Modal(document.getElementById('newCampaignModal'));
    document.getElementById('newCampaignModal').addEventListener('show.bs.modal', populateFormDropdowns);

    // Example of polling setup in the JavaScript front-end
    setInterval(async () => {
        const campaigns = await fetch(`/campaignsList?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
        .then(response => response.json()).catch(err => console.error('Error fetching campaigns:', err));

        if (campaigns && campaigns.rows) {
            updateCampaignStatusOnUI(campaigns.rows);
        }
    
    }, 5000);  // Every 5 seconds
});

function updateCampaignStatusOnUI(campaigns) {
    campaigns.forEach(campaign => {
        const row = document.querySelector(`tr[data-campaign-id="${campaign.id}"]`);
        //console.log(row);
        if (row) {
            // Get all cells in the row
            const statusCells = row.querySelectorAll('.status-sent, .status-failed, .status-sending, .status-scheduled');
            //console.log(statusCells);
            // Update text content for each status cell
            statusCells.forEach(statusCell => {
                //console.log(statusCell);
                statusCell.textContent = campaign.status; // Update the text content with the latest status
                statusCell.className = getStatusClass(campaign.status); // Update the class name based on the status
                //console.log(statusCell);
                // No need to update class name since it's dynamic
            });

            // Update buttons dynamically based on status
            const actionsCells = row.querySelectorAll('.button-sent, .button-failed, .button-sending, .button-scheduled');
            actionsCells.forEach(actionCell => {
                actionCell.className = getButtonsClass(campaign.status);
                if (actionCell.className === 'button-sent') {
                    actionCell.innerHTML = `
                        <button type="button" id="btnViewLogs" class="btn btn-info btn-sm">View</button>
                        <button type="button" id="btnRemoveCampaign" class="btn btn-danger btn-sm">Remove</button>
                    `;
                } else if (actionCell.className === 'button-sending') {
                    actionCell.innerHTML = '';
                } else if (actionCell.className === 'button-scheduled' || actionCell === 'button-failed'){
                    actionCell.innerHTML = `
                        <button type="button" id="btnRemoveCampaign" class="btn btn-danger btn-sm">Remove</button>
                    `;
                }
                const viewLogsBtn    = row.querySelector('.btn-info');
                const removeBtn      = row.querySelector('.btn-danger');

                if(viewLogsBtn){
                    viewLogsBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        viewLogs(campaign.id);
                    });
                }
                if(removeBtn){
                    removeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        removeCampaign(campaign.name, campaign.id, campaign.status);
                    });
                }
            });

        } else {
            console.error(`Row not found for campaign ${campaign.id}`);
        }
    });
}

function populateDropdown(elementId, items, isMultiple = false) {
    const select = document.getElementById(elementId);
    select.innerHTML = ''; // Clear existing options
    if (Array.isArray(items)) {
        items.forEach(item => {
            const option = document.createElement('option');
            if(elementId === 'modalEmailTemplate') {
                option.value = item.name;
                option.textContent = item.name;
            } else {
                option.value = item.id; 
                option.textContent = item.name; 
            }
            if (isMultiple && elementId === 'modalGroups') {
                option.selected = true; // Pre-selects all options for multiple select
            }
            select.appendChild(option);
        });
    } else {
        console.error('Invalid items array:', items);
    } 
}

// Example function that accesses multiple elements
function updateUI() {
    const elementsToCheck = ['modalCampaignName', 'modalEmailTemplate', 'modalLaunchDate', 'modalSendingProfile', 'modalGroups'];
    elementsToCheck.forEach((elementId) => {
        const element = document.getElementById(elementId);
        //console.log(elementId, element); // Check if any are null
        if (element !== null) {
            //console.log(element.value); // Safely check value if element is not null
        } else {
            //console.log(`Error: Element with ID ${elementId} is not found.`);
        }
    });
}

function changePage(direction) {
    const newPage = currentPage + direction;
    // Check new page is within range
    if (newPage < 0 || newPage * pageSize >= totalCampaigns) return;
    currentPage = newPage;
    fetchCampaigns();
}

function updatePageIndicator(total, currentPage, pageSize) {
    document.getElementById('pageIndicator').textContent = `Page ${currentPage + 1} of ${Math.ceil(total / pageSize)}`;
}

let debounceTimeout;
const debounceDelay = 300; // milliseconds

function debouncedLoadCampaigns() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        currentPage = 0; // Reset to first page when searching
        fetchCampaigns();
    }, debounceDelay);
}

function fetchCampaigns() {
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };

    fetch(`/campaignsList?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchInput.value)}`, fetchOptions)
        .then(handleResponse) // This will check for 401 status and attempt to refresh the token.
        //.then(response => response.json())
        .then(data => {
            globalCampaigns = data.rows;
            totalCampaigns = data.count;
            // Check if the current page is beyond the new total pages and adjust accordingly
            const totalPageCount = Math.ceil(totalCampaigns / pageSize);
            if (currentPage >= totalPageCount) {
                currentPage = Math.max(0, totalPageCount - 1); // Adjust to the last page if current page exceeds total pages
                if (totalPageCount > 0){
                    fetchCampaigns(); // Refetch groups for the new current page
                } else {
                    loadCampaigns([]); // Prevent further execution in this call
                }
            } else {
                updatePageIndicator(totalCampaigns, currentPage, pageSize);
                loadCampaigns(globalCampaigns);
            }

        }).catch(error => console.error('Error fetching campaigns:', error.message));
}

function loadCampaigns(campaigns) { 
    const listContainer = document.getElementById('campaignList');
    listContainer.innerHTML = '';

    // create table and headers if groups exist
    if (Array.isArray(campaigns) && campaigns.length > 0) {
        const table = document.createElement('table');
        table.className = 'table';

        // create table headers
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th scope="col">Campaign Name</th>
                <th scope="col">Template</th>
                <th scope="col">Launch Time</th>
                <th scope="col">Profile</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        // create table body
        const tbody = document.createElement('tbody');

        // populate table rows
        campaigns.forEach(campaign => {
            const row = document.createElement('tr');
            row.setAttribute('data-campaign-id', campaign.id);
            const statusClass = getStatusClass(campaign.status);
            const buttonsClass = getButtonsClass(campaign.status);

            const date = new Date(campaign.date);

            const readableDate = date.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            if(campaign.status === 'Sent'){
                row.innerHTML = `
                    <td>${campaign.name}</td>
                    <td>${campaign.template}</td>
                    <td>${readableDate}</td>
                    <td>${campaign.profile}</td>
                    <td class="${statusClass}">${campaign.status}</td>
                    <td class="${buttonsClass}">
                        <button type="button" id="btnViewLogs" class="btn btn-info btn-sm">View</button>
                        <button type="button" id="btnRemoveCampaign" class="btn btn-danger btn-sm">Remove</button>
                    </td>
                `;
            } else if (campaign.status === 'Sending..') {
                row.innerHTML = `
                    <td>${campaign.name}</td>
                    <td>${campaign.template}</td>
                    <td>${readableDate}</td>
                    <td>${campaign.profile}</td>
                    <td class="${statusClass}">${campaign.status}</td>
                    <td class="${buttonsClass}"></td>
                `;
            } else {
                row.innerHTML = `
                    <td>${campaign.name}</td>
                    <td>${campaign.template}</td>
                    <td>${readableDate}</td>
                    <td>${campaign.profile}</td>
                    <td class="${statusClass}">${campaign.status}</td>
                    <td class="${buttonsClass}">
                        <button type="button" id="btnRemoveCampaign" class="btn btn-danger btn-sm">Remove</button>
                    </td>
                `;
            }
            tbody.appendChild(row);

            const viewLogsBtn    = row.querySelector('.btn-info');
            const removeBtn      = row.querySelector('.btn-danger');

            if(viewLogsBtn){
                viewLogsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    viewLogs(campaign.id);
                });
            }
            if(removeBtn){
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    removeCampaign(campaign.name, campaign.id, campaign.status);
                });
            }
        });

        table.appendChild(tbody);
        listContainer.appendChild(table);
    } else {
        listContainer.textContent = 'No campaigns found.';
    }
}

function removeCampaign(campaignName, campaignId, campaignStatus) {
    if (campaignStatus === 'Scheduled') {
        const confirmExit = confirm(`Are you sure you want to remove the campaign "${campaignName}"? \nThis action cannot be undone. \n\nNote: The campaign is scheduled and will not be sent anymore.`);
        if (!confirmExit) {
            return; // Stop the function if the user cancels the operation
        }
    } else {
        const confirmExit = confirm(`Are you sure you want to delete the campaign "${campaignName}" and its logs? \nThis action cannot be undone.`);
        if (!confirmExit) {
            return; // Stop the function if the user cancels the operation
        }
    }

    const attemptRemoveCampaign = (token) => { // This attemptRemoveCampaign function will be called recursively if the token needs to be refreshed
        fetch('/removeCampaign', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ campaignName, campaignId }),
        })
        .then(result => {
            if(!result.ok) {
                if (result.status === 401 || result.status === 403) { // Unauthorized, so try to refresh the token
                    console.log('Token expired. Attempting to refresh token...');
                    return refreshToken().then(newToken => { // Refresh the token
                        console.log('Token refreshed successfully.');
                        return attemptRemoveCampaign(newToken); // Retry the original request with the new token
                    });
                }
                if (result.status === 404) {
                    throw new Error('Campaign not found');
                }
                throw new Error(`${result.status} - ${result.statusText}`);
            }
            return result.json();
        })
        .then(data => {
            showMessage(data.message, 'info'); // Show succes or failure
            fetchCampaigns(); // Refresh the employee list
        })
        .catch(error => {
            console.error(error);
            showMessage(error.message, 'danger');
        });
    };

    // Start the process with the current token
    attemptRemoveCampaign(localStorage.getItem('accessToken'));

}

function viewLogs(campaignId) {
    window.location.href = `/campaignLogs?campaignId=${campaignId}`;
}

function getStatusClass(status){
    switch(status){
        case 'Sent': return 'status-sent';
        case 'Failed': return 'status-failed';
        case 'Sending..': return 'status-sending';
        case 'Scheduled': return 'status-scheduled';
        default: return '';
    }
}

function getButtonsClass(status){
    switch(status){
        case 'Sent': return 'button-sent';
        case 'Failed': return 'button-failed';
        case 'Sending..': return 'button-sending';
        case 'Scheduled': return 'button-scheduled';
        default: return '';
    }
}

function addCampaign() {
    const name = document.getElementById('modalCampaignName').value;
    let emailTemplateId = document.getElementById('modalEmailTemplate').value;
    emailTemplateId = emailTemplateId.charAt(0).toLowerCase() + emailTemplateId.slice(1);
    //const landingPageId = document.getElementById('modalLandingPage').value;
    const launchDate = document.getElementById('modalLaunchDate').value;
    const sendingProfileId = document.getElementById('modalSendingProfile').value;
    const groupIds = getSelectedGroupIds('modalGroups');
    updateUI();

    const sendAddCampaignRequest = (token) => { // This sendAddCampaignRequest function will be called recursively if the token needs to be refreshed

        fetch('/addCampaign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, emailTemplateId, launchDate, sendingProfileId, groupIds }),
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 401 || response.status === 403) { // Unauthorized, so try to refresh the token
                console.log('Token expired. Attempting to refresh token...');
                throw new Error('Token expired or invalid'); // if we get this error
            } else if (response.status === 400) {
                throw new Error('All the fields are required in order to launch a campaign!');
            } else if (response.status === 409) {
                return response.json();
            }
        })
        .then(data => {
            showMessage(data.message, 'danger');
            if (data.message.includes('Campaign scheduled successfully')) {
                messageDisplay.className = 'alert alert-success';
                document.getElementById('modalCampaignName').value = '';
                document.getElementById('modalEmailTemplate').value = '';
                document.getElementById('modalLaunchDate').value = '';
                document.getElementById('modalSendingProfile').value = '';
                document.getElementById('modalGroups').value = '';
                fetchCampaigns(); // Refresh the campaign list
            }
        })
        .catch(error => {
            if (error.message === 'Token expired or invalid') { // we will begin this part of code and refresh the token
                refreshToken().then(newToken => { // the token is refreshed
                    sendAddCampaignRequest(newToken); // Retry with new token
                    console.log('Token refreshed successfully.');
                }).catch(error => {
                    showMessage('Failed to refresh token. Please log in again.', 'danger');
                });
            } else {
                showMessage('Error: ' + error.message, 'danger');
            }
        });
    };
    var modalElement = document.getElementById('newCampaignModal');
    var modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }

    sendAddCampaignRequest(localStorage.getItem('accessToken'));
}

function getSelectedGroupIds(selectElementId) {
    const selectElement = document.getElementById(selectElementId);
    const selectedOptions = Array.from(selectElement.selectedOptions);
    return selectedOptions.map(option => option.value);
}