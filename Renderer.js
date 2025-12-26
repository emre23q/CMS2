/**
 * Renderer.js - Frontend JavaScript for Customer Management System
 */

let currentClientID = null;

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
 * Format field names for display
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

// Run when page loads
document.addEventListener('DOMContentLoaded', loadClientList);