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


// Handle IPC events for database operations