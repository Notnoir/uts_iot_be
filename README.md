# IoT Backend - Node.js + Express + MySQL + MQTT

Backend server untuk sistem monitoring IoT dengan integrasi MQTT untuk komunikasi dengan ESP32.

## 🚀 Features

- **Express.js Server** - REST API untuk frontend
- **MySQL Database** - Penyimpanan data sensor
- **MQTT Integration** - Subscribe/Publish ke broker.hivemq.com
- **Real-time Data** - Endpoint untuk data sensor terbaru
- **Pump Control** - Kontrol relay/pompa via MQTT
- **Auto-save** - Data sensor otomatis tersimpan ke database

## 📡 MQTT Configuration

- **Broker**: broker.hivemq.com:1883
- **Subscribe Topic**: `iot/sensor` (terima data dari ESP32)
- **Publish Topic**: `iot/pompa` (kirim perintah ke ESP32)

## 🗄️ Database Schema

```sql
CREATE DATABASE iot_database;

USE iot_database;

CREATE TABLE data_sensor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suhu FLOAT NOT NULL,
    humidity FLOAT NOT NULL,
    lux FLOAT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## ⚙️ Setup & Installation

1. **Clone repository**
```bash
git clone https://github.com/Notnoir/uts_iot_be.git
cd uts_iot_be
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create `.env` file:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=iot_database
```

4. **Setup MySQL database**
- Create database `iot_database`
- Create table `data_sensor` (see schema above)

5. **Run server**
```bash
npm start
# or
node server.js
```

Server will run on `http://localhost:3000`

## 📚 API Endpoints

### 1. Get Latest Sensor Data (Real-time)
```
GET /api/sensor/latest
```
Response:
```json
{
  "suhu": 28.5,
  "kelembapan": 65.2,
  "cahaya": 75.0,
  "timestamp": "2025-11-10T10:30:00.000Z"
}
```

### 2. Get All Latest Records
```
GET /api/sensor/all?limit=50
```
Response:
```json
{
  "count": 50,
  "data": [
    {
      "idx": 123,
      "suhu": 28.5,
      "humid": 65.2,
      "kecerahan": 75.0,
      "timestamp": "2025-11-10T10:30:00.000Z"
    }
  ]
}
```

### 3. Get Historical Summary
```
GET /api/sensor/summary
```
Response:
```json
{
  "suhumax": 35.5,
  "suhumin": 20.0,
  "suhurata": 27.8,
  "humidmax": 85.0,
  "nilai_suhu_max_humid_max": [...],
  "month_year_max": [...]
}
```

### 4. Control Pump (Relay)
```
POST /api/pompa
Content-Type: application/json

{
  "status": "ON"  // or "OFF"
}
```
Response:
```json
{
  "message": "Pompa turned ON",
  "status": "ON"
}
```

## 🔌 MQTT Message Format

### Received from ESP32 (Topic: `iot/sensor`)
```json
{
  "suhu": 28.5,
  "kelembapan": 65.2,
  "cahaya": 75.0
}
```

### Send to ESP32 (Topic: `iot/pompa`)
```
"ON"
```
or
```
"OFF"
```

## 📦 Dependencies

```json
{
  "express": "^5.1.0",
  "mysql2": "^3.15.3",
  "mqtt": "^5.x.x",
  "dotenv": "^16.x.x"
}
```

## 🐛 Troubleshooting

### MQTT Connection Failed
- Pastikan koneksi internet stabil
- Cek apakah broker.hivemq.com accessible
- Verify topic names: `iot/sensor` dan `iot/pompa`

### Database Connection Error
- Cek kredensial database di file `.env`
- Pastikan MySQL service berjalan
- Verify database `iot_database` sudah dibuat

### No Data from ESP32
- Pastikan ESP32 sudah connect ke MQTT broker
- Cek Serial Monitor ESP32 untuk error messages
- Verify topic subscription: `iot/sensor`

## 🔗 Related Projects

- **Frontend**: https://github.com/Notnoir/uts_iot_fe
- **ESP32 Code**: Lihat file `ESP32_CODE_UPDATED.md` di root project

## 📄 License

MIT License

## 👨‍💻 Author

Created for IoT UTS Project - Semester 5
