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
        fs.mkdirSync(databaseFolder);
    }
    if (!fs.existsSync(attachmentsFolder)) {
        fs.mkdirSync(attachmentsFolder);
    }
}

async function initDatabase(){
    const appPath = app.getAppPath();
    const databaseFolder = path.join(appPath, 'Database');
    const attachmentsFolder = path.join(databaseFolder, 'Attachments');
    const dbPath = path.join(databaseFolder, 'ClientDB.db');
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

}

function saveDatabase(){
    const appPath = app.getAppPath(); 
    const databaseFolder = path.join(appPath, 'Database');
    const dbPath = path.join(databaseFolder, 'ClientDB.db');
    if (db){
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log('Database saved to file.', dbPath);

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
        
        // Delete all attachments for this client
        const appPath = app.getAppPath();
        const clientAttachmentsDir = path.join(appPath, 'Database', 'Attachments', String(clientID));
        
        if (fs.existsSync(clientAttachmentsDir)) {
            // Recursively delete the entire client attachments directory
            const deleteRecursive = (dirPath) => {
                if (fs.existsSync(dirPath)) {
                    fs.readdirSync(dirPath).forEach(file => {
                        const filePath = path.join(dirPath, file);
                        if (fs.statSync(filePath).isDirectory()) {
                            deleteRecursive(filePath);
                        } else {
                            fs.unlinkSync(filePath);
                        }
                    });
                    fs.rmdirSync(dirPath);
                }
            };
            
            deleteRecursive(clientAttachmentsDir);
            console.log('Deleted all attachments for client:', clientID);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting client:', error);
        throw new Error('Failed to delete client: ' + error.message);
    }
});

ipcMain.handle('update-client', (event, clientID, clientData) => {
    try {
        const schemaResult = db.exec("PRAGMA table_info(Client)");
        const validColumns = schemaResult[0].values.map(col => col[1]);
                const columns = Object.keys(clientData)
            .filter(col => validColumns.includes(col))
            .filter(col => col !== 'clientID'); 

        if (columns.length === 0) {
            throw new Error('No valid columns to update');
        }

        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const values = [...columns.map(col => clientData[col]), clientID];
        const sql = `UPDATE Client SET ${setClause} WHERE clientID = ?`;
        db.run(sql, values);
        saveDatabase();
        return true;
    
    } catch (error) {
        console.error('Error updating client:', error);
        throw new Error('Failed to update client: ' + error.message);
    }
});
/*example data format
{
  clientID: 1,
  noteType: 'General',
  content: 'This is a note.'}
*/
ipcMain.handle('add-note', (event,noteData) => {
    try {
        const noteType = noteData.noteType;
        const content = noteData.content;
        const clientID = noteData.clientID;
        db.run("INSERT INTO History (clientID, noteType, content) VALUES (?, ?, ?)", [clientID, noteType, content]);
        saveDatabase();
        const result = db.exec("SELECT last_insert_rowid() as noteID;");
        const newNoteID = result[0].values[0][0];
        return newNoteID;
    } catch (error) {
        console.error('Error adding note:', error);
        throw new Error('Failed to add note: ' + error.message);
    }
});

ipcMain.handle('delete-note', (event, noteID) => {
    try {
        // First, get the clientID before deleting the note
        const result = db.exec("SELECT clientID FROM History WHERE noteID = ?", [noteID]);
        const clientID = result[0] && result[0].values[0] ? result[0].values[0][0] : null;
        
        // Delete the note from database
        db.run("DELETE FROM History WHERE noteID = ?", [noteID]);
        saveDatabase();
        
        // Delete attachments folder if it exists
        if (clientID) {
            const appPath = app.getAppPath();
            const attachmentDir = path.join(appPath, 'Database', 'Attachments', String(clientID), String(noteID));
            
            if (fs.existsSync(attachmentDir)) {
                // Delete all files in the directory
                const files = fs.readdirSync(attachmentDir);
                files.forEach(file => {
                    const filePath = path.join(attachmentDir, file);
                    fs.unlinkSync(filePath);
                });
                
                // Delete the directory itself
                fs.rmdirSync(attachmentDir);
                
                console.log('Deleted attachments folder:', attachmentDir);
            }
        }
        
        return true;

    } catch (error) {
        console.error('Error deleting note:', error);
        throw new Error('Failed to delete note: ' + error.message);
    }
});

/* example data format
{
  noteType: 'Updated Type',
  content: 'Updated content.'
}
*/

ipcMain.handle('update-note', (event, noteID, noteData) => {
    try {
        const schemaResult = db.exec("PRAGMA table_info(History)");
        const validColumns = schemaResult[0].values.map(col => col[1]);
        const columns = Object.keys(noteData)
            .filter(col => validColumns.includes(col))
            .filter(col => col !== 'noteID');
        
        if (columns.length === 0) {
            throw new Error('No valid columns to update');
        }
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const values = [...columns.map(col => noteData[col]), noteID];
        const sql = `UPDATE History SET ${setClause} WHERE noteID = ?`;
        db.run(sql, values);
        saveDatabase();
        return true;
        
    } catch (error) {
        console.error('Error updating note:', error);
        throw new Error('Failed to update note: ' + error.message);
    }
});

ipcMain.handle('get-notes', (event, clientID) => {
    try {
        const result = db.exec("SELECT * FROM History WHERE clientID = ? ORDER BY createdOn DESC",[clientID]);
        return mapDbResult(result);
    } catch (error) {
        console.error('Error getting notes:', error);
        throw new Error('Failed to get notes: ' + error.message);
    }
});

ipcMain.handle('search-clients', (event, searchTerm) => {
    try {
        // Empty search = all clients
        if (!searchTerm || searchTerm.trim() === '') {
            const result = db.exec('SELECT clientID, firstName, lastName FROM Client ORDER BY lastName, firstName');
            return mapDbResult(result);
        }
        
        const pattern = `%${searchTerm}%`;
        
        // Get all Client table columns dynamically
        const schemaResult = db.exec("PRAGMA table_info(Client)");
        const clientColumns = schemaResult[0].values.map(col => col[1]); // Get column names
        
        // Build WHERE clause for all client fields
        const clientWhereConditions = clientColumns.map(col => `c.${col} LIKE ?`).join(' OR ');
        
        // Build SQL with dynamic client fields + notes + attachments
        const sql = `
            SELECT DISTINCT c.clientID, c.firstName, c.lastName
            FROM Client c
            LEFT JOIN History h ON c.clientID = h.clientID
            WHERE ${clientWhereConditions}
               OR h.noteType LIKE ?
               OR h.content LIKE ?
            ORDER BY c.lastName, c.firstName
        `;
        
        // Create parameter array: one for each client column + 2 for notes
        const params = [...clientColumns.map(() => pattern), pattern, pattern];
        
        const result = db.exec(sql, params);
        let clients = mapDbResult(result);
        
        // Also search attachment filenames
        const appPath = app.getAppPath();
        const attachmentsPath = path.join(appPath, 'Database', 'Attachments');
        
        if (fs.existsSync(attachmentsPath)) {
            const clientDirs = fs.readdirSync(attachmentsPath);
            
            clientDirs.forEach(clientID => {
                const clientPath = path.join(attachmentsPath, clientID);
                if (fs.statSync(clientPath).isDirectory()) {
                    const noteDirs = fs.readdirSync(clientPath);
                    
                    noteDirs.forEach(noteID => {
                        const notePath = path.join(clientPath, noteID);
                        if (fs.statSync(notePath).isDirectory()) {
                            const files = fs.readdirSync(notePath);
                            
                            // Check if any filename matches search term
                            const hasMatch = files.some(file => 
                                file.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                            
                            if (hasMatch) {
                                // Get client info
                                const clientResult = db.exec(
                                    "SELECT clientID, firstName, lastName FROM Client WHERE clientID = ?",
                                    [parseInt(clientID)]
                                );
                                const client = mapDbResult(clientResult)[0];
                                
                                // Add to results if not already there
                                if (client && !clients.some(c => c.clientID === client.clientID)) {
                                    clients.push(client);
                                }
                            }
                        }
                    });
                }
            });
            
            // Re-sort after adding attachment matches
            clients.sort((a, b) => {
                const lastNameCompare = a.lastName.localeCompare(b.lastName);
                if (lastNameCompare !== 0) return lastNameCompare;
                return a.firstName.localeCompare(b.firstName);
            });
        }
        
        return clients;
        
    } catch (error) {
        console.error('Error searching clients:', error);
        throw new Error('Failed to search clients: ' + error.message);
    }
});

// Attachment Operations
const { shell } = require('electron');

ipcMain.handle('get-attachments', (event, clientID) => {
    try {
        const appPath = app.getAppPath();
        const clientAttachmentsPath = path.join(appPath, 'Database', 'Attachments', String(clientID));
        
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
        const appPath = app.getAppPath();
        const attachmentDir = path.join(appPath, 'Database', 'Attachments', String(clientID), String(noteID));
        
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
        const appPath = app.getAppPath();
        const filePath = path.join(appPath, 'Database', 'Attachments', String(clientID), String(noteID), fileName);
        
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
        const appPath = app.getAppPath();
        const filePath = path.join(appPath, 'Database', 'Attachments', String(clientID), String(noteID), fileName);
        
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