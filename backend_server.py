from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json
import threading
import time
import random
from datetime import datetime, date
import paho.mqtt.client as mqtt

app = FastAPI(title="Smart Maggot Farming API")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "maggot_monitoring.db"
SYSTEM_STATE = {
    "data_source": "MQTT", # Default to physical MQTT sensor module
    "mqtt_host": "192.168.24.251",
    "mqtt_port": 1883,
    "mqtt_topic": "iot/sensor",
    "mqtt_connected": False
}

mqtt_client = None

# Database Setup
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            temp REAL,
            hum REAL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_logs (
            tanggal TEXT PRIMARY KEY,
            berat_pakan REAL,
            berat_maggot REAL,
            jenis_pakan TEXT DEFAULT 'Limbah Sayur/Buah',
            kualitas_maggot TEXT DEFAULT 'Baik'
        )
    """)
    
    # Ensure columns exist in case table was already created
    try:
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN jenis_pakan TEXT DEFAULT 'Limbah Sayur/Buah'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN kualitas_maggot TEXT DEFAULT 'Baik'")
    except sqlite3.OperationalError:
        pass
    
    # Clear all manual daily logs as requested by the user
    cursor.execute("DELETE FROM daily_logs")
    
    # Clear all simulated sensor logs to keep only genuine hardware MQTT data
    cursor.execute("DELETE FROM sensor_logs")
        
    conn.commit()
    conn.close()

init_db()

# MQTT callbacks
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        SYSTEM_STATE["mqtt_connected"] = True
        client.subscribe(SYSTEM_STATE["mqtt_topic"])
    else:
        SYSTEM_STATE["mqtt_connected"] = False

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        temp = float(payload.get("temp", 0))
        hum = float(payload.get("hum", 0))
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO sensor_logs (timestamp, temp, hum) VALUES (?, ?, ?)",
            (timestamp, temp, hum)
        )
        cursor.execute("DELETE FROM sensor_logs WHERE id NOT IN (SELECT id FROM sensor_logs ORDER BY id DESC LIMIT 1000)")
        conn.commit()
        conn.close()
    except Exception:
        pass

def on_disconnect(client, userdata, flags, rc, properties=None):
    SYSTEM_STATE["mqtt_connected"] = False

def restart_mqtt():
    global mqtt_client
    if mqtt_client:
        try:
            mqtt_client.loop_stop()
        except:
            pass
    
    if SYSTEM_STATE["data_source"] == "MQTT":
        try:
            mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
            mqtt_client.on_connect = on_connect
            mqtt_client.on_message = on_message
            mqtt_client.on_disconnect = on_disconnect
            mqtt_client.connect_async(SYSTEM_STATE["mqtt_host"], SYSTEM_STATE["mqtt_port"], keepalive=60)
            mqtt_client.loop_start()
        except Exception:
            SYSTEM_STATE["mqtt_connected"] = False
    else:
        mqtt_client = None

# Pydantic schemas
class ConfigSchema(BaseModel):
    data_source: str
    mqtt_host: str
    mqtt_port: int
    mqtt_topic: str

class DailyLogSchema(BaseModel):
    tanggal: str
    berat_pakan: float
    berat_maggot: float
    jenis_pakan: str = "Limbah Sayur/Buah"
    kualitas_maggot: str = "Baik"

# Routes
@app.get("/api/status")
def get_status():
    return SYSTEM_STATE

@app.post("/api/status")
def update_status(config: ConfigSchema):
    if config.data_source not in ["MQTT"]:
        raise HTTPException(status_code=400, detail="Invalid data source")
    
    SYSTEM_STATE["data_source"] = config.data_source
    SYSTEM_STATE["mqtt_host"] = config.mqtt_host
    SYSTEM_STATE["mqtt_port"] = config.mqtt_port
    SYSTEM_STATE["mqtt_topic"] = config.mqtt_topic
    
    restart_mqtt()
    return SYSTEM_STATE

@app.get("/api/sensors")
def get_sensors(limit: int = 50):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT timestamp, temp, hum FROM sensor_logs ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for r in reversed(rows):
        # Format time for chart readability
        t_obj = datetime.strptime(r[0], "%Y-%m-%d %H:%M:%S")
        data.append({
            "waktu": t_obj.strftime("%H:%M:%S"),
            "suhu": r[1],
            "kelembaban": r[2]
        })
    return data

@app.get("/api/daily")
def get_daily():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT tanggal, berat_pakan, berat_maggot, jenis_pakan, kualitas_maggot FROM daily_logs ORDER BY tanggal ASC")
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for r in rows:
        data.append({
            "tanggal": r[0],
            "berat_pakan": r[1],
            "berat_maggot": r[2],
            "jenis_pakan": r[3] if len(r) > 3 and r[3] is not None else "Limbah Sayur/Buah",
            "kualitas_maggot": r[4] if len(r) > 4 and r[4] is not None else "Baik"
        })
    return data

@app.post("/api/daily")
def add_daily(log: DailyLogSchema):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO daily_logs (tanggal, berat_pakan, berat_maggot, jenis_pakan, kualitas_maggot)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(tanggal) DO UPDATE SET
            berat_pakan=excluded.berat_pakan,
            berat_maggot=excluded.berat_maggot,
            jenis_pakan=excluded.jenis_pakan,
            kualitas_maggot=excluded.kualitas_maggot
    """, (log.tanggal, log.berat_pakan, log.berat_maggot, log.jenis_pakan, log.kualitas_maggot))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Data saved for {log.tanggal}"}

@app.post("/api/sensors/clear")
def clear_sensors():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sensor_logs")
    conn.commit()
    conn.close()
    return {"status": "success"}

class LoginSchema(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(credentials: LoginSchema):
    if credentials.username == "admin" and credentials.password == "admin123":
        return {
            "status": "success",
            "user": {
                "name": "Owner Maggot Smart",
                "role": "Administrator",
                "email": "owner@maggotsmart.id"
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Username atau password salah!")
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
