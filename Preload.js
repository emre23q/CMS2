const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Securely exposes IPC handlers to the renderer process
 * Creates window.api object that the renderer can use
 */

contextBridge.exposeInMainWorld('api', {
    // Client Operations
    
    /**
     * Get list of all clients
     * @returns {Promise<Array>} Array of client objects with clientID, firstName, lastName
     */
    getClientList: () => ipcRenderer.invoke('get-client-list'),
    
    /**
     * Get a single client by ID
     * @param {number} clientID - The client's ID
     * @returns {Promise<Object|null>} Client object or null if not found
     */
    getClient: (clientID) => ipcRenderer.invoke('get-client', clientID),
    
    /**
     * Get the Client table schema
     * @returns {Promise<Array>} Array of field objects with name, type, notnull, dflt_value, pk
     */
    getClientSchema: () => ipcRenderer.invoke('get-client-schema'),
    
    /**
     * Add a new client
     * @param {Object} clientData - Client data (firstName, lastName, email, etc.)
     * @returns {Promise<number>} The new client's ID
     */
    addClient: (clientData) => ipcRenderer.invoke('add-client', clientData),
    
    /**
     * Update an existing client
     * @param {number} clientID - The client's ID
     * @param {Object} clientData - Updated client data
     * @returns {Promise<boolean>} True if successful
     */
    updateClient: (clientID, clientData) => ipcRenderer.invoke('update-client', clientID, clientData),
    
    /**
     * Delete a client (also deletes all their notes via CASCADE)
     * @param {number} clientID - The client's ID
     * @returns {Promise<boolean>} True if successful
     */
    deleteClient: (clientID) => ipcRenderer.invoke('delete-client', clientID),
    
    /**
     * Search clients by keyword (searches across all fields and notes)
     * @param {string} searchTerm - Search keyword (empty string returns all clients)
     * @returns {Promise<Array>} Array of matching clients
     */
    searchClients: (searchTerm) => ipcRenderer.invoke('search-clients', searchTerm),
    
    // Note Operations
    
    /**
     * Get all notes for a client
     * @param {number} clientID - The client's ID
     * @returns {Promise<Array>} Array of note objects, ordered newest first
     */
    getNotes: (clientID) => ipcRenderer.invoke('get-notes', clientID),
    
    /**
     * Add a new note
     * @param {Object} noteData - Note data (clientID, noteType, content)
     * @returns {Promise<number>} The new note's ID
     */
    addNote: (noteData) => ipcRenderer.invoke('add-note', noteData),
    
    /**
     * Update an existing note
     * @param {number} noteID - The note's ID
     * @param {Object} noteData - Updated note data (noteType, content)
     * @returns {Promise<boolean>} True if successful
     */
    updateNote: (noteID, noteData) => ipcRenderer.invoke('update-note', noteID, noteData),
    
    /**
     * Delete a note
     * @param {number} noteID - The note's ID
     * @returns {Promise<boolean>} True if successful
     */
    deleteNote: (noteID) => ipcRenderer.invoke('delete-note', noteID),
    
    // Attachment Operations
    
    /**
     * Get all attachments for a client (bulk load)
     * @param {number} clientID - The client's ID
     * @returns {Promise<Object>} Object with noteID as keys, array of filenames as values
     */
    getAttachments: (clientID) => ipcRenderer.invoke('get-attachments', clientID),
    
    /**
     * Save an attachment file
     * @param {number} clientID - The client's ID
     * @param {number} noteID - The note's ID
     * @param {string} fileName - The file name
     * @param {ArrayBuffer} fileBuffer - The file data
     * @returns {Promise<boolean>} True if successful
     */
    saveAttachment: (clientID, noteID, fileName, fileBuffer) => 
        ipcRenderer.invoke('save-attachment', clientID, noteID, fileName, fileBuffer),
    
    /**
     * Delete an attachment file
     * @param {number} clientID - The client's ID
     * @param {number} noteID - The note's ID
     * @param {string} fileName - The file name
     * @returns {Promise<boolean>} True if successful
     */
    deleteAttachment: (clientID, noteID, fileName) => 
        ipcRenderer.invoke('delete-attachment', clientID, noteID, fileName),
    
    /**
     * Open an attachment in default application
     * @param {number} clientID - The client's ID
     * @param {number} noteID - The note's ID
     * @param {string} fileName - The file name
     * @returns {Promise<boolean>} True if successful
     */
    openAttachment: (clientID, noteID, fileName) => 
        ipcRenderer.invoke('open-attachment', clientID, noteID, fileName),
    
    // Field Management
    
    /**
     * Get all field metadata
     * @returns {Promise<Array>} Array of field metadata objects
     */
    getFieldMetadata: () => ipcRenderer.invoke('get-field-metadata'),
    
    /**
     * Add a new field to the Client table
     * @param {string} fieldName - The field name
     * @param {string} dataType - The data type ('TEXT' or 'DATE')
     * @param {boolean} isRequired - Whether the field is required
     * @param {string} defaultValue - Default value for existing clients
     * @returns {Promise<boolean>} True if successful
     */
    addField: (fieldName, dataType, isRequired, defaultValue) => 
        ipcRenderer.invoke('add-field', fieldName, dataType, isRequired, defaultValue),
    
    /**
     * Toggle field visibility (hide/show)
     * @param {string} fieldName - The field name
     * @param {boolean} isHidden - Whether to hide the field
     * @returns {Promise<boolean>} True if successful
     */
    toggleFieldVisibility: (fieldName, isHidden) => 
        ipcRenderer.invoke('toggle-field-visibility', fieldName, isHidden),
    
    /**
     * Restart the application
     * @returns {Promise<void>}
     */
    restartApp: () => ipcRenderer.invoke('restart-app')
});