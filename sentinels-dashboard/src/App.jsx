import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// FIREBASE IMPORTS
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// FireStore block
const firebaseConfig = {
  apiKey: "AIzaSyC2q3ZC8E8_oXU8DdjIFayual6fPzkbAZ4",
  authDomain: "tacmap-baf51.firebaseapp.com",
  projectId: "tacmap-baf51",
  storageBucket: "tacmap-baf51.firebasestorage.app",
  messagingSenderId: "428655567140",
  appId: "1:428655567140:web:b359a521aef58c083d93b1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// BASE LAYER (Hardcoded - Appears on Reload)
const BASE_LAYER = {
  THREATS: [
    { id: 101, name: "MSC United VIII", lat: 13.2, lng: 42.9, type: "Missile Strike", faction: "Houthi Forces" },
    { id: 102, name: "Maersk Hangzhou", lat: 14.8, lng: 41.9, type: "Anti-Ship Missile", faction: "Houthi Forces" },
    { id: 201, name: "Sim: W.C.C. Raid", lat: -5.8, lng: 11.5, type: "Raid", faction: "West Congo Cougars" }
  ],
  ASSETS: [
    { id: 301, name: "FOB: The Crib", lat: 44.7, lng: -63.6, type: "Safehouse", faction: "My Squad" }
  ],
  LOGISTICS: [
    { id: 401, name: "Refuel: Pizza Hut", lat: 44.66, lng: -63.62, type: "Nutrition", faction: "Supply Chain" }
  ]
};

const createIcon = (color, isPulsing) => {
  const pulseClass = isPulsing ? 'pulse-ring' : '';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="dot-container"><div class="${pulseClass}" style="border-color: ${color}"></div><div class="dot" style="background-color: ${color}; box-shadow: 0 0 8px ${color};"></div></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10]
  });
};

function MapClickHandler({ activeMode, onAddPoint }) {
  useMapEvents({ click(e) { if (activeMode) onAddPoint(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function App() {
  const [cloudData, setCloudData] = useState({ THREATS: [], ASSETS: [], LOGISTICS: [] });
  // NEW: Tracks which BASE items you have temporarily deleted
  const [localHiddenIds, setLocalHiddenIds] = useState([]);
  
  const [activeIncident, setActiveIncident] = useState(null);
  const [addMode, setAddMode] = useState(null);
  const [layers, setLayers] = useState({ THREATS: true, ASSETS: true, LOGISTICS: true });
  const [status, setStatus] = useState("CONNECTING...");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "overlay_layer"), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setCloudData(docSnapshot.data());
        setStatus("ONLINE // SYNCED");
      } else {
        setDoc(doc(db, "config", "overlay_layer"), { THREATS: [], ASSETS: [], LOGISTICS: [] });
        setStatus("DB INITIALIZED");
      }
    }, (error) => { console.error(error); setStatus("OFFLINE"); });
    return () => unsub();
  }, []);

  const syncToCloud = async (newData) => {
    setCloudData(newData);
    await setDoc(doc(db, "config", "overlay_layer"), newData);
  };

  const handleAddPoint = (lat, lng) => {
    const types = { THREATS: "Hostile", ASSETS: "FOB", LOGISTICS: "Refuel" };
    const factions = { THREATS: "Unknown", ASSETS: "Ally", LOGISTICS: "Public" };
    const newPoint = {
      id: Date.now(), 
      name: `New ${types[addMode]}`, 
      lat, lng, type: "User Added", faction: factions[addMode]
    };
    const newData = { ...cloudData, [addMode]: [...cloudData[addMode], newPoint] };
    syncToCloud(newData);
    setAddMode(null);
  };

  // deletion and renaming functions
  const deletePoint = (cat, id) => {
    if (id < 9999) {
      // It's a BASE LAYER point -> Hide it locally only
      setLocalHiddenIds(prev => [...prev, id]);
    } else {
      // It's a USER point -> Delete from Firebase globally
      const newData = { ...cloudData, [cat]: cloudData[cat].filter(item => item.id !== id) };
      syncToCloud(newData);
    }
    setActiveIncident(null);
  };

  const renamePoint = (cat, id) => {
    if (id < 9999) { alert("CANNOT RENAME BASE INTEL."); return; }
    const newName = prompt("NEW NAME:", activeIncident.name);
    if (!newName) return;
    const newData = { ...cloudData, [cat]: cloudData[cat].map(i => i.id === id ? { ...i, name: newName } : i) };
    syncToCloud(newData);
    setActiveIncident(null);
  };

  const toggleLayer = (l) => setLayers(prev => ({ ...prev, [l]: !prev[l] }));

  // COMBINE & FILTER DATA
  // 1. Take Base Layer -> Remove hidden ones
  // 2. Add Cloud Layer
  const visibleBase = (cat) => BASE_LAYER[cat].filter(i => !localHiddenIds.includes(i.id));
  
  const combinedData = {
    THREATS: [...visibleBase('THREATS'), ...cloudData.THREATS],
    ASSETS: [...visibleBase('ASSETS'), ...cloudData.ASSETS],
    LOGISTICS: [...visibleBase('LOGISTICS'), ...cloudData.LOGISTICS],
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, color: status.includes('OFFLINE') ? 'red' : '#00ff99', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', background: 'rgba(0,0,0,0.8)', padding: '5px' }}>
        [ NET: {status} ]
      </div>

      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.85)', padding: '15px', borderLeft: '2px solid #00ff99', color: '#00ff99', fontFamily: 'monospace' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>GLOBAL OPS</h2>
        {['THREATS', 'ASSETS', 'LOGISTICS'].map(cat => (
          <div key={cat} onClick={() => toggleLayer(cat)} style={{ cursor: 'pointer', marginBottom: '8px', opacity: layers[cat] ? 1 : 0.4 }}>
            [{layers[cat] ? 'ON' : 'OFF'}] {cat}
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '10px' }}>
        <button onClick={() => setAddMode(addMode === 'THREATS' ? null : 'THREATS')} style={{ padding: '10px 20px', background: addMode === 'THREATS' ? '#ff0055' : 'rgba(0,0,0,0.8)', border: '1px solid #ff0055', color: '#fff', fontFamily: 'monospace', cursor: 'pointer', boxShadow: addMode === 'THREATS' ? '0 0 15px #ff0055' : 'none' }}>+ HOSTILE</button>
        <button onClick={() => setAddMode(addMode === 'ASSETS' ? null : 'ASSETS')} style={{ padding: '10px 20px', background: addMode === 'ASSETS' ? '#00ff99' : 'rgba(0,0,0,0.8)', border: '1px solid #00ff99', color: '#fff', fontFamily: 'monospace', cursor: 'pointer', boxShadow: addMode === 'ASSETS' ? '0 0 15px #00ff99' : 'none' }}>+ ASSET</button>
        <button onClick={() => setAddMode(addMode === 'LOGISTICS' ? null : 'LOGISTICS')} style={{ padding: '10px 20px', background: addMode === 'LOGISTICS' ? '#00ccff' : 'rgba(0,0,0,0.8)', border: '1px solid #00ccff', color: '#fff', fontFamily: 'monospace', cursor: 'pointer', boxShadow: addMode === 'LOGISTICS' ? '0 0 15px #00ccff' : 'none' }}>+ REFUEL</button>
      </div>

      {addMode && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: '20px', fontWeight: 'bold', pointerEvents: 'none', zIndex: 900, textShadow: '0 0 10px black' }}>[ CLICK TO PLACE {addMode} ]</div>}

      <MapContainer center={[20, 10]} zoom={3} style={{ width: '100%', height: '100%', background: '#000' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' />
        <MapClickHandler activeMode={addMode} onAddPoint={handleAddPoint} />
        
        {layers.THREATS && combinedData.THREATS.map(i => <Marker key={i.id} position={[i.lat, i.lng]} icon={createIcon('#ff0055', true)} eventHandlers={{ click: () => setActiveIncident({...i, category: 'THREATS'}) }} />)}
        {layers.ASSETS && combinedData.ASSETS.map(i => <Marker key={i.id} position={[i.lat, i.lng]} icon={createIcon('#00ff99', false)} eventHandlers={{ click: () => setActiveIncident({...i, category: 'ASSETS'}) }} />)}
        {layers.LOGISTICS && combinedData.LOGISTICS.map(i => <Marker key={i.id} position={[i.lat, i.lng]} icon={createIcon('#00ccff', false)} eventHandlers={{ click: () => setActiveIncident({...i, category: 'LOGISTICS'}) }} />)}
      </MapContainer>

      {activeIncident && (
        <div style={{ position: 'absolute', bottom: 80, right: 30, zIndex: 1000, background: 'rgba(0, 20, 10, 0.95)', border: '1px solid #fff', padding: '20px', width: '300px', color: '#fff', fontFamily: 'monospace' }}>
          <h3 style={{ margin: 0, color: '#00ff99' }}>{activeIncident.name}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '10px' }}>
            <button onClick={() => renamePoint(activeIncident.category, activeIncident.id)} style={{ background: '#333', border: '1px solid #00ff99', color: '#00ff99', padding: '5px', cursor: 'pointer' }}>RENAME</button>
            <button onClick={() => deletePoint(activeIncident.category, activeIncident.id)} style={{ background: '#333', border: '1px solid red', color: 'red', padding: '5px', cursor: 'pointer' }}>DELETE</button>
          </div>

          <button onClick={() => setActiveIncident(null)} style={{ background: 'transparent', border: 'none', color: '#fff', padding: '5px', cursor: 'pointer', marginTop: '10px', width: '100%', textDecoration: 'underline' }}>CLOSE</button>
        </div>
      )}
    </div>
  );
}

export default App;