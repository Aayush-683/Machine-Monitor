const sysInfo = require('systeminformation');
const outputProcessTable = document.getElementById('processOutput');
const outputFile = document.getElementById('fileOutput');
const outputNetworkTable = document.getElementById('networkOutput');
const fs = require('fs');

const checkProcesses = async () => {
    const processes = await sysInfo.processes();
    const processList = processes.list.map(process => {
        return {
            pid: process.pid,
            name: process.name,
            mem: process.mem,
            started: process.started,
            user: process.user,
            command: process.command,
            path: process.path,
            state: process.state
        }
    });
    // Add headers to the table
    const headers = Object.keys(processList[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const cell = document.createElement('th');
        cell.textContent = header.toUpperCase();
        headerRow.appendChild(cell);
    });
    outputProcessTable.appendChild(headerRow);
    // Add the process list to the table as rows
    processList.forEach(process => {
        const row = document.createElement('tr');
        Object.keys(process).forEach(key => {
            const cell = document.createElement('td');
            cell.textContent = process[key];
            row.appendChild(cell);
        });
        outputProcessTable.appendChild(row);
    });
};

let watcher;

const watchFileChanges = (path) => {
    // Check if path is a directory and exists
    if (!fs.existsSync(path)) {
        outputFile.textContent = 'Invalid path';
        return;
    } else {
        watcher = fs.watch(path, (eventType, filename) => {
            if (filename) {
                outputFile.textContent += `\nEVENT: ${eventType.toUpperCase()} | FILE: ${filename}`;
                // You can add more logic here, e.g., reading the file, handling the event, etc.
            } else {
                console.log('Filename not provided');
            }
        });
        outputFile.textContent = `Watching for file changes in ${path}`;
    }
};

const checkNetworkActivity = () => {
    const networkStats = sysInfo.networkConnections();
    networkStats.then((connections) => {
        const connectionList = connections.map(conn => {
            return {
                pid: conn.pid,
                protocol: conn.protocol,
                local: conn.localAddress + ':' + conn.localPort,
                remote: conn.peerAddress + ':' + conn.peerPort,
                state: conn.state
            }
        });
        // Add headers to the table
        const headers = Object.keys(connectionList[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const cell = document.createElement('th');
            cell.textContent = header.toUpperCase();
            headerRow.appendChild(cell);
        });
        outputNetworkTable.appendChild(headerRow);
        // Add the network connections to the table as rows
        connectionList.forEach(conn => {
            const row = document.createElement('tr');
            Object.keys(conn).forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = conn[key];
                row.appendChild(cell);
            });
            outputNetworkTable.appendChild(row);
        });
    }).catch((error) => {
        console.error('Error fetching network connections:', error);
    });
};

// Handle button clicks
const homeButton = document.getElementById('homeButton');
const processButton = document.getElementById('checkProcesses');
const fileButton = document.getElementById('watchFiles');
const networkButton = document.getElementById('checkNetwork');
const watchfileButton = document.getElementById('watchFileButton');
const stopwatchfileButton = document.getElementById('stopwatchfileButton');

const fileInput = document.getElementById('fileInput');
const homeContent = document.getElementById('homeContent');
const processContent = document.getElementById('processContent');
const fileContent = document.getElementById('fileContent');
const networkContent = document.getElementById('networkContent');
let watchingFile;

// Add event listeners
homeButton.addEventListener('click', () => showContent('home'));
processButton.addEventListener('click', () => showContent('process'));
fileButton.addEventListener('click', async () => showContent('file'));
networkButton.addEventListener('click', () => showContent('network'));
watchfileButton.addEventListener('click', async () => {
    const dirHandle = fileInput.value;
    outputFile.textContent = '';
    watchingFile = dirHandle;
    fileInput.disabled = true;
    watchfileButton.disabled = true;
    watchFileChanges(dirHandle);
    stopwatchfileButton.disabled = false;
});
stopwatchfileButton.addEventListener('click', async () => {
    outputFile.textContent = '';
    watcher.close();
    outputFile.textContent = `Stopped watching file changes in ${watchingFile}`;
    watchingFile = '';
    fileInput.value = '';
    fileInput.disabled = false;
    stopwatchfileButton.disabled = true;
    watchfileButton.disabled = false;
});

// Show content based on the section
const showContent = (section) => {
    homeContent.classList.add('hidden');
    processContent.classList.add('hidden');
    fileContent.classList.add('hidden');
    networkContent.classList.add('hidden');

    switch (section) {
        case 'home':
            homeContent.classList.remove('hidden');
            break;
        case 'process':
            processContent.classList.remove('hidden');
            checkProcesses();
            break;
        case 'file':
            fileContent.classList.remove('hidden');
            break;
        case 'network':
            networkContent.classList.remove('hidden');
            checkNetworkActivity();
            break;
    }
};