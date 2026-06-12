import paho.mqtt.client as mqtt
import json
import time

MQTT_HOST = "localhost"  # Ubah ke 192.168.24.251 setelah testing
MQTT_PORT = 1883
MQTT_TOPIC = "iot/sensor"
RECONNECT_DELAY = 5

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✓ Terhubung ke MQTT broker {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"✗ Koneksi gagal dengan kode: {rc}")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        print(f"Suhu: {data['temp']} °C | Kelembaban: {data['hum']} %")
    except json.JSONDecodeError:
        print("Error parsing JSON")
    except KeyError as e:
        print(f"Missing key: {e}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠ Terputus dari broker. Reconnecting dalam {RECONNECT_DELAY}s...")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

# Set reconnect delay
client.reconnect_delay_set(min_delay=1, max_delay=RECONNECT_DELAY)

print(f"Mencoba koneksi ke {MQTT_HOST}:{MQTT_PORT}...")
try:
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_forever()
except TimeoutError:
    print(f"✗ GAGAL: Tidak bisa terhubung ke {MQTT_HOST}:{MQTT_PORT}")
    print("  Pastikan:")
    print("  1. MQTT broker sudah berjalan")
    print("  2. IP address benar")
    print("  3. Port 1883 tidak diblokir firewall")
