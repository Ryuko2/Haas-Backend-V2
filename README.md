# 🏭 Haas CNC Fleet Monitor - Backend V2.0

Professional monitoring system for Haas CNC machines with **model-specific dashboards** and **real alarm codes** based on actual Haas troubleshooting data.

---

## ✨ Features

### **Real Haas Alarm Codes**
- ✅ **103-105**: Axis Following Error
- ✅ **9100**: Low Battery
- ✅ **115**: Coolant Pump Fault
- ✅ **200**: Spindle Over Temp
- ✅ Plus: SPINDLE_OVERLOAD, TOOL_LIFE_EXPIRED, HIGH_VIBRATION, etc.

### **Model-Specific Dashboards**
Each machine model has prioritized critical data:

**CNC Mills (VF-2, VF-4, HMC):**
- Spindle load & temperature monitoring
- Servo following error tracking
- Tool life management
- Coolant system status
- Real-time axis positions

**Lathes:**
- Chuck clamp status
- Spindle orientation
- Tool turret monitoring
- Tailstock position

**Press Brake:**
- Tonnage monitoring
- Ram position accuracy
- Bend angle verification
- Back gauge position

**Laser:**
- Laser power stability
- Gas pressure monitoring
- Resonator temperature
- Cut speed optimization

### **Advanced Monitoring**
- ✅ Real-time WebSocket updates
- ✅ Alarm history tracking
- ✅ Warning system (before alarms)
- ✅ Production metrics (parts/hour)
- ✅ Health diagnostics
- ✅ Fleet-wide analytics

---

## 🚀 Quick Start

### **1. Install Dependencies**
```bash
npm install
```

### **2. Run Locally**
```bash
npm start
```

Server starts on: **http://localhost:5000**

### **3. Test API**
```bash
curl http://localhost:5000/api/machines
```

---

## 📡 API Endpoints

### **Machine Endpoints**

#### **GET /api/machines**
List all machines with full state.

**Response:**
```json
[
  {
    "id": "haas_vf2",
    "name": "Haas VF-2",
    "model": "VF-2",
    "type": "CNC_MILL",
    "execution": "RUNNING",
    "alarm": null,
    "spindleSpeed": 6800,
    "spindleLoad": 45.3,
    ...
  }
]
```

---

#### **GET /api/machines/:id**
Get specific machine details.

**Example:**
```bash
curl http://localhost:5000/api/machines/haas_vf2
```

---

#### **GET /api/machines/:id/dashboard**
**⭐ NEW!** Model-specific dashboard with prioritized critical data.

**Response:**
```json
{
  "machine": {
    "id": "haas_vf2",
    "model": "VF-2",
    "type": "CNC_MILL"
  },
  "status": {
    "execution": "RUNNING",
    "cyclePhase": "CUTTING",
    "alarm": null
  },
  "critical": {
    "spindleSpeed": 6800,
    "spindleLoad": 45.3,
    "spindleTemp": 78.2,
    "coolantLevel": 85.4,
    "currentTool": 3,
    "toolLife": 67.8,
    "servoFollowingError": {
      "X": 0.0012,
      "Y": 0.0008,
      "Z": 0.0015
    }
  },
  "warnings": [
    {
      "type": "TOOL_WEAR",
      "severity": "warning",
      "message": "Tool 3 life below 15%"
    }
  ]
}
```

---

#### **POST /api/machines/:id/power**
Toggle machine power on/off.

**Request:**
```json
{
  "power": true
}
```

---

#### **DELETE /api/machines/:id/alarm**
Clear active alarm.

**Response:**
```json
{
  "success": true,
  "machine": "haas_vf2",
  "message": "Alarm cleared"
}
```

---

#### **POST /api/machines/:id/alarm**
Inject test alarm (for testing).

**Request:**
```json
{
  "code": 103,
  "message": "X AXIS FOLLOWING ERROR"
}
```

---

### **Plant-Wide Endpoints**

#### **GET /api/plant/status**
Overall fleet status.

**Response:**
```json
{
  "total": 6,
  "running": 3,
  "idle": 2,
  "alarm": 1,
  "stopped": 0,
  "totalParts": 1247,
  "avgProductionRate": 42
}
```

---

#### **GET /api/plant/alarms**
Active alarms across all machines.

**Response:**
```json
{
  "count": 2,
  "alarms": [
    {
      "machineId": "haas_vf2",
      "machineName": "Haas VF-2",
      "alarmCode": 103,
      "alarm": "X AXIS FOLLOWING ERROR"
    }
  ]
}
```

---

#### **GET /api/plant/production**
Production summary for all machines.

---

#### **GET /api/plant/health**
Fleet health metrics and warnings.

**Response:**
```json
{
  "batteryWarnings": 1,
  "temperatureWarnings": 0,
  "coolantWarnings": 2,
  "toolWarnings": 3,
  "avgBatteryVoltage": 3.45,
  "avgTemperature": 78
}
```

---

### **Analytics Endpoints**

#### **GET /api/analytics/uptime**
Uptime and utilization statistics.

---

#### **GET /api/analytics/alarms**
Alarm frequency analysis - shows most common alarms.

**Response:**
```json
{
  "totalAlarms": 47,
  "uniqueAlarmTypes": 8,
  "topAlarms": [
    {
      "message": "X AXIS FOLLOWING ERROR",
      "code": 103,
      "count": 12,
      "machines": ["Haas VF-2", "Toyoda HMC"]
    }
  ]
}
```

---

## 🔌 WebSocket

Connect to `ws://localhost:5000` for real-time updates.

**Message Format:**
```json
{
  "type": "PLANT_UPDATE",
  "timestamp": "2025-11-25T23:45:00.000Z",
  "machines": [ ... ]
}
```

Updates sent every **2 seconds**.

---

## 🤖 Fleet Configuration

Your current fleet:

| Machine | Model | Type | Specs |
|---------|-------|------|-------|
| Haas VF-2 | VF-2 | CNC Mill | 762×406×508mm, 30HP, 8100 RPM |
| Haas VF-4 | VF-4 | CNC Mill | 1270×508×635mm, 30HP, 8100 RPM |
| Toyoda HMC | HMC | Horizontal MC | 800×700×600mm, 40HP, 12000 RPM |
| CNC Lathe | LATHE | Lathe | 300×200×500mm, 20HP, 4000 RPM |
| Durma Press | PRESS | Press Brake | 200 tons |
| Fiber Laser | LASER | Fiber Laser | 6000W |

---

## 🚀 Deploy to Render

### **Step 1: Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit - Haas Backend V2"
git remote add origin https://github.com/Ryuko2/Haas-Backend.git
git push -u origin main
```

### **Step 2: Create Web Service on Render**

1. Go to https://dashboard.render.com
2. **New +** → **Web Service**
3. Connect your GitHub repo
4. **Settings:**
   - **Name:** haas-backend-v2
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free

### **Step 3: Deploy**

Render will automatically deploy! 🎉

Your backend will be live at:
```
https://haas-backend-v2.onrender.com
```

---

## 🧪 Testing

### **Test All Machines**
```bash
curl http://localhost:5000/api/machines | jq
```

### **Test Specific Dashboard**
```bash
curl http://localhost:5000/api/machines/haas_vf2/dashboard | jq
```

### **Test Alarm Injection**
```bash
curl -X POST http://localhost:5000/api/machines/haas_vf2/alarm \
  -H "Content-Type: application/json" \
  -d '{"code": 103, "message": "X AXIS FOLLOWING ERROR"}'
```

### **Test Alarm Clearing**
```bash
curl -X DELETE http://localhost:5000/api/machines/haas_vf2/alarm
```

### **Test Power Toggle**
```bash
curl -X POST http://localhost:5000/api/machines/haas_vf2/power \
  -H "Content-Type: application/json" \
  -d '{"power": false}'
```

---

## 🔧 Configuration

### **Change Update Interval**

Edit `server.js`, line 110:
```javascript
const SIM_UPDATE_PERIOD_MS = 2000; // Change to 1000 for 1 second
```

### **Add New Machine**

Edit `server.js`, add to machines object:
```javascript
new_machine: new HaasMachine(
  'new_machine',
  'New Machine Name',
  'MODEL',
  'TYPE',
  { /* specs */ }
)
```

### **Customize Alarm Probabilities**

Edit `HaasMachine.js`, `_checkAlarms()` method (line ~650).

---

## 📊 Alarm Codes Reference

Based on real Haas documentation:

| Code | Description | Severity |
|------|-------------|----------|
| 103 | X Axis Following Error | Critical |
| 104 | Y Axis Following Error | Critical |
| 105 | Z Axis Following Error | Critical |
| 115 | Coolant Pump Fault | Warning |
| 200 | Spindle Over Temp | Critical |
| 9100 | Low Battery | Warning |
| - | SPINDLE_OVERLOAD | Critical |
| - | TOOL_LIFE_EXPIRED | Warning |
| - | HIGH_VIBRATION | Warning |

---

## 📈 Data Priorities by Model

### **CNC Mills - Critical Monitoring:**
1. **Spindle Load** - Overload detection
2. **Servo Following Error** - Position accuracy
3. **Tool Life** - Prevent breakage
4. **Coolant Level** - Pump fault prevention
5. **Temperature** - Thermal protection

### **Lathes - Critical Monitoring:**
1. **Chuck Clamp Status**
2. **Spindle Orientation**
3. **Tool Life**
4. **Coolant System**

### **Press Brake - Critical Monitoring:**
1. **Tonnage** - Overload protection
2. **Ram Position** - Accuracy
3. **Bend Angle** - Quality control

### **Laser - Critical Monitoring:**
1. **Laser Power** - Stability
2. **Gas Pressure** - Cut quality
3. **Resonator Temp** - Prevent damage

---

## 🐛 Troubleshooting

### **Port Already in Use**
```bash
# Change port in server.js or set environment variable
PORT=3000 npm start
```

### **Module Not Found**
```bash
npm install
```

### **Connection Refused**
Check firewall settings and ensure server is running.

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment mode |

---

## 🔐 Security Notes

For production:
- Add authentication (JWT recommended)
- Use HTTPS only
- Rate limit API endpoints
- Validate all inputs
- Sanitize WebSocket messages

---

## 📞 Support

**Developer:** Kevin Rodriguez  
**Company:** LJ Services Group  
**Location:** Miami, FL

---

## 🎯 Next Steps

1. ✅ Backend deployed
2. ⏳ Create frontend (React Native)
3. ⏳ Add n8n integration
4. ⏳ Connect to real machines

---

## 📄 License

MIT License - LJ Services Group

---

**🎉 Your professional Haas monitoring backend is ready!**
