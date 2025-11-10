// Simple MQTT test client to verify connection
// Run: node test-mqtt.js

const mqtt = require("mqtt");

const MQTT_BROKER = "mqtt://broker.hivemq.com:1883";
const TOPIC_SENSOR = "iot/sensor";
const TOPIC_POMPA = "iot/pompa";

console.log("🧪 Testing MQTT Connection...\n");

// Connect to broker
const client = mqtt.connect(MQTT_BROKER);

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker!");
  console.log("📡 Broker: broker.hivemq.com:1883\n");

  // Subscribe to topics
  client.subscribe(TOPIC_SENSOR, (err) => {
    if (!err) {
      console.log(`✅ Subscribed to: ${TOPIC_SENSOR}`);
    }
  });

  client.subscribe(TOPIC_POMPA, (err) => {
    if (!err) {
      console.log(`✅ Subscribed to: ${TOPIC_POMPA}\n`);
    }
  });

  // Test publish sensor data
  console.log("📤 Testing publish to iot/sensor...");
  const testData = {
    suhu: 25.5,
    kelembapan: 60.0,
  };
  client.publish(TOPIC_SENSOR, JSON.stringify(testData));
  console.log(`   Sent: ${JSON.stringify(testData)}\n`);

  // Test publish pump command
  setTimeout(() => {
    console.log("📤 Testing publish to iot/pompa...");
    client.publish(TOPIC_POMPA, "ON");
    console.log("   Sent: ON\n");

    setTimeout(() => {
      client.publish(TOPIC_POMPA, "OFF");
      console.log("   Sent: OFF\n");
    }, 2000);
  }, 2000);

  // Close after 10 seconds
  setTimeout(() => {
    console.log("\n✅ Test completed successfully!");
    console.log("🎯 MQTT connection is working properly.\n");
    client.end();
    process.exit(0);
  }, 10000);
});

client.on("message", (topic, message) => {
  console.log(`📩 Received from ${topic}: ${message.toString()}`);
});

client.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
  process.exit(1);
});

client.on("offline", () => {
  console.log("⚠️ Client is offline");
});

client.on("reconnect", () => {
  console.log("🔄 Reconnecting...");
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log("\n⏱️ Test timeout - closing connection");
  client.end();
  process.exit(0);
}, 30000);
