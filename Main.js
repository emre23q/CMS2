const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const {app,BrowserWindow,ipcMain} = require('electron');

let db = null;
let mainWindow = null;


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
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
        return obj;
    });
}
// Handle IPC events for database operations
ipcMain.handle('get-client-list', () => {
    const result = db.exec("SELECT firstName, lastName FROM Client")
    return mapDbResult(result);

});
ipcMain.handle('get-client', (event, clientID) => {
    const result = db.exec("SELECT * FROM Client WHERE clientID = ?", [clientID]);
    const client = mapDbResult(result);
    return client[0] || null;
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
        const sql = db.run(`INSERT INTO Client (${columnNames}) VALUES (${placeholders})`);
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