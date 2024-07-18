const psList = require('ps-list');
// const chokidar = require('chokidar');
const { exec } = require('child_process');
const si = require('systeminformation');
const Chart = require('chart.js');
const outputProcess = document.getElementById('processOutput');
const outputFile = document.getElementById('fileOutput');
const outputNetwork = document.getElementById('networkOutput');
const fs = require('fs');

const checkProcesses = async () => {
    const processes = await psList();
    outputProcess.textContent = 'Running Processes:\n' + processes.map(proc => `PID: ${proc.pid}, Name: ${proc.name}`).join('\n');
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
    exec('netstat -an', (error, stdout, stderr) => {
        if (error) {
            outputNetwork.textContent += `\nError fetching network activity: ${error.message}`;
            return;
        }
        if (stderr) {
            outputNetwork.textContent += `\nError fetching network activity: ${stderr}`;
            return;
        }
        const connections = stdout.split('\n').map(line => line.trim()).filter(line => line);
        outputNetwork.textContent += '\n' + connections.join('\n');
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

// Initialize Charts
// Initialize Charts
const initializeChart = (ctx, label, borderColor) => new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label,
            data: [],
            borderColor,
            borderWidth: 1
        }]
    }
});

const tempChart = initializeChart(document.getElementById('tempChart').getContext('2d'), 'Temperature', 'rgba(255, 99, 132, 1)');
const ramChart = initializeChart(document.getElementById('ramChart').getContext('2d'), 'RAM Usage', 'rgba(54, 162, 235, 1)');
const storageChart = initializeChart(document.getElementById('storageChart').getContext('2d'), 'Storage Usage', 'rgba(75, 192, 192, 1)');
const sessionChart = initializeChart(document.getElementById('sessionChart').getContext('2d'), 'Active Sessions', 'rgba(153, 102, 255, 1)');
const batteryChart = initializeChart(document.getElementById('batteryChart').getContext('2d'), 'Battery Level', 'rgba(255, 206, 86, 1)');
const graphicsChart = initializeChart(document.getElementById('graphicsChart').getContext('2d'), 'Graphics Usage', 'rgba(255, 159, 64, 1)');
const cpuChart = initializeChart(document.getElementById('cpuChart').getContext('2d'), 'CPU Usage', 'rgba(75, 192, 192, 1)');
const netSpeedChart = initializeChart(document.getElementById('netSpeedChart').getContext('2d'), 'Network Speed', 'rgba(54, 162, 235, 1)');
const cpuSpeedChart = initializeChart(document.getElementById('cpuSpeedChart').getContext('2d'), 'CPU Speed', 'rgba(255, 159, 64, 1)');
const diskIOChart = initializeChart(document.getElementById('diskIOChart').getContext('2d'), 'Disk I/O', 'rgba(153, 102, 255, 1)');
const batteryPowerChart = initializeChart(document.getElementById('batteryPowerChart').getContext('2d'), 'Battery Power Usage', 'rgba(255, 99, 132, 1)');

const updateChart = (chart, label, data) => {
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(data);
    if (chart.data.labels.length > 20) chart.data.labels.shift();
    if (chart.data.datasets[0].data.length > 20) chart.data.datasets[0].data.shift();
    chart.update();
};

const updateStats = async () => {
    try {
        const [
            tempData, memData, diskData, sessionData, batteryData, graphicsData, cpuData,
            netData, cpuCurrentSpeed, diskIOData
        ] = await Promise.all([
            si.cpuTemperature(),
            si.mem(),
            si.fsSize(),
            si.users(),
            si.battery(),
            si.graphics(),
            si.cpu(),
            si.networkStats(),
            si.cpuCurrentSpeed(),
            si.disksIO()
        ]);
        const currentTime = new Date().toLocaleTimeString();

        // Update charts with fetched data
        updateChart(tempChart, currentTime, tempData.main !== null ? tempData.main : 0);
        updateChart(ramChart, currentTime, memData.used / (1024 * 1024));
        updateChart(storageChart, currentTime, diskData[0].used / (1024 * 1024));
        updateChart(sessionChart, currentTime, sessionData.length);
        updateChart(batteryChart, currentTime, batteryData.percent);
        updateChart(graphicsChart, currentTime, graphicsData.controllers[0].memoryUsed / (1024 * 1024));
        updateChart(cpuChart, currentTime, cpuData.speed);
        updateChart(netSpeedChart, currentTime, netData[0].tx_sec + netData[0].rx_sec);
        updateChart(cpuSpeedChart, currentTime, cpuCurrentSpeed.avg);
        updateChart(diskIOChart, currentTime, diskIOData.rIO_sec + diskIOData.wIO_sec);
        updateChart(batteryPowerChart, currentTime, batteryData.current);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
};

// Update stats every second
setInterval(updateStats, 60 * 1000); // 1 minute