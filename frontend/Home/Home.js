import { initSidebar, attachNavHandlers } from "../shared/app.js";
import { refreshToken, logout } from "../shared/auth.js";

initSidebar();

function goToHome() { window.location.href = '/home'; }
function goToEmployees() { window.location.href = '/employees'; }
function goToSendingProfiles() { window.location.href = '/profiles'; }
function goToCampaigns() { window.location.href = '/campaigns'; }
function goToGroups() { window.location.href = '/groups'; }

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
    }).catch(() => {
        // If the token refresh fails, logout and redirect to the login page:
        logout(true);
    });
});