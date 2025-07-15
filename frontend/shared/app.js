export function initSidebar(){
    const hamBurger = document.querySelector(".toggle-btn");
    if(hamBurger) {
        hamBurger.addEventListener("click", () => {
            document.querySelector("#sidebar").classList.toggle("expand");
        });
    }
}

export function attachNavHandlers({ home, employees, profiles, groups, campaigns, logoutFn }) {
    document.getElementById('navHome')?.addEventListener('click', home);
    document.getElementById('navEmployees')?.addEventListener('click', employees);
    document.getElementById('navSendingProfiles')?.addEventListener('click', profiles);
    document.getElementById('navGroups')?.addEventListener('click', groups);
    document.getElementById('navCampaigns')?.addEventListener('click', campaigns);
    document.getElementById('navLogout')?.addEventListener('click', logoutFn);
}

export function showMessage(message, type) {
    const messageDisplay = document.getElementById('messageDisplay');
    messageDisplay.textContent = message; // Set the text of the message display area
    messageDisplay.style.display = 'block'; // Make the message display area visible
    messageDisplay.className = `alert alert-${type}`;
}