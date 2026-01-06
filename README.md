# Customer Management System (CMS)

A desktop application for managing client information, notes, and attachments. Built with Electron and SQL.js for a lightweight, cross-platform solution.

> **⚠️ Demonstration Project**: This is a portfolio project built to showcase desktop application development skills. It is not intended for production use and lacks security features required for handling sensitive client data (encryption, authentication, audit logging, etc.). Use only for learning or demonstration purposes.

## Features

- **Client Management**: Add, edit, and delete client records with customizable fields
- **Notes & History**: Track interactions, appointments, and communications with timestamped notes
- **Search Functionality**: Quickly find clients by searching across all fields and notes
- **Attachments**: Associate files with specific notes for each client
- **Customizable Fields**: Add custom fields to the client form based on your needs
- **Resizable Interface**: Adjustable panes for comfortable viewing on any screen size

## Tech Stack

- **Electron** - Desktop application framework
- **SQL.js** - In-browser SQLite database
- **Vanilla JavaScript** - No frameworks, clean and readable code
- **HTML/CSS** - Responsive UI with custom styling

## Getting Started
- Download and install the exe found in the 'dist' directory or build it yourself by following the below mentioned steps.
- **Note about Windows Installer**: The generated `.exe` installer will likely be flagged by Windows Defender/SmartScreen as an unrecognized app. This is normal for unsigned applications. For development/demo purposes, users can bypass the warning by clicking "More info" → "Run anyway" in the SmartScreen dialog.

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/cms.git
cd cms
```

2. Install dependencies
```bash
npm install
```

3. Run the application
```bash
npm start
```

### Building for Production

Build executables for Windows, macOS, or Linux:

```bash
# Build for current platform
npm run build

# Build for all platforms
npm run build-all
```


## Project Structure

```
cms/
├── Main.js           # Electron main process (database operations)
├── Preload.js        # IPC bridge for secure renderer communication
├── Renderer.js       # UI logic and event handlers
├── Index.html        # Application layout
├── Styles.css        # Application styling
├── ClientDB.sql      # Database schema definition
└── generate-test-data.js  # Test data generator
```

## Database Schema

The application uses a simple but flexible SQLite schema:

- **Client Table**: Stores client information (name, contact details, insurance, etc.)
- **History Table**: Stores timestamped notes linked to clients
- **Foreign Key Constraints**: Automatic cascade deletion of notes when clients are removed

## Key Implementation Details

- **SQL.js Integration**: Database runs entirely in memory with periodic saves to disk
- **IPC Communication**: Secure communication between Electron processes using contextBridge
- **Dynamic Field Management**: Add custom fields to the client form without modifying code
- **Responsive Design**: CSS Grid layout with draggable resize handles

## Future Enhancements

- Export client data to PDF or CSV
- Calendar view for appointments
- Reminder notifications for follow-ups
- Data backup and restore functionality

This project was built as a demonstration of Electron and database integration. For production use with real client data.

## Author

Brandon Ozdemir

## License

This project is open source and available under the MIT License.
