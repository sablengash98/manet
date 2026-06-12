import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { 
  Thermometer, Droplets, Scale, Calendar, Cpu, Activity, Database, AlertCircle, Save, CheckCircle2, Trash2, TrendingUp, Info, HeartPulse, Menu, X, Wind, CloudRain, Clock, ChevronRight
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sensorsData, setSensorsData] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [chartLimit, setChartLimit] = useState(20);
  const [systemStatus, setSystemStatus] = useState({
    data_source: 'Simulator',
    mqtt_host: '192.168.24.251',
    mqtt_port: 1883,
    mqtt_topic: 'iot/sensor',
    mqtt_connected: false
  });

  // Smart Farm Actuator States (Simulated controls for premium UX)
  const [blowerActive, setBlowerActive] = useState(false);
  const [sprayerActive, setSprayerActive] = useState(false);

  // Dynamic BSF cultivation cycle tracker
  const getInitialStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 11); // Initialize to Day 12 to match user's context
    return d.toISOString().split('T')[0];
  };
  const [cycleStartDate, setCycleStartDate] = useState(getInitialStartDate());

  // Calculate current age in days
  const calculateCycleAge = () => {
    const start = new Date(cycleStartDate);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 1-indexed
    return diffDays > 0 ? diffDays : 1;
  };

  const cycleAge = calculateCycleAge();

  const getActivePhaseByAge = (age) => {
    if (age <= 4) return 'egg';
    if (age <= 20) return 'larva';
    if (age <= 25) return 'prepupa';
    if (age <= 35) return 'pupa';
    return 'adult';
  };

  const activePhase = getActivePhaseByAge(cycleAge);

  // Selected BSF Cycle Phase for educational guide
  const [selectedPhase, setSelectedPhase] = useState(activePhase);

  // Auto-sync tab to active phase on initialization or date change
  useEffect(() => {
    setSelectedPhase(activePhase);
  }, [cycleStartDate]);

  // Mobile responsiveness states
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Settings form states
  const [sourceForm, setSourceForm] = useState('MQTT');
  const [hostForm, setHostForm] = useState('192.168.24.251');
  const [portForm, setPortForm] = useState(1883);
  const [topicForm, setTopicForm] = useState('iot/sensor');

  // Daily Form states
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedWeight, setFeedWeight] = useState(5.0);
  const [maggotWeight, setMaggotWeight] = useState(2.0);
  const [jenisPakan, setJenisPakan] = useState('Limbah Sayur/Buah');
  const [kualitasMaggot, setKualitasMaggot] = useState('Baik');
  
  // Farmer checklist tasks
  const [tasks, setTasks] = useState([
    { id: 1, text: "🥚 Panen Telur BSF (Sarang)", completed: false },
    { id: 2, text: "🐛 Beri Pakan Larva (Pagi)", completed: false },
    { id: 3, text: "🐛 Beri Pakan Larva (Sore)", completed: false },
    { id: 4, text: "🪰 Semprot Air Embun Kandang", completed: false },
    { id: 5, text: "🧹 Pembersihan Sisa Pakan (Kasgot)", completed: false },
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const taskCompletionRate = Math.round((completedTasksCount / tasks.length) * 100);

  // Feed Mix formulation calculator states
  const [mixSayur, setMixSayur] = useState(40);
  const [mixTahu, setMixTahu] = useState(30);
  const [mixDapur, setMixDapur] = useState(20);
  const [mixDedak, setMixDedak] = useState(10);
  
  // Financial parameters
  const [hargaMaggot, setHargaMaggot] = useState(() => {
    return localStorage.getItem('hargaMaggot') ? parseInt(localStorage.getItem('hargaMaggot')) : 8000;
  });
  const [hargaPakan, setHargaPakan] = useState(() => {
    return localStorage.getItem('hargaPakan') ? parseInt(localStorage.getItem('hargaPakan')) : 1000;
  });

  const saveFinancialRates = (rateMaggot, ratePakan) => {
    setHargaMaggot(rateMaggot);
    setHargaPakan(ratePakan);
    localStorage.setItem('hargaMaggot', rateMaggot);
    localStorage.setItem('hargaPakan', ratePakan);
    triggerNotification("Tarif harga finansial berhasil diperbarui!");
  };

  const exportToCSV = () => {
    if (dailyLogs.length === 0) {
      triggerNotification("Tidak ada data untuk diekspor", "error");
      return;
    }
    const headers = ["Tanggal", "Berat Pakan (kg)", "Berat Maggot (kg)", "FCR", "Jenis Pakan", "Kualitas Maggot"];
    const rows = dailyLogs.map(log => [
      log.tanggal,
      log.berat_pakan,
      log.berat_maggot,
      (log.berat_pakan / (log.berat_maggot || 1)).toFixed(2),
      log.jenis_pakan || "Limbah Sayur/Buah",
      log.kualitas_maggot || "Baik"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_maggot_bsf_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Laporan CSV berhasil diunduh!");
  };
  
  // Notification banner state
  const [notification, setNotification] = useState(null);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // User Authentication States & Handlers
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        triggerNotification(`Selamat datang kembali, ${data.user.name}!`);
      } else {
        const errorData = await res.json();
        setLoginError(errorData.detail || "Gagal masuk!");
      }
    } catch (err) {
      setLoginError("Koneksi ke server gagal!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    triggerNotification("Anda telah keluar dari sistem.");
  };

  // Fetch status and data
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/status`);
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
        setSourceForm(data.data_source);
        setHostForm(data.mqtt_host);
        setPortForm(data.mqtt_port);
        setTopicForm(data.mqtt_topic);
      }
    } catch (err) {
      console.error("Failed to fetch system status", err);
    }
  };

  const fetchSensors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sensors?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setSensorsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch sensor data", err);
    }
  };

  const fetchDailyLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/daily`);
      if (res.ok) {
        const data = await res.json();
        setDailyLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch daily logs", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchDailyLogs();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);

    const interval = setInterval(() => {
      fetchSensors();
      if (Math.random() > 0.7) {
        fetchStatus();
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-actuation logic (Simulated automation for high-tech look)
  useEffect(() => {
    if (sensorsData.length > 0) {
      const latest = sensorsData[sensorsData.length - 1];
      // Automatically turn on Blower if temp > 30°C
      if (latest.suhu > 30.0) {
        setBlowerActive(true);
      } else if (latest.suhu <= 29.0) {
        setBlowerActive(false);
      }
      
      // Automatically turn on Sprayer if humidity < 55%
      if (latest.kelembaban < 55.0) {
        setSprayerActive(true);
      } else if (latest.kelembaban >= 65.0) {
        setSprayerActive(false);
      }
    }
  }, [sensorsData]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_source: sourceForm,
          mqtt_host: hostForm,
          mqtt_port: parseInt(portForm),
          mqtt_topic: topicForm
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
        triggerNotification("Konfigurasi sistem berhasil diperbarui!");
      }
    } catch (err) {
      triggerNotification("Gagal memperbarui konfigurasi!", "error");
    }
  };

  const handleSaveDaily = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: logDate,
          berat_pakan: parseFloat(feedWeight),
          berat_maggot: parseFloat(maggotWeight),
          jenis_pakan: jenisPakan,
          kualitas_maggot: kualitasMaggot
        })
      });
      if (res.ok) {
        fetchDailyLogs();
        triggerNotification(`Data harian tanggal ${logDate} berhasil disimpan!`);
      }
    } catch (err) {
      triggerNotification("Gagal menyimpan data harian!", "error");
    }
  };

  const handleClearSensors = async () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua histori data sensor?")) {
      try {
        const res = await fetch(`${API_BASE_URL}/sensors/clear`, { method: 'POST' });
        if (res.ok) {
          setSensorsData([]);
          triggerNotification("Histori log sensor berhasil dibersihkan!");
        }
      } catch (err) {
        triggerNotification("Gagal membersihkan log sensor", "error");
      }
    }
  };

  // Calculated Stats
  const latestSensor = sensorsData[sensorsData.length - 1] || { suhu: 27.5, kelembaban: 65.0 };
  const latestDaily = dailyLogs[dailyLogs.length - 1] || { berat_pakan: 0, berat_maggot: 0 };
  
  const totalPakan = dailyLogs.reduce((sum, item) => sum + item.berat_pakan, 0);
  const totalMaggot = dailyLogs.reduce((sum, item) => sum + item.berat_maggot, 0);
  const averageFCR = totalMaggot > 0 ? (totalPakan / totalMaggot) : 0;

  // Feed Mix formulation values
  const mixTotal = mixSayur + mixTahu + mixDapur + mixDedak;
  const mixCost = (mixSayur * 200 + mixTahu * 1500 + mixDapur * 500 + mixDedak * 3500) / 100;
  const mixProtein = (mixSayur * 12 + mixTahu * 22 + mixDapur * 16 + mixDedak * 11) / 100;
  const mixRating = mixProtein >= 16 ? 'Sangat Baik 🔥' : (mixProtein >= 13 ? 'Cukup Baik 👍' : 'Kurang Protein ⚠️');
  const mixRatingColor = mixProtein >= 16 ? '#10b981' : (mixProtein >= 13 ? '#3b82f6' : '#d97706');

  // Maggot life cycle information
  const bsfPhases = {
    egg: {
      tabName: "🥚 Telur",
      name: "🥚 Telur (Hari 1-4)",
      desc: "Lalat BSF bertelur di celah media kering dekat pakan basah. Suhu ideal hangat (28°C-32°C). Telur akan menetas menjadi larva kecil dalam waktu 3-4 hari.",
      care: "Jaga agar sarang telur tetap kering dan terlindung dari sinar matahari langsung."
    },
    larva: {
      tabName: "🐛 Larva",
      name: "🐛 Larva (Hari 5-20)",
      desc: "Fase pertumbuhan utama di mana maggot sangat aktif memakan sampah organik. Ini adalah fase panen utama. Suhu ideal adalah 25°C-30°C dengan kelembaban optimal 60%-80%.",
      care: "Beri pakan organik yang mudah dicerna secara teratur dan kendalikan kelembaban agar media tidak becek."
    },
    prepupa: {
      tabName: "🪱 Prepupa",
      name: "🪱 Prepupa (Hari 21-25)",
      desc: "Larva berhenti makan, berganti kulit menjadi cokelat tua/hitam keras, dan merayap mencari tempat kering yang tinggi untuk bertransformasi.",
      care: "Sediakan jalur ramp agar prepupa merayap keluar dari media pakan basah secara mandiri."
    },
    pupa: {
      tabName: "🧫 Pupa",
      name: "🧫 Pupa (Hari 26-35)",
      desc: "Prepupa memasuki fase diam penuh (tidak bergerak dan tidak makan) untuk bertransformasi menjadi lalat dewasa di lingkungan yang kering dan gelap.",
      care: "Simpan pupa di tempat gelap, sejuk, kering, dan pastikan tidak terganggu oleh tikus/predator."
    },
    adult: {
      tabName: "🪰 Lalat",
      name: "🪰 Lalat BSF Dewasa (Hari 36+)",
      desc: "Lalat keluar dari pupa untuk kawin. Lalat dewasa tidak makan pakan padat (hanya minum embun/air) dan akan mati dalam 5-8 hari setelah kawin & bertelur.",
      care: "Sediakan kandang jaring dengan pencahayaan matahari cukup dan semprotan air embun harian agar lalat kawin dengan optimal."
    }
  };

  const getFarmingFeedback = (temp, hum) => {
    let tips = [];
    let score = 100;
    
    if (temp > 30.0) {
      tips.push("Suhu Kandang Terlalu Panas! Exhaust blower diaktifkan otomatis. Pastikan ada atap peneduh tambahan.");
      score -= 20;
    } else if (temp < 25.0) {
      tips.push("Suhu Terlalu Dingin! Laju pertumbuhan melambat. Kurangi kipas angin atau hidupkan lampu penghangat.");
      score -= 20;
    }
    
    if (hum > 80.0) {
      tips.push("Kelembaban Terlalu Tinggi! Media becek memicu amonia dan membunuh larva. Taburkan dedak kering.");
      score -= 20;
    } else if (hum < 50.0) {
      tips.push("Kelembaban Terlalu Rendah! Mist sprayer diaktifkan otomatis. Pastikan pakan organik cukup berair.");
      score -= 15;
    }

    if (tips.length === 0) {
      tips.push("Kondisi kandang optimal! Sistem otomatis menjaga suhu dan kelembaban dalam rentang ideal budidaya.");
    }
    
    return { score, tips };
  };

  const { score: cageHealthScore, tips: cageTips } = getFarmingFeedback(latestSensor.suhu, latestSensor.kelembaban);

  // Temperature logic
  const isOverheat = latestSensor.suhu > 30.0;
  const isTooCold = latestSensor.suhu < 25.0;
  const temperatureStatus = isOverheat 
    ? { text: '🚨 OVERHEAT (> 30°C)', color: '#ef4444', class: 'glow-danger' }
    : isTooCold 
    ? { text: '⚠️ TERLALU DINGIN (< 25°C)', color: '#f59e0b', class: 'glow-danger' }
    : { text: '🟢 OPTIMAL (25°C - 30°C)', color: '#10b981', class: 'glow-safe' };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div>
        {/* Logo Brand */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              borderRadius: '10px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 8px rgba(16, 185, 129, 0.15)'
            }}>
              <Activity size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: '800', margin: 0, letterSpacing: '-0.03em', color: '#0f172a' }}>
                Maggot Smart
              </h1>
              <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🟢 BSF Monitor
              </span>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', display: 'flex' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Links Group 1 */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ 
            fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', paddingLeft: '8px', marginBottom: '6px'
          }}>
            Menu Utama
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button onClick={() => handleTabChange('dashboard')} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
              background: activeTab === 'dashboard' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : '#64748b', textAlign: 'left', transition: 'all 0.2s ease', fontWeight: '700',
              boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none', whiteSpace: 'nowrap'
            }}>
              <Activity size={16} style={{ color: activeTab === 'dashboard' ? '#ffffff' : '#94a3b8' }} />
              <span style={{ fontSize: '12.5px' }}>Dashboard Live</span>
            </button>
            
            <button onClick={() => handleTabChange('daily')} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
              background: activeTab === 'daily' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'daily' ? '#ffffff' : '#64748b', textAlign: 'left', transition: 'all 0.2s ease', fontWeight: '700',
              boxShadow: activeTab === 'daily' ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none', whiteSpace: 'nowrap'
            }}>
              <Calendar size={16} style={{ color: activeTab === 'daily' ? '#ffffff' : '#94a3b8' }} />
              <span style={{ fontSize: '12.5px' }}>Pencatatan Harian</span>
            </button>

            <button onClick={() => handleTabChange('analytics')} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
              background: activeTab === 'analytics' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'analytics' ? '#ffffff' : '#64748b', textAlign: 'left', transition: 'all 0.2s ease', fontWeight: '700',
              boxShadow: activeTab === 'analytics' ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none', whiteSpace: 'nowrap'
            }}>
              <Database size={16} style={{ color: activeTab === 'analytics' ? '#ffffff' : '#94a3b8' }} />
              <span style={{ fontSize: '12.5px' }}>Analisis & FCR</span>
            </button>
          </div>
        </div>

        {/* Links Group 2 */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ 
            fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', paddingLeft: '8px', marginBottom: '6px'
          }}>
            Konfigurasi
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button onClick={() => handleTabChange('settings')} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
              background: activeTab === 'settings' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : '#64748b', textAlign: 'left', transition: 'all 0.2s ease', fontWeight: '700',
              boxShadow: activeTab === 'settings' ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none', whiteSpace: 'nowrap'
            }}>
              <Cpu size={16} style={{ color: activeTab === 'settings' ? '#ffffff' : '#94a3b8' }} />
              <span style={{ fontSize: '12.5px' }}>Pengaturan IoT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Widgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
        
        {/* Harvest Stats Widget */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <div style={{ background: '#dcfce7', borderRadius: '6px', padding: '6px', color: '#16a34a', display: 'flex' }}>
            <TrendingUp size={14} />
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '700' }}>TOTAL PANEN</div>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800' }}>{totalMaggot.toFixed(1)} kg Maggot</div>
          </div>
        </div>

        {/* Connection status widget */}
        <div style={{
          padding: '10px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Koneksi Modul
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={systemStatus.data_source === 'Simulator' || systemStatus.mqtt_connected ? 'glow-safe' : 'glow-danger'} style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: systemStatus.data_source === 'Simulator' ? '#10b981' : (systemStatus.mqtt_connected ? '#10b981' : '#ef4444')
            }}></span>
            <span style={{ fontSize: '11px', fontWeight: '750', color: '#334155' }}>
              {systemStatus.data_source === 'Simulator' ? 'Mode Simulator' : (systemStatus.mqtt_connected ? 'MQTT Connect' : 'Modul Offline')}
            </span>
          </div>
        </div>

        {/* User profile & Logout */}
        <div style={{
          padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800'
            }}>
              OM
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser?.name || "Owner Maggot"}
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>
                {currentUser?.role || "Peternak BSF"}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%', padding: '6px 10px', border: '1px solid #fee2e2', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.04)',
              color: '#ef4444', fontSize: '10.5px', fontWeight: '800', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer'
            }}
          >
            ❌ Keluar (Logout)
          </button>
        </div>
      </div>
    </>
  );

  if (!currentUser) {
    return (
      <div style={{
        display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 90.2%), #f8fafc',
        fontFamily: "'Outfit', sans-serif", padding: '20px', boxSizing: 'border-box'
      }}>
        {/* Floating notifications */}
        {notification && (
          <div style={{
            position: 'fixed', top: '24px', right: '24px',
            background: notification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff', padding: '14px 28px', borderRadius: '14px', zIndex: 1000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {notification.message}
          </div>
        )}

        <div className="premium-panel" style={{
          width: '100%', maxWidth: '400px', padding: '40px 32px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '24px', background: '#ffffff', border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(148, 163, 184, 0.05)', borderRadius: '24px'
        }}>
          {/* Logo brand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.15)'
            }}>
              <Activity size={28} color="#fff" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '850', margin: 0, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Maggot Smart
              </h1>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'block', marginTop: '4px' }}>
                Masuk untuk mengelola kandang lalat BSF
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {loginError && (
              <div style={{
                background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: '10px',
                fontSize: '13px', fontWeight: '700', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '750', color: '#475569' }}>Username</label>
              <input 
                type="text" 
                value={usernameInput} 
                onChange={(e) => setUsernameInput(e.target.value)} 
                placeholder="admin" 
                required 
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  fontSize: '14.5px', fontWeight: '600', boxSizing: 'border-box', outline: 'none'
                }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '750', color: '#475569' }}>Password</label>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                placeholder="••••••••" 
                required 
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1',
                  fontSize: '14.5px', fontWeight: '600', boxSizing: 'border-box', outline: 'none'
                }} 
              />
            </div>

            <button type="submit" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff',
              border: 'none', borderRadius: '14px', padding: '14px', fontSize: '14.5px', fontWeight: '750',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.12)', cursor: 'pointer', transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px'
            }}>
              Masuk Dashboard
            </button>
          </form>

          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textAlign: 'center', marginTop: '8px' }}>
            Username: <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>admin</code> &middot; Password: <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>admin123</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', flexDirection: 'row' }}>
      
      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <aside style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          boxShadow: '2px 0 16px rgba(148, 163, 184, 0.03)',
          justifyContent: 'space-between',
          height: '100vh',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0
        }}>
          <SidebarContent />
        </aside>
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      {isMobile && sidebarOpen && (
        <>
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
              zIndex: 9999
            }}
          />
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '240px', background: '#ffffff', zIndex: 10000,
            display: 'flex', flexDirection: 'column', padding: '20px 16px',
            boxShadow: '10px 0 30px rgba(0,0,0,0.1)', justifyStyle: 'space-between',
            boxSizing: 'border-box'
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* MAIN CONTENT AREA */}
      <main style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        overflowY: 'auto', 
        padding: isMobile ? '20px' : '40px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* MOBILE TOP HEADER BAR */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
            padding: '12px 16px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: '8px', padding: '6px', display: 'flex' }}>
                <Activity size={14} color="#fff" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Maggot Smart</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(true)}
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', display: 'flex', color: '#334155'
              }}
            >
              <Menu size={18} />
            </button>
          </div>
        )}

        {/* Floating notifications */}
        {notification && (
          <div style={{
            position: 'fixed', top: '24px', right: '24px',
            background: notification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff', padding: '14px 28px', borderRadius: '14px', zIndex: 1000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {notification.message}
          </div>
        )}

        {/* TOP HEADER */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '32px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px'
        }}>
          <div>
            <h2 className="gradient-text" style={{ fontSize: isMobile ? '26px' : '34px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.2' }}>
              {activeTab === 'dashboard' && 'Monitoring Real-Time'}
              {activeTab === 'daily' && 'Pencatatan Harian'}
              {activeTab === 'analytics' && 'Analisis Pertumbuhan Maggot'}
              {activeTab === 'settings' && 'Konfigurasi Sistem IoT'}
            </h2>
            <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: isMobile ? '13px' : '14.5px', fontWeight: '500' }}>
              {activeTab === 'dashboard' && 'Status kesehatan kandang, sensor real-time, dan asisten pemeliharaan.'}
              {activeTab === 'daily' && 'Log harian berat pakan dan biomassa untuk analisis FCR.'}
              {activeTab === 'analytics' && 'Analisis rasio pakan maggot dan grafik pertumbuhan panen.'}
              {activeTab === 'settings' && 'Pengaturan MQTT broker dan modul sensor IoT fisik.'}
            </p>
          </div>
          
          <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: '700', background: '#ffffff', padding: '10px 20px', borderRadius: '999px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            📅 {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </header>

        {/* ---------------- TAB CONTENT: DASHBOARD ---------------- */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* FARMER ALERTS & CAGE HEALTH */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '24px' }}>
              
              {/* Cage Health Score */}
              <div className="premium-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}>
                <div style={{ background: '#dcfce7', borderRadius: '50%', padding: '16px', color: '#16a34a', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartPulse size={36} />
                </div>
                <h4 style={{ fontSize: '14px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Kesehatan Kandang</h4>
                <div style={{ fontSize: '42px', fontWeight: '850', color: cageHealthScore >= 80 ? '#16a34a' : (cageHealthScore >= 60 ? '#d97706' : '#dc2626') }}>
                  {cageHealthScore}%
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                  {cageHealthScore === 100 ? 'Suhu & Kelembaban Sempurna!' : 'Butuh Sedikit Penyesuaian Kandang'}
                </span>
              </div>

              {/* Actionable Advice List */}
              <div className="premium-panel" style={{ padding: '24px', background: '#ffffff' }}>
                <h4 style={{ fontSize: '14px', color: '#334155', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <Info size={16} style={{ color: '#3b82f6' }} />
                  💡 Panduan & Asisten Budidaya Maggot Anda:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cageTips.map((tip, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#f8fafc', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #3b82f6' }}>
                      <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: '600', lineHeight: '1.4' }}>
                        {tip}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Farmer Checklist */}
              <div className="premium-panel" style={{ padding: '24px', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '14px', color: '#334155', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  📋 Jadwal & Checklist Harian Peternak:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {tasks.map(task => (
                    <label key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }}>
                      <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => toggleTask(task.id)}
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#10b981' }} 
                      />
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: task.completed ? '#94a3b8' : '#334155', textDecoration: task.completed ? 'line-through' : 'none' }}>
                        {task.text}
                      </span>
                    </label>
                  ))}
                </div>
                
                {/* Progress bar */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px' }}>
                    <span>PROGRESS HARIAN</span>
                    <span>{taskCompletionRate}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${taskCompletionRate}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: '99px', transition: 'all 0.3s ease' }}></div>
                  </div>
                </div>
              </div>

            </div>



            {/* METRICS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
              {/* Suhu */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', background: isOverheat ? 'rgba(239, 68, 68, 0.02)' : '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suhu Kandang</span>
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '8px', borderRadius: '10px' }}>
                    <Thermometer color="#ef4444" size={20} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="metric-highlight">{latestSensor.suhu}</span>
                  <span style={{ fontSize: '20px', color: '#475569', fontWeight: '700' }}>°C</span>
                </div>
                <div style={{
                  marginTop: '20px', alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700',
                  background: isOverheat || isTooCold ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  color: isOverheat || isTooCold ? '#ef4444' : '#10b981',
                  border: `1px solid ${isOverheat || isTooCold ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`
                }}>
                  {temperatureStatus.text}
                </div>
              </div>

              {/* Kelembaban */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kelembaban</span>
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '8px', borderRadius: '10px' }}>
                    <Droplets color="#3b82f6" size={20} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="metric-highlight">{latestSensor.kelembaban}</span>
                  <span style={{ fontSize: '20px', color: '#475569', fontWeight: '700' }}>%</span>
                </div>
                <div style={{
                  marginTop: '20px', alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '700',
                  background: latestSensor.kelembaban >= 60 && latestSensor.kelembaban <= 80 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  color: latestSensor.kelembaban >= 60 && latestSensor.kelembaban <= 80 ? '#10b981' : '#d97706',
                  border: `1px solid ${latestSensor.kelembaban >= 60 && latestSensor.kelembaban <= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 119, 6, 0.15)'}`
                }}>
                  {latestSensor.kelembaban >= 60 && latestSensor.kelembaban <= 80 ? '🟢 OPTIMAL (60%-80%)' : '⚠️ PERLU DIATUR'}
                </div>
              </div>

              {/* Pakan */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pakan Hari Ini</span>
                  <div style={{ background: 'rgba(124, 58, 237, 0.08)', padding: '8px', borderRadius: '10px' }}>
                    <Scale color="#7c3aed" size={20} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="metric-highlight">{latestDaily.berat_pakan}</span>
                  <span style={{ fontSize: '20px', color: '#475569', fontWeight: '700' }}>kg</span>
                </div>
                <div style={{ marginTop: '22px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  Input: {latestDaily.tanggal || 'Belum ada data'}
                </div>
              </div>

              {/* Maggot */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Berat Maggot</span>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '8px', borderRadius: '10px' }}>
                    <Scale color="#10b981" size={20} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="metric-highlight" style={{ color: '#10b981' }}>{latestDaily.berat_maggot}</span>
                  <span style={{ fontSize: '20px', color: '#475569', fontWeight: '700' }}>kg</span>
                </div>
                <div style={{ marginTop: '22px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  Input: {latestDaily.tanggal || 'Belum ada data'}
                </div>
              </div>
            </div>

            {/* BSF LIFE CYCLE PHASE ASSISTANT */}
            <div className="premium-panel" style={{ padding: '32px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Clock size={20} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>🌱 Panduan Tahapan Fase Budidaya Lalat BSF</h3>
              </div>
              
              {/* Cycle Age Tracker Control Card */}
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', 
                background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', 
                border: '1.5px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' 
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status Budidaya Aktif Anda
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '850', color: '#0f172a', marginTop: '2px' }}>
                    Hari ke-{cycleAge} ({
                      activePhase === 'egg' ? 'Fase Telur' : 
                      activePhase === 'larva' ? 'Fase Larva' : 
                      activePhase === 'prepupa' ? 'Fase Prepupa' : 
                      activePhase === 'pupa' ? 'Fase Pupa' : 'Fase Lalat Dewasa BSF'
                    })
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '750', color: '#475569' }}>Mulai Budidaya:</label>
                  <input 
                    type="date" 
                    value={cycleStartDate} 
                    onChange={(e) => setCycleStartDate(e.target.value)} 
                    style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #cbd5e1', borderRadius: '10px' }} 
                  />
                </div>
              </div>

              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '-8px', marginBottom: '20px', fontWeight: '500' }}>
                Pilih fase siklus lalat BSF di bawah ini untuk melihat panduan perawatan yang disarankan oleh pakar.
              </p>
              
              {/* Tab buttons for BSF stages */}
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }}>
                {Object.keys(bsfPhases).map((phaseKey) => (
                  <button 
                    key={phaseKey}
                    onClick={() => setSelectedPhase(phaseKey)}
                    style={{
                      border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '750',
                      background: selectedPhase === phaseKey ? '#dcfce7' : '#f1f5f9',
                      color: selectedPhase === phaseKey ? '#15803d' : '#64748b',
                      transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                      border: phaseKey === activePhase ? '1.5px solid #10b981' : 'none'
                    }}
                  >
                    {bsfPhases[phaseKey].tabName} {phaseKey === activePhase && " 🎯"}
                  </button>
                ))}
              </div>

              {/* Active stage details wrapper */}
              <div style={{ display: 'flex', gap: '20px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '24px', borderRadius: '16px', borderLeft: '5px solid #3b82f6', border: '1px solid #e2e8f0', borderLeftColor: '#3b82f6' }}>
                  {selectedPhase === activePhase && (
                    <div style={{ 
                      display: 'inline-flex', gap: '6px', alignItems: 'center', background: '#dcfce7', 
                      color: '#15803d', padding: '6px 12px', borderRadius: '99px', fontSize: '11px', 
                      fontWeight: '800', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' 
                    }}>
                      🎯 Fase Budidaya Aktif (Hari ke-{cycleAge})
                    </div>
                  )}
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', margin: '0 0 10px 0' }}>
                    {bsfPhases[selectedPhase].name}
                  </h4>
                  <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
                    {bsfPhases[selectedPhase].desc}
                  </p>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: '24px', borderRadius: '16px', border: '1px solid #dcfce7', borderLeft: '5px solid #10b981' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#14532d', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={16} /> Rekomendasi Tindakan Peternak:
                  </h4>
                  <p style={{ fontSize: '13.5px', color: '#15803d', fontWeight: '650', lineHeight: '1.6', margin: 0 }}>
                    {bsfPhases[selectedPhase].care}
                  </p>
                </div>
              </div>
            </div>

            {/* CHART */}
            <div className="premium-panel" style={{ padding: isMobile ? '20px' : '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Grafik Kondisi Kandang (Real-Time)</h3>
                
                {/* Time Range Selector for premium UX */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Tampilkan data:</span>
                  {[10, 20, 50].map((limit) => (
                    <button
                      key={limit}
                      onClick={() => setChartLimit(limit)}
                      style={{
                        border: 'none', background: chartLimit === limit ? '#3b82f6' : '#f1f5f9',
                        color: chartLimit === limit ? '#ffffff' : '#475569',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '750',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {limit} Poin
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ width: '100%', height: isMobile ? '240px' : '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sensorsData.slice(-chartLimit)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="suhuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="waktu" stroke="#94a3b8" style={{ fontSize: '11px', fontWeight: '600' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '11px', fontWeight: '600' }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }} />
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="suhu" name="Suhu (°C)" stroke="#ef4444" fillOpacity={1} fill="url(#suhuGrad)" strokeWidth={3} />
                    <Area type="monotone" dataKey="kelembaban" name="Kelembaban (%)" stroke="#3b82f6" fillOpacity={1} fill="url(#humGrad)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SENSOR LOGS TABLE */}
            <div className="premium-panel" style={{ padding: isMobile ? '16px' : '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Histori Log Sensor</h3>
                <button 
                  onClick={handleClearSensors}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.12)', padding: '10px 18px', borderRadius: '12px', fontSize: '13.5px', transition: '0.2s', fontWeight: '700'
                  }}
                >
                  <Trash2 size={16} />
                  Hapus Log
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Waktu Rekam</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suhu</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kelembaban</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alarm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensorsData.slice().reverse().slice(0, 8).map((log, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: '500' }}>
                        <td style={{ padding: '14px 18px', color: '#475569' }}>{log.waktu}</td>
                        <td style={{ padding: '14px 18px', color: log.suhu >= 30 ? '#ef4444' : '#0f172a', fontWeight: '600' }}>{log.suhu} °C</td>
                        <td style={{ padding: '14px 18px', color: '#0f172a' }}>{log.kelembaban} %</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                            background: log.suhu >= 30 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: log.suhu >= 30 ? '#ef4444' : '#10b981'
                          }}>
                            {log.suhu >= 30 ? '🔥 OVERHEAT' : '🟢 AMAN'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sensorsData.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontWeight: '500' }}>
                          Belum ada log sensor terekam di database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------- TAB CONTENT: DAILY INPUT FORM ---------------- */}
        {activeTab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div className="premium-panel" style={{ padding: isMobile ? '20px' : '36px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>📝 Form Pencatatan Harian</h3>
              <form onSubmit={handleSaveDaily} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Pilih Tanggal</label>
                    <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Jenis Pakan Diberikan</label>
                    <select value={jenisPakan} onChange={(e) => setJenisPakan(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', fontWeight: '600' }}>
                      <option value="Limbah Sayur/Buah">Limbah Sayur/Buah</option>
                      <option value="Restoran/Dapur">Restoran/Dapur</option>
                      <option value="Ampas Tahu">Ampas Tahu</option>
                      <option value="Dedak/Lainnya">Dedak/Lainnya</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Berat Pakan Diberikan (kg)</label>
                    <input type="number" step="0.1" min="0" value={feedWeight} onChange={(e) => setFeedWeight(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Berat Maggot Hasil/Panen (kg)</label>
                    <input type="number" step="0.1" min="0" value={maggotWeight} onChange={(e) => setMaggotWeight(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} required />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Estimasi Kualitas Maggot</label>
                  <select value={kualitasMaggot} onChange={(e) => setKualitasMaggot(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', fontWeight: '600' }}>
                    <option value="Sangat Baik">Sangat Baik (Premium - Gemuk & Aktif)</option>
                    <option value="Baik">Baik (Standar)</option>
                    <option value="Kurang">Kurang (Kecil/Kurang Nutrisi)</option>
                  </select>
                </div>

                <button type="submit" style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff',
                  border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14.5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)', fontWeight: '700', cursor: 'pointer'
                }}>
                  <Save size={18} />
                  Simpan Catatan
                </button>
              </form>
            </div>

            {/* TABLE FOR MANUAL INPUTS */}
            <div className="premium-panel" style={{ padding: isMobile ? '16px' : '32px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>📋 Riwayat Data Manual Harian</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tanggal</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pakan</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jenis Pakan</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Maggot</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kualitas</th>
                      <th style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rasio FCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyLogs.slice().reverse().map((log, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: '500' }}>
                        <td style={{ padding: '14px 18px', color: '#3b82f6', fontWeight: '600' }}>{log.tanggal}</td>
                        <td style={{ padding: '14px 18px', color: '#0f172a' }}>{log.berat_pakan} kg</td>
                        <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '13.5px' }}>{log.jenis_pakan || "Limbah Sayur/Buah"}</td>
                        <td style={{ padding: '14px 18px', color: '#10b981', fontWeight: '600' }}>{log.berat_maggot} kg</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                            background: log.kualitas_maggot === 'Sangat Baik' ? '#dcfce7' : (log.kualitas_maggot === 'Kurang' ? '#fee2e2' : '#f1f5f9'),
                            color: log.kualitas_maggot === 'Sangat Baik' ? '#15803d' : (log.kualitas_maggot === 'Kurang' ? '#ef4444' : '#475569')
                          }}>
                            {log.kualitas_maggot || 'Baik'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#475569', fontWeight: '700' }}>
                          {(log.berat_pakan / (log.berat_maggot || 1)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {dailyLogs.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontWeight: '500' }}>
                          Belum ada pencatatan manual harian yang diinput.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB CONTENT: ANALYTICS ---------------- */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="premium-panel" style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pakan Diberikan</h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="metric-highlight">{totalPakan.toFixed(1)}</span>
                  <span style={{ fontSize: '18px', color: '#475569', fontWeight: '700' }}>kg</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '14px 0 0 0', fontWeight: '500' }}>Akumulasi berat pakan yang telah dikonsumsi.</p>
              </div>

              <div className="premium-panel" style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Biomassa Maggot</h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="metric-highlight" style={{ color: '#10b981' }}>{totalMaggot.toFixed(1)}</span>
                  <span style={{ fontSize: '18px', color: '#10b981', fontWeight: '700' }}>kg</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '14px 0 0 0', fontWeight: '500' }}>Total akumulasi berat maggot hasil panen.</p>
              </div>

              <div className="premium-panel" style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FCR Rata-Rata</h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="metric-highlight" style={{ color: '#3b82f6' }}>{averageFCR.toFixed(2)}</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '14px 0 0 0', fontWeight: '500' }}>Rasio konversi pakan ke daging. Lebih rendah = Lebih efisien.</p>
              </div>
            </div>

            {/* FARMER INFORMATION BOX ON FCR */}
            <div className="premium-panel" style={{ padding: '28px', background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ fontSize: '15px', color: '#1e3a8a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Info size={18} style={{ color: '#3b82f6' }} />
                  Apa Arti Rasio FCR Bagi Budidaya Maggot Anda?
                </h4>
                <button 
                  onClick={exportToCSV}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: '#fff',
                    border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '750',
                    cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)'
                  }}
                >
                  📥 Unduh Laporan CSV
                </button>
              </div>
              <p style={{ fontSize: '13.5px', color: '#1e40af', fontWeight: '500', lineHeight: '1.5', marginTop: '12px', marginBottom: 0 }}>
                FCR (Feed Conversion Ratio) saat ini adalah <strong>{averageFCR.toFixed(2)}</strong>. Artinya, untuk menghasilkan 1 kg maggot BSF, Anda rata-rata mengalokasikan pakan organik sebanyak {averageFCR.toFixed(2)} kg. 
                Dalam budidaya maggot BSF, FCR di kisaran <strong>2.0 - 3.5</strong> tergolong sangat efisien dan bagus. FCR yang optimal membantu menghemat biaya pakan dan mengoptimalkan reduksi sampah organik!
              </p>
            </div>

            {/* FINANCIAL CALCULATOR, ESTIMATION PLANNER & FEED FORMULATOR PANEL */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              
              {/* Financial Returns Card */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💰 Kalkulator Hasil Finansial Budidaya
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Harga Jual Maggot (per kg):</label>
                    <input 
                      type="number" 
                      value={hargaMaggot} 
                      onChange={(e) => saveFinancialRates(parseInt(e.target.value) || 0, hargaPakan)} 
                      style={{ width: '110px', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', textAlign: 'right' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Harga Pakan/Bahan (per kg):</label>
                    <input 
                      type="number" 
                      value={hargaPakan} 
                      onChange={(e) => saveFinancialRates(hargaMaggot, parseInt(e.target.value) || 0)} 
                      style={{ width: '110px', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', textAlign: 'right' }} 
                    />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    <span>Total Pendapatan:</span>
                    <span style={{ color: '#0f172a', fontWeight: '700' }}>Rp {(totalMaggot * hargaMaggot).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                    <span>Estimasi Biaya Pakan:</span>
                    <span style={{ color: '#ef4444', fontWeight: '700' }}>Rp {(totalPakan * hargaPakan).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: '800' }}>
                    <span style={{ color: '#0f172a' }}>Keuntungan Bersih:</span>
                    <span style={{ color: '#10b981' }}>Rp {((totalMaggot * hargaMaggot) - (totalPakan * hargaPakan)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Harvest Estimation Scheduler Card */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 Kalender & Proyeksi Panen Optimal
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Tanggal Mulai Siklus:</span>
                    <strong style={{ color: '#0f172a' }}>{cycleStartDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Usia Budidaya Saat Ini:</span>
                    <strong style={{ color: '#3b82f6' }}>Hari ke-{cycleAge}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Jendela Panen Terbaik:</span>
                    <strong style={{ color: '#10b981' }}>Hari 15 - Hari 20</strong>
                  </div>
                </div>

                <div style={{ 
                  marginTop: 'auto', padding: '14px', borderRadius: '12px', textAlign: 'center', fontWeight: '750', fontSize: '13.5px',
                  background: cycleAge < 15 ? 'rgba(59, 130, 246, 0.06)' : (cycleAge <= 20 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)'),
                  color: cycleAge < 15 ? '#3b82f6' : (cycleAge <= 20 ? '#10b981' : '#ef4444'),
                  border: `1.5px solid ${cycleAge < 15 ? 'rgba(59, 130, 246, 0.15)' : (cycleAge <= 20 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)')}`
                }}>
                  {cycleAge < 15 ? (
                    <span>⏳ {15 - cycleAge} Hari lagi menuju masa panen optimal</span>
                  ) : (
                    cycleAge <= 20 ? (
                      <span>🎉 SIAP PANEN! Maggot berada pada bobot & kualitas puncak</span>
                    ) : (
                      <span>⚠️ Melewati fase larva (telah menjadi prepupa/pupa)</span>
                    )
                  )}
                </div>
              </div>

              {/* Feed Mix Formulation Card */}
              <div className="premium-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧪 Formula Pakan & Protein Mix
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Limbah Sayur/Buah (%):</span>
                    <input 
                      type="number" 
                      min="0" max="100"
                      value={mixSayur} 
                      onChange={(e) => setMixSayur(parseInt(e.target.value) || 0)} 
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', textAlign: 'right', fontWeight: '700' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Ampas Tahu (%):</span>
                    <input 
                      type="number" 
                      min="0" max="100"
                      value={mixTahu} 
                      onChange={(e) => setMixTahu(parseInt(e.target.value) || 0)} 
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', textAlign: 'right', fontWeight: '700' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Restoran/Dapur (%):</span>
                    <input 
                      type="number" 
                      min="0" max="100"
                      value={mixDapur} 
                      onChange={(e) => setMixDapur(parseInt(e.target.value) || 0)} 
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', textAlign: 'right', fontWeight: '700' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Dedak Padi (%):</span>
                    <input 
                      type="number" 
                      min="0" max="100"
                      value={mixDedak} 
                      onChange={(e) => setMixDedak(parseInt(e.target.value) || 0)} 
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', textAlign: 'right', fontWeight: '700' }} 
                    />
                  </div>
                </div>

                {/* Formulation results */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                    <span>Total Formula:</span>
                    <span style={{ color: mixTotal === 100 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                      {mixTotal}% {mixTotal === 100 ? "✓" : "⚠️ (Harus 100%)"}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                    <span>Estimasi Biaya Pakan:</span>
                    <span style={{ color: '#0f172a', fontWeight: '700' }}>
                      Rp {mixCost.toFixed(0)} / kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                    <span>Estimasi Protein:</span>
                    <span style={{ color: '#3b82f6', fontWeight: '700' }}>
                      {mixProtein.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px', fontSize: '12px', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Kualitas Campuran:</span>
                    <span style={{ color: mixRatingColor }}>
                      {mixRating}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* BAR CHART */}
            <div className="premium-panel" style={{ padding: isMobile ? '16px' : '32px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', marginBottom: '28px' }}>Grafik Pertumbuhan Maggot vs Alokasi Pakan</h3>
              
              <div style={{ width: '100%', height: isMobile ? '240px' : '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyLogs} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="tanggal" stroke="#94a3b8" style={{ fontSize: '11px', fontWeight: '600' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '11px', fontWeight: '600' }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="berat_pakan" name="Berat Pakan (kg)" fill="#818cf8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="berat_maggot" name="Berat Maggot (kg)" fill="#34d399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ---------------- TAB CONTENT: SETTINGS ---------------- */}
        {activeTab === 'settings' && (
          <div className="premium-panel" style={{ padding: isMobile ? '20px' : '36px', maxWidth: '640px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={22} style={{ color: '#3b82f6' }} />
              Konfigurasi Sumber Data Sensor
            </h3>
            
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Sumber Data Sensor</label>
                <select value={sourceForm} onChange={(e) => setSourceForm(e.target.value)} style={{ width: '100%' }} disabled>
                  <option value="MQTT">🔌 MQTT Broker (Sensor ESP32)</option>
                </select>
                <small style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '600' }}>Mode Simulator dinonaktifkan. Data bersumber langsung dari Broker MQTT fisik ESP32.</small>
              </div>

              {sourceForm === 'MQTT' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>MQTT Broker Host IP</label>
                      <input type="text" value={hostForm} onChange={(e) => setHostForm(e.target.value)} placeholder="e.g. 192.168.24.251" style={{ width: '100%', boxSizing: 'border-box' }} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Port</label>
                      <input type="number" value={portForm} onChange={(e) => setPortForm(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} required />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>Topic</label>
                    <input type="text" value={topicForm} onChange={(e) => setTopicForm(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} required />
                  </div>
                </>
              )}

              <button type="submit" style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff',
                border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14.5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)', marginTop: '12px'
              }}>
                <Save size={18} />
                Terapkan & Simpan
              </button>

            </form>
          </div>
        )}

      </main>

    </div>
  );
}
