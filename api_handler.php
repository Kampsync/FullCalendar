<?php
error_reporting(0);
ini_set('display_errors', 0);
require_once 'config.php';
// Ignore auth for now - bypass authentication
// AuthMiddleware::requireAuth();
// AuthMiddleware::validateSession();

// Helper function to make API calls to Xano
function callXanoAPI($endpoint, $method = 'GET', $data = null) {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: KampSync-Calendar/1.0'
    ]);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        return [
            'status' => 500,
            'error' => 'CURL Error: ' . $error
        ];
    }
    
    $decodedResponse = json_decode($response, true);
    
    return [
        'status' => $httpCode,
        'data' => $decodedResponse,
        'raw_response' => $response
    ];
}

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    $action = sanitizeInput($_POST['action']);
    $response = ['status' => 400, 'error' => 'Invalid action'];
    
    try {
        switch ($action) {
                    case 'fetch_listings':
            $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
            $apiResponse = callXanoAPI(XANO_FETCH_LISTINGS . '?user_id=' . $user_id);
                
                if (validateApiResponse($apiResponse)) {
                    $response = [
                        'status' => 200,
                        'data' => $apiResponse['data'],
                        'message' => 'Listings fetched successfully'
                    ];
                } else {
                    $response = [
                        'status' => $apiResponse['status'] ?? 500,
                        'error' => formatApiError($apiResponse['data'] ?? 'Failed to fetch listings')
                    ];
                }
                break;
                
                    case 'fetch_bookings':
            $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
                $endpoint = 'https://xfxa-cldj-sxth.n7e.xano.io/api:PYL3lpvT/fetch_booking_events?user_id=' . $user_id;
                $apiResponse = callXanoAPI($endpoint);
                
                if (validateApiResponse($apiResponse)) {
                    $response = [
                        'status' => 200,
                        'data' => $apiResponse['data'],
                        'message' => 'Bookings fetched successfully'
                    ];
                } else {
                    $response = [
                        'status' => $apiResponse['status'] ?? 500,
                        'error' => formatApiError($apiResponse['data'] ?? 'Failed to fetch bookings')
                    ];
                }
                break;
                
                    case 'create_custom_event':
            $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
            $eventData = [
                'user_id' => $user_id,
                    'listing_id' => sanitizeInput($_POST['listing_id'] ?? null),
                    'start_date' => sanitizeInput($_POST['start_date']),
                    'end_date' => sanitizeInput($_POST['end_date']),
                    'notes' => sanitizeInput($_POST['notes'] ?? ''),
                    'event_type' => 'custom_block'
                ];
                
                // Validate required fields
                if (empty($eventData['start_date']) || empty($eventData['end_date'])) {
                    $response = [
                        'status' => 400,
                        'error' => 'Start date and end date are required'
                    ];
                    break;
                }
                
                $apiResponse = callXanoAPI(XANO_CREATE_CUSTOM_EVENT, 'POST', $eventData);
                
                if (validateApiResponse($apiResponse)) {
                    $response = [
                        'status' => 200,
                        'data' => $apiResponse['data'],
                        'message' => 'Custom event created successfully'
                    ];
                } else {
                    $response = [
                        'status' => $apiResponse['status'] ?? 500,
                        'error' => formatApiError($apiResponse['data'] ?? 'Failed to create custom event')
                    ];
                }
                break;
                
            case 'update_listing_color':
                $listing_id = sanitizeInput($_POST['listing_id']);
                $color = sanitizeInput($_POST['color']);
                $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
                
                if (empty($listing_id) || empty($color)) {
                    $response = [
                        'status' => 400,
                        'error' => 'Listing ID and color are required'
                    ];
                    break;
                }
                
                // Store color in session for now (in production, this would update the database)
                $_SESSION['listing_colors'][$listing_id] = $color;
                
                $response = [
                    'status' => 200,
                    'message' => 'Color updated successfully',
                    'data' => ['listing_id' => $listing_id, 'color' => $color]
                ];
                break;
                
            case 'get_listing_colors':
                $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
                $response = [
                    'status' => 200,
                    'data' => $_SESSION['listing_colors'] ?? []
                ];
                break;
                
            case 'assign_driver_cleaner':
                $booking_id = sanitizeInput($_POST['booking_id']);
                $assignee_type = sanitizeInput($_POST['assignee_type']); // 'driver' or 'cleaner'
                $assignee_email = sanitizeInput($_POST['assignee_email']);
                $assignee_name = sanitizeInput($_POST['assignee_name']);
                $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
                
                if (empty($booking_id) || empty($assignee_type) || empty($assignee_email)) {
                    $response = [
                        'status' => 400,
                        'error' => 'Booking ID, assignee type, and email are required'
                    ];
                    break;
                }
                
                // Generate sub-user ID (e.g., user 1.1, 1.2, etc.)
                $subUserId = $user_id . '.' . (count($_SESSION['sub_users'] ?? []) + 1);
                
                // Store sub-user info in session (in production, this would be stored in database)
                $_SESSION['sub_users'][$subUserId] = [
                    'email' => $assignee_email,
                    'name' => $assignee_name,
                    'type' => $assignee_type,
                    'booking_id' => $booking_id,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                
                // In production, send email invite here
                // For demo purposes, just return success
                $response = [
                    'status' => 200,
                    'message' => 'Driver/Cleaner assigned successfully',
                    'data' => [
                        'sub_user_id' => $subUserId,
                        'assignee_email' => $assignee_email,
                        'assignee_name' => $assignee_name,
                        'assignee_type' => $assignee_type
                    ]
                ];
                break;
                
            case 'update_booking_notes':
                $booking_id = sanitizeInput($_POST['booking_id']);
                $notes = sanitizeInput($_POST['notes']);
                $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
                
                if (empty($booking_id)) {
                    $response = [
                        'status' => 400,
                        'error' => 'Booking ID is required'
                    ];
                    break;
                }
                
                // In production, this would update the Xano database
                // For demo purposes, store in session
                $_SESSION['booking_notes'][$booking_id] = $notes;
                
                $response = [
                    'status' => 200,
                    'message' => 'Notes updated successfully',
                    'data' => [
                        'booking_id' => $booking_id,
                        'notes' => $notes
                    ]
                ];
                break;
                
            case 'get_booking_notes':
                $booking_id = sanitizeInput($_POST['booking_id']);
                $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 2;
                
                if (empty($booking_id)) {
                    $response = [
                        'status' => 400,
                        'error' => 'Booking ID is required'
                    ];
                    break;
                }
                
                $notes = $_SESSION['booking_notes'][$booking_id] ?? '';
                
                $response = [
                    'status' => 200,
                    'data' => [
                        'booking_id' => $booking_id,
                        'notes' => $notes
                    ]
                ];
                break;
                
            default:
                $response = [
                    'status' => 400,
                    'error' => 'Invalid action: ' . $action
                ];
        }
    } catch (Exception $e) {
        $response = [
            'status' => 500,
            'error' => 'Server error: ' . $e->getMessage()
        ];
    }
    
    echo json_encode($response);
    exit;
}

// Handle OPTIONS requests for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Content-Type: application/json');
    echo json_encode(['status' => 200, 'message' => 'CORS preflight successful']);
    exit;
}
?> 