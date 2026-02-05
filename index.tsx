import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as L from 'leaflet';
import { 
  BarChart, 
  Map as MapIcon, 
  Users, 
  Target, 
  Database, 
  FileText, 
  ChevronRight, 
  Settings,
  Layers, 
  PieChart, 
  ShieldAlert, 
  Menu, 
  Share2, 
  Download, 
  Globe, 
  BookOpen, 
  TrendingUp, 
  MessageCircle, 
  CheckCircle, 
  Copy, 
  FileCheck, 
  Hexagon, 
  Vote, 
  AlertCircle, 
  MapPin,
  Wand2,
  Play,
  RefreshCw,
  Sliders,
  Zap,
  CheckSquare,
  Square,
  Megaphone,
  Eye
} from 'lucide-react';

// --- Leaflet Icon Fix ---
const fixLeafletIcons = () => {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  } catch (e) {
    console.warn("Leaflet icon fix failed", e);
  }
};

// --- Types & Interfaces ---

interface ZoneData {
  id: string;
  name: string;
  municipality: 'Medellín' | 'Bello';
  population: number;
  demographicDensity: number; // Used to calculate Idx
  historicalSupport: number; // Used to calculate Idx
  lat: number;
  lng: number;
  targetAudience: string; // New field from report
  strategicMessage: string; // New field from report
}

interface AdLocation {
    id: string;
    type: 'Valla' | 'Paradero' | 'Estación' | 'Pantalla';
    locationName: string;
    lat: number;
    lng: number;
    message: string;
}

interface Segment {
  id: string;
  name: string;
  active: boolean;
  weight: number;
}

interface WebMention {
  id: string;
  source: string;
  date: string;
  snippet: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface SimulationParams {
    partyStrength: number; // Multiplier (e.g., 1.0, 1.2)
    turnoutFactor: number; // Multiplier
    competitorImpact: number; // Negative multiplier
    focusArea: 'All' | 'Bello' | 'Medellín';
}

// --- Constants (Political Scenario) ---
const PARTY_NAME = "Centro Democrático";
const PARTY_TOTAL_PROJECTION = 500000;
const PARTY_SEATS_PROJECTION = 5;
const CANDIDATE_SAFE_THRESHOLD = 40000;

// --- Data Generation (Based on Strategic Report) ---

const INITIAL_ZONES: ZoneData[] = [
  { 
      id: 'c-01', name: 'Comuna 1 - Popular', municipality: 'Medellín', population: 135000, 
      demographicDensity: 0.95, historicalSupport: 0.55, lat: 6.2990, lng: -75.5450,
      targetAudience: 'Mujeres Jóvenes (18-35) y Madres Jefas',
      strategicMessage: 'Tu futuro no es un favor, es la ley. Matrícula Cero.'
  },
  { 
      id: 'c-16', name: 'Comuna 16 - Belén', municipality: 'Medellín', population: 195000, 
      demographicDensity: 0.75, historicalSupport: 0.75, lat: 6.2250, lng: -75.6000,
      targetAudience: 'Clase Media Profesional / Opinión',
      strategicMessage: 'Transparencia verificada. Consulta dónde invertimos.'
  },
  { 
      id: 'c-03', name: 'Comuna 3 - Manrique', municipality: 'Medellín', population: 160000, 
      demographicDensity: 0.85, historicalSupport: 0.60, lat: 6.2750, lng: -75.5480,
      targetAudience: 'Transportadores e Informales',
      strategicMessage: 'Defendemos tu bolsillo. Ni un peso más en el SOAT.'
  },
  { 
      id: 'c-10', name: 'Comuna 10 - Centro', municipality: 'Medellín', population: 85000, 
      demographicDensity: 0.60, historicalSupport: 0.40, lat: 6.2500, lng: -75.5700,
      targetAudience: 'Pequeños Comerciantes',
      strategicMessage: 'Menos trabas, más progreso. Economía Popular.'
  },
  { 
      id: 'c-13', name: 'Comuna 13 - San Javier', municipality: 'Medellín', population: 140000, 
      demographicDensity: 0.80, historicalSupport: 0.45, lat: 6.2550, lng: -75.6150,
      targetAudience: 'Madres Cabeza de Familia y Artistas',
      strategicMessage: 'Ley Panda: Salud mental protegida.'
  },
  { 
      id: 'c-07', name: 'Comuna 7 - Robledo', municipality: 'Medellín', population: 170000, 
      demographicDensity: 0.70, historicalSupport: 0.50, lat: 6.2800, lng: -75.5950,
      targetAudience: 'Estudiantes Universitarios',
      strategicMessage: 'Matrícula Cero y subsidios de transporte.'
  },
  { 
      id: 'c-05', name: 'Comuna 5 - Castilla', municipality: 'Medellín', population: 150000, 
      demographicDensity: 0.82, historicalSupport: 0.58, lat: 6.2950, lng: -75.5750,
      targetAudience: 'Líderes Deportivos',
      strategicMessage: 'Tasa Pro Deporte: Inversión social real.'
  },
  { 
      id: 'c-12', name: 'Comuna 12 - La América', municipality: 'Medellín', population: 100000, 
      demographicDensity: 0.65, historicalSupport: 0.70, lat: 6.2550, lng: -75.6050,
      targetAudience: 'Reserva Activa / Fuerza Pública',
      strategicMessage: 'Disciplina en el control público.'
  },
  { 
      id: 'c-08', name: 'Comuna 8 - V. Hermosa', municipality: 'Medellín', population: 138000, 
      demographicDensity: 0.78, historicalSupport: 0.48, lat: 6.2400, lng: -75.5500,
      targetAudience: 'Víctimas del Conflicto',
      strategicMessage: 'Derecho a la estabilización y empleo urbano.'
  },
  { 
      id: 'c-04', name: 'Comuna 4 - Aranjuez', municipality: 'Medellín', population: 155000, 
      demographicDensity: 0.88, historicalSupport: 0.62, lat: 6.2850, lng: -75.5600,
      targetAudience: 'Trabajadores de Plataformas',
      strategicMessage: 'Gestión eficiente por transporte digno.'
  }
];

const AD_LOCATIONS: AdLocation[] = [
    { id: 'ad1', type: 'Paradero', locationName: 'Entrada Santo Domingo Savio N°1', lat: 6.3010, lng: -75.5420, message: 'Tu futuro no es un favor.' },
    { id: 'ad2', type: 'Estación', locationName: 'Estación Metrocable Sto Domingo', lat: 6.2980, lng: -75.5440, message: 'Matrícula Cero.' },
    { id: 'ad3', type: 'Pantalla', locationName: 'Metroplús Gardel', lat: 6.2760, lng: -75.5500, message: 'SOAT Justo.' },
    { id: 'ad4', type: 'Valla', locationName: 'Cll 30 con Cr 82C (Los Alpes)', lat: 6.2280, lng: -75.6020, message: 'Transparencia Verificada.' },
    { id: 'ad5', type: 'Valla', locationName: 'Av Oriental con Cll 50', lat: 6.2490, lng: -75.5690, message: 'Menos trabas, más progreso.' },
    { id: 'ad6', type: 'Paradero', locationName: 'Bus 225i San Javier', lat: 6.2540, lng: -75.6140, message: 'Salud mental protegida.' },
    { id: 'ad7', type: 'Paradero', locationName: 'Facultad Minas (Cr 80)', lat: 6.2780, lng: -75.5980, message: 'La oportunidad es ahora.' },
    { id: 'ad8', type: 'Valla', locationName: 'Unidad Deportiva Castilla', lat: 6.2970, lng: -75.5760, message: 'De la cancha a la ley.' },
    { id: 'ad9', type: 'Valla', locationName: 'Av San Juan con Cr 74', lat: 6.2530, lng: -75.6030, message: 'Vigilamos tu patrimonio.' },
    { id: 'ad10', type: 'Estación', locationName: 'Terminal Parque Aranjuez', lat: 6.2870, lng: -75.5610, message: 'Tu trabajo mueve a Medellín.' },
];

const DEMO_SEGMENTS: Segment[] = [
  { id: 's1', name: 'Mujeres (18-35) - Estrato 1-2', active: true, weight: 1.4 },
  { id: 's2', name: 'Reserva Activa / Fuerza Pública', active: true, weight: 1.6 },
  { id: 's3', name: 'Líderes Deportivos / Clubes', active: true, weight: 1.3 },
  { id: 's4', name: 'Madres Cabeza de Familia', active: true, weight: 1.4 },
  { id: 's5', name: 'Jóvenes Primer Votante', active: false, weight: 1.0 },
  { id: 's6', name: 'Transportadores Informales', active: true, weight: 1.2 },
];

const WEB_MENTIONS: WebMention[] = [
  { id: 'w1', source: 'La Silla Vacía', date: 'Hace 2 horas', snippet: '...el CD aspira a 5 curules en Antioquia. Yulieth Sánchez pelea la entrada con 40k votos...', sentiment: 'neutral' },
  { id: 'w2', source: 'El Colombiano', date: 'Hace 5 horas', snippet: '...análisis de la lista del Centro Democrático: Se necesitan 500 mil votos para asegurar las 5 curules...', sentiment: 'positive' },
  { id: 'w3', source: 'Twitter / X', date: 'Hace 12 horas', snippet: 'Vamos por esa curul de nuevo. #Yulieth2026', sentiment: 'positive' },
  { id: 'w4', source: 'Congreso Visible', date: 'Histórico', snippet: 'Calificación de desempeño legislativo periodo anterior: Sobresaliente.', sentiment: 'positive' },
];

const LEGISLATIVE_STATS = {
  laws: 8,
  debates: 62,
  attendance: 99.1,
  commissions: ['Constitucional', 'Derechos de la Mujer', 'Presupuesto']
};

// --- Helper Functions ---

const getColor = (score: number) => {
    if (score > 0.8) return '#dc2626'; // High
    if (score > 0.6) return '#f97316';
    if (score > 0.4) return '#facc15';
    if (score > 0.2) return '#93c5fd';
    return '#e5e7eb'; // Low
};

// Function to generate hexagon coordinates around a center point
const getHexagonPoints = (lat: number, lng: number, radiusDegrees: number) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i - 30; // 30 degree offset for pointy top
    const angle_rad = Math.PI / 180 * angle_deg;
    // Simple projection approximation for local area
    const x = radiusDegrees * Math.cos(angle_rad); 
    const y = radiusDegrees * Math.sin(angle_rad);
    points.push([lat + y, lng + x]);
  }
  return points;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-6 py-4 transition-colors border-l-4 ${
      active 
        ? 'bg-blue-50 border-blue-600 text-blue-800' 
        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm text-left">{label}</span>
  </button>
);

const MetricCard = ({ title, value, subtext, trend, color = "blue", icon: Icon }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
    <div className="relative z-10">
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">{title}</h3>
        <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {trend && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend > 0 ? '+' : ''}{trend}%
            </span>
        )}
        </div>
        <p className="text-gray-400 text-sm mt-2">{subtext}</p>
    </div>
    {Icon && <Icon className="absolute -right-4 -bottom-4 text-gray-50 opacity-50 group-hover:scale-110 transition-transform duration-300" size={80} />}
  </div>
);

// --- Views ---

const DiagnosisView = ({ segments, toggleSegment }: { segments: Segment[], toggleSegment: (id: string) => void }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Users className="mr-2 text-blue-600" size={20} />
            Escenario Electoral: {PARTY_NAME}
          </h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">Antioquia 2026</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Proyección del Partido</h4>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-2xl font-bold text-blue-800">{PARTY_TOTAL_PROJECTION.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-blue-600">Votos Totales</span>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full">
                        <div className="bg-blue-800 h-2 rounded-full w-full"></div>
                    </div>
                    <p className="text-xs text-blue-500 mt-2">Objetivo Lista: 5 Curules</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="text-sm font-bold text-green-900 mb-2">Meta Yulieth (Umbral Seguro)</h4>
                     <div className="flex justify-between items-end mb-1">
                        <span className="text-2xl font-bold text-green-800">{CANDIDATE_SAFE_THRESHOLD.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-green-600">Votos Mínimos</span>
                    </div>
                     <div className="w-full bg-green-200 h-2 rounded-full">
                        <div className="bg-green-600 h-2 rounded-full w-[80%]"></div>
                    </div>
                    <p className="text-xs text-green-500 mt-2">Para asegurar curul #4 o #5</p>
                </div>
            </div>

            <div className="flex flex-col justify-center">
                <p className="text-sm text-gray-600 mb-4">
                    Bajo el escenario donde el <strong>{PARTY_NAME}</strong> obtiene 5 curules con 500k votos, la cifra repartidora y el voto preferente exigen que Yulieth asegure un piso de <strong>40.000 votos</strong> para superar la competencia interna.
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                    <ShieldAlert size={16} />
                    <span>Riesgo Crítico: Menos de 35.000 votos pone en peligro la curul.</span>
                </div>
            </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
             <h3 className="text-sm font-bold text-gray-800 mb-4">Micro-Segmentación para los 40k</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map(seg => (
                <div 
                key={seg.id}
                onClick={() => toggleSegment(seg.id)}
                className={`cursor-pointer border rounded-lg p-3 flex items-center justify-between transition-all ${
                    seg.active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                }`}
                >
                <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${seg.active ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                    {seg.active && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                    <div>
                    <h4 className={`text-sm font-medium ${seg.active ? 'text-blue-900' : 'text-gray-700'}`}>{seg.name}</h4>
                    </div>
                </div>
                </div>
            ))}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Real Leaflet Map View ---

const RealMapView = ({ zones, activeSegments, toggleSegment }: { zones: ZoneData[], activeSegments: Segment[], toggleSegment: (id: string) => void }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroups = useRef<{ [key: string]: L.LayerGroup }>({});
  
  // --- Simulation State ---
  const [simParams, setSimParams] = useState<SimulationParams>({
      partyStrength: 1.0,
      turnoutFactor: 1.0,
      competitorImpact: 0,
      focusArea: 'All'
  });
  
  const [promptText, setPromptText] = useState("");
  const [wizardOpen, setWizardOpen] = useState(true);

  // --- Projection Logic ---
  const processedZones = useMemo(() => {
    const avgWeight = activeSegments.filter(s => s.active).reduce((acc, curr) => acc + curr.weight, 0) / (activeSegments.filter(s => s.active).length || 1);
    
    return zones.map(zone => {
      // Logic: Start with base density * segment interest
      let baseIndex = (zone.demographicDensity * avgWeight);
      
      // Apply Focus Area Filter (Soft filter)
      if (simParams.focusArea !== 'All' && zone.municipality !== simParams.focusArea) {
          baseIndex = baseIndex * 0.5; // Reduce relevance of non-focus areas
      } else if (simParams.focusArea !== 'All') {
          baseIndex = baseIndex * 1.2; // Boost focus area
      }

      // Apply Simulation Multipliers
      // Party Strength affects Historical Support efficiency
      const adjustedSupport = Math.min(zone.historicalSupport * simParams.partyStrength, 1);
      
      // Turnout Factor affects Demographic Density efficiency
      const adjustedDensity = Math.min(baseIndex * simParams.turnoutFactor, 1);
      
      // Competitor Impact reduces overall opportunity
      const competitorFactor = 1 - simParams.competitorImpact;

      const opportunityIndex = (adjustedDensity * 0.6 + adjustedSupport * 0.4) * competitorFactor;

      // Estimate Votes: (Population * TurnoutRate) * OpportunityIndex * (CaptureRate ~ 0.15)
      const estimatedVotes = Math.round(zone.population * 0.45 * opportunityIndex * 0.15);

      return { 
          ...zone, 
          opportunityIndex: Math.min(opportunityIndex, 1),
          estimatedVotes
      };
    }).sort((a, b) => b.opportunityIndex - a.opportunityIndex);
  }, [zones, activeSegments, simParams]);

  // Aggregate Total Projected Votes
  const totalProjectedVotes = useMemo(() => {
      return processedZones.reduce((acc, z) => acc + z.estimatedVotes, 0);
  }, [processedZones]);

  // --- Wizard Logic ---
  const executeWizardPrompt = (preset?: string) => {
      const text = preset || promptText.toLowerCase();
      let newParams = { ...simParams };

      if (text.includes("crisis") || text.includes("caída")) {
          newParams.partyStrength = 0.8; // -20%
          newParams.competitorImpact = 0.15; // +15% impact
          alert("Escenario Activado: Gestión de Crisis (-20% Imagen)");
      } else if (text.includes("optimista") || text.includes("ola")) {
          newParams.partyStrength = 1.25; // +25%
          newParams.turnoutFactor = 1.1; // +10% turnout
          alert("Escenario Activado: Ola de Opinión (+25% Imagen)");
      } else if (text.includes("bello") || text.includes("norte")) {
          newParams.focusArea = 'Bello';
          newParams.turnoutFactor = 1.15; // Focused effort
          alert("Escenario Activado: Fortaleza Bello (Prioridad Norte)");
      } else if (text.includes("reset") || text.includes("reiniciar")) {
           newParams = { partyStrength: 1.0, turnoutFactor: 1.0, competitorImpact: 0, focusArea: 'All' };
      } else {
          // Fallback generic boost if keywords match loosely
          newParams.turnoutFactor = 1.05;
      }
      
      setSimParams(newParams);
  };


  useEffect(() => {
    // 1. Run Icon Fix once
    fixLeafletIcons();

    if (!mapContainer.current) return;
    if (mapInstance.current) return; // Initialize once

    // 2. Initialize Map
    const map = L.map(mapContainer.current).setView([6.2600, -75.5800], 12); // Centered on Medellín
    mapInstance.current = map;

    // Add Tiles (OSM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Initialize Layer Groups
    const heatLayer = L.layerGroup().addTo(map);
    const criticalLayer = L.layerGroup();
    const territoryLayer = L.layerGroup();
    const adsLayer = L.layerGroup().addTo(map);

    layerGroups.current = {
      "Estrategia (Hexágonos)": heatLayer,
      "Puntos Críticos": criticalLayer,
      "Infraestructura Ads": adsLayer,
      "Territorios Base": territoryLayer
    };

    // Add Layer Control
    L.control.layers(null, layerGroups.current, { collapsed: false }).addTo(map);
    
    // Add Legend (Custom Control)
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend bg-white p-3 rounded shadow-lg text-xs');
        div.innerHTML = `
            <h4 class="font-bold mb-1">Convenciones Estratégicas</h4>
            <div class="flex items-center mb-1"><span class="w-2 h-2 rounded-full bg-blue-600 mr-2"></span> Publicidad (Vallas/Paraderos)</div>
            <div class="flex items-center mb-1"><span style="background:#dc2626; width:10px; height:10px; display:inline-block; margin-right:5px;"></span> Alta Densidad (Idx >80)</div>
            <div class="flex items-center mb-1"><span style="background:#f97316; width:10px; height:10px; display:inline-block; margin-right:5px;"></span> Media-Alta (Idx >60)</div>
        `;
        return div;
    };
    legend.addTo(map);

    return () => {
        if(mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    }
  }, []);

  // Update Layers when data changes
  useEffect(() => {
    if (!mapInstance.current) return;

    const { "Estrategia (Hexágonos)": heatLayer, "Puntos Críticos": criticalLayer, "Territorios Base": territoryLayer, "Infraestructura Ads": adsLayer } = layerGroups.current;
    
    // Clear previous layers
    heatLayer.clearLayers();
    criticalLayer.clearLayers();
    territoryLayer.clearLayers();
    adsLayer.clearLayers();

    // 1. Render Ad Locations (New Layer)
    AD_LOCATIONS.forEach(ad => {
        const iconHtml = `<div class="bg-blue-600 text-white rounded-full p-1 shadow-lg border-2 border-white flex items-center justify-center w-6 h-6 transform hover:scale-125 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
        </div>`;
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-ad-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([ad.lat, ad.lng], { icon: customIcon });
        const popupContent = `
            <div class="p-2 min-w-[200px]">
                <div class="flex items-center mb-2">
                    <span class="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">${ad.type}</span>
                </div>
                <h4 class="font-bold text-sm text-gray-800 leading-tight mb-2">${ad.locationName}</h4>
                <div class="bg-gray-50 border-l-2 border-blue-500 pl-2 py-1">
                    <p class="text-xs text-gray-600 italic leading-relaxed">"${ad.message}"</p>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent);
        adsLayer.addLayer(marker);
    });

    processedZones.forEach(zone => {
        const color = getColor(zone.opportunityIndex);
        const radius = 0.008; // Approx size for hexagon

        // 2. Heatmap Layer (Hexagons)
        const hexPoints = getHexagonPoints(zone.lat, zone.lng, radius);
        const polygon = L.polygon(hexPoints, {
            color: 'white',
            weight: 1,
            fillColor: color,
            fillOpacity: 0.5
        });
        
        const popupContent = `
            <div class="text-sm font-sans min-w-[220px]">
                <h3 class="font-bold text-gray-800 border-b pb-1 mb-1">${zone.name}</h3>
                <p class="text-xs mb-1"><strong>Target:</strong> ${zone.targetAudience}</p>
                 <div class="text-xs italic bg-gray-50 p-2 mb-2 text-gray-600 border border-gray-200 rounded relative">
                    <span class="absolute top-0 left-1 text-gray-300 text-lg leading-none">"</span>
                    ${zone.strategicMessage}
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <p class="mb-0"><strong>Población:</strong></p> <p>${zone.population.toLocaleString()}</p>
                    <p class="mb-0"><strong>Idx Oportunidad:</strong></p> <p>${(zone.opportunityIndex * 100).toFixed(0)}</p>
                </div>
                <div class="mt-2 pt-2 border-t border-gray-100">
                    <div class="text-xs text-gray-500">Proyección Votos (Sim):</div>
                    <div class="text-lg font-bold text-blue-700">${zone.estimatedVotes.toLocaleString()}</div>
                </div>
            </div>
        `;
        polygon.bindPopup(popupContent);
        heatLayer.addLayer(polygon);

        // 3. Critical Points Layer (Markers for top zones)
        if (zone.opportunityIndex > 0.6) {
             const marker = L.circleMarker([zone.lat, zone.lng], {
                radius: 4,
                fillColor: '#1e3a8a', // Blue-900
                color: '#fff',
                weight: 2,
                fillOpacity: 1
             });
             marker.bindTooltip(`<b>${(zone.opportunityIndex * 100).toFixed(0)}</b><br>${zone.name}`, { permanent: false, direction: 'top' });
             criticalLayer.addLayer(marker);
        }

        // 4. Territory Layer (Circles)
        const circle = L.circle([zone.lat, zone.lng], {
            color: '#6b7280',
            fillColor: '#9ca3af',
            fillOpacity: 0.05,
            radius: 800 // Meters
        });
        territoryLayer.addLayer(circle);

    });

  }, [processedZones]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full relative">
      {/* Map Container */}
      <div className="lg:col-span-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col relative h-[600px]">
         <div ref={mapContainer} className="flex-1 z-0 rounded-lg overflow-hidden" />
         
         {/* Wizard Overlay */}
         <div className={`absolute bottom-6 left-6 right-6 lg:right-auto lg:w-96 z-[400] transition-all duration-300 ${wizardOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
             <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-blue-100 p-4">
                <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center">
                        <Wand2 size={16} className="mr-2 text-blue-600" />
                        Asistente de Proyección (Wizard)
                    </h3>
                    <button onClick={() => setWizardOpen(false)} className="text-gray-400 hover:text-gray-600"><ChevronRight className="rotate-90" size={16} /></button>
                </div>

                <div className="mb-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Ejecutar Simulación</label>
                    <div className="flex space-x-2">
                        <input 
                            type="text" 
                            placeholder="Ej: 'Crisis de imagen', 'Foco Bello'..." 
                            className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && executeWizardPrompt()}
                        />
                        <button 
                            onClick={() => executeWizardPrompt()}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Play size={16} />
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Escenarios Rápidos</label>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => executeWizardPrompt('optimista')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full hover:bg-green-100 transition-colors">Ola Optimista</button>
                        <button onClick={() => executeWizardPrompt('crisis')} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-full hover:bg-red-100 transition-colors">Crisis (-20%)</button>
                        <button onClick={() => executeWizardPrompt('bello')} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors">Fortaleza Bello</button>
                        <button onClick={() => executeWizardPrompt('reset')} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center"><RefreshCw size={10} className="mr-1"/> Reset</button>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 bg-blue-50/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-600">Proyección Total:</span>
                        <div className="text-right">
                             <span className={`text-xl font-bold ${totalProjectedVotes >= CANDIDATE_SAFE_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                                 {totalProjectedVotes.toLocaleString()}
                             </span>
                             <span className="text-[10px] text-gray-400 block">Meta: {CANDIDATE_SAFE_THRESHOLD.toLocaleString()}</span>
                        </div>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                            className={`h-full ${totalProjectedVotes >= CANDIDATE_SAFE_THRESHOLD ? 'bg-green-500' : 'bg-red-500'} transition-all duration-500`} 
                            style={{ width: `${Math.min((totalProjectedVotes / CANDIDATE_SAFE_THRESHOLD) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
             </div>
         </div>
         
         {!wizardOpen && (
             <button 
                onClick={() => setWizardOpen(true)}
                className="absolute bottom-6 left-6 z-[400] bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
             >
                 <Wand2 size={24} />
             </button>
         )}

      </div>

      {/* Strategic Detail Panel & Manual Controls */}
      <div className="bg-white p-0 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px] lg:h-auto">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-gray-800 flex items-center">
                    <Sliders className="mr-2 text-blue-600" size={18} />
                    Variables (X/Y)
                </h3>
                <p className="text-xs text-gray-500">Ajuste manual de parámetros.</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
             {/* Manual Sliders */}
            <div className="p-5 space-y-5 border-b border-gray-100">
                <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>Fuerza de Marca (X)</span>
                        <span className="text-blue-600">{(simParams.partyStrength * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1"
                        value={simParams.partyStrength}
                        onChange={(e) => setSimParams({...simParams, partyStrength: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>Movilización Demografía (Y)</span>
                        <span className="text-purple-600">{(simParams.turnoutFactor * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1"
                        value={simParams.turnoutFactor}
                        onChange={(e) => setSimParams({...simParams, turnoutFactor: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                </div>
            </div>

            {/* Micro-Segmentation Toggle List */}
            <div className="p-5 border-b border-gray-100">
                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Micro-Segmentación Activa</h4>
                 <div className="space-y-2">
                    {activeSegments.map(seg => (
                        <div 
                            key={seg.id}
                            onClick={() => toggleSegment(seg.id)}
                            className="flex items-center justify-between cursor-pointer group"
                        >
                            <div className="flex items-center space-x-2">
                                {seg.active ? (
                                    <CheckSquare size={16} className="text-blue-600" />
                                ) : (
                                    <Square size={16} className="text-gray-300 group-hover:text-gray-400" />
                                )}
                                <span className={`text-xs ${seg.active ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                    {seg.name}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">x{seg.weight}</span>
                        </div>
                    ))}
                 </div>
            </div>

            <div className="p-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Top Zonas (Impacto Simulado)
            </div>

            <div className="p-2">
                {processedZones.slice(0, 10).map((zone, idx) => (
                    <div key={zone.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg border-b border-gray-50 last:border-0 transition-colors group cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <h4 className="text-sm font-semibold text-gray-800">{zone.name}</h4>
                                <span className="text-xs font-bold" style={{ color: getColor(zone.opportunityIndex) }}>
                                    {zone.estimatedVotes.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">votos</span>
                                </span>
                            </div>
                            <div className="flex items-center text-xs text-gray-400 mt-1 justify-between">
                                <div className="flex items-center">
                                    <Zap size={10} className="mr-1 text-yellow-500" />
                                    Idx: {(zone.opportunityIndex * 100).toFixed(0)}
                                </div>
                                <span className="text-[10px] bg-gray-100 px-1.5 rounded">{zone.municipality}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Missing Views Implementation ---

const LegislativeView = () => {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="text-gray-500 text-xs font-bold uppercase mb-1">Leyes Aprobadas</div>
             <div className="text-3xl font-bold text-blue-900">{LEGISLATIVE_STATS.laws}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="text-gray-500 text-xs font-bold uppercase mb-1">Debates Control</div>
             <div className="text-3xl font-bold text-blue-900">{LEGISLATIVE_STATS.debates}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="text-gray-500 text-xs font-bold uppercase mb-1">Asistencia</div>
             <div className="text-3xl font-bold text-green-600">{LEGISLATIVE_STATS.attendance}%</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="text-gray-500 text-xs font-bold uppercase mb-2">Comisiones</div>
             <div className="space-y-1">
                {LEGISLATIVE_STATS.commissions.map((c, i) => (
                    <div key={i} className="text-xs font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100 truncate" title={c}>
                        {c}
                    </div>
                ))}
             </div>
          </div>
       </div>

       <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
             <h3 className="font-bold text-gray-800">Menciones en Medios y Redes</h3>
          </div>
          <div className="divide-y divide-gray-100">
             {WEB_MENTIONS.map((mention) => (
                <div key={mention.id} className="p-4 hover:bg-gray-50 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{mention.source}</span>
                      <span className="text-xs text-gray-400">{mention.date}</span>
                   </div>
                   <p className="text-sm text-gray-700 mb-2">"{mention.snippet}"</p>
                   <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${mention.sentiment === 'positive' ? 'bg-green-500' : mention.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                      <span className="text-xs font-medium capitalize text-gray-500">{mention.sentiment}</span>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

const ReportsView = ({ zones }: { zones: ZoneData[] }) => {
  const handleExportCSV = () => {
    const headers = ['ID', 'Zona/Barrio', 'Municipio', 'Población', 'Apoyo Histórico', 'Densidad', 'Target Audience', 'Strategic Message'];
    const csvContent = [
      headers.join(','),
      ...zones.map(zone => [
        zone.id,
        `"${zone.name}"`,
        zone.municipality,
        zone.population,
        zone.historicalSupport,
        zone.demographicDensity,
        `"${zone.targetAudience}"`,
        `"${zone.strategicMessage}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_territorios.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
           <div>
              <h2 className="text-lg font-bold text-gray-800">Reporte de Territorios</h2>
              <p className="text-sm text-gray-500">Listado consolidado de zonas estratégicas</p>
           </div>
           <button
             onClick={handleExportCSV}
             className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Download size={16} />
              <span>Exportar CSV</span>
           </button>
        </div>
        
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Zona / Barrio</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Municipio</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Población</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Apoyo Hist.</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Densidad Y</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Público Objetivo</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Mensaje Estratégico</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-gray-50">
                       <td className="py-3 px-4 text-sm font-mono text-gray-500">{zone.id.toUpperCase()}</td>
                       <td className="py-3 px-4 text-sm font-medium text-gray-800">{zone.name}</td>
                       <td className="py-3 px-4 text-sm text-gray-600">{zone.municipality}</td>
                       <td className="py-3 px-4 text-sm text-gray-600 text-right">{zone.population.toLocaleString()}</td>
                       <td className="py-3 px-4 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${zone.historicalSupport > 0.5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                             {(zone.historicalSupport * 100).toFixed(0)}%
                          </span>
                       </td>
                       <td className="py-3 px-4 text-sm text-center">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[60px] mx-auto">
                             <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${zone.demographicDensity * 100}%` }}></div>
                          </div>
                       </td>
                       <td className="py-3 px-4 text-sm text-gray-600">{zone.targetAudience}</td>
                       <td className="py-3 px-4 text-gray-600 text-xs italic">"{zone.strategicMessage}"</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [segments, setSegments] = useState<Segment[]>(DEMO_SEGMENTS);

  const toggleSegment = (id: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const activeSegmentsCount = segments.filter(s => s.active).length;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-blue-900">
            <ShieldAlert size={28} />
            <div>
              <h1 className="font-bold text-lg leading-tight">Yulieth Sánchez</h1>
              <p className="text-xs text-blue-600 font-semibold tracking-wider uppercase">Cámara 2026</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 space-y-1">
          <SidebarItem 
            icon={BarChart} 
            label="Resumen Ejecutivo" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
           <SidebarItem 
            icon={Globe} 
            label="Labor Ex-Congresista" 
            active={activeTab === 'legislative'} 
            onClick={() => setActiveTab('legislative')} 
          />
          <SidebarItem 
            icon={Users} 
            label="Análisis: Demografía Y" 
            active={activeTab === 'analysis'} 
            onClick={() => setActiveTab('analysis')} 
          />
          <SidebarItem 
            icon={MapIcon} 
            label="Mapa Geoespacial (Z)" 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Reportes y Exportación" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
          />
        </nav>

        <div className="p-6 border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-800 font-semibold mb-1">Partido: {PARTY_NAME}</p>
                <div className="flex items-center space-x-2">
                    <Vote size={14} className="text-blue-600" />
                    <span className="text-xs text-blue-600">Obj. Lista: 500k</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
                {activeTab === 'dashboard' && 'Panel de Control: Estrategia 2026'}
                {activeTab === 'legislative' && 'Inteligencia Legislativa: Perfil Ex-Congresista'}
                {activeTab === 'analysis' && 'Fase 1: Diagnóstico de Electorado'}
                {activeTab === 'map' && 'Fase 2: Inteligencia Geoespacial (Real)'}
                {activeTab === 'reports' && 'Fase 3: Proyección y Comando'}
            </h2>
            <div className="flex items-center space-x-4">
                <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-gray-700">Yulieth Sánchez</p>
                    <p className="text-xs text-gray-500">Candidata Cámara (CD)</p>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-300 cursor-pointer">
                    <Settings size={20} />
                </div>
            </div>
        </header>

        {/* Content Body */}
        <div className="p-8">
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="Meta Personal 2026" value="40,000" subtext="Votos Mínimos (Seguridad)" color="red" trend={5} />
                        <MetricCard title="Meta Partido (CD)" value="500k" subtext="Para 5 Curules" color="blue" trend={12} />
                        <MetricCard title="Territorios Clave" value="15" subtext="Clusters Alta Prioridad" trend={5} />
                        <MetricCard title="Probabilidad Curul" value="Alta" subtext="Si > 40k Votos" color="green" />
                    </div>

                    {/* Quick Access to Phases */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('map')}>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-2">Mapa Geoespacial Real</h3>
                                <p className="text-blue-200 mb-6 max-w-md">
                                    Visualice las zonas estratégicas sobre el mapa real de Medellín y Bello, con capas interactivas.
                                </p>
                                <button 
                                    className="bg-white text-blue-900 px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center"
                                >
                                    Abrir Mapa Interactivo <ChevronRight size={16} className="ml-2" />
                                </button>
                            </div>
                            <MapPin className="absolute -bottom-8 -right-8 text-blue-700 opacity-20 group-hover:scale-110 transition-transform duration-500" size={200} />
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
                            <div className="flex items-center mb-4">
                                <Target className="text-red-500 mr-3" size={24} />
                                <h3 className="text-lg font-bold text-gray-800">Estado de la Campaña</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-semibold uppercase text-gray-500 mb-1">
                                        <span>Consolidación Base (20k Votos)</span>
                                        <span>100%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full"><div className="w-[100%] h-full bg-green-500 rounded-full"></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-semibold uppercase text-gray-500 mb-1">
                                        <span>Expansión (20k Votos Restantes)</span>
                                        <span>55%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full"><div className="w-[55%] h-full bg-orange-500 rounded-full"></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-semibold uppercase text-gray-500 mb-1">
                                        <span>Imagen Pública (Reconocimiento)</span>
                                        <span>92%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full"><div className="w-[92%] h-full bg-blue-500 rounded-full"></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'analysis' && <DiagnosisView segments={segments} toggleSegment={toggleSegment} />}
            
            {activeTab === 'legislative' && <LegislativeView />}

            {activeTab === 'map' && <RealMapView zones={INITIAL_ZONES} activeSegments={segments} toggleSegment={toggleSegment} />}
            
            {activeTab === 'reports' && <ReportsView zones={INITIAL_ZONES} />}
        </div>
      </main>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);