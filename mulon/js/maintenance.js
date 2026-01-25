// ========================================
// MULON - Maintenance Mode Module
// Shared across all Mulon pages
// ========================================

// ========================================
// CONFIGURATION
// ========================================
export const MAINTENANCE_MODE = true; // Set to false to disable maintenance mode
export const ADMIN_EMAILS = ['joelmulonde81@gmail.com', 'jordan.herrera@crpusd.org', 'captrojolmao@gmail.com'];
export const ACCESS_CODE = 'tonyaatefries'; // Secret access code for maintenance bypass

// ========================================
// HELPER FUNCTIONS
// ========================================
export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function hasStoredAdminAccess() {
  return sessionStorage.getItem('mulon_admin_access') === 'granted';
}

export function hasStoredCodeAccess() {
  return sessionStorage.getItem('mulon_code_access') === 'granted';
}

export function grantAdminAccess() {
  sessionStorage.setItem('mulon_admin_access', 'granted');
}

export function grantCodeAccess() {
  sessionStorage.setItem('mulon_code_access', 'granted');
}

export function revokeAdminAccess() {
  sessionStorage.removeItem('mulon_admin_access');
}

export function revokeCodeAccess() {
  sessionStorage.removeItem('mulon_code_access');
}

export function verifyAccessCode(code) {
  if (!code) return false;
  return code.toLowerCase().trim() === ACCESS_CODE.toLowerCase();
}

// ========================================
// MAINTENANCE CHECK
// ========================================

/**
 * Check maintenance access and redirect if needed
 * @param {Object} options - Configuration options
 * @param {Function} options.getUser - Function that returns the current user object (with email property)
 * @param {string} options.redirectUrl - URL to redirect to (default: maintenance.html)
 * @param {number} options.delay - Delay in ms to wait for auth (default: 1500)
 * @returns {Promise<boolean>} - Returns true if access granted, false if redirecting
 */
export function checkMaintenanceAccess(options = {}) {
  const {
    getUser = () => null,
    redirectUrl = 'maintenance.html',
    delay = 1500
  } = options;

  return new Promise((resolve) => {
    // Skip if maintenance mode is off
    if (!MAINTENANCE_MODE) {
      resolve(true);
      return;
    }

    // Check if user already has admin access stored in session
    if (hasStoredAdminAccess()) {
      console.log('[Maintenance] Admin access already granted (from session)');
      resolve(true);
      return;
    }

    // Check if user has code access stored in session
    if (hasStoredCodeAccess()) {
      console.log('[Maintenance] Code access already granted (from session)');
      resolve(true);
      return;
    }

    // Wait for auth to be ready
    setTimeout(() => {
      const user = getUser();

      if (user && isAdminEmail(user.email)) {
        grantAdminAccess();
        console.log('[Maintenance] Admin access granted for:', user.email);
        resolve(true);
      } else if (user) {
        // User is logged in but not admin
        console.log('[Maintenance] Access denied for:', user.email);
        revokeAdminAccess();
        redirectToMaintenance(redirectUrl);
        resolve(false);
      } else {
        // No user logged in
        console.log('[Maintenance] No user logged in, redirecting');
        revokeAdminAccess();
        redirectToMaintenance(redirectUrl);
        resolve(false);
      }
    }, delay);
  });
}

/**
 * Redirect to maintenance page if not already there
 * @param {string} url - The maintenance page URL
 */
export function redirectToMaintenance(url = 'maintenance.html') {
  if (!window.location.pathname.includes('maintenance.html')) {
    window.location.href = url;
  }
}

/**
 * Quick check that can be called synchronously
 * Returns true if definitely has access, false if needs async check
 */
export function hasMaintenanceAccess() {
  if (!MAINTENANCE_MODE) return true;
  return hasStoredAdminAccess() || hasStoredCodeAccess();
}

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.MulonMaintenance = {
    MAINTENANCE_MODE,
    ADMIN_EMAILS,
    ACCESS_CODE,
    isAdminEmail,
    hasStoredAdminAccess,
    hasStoredCodeAccess,
    grantAdminAccess,
    grantCodeAccess,
    revokeAdminAccess,
    revokeCodeAccess,
    verifyAccessCode,
    checkMaintenanceAccess,
    redirectToMaintenance,
    hasMaintenanceAccess
  };
}
