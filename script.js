const sysInfo = require('systeminformation');
const outputProcessTable = document.getElementById('processOutput');
const procHeading = document.getElementById('procStats');
const outputFile = document.getElementById('fileOutput');
const outputNetworkTable = document.getElementById('networkOutput');
const netHeading = document.getElementById('netStats');
const fs = require('fs');
const chokidar = require('chokidar');
const { exec } = require('child_process');

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
        Object.keys(process).forEach(async key => {
            const cell = document.createElement('td');
            let content = process[key];
            cell.textContent = content;
            if (key === 'path' && process[key] !== 'N/A') {
                let path, separator;
                if (process[key].includes('/')) separator = '/';
                else separator = '\\';
                path = process[key].split(separator);
                path = path.slice(0, path.length - 1); // Remove the file name
                path = path.join(separator);
                cell.onclick = () => {
                    exec(`start ${path}`);
                };
                cell.classList.add('clickable');
            }
            if (key === 'pid') {
                cell.onclick = () => {
                    exec(`taskkill /PID ${process[key]} /F`);
                    alert(`Killed process with PID ${process[key]}`);
                    // Remove the row from the table
                    row.remove();
                }
                cell.classList.add('clickable-pid');
            }
            if (process[key].length < 1 || process[key] === 'N/A') {
                cell.style.color = 'gray';
                content = 'N/A';
            }
            row.appendChild(cell);
        });
        outputProcessTable.appendChild(row);
    });
    procHeading.textContent = `Active Processes: ${processes.list.length}`;
};

let watcher, watchingFile;

const watchFileChanges = async (dirPath) => {
    if (watcher) {
        watcher.close();
    }

    // Initialize a new chokidar watcher
    watcher = chokidar.watch(dirPath, { persistent: true, ignoreInitial:true });

    // Add event listeners to the watcher
    watcher.on('add', (path) => {
        // Check if the file already exists in the directory only on the first run
        outputFile.textContent += `File added: ${path}\n`;
    });
    watcher.on('change', (path) => {
        outputFile.textContent += `File changed: ${path}\n`;
    });
    watcher.on('unlink', (path) => {
        outputFile.textContent += `File removed: ${path}\n`;
    });
    watcher.on('error', (error) => {
        console.error('Error watching file changes:', error);
    });
    
    outputFile.textContent = `Watching for file changes in ${dirPath}\n`;
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
                let content = conn[key];
                // if (content == '0' || content === 'Address:' || content === 'Local:' || content === 'proto' || content === 'Foreign') return
                if (key === 'local' || key === 'remote') {
                    cell.onclick = () => {
                        exec(`start http://${content}`);
                    };
                    cell.classList.add('clickable');
                }
                if (key === 'state') {
                    if (content === 'LISTENING' || content === 'LISTEN') {
                        cell.style.color = 'green';
                    }
                    if (content === 'ESTABLISHED') {
                        cell.style.color = '#00f';
                    }
                    if (content === 'TIME_WAIT') {
                        cell.style.color = 'red';
                    }
                    if (content === 'CLOSE_WAIT') {
                        cell.style.color = 'orange';
                    }
                    if (content === 'SYN_SENT') {
                        cell.style.color = 'purple';
                    }
                    if (content === 'SYN_RECEIVED') {
                        cell.style.color = 'yellow';
                    }
                }
                if (key === 'pid') {
                    cell.onclick = () => {
                        exec(`taskkill /PID ${conn[key]} /F`);
                        alert(`Killed process with PID ${conn[key]}`);
                    }
                    cell.classList.add('clickable-pid');
                }
                if (content.length < 1) {
                    cell.style.color = 'gray';
                    content = 'N/A';
                }
                cell.textContent = content;
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
    stopwatchfileButton.disabled = false;
    watchFileChanges(dirHandle);
});
stopwatchfileButton.addEventListener('click', async () => {
    if (watcher) {
        watcher.close();
        outputFile.textContent = `Stopped watching file changes in ${watchingFile}`;
        watchingFile = '';
    }
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