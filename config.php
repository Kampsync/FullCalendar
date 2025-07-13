<?php
// Xano API Configuration
define('XANO_BASE_URL', 'https://xfxa-cldj-sxth.n7e.xano.io/api:PYL3lpvT');
define('XANO_FETCH_LISTINGS', XANO_BASE_URL . '/fetch_listing_db');
define('XANO_FETCH_BOOKINGS', XANO_BASE_URL . '/fetch_booking_events');
define('XANO_CREATE_CUSTOM_EVENT', XANO_BASE_URL . '/create_custom_event');

// Application Configuration
define('APP_NAME', 'KampSync Calendar');
define('APP_VERSION', '1.0.0');
define('DEFAULT_USER_ID', 1); // For testing purposes

// Color options for listings
define('LISTING_COLORS', [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#F9E79F', '#A9CCE3', '#FAD7A0', '#D5A6BD', '#A3E4D7',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
]);

// Error reporting (set to 0 for production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS

// Timezone
date_default_timezone_set('UTC');

// Helper function to validate API responses
function validateApiResponse($response) {
    if (!$response || !isset($response['status'])) {
        return false;
    }
    
    return $response['status'] >= 200 && $response['status'] < 300;
}

// Helper function to sanitize input
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// Helper function to format API error messages
function formatApiError($error) {
    if (is_string($error)) {
        return $error;
    }
    
    if (isset($error['message'])) {
        return $error['message'];
    }
    
    return 'An unknown error occurred';
}
?> 