/**
 * Renderer.js - Frontend JavaScript for Customer Management System
 */

let currentClientID = null;
let isAddMode = false;
let validationIntervalID = null;
let clientSchema = null;

// Load and display all clients
async function loadClientList() {
    try {
        const clientListElement = document.querySelector('.client-list');
        const clients = await window.api.getClientList();
        
        // Clear existing list
        clientListElement.innerHTML = '';
        
        // Add each client
        clients.forEach(client => {
            const li = document.createElement('li');
            li.textContent = `${client.firstName} ${client.lastName}`;
            li.dataset.clientId = client.clientID;
            
            li.addEventListener('click', () => {
                handleClientClick(client.clientID);
            });
            
            clientListElement.appendChild(li);
        });
        
        console.log(`Loaded ${clients.length} clients`);
        
    } catch (error) {
        console.error('Error loading clients:', error);
        alert('Failed to load clients: ' + error.message);
    }
}

// Handle client click
async function handleClientClick(clientID) {
    console.log('Client clicked:', clientID);
    
    // Store current client
    currentClientID = clientID;
    
    // Remove active class from all clients
    document.querySelectorAll('.client-list li').forEach(li => {
        li.classList.remove('active');
    });
    
    // Add active class to clicked client
    const clickedElement = document.querySelector(`[data-client-id="${clientID}"]`);
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
    
    // Load client details and notes
    await loadClientDetails(clientID);
    await loadClientNotes(clientID);
}

/**
 * Load and display client details
 */
async function loadClientDetails(clientID) {
    try {
        const detailsGrid = document.getElementById('client-details-grid');
        
        // Show loading
        detailsGrid.innerHTML = '<p class="empty-message">Loading...</p>';
        
        // Fetch client data
        const client = await window.api.getClient(clientID);
        
        if (!client) {
            detailsGrid.innerHTML = '<p class="empty-message">Client not found</p>';
            return;
        }
        
        // Clear existing content
        detailsGrid.innerHTML = '';
        
        // Loop through each key-value pair
        Object.entries(client).forEach(([key, value]) => {
            // Create detail item
            const detailItem = document.createElement('div');
            detailItem.className = 'detail-item';
            
            // Create label
            const label = document.createElement('label');
            label.textContent = formatFieldName(key);
            
            // Create value span
            const span = document.createElement('span');
            span.dataset.field = key; // for potential future use
            span.textContent = value || '-';
            
            // Add to detail item
            detailItem.appendChild(label);
            detailItem.appendChild(span);
            
            // Add to grid
            detailsGrid.appendChild(detailItem);
        });
        
        console.log('Loaded details for client:', clientID);
        
    } catch (error) {
        console.error('Error loading client details:', error);
        const detailsGrid = document.getElementById('client-details-grid');
        detailsGrid.innerHTML = '<p class="empty-message">Failed to load details</p>';
    }
}

/**
 * Load and display client notes
 */
async function loadClientNotes(clientID) {
    try {
        const notesContainer = document.querySelector('.pane-notes .pane-content');
        
        // Show loading
        notesContainer.innerHTML = '<p class="empty-message">Loading notes...</p>';
        
        // Fetch notes
        const notes = await window.api.getNotes(clientID);
        
        if (!notes || notes.length === 0) {
            notesContainer.innerHTML = '<p class="empty-message">No notes for this client</p>';
            return;
        }
        
        // Clear and create notes list
        notesContainer.innerHTML = '';
        const notesList = document.createElement('div');
        notesList.className = 'notes-list';
        
        // Add each note
        notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            
            // Note header (type and date)
            const noteHeader = document.createElement('div');
            noteHeader.className = 'note-header';
            
            const noteType = document.createElement('span');
            noteType.className = 'note-type';
            noteType.textContent = note.noteType;
            
            const noteDate = document.createElement('span');
            noteDate.className = 'note-date';
            noteDate.textContent = formatDate(note.createdOn);
            
            noteHeader.appendChild(noteType);
            noteHeader.appendChild(noteDate);
            
            // Note content
            const noteContent = document.createElement('div');
            noteContent.className = 'note-content';
            noteContent.textContent = note.content;
            
            // Assemble note
            noteItem.appendChild(noteHeader);
            noteItem.appendChild(noteContent);
            
            notesList.appendChild(noteItem);
        });
        
        notesContainer.appendChild(notesList);
        
        console.log(`Loaded ${notes.length} notes for client:`, clientID);
        
    } catch (error) {
        console.error('Error loading notes:', error);
        const notesContainer = document.querySelector('.pane-notes .pane-content');
        notesContainer.innerHTML = '<p class="empty-message">Failed to load notes</p>';
    }
}

/**
 * Format field names for display, database fields to user-friendly labels
 */
function formatFieldName(fieldName) {
    const specialCases = {
        'clientID': 'Client ID',
        'dob': 'Date of Birth',
        'clientSince': 'Client Since'
    };
    
    if (specialCases[fieldName]) {
        return specialCases[fieldName];
    }
    
    return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    
    // Add 'Z' to indicate UTC if not present
    const dateToFormat = dateString.includes('Z') ? dateString : dateString + 'Z';
    
    const date = new Date(dateToFormat);
    
    // Format as: "Dec 26, 2024 at 3:42 PM"
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get the Client table schema from the backend
 */
async function getClientSchema() {
    if (clientSchema) {
        return clientSchema;
    }
    
    try {
        clientSchema = await window.api.getClientSchema();
        console.log('Client schema loaded:', clientSchema);
        return clientSchema;
    } catch (error) {
        console.error('Error loading client schema:', error);
        alert('Failed to load client schema: ' + error.message);
        return null;
    }
}

/**
 * Enter add client mode
 */
async function enterAddMode() {
    if (isAddMode) return;
    
    isAddMode = true;
    console.log('Entering add mode');
    
    // Get schema
    const schema = await getClientSchema();
    if (!schema) return;
    
    // Clear current client selection
    currentClientID = null;
    document.querySelectorAll('.client-list li').forEach(li => {
        li.classList.remove('active');
    });
    
    // Disable client list
    const clientList = document.querySelector('.client-list');
    clientList.classList.add('disabled');
    
    // Generate empty detail fields from schema
    const detailsGrid = document.getElementById('client-details-grid');
    detailsGrid.innerHTML = '';
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    schema.forEach(field => {
        const detailItem = document.createElement('div');
        detailItem.className = 'detail-item';
        
        const label = document.createElement('label');
        label.textContent = formatFieldName(field.name);
        
        // Add asterisk for required fields
        if (field.notnull === 1 && field.pk !== 1) {
            label.textContent += ' *';
        }
        
        const span = document.createElement('span');
        span.dataset.field = field.name;
        
        // Handle special fields
        if (field.name === 'clientID') {
            // ClientID is uneditable
            span.textContent = 'UNEDITABLE';
            span.classList.add('uneditable');
            span.contentEditable = 'false';
        } else if (field.name === 'clientSince') {
            // ClientSince defaults to today and is uneditable in add mode
            span.textContent = today;
            span.classList.add('uneditable');
            span.contentEditable = 'false';
        } else {
            // All other fields are editable
            span.textContent = '';
            span.contentEditable = 'true';
            
            // Add red border to required empty fields
            if (field.notnull === 1) {
                span.classList.add('required-empty');
            }
        }
        
        detailItem.appendChild(label);
        detailItem.appendChild(span);
        detailsGrid.appendChild(detailItem);
    });
    
    // Update notes section
    const notesContainer = document.querySelector('.pane-notes .pane-content');
    notesContainer.innerHTML = '<p class="empty-message grayed-out">No notes - save client first</p>';
    
    // Create button container and move add button into it FIRST
    const addButton = document.querySelector('.add-button');
    const customerListHeader = document.querySelector('.pane-left .pane-header');
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'header-buttons';
    buttonContainer.id = 'header-buttons';
    
    // Move existing add button into container
    customerListHeader.appendChild(buttonContainer);
    buttonContainer.appendChild(addButton);
    
    // Add tick button to container (before X button)
    const tickButton = document.createElement('button');
    tickButton.className = 'tick-button disabled';
    tickButton.textContent = '✓';
    tickButton.id = 'tick-button';
    tickButton.addEventListener('click', submitNewClient);
    buttonContainer.insertBefore(tickButton, addButton);
    
    // THEN transform + button to X (rotate it 45 degrees) - use setTimeout to ensure DOM has settled
    setTimeout(() => {
        addButton.classList.add('cancel-mode');
    }, 10);
    
    // Start validation interval
    validationIntervalID = setInterval(validateRequiredFields, 500);
    
    console.log('Add mode activated');
}

/**
 * Validate required fields and update UI
 */
function validateRequiredFields() {
    if (!isAddMode || !clientSchema) return false;
    
    let allValid = true;
    
    const spans = document.querySelectorAll('#client-details-grid span[data-field]');
    
    spans.forEach(span => {
        const fieldName = span.dataset.field;
        const field = clientSchema.find(f => f.name === fieldName);
        
        if (!field) return;
        
        // Skip non-required fields
        if (field.notnull !== 1 || field.pk === 1) {
            span.classList.remove('required-empty');
            return;
        }
        
        // Skip uneditable fields
        if (span.classList.contains('uneditable')) {
            span.classList.remove('required-empty');
            return;
        }
        
        // Check if field has content
        const value = span.textContent.trim();
        if (value === '') {
            span.classList.add('required-empty');
            allValid = false;
        } else {
            span.classList.remove('required-empty');
        }
    });
    
    // Update tick button state
    const tickButton = document.getElementById('tick-button');
    if (tickButton) {
        if (allValid) {
            tickButton.classList.remove('disabled');
        } else {
            tickButton.classList.add('disabled');
        }
    }
    
    return allValid;
}

/**
 * Parse flexible date input and return YYYY-MM-DD format
 */
function parseDateInput(inputString) {
    if (!inputString) return null;
    
    // Remove extra whitespace
    const cleaned = inputString.trim();
    
    // Split by common separators
    const parts = cleaned.split(/[\/\-\.\s]+/);
    
    if (parts.length !== 3) {
        return null; // Invalid format
    }
    
    let day, month, year;
    
    // Assume DD/MM/YYYY format (Australian)
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
    
    // Validate ranges
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return null;
    }
    
    // Handle 2-digit years (assume 19xx or 20xx)
    if (year < 100) {
        year += year < 50 ? 2000 : 1900;
    }
    
    // Pad with zeros
    const paddedDay = String(day).padStart(2, '0');
    const paddedMonth = String(month).padStart(2, '0');
    
    // Validate date exists
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
        return null; // Invalid date (e.g., Feb 30)
    }
    
    return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Collect client data from the form
 */
function collectClientData() {
    const clientData = {};
    
    const spans = document.querySelectorAll('#client-details-grid span[data-field]');
    
    spans.forEach(span => {
        const fieldName = span.dataset.field;
        
        // Skip clientID (auto-generated)
        if (fieldName === 'clientID') return;
        
        let value = span.textContent.trim();
        
        // Parse date fields
        if (fieldName === 'dob') {
            const parsedDate = parseDateInput(value);
            if (parsedDate) {
                value = parsedDate;
            }
        }
        
        // Only add non-empty values
        if (value !== '') {
            clientData[fieldName] = value;
        }
    });
    
    console.log('Collected client data:', clientData);
    return clientData;
}

/**
 * Submit new client to the backend
 */
async function submitNewClient() {
    if (!isAddMode) return;
    
    // Check if tick button is disabled
    const tickButton = document.getElementById('tick-button');
    if (tickButton && tickButton.classList.contains('disabled')) {
        // Do nothing if disabled
        return;
    }
    
    // Final validation
    if (!validateRequiredFields()) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        // Collect data
        const clientData = collectClientData();
        
        // Submit to backend
        console.log('Submitting new client...');
        const newClientID = await window.api.addClient(clientData);
        console.log('New client created with ID:', newClientID);
        
        // Exit add mode without confirmation
        exitAddMode(false);
        
        // Reload client list
        await loadClientList();
        
        // Auto-select the new client
        await handleClientClick(newClientID);
        
    } catch (error) {
        console.error('Error submitting new client:', error);
        alert('Failed to add client: ' + error.message);
    }
}

/**
 * Exit add client mode
 */
function exitAddMode(requireConfirmation = true) {
    if (!isAddMode) return;
    
    // Show confirmation if required
    if (requireConfirmation) {
        showConfirmationDialog();
        return;
    }
    
    // Proceed with exit
    isAddMode = false;
    console.log('Exiting add mode');
    
    // Stop validation interval
    if (validationIntervalID) {
        clearInterval(validationIntervalID);
        validationIntervalID = null;
    }
    
    // Re-enable client list
    const clientList = document.querySelector('.client-list');
    clientList.classList.remove('disabled');
    
    // Remove button container and restore add button
    const buttonContainer = document.getElementById('header-buttons');
    const addButton = document.querySelector('.add-button');
    const customerListHeader = document.querySelector('.pane-left .pane-header');
    
    if (buttonContainer && addButton) {
        // Remove cancel-mode class to rotate back to + first
        addButton.classList.remove('cancel-mode');
        
        // Wait for rotation animation to complete, then move button
        setTimeout(() => {
            // Move add button back to header
            customerListHeader.appendChild(addButton);
            // Remove the container
            buttonContainer.remove();
        }, 500); // Match the CSS transition duration
    }
    
    // Clear details grid
    const detailsGrid = document.getElementById('client-details-grid');
    detailsGrid.innerHTML = '<p class="empty-message">Select a client to view details</p>';
    
    // Clear notes section
    const notesContainer = document.querySelector('.pane-notes .pane-content');
    notesContainer.innerHTML = '<p class="empty-message">Select a client to view notes</p>';
    
    console.log('Add mode exited');
}

/**
 * Show confirmation dialog for exiting add mode
 */
function showConfirmationDialog() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.id = 'confirmation-overlay';
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    
    const message = document.createElement('p');
    message.textContent = 'Discard changes?';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'confirmation-buttons';
    
    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.className = 'confirm-yes';
    yesButton.addEventListener('click', () => {
        removeConfirmationDialog();
        exitAddMode(false);
    });
    
    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.className = 'confirm-no';
    noButton.addEventListener('click', removeConfirmationDialog);
    
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    
    dialog.appendChild(message);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    
    document.body.appendChild(overlay);
    
    // Position dialog next to X button
    const addButton = document.querySelector('.add-button');
    const rect = addButton.getBoundingClientRect();
    
    dialog.style.top = rect.top + 'px';
    dialog.style.left = (rect.right + 10) + 'px';
    
    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

/**
 * Remove confirmation dialog
 */
function removeConfirmationDialog() {
    const overlay = document.getElementById('confirmation-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
}

/**
 * Initialize add button event listener
 */
function initializeAddButton() {
    const addButton = document.querySelector('.add-button');
    if (addButton) {
        addButton.addEventListener('click', () => {
            if (isAddMode) {
                exitAddMode(true);
            } else {
                enterAddMode();
            }
        });
    }
}

// Run when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadClientList();
    initializeAddButton();
});