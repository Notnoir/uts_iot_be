require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const mqtt = require("mqtt");
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Middleware untuk parsing JSON
app.use(express.json());

// koneksi ke database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// MQTT Configuration
const MQTT_BROKER = "mqtt://broker.hivemq.com:1883";
const MQTT_TOPIC_SENSOR = "iot/sensor";
const MQTT_TOPIC_POMPA = "iot/pompa";

// Variable untuk menyimpan data sensor terbaru
let latestSensorData = {
  suhu: null,
  kelembapan: null,
  cahaya: null,
  timestamp: null,
};

// Koneksi ke MQTT Broker
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT broker (broker.hivemq.com)");
  mqttClient.subscribe(MQTT_TOPIC_SENSOR, (err) => {
    if (!err) {
      console.log(`📡 Subscribed to topic: ${MQTT_TOPIC_SENSOR}`);
    } else {
      console.error("❌ Failed to subscribe:", err);
    }
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const payload = message.toString();
    console.log(`📩 Received from ${topic}: ${payload}`);

    if (topic === MQTT_TOPIC_SENSOR) {
      const data = JSON.parse(payload);
      const suhu = parseFloat(data.suhu);
      const kelembapan = parseFloat(data.kelembapan);
      const cahaya = parseFloat(data.cahaya);

      // Update data terbaru
      latestSensorData = {
        suhu: suhu,
        kelembapan: kelembapan,
        cahaya: cahaya,
        timestamp: new Date(),
      };

      // Simpan ke database
      const conn = await pool.getConnection();
      await conn.query(
        "INSERT INTO data_sensor (suhu, humidity, lux, timestamp) VALUES (?, ?, ?, NOW())",
        [suhu, kelembapan, cahaya]
      );
      conn.release();

      console.log(
        `💾 Data saved to database: Suhu=${suhu}°C, Kelembapan=${kelembapan}%, Cahaya=${cahaya}%`
      );
    }
  } catch (err) {
    console.error("❌ Error processing MQTT message:", err);
  }
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
});

// Endpoint untuk data sensor real-time (latest)
app.get("/api/sensor/latest", (req, res) => {
  if (latestSensorData.suhu === null) {
    return res.status(404).json({
      message: "No sensor data available yet",
    });
  }

  res.json({
    suhu: latestSensorData.suhu,
    kelembapan: latestSensorData.kelembapan,
    cahaya: latestSensorData.cahaya,
    timestamp: latestSensorData.timestamp,
  });
});

// Endpoint untuk kontrol pompa
app.post("/api/pompa", (req, res) => {
  const { status } = req.body; // "ON" atau "OFF"

  if (status !== "ON" && status !== "OFF") {
    return res
      .status(400)
      .json({ message: "Invalid status. Use 'ON' or 'OFF'" });
  }

  mqttClient.publish(MQTT_TOPIC_POMPA, status);
  console.log(`💧 Pompa command sent: ${status}`);

  res.json({ message: `Pompa turned ${status}`, status });
});

// Endpoint untuk semua data terbaru (untuk tabel)
app.get("/api/sensor/all", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Default 50 data terakhir
    const conn = await pool.getConnection();

    // Ambil data terbaru
    const [records] = await conn.query(
      `
      SELECT id AS idx, suhu, humidity AS humid, lux AS kecerahan, timestamp
      FROM data_sensor
      ORDER BY timestamp DESC
      LIMIT ?
    `,
      [limit]
    );

    conn.release();
    res.json({
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// endpoint utama
app.get("/api/sensor/summary", async (req, res) => {
  try {
    const conn = await pool.getConnection();

    // Ambil nilai max, min, rata-rata suhu, dan max humidity
    const [statsRows] = await conn.query(`
      SELECT 
        MAX(suhu) AS suhumax,
        MIN(suhu) AS suhumin,
        AVG(suhu) AS suhurata,
        MAX(humidity) AS humidmax
      FROM data_sensor
    `);
    const stats = statsRows[0];
    stats.suhurata = Number(parseFloat(stats.suhurata || 0).toFixed(2));

    // Ambil data di mana suhu = suhumax atau humidity = humidmax
    const [records] = await conn.query(
      `
      SELECT id AS idx, suhu, humidity AS humid, lux AS kecerahan, timestamp
      FROM data_sensor
      WHERE suhu = ? OR humidity = ?
    `,
      [stats.suhumax, stats.humidmax]
    );

    // Ambil month-year unik dari data tersebut
    const [months] = await conn.query(
      `
      SELECT DISTINCT DATE_FORMAT(timestamp, '%c-%Y') AS month_year
      FROM data_sensor
      WHERE suhu = ? OR humidity = ?
      ORDER BY timestamp
    `,
      [stats.suhumax, stats.humidmax]
    );

    // Format JSON sesuai contoh di soal
    const result = {
      suhumax: stats.suhumax,
      suhumin: stats.suhumin,
      suhurata: stats.suhurata,
      humidmax: stats.humidmax,
      nilai_suhu_max_humid_max: records.map((r) => ({
        idx: r.idx,
        suhu: r.suhu,
        humid: r.humid,
        kecerahan: r.kecerahan,
        timestamp: r.timestamp,
      })),
      month_year_max: months.map((m) => ({ month_year: m.month_year })),
    };

    conn.release();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`📡 MQTT: Listening for sensor data from ESP32`);
  console.log(`🌐 Endpoints:`);
  console.log(`   - GET  /api/sensor/latest   (Real-time data)`);
  console.log(`   - GET  /api/sensor/all      (All latest records)`);
  console.log(`   - GET  /api/sensor/summary  (Historical summary)`);
  console.log(`   - POST /api/pompa           (Control pump)`);
});
