// server.js - Professional Haas Backend V2
// Model-specific dashboards + Real alarm monitoring
// Ready for Render deployment

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const HaasMachine = require('./HaasMachine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// ========================================
// MACHINE FLEET INITIALIZATION
// Based on your actual machines
// ========================================

const machines = {
  haas_vf2: new HaasMachine(
    'haas_vf2',
    'Haas VF-2',
    'VF-2',
    'CNC_MILL',
    {
      axisLimits: { X: [0, 762], Y: [0, 406], Z: [0, 508] },
      spindlePower: 30,
      maxRPM: 8100,
      rapidTraverse: 1000,
      toolCapacity: 24
    }
  ),
  
  haas_vf4: new HaasMachine(
    'haas_vf4',
    'Haas VF-4',
    'VF-4',
    'CNC_MILL',
    {
      axisLimits: { X: [0, 1270], Y: [0, 508], Z: [0, 635] },
      spindlePower: 30,
      maxRPM: 8100,
      rapidTraverse: 1000,
      toolCapacity: 24
    }
  ),
  
  toyoda_hmc: new HaasMachine(
    'toyoda_hmc',
    'Toyoda HMC',
    'HMC',
    'CNC_MILL',
    {
      axisLimits: { X: [0, 800], Y: [0, 700], Z: [0, 600] },
      spindlePower: 40,
      maxRPM: 12000,
      rapidTraverse: 1200,
      toolCapacity: 40
    }
  ),
  
  cnc_lathe: new HaasMachine(
    'cnc_lathe',
    'CNC Lathe',
    'LATHE',
    'LATHE',
    {
      axisLimits: { X: [0, 300], Y: [0, 200], Z: [0, 500] },
      spindlePower: 20,
      maxRPM: 4000,
      rapidTraverse: 800,
      toolCapacity: 12
    }
  ),
  
  durma_press: new HaasMachine(
    'durma_press',
    'Durma Press Brake',
    'PRESS',
    'PRESS_BRAKE',
    {
      axisLimits: { X: [0, 100], Y: [0, 2000], Z: [0, 300] },
      maxTonnage: 200
    }
  ),
  
  fiber_laser: new HaasMachine(
    'fiber_laser',
    'Fiber Laser',
    'LASER',
    'LASER',
    {
      axisLimits: { X: [0, 1500], Y: [0, 3000], Z: [0, 100] },
      maxLaserPower: 6000
    }
  )
};

// Set initial materials
machines.haas_vf2.material = 'Aluminum 6061';
machines.haas_vf2.programRunning = 'O1234';
machines.haas_vf4.material = 'Steel 4140';
machines.toyoda_hmc.material = 'Stainless 316';
machines.cnc_lathe.material = 'Brass C360';

// ========================================
// SIMULATION LOOP
// ========================================

const SIM_UPDATE_PERIOD_MS = 2000; // 2 seconds

setInterval(() => {
  const dtSec = SIM_UPDATE_PERIOD_MS / 1000.0;
  
  Object.values(machines).forEach(machine => {
    machine.update(dtSec);
  });
  
  // Broadcast to WebSocket clients
  const plantData = {
    type: 'PLANT_UPDATE',
    timestamp: new Date().toISOString(),
    machines: Object.values(machines).map(m => m.toJSON())
  };
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(plantData));
    }
  });
}, SIM_UPDATE_PERIOD_MS);

// ========================================
// API ROUTES
// ========================================

// Root - API Info
app.get('/', (req, res) => {
  res.json({
    name: 'Haas CNC Fleet Monitor API - V2',
    version: '2.0.0',
    description: 'Professional monitoring with model-specific dashboards and real Haas alarms',
    endpoints: {
      machines: {
        'GET /api/machines': 'List all machines',
        'GET /api/machines/:id': 'Get specific machine',
        'GET /api/machines/:id/dashboard': 'Model-specific dashboard data',
        'POST /api/machines/:id/power': 'Toggle power',
        'POST /api/machines/:id/alarm': 'Inject alarm (testing)',
        'DELETE /api/machines/:id/alarm': 'Clear alarm'
      },
      plant: {
        'GET /api/plant/status': 'Overall plant status',
        'GET /api/plant/alarms': 'Active alarms',
        'GET /api/plant/production': 'Production summary',
        'GET /api/plant/health': 'Fleet health metrics'
      },
      analytics: {
        'GET /api/analytics/uptime': 'Uptime statistics',
        'GET /api/analytics/alarms': 'Alarm frequency analysis'
      }
    },
    websocket: 'ws://[host]/ws for real-time updates',
    fleet: {
      total: Object.keys(machines).length,
      models: Object.values(machines).map(m => ({ id: m.id, model: m.model, type: m.type }))
    }
  });
});

// ========================================
// MACHINE ENDPOINTS
// ========================================

// List all machines
app.get('/api/machines', (req, res) => {
  const machineList = Object.values(machines).map(m => m.toJSON());
  res.json(machineList);
});

// Get specific machine
app.get('/api/machines/:id', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  res.json(machine.toJSON());
});

// Model-specific dashboard data
app.get('/api/machines/:id/dashboard', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const data = machine.toJSON();
  
  // Create model-specific dashboard layout
  const dashboard = {
    machine: {
      id: data.id,
      name: data.name,
      model: data.model,
      type: data.type
    },
    status: {
      power: data.power,
      execution: data.execution,
      cyclePhase: data.cyclePhase,
      alarm: data.alarm,
      alarmCode: data.alarmCode
    },
    critical: {},
    performance: {
      partCount: data.partCount,
      totalCycles: data.totalCycles,
      machineOnHours: data.machineOnHours,
      productionRate: data.productionRate
    },
    health: {
      batteryVoltage: data.batteryVoltage,
      temperature: data.temperature,
      vibration: data.vibration,
      oilPressure: data.oilPressure,
      oilLevel: data.oilLevel
    },
    warnings: data.warnings,
    recentAlarms: data.alarmHistory
  };
  
  // Model-specific critical data
  if (data.type === 'CNC_MILL' || data.type === 'LATHE') {
    dashboard.critical = {
      spindleSpeed: data.spindleSpeed,
      spindleLoad: data.spindleLoad,
      spindleTemp: data.spindleTemp,
      feedRate: data.feedRate,
      coolantLevel: data.coolant?.level,
      coolantPressure: data.coolant?.pressure,
      currentTool: data.currentTool,
      toolLife: data.tools?.[data.currentTool - 1]?.currentLife,
      servoLoad: data.servoLoad,
      servoFollowingError: data.servoFollowingError
    };
  } else if (data.type === 'PRESS_BRAKE') {
    dashboard.critical = {
      tonnage: data.tonnage,
      maxTonnage: data.maxTonnage,
      ramPosition: data.ramPosition,
      bendAngle: data.bendAngle
    };
  } else if (data.type === 'LASER') {
    dashboard.critical = {
      laserPower: data.laserPower,
      maxLaserPower: data.maxLaserPower,
      gasPressure: data.gasPressure,
      resonatorTemp: data.resonatorTemp,
      cutSpeed: data.cutSpeed
    };
  }
  
  res.json(dashboard);
});

// Toggle power
app.post('/api/machines/:id/power', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const { power } = req.body;
  if (typeof power !== 'boolean') {
    return res.status(400).json({ error: 'Invalid power state' });
  }
  
  machine.setPower(power);
  
  res.json({
    success: true,
    machine: req.params.id,
    power: power
  });
});

// Inject alarm (testing)
app.post('/api/machines/:id/alarm', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const { code, message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Alarm message required' });
  }
  
  machine.injectAlarm(code || null, message);
  
  res.json({
    success: true,
    machine: req.params.id,
    alarm: { code, message }
  });
});

// Clear alarm
app.delete('/api/machines/:id/alarm', (req, res) => {
  const machine = machines[req.params.id];
  if (!machine) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  machine.clearAlarm();
  
  res.json({
    success: true,
    machine: req.params.id,
    message: 'Alarm cleared'
  });
});

// ========================================
// PLANT ENDPOINTS
// ========================================

// Overall plant status
app.get('/api/plant/status', (req, res) => {
  const machineList = Object.values(machines);
  
  const status = {
    total: machineList.length,
    running: machineList.filter(m => m.execution === 'RUNNING').length,
    idle: machineList.filter(m => m.execution === 'IDLE').length,
    alarm: machineList.filter(m => m.execution === 'ALARM').length,
    stopped: machineList.filter(m => !m.power).length,
    totalParts: machineList.reduce((sum, m) => sum + m.partCount, 0),
    totalCycles: machineList.reduce((sum, m) => sum + m.totalCycles, 0),
    avgProductionRate: Math.round(
      machineList.reduce((sum, m) => sum + m.productionRate, 0) / machineList.length
    ),
    timestamp: new Date().toISOString()
  };
  
  res.json(status);
});

// Active alarms
app.get('/api/plant/alarms', (req, res) => {
  const alarms = [];
  
  Object.values(machines).forEach(machine => {
    if (machine.alarm) {
      alarms.push({
        machineId: machine.id,
        machineName: machine.name,
        model: machine.model,
        alarmCode: machine.alarmCode,
        alarm: machine.alarm,
        execution: machine.execution,
        timestamp: machine.timestamp
      });
    }
  });
  
  res.json({
    count: alarms.length,
    alarms: alarms
  });
});

// Production summary
app.get('/api/plant/production', (req, res) => {
  const machineList = Object.values(machines);
  
  const production = machineList.map(m => ({
    id: m.id,
    name: m.name,
    model: m.model,
    partCount: m.partCount,
    totalCycles: m.totalCycles,
    productionRate: m.productionRate,
    machineOnHours: parseFloat(m.machineOnHours.toFixed(2)),
    execution: m.execution
  }));
  
  res.json({
    machines: production,
    totals: {
      parts: machineList.reduce((sum, m) => sum + m.partCount, 0),
      cycles: machineList.reduce((sum, m) => sum + m.totalCycles, 0),
      hours: parseFloat(
        machineList.reduce((sum, m) => sum + m.machineOnHours, 0).toFixed(2)
      )
    }
  });
});

// Fleet health metrics
app.get('/api/plant/health', (req, res) => {
  const machineList = Object.values(machines);
  
  const health = {
    batteryWarnings: machineList.filter(m => m.batteryVoltage < 3.2).length,
    temperatureWarnings: machineList.filter(m => m.temperature > 100).length,
    coolantWarnings: machineList.filter(m => m.coolant && m.coolant.level < 20).length,
    toolWarnings: machineList.filter(m => {
      if (!m.tools || !m.currentTool) return false;
      const tool = m.tools[m.currentTool - 1];
      return tool && tool.currentLife < 15;
    }).length,
    avgBatteryVoltage: parseFloat(
      (machineList.reduce((sum, m) => sum + m.batteryVoltage, 0) / machineList.length).toFixed(2)
    ),
    avgTemperature: Math.round(
      machineList.reduce((sum, m) => sum + m.temperature, 0) / machineList.length
    ),
    machines: machineList.map(m => ({
      id: m.id,
      name: m.name,
      warnings: m.warnings
    }))
  };
  
  res.json(health);
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

// Uptime statistics
app.get('/api/analytics/uptime', (req, res) => {
  const machineList = Object.values(machines);
  
  const analytics = machineList.map(m => {
    const uptime = m.power ? (m.execution === 'RUNNING' ? 100 : 50) : 0;
    
    return {
      id: m.id,
      name: m.name,
      model: m.model,
      uptime: uptime,
      machineOnHours: parseFloat(m.machineOnHours.toFixed(2)),
      spindleHours: parseFloat(m.spindleHours.toFixed(2)),
      utilizationRate: m.machineOnHours > 0 
        ? Math.round((m.spindleHours / m.machineOnHours) * 100) 
        : 0
    };
  });
  
  res.json({
    machines: analytics,
    fleetAvgUptime: Math.round(
      analytics.reduce((sum, a) => sum + a.uptime, 0) / analytics.length
    )
  });
});

// Alarm frequency analysis
app.get('/api/analytics/alarms', (req, res) => {
  const alarmStats = {};
  
  Object.values(machines).forEach(machine => {
    machine.alarmHistory.forEach(alarm => {
      const key = alarm.message || 'UNKNOWN';
      if (!alarmStats[key]) {
        alarmStats[key] = {
          message: key,
          code: alarm.code,
          count: 0,
          machines: new Set()
        };
      }
      alarmStats[key].count++;
      alarmStats[key].machines.add(machine.name);
    });
  });
  
  const sortedAlarms = Object.values(alarmStats)
    .map(stat => ({
      message: stat.message,
      code: stat.code,
      count: stat.count,
      machines: Array.from(stat.machines)
    }))
    .sort((a, b) => b.count - a.count);
  
  res.json({
    totalAlarms: sortedAlarms.reduce((sum, a) => sum + a.count, 0),
    uniqueAlarmTypes: sortedAlarms.length,
    topAlarms: sortedAlarms.slice(0, 10)
  });
});

// ========================================
// WEBSOCKET
// ========================================

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  
  // Send current state immediately
  ws.send(JSON.stringify({
    type: 'PLANT_UPDATE',
    timestamp: new Date().toISOString(),
    machines: Object.values(machines).map(m => m.toJSON())
  }));
  
  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🏭  HAAS CNC FLEET MONITOR - V2.0');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('');
  console.log('🤖 Fleet:');
  Object.values(machines).forEach(m => {
    console.log(`   - ${m.name} (${m.model}) - ${m.type}`);
  });
  console.log('='.repeat(60));
});
