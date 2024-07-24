let Chart = require('chart.js');
let si = require('systeminformation');

// Initialize Charts
const initializeChart = (ctx, label, borderColor, type) => new Chart(ctx, {
    default: {
        color: '#eee'
    },
    options: {
        responsive: true,
        resizeDelay: 100,
        elements: {
            point: {
                hoverRadius: 7,
                hitRadius: 10,
                pointStyle: 'crossRot',
            },
            line: {
                fill: 'origin',
                tension: 0.4,
            }
        },
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                color: '#eee',
                usePointStyle: true,
                pointStyle: 'crossRot'
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: label
                }
            }
        }
    },
    type: type,
    data: {
        labels: [],
        datasets: [{
            label,
            data: [],
            borderColor,
            borderWidth: 1,
             // Lighter Border Color
            backgroundColor: borderColor.replace('1)', '0.7)'),  
        }],
    }
});

const sysStats = document.getElementById('sysStats');
const tempChart = initializeChart(document.getElementById('tempChart').getContext('2d'), 'Temperature (°C)', 'rgba(255, 99, 132, 1)', 'bar');
const ramChart = initializeChart(document.getElementById('ramChart').getContext('2d'), 'RAM Usage (MB)', 'rgba(54, 162, 235, 1)', 'line');
const sessionChart = initializeChart(document.getElementById('sessionChart').getContext('2d'), 'Active Sessions (Users)', 'rgba(153, 102, 255, 1)', 'line');
const graphicsChart = initializeChart(document.getElementById('graphicsChart').getContext('2d'), 'Graphics Usage (MB)', 'rgba(255, 159, 64, 1)', 'bar');
const netSpeedChart = initializeChart(document.getElementById('netSpeedChart').getContext('2d'), 'Network Speed (MB/s)', 'rgba(54, 162, 235, 1)', 'line');
const cpuSpeedChart = initializeChart(document.getElementById('cpuSpeedChart').getContext('2d'), 'CPU Speed (GHz)', 'rgba(255, 159, 64, 1)', 'line');
const diskIOChart = initializeChart(document.getElementById('diskIOChart').getContext('2d'), 'Disk Used (GB)', 'rgba(153, 102, 255, 1)', 'bar');
const batteryPowerChart = initializeChart(document.getElementById('batteryPowerChart').getContext('2d'), 'Battery Power Usage (V)', 'rgba(255, 99, 132, 1)', 'line');

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
            memData, sessionData, batteryData, graphicsData, cpuData,
            netData, cpuCurrentSpeed, diskIOData
        ] = await Promise.all([
            si.mem(),
            si.users(),
            si.battery(),
            si.graphics(),
            si.cpu(),
            si.networkStats(),
            si.cpuCurrentSpeed(),
            si.fsSize()
        ]);
        const temps = []; // { name, temp}
        const cpuTemp = (await si.cpuTemperature()).main;
        const currentTime = new Date().toLocaleTimeString();
        
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
        netspeed = netspeed / 1024 / 1024; // Convert to MB/s

        // Update charts with fetched data
        // updateChart(tempChart, currentTime, tempData.main !== null ? tempData.main : 0);
        updateChart(ramChart, currentTime, memData.used / (1024 * 1024));
        updateChart(sessionChart, currentTime, sessionData.length);
        updateChart(netSpeedChart, currentTime, netspeed);
        updateChart(cpuSpeedChart, currentTime, cpuCurrentSpeed.avg);
        updateChart(batteryPowerChart, currentTime, batteryData.voltage);

        // Handle charts with multiple controllers
        // Handle temperature
        tempChart.data.labels = temps.map(temp => temp.name);
        tempChart.data.datasets[0].data = temps.map(temp => temp.temp);
        tempChart.update();
        // Handle graphics
        graphicsChart.data.labels = graphicsData.controllers.map(controller => controller.model);
        graphicsChart.data.datasets[0].data = graphicsData.controllers.map(controller => controller.memoryUsed);
        graphicsChart.update();
        // Handle disk IO
        diskIOChart.data.labels = diskIOData.map(disk => disk.fs);
        diskIOChart.data.datasets[0].data = diskIOData.map(disk => (disk.used / (1024 * 1024 * 1024)).toFixed(2)); // Convert to GB
        diskIOChart.update();

        sysStats.textContent = `System Stats [${currentTime}]`;
        
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
};

updateStats();
// Update stats every second
setInterval(updateStats, 5 * 1000); // 5 seconds