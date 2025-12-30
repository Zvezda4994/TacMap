import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// DEFAULT DATA 
const INITIAL_DATA = {
  THREATS: [
    { id: 101, name: "MSC United VIII", lat: 13.2, lng: 42.9, type: "Missile Strike", faction: "Houthi Forces" },
    { id: 102, name: "Maersk Hangzhou", lat: 14.8, lng: 41.9, type: "Anti-Ship Missile", faction: "Houthi Forces" },
    { id: 103, name: "Chem Pluto", lat: 20.1, lng: 65.2, type: "Drone Strike", faction: "Houthi Forces" },
    { id: 106, name: "Galaxy Leader", lat: 14.9, lng: 42.8, type: "Hijacking", faction: "Houthi Forces" },
    { id: 201, name: "Sim: W.C.C. Raid", lat: -5.8, lng: 11.5, type: "Raid", faction: "West Congo Cougars" },
    { id: 202, name: "Sim: Supply Convoy", lat: -4.9, lng: 12.1, type: "Ambush", faction: "West Congo Cougars" }
  ],
  ASSETS: [
    { id: 301, name: "FOB: The Crib", lat: 44.7, lng: -63.6, type: "Safehouse", faction: "My Squad" }, 
    { id: 302, name: "Asset: Dave's House", lat: 44.65, lng: -63.58, type: "Ally", faction: "My Squad" }
  ],
  LOGISTICS: [
    { id: 401, name: "Refuel: Pizza Hut", lat: 44.66, lng: -63.62, type: "Nutrition", faction: "Supply Chain" },
    { id: 402, name: "Refuel: Gym", lat: 44.72, lng: -63.65, type: "Training", faction: "Self Improvement" }
  ]
};

// ICON GENERATOR
const createIcon = (color, isPulsing) => {
  const pulseClass = isPulsing ? 'pulse-ring' : '';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="dot-container">
        <div class="${pulseClass}" style="border-color: ${color}"></div>
        <div class="dot" style="background-color: ${color}; box-shadow: 0 0 8px ${color};"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// CLICK HANDLER
function MapClickHandler({ activeMode, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (activeMode) {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('sentinels_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  const [activeIncident, setActiveIncident] = useState(null);
  const [addMode, setAddMode] = useState(null);
  const [layers, setLayers] = useState({ THREATS: true, ASSETS: true, LOGISTICS: true });

  useEffect(() => {
    localStorage.setItem('sentinels_data', JSON.stringify(data));
  }, [data]);

  const handleAddPoint = (lat, lng) => {
    const typeNames = { THREATS: "Hostile", ASSETS: "FOB", LOGISTICS: "Refuel" };
    const factionNames = { THREATS: "Unknown Force", ASSETS: "My Squad", LOGISTICS: "Public" };

    const newPoint = {
      id: Date.now(),
      name: `New ${typeNames[addMode]}`,
      lat: lat,
      lng: lng,
      type: "User Added",
      faction: factionNames[addMode]
    };

    setData(prev => ({ ...prev, [addMode]: [...prev[addMode], newPoint] }));
    setAddMode(null);
  };

  // TODO: RENAME FUNCTION
  const renamePoint = (category, id) => {
    // opens prompt
    const newName = prompt("ENTER NEW DESIGNATION:", activeIncident.name);
    if (!newName) return; // If they clicked cancel, do nothing

    // Update database
    setData(prev => ({
      ...prev,
      [category]: prev[category].map(item => 
        item.id === id ? { ...item, name: newName } : item
      )
    }));
    
    // Update the open popup immediately
    setActiveIncident(prev => ({ ...prev, name: newName }));
  };

  const deletePoint = (category, id) => {
    setData(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.id !== id)
    }));
    setActiveIncident(null);
  };

  const toggleLayer = (layerName) => {
    setLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      
      {/* HUD: Layer Controls */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 1000, 
        background: 'rgba(0,0,0,0.8)', padding: '15px', 
        borderLeft: '2px solid #00ff99', color: '#00ff99', fontFamily: 'monospace'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>LAYER CONTROL</h2>
        {['THREATS', 'ASSETS', 'LOGISTICS'].map(cat => (
          <div key={cat} onClick={() => toggleLayer(cat)} style={{ cursor: 'pointer', marginBottom: '8px', opacity: layers[cat] ? 1 : 0.4 }}>
            [{layers[cat] ? 'ON' : 'OFF'}] {cat}
          </div>
        ))}
        <button 
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          style={{ marginTop: '10px', background: '#333', border: '1px solid red', color: 'red', cursor: 'pointer', fontSize: '10px', padding: '5px' }}
        >
          [RESET SYSTEM DATA]
        </button>
      </div>

      {/* EDITOR BAR */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
        display: 'flex', gap: '10px'
      }}>
        <button onClick={() => setAddMode(addMode === 'THREATS' ? null : 'THREATS')} style={{ padding: '10px 20px', background: addMode === 'THREATS' ? '#ff0055' : 'rgba(0,0,0,0.8)', border: '1px solid #ff0055', color: '#fff', fontFamily: 'monospace', cursor: 'pointer', boxShadow: addMode === 'THREATS' ? '0 0 15px #ff0055' : 'none' }}>+ HOSTILE</button>
        <button onClick={() => setAddMode(addMode === 'ASSETS' ? null : 'ASSETS')} style={{ padding: '10px 20px', background: addMode === 'ASSETS' ? '#00ff99' : 'rgba(0,0,0,0.8)', border: '1px solid #00ff99', color: '#fff', fontFamily: 'monospace', cursor: 'pointer', boxShadow: addMode === 'ASSETS' ? '0 0 15px #00ff99' : 'none' }}>+ ASSET</button>
        <button onClick={() => setAddMode(addMode === 'LOGISTICS' ? null : 'LOGISTICS')} style={{ padding: '10px 20px', background: addMode === 'LOGISTICS' ? '#00ccff' : 'rgba(0,0,0,0.8)', border: '1px solid #00ccff', color: '#fff', fontFamily: 'monospace', cursor: 'pointer', boxShadow: addMode === 'LOGISTICS' ? '0 0 15px #00ccff' : 'none' }}>+ REFUEL</button>
      </div>

      {/* ADD MODE INDICATOR */}
      {addMode && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#fff', fontSize: '20px', fontWeight: 'bold', pointerEvents: 'none', zIndex: 900,
          textShadow: '0 0 10px black'
        }}>
          [ CLICK MAP TO PLACE {addMode} ]
        </div>
      )}

      {/* MAP */}
      <MapContainer center={[20, 10]} zoom={3} style={{ width: '100%', height: '100%', background: '#000' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' />
        <MapClickHandler activeMode={addMode} onAddPoint={handleAddPoint} />

        {/* THREATS */}
        {layers.THREATS && data.THREATS.map((item) => (
          <Marker key={item.id} position={[item.lat, item.lng]} icon={createIcon('#ff0055', true)}
            eventHandlers={{ click: () => setActiveIncident({...item, category: 'THREATS'}) }}>
          </Marker>
        ))}

        {/* ASSETS */}
        {layers.ASSETS && data.ASSETS.map((item) => (
          <Marker key={item.id} position={[item.lat, item.lng]} icon={createIcon('#00ff99', false)}
            eventHandlers={{ click: () => setActiveIncident({...item, category: 'ASSETS'}) }}>
          </Marker>
        ))}

        {/* LOGISTICS */}
        {layers.LOGISTICS && data.LOGISTICS.map((item) => (
          <Marker key={item.id} position={[item.lat, item.lng]} icon={createIcon('#00ccff', false)}
            eventHandlers={{ click: () => setActiveIncident({...item, category: 'LOGISTICS'}) }}>
          </Marker>
        ))}
      </MapContainer>

      {/* DETAIL POPUP (add rename button later) */}
      {activeIncident && (
        <div style={{
          position: 'absolute', bottom: 80, right: 30, zIndex: 1000,
          background: 'rgba(0, 20, 10, 0.95)', border: '1px solid #fff',
          padding: '20px', width: '300px', color: '#fff', fontFamily: 'monospace'
        }}>
          <h3 style={{ margin: 0, color: '#00ff99' }}>{activeIncident.name}</h3>
          <p style={{fontSize: '12px', color: '#aaa'}}>{activeIncident.lat.toFixed(4)}, {activeIncident.lng.toFixed(4)}</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '10px' }}>
            <button 
              onClick={() => renamePoint(activeIncident.category, activeIncident.id)}
              style={{ background: '#333', border: '1px solid #00ff99', color: '#00ff99', padding: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              RENAME
            </button>
            <button 
              onClick={() => deletePoint(activeIncident.category, activeIncident.id)}
              style={{ background: '#333', border: '1px solid red', color: 'red', padding: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              DELETE
            </button>
          </div>

          <button 
            onClick={() => setActiveIncident(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', padding: '5px', cursor: 'pointer', marginTop: '10px', width: '100%', textDecoration: 'underline' }}
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}

export default App;