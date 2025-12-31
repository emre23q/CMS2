const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const {app,BrowserWindow,ipcMain} = require('electron');

let db = null;
let mainWindow = null;


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1250,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'Preload.js'),
        },
    });
    mainWindow.loadFile('Index.html');
    mainWindow.on('closed', () => {
        mainWindow = null;
        saveDatabase();
    });


}

function createDatabaseFolderIfNone(databaseFolder, attachmentsFolder){
    if (!fs.existsSync(databaseFolder)) {
        fs.mkdirSync(databaseFolder, { recursive: true });
    }
    if (!fs.existsSync(attachmentsFolder)) {
        fs.mkdirSync(attachmentsFolder, { recursive: true });
    }
}

async function initDatabase(){
    // Use userData path instead of appPath for user-specific data
    const userDataPath = app.getPath('userData');
    const databaseFolder = path.join(userDataPath, 'Database');
    const attachmentsFolder = path.join(databaseFolder, 'Attachments');
    const dbPath = path.join(databaseFolder, 'ClientDB.db');
    
    // SQL file should still be in the app directory (bundled with exe)
    const appPath = app.getAppPath();
    const sqlPath = path.join(appPath, 'ClientDB.sql');
    
    createDatabaseFolderIfNone(databaseFolder, attachmentsFolder);
    const sql = await initSqlJs();
    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        db = new sql.Database(filebuffer);
        console.log('Database loaded from file.', dbPath);
    } else {
        db = new sql.Database();

        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        db.exec(sqlScript);
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log('New database created and initialized.', dbPath);
    }
    
    // Initialize FieldMetadata table if it doesn't exist
    initFieldMetadata();
}

function saveDatabase(){
    // Use userData path for saving
    const userDataPath = app.getPath('userData');
    const databaseFolder = path.join(userDataPath, 'Database');
    const dbPath = path.join(databaseFolder, 'ClientDB.db');
    if (db){
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log('Database saved to file.', dbPath);

    }
}

function initFieldMetadata() {
    try {
        // Create FieldMetadata table if it doesn't exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS FieldMetadata (
                fieldName TEXT PRIMARY KEY,
                dataType TEXT,
                isRequired INTEGER,
                isHidden INTEGER DEFAULT 0,
                isProtected INTEGER DEFAULT 0
            )
        `);
        
        // Check if we need to populate it
        const result = db.exec("SELECT COUNT(*) as count FROM FieldMetadata");
        const count = result[0].values[0][0];
        
        if (count === 0) {
            // Get current Client table schema
            const schemaResult = db.exec("PRAGMA table_info(Client)");
            
            schemaResult[0].values.forEach(col => {
                const fieldName = col[1];
                const dataType = col[2];
                const isRequired = col[3];
                
                // Determine if protected (firstName, lastName, clientID)
                const isProtected = (fieldName === 'firstName' || fieldName === 'lastName' || fieldName === 'clientID') ? 1 : 0;
                
                // Map SQL types to our simple types
                let simpleType = 'TEXT';
                if (dataType.includes('DATE')) {
                    simpleType = 'DATE';
                }
                
                db.run(
                    "INSERT INTO FieldMetadata (fieldName, dataType, isRequired, isHidden, isProtected) VALUES (?, ?, ?, 0, ?)",
                    [fieldName, simpleType, isRequired, isProtected]
                );
            });
            
            saveDatabase();
            console.log('FieldMetadata table initialized');
        }
        
    } catch (error) {
        console.error('Error initializing FieldMetadata:', error);
    }
}

app.whenReady().then(async () => {
    await initDatabase();
    console.log(db.exec("SELECT * FROM Client;"));
    createWindow();
});
app.on('window-all-closed', () => {
    saveDatabase();
    if (process.platform !== 'darwin') {
        app.quit();
    }

});

function mapDbResult( result ){
    if (!result[0]){
        return [];
    }   
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
        obj[col] = row[index];
        });
        console.log("returning obj:", obj);
        return obj;
    });
}
// Handle IPC events for database operations
ipcMain.handle('get-client-list', () => {
    const result = db.exec("SELECT clientID, firstName, lastName FROM Client ORDER BY lastName, firstName")
    return mapDbResult(result);

});
ipcMain.handle('get-client', (event, clientID) => {
    const result = db.exec("SELECT * FROM Client WHERE clientID = ?", [clientID]);
    const client = mapDbResult(result);
    return client[0] || null;
});

ipcMain.handle('get-client-schema', () => {
    try {
        const result = db.exec("PRAGMA table_info(Client)");
        if (!result[0]) {
            return [];
        }
        
        const columns = result[0].columns;
        const values = result[0].values;
        
        return values.map(row => ({
            cid: row[0],
            name: row[1],
            type: row[2],
            notnull: row[3],
            dflt_value: row[4],
            pk: row[5]
        }));
    } catch (error) {
        console.error('Error getting client schema:', error);
        throw new Error('Failed to get client schema: ' + error.message);
    }
});

/* example data format
{
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@email.com'
}
  */
ipcMain.handle('add-client', (event, clientData) => {
// extract keys and map them to the sql database fields
    try {
        const schemaResult = db.exec("PRAGMA table_info(Client);");
        const validColumns = schemaResult[0].values.map(col => col[1]); // get column names
        const columns = Object.keys(clientData).filter(col => validColumns.includes(col));
        if (columns.length === 0 ){
            throw new Error('No valid columns found in client data.');
        }
        const values = columns.map(col => clientData[col]);
        const columnNames = columns.join(", ");
        const placeholders = columns.map(() => "?").join(", ");
        const sql = `INSERT INTO Client (${columnNames}) VALUES (${placeholders})`;
        db.run(sql, values);        
        const result = db.exec("SELECT last_insert_rowid() as clientID;");
        saveDatabase();
        const newClientID = result[0].values[0][0];  // Extract the ID
        return newClientID;
    } catch (error) {
        console.error('Error adding client:', error);
        throw new Error('Failed to add client: ' + error.message);
    }
}
);

ipcMain.handle('delete-client', (event, clientID) => {
    try {
        // Delete client from database (CASCADE will delete all notes)
        db.run("DELETE FROM Client WHERE clientID = ?", [clientID]);
        saveDatabase();
        
        // Delete all attachments for this client - USE USERDATA PATH
        const userDataPath = app.getPath('userData');
        const clientAttachmentsPath = path.join(userDataPath, 'Database', 'Attachments', String(clientID));
        
        if (fs.existsSync(clientAttachmentsPath)) {
            fs.rmSync(clientAttachmentsPath, { recursive: true, force: true });
            console.log('Deleted attachments for client:', clientID);
        }
        
        console.log('Deleted client:', clientID);
        return true;
        
    } catch (error) {
        console.error('Error deleting client:', error);
        throw new Error('Failed to delete client: ' + error.message);
    }
});

ipcMain.handle('update-client', (event, clientID, clientData) => {
    try {
        // Get valid columns
        const schemaResult = db.exec("PRAGMA table_info(Client);");
        const validColumns = schemaResult[0].values.map(col => col[1]);
        
        // Filter to only valid columns (exclude clientID)
        const columns = Object.keys(clientData).filter(col => 
            validColumns.includes(col) && col !== 'clientID'
        );
        
        if (columns.length === 0) {
            throw new Error('No valid columns to update.');
        }
        
        const values = columns.map(col => clientData[col]);
        values.push(clientID); // Add clientID for WHERE clause
        
        const setClause = columns.map(col => `${col} = ?`).join(", ");
        const sql = `UPDATE Client SET ${setClause} WHERE clientID = ?`;
        
        db.run(sql, values);
        saveDatabase();
        
        console.log('Updated client:', clientID);
        return true;
        
    } catch (error) {
        console.error('Error updating client:', error);
        throw new Error('Failed to update client: ' + error.message);
    }
});

// Note Operations

ipcMain.handle('get-notes', (event, clientID) => {
    try {
        const result = db.exec("SELECT * FROM History WHERE clientID = ? ORDER BY createdOn DESC", [clientID]);
        return mapDbResult(result);
    } catch (error) {
        console.error('Error getting notes:', error);
        throw new Error('Failed to get notes: ' + error.message);
    }
});

ipcMain.handle('add-note', (event, noteData) => {
    try {
        const { clientID, noteType, content } = noteData;
        
        db.run(
            "INSERT INTO History (clientID, noteType, content) VALUES (?, ?, ?)",
            [clientID, noteType, content]
        );
        
        const result = db.exec("SELECT last_insert_rowid() as noteID;");
        saveDatabase();
        
        const newNoteID = result[0].values[0][0];
        console.log('Added note:', newNoteID);
        return newNoteID;
        
    } catch (error) {
        console.error('Error adding note:', error);
        throw new Error('Failed to add note: ' + error.message);
    }
});

ipcMain.handle('update-note', (event, noteID, noteData) => {
    try {
        const { noteType, content } = noteData;
        
        db.run(
            "UPDATE History SET noteType = ?, content = ? WHERE noteID = ?",
            [noteType, content, noteID]
        );
        
        saveDatabase();
        
        console.log('Updated note:', noteID);
        return true;
        
    } catch (error) {
        console.error('Error updating note:', error);
        throw new Error('Failed to update note: ' + error.message);
    }
});

ipcMain.handle('delete-note', (event, noteID) => {
    try {
        // Get note info first to find its client
        const result = db.exec("SELECT clientID FROM History WHERE noteID = ?", [noteID]);
        
        if (!result[0] || result[0].values.length === 0) {
            throw new Error('Note not found');
        }
        
        const clientID = result[0].values[0][0];
        
        // Delete note from database
        db.run("DELETE FROM History WHERE noteID = ?", [noteID]);
        saveDatabase();
        
        // Delete all attachments for this note - USE USERDATA PATH
        const userDataPath = app.getPath('userData');
        const noteAttachmentsPath = path.join(userDataPath, 'Database', 'Attachments', String(clientID), String(noteID));
        
        if (fs.existsSync(noteAttachmentsPath)) {
            fs.rmSync(noteAttachmentsPath, { recursive: true, force: true });
            console.log('Deleted attachments for note:', noteID);
        }
        
        console.log('Deleted note:', noteID);
        return true;
        
    } catch (error) {
        console.error('Error deleting note:', error);
        throw new Error('Failed to delete note: ' + error.message);
    }
});

// Search operation

ipcMain.handle('search-clients', (event, searchTerm) => {
    try {
        // If search term is empty, return all clients
        if (!searchTerm || searchTerm.trim() === '') {
            const result = db.exec("SELECT clientID, firstName, lastName FROM Client ORDER BY lastName, firstName");
            return mapDbResult(result);
        }
        
        // Otherwise, search across all Client fields, note content, and attachment filenames
        const term = `%${searchTerm}%`;
        
        // Get all clients
        const allClientsResult = db.exec("SELECT * FROM Client");
        const allClients = mapDbResult(allClientsResult);
        
        // Get all notes
        const allNotesResult = db.exec("SELECT clientID, content FROM History");
        const allNotes = mapDbResult(allNotesResult);
        
        const matchingClientIDs = new Set();
        
        // Get hidden fields from FieldMetadata
        let hiddenFields = [];
        try {
            const hiddenFieldsResult = db.exec("SELECT fieldName FROM FieldMetadata WHERE isHidden = 1");
            if (hiddenFieldsResult && hiddenFieldsResult[0]) {
                hiddenFields = hiddenFieldsResult[0].values.map(row => row[0]);
            }
        } catch (error) {
            console.error('Error fetching hidden fields:', error);
            // Continue search even if we can't get hidden fields
        }
        
        // Search through client fields (excluding hidden fields)
        allClients.forEach(client => {
            // Search through all fields of the client, except hidden ones
            for (const [key, value] of Object.entries(client)) {
                // Skip hidden fields
                if (hiddenFields.includes(key)) continue;
                
                if (value && String(value).toLowerCase().includes(searchTerm.toLowerCase())) {
                    matchingClientIDs.add(client.clientID);
                    break;
                }
            }
        });
        
        // Search through notes
        allNotes.forEach(note => {
            if (note.content && note.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                matchingClientIDs.add(note.clientID);
            }
        });
        
        // Search through attachment filenames
        const userDataPath = app.getPath('userData');
        const attachmentsBasePath = path.join(userDataPath, 'Database', 'Attachments');
        
        if (fs.existsSync(attachmentsBasePath)) {
            try {
                // Get all client folders
                const clientFolders = fs.readdirSync(attachmentsBasePath);
                
                clientFolders.forEach(clientIDStr => {
                    const clientID = parseInt(clientIDStr, 10);
                    if (isNaN(clientID)) return;
                    
                    const clientAttachmentsPath = path.join(attachmentsBasePath, clientIDStr);
                    if (!fs.statSync(clientAttachmentsPath).isDirectory()) return;
                    
                    // Get all note folders for this client
                    const noteFolders = fs.readdirSync(clientAttachmentsPath);
                    
                    noteFolders.forEach(noteID => {
                        const notePath = path.join(clientAttachmentsPath, noteID);
                        if (!fs.statSync(notePath).isDirectory()) return;
                        
                        // Get all files in this note folder
                        const files = fs.readdirSync(notePath);
                        
                        files.forEach(fileName => {
                            if (fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
                                matchingClientIDs.add(clientID);
                            }
                        });
                    });
                });
            } catch (attachmentError) {
                console.error('Error searching attachments:', attachmentError);
                // Continue even if attachment search fails
            }
        }
        
        // Return clients that match
        const clients = allClients.filter(client => matchingClientIDs.has(client.clientID));
        
        // Sort by last name, first name
        clients.sort((a, b) => {
            if (a.lastName < b.lastName) return -1;
            if (a.lastName > b.lastName) return 1;
            if (a.firstName < b.firstName) return -1;
            if (a.firstName > b.firstName) return 1;
            return 0;
        });
        
        // Return minimal info for list
        return clients.map(client => ({
            clientID: client.clientID,
            firstName: client.firstName,
            lastName: client.lastName
        }));
        
    } catch (error) {
        console.error('Error searching clients:', error);
        throw new Error('Failed to search clients: ' + error.message);
    }
});

// Attachment Operations
const { shell } = require('electron');

ipcMain.handle('get-attachments', (event, clientID) => {
    try {
        const userDataPath = app.getPath('userData');
        const clientAttachmentsPath = path.join(userDataPath, 'Database', 'Attachments', String(clientID));
        
        // Check if client attachments directory exists
        if (!fs.existsSync(clientAttachmentsPath)) {
            return {}; // No attachments for this client
        }
        
        const attachments = {};
        
        // Read all note directories for this client
        const noteDirs = fs.readdirSync(clientAttachmentsPath);
        
        noteDirs.forEach(noteID => {
            const notePath = path.join(clientAttachmentsPath, noteID);
            
            // Check if it's a directory
            if (fs.statSync(notePath).isDirectory()) {
                const files = fs.readdirSync(notePath);
                attachments[noteID] = files;
            }
        });
        
        console.log('Loaded attachments for client:', clientID, attachments);
        return attachments;
        
    } catch (error) {
        console.error('Error getting attachments:', error);
        throw new Error('Failed to get attachments: ' + error.message);
    }
});

ipcMain.handle('save-attachment', (event, clientID, noteID, fileName, fileBuffer) => {
    try {
        const userDataPath = app.getPath('userData');
        const attachmentDir = path.join(userDataPath, 'Database', 'Attachments', String(clientID), String(noteID));
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(attachmentDir)) {
            fs.mkdirSync(attachmentDir, { recursive: true });
        }
        
        const filePath = path.join(attachmentDir, fileName);
        
        // Write file
        fs.writeFileSync(filePath, Buffer.from(fileBuffer));
        
        console.log('Saved attachment:', filePath);
        return true;
        
    } catch (error) {
        console.error('Error saving attachment:', error);
        throw new Error('Failed to save attachment: ' + error.message);
    }
});

ipcMain.handle('delete-attachment', (event, clientID, noteID, fileName) => {
    try {
        const userDataPath = app.getPath('userData');
        const filePath = path.join(userDataPath, 'Database', 'Attachments', String(clientID), String(noteID), fileName);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Deleted attachment:', filePath);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error deleting attachment:', error);
        throw new Error('Failed to delete attachment: ' + error.message);
    }
});

ipcMain.handle('open-attachment', async (event, clientID, noteID, fileName) => {
    try {
        const userDataPath = app.getPath('userData');
        const filePath = path.join(userDataPath, 'Database', 'Attachments', String(clientID), String(noteID), fileName);
        
        if (fs.existsSync(filePath)) {
            await shell.openPath(filePath);
            console.log('Opened attachment:', filePath);
            return true;
        }
        
        throw new Error('File not found');
        
    } catch (error) {
        console.error('Error opening attachment:', error);
        throw new Error('Failed to open attachment: ' + error.message);
    }
});

// Field Management Operations

ipcMain.handle('get-field-metadata', () => {
    try {
        const result = db.exec("SELECT * FROM FieldMetadata ORDER BY isProtected DESC, fieldName ASC");
        return mapDbResult(result);
    } catch (error) {
        console.error('Error getting field metadata:', error);
        throw new Error('Failed to get field metadata: ' + error.message);
    }
});

ipcMain.handle('add-field', (event, fieldName, dataType, isRequired, defaultValue) => {
    try {
        // Validate field name (alphanumeric and underscore only)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
            throw new Error('Field name must start with a letter and contain only letters, numbers, and underscores');
        }
        
        // Check if field already exists
        const schemaResult = db.exec("PRAGMA table_info(Client)");
        const existingFields = schemaResult[0].values.map(col => col[1]);
        
        if (existingFields.includes(fieldName)) {
            throw new Error('Field already exists');
        }
        
        // Build ALTER TABLE statement
        // ALL custom fields are optional (no NOT NULL constraint)
        // Only firstName and lastName are required (protected fields)
        let sqlType = dataType === 'DATE' ? 'DATE' : 'TEXT';
        let alterSQL = `ALTER TABLE Client ADD COLUMN ${fieldName} ${sqlType}`;
        
        // No NOT NULL constraint for custom fields
        
        // Add column to Client table
        db.run(alterSQL);
        
        // Add to FieldMetadata (always set isRequired to 0 for custom fields)
        db.run(
            "INSERT INTO FieldMetadata (fieldName, dataType, isRequired, isHidden, isProtected) VALUES (?, ?, 0, 0, 0)",
            [fieldName, dataType]
        );
        
        saveDatabase();
        
        console.log('Added optional field:', fieldName);
        return true;
        
    } catch (error) {
        console.error('Error adding field:', error);
        throw new Error('Failed to add field: ' + error.message);
    }
});

// Helper function to parse DD/MM/YYYY dates in backend
function parseDateInputBackend(inputString) {
    if (!inputString || inputString.trim() === '') return null;
    
    // Remove extra whitespace
    const cleaned = inputString.trim();
    
    // Try to parse DD/MM/YYYY format
    const parts = cleaned.split(/[\/\-\.\s]/);
    
    if (parts.length !== 3) return null;
    
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    // Validate ranges
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 1 || month > 12) return null;
    if (year < 1900 || year > 2100) return null;
    
    // Pad to 2 digits
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    
    // Check if date is valid
    const testDate = new Date(year, month - 1, day);
    if (testDate.getDate() !== day || testDate.getMonth() !== month - 1) {
        return null; // Invalid date (e.g., Feb 30)
    }
    
    // Return in YYYY-MM-DD format
    return `${year}-${monthStr}-${dayStr}`;
}

ipcMain.handle('toggle-field-visibility', (event, fieldName, isHidden) => {
    try {
        db.run("UPDATE FieldMetadata SET isHidden = ? WHERE fieldName = ?", [isHidden ? 1 : 0, fieldName]);
        saveDatabase();
        
        console.log(`${isHidden ? 'Hidden' : 'Shown'} field:`, fieldName);
        return true;
        
    } catch (error) {
        console.error('Error toggling field visibility:', error);
        throw new Error('Failed to toggle field visibility: ' + error.message);
    }
});

ipcMain.handle('restart-app', () => {
    app.relaunch();
    app.exit(0);
});