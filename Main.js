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
        db.run("DELETE FROM Client WHERE clientID = ?", [clientID]);
        saveDatabase();
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
        db.run("DELETE FROM History WHERE noteID = ?", [noteID]);
        saveDatabase();
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
        
        const sql = `
            SELECT DISTINCT c.clientID, c.firstName, c.lastName
            FROM Client c
            LEFT JOIN History h ON c.clientID = h.clientID
            WHERE c.firstName LIKE ?
               OR c.lastName LIKE ?
               OR c.email LIKE ?
               OR c.phone LIKE ?
               OR c.address LIKE ?
               OR h.noteType LIKE ?
               OR h.content LIKE ?
            ORDER BY c.lastName, c.firstName
        `;
        
        const result = db.exec(sql, [pattern, pattern, pattern, pattern, pattern, pattern, pattern]);
        return mapDbResult(result);
        
    } catch (error) {
        console.error('Error searching clients:', error);
        throw new Error('Failed to search clients: ' + error.message);
    }
});
