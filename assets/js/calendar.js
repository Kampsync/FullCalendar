// Global variables
let calendar;
let listings = [];
let bookings = [];
let platforms = [];
let listingColors = {};
let selectedListings = new Set(); // Track selected listings
let isInitialLoad = true; // Track if this is the first load
let currentUserId = window.currentUserId || 2; // Get from PHP session

// Demo unavailable/blocked/pricing logic for July 2025
const demoUnavailable = [1, 2, 13, 14, 15, 16, 17, 18, 19, 25, 26];
const demoBlocked = [3, 4, 5, 7];
const demoPrice = 69;

// Color options for listings
const colorOptions = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#F9E79F', '#A9CCE3', '#FAD7A0', '#D5A6BD', '#A3E4D7',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    //console.log('DOM loaded, initializing calendar...');
    //console.log('FullCalendar available:', typeof FullCalendar !== 'undefined');
    //console.log('Calendar element exists:', !!document.getElementById('calendar'));
    initializeCalendar();
    setupEventListeners();
    loadListings();
});

// Initialize FullCalendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    if (!calendarEl) {
        console.error('Calendar element not found!');
        return;
    }
    
    //console.log('Initializing FullCalendar...');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        customButtons: {
            addListing: {
                text: 'Add Listing',
                click: function() {
                    const modal = document.getElementById('add-listing-modal');
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            },
            addEvent: {
                text: 'Add Event',
                click: function() {
                    const modal = document.getElementById('add-event-modal');
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                    
                    // Ensure listings are loaded and initialize Select2
                    if (listings && listings.length > 0) {
                        setTimeout(() => {
                            console.log('Opening modal, initializing Select2...');
                            console.log('jQuery available:', typeof $ !== 'undefined');
                            console.log('Select2 available:', typeof $.fn.select2 !== 'undefined');
                            console.log('Listings available:', listings && listings.length);
                            initializeEventSelect2();
                        }, 100);
                    } else {
                        // Load listings first, then initialize Select2
                        console.log('Loading listings first...');
                        loadListings().then(() => {
                            setTimeout(() => {
                                console.log('Listings loaded, initializing Select2...');
                                initializeEventSelect2();
                            }, 200);
                        });
                    }
                }
            }
        },
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'addEvent,addListing'
        },
        height: 'auto',
        dayMaxEvents: true,
        selectable: true,
        selectMirror: true,
        editable: false,
        eventClick: handleEventClick,
        select: handleDateSelect,
        events: fetchEvents,
        eventDidMount: handleEventDidMount,
        dayCellDidMount: customDayCellMount,
        loading: function(isLoading) {
            const loader = document.getElementById('calendar-loader');
            if (loader) {
                if (isLoading) {
                    loader.classList.remove('hidden');
                    loader.classList.add('flex');
                } else {
                    loader.classList.add('hidden');
                    loader.classList.remove('flex');
                }
            }
        },
    });
    
    //console.log('Calendar configured, rendering...');
    calendar.render();
    //console.log('Calendar rendered successfully!');
}

// Open maps with address
function openMaps(address) {
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Use Apple Maps on iOS, Google Maps on Android
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.open(`maps://maps.apple.com/?q=${encodeURIComponent(address)}`);
        } else {
            window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`);
        }
    } else {
        // Desktop - use Google Maps
        window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`);
    }
}

// Fetch events from API
async function fetchEvents(info, successCallback, failureCallback) {
    try {
        //console.log('Fetching events for:', info.startStr, 'to', info.endStr);
        
        // Call the Xano API directly for booking events
        const response = await fetch(`https://xfxa-cldj-sxth.n7e.xano.io/api:PYL3lpvT/fetch_booking_events?user_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const bookings = await response.json();
        //console.log('Xano API response:', bookings);
        
       
        
        // Fetch listings with color codes
        const listingsResponse = await fetch(`https://xfxa-cldj-sxth.n7e.xano.io/api:92ldKExH/userlistings?user_id=${currentUserId}`);
        
        if (!listingsResponse.ok) {
            throw new Error(`HTTP error! status: ${listingsResponse.status}`);
        }
        
        const listings = await listingsResponse.json();
        //console.log('Listings with colors:', listings);
        
        // Create a map of listing_id to color_code
        const listingColorMap = {};
        listings.forEach(listing => {
            listingColorMap[listing.id] = listing.color_code || '#3b82f6';
        });
        
        // Render sidebar listings
        renderSidebarListings(listings);
        
        //console.log('Listing Color Map:', listingColorMap);
        //console.log('Sample booking Listing_id:', bookings[0]?.Listing_id, 'Type:', typeof bookings[0]?.Listing_id);
        
        const allEvents = [];
        
        // Process booking events
        if (Array.isArray(bookings)) {
            const bookingEvents = bookings.map(booking => {
                // Extract customer name from summary
                let customerName = null;
                let platform = booking.source_platform || 'Booking';
                
                // Parse customer name from summary
                if(booking.custom_event_title){
                    customerName = booking.custom_event_title;
                }
                else if (booking.summary) {
                    // Handle different summary formats
                    if (booking.summary.includes(' - ')) {
                        const parts = booking.summary.split(' - ');
                        if (parts.length >= 2) {
                            customerName = parts[1].split(' ')[0]; // Get first name
                        }
                    } else if (booking.summary.includes('booking - ')) {
                        const parts = booking.summary.split('booking - ');
                        if (parts.length >= 2) {
                            customerName = parts[1].split(' ')[0]; // Get first name
                        }
                    }
                }
                
                // Generate booking link based on platform and UID
                let bookingLink = booking.reservation_id; // Default fallback
                const rawUID = booking.uid || '';
                
                if ( ( platform?.includes('rvshare') || platform?.includes('rvshare') ) && rawUID.length > 10 && !rawUID.includes('Booking')) {
                    bookingLink = `https://rvshare.com/dashboard/reservations`;
                } else if ((platform?.includes('outdoorsy') || platform?.includes('Outdoorsy') ) && rawUID.includes('Booking')) {
                    // Extract ID after dash for Outdoorsy bookings
                    const match = rawUID.match(/—\s*(\d+)/);
                    if (match) {
                        bookingLink = `https://www.outdoorsy.com/dashboard/bookings/${match[1]}`;
                    }
                }
                
                
                booking.summary;
                // Ensure end date is always present
                let endDate = booking.end_date || booking.start_date;
                if (!endDate || endDate === booking.start_date) {
                    endDate = booking.start_date;
                }
                
                // Create title - show platform only if no customer name found
                const eventTitle = customerName ? `${platform} - ${customerName}` : platform;
                
                // Get color from listing map, fallback to default blue
                const listingId = booking.Listing_id;
                const eventColor = listingColorMap[listingId] || listingColorMap[parseInt(listingId)] || '#3b82f6';
                //console.log(`Booking ${booking.id}: Listing_id=${listingId}, Color=${eventColor}`);
                //console.log('Event color:', eventColor);

                
                
                return {
                    id: booking.id,
                    title: booking.custom_event_title ? booking.custom_event_title : booking.summary,
                    start: booking.start_date,
                    end: endDate,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    color: eventColor,
                    textColor: '#ffffff',
                    extendedProps: {
                        custom_event_title:booking.custom_event_title,
                        platform: platform,
                        customer_name: customerName,
                        delivery_address: null, // Not available in current API
                        notes: booking.notes,
                        booking_link: bookingLink,
                        listing_id: booking.Listing_id,
                        event_type: 'booking',
                        summary: booking.summary,
                        uid: booking.uid,
                        source_platform: booking.source_platform,
                        booking: booking
                    }
                };
            });
            allEvents.push(...bookingEvents);
        }
        
       
        
        // Filter events based on selected listings
        const filteredEvents = allEvents.filter(event => {
            const listingId = event.extendedProps.listing_id;
            return selectedListings.has(listingId) || selectedListings.has(parseInt(listingId));
        });
        
        // //console.log('Processed events:', allEvents);
        //console.log('Filtered events:', filteredEvents);
        successCallback(filteredEvents);
    } catch (error) {
        console.error('Error fetching events:', error);
        failureCallback(error);
    }
}

// Call save_kampsync_ical API for a listing
async function callSaveKampSyncIcal(listingId) {
    try {
        const response = await fetch('https://xfxa-cldj-sxth.n7e.xano.io/api:yHTBBmYY/save_kampsync_ical', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                listing_id: listingId
            })
        });
        
        if (response.ok) {
            const responseData = await response.json();
            console.log(`Successfully called save_kampsync_ical for listing ${listingId}:`, responseData);
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            console.error(`Failed to call save_kampsync_ical for listing ${listingId}:`, response.status, errorData);
        }
    } catch (error) {
        console.error(`Error calling save_kampsync_ical for listing ${listingId}:`, error);
    }
}

// Load listings from Xano API
async function loadListings() {
    try {
        const response = await fetch(`https://xfxa-cldj-sxth.n7e.xano.io/api:92ldKExH/userlistings?user_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const listingsData = await response.json();
        // //console.log('Loaded listings:', listingsData);
        
        // Store listings globally for access in viewListingDetails
        listings = listingsData;
        
        // Only initialize selected listings on the very first load
        if (isInitialLoad && listings.length > 0) {
            listings.forEach(listing => {
                selectedListings.add(listing.id);
            });
            isInitialLoad = false;
            
            // Call save_kampsync_ical for each listing on first load
            //console.log('Calling save_kampsync_ical for all listings on first load...');
            // for (const listing of listings) {
            //     await callSaveKampSyncIcal(listing.id);
            // }
        }
        
        // Render sidebar listings
        renderSidebarListings(listings);
        
        // Populate event listing dropdown
        populateEventListingDropdown();
        
        // Refresh calendar with new data
        calendar.refetchEvents();
    } catch (error) {
        console.error('Error loading listings:', error);
        showMessage('Error loading listings', 'error');
    }
}

// Note: Old filter functions removed - now using sidebar checkboxes for listing selection

// Handle event click
function handleEventClick(info) {
    const event = info.event;
    //console.log('Event clicked:', event);
    const props = event.extendedProps;
    //console.log('Event clicked:', props);
    
    // Check if this is a custom event
    const isCustomEvent = props.event_type === 'custom' || (props.custom_event_title && props.custom_event_title.trim() !== '');
    
    // Populate booking details modal
    const modal = document.getElementById('booking-modal');
    const detailsContainer = document.getElementById('booking-details');

    const listing = listings.find(l => l.id === props.listing_id);
    if (!listing) {
        console.error('Listing not found:', props.listing_id);
    }
    
    let detailsHTML = '';
    
    if (isCustomEvent) {
        // Custom event display
        detailsHTML = `
            <div class="booking-info">
                <h3>Custom Event</h3>
                <div class="booking-detail">
                    <strong>Title:</strong> ${props.custom_event_title || props.summary}
                </div>
                <div class="booking-detail">
                    <strong>Dates:</strong> ${formatDate(event.start)} ${event.end ? '- ' + formatDate(event.end) : ''}
                </div>
                <div class="booking-detail">
                    <strong>Listing:</strong> ${listing ? listing.listing_name : `Listing ${props.listing_id}`}
                </div>
        `;
        
        if (props.notes) {
            detailsHTML += `
                <div class="booking-detail">
                    <strong>Notes:</strong> ${props.notes}
                </div>
            `;
        }
        
        detailsHTML += `
            </div>
            <div class="booking-actions">
                <button id="edit-notes-btn" class="btn-secondary">Edit Notes</button>
            </div>
        `;
    } else {
        // Regular booking event display
        if(props.custom_event_title){

            detailsHTML = `
            <div class="booking-info">
                <h3>${props.custom_event_title} Booking</h3>
                <div class="booking-detail">
                    <strong>Title:</strong> ${props.custom_event_title}
                </div>
                <div class="booking-detail">
                    <strong>Dates:</strong> ${formatDate(event.start)} ${event.end ? '- ' + formatDate(event.end) : ''}
                </div>
                <div class="booking-detail">
                    <strong>Listing:</strong> ${listing ? listing.listing_name : `Listing ${props.listing_id}`}
                </div>
                <div class="booking-detail">
                    <strong>UID:</strong> ${props.uid}
                </div>
        `;
        }else{

            detailsHTML = `
            <div class="booking-info">
                <h3>${props.platform} Booking</h3>
                <div class="booking-detail">
                    <strong>Customer:</strong> ${props.customer_name}
                </div>
                <div class="booking-detail">
                    <strong>Summary:</strong> ${props.summary || 'No summary available'}
                </div>
                <div class="booking-detail">
                    <strong>Dates:</strong> ${formatDate(event.start)} ${event.end ? '- ' + formatDate(event.end) : ''}
                </div>
                <div class="booking-detail">
                    <strong>Listing:</strong> ${listing ? listing.listing_name : `Listing ${props.listing_id}`}
                </div>
                <div class="booking-detail">
                    <strong>Platform:</strong> ${props.source_platform}
                </div>
                <div class="booking-detail">
                    <strong>UID:</strong> ${props.uid}
                </div>
        `;
        }
        
        if (props.booking_link) {
            detailsHTML += `
                <div class="booking-detail">
                    <strong>Reservation Link:</strong> 
                    <a href="${props.booking_link}" target="_blank" class="booking-link">
                        <i class="fas fa-external-link-alt"></i> View Reservation
                    </a>
                </div>
            `;
        }
        
        if (props.notes) {
            detailsHTML += `
                <div class="booking-detail">
                    <strong>Notes:</strong> ${props.notes}
                </div>
            `;
        }
        
        detailsHTML += `
            </div>
            <div class="booking-actions">
                <button id="edit-notes-btn" class="btn-secondary">Edit Notes</button>
            </div>
        `;
    }
    
    detailsContainer.innerHTML = detailsHTML;
    
    // Show notes section if editing
    const notesSection = document.getElementById('booking-notes-section');
    const assignSection = document.getElementById('assign-driver-section');
    notesSection.style.display = 'none';
    assignSection.style.display = 'none';
    notesSection.innerHTML = '';
    assignSection.innerHTML = '';
    
    // Event listeners for action buttons (safe checks)
    const editNotesBtn = document.getElementById('edit-notes-btn');
    if (editNotesBtn) {
        editNotesBtn.onclick = () => {
            assignSection.style.display = 'none';
            assignSection.innerHTML = '';
            notesSection.style.display = 'block';
            notesSection.innerHTML = `
                <h3 class='text-blue-700 font-semibold mb-2'>Notes</h3>
                <label for='booking-notes' class='font-medium text-gray-700 mb-1'>Notes</label>
                <textarea id='booking-notes' rows='4' placeholder='Add notes for this ${isCustomEvent ? 'event' : 'booking'}...' class='border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none resize-y mb-2 w-full'>${props.notes || ''}</textarea>
                <button id='save-notes-btn' class='mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 px-4 transition-colors float-right'>Save Notes</button>
            `;
            const saveNotesBtn = document.getElementById('save-notes-btn');
            if (saveNotesBtn) {
                saveNotesBtn.onclick = async () => {
                    const notes = document.getElementById('booking-notes').value;
                    await updateBookingNotes(event.id, notes);
                    notesSection.style.display = 'none';
                    notesSection.innerHTML = '';
                    
                    // Update the notes display in the booking details
                    const notesDetail = detailsContainer.querySelector('.booking-detail:has(strong:contains("Notes"))');
                    if (notesDetail) {
                        notesDetail.innerHTML = `<strong>Notes:</strong> ${notes}`;
                    } else {
                        // If notes section doesn't exist, add it
                        const notesHTML = `
                            <div class="booking-detail">
                                <strong>Notes:</strong> ${notes}
                            </div>
                        `;
                        detailsContainer.querySelector('.booking-info').insertAdjacentHTML('beforeend', notesHTML);
                    }
                };
            }
        };
    }

    // Show modal using Tailwind classes
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Attach close button event listener for this modal
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
    }
}

// Update booking notes
async function updateBookingNotes(bookingId, notes) {
    try {
        const response = await fetch(`https://xfxa-cldj-sxth.n7e.xano.io/api:92ldKExH/bookingevents/notes/${bookingId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                notes: notes
            })
        });
        
        if (response.ok) {
            showMessage('Notes updated successfully', 'success');
            
            // Update the event's notes in the calendar
            const event = calendar.getEventById(bookingId);
            if (event) {
                event.setExtendedProp('notes', notes);
            }
            
            // Refresh the calendar to show updated data
            calendar.refetchEvents();
            
            // Close the booking modal
            const modal = document.getElementById('booking-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        } else {
            const errorData = await response.json();
            showMessage('Failed to update notes: ' + (errorData.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error updating notes:', error);
        showMessage('Error updating notes', 'error');
    }
}



// Handle date selection
function handleDateSelect(info) {
    //console.log('Date selected:', info.startStr);
}

// Close add event modal
function closeAddEventModal() {
    const modal = document.getElementById('add-event-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Reset the form
    const form = document.getElementById('add-event-form');
    if (form) {
        form.reset();
    }
    
    // Reset and destroy Select2 dropdown
    const select = document.getElementById('event-listings-select');
    if (select && $(select).data('select2')) {
        $(select).val(null).trigger('change');
        $(select).select2('destroy');
    }
    
    // Reset form validation
    const submitBtn = document.querySelector('#add-event-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        console.log('Form reset - Button enabled');
    }
}

// Initialize Select2 for event listings when modal opens
function initializeEventSelect2() {
    console.log('initializeEventSelect2 called');
    const select = document.getElementById('event-listings-select');
    if (!select) {
        console.error('Select element not found');
        return;
    }
    
    console.log('Select element found:', select);
    
    // Check if jQuery and Select2 are available
    if (typeof $ === 'undefined') {
        console.error('jQuery not available');
        return;
    }
    
    if (typeof $.fn.select2 === 'undefined') {
        console.error('Select2 not available');
        return;
    }
    
    // Clear existing options
    select.innerHTML = '';
    
    // Check if listings are loaded
    if (!listings || listings.length === 0) {
        console.log('No listings available');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No listings available';
        option.disabled = true;
        select.appendChild(option);
        return;
    }
    
    console.log('Listings available:', listings.length);
    
    // Add options for each listing
    listings.forEach(listing => {
        const option = document.createElement('option');
        option.value = listing.id;
        option.textContent = listing.listing_name || `Listing ${listing.id}`;
        option.setAttribute('data-color', listing.color_code || '#3b82f6');
        select.appendChild(option);
    });
    
    // Destroy existing Select2 instance if it exists
    if ($(select).data('select2')) {
        $(select).select2('destroy');
    }
    
    // Initialize Select2 with proper configuration
    try {
        console.log('Attempting to initialize Select2...');
        console.log('jQuery object:', $(select));
        console.log('Select2 plugin available:', typeof $.fn.select2);
        
        $(select).select2({
            placeholder: 'Select listings...',
            allowClear: true,
            closeOnSelect: false,
            width: '100%',
            dropdownParent: $('#add-event-modal'),
            templateResult: formatListingOption,
            templateSelection: formatListingSelection,
            escapeMarkup: function(markup) {
                return markup;
            },
            language: {
                noResults: function() {
                    return "No listings found";
                },
                searching: function() {
                    return "Searching...";
                },
                inputTooShort: function() {
                    return "Please enter 1 or more characters";
                },
                errorLoading: function() {
                    return "The results could not be loaded.";
                }
            },
            minimumResultsForSearch: 0,
            maximumSelectionLength: 50,
            tags: false,
            tokenSeparators: [',', ' '],
            createTag: function(params) {
                return undefined; // Disable tag creation
            }
        });
        
        // Add "Select All" functionality
        addSelectAllButton(select);
        
        console.log('Select2 initialized successfully with', listings.length, 'listings');
        
        // Initialize form validation after Select2 is ready
        setTimeout(() => {
            updateFormValidation();
        }, 100);
    } catch (error) {
        console.error('Error initializing Select2:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        // Fallback to regular select if Select2 fails
        select.style.display = 'block';
        select.multiple = true;
        console.log('Falling back to regular select element');
    }
}

// Populate event listing Select2 dropdown (kept for backward compatibility)
function populateEventListingDropdown() {
    initializeEventSelect2();
}

// Add Select All button to Select2 dropdown
function addSelectAllButton(select) {
    const $select = $(select);
    
    // Create select all and clear all buttons
    const $selectAllBtn = $('<button type="button" class="select-all-btn">Select All</button>');
    const $clearAllBtn = $('<button type="button" class="clear-all-btn">Clear All</button>');
    const $buttonContainer = $('<div class="select2-buttons-container"></div>');
    $buttonContainer.append($selectAllBtn).append($clearAllBtn);
    
    // Add buttons to dropdown
    $select.on('select2:open', function() {
        setTimeout(() => {
            const $dropdown = $('.select2-results');
            if ($dropdown.find('.select2-buttons-container').length === 0) {
                $dropdown.prepend($buttonContainer);
            }
        }, 10);
    });
    
    // Handle select all click
    $(document).on('click', '.select-all-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const allOptions = $select.find('option').not(':disabled');
        const allValues = allOptions.map(function() {
            return this.value;
        }).get();
        
        $select.val(allValues).trigger('change');
        $select.trigger('select2:close');
        
        // Update form validation after selection
        setTimeout(() => {
            updateFormValidation();
        }, 50);
    });
    
    // Handle clear all click
    $(document).on('click', '.clear-all-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        $select.val(null).trigger('change');
        $select.trigger('select2:close');
        
        // Update form validation after clearing
        setTimeout(() => {
            updateFormValidation();
        }, 50);
    });
    
    // Add keyboard navigation support
    $select.on('select2:opening', function() {
        setTimeout(() => {
            const $searchBox = $('.select2-search__field');
            if ($searchBox.length) {
                $searchBox.focus();
            }
        }, 100);
    });
    
    // Handle selection events
    $select.on('select2:select', function(e) {
        console.log('Selected:', e.params.data);
        updateFormValidation();
    });
    
    $select.on('select2:unselect', function(e) {
        console.log('Unselected:', e.params.data);
        updateFormValidation();
    });
    
    // Handle clear all event
    $select.on('select2:clear', function(e) {
        console.log('All selections cleared');
        updateFormValidation();
    });
    
    // Handle dropdown events
    $select.on('select2:open', function() {
        // Ensure dropdown is properly positioned
        setTimeout(() => {
            const $dropdown = $('.select2-dropdown');
            if ($dropdown.length) {
                $dropdown.css('z-index', '9999');
            }
        }, 50);
    });
    
    // Handle keyboard events
    $select.on('keydown', function(e) {
        // Allow Enter to submit form when dropdown is closed
        if (e.key === 'Enter' && !$('.select2-dropdown').is(':visible')) {
            const form = $(this).closest('form');
            if (form.length) {
                form.submit();
            }
        }
    });
}

// Update form validation based on selection
function updateFormValidation() {
    const select = document.getElementById('event-listings-select');
    const submitBtn = document.querySelector('#add-event-form button[type="submit"]');
    
    if (select && submitBtn) {
        let selectedValues = [];
        
        // Check if Select2 is initialized
        if ($(select).data('select2')) {
            selectedValues = $(select).val() || [];
        } else {
            // Fallback for regular select
            const options = select.querySelectorAll('option:checked');
            selectedValues = Array.from(options).map(option => option.value);
        }
        
        const hasSelection = selectedValues.length > 0;
        
        if (hasSelection) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        console.log('Form validation updated - Selected:', selectedValues.length, 'Button disabled:', submitBtn.disabled);
    }
}

// Format listing option with color indicator
function formatListingOption(option) {
    if (!option.id) {
        return option.text;
    }
    
    const color = $(option.element).data('color') || '#3b82f6';
    const $option = $(`<span><div style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; margin-right: 8px; vertical-align: middle;"></div>${option.text}</span>`);
    return $option;
}

// Format selected listing with color indicator
function formatListingSelection(option) {
    if (!option.id) {
        return option.text;
    }
    
    const color = $(option.element).data('color') || '#3b82f6';
    const $selection = $(`<span><div style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 6px; vertical-align: middle;"></div>${option.text}</span>`);
    return $selection;
}

// Handle add event form submission
async function handleAddEventSubmit(event) {
    event.preventDefault();
    
    // Get selected listing IDs from Select2
    const select = document.getElementById('event-listings-select');
    let selectedListingIds = [];
    
    if (select && $(select).data('select2')) {
        selectedListingIds = $(select).val() ? $(select).val().map(id => parseInt(id)) : [];
    } else {
        // Fallback for when Select2 is not initialized
        const options = select.querySelectorAll('option:checked');
        selectedListingIds = Array.from(options).map(option => parseInt(option.value));
    }
    
    const eventTitle = document.getElementById('event-title').value;
    const startDate = document.getElementById('event-start-date').value;
    const endDate = document.getElementById('event-end-date').value;
    const notes = document.getElementById('event-notes').value;
    
    if (selectedListingIds.length === 0 || !eventTitle || !startDate || !endDate) {
        showMessage('Please select at least one listing and fill in all required fields', 'error');
        return;
    }
    
    try {
        // Create events for all selected listings
        const promises = selectedListingIds.map(listingId => {
            const eventData = {
                user_id: currentUserId,
                listing_id: listingId,
                start_date: startDate,
                end_date: endDate,
                notes: notes || '',
                custom_event_title: eventTitle
            };
            
            return fetch('https://xfxa-cldj-sxth.n7e.xano.io/api:PYL3lpvT/create_custom_event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });
        });
        
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        // Check if all requests were successful
        const allSuccessful = responses.every(response => response.ok);
        
        if (allSuccessful) {
            console.log('Custom events created:', results);
            
            const eventCount = selectedListingIds.length;
            const message = eventCount === 1 
                ? 'Custom event created successfully!' 
                : `${eventCount} custom events created successfully!`;
            
            showMessage(message, 'success');
            
            // Call save_kampsync_ical for all affected listings
            const savePromises = selectedListingIds.map(listingId => 
                callSaveKampSyncIcal(listingId)
            );
            await Promise.all(savePromises);
            
            // Close modal
            closeAddEventModal();
            
            // Refresh calendar to show new events
            calendar.refetchEvents();
        } else {
            const errorMessages = results
                .filter((result, index) => !responses[index].ok)
                .map(result => result.message || 'Unknown error')
                .join(', ');
            
            alert('Error creating custom events: ' + errorMessages);
        }
    } catch (error) {
        console.error('Error creating custom events:', error);
        alert('Error creating custom events: ' + error.message);
    }
}

// Handle event mount
function handleEventDidMount(info) {
    //console.log('Event mounted:', info.event.title);
}

// Custom day cell mount for demo unavailable/blocked dates
function customDayCellMount(arg) {
    // Remove all demo logic for blocked/unavailable placeholders
    // This function is now empty, but kept for possible future use
}

// Setup event listeners
function setupEventListeners() {
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    });
    
    // Add listing form submission
    const addListingForm = document.getElementById('add-listing-form');
    if (addListingForm) {
        addListingForm.addEventListener('submit', handleAddListingSubmit);
    }
    
    // Edit listing form submission
    const editListingForm = document.getElementById('edit-listing-form');
    if (editListingForm) {
        editListingForm.addEventListener('submit', handleEditListingSubmit);
    }
    
    // Add event form submission
    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', handleAddEventSubmit);
    }
    
    // Refresh calendar button
    const refreshBtn = document.getElementById('refresh-calendar');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            calendar.refetchEvents();
            showMessage('Calendar refreshed', 'success');
        });
    }
    
    // Export calendar button
    const exportBtn = document.getElementById('export-calendar');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCalendar);
    }
}

// New handler for add listing
async function handleAddListingSubmit(event) {
    event.preventDefault();
    const listingName = document.getElementById('listing-name').value;
    const rvshareIcal = document.getElementById('rvshare-ical-link').value;
    const outdoorsyIcal = document.getElementById('outdoorsy-ical-link').value;
    const airbnbIcal = document.getElementById('airbnb-ical-link').value;
    const colorCode = document.getElementById('color_code').value;
    
    try {
        const listingData = {
            user_id: currentUserId,
            listing_name: listingName,
            rvshare_ical_link: rvshareIcal,
            outdoorsy_ical_link: outdoorsyIcal,
            Airbnb_ical_link: airbnbIcal,
            color_code: colorCode
        };
        
        // Add image data if available
        if (currentBase64Image) {
            // Extract file info from base64
            const fileInput = document.getElementById('listing_picture');
            const file = fileInput.files[0];
            
            if (file) {
                // Convert file to base64 and use directly
                try {
                    const base64Data = await convertImageToBase64(file);
                    
                    // Use the base64 data as the path
                    listingData.user_listing_picture = {
                        access: "public",
                        path: base64Data,
                        name: file.name,
                        type: "image",
                        size: file.size,
                        mime: file.type,
                        meta: {}
                    };
                } catch (uploadError) {
                    console.error('Error converting image:', uploadError);
                    showMessage('Error processing image', 'error');
                    return;
                }
            }
        }
        
        const response = await fetch('https://xfxa-cldj-sxth.n7e.xano.io/api:92ldKExH/listings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(listingData)
        });
        
        if (response.ok) {
            const result = await response.json();
            const newListingId = result.id || result.listing_id;
            
            showMessage('Listing added successfully!', 'success');
            
            // Call save_kampsync_ical for the new listing
            // if (newListingId) {
            //     await callSaveKampSyncIcal(newListingId);
            // }
            
            // Close modal
            const modal = document.getElementById('add-listing-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            // Clear form
            document.getElementById('add-listing-form').reset();
            document.getElementById('color_code').value = '#3b82f6'; // Reset color to default
            document.getElementById('image_preview').classList.add('hidden');
            currentBase64Image = null;
            // Refresh calendar to show new listing
            calendar.refetchEvents();
            // Reload listings to get updated data
            loadListings();
        } else {
            const result = await response.json();
            alert('Error adding listing: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding listing:', error);
        alert('Error adding listing: ' + error.message);
    }
}

// Handler for edit listing
async function handleEditListingSubmit(event) {
    event.preventDefault();
    const listingId = document.getElementById('edit-listing-id').value;
    const listingName = document.getElementById('edit-listing-name').value;
    const colorCode = document.getElementById('edit-color-code').value;
    
    // Get the file input for image
    const fileInput = document.getElementById('edit-listing-picture');
    let imageData = null;
    
    // Check if a new image was selected
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Image size must be less than 5MB', 'error');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file', 'error');
            return;
        }
        
        // Convert file to base64 and use directly
        try {
            const base64Data = await convertImageToBase64(file);
            
            // Use the base64 data as the path
            imageData = {
                access: "public",
                path: base64Data,
                name: file.name,
                type: "image",
                size: file.size,
                mime: file.type,
                meta: {}
            };
        } catch (uploadError) {
            console.error('Error converting image:', uploadError);
            showMessage('Error processing image', 'error');
            return;
        }
    }
    
    try {
        const updateData = {
            user_id: currentUserId,
            listing_name: listingName,
            color_code: colorCode
        };
        
        // Add image data if a new image was selected
        if (imageData) {
            updateData.user_listing_picture = imageData;
        }
        
        const response = await fetch(`https://xfxa-cldj-sxth.n7e.xano.io/api:92ldKExH/listings/${listingId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            showMessage('Listing updated successfully!', 'success');
            
            // Call save_kampsync_ical for the updated listing
            //console.log(`Calling save_kampsync_ical for updated listing ${listingId}`);
            // await callSaveKampSyncIcal(listingId);
            
            // Close modal
            closeEditListingModal();
            // Refresh calendar to show updated colors and images
            calendar.refetchEvents();
            // Reload listings to get updated data
            loadListings();
        } else {
            const result = await response.json();
            alert('Error updating listing: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating listing:', error);
        alert('Error updating listing: ' + error.message);
    }
}

// Export calendar functionality
function exportCalendar() {
    const events = calendar.getEvents();
    const exportData = events.map(event => ({
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        platform: event.extendedProps.platform,
        customer: event.extendedProps.customer_name,
        address: event.extendedProps.delivery_address,
        notes: event.extendedProps.notes
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `kampsync-calendar-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showMessage('Calendar exported successfully', 'success');
}

// Render sidebar listings
function renderSidebarListings(listings) {
    const sidebarListings = document.getElementById('sidebar-listings');
    if (!sidebarListings) return;
    
    sidebarListings.innerHTML = '';
    
    // Note: selectedListings is now managed by loadListings function only
    
    listings.forEach(listing => {
        const li = document.createElement('li');
        const isChecked = selectedListings.has(listing.id) ? 'checked' : '';
        li.innerHTML = `
            <input type="checkbox" 
                   id="listing-${listing.id}" 
                   class="listing-checkbox" 
                   ${isChecked}
                   data-listing-id="${listing.id}">
            <label for="listing-${listing.id}" class="listing-checkbox-label">
                <div class="listing-color" style="background-color: ${listing.color_code || '#3b82f6'}"></div>
                <span class="listing-name">${listing.listing_name || `Listing ${listing.id}`}</span>
            </label>
            <button class="view-listing-btn" onclick="viewListingDetails(${listing.id})" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="edit-listing-btn" onclick="editListing(${listing.id}, '${listing.listing_name || ''}', '${listing.color_code || '#3b82f6'}')" title="Edit Listing">
                <i class="fas fa-edit"></i>
            </button>
        `;
        sidebarListings.appendChild(li);
    });
    
    // Add event listeners for checkboxes
    const checkboxes = sidebarListings.querySelectorAll('.listing-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleListingCheckboxChange);
    });
}

// Handle listing checkbox changes
function handleListingCheckboxChange(event) {
    const listingId = parseInt(event.target.dataset.listingId);
    const isChecked = event.target.checked;
    
    if (isChecked) {
        selectedListings.add(listingId);
    } else {
        selectedListings.delete(listingId);
    }
    
    //console.log('Selected listings:', Array.from(selectedListings));
    
    // Show user feedback about selection
    const selectedCount = selectedListings.size;
    const totalCount = document.querySelectorAll('.listing-checkbox').length;
    
    if (selectedCount === 0) {
        //console.log('No listings selected - calendar will be empty', 'info');
    } else {
        //console.log(`${selectedCount} of ${totalCount} listings selected`, 'info');
    }
    
    // Refresh calendar to show/hide events based on selection
    calendar.refetchEvents();
}

// View listing details
function viewListingDetails(listingId) {
    // Find the listing data
    const listing = listings.find(l => l.id === listingId);
    if (!listing) {
        console.error('Listing not found:', listingId);
        return;
    }
    
    // Populate the view modal with booking-details style structure
    const detailsContainer = document.getElementById('listing-details');
    
    let detailsHTML = `
        <div class="booking-info">
            <h3 style="font-size:1.25rem;font-weight:700;color:#2563eb;margin-bottom:18px;text-align:center;letter-spacing:0.2px;">Listing Details</h3>
            <div class="booking-detail">
                <strong>Name:</strong> ${listing.listing_name || `Listing ${listing.id}`}
            </div>
            <div class="booking-detail">
                <strong>Color:</strong> 
                <div style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background-color: ${listing.color_code || '#3b82f6'}; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-left: 8px; vertical-align: middle;"></div>
            </div>
    `;
    
    // Show listing picture if available
    //console.log('Listing data for image display:', listing);
    if (listing.user_listing_picture) {
        //console.log('Image data found:', listing.user_listing_picture);
        let imageSrc = '';
        
        // Handle different image formats from Xano
        if (typeof listing.user_listing_picture === 'string') {
            // Direct URL or base64
            imageSrc = listing.user_listing_picture;
            //console.log('Using string image source');
        } else if (listing.user_listing_picture.path) {
            // Xano file object with path
            const path = listing.user_listing_picture.path;
            
            // Check if path contains base64 data
            if (path.includes('data:image') || path.includes('base64')) {
                // It's base64 data, use directly
                imageSrc = path;
                //console.log('Using base64 image source');
            } else {
                // It's a URL, construct full URL
                imageSrc = listing.user_listing_picture.url;
                //console.log('Using URL image source:', imageSrc);
            }
        } else if (listing.user_listing_picture.url) {
            // Xano file object with URL
            imageSrc = listing.user_listing_picture.url;
            //console.log('Using URL image source:', imageSrc);
        }
        
        if (imageSrc) {
            //console.log('Final image source:', imageSrc);
            detailsHTML += `
                <div class="booking-detail">
                    <strong>Listing Picture:</strong>
                    <div class="mt-3 mb-4">
                        <img src="${imageSrc}" alt="Listing Picture" class="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300 shadow-sm" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <div class="hidden text-gray-500 text-sm mt-2 text-center">Image failed to load</div>
                    </div>
                </div>
            `;
        } else {
            //console.log('No valid image source found');
        }
    } else {
        //console.log('No user_listing_picture found in listing data');
    }
    
    // Use the kampsync_ical_link from the listing API
    if (listing.kampsync_ical_link) {
        detailsHTML += `
            <div class="booking-detail">
                <strong>iCal Feed Link:</strong>
                <div class="flex items-center gap-2 mt-2">
                    <input type="text" value="${listing.kampsync_ical_link}" readonly class="flex-1 border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm font-mono" />
                    <button onclick="copyToClipboard('${listing.kampsync_ical_link}', 'iCal link copied!')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center gap-1 transition-colors">
                        <i class="fas fa-copy"></i>
                        Copy
                    </button>
                </div>
            </div>
        `;
    } else {
        detailsHTML += `
            <div class="booking-detail">
                <strong>iCal Feed Link:</strong> No iCal URL configured
            </div>
        `;
    }
    
    detailsHTML += `
        </div>
    `;
    
    detailsContainer.innerHTML = detailsHTML;
    
    // Show the modal
    const modal = document.getElementById('view-listing-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close view listing modal
function closeViewListingModal() {
    const modal = document.getElementById('view-listing-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Edit listing function
function editListing(listingId, listingName, colorCode) {
    document.getElementById('edit-listing-id').value = listingId;
    document.getElementById('edit-listing-name').value = listingName;
    document.getElementById('edit-color-code').value = colorCode;
    
    // Find the listing data to get current image
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
        displayCurrentListingImage(listing);
    }
    
    const modal = document.getElementById('edit-listing-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close edit listing modal
function closeEditListingModal() {
    const modal = document.getElementById('edit-listing-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Reset the edit form
    const editForm = document.getElementById('edit-listing-form');
    if (editForm) {
        editForm.reset();
    }
    
    // Hide image preview
    const editImagePreview = document.getElementById('edit-image-preview');
    if (editImagePreview) {
        editImagePreview.classList.add('hidden');
    }
    
    // Reset current image display
    const currentImage = document.getElementById('current-listing-image');
    const noCurrentImage = document.getElementById('no-current-image');
    if (currentImage) {
        currentImage.style.display = 'none';
    }
    if (noCurrentImage) {
        noCurrentImage.style.display = 'block';
    }
    
    // Reset global variables
    currentEditBase64Image = null;
}

// Get listing color
function getListingColor(listingId) {
    return listingColors[listingId] || '#3b82f6';
}

// Update listing color
async function updateListingColor(listingId, color) {
    try {
        const response = await fetch('index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'update_listing_color',
                listing_id: listingId,
                color: color
            })
        });
        
        const result = await response.json();
        
        if (result.status === 200) {
            listingColors[listingId] = color;
            calendar.refetchEvents();
            showMessage('Color updated successfully', 'success');
        } else {
            showMessage('Failed to update color', 'error');
        }
    } catch (error) {
        console.error('Error updating color:', error);
        showMessage('Error updating color', 'error');
    }
}

// Format date for display
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show message to user
function showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `${type}-message`;
    messageEl.textContent = message;
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.right = '20px';
    messageEl.style.zIndex = '9999';
    messageEl.style.padding = '15px 20px';
    messageEl.style.borderRadius = '8px';
    messageEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    messageEl.style.animation = 'slideIn 0.3s ease';
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 300);
    }, 3000);
}

// Copy to clipboard function
function copyToClipboard(text, message) {
    if (navigator.clipboard && window.isSecureContext) {
        // Use modern clipboard API
        navigator.clipboard.writeText(text).then(() => {
            showMessage(message, 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyToClipboard(text, message);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text, message);
    }
}

function fallbackCopyToClipboard(text, message) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showMessage(message, 'success');
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        showMessage('Copy failed. Please select and copy manually.', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Image preview and base64 conversion functions
function previewImage() {
    const fileInput = document.getElementById('listing_picture');
    const previewDiv = document.getElementById('image_preview');
    const previewImg = document.getElementById('preview_img');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Image size must be less than 5MB', 'error');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewDiv.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        showMessage('Please select an image file first', 'error');
    }
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

// Preview edit image function
function previewEditImage() {
    const fileInput = document.getElementById('edit-listing-picture');
    const previewDiv = document.getElementById('edit-image-preview');
    const previewImg = document.getElementById('edit-preview-img');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Image size must be less than 5MB', 'error');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file', 'error');
            return;
        }
        
        // Create preview from file
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewDiv.classList.remove('hidden');
            showMessage('Image preview ready', 'success');
        };
        reader.readAsDataURL(file);
    } else {
        showMessage('Please select an image file first', 'error');
    }
}

// Display current listing image in edit modal
function displayCurrentListingImage(listing) {
    const currentImage = document.getElementById('current-listing-image');
    const noCurrentImage = document.getElementById('no-current-image');
    
    if (listing.user_listing_picture) {
        let imageSrc = '';
        
        // Handle different image formats from Xano
        if (typeof listing.user_listing_picture === 'string') {
            // Direct URL or base64
            imageSrc = listing.user_listing_picture;
        } else if (listing.user_listing_picture.path) {
            // Xano file object with path
            const path = listing.user_listing_picture.path;
            
            // Check if path contains base64 data
            if (path.includes('data:image') || path.includes('base64')) {
                // It's base64 data, use directly
                imageSrc = path;
            } else {
                // It's a URL, construct full URL
                imageSrc = `https://xfxa-cldj-sxth.n7e.xano.io${path}`;
            }
        } else if (listing.user_listing_picture.url) {
            // Xano file object with URL
            imageSrc = listing.user_listing_picture.url;
        }
        
        if (imageSrc) {
            currentImage.src = imageSrc;
            currentImage.style.display = 'block';
            noCurrentImage.style.display = 'none';
        } else {
            currentImage.style.display = 'none';
            noCurrentImage.style.display = 'block';
        }
    } else {
        currentImage.style.display = 'none';
        noCurrentImage.style.display = 'block';
    }
}

// Global variable to store base64 image
let currentBase64Image = null;
let currentEditBase64Image = null;

// Add event listener for file input change
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('listing_picture');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showMessage('Image size must be less than 5MB', 'error');
                    this.value = '';
                    return;
                }
                
                // Check file type
                if (!file.type.startsWith('image/')) {
                    showMessage('Please select a valid image file', 'error');
                    this.value = '';
                    return;
                }
                
                // Convert to base64
                convertImageToBase64(file).then(base64 => {
                    currentBase64Image = base64;
                }).catch(error => {
                    console.error('Error converting image:', error);
                    showMessage('Error processing image', 'error');
                });
            }
        });
    }
    
    // Add event listener for edit file input change
    const editFileInput = document.getElementById('edit-listing-picture');
    if (editFileInput) {
        editFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showMessage('Image size must be less than 5MB', 'error');
                    this.value = '';
                    return;
                }
                
                // Check file type
                if (!file.type.startsWith('image/')) {
                    showMessage('Please select a valid image file', 'error');
                    this.value = '';
                    return;
                }
                
                // Convert to base64
                convertImageToBase64(file).then(base64 => {
                    currentEditBase64Image = base64;
                }).catch(error => {
                    console.error('Error converting edit image:', error);
                    showMessage('Error processing image', 'error');
                });
            }
        });
    }
});

 