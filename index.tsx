import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
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
  AlertCircle
} from 'lucide-react';

// --- Types & Interfaces ---

interface ZoneData {
  id: string;
  name: string;
  municipality: 'Medellín' | 'Bello';
  population: number;
  demographicDensity: number; // 0-1 (Density of Demography Y)
  historicalSupport: number; // 0-1 (Support for Entity X)
  // Hexagon Coordinates for Tessellation (Offset coordinates or generic X/Y for SVG placement)
  hexQ: number; 
  hexR: number;
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

// --- Constants (Political Scenario) ---
const PARTY_NAME = "Centro Democrático";
const PARTY_TOTAL_PROJECTION = 500000;
const PARTY_SEATS_PROJECTION = 5;
const CANDIDATE_SAFE_THRESHOLD = 40000;

// --- Mock Data Generation (Cámara 2026 Focus) ---

// Coordinates approximate the geography: Bello North (Top), Medellín South (Bottom)
const INITIAL_ZONES: ZoneData[] = [
  // BELLO (Northern Cluster) - High Priority for Yulieth
  { id: 'b-04', name: 'Bello - París', municipality: 'Bello', population: 65000, demographicDensity: 0.88, historicalSupport: 0.28, hexQ: 1, hexR: 0 },
  { id: 'b-01', name: 'Bello - Norte', municipality: 'Bello', population: 95000, demographicDensity: 0.82, historicalSupport: 0.48, hexQ: 2, hexR: 0 },
  { id: 'b-03', name: 'Bello - Niquía', municipality: 'Bello', population: 105000, demographicDensity: 0.78, historicalSupport: 0.35, hexQ: 3, hexR: 0 },
  { id: 'b-02', name: 'Bello - Centro', municipality: 'Bello', population: 110000, demographicDensity: 0.65, historicalSupport: 0.52, hexQ: 2, hexR: 1 },
  
  // MEDELLÍN NORTH (Connecting to Bello)
  { id: 'm-01', name: 'C1 - Popular', municipality: 'Medellín', population: 132000, demographicDensity: 0.75, historicalSupport: 0.45, hexQ: 3, hexR: 2 },
  { id: 'm-02', name: 'C2 - Santa Cruz', municipality: 'Medellín', population: 110000, demographicDensity: 0.68, historicalSupport: 0.38, hexQ: 2, hexR: 2 },
  { id: 'm-04', name: 'C4 - Aranjuez', municipality: 'Medellín', population: 140000, demographicDensity: 0.45, historicalSupport: 0.58, hexQ: 2, hexR: 3 },
  { id: 'm-03', name: 'C3 - Manrique', municipality: 'Medellín', population: 155000, demographicDensity: 0.55, historicalSupport: 0.62, hexQ: 3, hexR: 3 },
  
  // MEDELLÍN CENTER
  { id: 'm-10', name: 'C10 - Candelaria', municipality: 'Medellín', population: 85000, demographicDensity: 0.35, historicalSupport: 0.25, hexQ: 2, hexR: 4 },
  { id: 'm-16', name: 'C16 - Belén', municipality: 'Medellín', population: 190000, demographicDensity: 0.65, historicalSupport: 0.55, hexQ: 1, hexR: 5 },
  { id: 'm-14', name: 'C14 - El Poblado', municipality: 'Medellín', population: 128000, demographicDensity: 0.15, historicalSupport: 0.85, hexQ: 3, hexR: 5 },
];

const DEMO_SEGMENTS: Segment[] = [
  { id: 's1', name: 'Mujeres (18-35) - Estrato 1-2', active: true, weight: 1.4 },
  { id: 's2', name: 'Reserva Activa / Fuerza Pública', active: true, weight: 1.6 },
  { id: 's3', name: 'Líderes Deportivos / Clubes', active: true, weight: 1.3 },
  { id: 's4', name: 'Madres Cabeza de Familia', active: true, weight: 1.4 },
  { id: 's5', name: 'Jóvenes Primer Votante', active: false, weight: 1.0 },
  { id: 's6', name: 'Adulto Mayor - Pensionado', active: false, weight: 1.1 },
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

const calculateHexPosition = (q: number, r: number, size: number) => {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
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

const GeoAnalysisView = ({ zones, activeSegments }: { zones: ZoneData[], activeSegments: Segment[] }) => {
  const [hoveredZone, setHoveredZone] = useState<ZoneData | null>(null);

  // Logic: Opportunity Index calculation based on 40k goal
  const processedZones = useMemo(() => {
    const avgWeight = activeSegments.filter(s => s.active).reduce((acc, curr) => acc + curr.weight, 0) / (activeSegments.filter(s => s.active).length || 1);
    
    return zones.map(zone => {
      // Adjusted formula: Importance is higher if density intersects with high historical support
      const opportunityIndex = (zone.demographicDensity * avgWeight) * (zone.historicalSupport + 0.3); 
      return { ...zone, opportunityIndex: Math.min(opportunityIndex, 1) };
    }).sort((a, b) => b.opportunityIndex - a.opportunityIndex);
  }, [zones, activeSegments]);

  const getColor = (score: number) => {
    // Heatmap gradient
    if (score > 0.8) return '#dc2626'; // Red-600
    if (score > 0.6) return '#f97316'; // Orange-500
    if (score > 0.4) return '#facc15'; // Yellow-400
    if (score > 0.2) return '#93c5fd'; // Blue-300
    return '#e5e7eb'; // Gray-200
  };

  const HEX_SIZE = 60;
  const VIEWBOX_WIDTH = 600;
  const VIEWBOX_HEIGHT = 600;
  const X_OFFSET = 50;
  const Y_OFFSET = 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Tessellation Map Visualization */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col relative">
        <div className="flex justify-between items-center mb-6 z-10">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Hexagon className="mr-2 text-red-600" size={20} />
            Teselación Estratégica (Medellín - Bello)
          </h2>
          <div className="flex space-x-2 text-xs bg-white/80 p-2 rounded-lg backdrop-blur-sm">
            <span className="flex items-center"><span className="w-3 h-3 bg-red-600 rounded-full mr-1"></span>Alta</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-orange-500 rounded-full mr-1"></span>Media</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-blue-300 rounded-full mr-1"></span>Baja</span>
          </div>
        </div>
        
        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden flex items-center justify-center">
            {/* SVG MAP ENGINE */}
            <svg 
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} 
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <g transform={`translate(${X_OFFSET}, ${Y_OFFSET})`}>
                {processedZones.map((zone) => {
                  const { x, y } = calculateHexPosition(zone.hexQ, zone.hexR, HEX_SIZE);
                  // Pointy topped points
                  const points = [0, 1, 2, 3, 4, 5].map(i => {
                      const angle_deg = 60 * i - 30;
                      const angle_rad = Math.PI / 180 * angle_deg;
                      return `${x + HEX_SIZE * Math.cos(angle_rad)},${y + HEX_SIZE * Math.sin(angle_rad)}`;
                  }).join(" ");

                  const isHovered = hoveredZone?.id === zone.id;

                  return (
                    <g 
                      key={zone.id} 
                      onMouseEnter={() => setHoveredZone(zone)}
                      onMouseLeave={() => setHoveredZone(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <polygon 
                        points={points}
                        fill={getColor(zone.opportunityIndex)}
                        stroke={isHovered ? "#1e40af" : "white"}
                        strokeWidth={isHovered ? 4 : 2}
                        opacity={0.9}
                        className="transition-all duration-300"
                      />
                      {/* Text Label centered */}
                      <text 
                        x={x} 
                        y={y - 5} 
                        textAnchor="middle" 
                        fill={zone.opportunityIndex > 0.6 ? "white" : "#374151"}
                        className="text-[10px] font-bold pointer-events-none"
                        style={{ fontSize: '10px', fontWeight: 'bold' }}
                      >
                        {zone.id.toUpperCase()}
                      </text>
                      <text 
                        x={x} 
                        y={y + 10} 
                        textAnchor="middle" 
                        fill={zone.opportunityIndex > 0.6 ? "white" : "#374151"}
                        className="text-[8px] pointer-events-none"
                        style={{ fontSize: '9px' }}
                      >
                        {(zone.opportunityIndex * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            
            {/* Floating Info Box for Map */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 text-xs max-w-[200px]">
              <p className="font-bold text-gray-700">Modelo de Teselación</p>
              <p className="text-gray-500">Hexágonos ponderados para alcanzar el umbral de 40k votos.</p>
            </div>
        </div>
      </div>

      {/* Strategic List / Detail Panel */}
      <div className="bg-white p-0 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {hoveredZone ? (
           <div className="bg-blue-600 p-6 text-white h-full flex flex-col justify-center animate-in fade-in duration-200">
              <h3 className="text-2xl font-bold mb-1">{hoveredZone.name}</h3>
              <p className="text-blue-100 text-sm mb-6 uppercase tracking-wider">{hoveredZone.municipality}</p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Aporte a los 40k</span>
                    <span className="font-bold">{(hoveredZone.opportunityIndex * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-blue-900/30 rounded-full">
                    <div className="h-full bg-white rounded-full" style={{ width: `${hoveredZone.opportunityIndex * 100}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <span className="block text-xs text-blue-200">Población</span>
                    <span className="block text-lg font-bold">{hoveredZone.population.toLocaleString()}</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg">
                    <span className="block text-xs text-blue-200">Votos CD</span>
                    <span className="block text-lg font-bold">~{(hoveredZone.population * 0.12).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/20">
                  <p className="text-xs text-blue-100 leading-relaxed">
                     Esta zona es vital para sumar al volumen del partido ({PARTY_NAME}) y asegurar el voto preferente para Yulieth.
                  </p>
                </div>
              </div>
           </div>
        ) : (
          <>
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Top Zonas para los 40k</h3>
              <p className="text-xs text-gray-500">Prioridad para asegurar el umbral personal</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {processedZones.slice(0, 8).map((zone, idx) => (
                    <div key={zone.id} onMouseEnter={() => setHoveredZone(zone)} className="cursor-pointer flex items-center p-3 hover:bg-gray-50 rounded-lg border-b border-gray-50 last:border-0 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mr-3">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <h4 className="text-sm font-semibold text-gray-800">{zone.name}</h4>
                                <span className="text-xs font-bold text-green-600">Alta Prob.</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                                <div 
                                    className="bg-blue-600 h-1.5 rounded-full" 
                                    style={{ width: `${zone.opportunityIndex * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const LegislativeView = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Leyes Impulsadas" value={LEGISLATIVE_STATS.laws} subtext="Periodo Anterior (Cámara)" trend={2} icon={BookOpen} color="green" />
                <MetricCard title="Debates Nacionales" value={LEGISLATIVE_STATS.debates} subtext="Control Político Activo" trend={15} icon={MessageCircle} color="blue" />
                <MetricCard title="Asistencia Plenaria" value={`${LEGISLATIVE_STATS.attendance}%`} subtext="Cumplimiento Excelente" icon={CheckCircle} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Web Crawler Widget */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-96">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <Globe className="mr-2 text-blue-500" size={20} />
                            Inteligencia Web (Campaña 2026)
                        </h3>
                        <div className="flex items-center space-x-2">
                             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                             <span className="text-xs text-gray-500 font-mono">LIVE FEED</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {WEB_MENTIONS.map(mention => (
                            <div key={mention.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{mention.source}</span>
                                    <span className="text-xs text-gray-400">{mention.date}</span>
                                </div>
                                <p className="text-sm text-gray-700 italic mb-2">"{mention.snippet}"</p>
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${mention.sentiment === 'positive' ? 'bg-green-500' : mention.sentiment === 'neutral' ? 'bg-gray-400' : 'bg-red-500'}`}></div>
                                    <span className="text-xs text-gray-500 capitalize">{mention.sentiment}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                 {/* Electoral Growth Chart Placeholder */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center">
                        <TrendingUp className="mr-2 text-purple-600" size={20} />
                        Proyección Curul Cámara 2026
                    </h3>
                    <div className="h-64 flex items-end justify-around pb-6 border-b border-gray-100">
                        <div className="flex flex-col items-center group">
                            <div className="text-xs font-bold text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">22k</div>
                            <div className="w-16 bg-gray-300 h-24 rounded-t-lg relative hover:bg-gray-400 transition-colors"></div>
                            <div className="mt-2 text-xs font-semibold text-gray-500">2014 (Asamb)</div>
                        </div>
                        <div className="flex flex-col items-center group">
                            <div className="text-xs font-bold text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">45k</div>
                            <div className="w-16 bg-purple-400 h-40 rounded-t-lg relative hover:bg-purple-500 transition-colors"></div>
                            <div className="mt-2 text-xs font-semibold text-gray-500">2018 (Cámara)</div>
                        </div>
                         <div className="flex flex-col items-center group">
                            <div className="text-xs font-bold text-blue-600 mb-1 opacity-100">40k (Min)</div>
                            <div className="w-16 bg-blue-600 h-56 rounded-t-lg relative shadow-lg shadow-blue-200">
                                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>
                                {/* Threshold Line */}
                                <div className="absolute top-0 w-full border-t-2 border-red-500 -mt-0"></div>
                            </div>
                            <div className="mt-2 text-xs font-bold text-blue-700">2026</div>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">Modelo: Recuperación de Curul + Expansión en Bello.</p>
                    </div>
                 </div>
            </div>
        </div>
    )
}

const ReportsView = ({ zones }: { zones: ZoneData[] }) => {
    const totalPotential = zones.reduce((acc, z) => acc + (z.population * 0.45), 0); // Assuming 45% voter turnout
    
    // Updated Logic for 40k Threshold
    const currentProjection = 32500; // Simulated current consolidated votes
    const projectionPercentage = (currentProjection / CANDIDATE_SAFE_THRESHOLD) * 100;

    const [isSharing, setIsSharing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    const handleShare = () => {
        setIsSharing(true);
        // Simulate link generation
        setTimeout(() => {
            const mockUrl = `https://yulieth-sanchez-2026.app/report/${Math.random().toString(36).substring(7)}`;
            setShareUrl(mockUrl);
            navigator.clipboard.writeText(mockUrl);
            setTimeout(() => setIsSharing(false), 2000);
        }, 800);
    };

    const handleExport = () => {
        setIsExporting(true);
        // Simulate PDF generation
        setTimeout(() => {
            setIsExporting(false);
            alert("Dossier Estratégico 2026 generado. Descargando...");
        }, 1500);
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-800 text-sm">Centro de Comando 2026</h3>
                    <p className="text-xs text-gray-400">Objetivo: Cámara de Representantes</p>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={handleShare}
                        disabled={isSharing}
                        className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                        {isSharing ? (
                            <span className="flex items-center"><CheckCircle size={16} className="mr-2" /> Link Copiado</span>
                        ) : (
                            <>
                                <Share2 size={16} className="mr-2" />
                                Compartir
                            </>
                        )}
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                    >
                        {isExporting ? (
                             <span className="flex items-center">Generando...</span>
                        ) : (
                            <>
                                <Download size={16} className="mr-2" />
                                Exportar Dossier
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center"><PieChart className="mr-2 text-green-600" size={20} /> Proyección Votos</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{PARTY_NAME}</span>
                    </h3>
                    
                    <div className="relative pt-6 pb-2">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="font-semibold text-gray-500">Actual: {currentProjection.toLocaleString()}</span>
                            <span className="font-bold text-red-600">Meta Segura: {CANDIDATE_SAFE_THRESHOLD.toLocaleString()}</span>
                        </div>
                        
                        {/* Threshold Bar */}
                        <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden relative">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${projectionPercentage >= 100 ? 'bg-green-500' : 'bg-yellow-400'}`} 
                                style={{ width: `${Math.min(projectionPercentage, 100)}%` }}
                            ></div>
                            {/* Marker for 40k */}
                            <div className="absolute top-0 bottom-0 border-r-2 border-red-500 border-dashed" style={{ left: '80%' }}></div>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">La línea roja indica el umbral mínimo para pelear la 5ta curul.</p>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-2 text-center bg-gray-50 p-4 rounded-lg">
                         <div>
                            <span className="block text-xs text-gray-500">Meta Partido</span>
                            <span className="font-bold text-blue-800 text-sm">500k</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">Curules</span>
                            <span className="font-bold text-blue-800 text-sm">5</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">Umbral Ind.</span>
                            <span className="font-bold text-red-600 text-sm">40k</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                        <Layers className="mr-2 text-orange-600" size={20} />
                        Mapa de Calor (Aporte a los 40k)
                    </h3>
                    <div className="space-y-4">
                        {zones.slice(0, 5).map(z => (
                            <div key={z.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{z.name}</span>
                                    <span className="font-medium text-gray-900">{((z.demographicDensity) * 100).toFixed(0)}% Eficiencia</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${z.demographicDensity * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg">
                        <p><strong>Estrategia:</strong> Concentrar esfuerzos en Bello para asegurar 25k votos base y completar 15k en Medellín Norte.</p>
                    </div>
                </div>
             </div>
        </div>
    )
}

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
            label="Teselación Mapa (Z)" 
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
                {activeTab === 'map' && 'Fase 2: Inteligencia Geoespacial (Teselación)'}
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
                                <h3 className="text-2xl font-bold mb-2">Teselación Geoespacial</h3>
                                <p className="text-blue-200 mb-6 max-w-md">
                                    Visualice las zonas estratégicas para recolectar los 40,000 votos necesarios.
                                </p>
                                <button 
                                    className="bg-white text-blue-900 px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center"
                                >
                                    Ver Mapa Estratégico <ChevronRight size={16} className="ml-2" />
                                </button>
                            </div>
                            <Hexagon className="absolute -bottom-8 -right-8 text-blue-700 opacity-20 group-hover:scale-110 transition-transform duration-500" size={200} />
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

            {activeTab === 'map' && <GeoAnalysisView zones={INITIAL_ZONES} activeSegments={segments} />}
            
            {activeTab === 'reports' && <ReportsView zones={INITIAL_ZONES} />}
        </div>
      </main>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);