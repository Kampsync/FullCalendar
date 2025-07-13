<?php
require_once 'config.php';
require_once 'api_handler.php';

// Get user_id from query string, fallback to 2
$currentUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 2;
$userName = 'Manager User';
$userRole = 'manager';
$userEmail = 'manager@kampsync.com';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KampSync</title>
    
    <!-- FullCalendar Global Build (single file) -->
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js"></script>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Flatpickr for date/time picker -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    
    <!-- jQuery (required for Select2) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Select2 for multi-select dropdown -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/style.css?v=1.0.7">
</head>
<body>
    <div class="main-layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-section listing-info">
                <div class="listing-image">
                    <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=96&h=96" alt="Listing" />
                </div>
                <div class="listing-title">
                    <strong>KampSync</strong><br>
                    <!-- <span class="listing-desc">*With Solar*<br>*Memory Foam Mattress*</span> -->
                </div>
            </div>
            <div class="sidebar-section listing-list">
                <h4><i class="fas fa-list"></i> Listings</h4>
                <ul id="sidebar-listings" class="listing-list">
                    <!-- Listings will be populated by JavaScript -->
                </ul>
            </div>
        </aside>
        <!-- Main Content -->
        <div class="main-content">
           
                <div id="calendar-loader" class="hidden fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-20">
                  <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-solid"></div>
                </div>
                <div id="calendar" class="w-full min-w-[340px]"></div>
        </div>
    </div>

    <!-- Add Listing Modal -->
    <div id="add-listing-modal" class="fixed inset-0 z-50 flex items-start mt-6 sm:items-center sm:mt-0 justify-center bg-black bg-opacity-40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg p-4 sm:p-8 relative flex flex-col overflow-y-auto max-h-[90vh] mx-2">
            <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl font-bold focus:outline-none" onclick="document.getElementById('add-listing-modal').classList.add('hidden');document.getElementById('add-listing-modal').classList.remove('flex');">&times;</button>
            <h2 class="text-xl sm:text-2xl font-bold text-blue-700 mb-4 sm:mb-6 text-center">Add Listing</h2>
            <form id="add-listing-form" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label for="listing-name" class="font-medium text-gray-700">Listing Name</label>
                    <input type="text" id="listing-name" required class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="rvshare-ical-link" class="font-medium text-gray-700">List#1</label>
                    <input type="url" id="rvshare-ical-link" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="outdoorsy-ical-link" class="font-medium text-gray-700">List#2</label>
                    <input type="url" id="outdoorsy-ical-link" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="airbnb-ical-link" class="font-medium text-gray-700">List#3</label>
                    <input type="url" id="airbnb-ical-link" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="color_code" class="font-medium text-gray-700">Color</label>
                    <input type="color" id="color_code" value="#3b82f6" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full h-12 cursor-pointer" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="listing_picture" class="font-medium text-gray-700">Listing Picture</label>
                    <div class="flex items-center gap-2">
                        <input type="file" id="listing_picture" accept="image/*" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                        <button type="button" onclick="previewImage()" class="bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg py-2 px-4 transition-colors whitespace-nowrap">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                    <div id="image_preview" class="hidden mt-2">
                        <img id="preview_img" src="" alt="Preview" class="max-w-full h-32 object-cover rounded-lg border border-gray-300" />
                    </div>
                </div>
                <button type="submit" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 px-4 transition-colors w-full sm:w-auto">Add Listing</button>
            </form>
        </div>
    </div>

    <!-- Edit Listing Modal -->
    <div id="edit-listing-modal" class="fixed inset-0 z-50 flex items-start mt-6 sm:items-center sm:mt-0 justify-center bg-black bg-opacity-40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg p-4 sm:p-8 relative flex flex-col overflow-y-auto max-h-[90vh] mx-2">
            <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl font-bold focus:outline-none" onclick="closeEditListingModal()">&times;</button>
            <h2 class="text-xl sm:text-2xl font-bold text-blue-700 mb-4 sm:mb-6 text-center">Edit Listing</h2>
            <form id="edit-listing-form" class="flex flex-col gap-4">
                <input type="hidden" id="edit-listing-id" />
                <div class="flex flex-col gap-1">
                    <label for="edit-listing-name" class="font-medium text-gray-700">Listing Name</label>
                    <input type="text" id="edit-listing-name" required class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="edit-color-code" class="font-medium text-gray-700">Color</label>
                    <input type="color" id="edit-color-code" value="#3b82f6" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full h-12 cursor-pointer" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="edit-listing-picture" class="font-medium text-gray-700">Listing Picture</label>
                    <div class="flex items-center gap-2">
                        <input type="file" id="edit-listing-picture" accept="image/*" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                        <button type="button" onclick="previewEditImage()" class="bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg py-2 px-4 transition-colors whitespace-nowrap">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                    <div id="edit-image-preview" class="hidden mt-2">
                        <img id="edit-preview-img" src="" alt="Preview" class="max-w-full h-32 object-cover rounded-lg border border-gray-300" />
                    </div>
                    <div id="current-image-display" class="mt-2">
                        <p class="text-sm text-gray-600 mb-2">Current Image:</p>
                        <img id="current-listing-image" src="" alt="Current Listing Image" class="max-w-full h-32 object-cover rounded-lg border border-gray-300" style="display: none;" />
                        <p id="no-current-image" class="text-sm text-gray-500">No image uploaded</p>
                    </div>
                </div>
                <button type="submit" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 px-4 transition-colors w-full sm:w-auto">Update Listing</button>
            </form>
        </div>
    </div>

    <!-- Booking Details Modal -->
    <div id="booking-modal" class="fixed inset-0 z-50 flex items-start mt-6 sm:items-center sm:mt-0 justify-center bg-black bg-opacity-40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg p-4 sm:p-8 relative flex flex-col overflow-y-auto max-h-[90vh] mx-2">
            <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl font-bold focus:outline-none close">&times;</button>
            <div id="booking-details"></div>
            <div id="booking-notes-section" style="display: none;"></div>
            <div id="assign-driver-section" style="display: none;"></div>
        </div>
    </div>

    <!-- View Listing Details Modal -->
    <div id="view-listing-modal" class="fixed inset-0 z-50 flex items-start mt-6 sm:items-center sm:mt-0 justify-center bg-black bg-opacity-40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg p-4 sm:p-8 relative flex flex-col overflow-y-auto max-h-[90vh] mx-2">
            <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl font-bold focus:outline-none" onclick="closeViewListingModal()">&times;</button>
            <div id="listing-details"></div>
        </div>
    </div>

    <!-- Add Event Modal -->
    <div id="add-event-modal" class="fixed inset-0 z-50 flex items-start mt-6 sm:items-center sm:mt-0 justify-center bg-black bg-opacity-40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg p-4 sm:p-8 relative flex flex-col overflow-y-auto max-h-[90vh] mx-2">
            <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl font-bold focus:outline-none" onclick="closeAddEventModal()">&times;</button>
            <h2 class="text-xl sm:text-2xl font-bold text-blue-700 mb-4 sm:mb-6 text-center">Add Custom Event</h2>
            <form id="add-event-form" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label for="event-listings-select" class="font-medium text-gray-700">Select Listings</label>
                    <select id="event-listings-select" multiple class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" style="width: 100%;">
                        <!-- Listings will be populated by JavaScript -->
                    </select>
                </div>
                <div class="flex flex-col gap-1">
                    <label for="event-title" class="font-medium text-gray-700">Event Title</label>
                    <input type="text" id="event-title" required placeholder="Enter event title..." class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="event-start-date" class="font-medium text-gray-700">Start Date</label>
                    <input type="date" id="event-start-date" required class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="event-end-date" class="font-medium text-gray-700">End Date</label>
                    <input type="date" id="event-end-date" required class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none w-full" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="event-notes" class="font-medium text-gray-700">Notes</label>
                    <textarea id="event-notes" rows="3" placeholder="Add notes for this event..." class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none resize-y w-full"></textarea>
                </div>
                <button type="submit" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 px-4 transition-colors w-full sm:w-auto">Add Event</button>
            </form>
        </div>
    </div>



    <!-- Custom JS -->
    <script>
        // Pass PHP variables to JavaScript
        window.currentUserId = <?php echo json_encode($currentUserId); ?>;
        window.userRole = <?php echo json_encode($userRole); ?>;
        window.userName = <?php echo json_encode($userName); ?>;
    </script>
    <script src="assets/js/calendar.js?v=1.0.7"></script>
    <script>
function sendHeightToParent() {
  if (window.parent !== window) {
    const height = Math.round(document.documentElement.scrollHeight * 1.05); // 105%
    window.parent.postMessage({ type: 'resize-iframe', height }, '*');
  }
}
window.addEventListener('load', sendHeightToParent);
window.addEventListener('resize', sendHeightToParent);
// If you open/close modals dynamically, call sendHeightToParent() after those actions too.
</script>
</body>
</html> 