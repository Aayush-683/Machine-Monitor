const sysInfo = require('systeminformation');
const outputProcessTable = document.getElementById('processOutput');
const procHeading = document.getElementById('procStats');
const outputFile = document.getElementById('fileOutput');
const outputNetworkTable = document.getElementById('networkOutput');
const netHeading = document.getElementById('netStats');
const fs = require('fs');

const checkProcesses = async () => {
    const processes = await sysInfo.processes();
    const processList = processes.list.map(process => {
        return {
            pid: process.pid,
            name: process.name,
            "memory used": `${(process.mem).toFixed(2)}%`,
            "started at": process.started,
            user: process.user ? process.user : 'N/A',
            command: process.command ? process.command : 'N/A',
            path: process.path ? process.path : 'N/A'
        }
    });
    // Clear the table before adding new data
    outputProcessTable.innerHTML = '';
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
            // Add a link to the path if it exists
            if (key === 'path' && process[key] !== 'N/A') {
                const link = document.createElement('a');
                let path, separator;
                if (process[key].includes('/')) separator = '/';
                else separator = '\\';
                path = process[key].split(separator);
                path = path.slice(0, path.length - 1); // Remove the file name
                link.onclick = () => {
                    // Open the file path in the default file explorer
                    require('child_process').exec(`start ${path.join(separator)}`);
                };
                link.classList.add('proc_link')
                link.textContent = process[key];
                cell.appendChild(link);
            } else {
                cell.textContent = process[key];
            }
            row.appendChild(cell);
        });
        outputProcessTable.appendChild(row);
    });
    procHeading.textContent = `Active Processes: ${processes.list.length}`;
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
        // Clear the table before adding new data
        outputNetworkTable.innerHTML = '';
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
        netHeading.textContent = `Active Network Connections: ${connections.length}`;
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

let intervals = {};

// Show content based on the section
const showContent = (section) => {
    homeContent.classList.add('hidden');
    processContent.classList.add('hidden');
    fileContent.classList.add('hidden');
    networkContent.classList.add('hidden');

    switch (section) {
        case 'home':
            homeContent.classList.remove('hidden');
            clearInterval(intervals.processes);
            clearInterval(intervals.network);
            break;
        case 'process':
            processContent.classList.remove('hidden');
            checkProcesses();
            intervals.processes = setInterval(checkProcesses, 5000);
            clearInterval(intervals.network);
            break;
        case 'file':
            fileContent.classList.remove('hidden');
            break;
        case 'network':
            networkContent.classList.remove('hidden');
            checkNetworkActivity();
            intervals.network = setInterval(checkNetworkActivity, 5000);
            break;
    }
};