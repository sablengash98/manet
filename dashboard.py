import streamlit as st
import paho.mqtt.client as mqtt
import json
import pandas as pd
import time
import random
import sqlite3
from datetime import datetime, date

# ----------------- DATABASE SETUP -----------------
DB_FILE = "maggot_monitoring.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Table for real-time sensor logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            temp REAL,
            hum REAL
        )
    """)
    # Table for daily manual inputs (Feed and Maggot weight)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_logs (
            tanggal TEXT PRIMARY KEY,
            berat_pakan REAL,
            berat_maggot REAL
        )
    """)
    conn.commit()
    conn.close()

def log_sensor_data(temp, hum):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO sensor_logs (timestamp, temp, hum) VALUES (?, ?, ?)",
        (timestamp, temp, hum)
    )
    conn.commit()
    conn.close()

def save_daily_log(tanggal_str, berat_pakan, berat_maggot):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO daily_logs (tanggal, berat_pakan, berat_maggot)
        VALUES (?, ?, ?)
        ON CONFLICT(tanggal) DO UPDATE SET
            berat_pakan=excluded.berat_pakan,
            berat_maggot=excluded.berat_maggot
    """, (tanggal_str, berat_pakan, berat_maggot))
    conn.commit()
    conn.close()

def get_sensor_data(limit=100):
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query(
        f"SELECT timestamp, temp as `Suhu (°C)`, hum as `Kelembaban (%)` FROM sensor_logs ORDER BY id DESC LIMIT {limit}", 
        conn
    )
    conn.close()
    if not df.empty:
        # Reverse to show chronological order in chart
        df = df.iloc[::-1]
    return df

def get_daily_logs():
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query(
        "SELECT tanggal as `Tanggal`, berat_pakan as `Berat Pakan (kg)`, berat_maggot as `Berat Maggot (kg)` FROM daily_logs ORDER BY tanggal ASC", 
        conn
    )
    conn.close()
    return df

# Initialize database
init_db()

# ----------------- STREAMLIT CONFIG -----------------
st.set_page_config(
    page_title="Smart Maggot Farming Dashboard",
    page_icon="🐛",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Dark-themed glassmorphism for Premium feel)
st.markdown("""
<style>
    .main {
        background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);
        color: #f3f4f6;
    }
    .metric-card {
        background: rgba(31, 41, 55, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(8px);
        transition: all 0.3s ease;
        text-align: center;
    }
    .metric-card:hover {
        transform: translateY(-4px);
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
    }
    .metric-title {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.75px;
        color: #9ca3af;
        margin-bottom: 6px;
    }
    .metric-value {
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 2px;
    }
    .metric-unit {
        font-size: 16px;
        color: #d1d5db;
        font-weight: normal;
    }
    .main-header {
        background: linear-gradient(to right, #10b981, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        font-size: 36px;
        margin-bottom: 5px;
    }
    .status-safe {
        color: #34d399;
        text-shadow: 0 0 10px rgba(52, 211, 153, 0.4);
    }
    .status-warn {
        color: #f87171;
        animation: pulse 1.5s infinite;
        text-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
    }
    @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
    }
</style>
""", unsafe_allow_html=True)

# Main Title
st.markdown('<h1 class="main-header">🐛 Smart Farming BSF Maggot</h1>', unsafe_allow_html=True)
st.markdown("<p style='color:#9ca3af; margin-top:-10px;'>Sistem Monitoring Suhu, Kelembaban, serta Pencatatan Berat Pakan & Maggot Harian terintegrasi Database SQLite</p>", unsafe_allow_html=True)

# ----------------- SIDEBAR PANEL -----------------
st.sidebar.image("https://img.icons8.com/color/96/000000/insect.png", width=80)
st.sidebar.title("🌿 Control Panel")
st.sidebar.markdown("---")

data_source = st.sidebar.selectbox(
    "Sumber Data Sensor:",
    ["🔌 MQTT Broker", "🧪 Simulator (Tanpa Broker)"]
)

# MQTT Configuration
if data_source == "🔌 MQTT Broker":
    st.sidebar.subheader("Konfigurasi MQTT")
    mqtt_host = st.sidebar.text_input("MQTT Host IP", "192.168.24.251")
    mqtt_port = st.sidebar.number_input("MQTT Port", min_value=1, max_value=65535, value=1883)
    mqtt_topic = st.sidebar.text_input("MQTT Topic", "iot/sensor")
    
    if "mqtt_connected" not in st.session_state:
        st.session_state.mqtt_connected = False
else:
    st.sidebar.info("💡 Mode Simulator aktif. Data sensor acak akan disimpan ke database secara otomatis.")

st.sidebar.markdown("---")
# Quick database options
if st.sidebar.button("🗑️ Hapus Semua Log Sensor"):
    conn = sqlite3.connect(DB_FILE)
    conn.execute("DELETE FROM sensor_logs")
    conn.commit()
    conn.close()
    st.sidebar.success("Log sensor dibersihkan!")
    st.rerun()

# --- MQTT Setup ---
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        st.session_state.mqtt_connected = True
        client.subscribe(mqtt_topic)
    else:
        st.session_state.mqtt_connected = False

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        temp = float(payload.get("temp", 0))
        hum = float(payload.get("hum", 0))
        log_sensor_data(temp, hum)
    except Exception as e:
        pass

def on_disconnect(client, userdata, flags, rc, properties=None):
    st.session_state.mqtt_connected = False

if data_source == "🔌 MQTT Broker":
    if "mqtt_client" not in st.session_state:
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
            client.on_connect = on_connect
            client.on_message = on_message
            client.on_disconnect = on_disconnect
            client.connect_async(mqtt_host, mqtt_port, keepalive=60)
            client.loop_start()
            st.session_state.mqtt_client = client
        except Exception as e:
            st.sidebar.error(f"Gagal menginisialisasi MQTT: {e}")
    
    if st.session_state.get("mqtt_connected", False):
        st.sidebar.success(f"✓ Terhubung ke {mqtt_host}")
    else:
        st.sidebar.warning("⚡ Menghubungkan ke broker...")
else:
    if "mqtt_client" in st.session_state:
        try:
            st.session_state.mqtt_client.loop_stop()
            del st.session_state.mqtt_client
            st.session_state.mqtt_connected = False
        except:
            pass

# ----------------- TABS SYSTEM -----------------
tab1, tab2, tab3 = st.tabs(["📈 Monitoring Real-Time", "✍️ Input Berat Harian (Manual)", "📊 Histori & Analitik Maggot"])

# --- TAB 1: REAL-TIME MONITORING ---
with tab1:
    col_l, col_r = st.columns([1, 2])
    
    with col_l:
        st.subheader("Kondisi Kandang Saat Ini")
        latest_placeholder = st.empty()
        
    with col_r:
        st.subheader("Grafik Suhu & Kelembaban (Real-Time)")
        chart_placeholder = st.empty()

# --- TAB 2: MANUAL WEIGHT INPUTS ---
with tab2:
    st.subheader("📝 Form Pencatatan Harian (Pakan & Maggot)")
    st.markdown("Masukkan data berat pakan yang diberikan dan berat maggot yang dipanen/ditimbang hari ini.")
    
    col_in1, col_in2 = st.columns(2)
    with col_in1:
        input_date = st.date_input("Tanggal Pencatatan", date.today())
        feed_input = st.number_input("Berat Pakan Harian (kg)", min_value=0.0, step=0.1, value=5.0)
    with col_in2:
        st.markdown("<br>", unsafe_allow_html=True)  # Spacing
        maggot_input = st.number_input("Berat Maggot Harian (kg)", min_value=0.0, step=0.1, value=2.0)
        
    if st.button("💾 Simpan ke Database", type="primary"):
        save_daily_log(input_date.strftime("%Y-%m-%d"), feed_input, maggot_input)
        st.success(f"✓ Berhasil menyimpan data untuk tanggal {input_date}")
        st.rerun()
        
    st.markdown("---")
    st.subheader("📋 Tabel Input Harian")
    daily_df = get_daily_logs()
    if not daily_df.empty:
        st.dataframe(daily_df.iloc[::-1], use_container_width=True)
    else:
        st.info("Belum ada data input harian yang tercatat.")

# --- TAB 3: HISTORY & ANALYTICS ---
with tab3:
    st.subheader("📊 Analitik Pertumbuhan Maggot vs Pakan")
    
    daily_data = get_daily_logs()
    if not daily_data.empty:
        # Plot Feed vs Maggot weight over time
        st.markdown("### Trend Pakan Harian vs Hasil Berat Maggot")
        plot_df = daily_data.set_index("Tanggal")
        st.line_chart(plot_df)
        
        # Display summary statistics
        st.markdown("### Ringkasan Akumulasi")
        total_pakan = daily_data["Berat Pakan (kg)"].sum()
        total_maggot = daily_data["Berat Maggot (kg)"].sum()
        avg_pakan = daily_data["Berat Pakan (kg)"].mean()
        avg_maggot = daily_data["Berat Maggot (kg)"].mean()
        
        col_sum1, col_sum2, col_sum3 = st.columns(3)
        with col_sum1:
            st.metric("Total Pakan Diberikan", f"{total_pakan:.1f} kg")
        with col_sum2:
            st.metric("Total Berat Maggot Tercatat", f"{total_maggot:.1f} kg")
        with col_sum3:
            # Feed Conversion Ratio (FCR) approximation
            fcr = total_pakan / total_maggot if total_maggot > 0 else 0
            st.metric("Estimasi FCR (Feed Conversion Ratio)", f"{fcr:.2f}")
    else:
        st.info("Input data harian terlebih dahulu di Tab 2 untuk memunculkan grafik analitik.")

# ----------------- MAIN REAL-TIME LOOP -----------------
while True:
    # If in simulator mode, generate data and save to DB
    if data_source == "🧪 Simulator (Tanpa Broker)":
        temp = round(random.uniform(25.0, 33.0), 1)
        hum = round(random.uniform(45.0, 80.0), 1)
        log_sensor_data(temp, hum)
        
    # Read latest sensor logs from DB
    sensor_df = get_sensor_data(limit=50)
    
    if not sensor_df.empty:
        latest_row = sensor_df.iloc[-1]
        t_val = latest_row["Suhu (°C)"]
        h_val = latest_row["Kelembaban (%)"]
        
        # Determine Alarm condition (optimal suhu maggot BSF is 25°C to 30°C)
        status_text = "🟢 OPTIMAL (25°C - 30°C)"
        status_class = "status-safe"
        
        if t_val > 30.0:
            status_text = "🚨 OVERHEAT (SUHU > 30°C)"
            status_class = "status-warn"
        elif t_val < 25.0:
            status_text = "⚠️ TERLALU DINGIN (< 25°C)"
            status_class = "status-warn"
            
        # Update metrics UI in Tab 1
        latest_placeholder.markdown(f"""
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="metric-card">
                <div class="metric-title">Suhu Kandang Maggot</div>
                <div class="metric-value" style="color: {'#f87171' if t_val > 30.0 or t_val < 25.0 else '#10b981'};">{t_val} <span class="metric-unit">°C</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Kelembaban</div>
                <div class="metric-value" style="color: #3b82f6;">{h_val} <span class="metric-unit">%</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Status Suhu Kandang</div>
                <div class="metric-value {status_class}" style="font-size: 20px;">{status_text}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Update Chart in Tab 1
        chart_df = sensor_df.set_index("timestamp")[["Suhu (°C)", "Kelembaban (%)"]]
        chart_placeholder.line_chart(chart_df)
        
    else:
        latest_placeholder.info("Menunggu data sensor masuk...")
        chart_placeholder.info("Grafik akan tampil setelah data sensor masuk ke database.")

    time.sleep(3)