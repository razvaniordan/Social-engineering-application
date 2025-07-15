import { initSidebar, attachNavHandlers } from "../shared/app.js";
import { refreshToken, handleResponse, logout } from "../shared/auth.js";

initSidebar();

function goToHome() { window.location.href = '/home'; }
function goToEmployees() { window.location.href = '/employees'; }
function goToSendingProfiles() { window.location.href = '/profiles'; }
function goToCampaigns() { window.location.href = '/campaigns'; }
function goToGroups() { window.location.href = '/groups'; }

let currentPage = 0; // Current page index
let totalLogs = 0; // Total number of logs
let totalEmployees = 0; // Total number of employees
const pageSize = 10; // Campaigns per page
const pageSizeLogs = 10;
let currentPageLogs = 0;

function showLogsModal(employeeName, employeeToken) {
    document.getElementById('logsModalLabel').textContent = `Logs of ${employeeName}`;
    fetchLogs(0, employeeName, employeeToken);
    
    var modalElement = document.getElementById('logsModal');
    var modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function changeLogsPage(direction, employeeName, employeeToken){
    const newLogsPage = currentPageLogs + direction;
    if (newLogsPage < 0 || newLogsPage * pageSizeLogs >= totalLogs) return;
    currentPageLogs = newLogsPage;
    fetchLogs(currentPageLogs, employeeName, employeeToken);
}

document.getElementById('searchEmployee').addEventListener('input', debouncedLoadEmployees);

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
        // If the token refresh fails, redirect to the login page:
        logout(true);
    });

    document.getElementById('btnBack')?.addEventListener('click', goToCampaigns);
    document.getElementById('btnNextPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(1);
    });
    document.getElementById('btnPrevPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changePage(-1);
    });
    document.getElementById('btnNextLogsPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changeLogsPage(1, eName, eToken);
    });
    document.getElementById('btnPrevLogsPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        changeLogsPage(-1, eName, eToken);
    });
});

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

async function fetchCampaignDetails(campaignId) {
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };
    try {
        const response = await fetch(`/campaignDetails?campaignId=${campaignId}`, fetchOptions);
        if (!response.ok) {
            throw new Error('Failed to fetch campaign details');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching campaign details:', error);
    }
}

function fetchEmployees() {
    const campaignId = new URLSearchParams(window.location.search).get('campaignId');
    const employeeName = document.getElementById('searchEmployee').value;
    
    const query = `?campaignId=${campaignId}&page=${currentPage}&size=${pageSize}&employeeName=${encodeURIComponent(employeeName)}`;
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };

    fetch(`/campaignEmployees${query}`, fetchOptions)
        .then(handleResponse) // This will check for 401 status and attempt to refresh the token.
        //.then(response => response.json())
        .then(data => {
            let globalEmployees = data.rows;
            totalEmployees = data.count;
            // Check if the current page is beyond the new total pages and adjust accordingly
            const totalPageCount = Math.ceil(totalEmployees / pageSize);
            if (currentPage >= totalPageCount) {
                currentPage = Math.max(0, totalPageCount - 1); // Adjust to the last page if current page exceeds total pages
                if (totalPageCount > 0){
                    fetchEmployees(); // Refetch groups for the new current page
                } else {
                    loadEmployees([]); // Prevent further execution in this call
                }
            } else {
                updatePageIndicator(totalEmployees, currentPage, pageSize);
                loadEmployees(globalEmployees);
            }

        })
        .catch(error => console.error('Error fetching logs:', error.message));
}

async function loadEmployees(employees) { 
    // Process the logs and insert them into the DOM
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('campaignId');
    const campaignDetails = await fetchCampaignDetails(campaignId);

    const employeesContainer = document.getElementById('employeesList');
    employeesContainer.innerHTML = ''; // Clear the current logs

    if (Array.isArray(employees) && employees.length > 0) {
        const tableEmployee = document.createElement('table');
        tableEmployee.className = 'table'; // Added Bootstrap class for styling

        const theadEmployee = document.createElement('thead');
        theadEmployee.innerHTML = `<tr>
            <th scope="col">Employees of campaign ${campaignDetails.name}</th>
            <th scope="col">Actions</th>
        </tr>`;
        tableEmployee.appendChild(theadEmployee);

        // Create table body
        const tbodyEmployee = document.createElement('tbody');

        // Populate table rows
        employees.forEach(employee => { // Don't forget that employees are the CampaignEmployee objects not Employee objects !!!
            const row = document.createElement('tr');

            //const employeeName = employee.CampaignEmployee ? `${employee.CampaignEmployee.employeeFirstName} ${employee.CampaignEmployee.employeeLastName}` : 'Unknown';
            const employeeName = employee.employeeFirstName + ' ' + employee.employeeLastName;
            row.innerHTML = `
                <td>${employeeName}</td>
                <td>
                    <button type="button" id="btnShowLogsModal" class="btn btn-info btn-sm">View logs</button>
                <td>
            `;
            // console.log("Name: ", employeeName);
            // console.log("Token: ", employee.employeeToken);
            // console.log("Employee: ", employee);

            tbodyEmployee.appendChild(row);

            const showLogsModalBtn = row.querySelector('.btn-info');
            showLogsModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showLogsModal(employeeName, employee.employeeToken);
            });
        });

        tableEmployee.appendChild(tbodyEmployee);
        employeesContainer.appendChild(tableEmployee);
        // console.log("Employees: ", employees);
        // console.log("EmployeesContainer: ", employeesContainer);
    } else {
        employeesContainer.textContent = 'No logs found.';
    }
}

function fetchLogs(page, employeeName, employeeToken) {
    const campaignId = new URLSearchParams(window.location.search).get('campaignId');
    const query = `?campaignId=${campaignId}&page=${page}&size=${pageSizeLogs}&employeeName=${encodeURIComponent(employeeName)}&employeeToken=${employeeToken}`;
    const fetchOptions = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    };

    fetch(`/logsList${query}`, fetchOptions)
        .then(handleResponse) // This will check for 401 status and attempt to refresh the token.
        .then(data => {
            totalLogs = data.count;
            const totalPageCountLogs = Math.ceil(totalLogs / pageSizeLogs);
            updateLogsPageIndicatorLogs(page + 1, totalPageCountLogs); // Update page indicator with the new current page
            const tbody = document.getElementById('logsTable').querySelector('tbody');
            tbody.innerHTML = ''; // Clear the current logs

            data.rows.forEach(log => {
                let detailsText = log.type === 'ClickLog' ? 'Opened the link' : 'Submitted credentials';
                let buttonHTML = log.type === 'InformationData' ? `<button type="button" id="btnShowCredentials" class="btn btn-info btn-sm">View credentials</button>` : '';

                if (log.type === 'ClickLog') {
                    detailsText = `Clicked the link`;
                } else if (log.type === 'InformationData') {
                    detailsText = `Submitted credentials`;
                } else if (log.type === 'EmailOpen'){
                    detailsText = `Opened the email`;
                }

                const date = new Date(log.createdAt);
                const readableDate = date.toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${detailsText}</td>
                    <td>${readableDate}</td>
                    <td>${buttonHTML}</td>
                `;
                tbody.appendChild(row);

                const showCredentialsBtn = row.querySelector('.btn-info');
                if(showCredentialsBtn) {
                    showCredentialsBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        showCredentials(log.id);
                    });
                }
            });
        })
        .catch(error => console.error('Error fetching logs:', error.message));
}

function updateLogsPageIndicatorLogs(currentPage, totalPageCount) {
    const pageIndicatorLogs = document.getElementById('pageIndicatorLogs');
    pageIndicatorLogs.textContent = `Page ${currentPage} of ${totalPageCount}`;
}

function showCredentials(logId) {
    fetch(`/credentials/${logId}`, {
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        displayCredentialsModal(data);
    })
    .catch(error => console.error('Error fetching credentials:', error.message));
}

function displayCredentialsModal(credentials) {
    // Populate the table with credentials data
    document.getElementById('username').textContent = credentials.username;
    document.getElementById('password').textContent = credentials.password;

    // Using Bootstrap's modal methods to show the modal
    var modalElement = document.getElementById('credentialsModal');
    var modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}