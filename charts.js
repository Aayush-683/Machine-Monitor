let Chart = require('chart.js');
let si = require('systeminformation');
const wmi = require('node-wmi');

// Initialize Charts
const initializeChart = (ctx, label, borderColor, type) => new Chart(ctx, {
    type: type,
    data: {
        labels: [],
        datasets: [{
            label: label,
            data: [],
            borderColor: borderColor,
            borderWidth: 1,
            backgroundColor: borderColor.replace('1)', '0.7)') // Lighter Border Color
        }]
    },
    options: {
        responsive: true,
        resizeDelay: 100,
        elements: {
            point: {
                hoverRadius: 10,
                hitRadius: 15,
                pointStyle: 'rectRounded'
            },
            line: {
                fill: 'origin',
                tension: 0.4
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#eee',
                    usePointStyle: true,
                    pointStyle: 'rectRounded'
                }
            }
        },
        scales: {
            x: {
                display: true,
                ticks: {
                    color: '#eee'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Value',
                    color: '#eee'
                },
                ticks: {
                    color: '#eee'
                }
            }
        }
    }
});

// check if script is running in an elevated mode
require('child_process').exec("net sessions", (error, stdout, stderr) => {
    if (error || stdout.includes('Access is denied')) {
        let adminMsg = document.getElementById('adminMsg');
        adminMsg.style.display = 'block';
        console.error(adminMsg.textContent);
        return;
    }
});

const sysStats = document.getElementById('sysStats');
const tempChart = initializeChart(document.getElementById('tempChart').getContext('2d'), 'Temperature (°C)', '#264653', 'bar');
const ramChart = initializeChart(document.getElementById('ramChart').getContext('2d'), 'RAM Usage (MB)', '#2a9d8f', 'line');
const sessionChart = initializeChart(document.getElementById('sessionChart').getContext('2d'), 'Active Sessions (Users)', '#e9c46a', 'line');
const graphicsChart = initializeChart(document.getElementById('graphicsChart').getContext('2d'), 'Graphics Usage (MB)', '#f4a261', 'bar');
const netSpeedChart = initializeChart(document.getElementById('netUsageChart').getContext('2d'), 'Network Usage (MB/s)', '#e76f51', 'line');
const cpuSpeedChart = initializeChart(document.getElementById('cpuSpeedChart').getContext('2d'), 'CPU Speed (GHz)', '#d62828', 'line');
const diskIOChart = initializeChart(document.getElementById('diskIOChart').getContext('2d'), 'Disk Usage (MB/s)', '#023e8a', 'bar');
const batteryPowerChart = initializeChart(document.getElementById('batteryPowerChart').getContext('2d'), 'Battery Power Usage (V)', '#80b918', 'line');
const loadChart = initializeChart(document.getElementById('loadChart').getContext('2d'), 'Load Average (%)', '#f48c06', 'line');

const updateChart = (chart, label, data) => {
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(data);
    if (chart.data.labels.length > 10) chart.data.labels.shift();
    if (chart.data.datasets[0].data.length > 10) chart.data.datasets[0].data.shift();
    chart.update();
};

const queryDiskIO = () => {
    wmi.Query({
        class: 'Win32_PerfFormattedData_PerfDisk_LogicalDisk',
        properties: ['DiskReadBytesPerSec', 'DiskWriteBytesPerSec',
        ]
    }, (err, result) => {
        if (err) {
            console.error('Error fetching disk I/O:', err);
            return;
        }
        let diskReads = result.reduce((acc, curr) => acc + curr.DiskReadBytesPersec, 0);  
        diskReads = (diskReads / 1024 / 1024).toFixed(2); // Convert to MB/s
        let diskWrites = result.reduce((acc, curr) => acc + curr.DiskWriteBytesPersec, 0);
        diskWrites = (diskWrites / 1024 / 1024).toFixed(2); // Convert to MB/s
        diskIOChart.data.labels = ['Read', 'Write'];
        diskIOChart.data.datasets[0].data = [diskReads, diskWrites];
        diskIOChart.update();
    });
};

const updateStats = async () => {
    try {
        const [
            memData, sessionData, batteryData, graphicsData, cpuData,
            netData, cpuCurrentSpeed, loadData
        ] = await Promise.all([
            si.mem(),
            si.users(),
            si.battery(),
            si.graphics(),
            si.cpu(),
            si.networkStats('*'),
            si.cpuCurrentSpeed(),
            si.currentLoad()
        ]);
        const temps = []; // { name, temp}
        const cpuTemp = (await si.cpuTemperature()).main;
        // Remove system reserved memory
        memData.used -= memData.buffcache;
        memData.total -= memData.buffcache;

        // Make current time human readable and small for chart
        const date = new Date();
        // Remove seconds from time but keep AM/PM
        const currentTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        // Check for multiple graphics controllers
        if (graphicsData.controllers.length > 1) {
            graphicsData.controllers = graphicsData.controllers.filter(controller => controller.vendor !== 'VMware SVGA II Adapter' && controller.memoryUsed > 0);
        }

        // Handle temperature
        temps.push({ name: cpuData.manufacturer, temp: cpuTemp });
        if (graphicsData.controllers.length > 0) {
        graphicsData.controllers.forEach(controller => temps.push({ name: controller.model, temp: controller.temperatureGpu }));
        }

        // Calculate network speed
        let netspeed = netData.reduce((acc, curr) => acc + curr.rx_sec + curr.tx_sec, 0);
        netspeed = netspeed / 1024; // Convert KB/s to MB/s

        // Calculate load average
        const loadavg = loadData.currentLoad;

        // Update charts with fetched data
        // updateChart(tempChart, currentTime, tempData.main !== null ? tempData.main : 0);
        updateChart(ramChart, currentTime, memData.used / (1024 * 1024));
        updateChart(sessionChart, currentTime, sessionData.length);
        updateChart(netSpeedChart, currentTime, netspeed);
        updateChart(cpuSpeedChart, currentTime, cpuCurrentSpeed.avg);
        updateChart(batteryPowerChart, currentTime, batteryData.voltage);
        updateChart(loadChart, currentTime, loadavg);

        // Handle charts with multiple controllers
        // Handle temperature
        tempChart.data.labels = temps.map(temp => temp.name);
        tempChart.data.datasets[0].data = temps.map(temp => temp.temp);
        tempChart.update();
        // Handle graphics
        graphicsChart.data.labels = graphicsData.controllers.map(controller => controller.model);
        graphicsChart.data.datasets[0].data = graphicsData.controllers.map(controller => {
            if (controller.memoryUsed > 0) {
                return controller.memoryUsed
            } else {
                return controller.vram
            }
        });
        graphicsChart.update();
        // Handle disk IO
        // diskIOChart.data.labels = diskIOData.map(disk => disk.fs);
        // diskIOChart.data.datasets[0].data = diskIOData.map(disk => (disk.used / (1024 * 1024 * 1024)).toFixed(2)); // Convert to GB
        // diskIOChart.update();

        sysStats.textContent = `System Stats [${currentTime}]`;

    } catch (error) {
        console.error('Error fetching stats:', error);
    }
};

setInterval(() => {
    updateStats();
    queryDiskIO();
}, 5300); // 5000 milliseconds = 5.3 seconds
