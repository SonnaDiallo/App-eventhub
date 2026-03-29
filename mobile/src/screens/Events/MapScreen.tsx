/**
 * @file MapScreen — Carte interactive des événements.
 *
 * Web : Leaflet.js chargé dynamiquement dans un <div> React.
 * Mobile : HTML Leaflet injecté dans un WebView.
 * Géocodage via Nominatim (gratuit, sans clé).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';

let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

interface RawEvent {
  id: string;
  title: string;
  location: string;
  date?: string;
  isFree: boolean;
  price?: number;
}

/* ─── helpers web ─── */
const loadLeaflet = (): Promise<any> =>
  new Promise(resolve => {
    const win = window as any;
    if (win.L) { resolve(win.L); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(win.L);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

/* ─── composant principal ─── */
const MapScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const webViewRef = useRef<any>(null);
  const mapContainerRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);

  /* charger les événements depuis Firestore */
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'events'), limit(30));
      const snap = await getDocs(q);
      const events: RawEvent[] = snap.docs
        .map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title || '',
            location: data.location || data.address || '',
            date: data.date || '',
            isFree: data.isFree ?? true,
            price: data.price ?? 0,
          };
        })
        .filter(ev => ev.location.trim() !== '');
      setRawEvents(events);
    } catch (e) {
      console.error('MapScreen:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  /* ── WEB : init Leaflet directement dans le div ── */
  useEffect(() => {
    if (Platform.OS !== 'web' || rawEvents.length === 0) return;

    let cancelled = false;

    const init = async () => {
      const L = await loadLeaflet();
      if (!L || !mapContainerRef.current || cancelled) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([46.8, 2.35], 6);
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: '<div style="background:#7B5CFF;width:28px;height:28px;border-radius:14px 14px 4px 14px;transform:rotate(45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 26],
        popupAnchor: [0, -28],
      });

      const bounds: [number, number][] = [];
      setGeocoding(true);
      let count = 0;

      for (const ev of rawEvents) {
        if (cancelled) break;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ev.location)}&format=json&limit=1`,
            { headers: { Accept: 'application/json' } }
          );
          const json = await res.json();
          if (json?.[0]) {
            const lat = parseFloat(json[0].lat);
            const lng = parseFloat(json[0].lon);
            const marker = L.marker([lat, lng], { icon }).addTo(map);
            bounds.push([lat, lng]);
            const subtitle = ev.isFree ? 'Gratuit' : `${(ev.price || 0).toFixed(2)} €`;
            marker.bindPopup(
              `<div style="padding:12px 14px;font-family:sans-serif">
                <div style="font-weight:800;font-size:14px;color:#111;margin-bottom:4px">${ev.title}</div>
                <div style="font-size:12px;color:#7B5CFF;font-weight:600">${subtitle}</div>
                ${ev.date ? `<div style="font-size:11px;color:#666;margin-top:2px">📅 ${ev.date}</div>` : ''}
                <button style="display:block;margin-top:10px;background:#7B5CFF;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer;width:100%"
                  onclick="window.__navigateToEvent && window.__navigateToEvent('${ev.id}')">
                  Voir l'événement →
                </button>
              </div>`,
              { maxWidth: 280 }
            );
            count++;
            setGeocodedCount(count);
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 300));
      }

      setGeocoding(false);
      if (bounds.length > 0) {
        try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch (_) {}
      }
    };

    /* expose navigation callback au DOM */
    (window as any).__navigateToEvent = (id: string) => {
      navigation.navigate('EventDetails', { event: { id } });
    };

    init();
    return () => { cancelled = true; };
  }, [rawEvents]);

  /* ── MOBILE : HTML Leaflet dans WebView ── */
  const buildHTML = (events: RawEvent[]): string => {
    const eventsForJS = events.map(ev => ({
      id: ev.id,
      title: ev.title,
      address: ev.location,
      subtitle: ev.isFree ? 'Gratuit' : `${(ev.price || 0).toFixed(2)} €`,
      date: ev.date || '',
    }));

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%}
  #st{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:5px 14px;border-radius:20px;font-size:12px;font-family:sans-serif;z-index:9999;pointer-events:none}
</style>
</head>
<body>
<div id="map"></div><div id="st">Géolocalisation…</div>
<script>
  const map=L.map('map',{zoomControl:true}).setView([46.8,2.35],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:18}).addTo(map);
  const icon=L.divIcon({className:'',html:'<div style="background:#7B5CFF;width:28px;height:28px;border-radius:14px 14px 4px 14px;transform:rotate(45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>',iconSize:[28,28],iconAnchor:[14,26],popupAnchor:[0,-28]});
  const evs=${JSON.stringify(eventsForJS)};
  const bounds=[];let n=0;const st=document.getElementById('st');
  async function run(){
    for(const ev of evs){
      try{
        st.textContent='Géo '+(n+1)+'/'+evs.length+'…';
        const r=await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(ev.address)+'&format=json&limit=1',{headers:{Accept:'application/json'}});
        const j=await r.json();
        if(j&&j[0]){
          const lat=parseFloat(j[0].lat),lng=parseFloat(j[0].lon);
          const m=L.marker([lat,lng],{icon}).addTo(map);
          bounds.push([lat,lng]);
          m.bindPopup('<div style="padding:12px 14px;font-family:sans-serif"><b style="font-size:14px">'+ev.title+'</b><div style="color:#7B5CFF;font-size:12px;margin-top:3px">'+ev.subtitle+'</div>'+(ev.date?'<div style="color:#666;font-size:11px;margin-top:2px">📅 '+ev.date+'</div>':'')+'<button style="display:block;margin-top:10px;background:#7B5CFF;color:#fff;border:none;border-radius:8px;padding:8px;font-weight:700;font-size:13px;cursor:pointer;width:100%" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'nav\\',id:\\''+ev.id+'\\'}))">Voir →</button></div>');
          n++;
        }
      }catch(e){}
      await new Promise(r=>setTimeout(r,300));
    }
    st.style.opacity='0';
    if(bounds.length)try{map.fitBounds(bounds,{padding:[40,40],maxZoom:13});}catch(e){}
    else{st.textContent='Aucun événement localisable';st.style.opacity='1';}
  }
  run();
</script>
</body>
</html>`;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if ((data.type === 'navigate' || data.type === 'nav') && data.id) {
        navigation.navigate('EventDetails', { event: { id: data.id } });
      }
    } catch (_) {}
  };

  /* ── RENDER ── */
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{
        backgroundColor: theme.header,
        paddingTop: Platform.OS === 'ios' ? 54 : 20,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Carte des événements</Text>
        <TouchableOpacity onPress={loadEvents} style={{ padding: 8 }}>
          <Ionicons name="refresh-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Chargement…</Text>
        </View>
      ) : rawEvents.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="map-outline" size={64} color={theme.textMuted} />
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18, marginTop: 16 }}>
            Aucun événement avec adresse
          </Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8 }}>
            Crée des événements avec une adresse précise pour les voir sur la carte.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web'
            ? React.createElement('div', {
                ref: mapContainerRef,
                style: { flex: 1, width: '100%', height: '100%' },
              })
            : WebView && (
                <WebView
                  ref={webViewRef}
                  source={{ html: buildHTML(rawEvents) }}
                  onMessage={handleWebViewMessage}
                  style={{ flex: 1 }}
                  javaScriptEnabled
                  domStorageEnabled
                  originWhitelist={['*']}
                  mixedContentMode="always"
                />
              )
          }

          {/* Badge événements */}
          <View style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
              {geocoding
                ? `Géolocalisation… ${geocodedCount}/${rawEvents.length}`
                : `${rawEvents.length} événement${rawEvents.length > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MapScreen;
