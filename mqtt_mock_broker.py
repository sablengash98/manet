"""
Simple MQTT Mock Broker untuk testing
Jalankan ini di terminal terpisah sebelum subscriber/dashboard
"""
import paho.mqtt.broker as broker
import time
import json
import random
import threading

def start_broker():
    """Start MQTT broker di localhost:1883"""
    print("🚀 Starting Mock MQTT Broker...")
    b = broker.Broker()
    b.listen()
    print("✓ MQTT Broker running di localhost:1883")
    print("  Subscribe topic: iot/sensor")

def publish_sensor_data():
    """Publish dummy sensor data"""
    import paho.mqtt.client as mqtt
    time.sleep(2)  # Tunggu broker ready
    
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    client.connect("localhost", 1883)
    client.loop_start()
    
    print("\n📊 Publishing sensor data setiap 5 detik...")
    try:
        while True:
            temp = round(25 + random.uniform(-5, 5), 2)
            hum = round(50 + random.uniform(-20, 20), 2)
            payload = json.dumps({"temp": temp, "hum": hum})
            client.publish("iot/sensor", payload)
            print(f"  📤 Sent: Temp={temp}°C, Humidity={hum}%")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n⛔ Stopping publisher...")
        client.loop_stop()

if __name__ == "__main__":
    # Start broker di thread terpisah
    broker_thread = threading.Thread(target=start_broker, daemon=True)
    broker_thread.start()
    
    # Publish data
    publish_sensor_data()
