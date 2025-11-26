// HaasMachine.js - Professional V2
// Real Haas alarm codes + Model-specific dashboards
// Based on actual Haas troubleshooting data

class HaasMachine {
  constructor(id, name, model, type, specs = {}) {
    this.id = id;
    this.name = name;
    this.model = model; // "VF-2", "VF-4", "HMC", "LATHE", "PRESS", "LASER"
    this.type = type;   // "CNC_MILL", "LATHE", "PRESS_BRAKE", "LASER"
    
    // Machine Specifications
    this.specs = {
      axisLimits: specs.axisLimits || { X: [0, 762], Y: [0, 406], Z: [0, 508] },
      spindlePower: specs.spindlePower || 30, // HP
      maxRPM: specs.maxRPM || 8100,
      rapidTraverse: specs.rapidTraverse || 1000, // ipm
      toolCapacity: specs.toolCapacity || 24
    };
    
    // === CORE STATE ===
    this.power = true;
    this.execution = 'IDLE'; // IDLE, RUNNING, ALARM, STOPPED
    this.cyclePhase = 'IDLE'; // IDLE, SPINDLE_RAMP, RAPID, CUTTING, RETRACT, DWELL, FINISH
    this.timeInPhase = 0.0;
    this.cycleTimeTarget = 20 + Math.random() * 25;
    
    // === CRITICAL ALARMS (Real Haas Codes) ===
    this.alarm = null;
    this.alarmCode = null;
    this.alarmHistory = [];
    this.warnings = [];
    
    // === SPINDLE DATA (Critical Monitoring) ===
    this.spindleSpeed = 0;
    this.targetSpindleSpeed = 0;
    this.spindleLoad = 0.0;
    this.spindleTemp = 25.0;
    this.spindleHours = 0.0;
    this.spindleOrientation = 0; // degrees
    
    // === FEED & MOTION ===
    this.feedRate = 0;
    this.targetFeed = 0;
    this.rapidRate = 0;
    this.axisPositions = {
      X: (this.specs.axisLimits.X[0] + this.specs.axisLimits.X[1]) / 2,
      Y: (this.specs.axisLimits.Y[0] + this.specs.axisLimits.Y[1]) / 2,
      Z: this.specs.axisLimits.Z[1] // Safe Z height
    };
    
    // === SERVO MONITORING (Haas Critical Issue) ===
    this.servoLoad = { X: 0, Y: 0, Z: 0 };
    this.servoFollowingError = { X: 0, Y: 0, Z: 0 }; // Alarm 103-105
    this.servoTemp = { X: 25, Y: 25, Z: 25 };
    
    // === PRODUCTION METRICS ===
    this.partCount = 0;
    this.totalCycles = 0;
    this.machineOnHours = 0.0;
    this.productionRate = 0; // parts/hour
    
    // === HEALTH MONITORING (Haas Common Issues) ===
    this.batteryVoltage = 3.6; // Alarm 9100: LOW BATTERY
    this.temperature = 72;
    this.vibration = 0.0;
    this.currentAmps = 7.0;
    this.oilPressure = 50; // PSI
    this.oilLevel = 100; // %
    
    // === TOOL MANAGEMENT (CNC/LATHE only) ===
    if (type === 'CNC_MILL' || type === 'LATHE') {
      this.currentTool = 1;
      this.tools = this._initializeTools();
      this.toolChangeCount = 0;
      this.toolWear = 0.0;
      
      // Coolant System (Alarm 115: COOLANT PUMP FAULT)
      this.coolant = {
        level: 100,
        pressure: 50,
        temperature: 72,
        flow: 0
      };
    }
    
    // === PRESS BRAKE SPECIFIC ===
    if (type === 'PRESS_BRAKE') {
      this.tonnage = 0;
      this.maxTonnage = specs.maxTonnage || 200;
      this.ramPosition = 0;
      this.backGauge = 0;
      this.bendAngle = 0;
    }
    
    // === LASER SPECIFIC ===
    if (type === 'LASER') {
      this.laserPower = 0;
      this.maxLaserPower = specs.maxLaserPower || 6000; // Watts
      this.gasPressure = 240; // PSI
      this.resonatorTemp = 26;
      this.cutSpeed = 0;
    }
    
    this.material = null;
    this.programRunning = null;
    this.timestamp = new Date();
  }

  // ========================================
  // TOOL INITIALIZATION
  // ========================================
  
  _initializeTools() {
    const tools = [];
    const count = this.type === 'CNC_MILL' ? this.specs.toolCapacity : 12;
    const toolTypes = ['DRILL', 'END_MILL', 'FACE_MILL', 'REAMER', 'TAP', 'BORING_BAR'];
    
    for (let i = 1; i <= count; i++) {
      tools.push({
        number: i,
        type: toolTypes[Math.floor(Math.random() * toolTypes.length)],
        diameter: (Math.random() * 20 + 2).toFixed(2),
        length: (Math.random() * 100 + 50).toFixed(2),
        currentLife: 100 - Math.random() * 80,
        maxLife: 100,
        flutes: Math.floor(Math.random() * 4) + 2,
        coating: ['TiN', 'TiCN', 'AlTiN', 'Uncoated'][Math.floor(Math.random() * 4)],
        description: `Tool ${i}`,
        inUse: false,
        totalCuts: 0
      });
    }
    return tools;
  }

  // ========================================
  // MAIN UPDATE LOOP
  // ========================================
  
  update(dtSec) {
    this.timestamp = new Date();
    
    if (!this.power) {
      this.execution = 'STOPPED';
      this.cyclePhase = 'IDLE';
      this.spindleSpeed = 0;
      this.spindleLoad = 0;
      this.feedRate = 0;
      return;
    }
    
    this.machineOnHours += dtSec / 3600.0;
    this.timeInPhase += dtSec;
    
    // Check for alarms first
    if (this.alarm) {
      this.execution = 'ALARM';
      this.cyclePhase = 'IDLE';
      this.spindleSpeed = Math.max(0, this.spindleSpeed - 500 * dtSec);
      this.feedRate = 0;
      
      // Auto-recovery (2% chance)
      if (Math.random() < 0.02) {
        this._clearAlarm();
      }
      return;
    }
    
    // Update based on machine type
    if (this.type === 'CNC_MILL' || this.type === 'LATHE') {
      this._updateCNCCycle(dtSec);
    } else if (this.type === 'PRESS_BRAKE') {
      this._updatePressCycle(dtSec);
    } else if (this.type === 'LASER') {
      this._updateLaserCycle(dtSec);
    }
    
    // Update health sensors
    this._updateHealthSensors(dtSec);
    
    // Check for new alarms
    this._checkAlarms();
    
    // Update warnings
    this._updateWarnings();
  }

  // ========================================
  // CNC REALISTIC CYCLE
  // ========================================
  
  _updateCNCCycle(dtSec) {
    switch (this.cyclePhase) {
      case 'IDLE':
        this._phaseIdle(dtSec);
        break;
      case 'SPINDLE_RAMP':
        this._phaseSpindleRamp(dtSec);
        break;
      case 'RAPID':
        this._phaseRapid(dtSec);
        break;
      case 'CUTTING':
        this._phaseCutting(dtSec);
        break;
      case 'RETRACT':
        this._phaseRetract(dtSec);
        break;
      case 'DWELL':
        this._phaseDwell(dtSec);
        break;
      case 'FINISH':
        this._phaseFinish(dtSec);
        break;
    }
  }

  _phaseIdle(dtSec) {
    this.execution = 'IDLE';
    
    // Natural deceleration
    this.spindleSpeed = Math.max(0, this.spindleSpeed - 500 * dtSec);
    this.feedRate = Math.max(0, this.feedRate - 500 * dtSec);
    this.spindleLoad = Math.max(0, this.spindleLoad - 5 * dtSec);
    
    // Coolant recovery
    if (this.coolant) {
      this.coolant.level = Math.min(100, this.coolant.level + 0.1);
      this.coolant.flow = 0;
    }
    
    // Start new cycle (5% chance)
    if (Math.random() < 0.05) {
      this._startNewCycle();
    }
  }

  _startNewCycle() {
    this.cyclePhase = 'SPINDLE_RAMP';
    this.execution = 'RUNNING';
    this.timeInPhase = 0;
    this.cycleTimeTarget = 20 + Math.random() * 25;
    this.targetSpindleSpeed = 3000 + Math.random() * (this.specs.maxRPM - 3000);
    this.targetFeed = 300 + Math.random() * 1500;
    
    if (!this.programRunning) {
      this.programRunning = `O${Math.floor(Math.random() * 9000 + 1000)}`;
    }
  }

  _phaseSpindleRamp(dtSec) {
    this.execution = 'RUNNING';
    const ramp = 350 * dtSec;
    
    if (this.spindleSpeed < this.targetSpindleSpeed) {
      this.spindleSpeed += ramp;
      if (this.spindleSpeed >= this.targetSpindleSpeed) {
        this.spindleSpeed = this.targetSpindleSpeed;
        this.cyclePhase = 'RAPID';
        this.timeInPhase = 0;
      }
    }
    
    this.spindleLoad = Math.min(20, (this.spindleSpeed / this.targetSpindleSpeed) * 15);
    this.spindleOrientation = (this.spindleOrientation + this.spindleSpeed * dtSec / 60) % 360;
  }

  _phaseRapid(dtSec) {
    this.execution = 'RUNNING';
    
    // G0: Rapid to random position
    const limits = this.specs.axisLimits;
    this.axisPositions.X = limits.X[0] + Math.random() * (limits.X[1] - limits.X[0]);
    this.axisPositions.Y = limits.Y[0] + Math.random() * (limits.Y[1] - limits.Y[0]);
    this.axisPositions.Z = limits.Z[1]; // Safe Z
    
    this.rapidRate = this.specs.rapidTraverse;
    this.feedRate = 0;
    this.spindleLoad = 5 + Math.random() * 5;
    
    if (this.timeInPhase >= 3.0) {
      this.cyclePhase = 'CUTTING';
      this.timeInPhase = 0;
    }
  }

  _phaseCutting(dtSec) {
    this.execution = 'RUNNING';
    
    // Feed ramp-up
    const ramp = 200 * dtSec;
    if (this.feedRate < this.targetFeed) {
      this.feedRate += ramp;
      if (this.feedRate > this.targetFeed) {
        this.feedRate = this.targetFeed;
      }
    }
    
    // Z descent (cutting)
    const limits = this.specs.axisLimits;
    this.axisPositions.Z -= 1.0 * dtSec * (this.feedRate / Math.max(this.targetFeed, 1));
    if (this.axisPositions.Z < limits.Z[0] + 5) {
      this.axisPositions.Z = limits.Z[0] + 5;
    }
    
    // Realistic spindle load
    const baseLoad = (this.feedRate / 1800.0) * 35.0;
    const wearLoad = this.toolWear * 50.0;
    const vibLoad = this.vibration * 8.0;
    const noise = Math.random() * 4.5 - 2.0;
    
    this.spindleLoad = Math.max(0, Math.min(100, baseLoad + wearLoad + vibLoad + noise));
    
    // Tool wear
    this.toolWear += this.spindleLoad / 250000.0;
    if (this.toolWear > 1.0) this.toolWear = 1.0;
    
    this.vibration = this.toolWear * 3.0 + Math.random() * 0.4;
    
    // Spindle hours
    if (this.spindleSpeed > 300) {
      this.spindleHours += dtSec / 3600.0;
    }
    
    // Update current tool
    if (this.tools && this.currentTool) {
      const tool = this.tools[this.currentTool - 1];
      if (tool) {
        tool.currentLife = Math.max(0, tool.currentLife - Math.random() * 0.02);
        tool.inUse = true;
        tool.totalCuts++;
      }
    }
    
    // Coolant consumption
    if (this.coolant) {
      this.coolant.level = Math.max(0, this.coolant.level - Math.random() * 0.08);
      this.coolant.pressure = 45 + Math.random() * 15;
      this.coolant.temperature = 72 + Math.random() * 15;
      this.coolant.flow = 5 + Math.random() * 3;
    }
    
    // Servo loads (realistic)
    this.servoLoad.X = 20 + Math.random() * 30;
    this.servoLoad.Y = 20 + Math.random() * 30;
    this.servoLoad.Z = 30 + this.spindleLoad * 0.5;
    
    // Following error simulation
    this.servoFollowingError.X = Math.random() * 0.002;
    this.servoFollowingError.Y = Math.random() * 0.002;
    this.servoFollowingError.Z = Math.random() * 0.003;
    
    // Cycle completion
    if (this.timeInPhase >= this.cycleTimeTarget * 0.6) {
      this.cyclePhase = 'RETRACT';
      this.timeInPhase = 0;
    }
  }

  _phaseRetract(dtSec) {
    this.execution = 'RUNNING';
    
    const limits = this.specs.axisLimits;
    this.axisPositions.Z += 4.0 * dtSec;
    
    if (this.axisPositions.Z >= limits.Z[1] - 10) {
      this.axisPositions.Z = limits.Z[1] - 10;
      this.cyclePhase = 'DWELL';
      this.timeInPhase = 0;
    }
    
    this.spindleLoad = Math.max(5, this.spindleLoad - 10 * dtSec);
    this.feedRate = Math.max(0, this.feedRate - 300 * dtSec);
  }

  _phaseDwell(dtSec) {
    this.execution = 'RUNNING';
    this.feedRate = 0;
    this.spindleLoad = Math.max(0, this.spindleLoad - 5 * dtSec);
    
    if (this.timeInPhase >= 2.0) {
      this.cyclePhase = 'FINISH';
      this.timeInPhase = 0;
    }
  }

  _phaseFinish(dtSec) {
    this.execution = 'RUNNING';
    this.partCount++;
    this.totalCycles++;
    
    this.spindleLoad *= 0.7;
    this.feedRate = 0;
    
    if (this.tools && this.currentTool) {
      const tool = this.tools[this.currentTool - 1];
      if (tool) tool.inUse = false;
    }
    
    // Calculate production rate
    if (this.machineOnHours > 0) {
      this.productionRate = Math.round(this.partCount / this.machineOnHours);
    }
    
    this.cyclePhase = 'IDLE';
    this.timeInPhase = 0;
  }

  // ========================================
  // PRESS BRAKE CYCLE
  // ========================================
  
  _updatePressCycle(dtSec) {
    if (this.cyclePhase === 'IDLE' && Math.random() < 0.05) {
      this.cyclePhase = 'RUNNING';
      this.execution = 'RUNNING';
      this.timeInPhase = 0;
      this.bendAngle = 45 + Math.random() * 90;
    }
    
    if (this.cyclePhase === 'RUNNING') {
      this.execution = 'RUNNING';
      
      // Ram descends
      this.ramPosition = Math.min(100, this.ramPosition + 20 * dtSec);
      
      // Tonnage increases
      this.tonnage = (this.ramPosition / 100) * (this.maxTonnage * 0.8);
      this.spindleLoad = (this.tonnage / this.maxTonnage) * 100;
      
      // Servo load
      this.servoLoad.Y = this.tonnage / this.maxTonnage * 80;
      
      if (this.timeInPhase >= 5.0) {
        this.partCount++;
        this.totalCycles++;
        this.ramPosition = 0;
        this.tonnage = 0;
        this.cyclePhase = 'IDLE';
        this.execution = 'IDLE';
        this.timeInPhase = 0;
      }
    } else {
      this.execution = 'IDLE';
      this.spindleLoad = 0;
      this.tonnage = 0;
    }
  }

  // ========================================
  // LASER CYCLE
  // ========================================
  
  _updateLaserCycle(dtSec) {
    if (this.cyclePhase === 'IDLE' && Math.random() < 0.07) {
      this.cyclePhase = 'RUNNING';
      this.execution = 'RUNNING';
      this.timeInPhase = 0;
      this.laserPower = 2000 + Math.random() * (this.maxLaserPower - 2000);
      this.targetFeed = 800 + Math.random() * 2200;
    }
    
    if (this.cyclePhase === 'RUNNING') {
      this.execution = 'RUNNING';
      
      // Power ramp
      this.spindleLoad = (this.laserPower / this.maxLaserPower) * 100;
      
      // Feed ramp
      if (this.cutSpeed < this.targetFeed) {
        this.cutSpeed += 300 * dtSec;
        if (this.cutSpeed > this.targetFeed) this.cutSpeed = this.targetFeed;
      }
      
      this.feedRate = this.cutSpeed;
      
      // XY movement
      this.axisPositions.X += Math.random() * 10 - 5;
      this.axisPositions.Y += Math.random() * 10 - 5;
      
      // Temperature
      this.resonatorTemp += (this.laserPower / this.maxLaserPower) * 0.4;
      
      if (this.timeInPhase >= 8.0) {
        this.partCount++;
        this.totalCycles++;
        this.cyclePhase = 'IDLE';
        this.execution = 'IDLE';
        this.timeInPhase = 0;
        this.cutSpeed = 0;
        this.feedRate = 0;
      }
    } else {
      this.execution = 'IDLE';
      this.spindleLoad = 0;
      this.cutSpeed = 0;
      this.feedRate = 0;
      this.resonatorTemp = Math.max(26, this.resonatorTemp - 0.05);
    }
  }

  // ========================================
  // HEALTH SENSORS
  // ========================================
  
  _updateHealthSensors(dtSec) {
    // Temperature
    if (this.execution === 'RUNNING') {
      this.temperature = Math.min(120, this.temperature + (this.spindleLoad / 100.0) * 0.3);
      this.spindleTemp = Math.min(95, this.spindleTemp + (this.spindleLoad / 100.0) * 0.15);
      this.currentAmps = 7 + (this.spindleLoad / 100.0) * 8;
    } else {
      this.temperature = Math.max(72, this.temperature - 0.2);
      this.spindleTemp = Math.max(25, this.spindleTemp - 0.03);
      this.currentAmps = Math.max(7, this.currentAmps - 0.5);
    }
    
    // Battery drain (very slow)
    this.batteryVoltage -= 0.0001 * dtSec;
    if (this.batteryVoltage < 2.8) this.batteryVoltage = 2.8;
    
    // Oil system
    this.oilPressure = 45 + Math.random() * 10;
    this.oilLevel = Math.max(20, this.oilLevel - 0.001);
    
    // Servo temperatures
    if (this.execution === 'RUNNING') {
      this.servoTemp.X = Math.min(65, this.servoTemp.X + 0.1);
      this.servoTemp.Y = Math.min(65, this.servoTemp.Y + 0.1);
      this.servoTemp.Z = Math.min(65, this.servoTemp.Z + 0.1);
    } else {
      this.servoTemp.X = Math.max(25, this.servoTemp.X - 0.05);
      this.servoTemp.Y = Math.max(25, this.servoTemp.Y - 0.05);
      this.servoTemp.Z = Math.max(25, this.servoTemp.Z - 0.05);
    }
  }

  // ========================================
  // ALARM SYSTEM (Real Haas Codes)
  // ========================================
  
  _checkAlarms() {
    if (this.type === 'CNC_MILL' || this.type === 'LATHE') {
      // Alarm 103-105: AXIS FOLLOWING ERROR
      if (this.servoFollowingError.X > 0.005 && Math.random() < 0.02) {
        this._setAlarm(103, 'X AXIS FOLLOWING ERROR');
      }
      else if (this.servoFollowingError.Y > 0.005 && Math.random() < 0.02) {
        this._setAlarm(104, 'Y AXIS FOLLOWING ERROR');
      }
      else if (this.servoFollowingError.Z > 0.005 && Math.random() < 0.02) {
        this._setAlarm(105, 'Z AXIS FOLLOWING ERROR');
      }
      
      // Alarm 9100: LOW BATTERY
      else if (this.batteryVoltage < 3.0 && Math.random() < 0.05) {
        this._setAlarm(9100, 'LOW BATTERY');
      }
      
      // Alarm 115: COOLANT PUMP FAULT
      else if (this.coolant && this.coolant.level < 10 && Math.random() < 0.1) {
        this._setAlarm(115, 'COOLANT PUMP FAULT');
      }
      
      // Servo overload
      else if (this.spindleLoad > 95 && Math.random() < 0.05) {
        this._setAlarm(null, 'SPINDLE_OVERLOAD');
      }
      
      // High temperature
      else if (this.spindleTemp > 85 && Math.random() < 0.08) {
        this._setAlarm(200, 'SPINDLE OVER TEMP');
      }
      
      // Tool life expired
      else if (this.tools && this.currentTool) {
        const tool = this.tools[this.currentTool - 1];
        if (tool && tool.currentLife < 5 && Math.random() < 0.15) {
          this._setAlarm(null, 'TOOL_LIFE_EXPIRED');
        }
      }
      
      // High vibration
      else if (this.vibration > 5.0 && Math.random() < 0.08) {
        this._setAlarm(null, 'HIGH_VIBRATION');
      }
    }
    
    if (this.type === 'PRESS_BRAKE') {
      // Over tonnage
      if (this.tonnage > this.maxTonnage * 0.9 && Math.random() < 0.1) {
        this._setAlarm(null, 'OVER_TONNAGE');
      }
    }
    
    if (this.type === 'LASER') {
      // Laser power fault
      if (this.spindleLoad > 95 && Math.random() < 0.1) {
        this._setAlarm(null, 'LASER_POWER_FAULT');
      }
      
      // Resonator overheat
      if (this.resonatorTemp > 85 && Math.random() < 0.08) {
        this._setAlarm(null, 'RESONATOR_OVERHEAT');
      }
    }
  }

  _setAlarm(code, message) {
    this.alarm = message;
    this.alarmCode = code;
    this.alarmHistory.push({
      code: code,
      message: message,
      timestamp: new Date().toISOString(),
      cyclePhase: this.cyclePhase,
      spindleLoad: this.spindleLoad,
      cleared: false
    });
    
    // Keep only last 20 alarms
    if (this.alarmHistory.length > 20) {
      this.alarmHistory = this.alarmHistory.slice(-20);
    }
  }

  _clearAlarm() {
    if (this.alarmHistory.length > 0) {
      this.alarmHistory[this.alarmHistory.length - 1].cleared = true;
    }
    this.alarm = null;
    this.alarmCode = null;
    this.execution = 'IDLE';
  }

  // ========================================
  // WARNING SYSTEM
  // ========================================
  
  _updateWarnings() {
    this.warnings = [];
    
    // Battery warning
    if (this.batteryVoltage < 3.2) {
      this.warnings.push({ type: 'BATTERY_LOW', severity: 'warning', message: 'Battery voltage low' });
    }
    
    // Coolant warning
    if (this.coolant && this.coolant.level < 20) {
      this.warnings.push({ type: 'COOLANT_LOW', severity: 'warning', message: 'Coolant level below 20%' });
    }
    
    // Tool life warning
    if (this.tools && this.currentTool) {
      const tool = this.tools[this.currentTool - 1];
      if (tool && tool.currentLife < 15) {
        this.warnings.push({ type: 'TOOL_WEAR', severity: 'warning', message: `Tool ${this.currentTool} life below 15%` });
      }
    }
    
    // Temperature warning
    if (this.spindleTemp > 75) {
      this.warnings.push({ type: 'HIGH_TEMP', severity: 'warning', message: 'Spindle temperature elevated' });
    }
    
    // Servo load warning
    if (this.spindleLoad > 85) {
      this.warnings.push({ type: 'HIGH_LOAD', severity: 'caution', message: 'Spindle load above 85%' });
    }
  }

  // ========================================
  // MANUAL CONTROLS
  // ========================================
  
  setPower(state) {
    this.power = state;
    if (!state) {
      this.execution = 'STOPPED';
      this.cyclePhase = 'IDLE';
    }
  }

  injectAlarm(code, message) {
    this._setAlarm(code, message);
  }

  clearAlarm() {
    this._clearAlarm();
  }

  // ========================================
  // JSON OUTPUT
  // ========================================
  
  toJSON() {
    const data = {
      id: this.id,
      name: this.name,
      model: this.model,
      type: this.type,
      specs: this.specs,
      
      // State
      power: this.power,
      execution: this.execution,
      cyclePhase: this.cyclePhase,
      
      // Alarms
      alarm: this.alarm,
      alarmCode: this.alarmCode,
      alarmHistory: this.alarmHistory.slice(-5), // Last 5
      warnings: this.warnings,
      
      // Spindle
      spindleSpeed: Math.round(this.spindleSpeed),
      spindleLoad: parseFloat(this.spindleLoad.toFixed(1)),
      spindleTemp: parseFloat(this.spindleTemp.toFixed(1)),
      spindleHours: parseFloat(this.spindleHours.toFixed(3)),
      spindleOrientation: Math.round(this.spindleOrientation),
      
      // Feed & Motion
      feedRate: Math.round(this.feedRate),
      rapidRate: Math.round(this.rapidRate),
      axisPositions: {
        X: parseFloat(this.axisPositions.X.toFixed(2)),
        Y: parseFloat(this.axisPositions.Y.toFixed(2)),
        Z: parseFloat(this.axisPositions.Z.toFixed(2))
      },
      
      // Servos
      servoLoad: this.servoLoad,
      servoFollowingError: this.servoFollowingError,
      servoTemp: this.servoTemp,
      
      // Production
      partCount: this.partCount,
      totalCycles: this.totalCycles,
      machineOnHours: parseFloat(this.machineOnHours.toFixed(3)),
      productionRate: this.productionRate,
      
      // Health
      batteryVoltage: parseFloat(this.batteryVoltage.toFixed(2)),
      temperature: Math.round(this.temperature),
      vibration: parseFloat(this.vibration.toFixed(2)),
      currentAmps: parseFloat(this.currentAmps.toFixed(1)),
      oilPressure: Math.round(this.oilPressure),
      oilLevel: Math.round(this.oilLevel),
      
      timestamp: this.timestamp.toISOString()
    };
    
    // Type-specific data
    if (this.type === 'CNC_MILL' || this.type === 'LATHE') {
      data.currentTool = this.currentTool;
      data.tools = this.tools;
      data.toolChangeCount = this.toolChangeCount;
      data.toolWear = parseFloat(this.toolWear.toFixed(3));
      data.coolant = this.coolant;
    }
    
    if (this.type === 'PRESS_BRAKE') {
      data.tonnage = Math.round(this.tonnage);
      data.maxTonnage = this.maxTonnage;
      data.ramPosition = Math.round(this.ramPosition);
      data.backGauge = this.backGauge;
      data.bendAngle = Math.round(this.bendAngle);
    }
    
    if (this.type === 'LASER') {
      data.laserPower = Math.round(this.laserPower);
      data.maxLaserPower = this.maxLaserPower;
      data.gasPressure = Math.round(this.gasPressure);
      data.resonatorTemp = parseFloat(this.resonatorTemp.toFixed(1));
      data.cutSpeed = Math.round(this.cutSpeed);
    }
    
    if (this.material) data.material = this.material;
    if (this.programRunning) data.programRunning = this.programRunning;
    
    return data;
  }
}

module.exports = HaasMachine;
