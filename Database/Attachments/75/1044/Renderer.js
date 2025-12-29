/**
 * Renderer.js - Frontend JavaScript for Customer Management System
 */

let currentClientID = null;
let isAddMode = false;
let validationIntervalID = null;
let clientSchema = null;
let clientAttachments = {}; // Cache for attachments: { noteID: [files...] }
let isSearchMode = false;
let currentSearchTerm = '';

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

/**
 * Enter search mode
 */
function enterSearchMode() {
    if (isSearchMode) return;
    
    isSearchMode = true;
    
    const header = document.querySelector('.pane-left .pane-header');
    const h2 = header.querySelector('h2');
    
    // Add search-active class to header
    header.classList.add('search-active');
    
    // Hide the add button temporarily
    const addButton = document.querySelector('.add-button');
    if (addButton && !document.getElementById('header-buttons')) {
        addButton.style.display = 'none';
    }
    
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.id = 'search-container';
    
    // Create search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Search clients...';
    searchInput.id = 'search-input';
    
    // Enter key to search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        } else if (e.key === 'Escape') {
            exitSearchMode();
        }
    });
    
    // Create clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'search-clear';
    clearBtn.textContent = '×';
    clearBtn.addEventListener('click', exitSearchMode);
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearBtn);
    
    // Replace h2 with search container
    h2.style.display = 'none';
    header.insertBefore(searchContainer, h2);
    
    // Add global escape listener
    document.addEventListener('keydown', globalEscapeListener);
    
    // Focus input
    searchInput.focus();
}

/**
 * Global escape listener for search mode
 */
function globalEscapeListener(e) {
    if (e.key === 'Escape' && isSearchMode) {
        exitSearchMode();
    }
}

/**
 * Exit search mode
 */
async function exitSearchMode() {
    if (!isSearchMode) return;
    
    isSearchMode = false;
    currentSearchTerm = '';
    
    const header = document.querySelector('.pane-left .pane-header');
    const h2 = header.querySelector('h2');
    const searchContainer = document.getElementById('search-container');
    
    // Remove search-active class
    header.classList.remove('search-active');
    
    // Remove search container
    if (searchContainer) {
        searchContainer.remove();
    }
    
    // Show h2 again
    h2.style.display = '';
    
    // Show add button again
    const addButton = document.querySelector('.add-button');
    if (addButton && !document.getElementById('header-buttons')) {
        addButton.style.display = '';
    }
    
    // Remove global escape listener
    document.removeEventListener('keydown', globalEscapeListener);
    
    // Reload full client list and clear any highlighting
    await loadClientList();
    
    // Reload current client if one is selected (to remove highlighting)
    if (currentClientID) {
        await loadClientDetails(currentClientID);
        await loadClientNotes(currentClientID);
    }
}

/**
 * Perform search
 */
async function performSearch(searchTerm) {
    currentSearchTerm = searchTerm.trim();
    
    if (!currentSearchTerm) {
        // Empty search, show all
        await loadClientList();
        return;
    }
    
    try {
        const clientListElement = document.querySelector('.client-list');
        const clients = await window.api.searchClients(currentSearchTerm);
        
        // Clear existing list
        clientListElement.innerHTML = '';
        
        if (clients.length === 0) {
            // Show "No results found" and reload all clients
            const message = document.createElement('p');
            message.className = 'empty-message';
            message.textContent = 'No results found';
            clientListElement.appendChild(message);
            
            // Show all clients below
            const allClients = await window.api.getClientList();
            allClients.forEach(client => {
                const li = document.createElement('li');
                li.textContent = `${client.firstName} ${client.lastName}`;
                li.dataset.clientId = client.clientID;
                li.style.opacity = '0.5'; // Dim to show they're not matches
                
                li.addEventListener('click', () => {
                    handleClientClick(client.clientID);
                });
                
                clientListElement.appendChild(li);
            });
            
            return;
        }
        
        // Display results with highlighting
        clients.forEach(client => {
            const li = document.createElement('li');
            const fullName = `${client.firstName} ${client.lastName}`;
            
            // Highlight matching text
            const highlightedName = highlightText(fullName, currentSearchTerm);
            li.innerHTML = highlightedName;
            li.dataset.clientId = client.clientID;
            
            li.addEventListener('click', () => {
                handleClientClick(client.clientID);
            });
            
            clientListElement.appendChild(li);
            
            console.log('Added client with highlighting:', highlightedName);
        });
        
        console.log(`Search found ${clients.length} results`);
        
    } catch (error) {
        console.error('Error searching clients:', error);
        showToast('Search failed: ' + error.message, 'error');
    }
}

/**
 * Highlight matching text in a string
 */
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    // Escape special regex characters
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const highlighted = text.replace(regex, '<span class="highlight">$1</span>');
    
    console.log('Highlighting:', text, 'with term:', searchTerm, '→', highlighted);
    
    return highlighted;
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const h2 = document.querySelector('.pane-left .pane-header h2');
    if (h2) {
        h2.addEventListener('dblclick', enterSearchMode);
        h2.style.cursor = 'pointer';
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
            span.dataset.field = key;
            
            // Highlight if in search mode
            if (isSearchMode && currentSearchTerm && value) {
                span.innerHTML = highlightText(String(value), currentSearchTerm);
            } else {
                span.textContent = value || '-';
            }
            
            // Mark editable fields (all except clientID)
            if (key !== 'clientID') {
                span.classList.add('editable');
            }
            
            // Add to detail item
            detailItem.appendChild(label);
            detailItem.appendChild(span);
            
            // Add to grid
            detailsGrid.appendChild(detailItem);
        });
        
        // Enable field editing
        enableFieldEditing();
        
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
        
        // Fetch notes and attachments in parallel
        const [notes, attachments] = await Promise.all([
            window.api.getNotes(clientID),
            window.api.getAttachments(clientID)
        ]);
        
        // Cache attachments
        clientAttachments = attachments;
        
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
            const noteItem = createNoteElement(note);
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
 * Create a note element
 */
function createNoteElement(note) {
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.dataset.noteId = note.noteID;
    
    // Note header (type, date, actions)
    const noteHeader = document.createElement('div');
    noteHeader.className = 'note-header';
    
    const noteHeaderLeft = document.createElement('div');
    noteHeaderLeft.className = 'note-header-left';
    
    const noteType = document.createElement('span');
    noteType.className = 'note-type';
    // Highlight note type if in search mode
    if (isSearchMode && currentSearchTerm) {
        noteType.innerHTML = highlightText(note.noteType, currentSearchTerm);
    } else {
        noteType.textContent = note.noteType;
    }
    
    const noteDate = document.createElement('span');
    noteDate.className = 'note-date';
    noteDate.textContent = formatDate(note.createdOn);
    
    noteHeaderLeft.appendChild(noteType);
    noteHeaderLeft.appendChild(noteDate);
    
    // Action buttons
    const noteActions = document.createElement('div');
    noteActions.className = 'note-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-action-btn delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteNote(note.noteID);
    });
    
    const attachmentsBtn = document.createElement('button');
    attachmentsBtn.className = 'note-action-btn';
    const attachmentCount = clientAttachments[note.noteID] ? clientAttachments[note.noteID].length : 0;
    attachmentsBtn.textContent = `📎 ${attachmentCount}`;
    attachmentsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectAndUploadAttachment(note.noteID);
    });
    
    noteActions.appendChild(deleteBtn);
    noteActions.appendChild(attachmentsBtn);
    
    noteHeader.appendChild(noteHeaderLeft);
    noteHeader.appendChild(noteActions);
    
    // Note content
    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    // Highlight note content if in search mode
    if (isSearchMode && currentSearchTerm) {
        noteContent.innerHTML = highlightText(note.content, currentSearchTerm);
    } else {
        noteContent.textContent = note.content;
    }
    
    // Assemble note
    noteItem.appendChild(noteHeader);
    noteItem.appendChild(noteContent);
    
    // Show attachments if any exist
    const attachmentsList = clientAttachments[note.noteID] || [];
    if (attachmentsList.length > 0) {
        const attachmentsSection = createAttachmentsSection(note.noteID, attachmentsList, false);
        noteItem.appendChild(attachmentsSection);
    }
    
    // Add double-click to edit
    noteItem.addEventListener('dblclick', () => {
        if (!noteItem.classList.contains('editing')) {
            handleNoteDoubleClick(noteItem, note);
        }
    });
    
    return noteItem;
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
 * Enable double-click editing on fields
 */
function enableFieldEditing() {
    // Don't enable if in add mode
    if (isAddMode) return;
    
    const editableFields = document.querySelectorAll('.detail-item span.editable');
    
    editableFields.forEach(span => {
        span.addEventListener('dblclick', () => handleFieldDoubleClick(span));
    });
}

/**
 * Handle double-click on a field to start editing
 */
function handleFieldDoubleClick(span) {
    // Don't allow editing in add mode
    if (isAddMode) return;
    
    // Don't allow editing if already editing
    if (span.classList.contains('editing')) return;
    
    // Store original value
    span.dataset.originalValue = span.textContent;
    
    // Make editable
    span.contentEditable = 'true';
    span.classList.add('editing');
    
    // Focus and select all text
    span.focus();
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Add event listeners
    span.addEventListener('blur', handleFieldBlur);
    span.addEventListener('keydown', handleFieldKeydown);
}

/**
 * Handle blur (clicking away) from editing field
 */
async function handleFieldBlur(event) {
    const span = event.target;
    
    // Get new value
    const newValue = span.textContent.trim();
    const originalValue = span.dataset.originalValue;
    const fieldName = span.dataset.field;
    
    // Remove editing state
    span.contentEditable = 'false';
    span.classList.remove('editing');
    
    // Remove event listeners
    span.removeEventListener('blur', handleFieldBlur);
    span.removeEventListener('keydown', handleFieldKeydown);
    
    // If value unchanged, just exit
    if (newValue === originalValue) {
        return;
    }
    
    // Validate
    const validationResult = validateField(fieldName, newValue);
    if (!validationResult.valid) {
        // Revert and show error
        span.textContent = originalValue;
        showToast(validationResult.error, 'error');
        return;
    }
    
    // Save
    await saveFieldEdit(span, fieldName, validationResult.value);
}

/**
 * Handle keydown events while editing
 */
function handleFieldKeydown(event) {
    const span = event.target;
    
    if (event.key === 'Enter') {
        event.preventDefault();
        span.blur(); // Trigger save via blur handler
    } else if (event.key === 'Escape') {
        event.preventDefault();
        // Revert
        const originalValue = span.dataset.originalValue;
        span.textContent = originalValue;
        
        // Exit editing mode
        span.contentEditable = 'false';
        span.classList.remove('editing');
        span.removeEventListener('blur', handleFieldBlur);
        span.removeEventListener('keydown', handleFieldKeydown);
    }
}

/**
 * Validate field value
 * Returns: { valid: boolean, value: any, error: string }
 */
function validateField(fieldName, value) {
    // Get field schema
    const field = clientSchema ? clientSchema.find(f => f.name === fieldName) : null;
    
    // Trim the value
    const trimmedValue = value ? value.trim() : '';
    
    // Check if required field is empty
    if (field && field.notnull === 1 && field.pk !== 1) {
        if (trimmedValue === '' || trimmedValue === '-') {
            return {
                valid: false,
                error: `${formatFieldName(fieldName)} is required and cannot be empty`
            };
        }
    }
    
    // Validate DOB
    if (fieldName === 'dob') {
        const parsedDate = parseDateInput(trimmedValue);
        if (!parsedDate) {
            return {
                valid: false,
                error: 'Invalid date format. Please use DD/MM/YYYY'
            };
        }
        return {
            valid: true,
            value: parsedDate
        };
    }
    
    // Validate clientSince (same as DOB)
    if (fieldName === 'clientSince') {
        const parsedDate = parseDateInput(trimmedValue);
        if (!parsedDate) {
            return {
                valid: false,
                error: 'Invalid date format. Please use DD/MM/YYYY'
            };
        }
        return {
            valid: true,
            value: parsedDate
        };
    }
    
    // All other fields - accept as is
    return {
        valid: true,
        value: trimmedValue
    };
}

/**
 * Save field edit to backend
 */
async function saveFieldEdit(span, fieldName, newValue) {
    if (!currentClientID) return;
    
    try {
        // Prepare update data
        const updateData = {};
        updateData[fieldName] = newValue;
        
        // Call API
        await window.api.updateClient(currentClientID, updateData);
        
        // Update span with new value
        span.textContent = newValue;
        
        // Reload client list if name changed (to update sidebar)
        if (fieldName === "firstName" || fieldName === "lastName"){
            await loadClientList();
            handleClientClick(currentClientID);
        }
        
        console.log(`Updated ${fieldName} for client ${currentClientID}`);
        
    } catch (error) {
        console.error('Error updating field:', error);
        
        // Revert to original
        const originalValue = span.dataset.originalValue;
        span.textContent = originalValue;
        
        showToast(`Failed to save: ${error.message}`, 'error');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'error') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    messageDiv.textContent = message;
    
    toast.appendChild(messageDiv);
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

/**
 * Show add note modal
 */
function showAddNoteModal() {
    if (!currentClientID || isAddMode) return;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'note-modal-overlay';
    overlay.id = 'note-modal-overlay';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'note-modal';
    
    const header = document.createElement('div');
    header.className = 'note-modal-header';
    header.textContent = 'Add Note';
    
    const form = document.createElement('div');
    form.className = 'note-modal-form';
    
    // Note Type
    const typeLabel = document.createElement('label');
    typeLabel.className = 'note-modal-label';
    typeLabel.textContent = 'Note Type';
    
    const typeInput = document.createElement('input');
    typeInput.className = 'note-modal-input';
    typeInput.id = 'note-modal-type';
    typeInput.placeholder = 'e.g., General, Medical, Follow-up...';
    
    // Note Content
    const contentLabel = document.createElement('label');
    contentLabel.className = 'note-modal-label';
    contentLabel.textContent = 'Content';
    
    const contentTextarea = document.createElement('textarea');
    contentTextarea.className = 'note-modal-textarea';
    contentTextarea.id = 'note-modal-content';
    contentTextarea.placeholder = 'Enter note content...';
    
    form.appendChild(typeLabel);
    form.appendChild(typeInput);
    form.appendChild(contentLabel);
    form.appendChild(contentTextarea);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'note-modal-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'note-modal-btn save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
        await saveNewNote();
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'note-modal-btn cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeNoteModal);
    
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    
    modal.appendChild(header);
    modal.appendChild(form);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
    
    // Focus type input
    typeInput.focus();
}

/**
 * Close note modal
 */
function closeNoteModal() {
    const overlay = document.getElementById('note-modal-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
}

/**
 * Save new note from modal
 */
async function saveNewNote() {
    const typeInput = document.getElementById('note-modal-type');
    const contentTextarea = document.getElementById('note-modal-content');
    
    const noteType = typeInput.value.trim();
    const content = contentTextarea.value.trim();
    
    if (!noteType || !content) {
        showToast('Please fill in both note type and content', 'error');
        return;
    }
    
    try {
        const noteData = {
            clientID: currentClientID,
            noteType: noteType,
            content: content
        };
        
        await window.api.addNote(noteData);
        
        closeNoteModal();
        
        // Reload notes
        await loadClientNotes(currentClientID);
        
        showToast('Note added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding note:', error);
        showToast(`Failed to add note: ${error.message}`, 'error');
    }
}

/**
 * Handle double-click on note to edit inline
 */
function handleNoteDoubleClick(noteItem, note) {
    if (isAddMode) return;
    
    // Mark as editing
    noteItem.classList.add('editing');
    
    // Store original data
    noteItem.dataset.originalType = note.noteType;
    noteItem.dataset.originalContent = note.content;
    
    // Replace content with edit form
    const noteContent = noteItem.querySelector('.note-content');
    noteContent.innerHTML = '';
    
    const editForm = document.createElement('div');
    editForm.className = 'note-edit-form';
    
    // Type input
    const typeInput = document.createElement('input');
    typeInput.className = 'note-edit-type';
    typeInput.value = note.noteType;
    
    // Content textarea
    const contentTextarea = document.createElement('textarea');
    contentTextarea.className = 'note-edit-content';
    contentTextarea.value = note.content;
    
    editForm.appendChild(typeInput);
    editForm.appendChild(contentTextarea);
    
    // Show attachments if any
    const attachmentsList = clientAttachments[note.noteID] || [];
    if (attachmentsList.length > 0 || true) { // Always show attachment section in edit mode
        const attachmentsSection = createAttachmentsSection(note.noteID, attachmentsList, true);
        editForm.appendChild(attachmentsSection);
    }
    
    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'note-edit-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'note-edit-btn save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
        await saveNoteEdit(noteItem, note.noteID, typeInput.value, contentTextarea.value);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'note-edit-btn cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
        cancelNoteEdit(noteItem, note);
    });
    
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    
    editForm.appendChild(actions);
    noteContent.appendChild(editForm);
    
    // Focus type input
    typeInput.focus();
}

/**
 * Save note edit
 */
async function saveNoteEdit(noteItem, noteID, newType, newContent) {
    const trimmedType = newType.trim();
    const trimmedContent = newContent.trim();
    
    if (!trimmedType || !trimmedContent) {
        showToast('Note type and content cannot be empty', 'error');
        return;
    }
    
    try {
        const noteData = {
            noteType: trimmedType,
            content: trimmedContent
        };
        
        await window.api.updateNote(noteID, noteData);
        
        // Reload notes to show updated version
        await loadClientNotes(currentClientID);
        
        showToast('Note updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating note:', error);
        showToast(`Failed to update note: ${error.message}`, 'error');
    }
}

/**
 * Cancel note edit
 */
function cancelNoteEdit(noteItem, note) {
    // Remove editing class
    noteItem.classList.remove('editing');
    
    // Restore original content
    const noteContent = noteItem.querySelector('.note-content');
    noteContent.textContent = note.content;
}

/**
 * Handle delete note
 */
async function handleDeleteNote(noteID) {
    // Show confirmation (reuse confirmation dialog style)
    const confirmed = await showDeleteConfirmation('Delete this note?');
    
    if (!confirmed) return;
    
    try {
        await window.api.deleteNote(noteID);
        
        // Reload notes
        await loadClientNotes(currentClientID);
        
        showToast('Note deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast(`Failed to delete note: ${error.message}`, 'error');
    }
}

/**
 * Show delete confirmation dialog
 */
function showDeleteConfirmation(message) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirmation-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.style.position = 'relative';
        dialog.style.transform = 'none';
        dialog.style.left = 'auto';
        dialog.style.top = 'auto';
        
        const messageP = document.createElement('p');
        messageP.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'confirmation-buttons';
        
        const yesButton = document.createElement('button');
        yesButton.textContent = 'Yes';
        yesButton.className = 'confirm-yes';
        yesButton.addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
            resolve(true);
        });
        
        const noButton = document.createElement('button');
        noButton.textContent = 'No';
        noButton.className = 'confirm-no';
        noButton.addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
            resolve(false);
        });
        
        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
        dialog.appendChild(messageP);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.classList.add('show'), 10);
    });
}

/**
 * Toggle attachments visibility
 */
function toggleAttachments(noteItem, noteID) {
    let attachmentsSection = noteItem.querySelector('.note-attachments');
    
    if (attachmentsSection) {
        // Remove if already visible
        attachmentsSection.remove();
    } else {
        // Add attachments section
        const attachmentsList = clientAttachments[noteID] || [];
        attachmentsSection = createAttachmentsSection(noteID, attachmentsList, false);
        noteItem.appendChild(attachmentsSection);
    }
}

/**
 * Create attachments section
 */
function createAttachmentsSection(noteID, attachmentsList, editMode) {
    const section = document.createElement('div');
    section.className = 'note-attachments';
    
    const title = document.createElement('div');
    title.className = 'note-attachments-title';
    title.textContent = 'Attachments:';
    
    section.appendChild(title);
    
    if (attachmentsList.length > 0) {
        const list = document.createElement('div');
        list.className = 'note-attachments-list';
        
        attachmentsList.forEach(fileName => {
            const item = document.createElement('div');
            item.className = 'attachment-item';
            
            // Delete button on the left
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'attachment-delete';
            deleteBtn.textContent = 'Del';
            deleteBtn.addEventListener('click', () => {
                deleteAttachment(noteID, fileName);
            });
            item.appendChild(deleteBtn);
            
            // File link
            const link = document.createElement('a');
            link.className = 'attachment-link';
            // Highlight filename if in search mode
            if (isSearchMode && currentSearchTerm) {
                link.innerHTML = highlightText(fileName, currentSearchTerm);
            } else {
                link.textContent = fileName;
            }
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openAttachment(noteID, fileName);
            });
            
            item.appendChild(link);
            list.appendChild(item);
        });
        
        section.appendChild(list);
    }
    
    if (editMode) {
        // Add attachment button (only in edit mode)
        const addBtn = document.createElement('button');
        addBtn.className = 'add-attachment-btn';
        addBtn.textContent = '+ Add Attachment';
        addBtn.addEventListener('click', () => {
            selectAndUploadAttachment(noteID);
        });
        section.appendChild(addBtn);
    }
    
    return section;
}

/**
 * Open attachment in default application
 */
async function openAttachment(noteID, fileName) {
    try {
        await window.api.openAttachment(currentClientID, noteID, fileName);
    } catch (error) {
        console.error('Error opening attachment:', error);
        showToast(`Failed to open attachment: ${error.message}`, 'error');
    }
}

/**
 * Delete attachment
 */
async function deleteAttachment(noteID, fileName) {
    const confirmed = await showDeleteConfirmation(`Delete ${fileName}?`);
    
    if (!confirmed) return;
    
    try {
        await window.api.deleteAttachment(currentClientID, noteID, fileName);
        
        // Update cache
        if (clientAttachments[noteID]) {
            clientAttachments[noteID] = clientAttachments[noteID].filter(f => f !== fileName);
        }
        
        // Reload notes
        await loadClientNotes(currentClientID);
        
        showToast('Attachment deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting attachment:', error);
        showToast(`Failed to delete attachment: ${error.message}`, 'error');
    }
}

/**
 * Select and upload attachment
 */
function selectAndUploadAttachment(noteID) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true; // Allow multiple file selection
    
    input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        try {
            // Upload all files
            for (const file of files) {
                // Read file as ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                
                // Save attachment
                await window.api.saveAttachment(currentClientID, noteID, file.name, arrayBuffer);
                
                // Update cache
                if (!clientAttachments[noteID]) {
                    clientAttachments[noteID] = [];
                }
                clientAttachments[noteID].push(file.name);
            }
            
            // Reload notes once after all uploads
            await loadClientNotes(currentClientID);
            
            const message = files.length === 1 
                ? 'Attachment uploaded successfully' 
                : `${files.length} attachments uploaded successfully`;
            showToast(message, 'success');
            
        } catch (error) {
            console.error('Error uploading attachment:', error);
            showToast(`Failed to upload attachment: ${error.message}`, 'error');
        }
    });
    
    input.click();
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

/**
 * Initialize add note button
 */
function initializeAddNoteButton() {
    const addNoteButton = document.getElementById('add-note-button');
    if (addNoteButton) {
        addNoteButton.addEventListener('click', showAddNoteModal);
    }
}

// Run when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Load schema first for validation
    await getClientSchema();
    // Then load client list
    await loadClientList();
    initializeAddButton();
    initializeAddNoteButton();
    initializeSearch();
});