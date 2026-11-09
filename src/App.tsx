import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  Download,
  FileText,
  SlidersHorizontal,
  RotateCcw,
  AlertCircle,
  Loader2,
  Eye,
  Code2,
  X,
  Calendar,
  Upload,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_SUPERPROMPT_HAUSBEC_V2,
  DEFAULT_CALENDAR_HAUSBEC,
  extractWeekFromCalendar,
} from './superprompt';

type WorkMode = 'calendario' | 'temas' | 'solo';
type VisualMode = 'ambas' | 'foto' | 'infografia';

const CALENDAR_STORAGE_KEY = 'hausbec_approved_editorial_calendar_v2';
const SUPERPROMPT_STORAGE_KEY = 'hausbec_custom_superprompt_v4';

function getCurrentISOWeek(): number {
  const now = new Date();
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return Math.min(Math.max(weekNo, 1), 53);
}

function CopyableCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-3 rounded-lg bg-[#111C16] border border-[#1E3127] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#18271F] border-b border-[#24382D]">
        <span className="font-mono text-[11px] text-[#9EB2A6]">Bloque listo para copiar</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#E6ECE8] hover:bg-[#24382D] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#6EE7B7]" />
              <span>✓ Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copiar bloque</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-[#E6ECE8] font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap break-words">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Clean Markdown-to-JSX renderer for structured editorial blocks
 */
function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const renderInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-[#16211B]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="font-mono text-xs bg-[#EDEBE4] text-[#1B3B2B] px-1.5 py-0.5 rounded"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<CopyableCodeBlock key={`code-${index}`} code={codeBuffer.join('\n')} />);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={index} className="h-2.5" />);
      return;
    }

    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={index}
          className="my-2.5 p-3.5 rounded-lg bg-[#F2F6F3] border border-[#C8D8CE] text-sm font-medium text-[#16211B] leading-relaxed"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={index}
          className="font-display text-xl font-bold text-[#1B3B2B] mt-6 mb-2 pb-2 border-b border-[#DCD9CE]"
        >
          {trimmed.slice(2)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={index}
          className="font-display text-lg font-semibold text-[#1B3B2B] mt-5 mb-2"
        >
          {trimmed.slice(3)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={index}
          className="font-display text-base font-semibold text-[#233D2F] mt-4 mb-1.5"
        >
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4
          key={index}
          className="font-display text-sm font-semibold text-[#2C4C3B] mt-3 mb-1"
        >
          {trimmed.slice(5)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      const checked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
      const itemText = trimmed.slice(6);
      elements.push(
        <div key={index} className="flex items-start gap-2.5 py-1 text-sm text-[#2A362F]">
          <span
            className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded border text-xs shrink-0 ${
              checked
                ? 'bg-[#1B3B2B] border-[#1B3B2B] text-white'
                : 'border-[#9BA89F] bg-white text-transparent'
            }`}
          >
            ✓
          </span>
          <span className="leading-relaxed">{renderInline(itemText)}</span>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={index} className="flex items-start gap-2.5 py-0.5 pl-1 text-sm text-[#2A362F]">
          <span className="text-[#1B3B2B] font-bold select-none">•</span>
          <span className="leading-relaxed">{renderInline(trimmed.slice(2))}</span>
        </div>
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
      if (match) {
        elements.push(
          <div key={index} className="flex items-start gap-2.5 py-0.5 pl-1 text-sm text-[#2A362F]">
            <span className="font-mono text-xs font-semibold text-[#1B3B2B] mt-0.5 shrink-0 tabular-nums">
              {match[1]}
            </span>
            <span className="leading-relaxed">{renderInline(match[2])}</span>
          </div>
        );
        return;
      }
    }

    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={index} className="my-4 border-[#E2DFD5]" />);
      return;
    }

    elements.push(
      <p key={index} className="text-sm text-[#2A362F] leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  return <div className="space-y-1">{elements}</div>;
}

export default function App() {
  const currentYear = new Date().getFullYear();
  const [workMode, setWorkMode] = useState<WorkMode>('calendario');
  const [weekNumber, setWeekNumber] = useState<number>(getCurrentISOWeek());
  const [year, setYear] = useState<number>(currentYear);
  const [topic1, setTopic1] = useState<string>('');
  const [topic2, setTopic2] = useState<string>('');
  const [singleTopic, setSingleTopic] = useState<string>('');
  const [visualMode, setVisualMode] = useState<VisualMode>('ambas');

  // Clipboard states
  const [copiedInstruction, setCopiedInstruction] = useState<boolean>(false);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  // AI Development states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [viewFormatted, setViewFormatted] = useState<boolean>(true);

  // Superprompt & Editorial Calendar state (persisted in localStorage)
  const [superpromptText, setSuperpromptText] = useState<string>(() => {
    try {
      return localStorage.getItem(SUPERPROMPT_STORAGE_KEY) || DEFAULT_SUPERPROMPT_HAUSBEC_V2;
    } catch {
      return DEFAULT_SUPERPROMPT_HAUSBEC_V2;
    }
  });
  const [calendarText, setCalendarText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return saved && saved.trim().length > 0 ? saved : DEFAULT_CALENDAR_HAUSBEC;
    } catch {
      return DEFAULT_CALENDAR_HAUSBEC;
    }
  });

  const [isSuperpromptModalOpen, setIsSuperpromptModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);

  const aiResultRef = useRef<HTMLDivElement | null>(null);
  const calendarFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SUPERPROMPT_STORAGE_KEY, superpromptText);
    } catch {
      // ignore storage errors
    }
  }, [superpromptText]);

  useEffect(() => {
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, calendarText);
    } catch {
      // ignore storage errors
    }
  }, [calendarText]);

  const handleCalendarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCalendarText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Check if the selected week exists in the loaded calendar
  const matchedWeekContent = useMemo(() => {
    return extractWeekFromCalendar(calendarText, weekNumber);
  }, [calendarText, weekNumber]);

  // Live instruction computed via useMemo according to the exact specification
  const generatedInstruction = useMemo(() => {
    const header = `SUPERPROMPT HAUSBEC — INSTRUCCIÓN SEMANAL\n\nAplica íntegramente el Superprompt Maestro Hausbec y entrega los contenidos terminados, no solo ideas. Respeta el rigor técnico de la sección 11 (nada de datos inventados) y el checklist GEO/AEO del Bloque 6.`;

    const safeWeek = Number.isFinite(weekNumber) && weekNumber >= 1 && weekNumber <= 53 ? weekNumber : 1;
    const safeYear = Number.isFinite(year) && year > 1900 ? year : currentYear;

    let modeBlock = '';
    if (workMode === 'calendario') {
      const baseCalendario = `Desarrolla la semana ${safeWeek} del año ${safeYear} según el calendario editorial aprobado. Si el calendario no está disponible en el contexto, indícalo claramente y no afirmes haberlo comprobado; en ese caso, proponme los dos temas más pertinentes de esta semana del recorrido editorial (descubrir, comprender, comparar, planificar, elegir profesionales, contactar) y espera mi confirmación antes de redactar.`;
      if (matchedWeekContent) {
        modeBlock = `${baseCalendario}\n\nCONTENIDO DEL CALENDARIO EDITORIAL APROBADO PARA LA SEMANA ${safeWeek}:\n${matchedWeekContent}`;
      } else {
        modeBlock = baseCalendario;
      }
    } else if (workMode === 'temas') {
      const t1 = topic1.trim() || '[Indicar tema del artículo 1]';
      const t2 = topic2.trim() || '[Indicar tema del artículo 2]';
      modeBlock = `Desarrolla la semana ${safeWeek} del año ${safeYear} con los temas que indico, sustituyendo los del calendario. Explica la relación entre ambos artículos, su intención de búsqueda, y comprueba que no se cannibalizan. TEMA DEL ARTÍCULO 1 (lunes): ${t1}. TEMA DEL ARTÍCULO 2 (jueves): ${t2}.`;
    } else {
      const tSolo = singleTopic.trim() || '[Indicar tema a desarrollar]';
      modeBlock = `Desarrolla un solo tema, sin preparar la semana completa: un artículo de blog y su publicación de Instagram relacionada. TEMA: ${tSolo}.`;
    }

    let visualBlock = '';
    if (visualMode === 'ambas') {
      visualBlock = `Prepara dos alternativas visuales para cada publicación: una fotografía arquitectónica editorial y una infografía explicativa.`;
    } else if (visualMode === 'foto') {
      visualBlock = `Prepara solo propuestas fotográficas (estética arquitectónica editorial hiperrealista). Omito las infografías esta semana.`;
    } else {
      visualBlock = `Prepara solo infografías explicativas. Omito las propuestas fotográficas esta semana.`;
    }

    const footer = `FORMATOS: blog 4:3, Instagram 4:5. Prompts de imagen en inglés con traducción al español, sin texto, logotipos ni marcas de agua dentro de las imágenes, y cinco titulares breves por pieza visual.\nSigue el formato de entrega del superprompt: Bloque 1 (enfoque editorial), Bloques 2-5 (contenidos completos) y Bloque 6 (control de calidad con el checklist completado).\n\nADAPTACIÓN DE FORMATO DE SALIDA PARA CMS (WORDPRESS + YOAST SEO):\nPara todos los contenidos de blog generados en las entregas semanales de Hausbec, no entregues únicamente el texto continuo. Debes estructurar la salida dividida explícitamente en módulos listos para copiar y pegar directamente en WordPress (editor de bloques Gutenberg) y el plugin Yoast SEO, con el siguiente esquema obligatorio:\n\n1. CAJA DE CONFIGURACIÓN YOAST SEO:\n   Entrega en un bloque de código limpio los valores exactos para:\n   - Frase clave objetivo (Focus Keyphrase)\n   - Slug de la URL\n   - Título SEO (Meta Title, máx. 60 caracteres)\n   - Metadescripción (máx. 155 caracteres)\n\n2. CUERPO DE ENTRADA PARA GUTENBERG (WORDPRESS):\n   Entrega el artículo completo en formato Markdown puro para que al pegar en Gutenberg se transforme automáticamente en los bloques correspondientes:\n   - Bloque Cita (> ): La respuesta directa extraíble (AEO/Rich Snippet) de apertura.\n   - Encabezados (## para H2 y ### para H3): Sin saltos de jerarquía.\n   - Párrafos limpios y listas con viñetas (* o -).\n   - Tablas comparativas en sintaxis Markdown (| Columna |).\n   - Bloque final de CTA claramente delimitado con separación horizontal (---).\n\n3. BLOQUE DE METADATOS Y MEDIA:\n   - Texto alternativo (Alt Text) exacto para la Imagen Destacada.\n   - Código Schema.org (BlogPosting) listo para bloque 'HTML Personalizado', envuelto estrictamente entre etiquetas completas: <script type="application/ld+json">...</script>.\n\nNo agregues introducciones conversacionales ni resúmenes posteriores. Entrega el contenido listo para producción editorial. No incluyas Facebook ni LinkedIn. Ante cualquier dato que no puedas respaldar (precio, plazo, ahorro), indícalo expresamente en lugar de inventarlo.`;

    return [header, modeBlock, visualBlock, footer].join('\n\n');
  }, [workMode, weekNumber, year, currentYear, topic1, topic2, singleTopic, visualMode, matchedWeekContent]);

  const handleCopyInstruction = async () => {
    try {
      await navigator.clipboard.writeText(generatedInstruction);
      setCopiedInstruction(true);
      setTimeout(() => {
        setCopiedInstruction(false);
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedInstruction;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedInstruction(true);
      setTimeout(() => {
        setCopiedInstruction(false);
      }, 2000);
    }
  };

  const handleCopyAiResponse = async () => {
    if (!aiResponse) return;
    try {
      await navigator.clipboard.writeText(aiResponse);
      setCopiedResponse(true);
      setTimeout(() => {
        setCopiedResponse(false);
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = aiResponse;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedResponse(true);
      setTimeout(() => {
        setCopiedResponse(false);
      }, 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!aiResponse) return;
    const filename =
      workMode === 'solo'
        ? `hausbec-tema-editorial-${year}.md`
        : `hausbec-semana-${weekNumber}-${year}.md`;

    const blob = new Blob([aiResponse], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDevelopWithAI = async () => {
    setIsGenerating(true);
    setAiError(null);
    setAiResponse('');

    setTimeout(() => {
      aiResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const combinedSystemInstruction = calendarText.trim()
      ? `${superpromptText}\n\n---\n\n# CALENDARIO EDITORIAL APROBADO DE HAUSBEC\nEste es el calendario editorial aprobado oficial de Hausbec. Cuando el usuario pida desarrollar una semana según el calendario aprobado, DEBES ceñirte estrictamente a los títulos, días (Lunes, Martes, Jueves, Viernes), bloque y objetivo definidos aquí para esa semana:\n\n${calendarText.trim()}`
      : superpromptText;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruction: generatedInstruction,
          systemInstruction: combinedSystemInstruction,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Error del servidor (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMessage = errData.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('El navegador no pudo abrir el flujo de lectura de la respuesta.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              setAiResponse((prev) => prev + parsed.text);
            }
          } catch (err) {
            if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
              throw err;
            }
          }
        }
      }
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la generación con Gemini. Inténtalo de nuevo.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const hasCalendarLoaded = calendarText.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#16211B]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-20 bg-[#F7F6F2]/95 backdrop-blur border-b border-[#DFDDD4]">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <a
            href="#formulario"
            className="font-display text-lg font-bold tracking-tight text-[#1B3B2B] whitespace-nowrap shrink-0"
          >
            Generador de instrucciones Hausbec
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4A5850]">
            <a
              href="#formulario"
              className="hover:text-[#1B3B2B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Instrucción semanal
            </a>
            <a
              href="#vista-previa"
              className="hover:text-[#1B3B2B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Vista previa
            </a>
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="hover:text-[#1B3B2B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Calendario editorial
            </button>
            <button
              type="button"
              onClick={() => setIsSuperpromptModalOpen(true)}
              className="hover:text-[#1B3B2B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Superprompt Maestro v2
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleCopyInstruction}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1B3B2B] rounded-lg hover:bg-[#142D20] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedInstruction ? '✓ Copiada' : 'Copiar instrucción'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Two columns on desktop, stacked on mobile */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD5] pb-6">
          <div>
            <p className="text-xs font-medium text-[#526358] mb-1">
              Herramienta editorial interna · Viviendas de alta eficiencia energética en Cataluña
            </p>
            <h1
              className="font-display text-2xl sm:text-3xl font-bold text-[#16211B] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Planificación y desarrollo semanal Passivhaus
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#526358]">
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium text-[#1B3B2B] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {hasCalendarLoaded
                  ? 'Calendario aprobado cargado (editar)'
                  : 'Cargar calendario aprobado'}
              </span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsSuperpromptModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium text-[#1B3B2B] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Revisar Superprompt Maestro v2</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN — Formulario "Instrucción semanal" */}
          <section
            id="formulario"
            aria-labelledby="heading-formulario"
            className="lg:col-span-6 bg-white border border-[#DFDDD4] rounded-xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-[#ECEAE2]">
              <div>
                <h2
                  id="heading-formulario"
                  className="font-display text-xl font-bold text-[#16211B]"
                >
                  Instrucción semanal
                </h2>
                <p className="text-sm text-[#5A685F] mt-0.5">
                  Configura los parámetros de la entrega editorial de esta semana.
                </p>
              </div>
              <span className="text-xs font-mono text-[#5A685F] tabular-nums whitespace-nowrap shrink-0">
                S{String(weekNumber).padStart(2, '0')} / {year}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCopyInstruction();
              }}
              className="space-y-7"
            >
              {/* 1. ¿Cómo quieres trabajar? */}
              <fieldset>
                <legend className="block font-display text-sm font-semibold text-[#16211B] mb-3">
                  1. ¿Cómo quieres trabajar?
                </legend>
                <div className="space-y-2.5">
                  {[
                    {
                      id: 'calendario' as WorkMode,
                      label: 'Desarrollar la semana según el calendario aprobado',
                    },
                    {
                      id: 'temas' as WorkMode,
                      label: 'Desarrollar la semana con los temas que yo indique',
                    },
                    {
                      id: 'solo' as WorkMode,
                      label: 'Desarrollar un solo tema: artículo y su Instagram',
                    },
                  ].map((option) => {
                    const isSelected = workMode === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3.5 p-3.5 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F2F6F3] border-[#1B3B2B] text-[#16211B]'
                            : 'bg-[#FAF9F6] border-[#E2DFD5] text-[#2E3B33] hover:border-[#B8C4BC]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setWorkMode(option.id)}
                          className="mt-1 h-4 w-4 accent-[#1B3B2B] shrink-0"
                        />
                        <span className="text-sm font-medium leading-snug">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* 2. Campos "Número de semana" (1-53) y "Año" — solo si el modo es "calendario" o "temas" */}
              {(workMode === 'calendario' || workMode === 'temas') && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="weekNumber"
                        className="block font-display text-sm font-semibold text-[#16211B] mb-1.5"
                      >
                        Número de semana (1-53)
                      </label>
                      <input
                        id="weekNumber"
                        type="number"
                        min={1}
                        max={53}
                        value={weekNumber}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (Number.isNaN(val)) {
                            setWeekNumber(1);
                          } else {
                            setWeekNumber(Math.min(Math.max(val, 1), 53));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF9F6] border border-[#D5D2C6] text-sm font-mono tabular-nums text-[#16211B] focus:outline-none focus:border-[#1B3B2B] focus:ring-2 focus:ring-[#1B3B2B]/15 transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="yearInput"
                        className="block font-display text-sm font-semibold text-[#16211B] mb-1.5"
                      >
                        Año
                      </label>
                      <input
                        id="yearInput"
                        type="number"
                        min={2020}
                        max={2100}
                        value={year}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setYear(Number.isNaN(val) ? currentYear : val);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF9F6] border border-[#D5D2C6] text-sm font-mono tabular-nums text-[#16211B] focus:outline-none focus:border-[#1B3B2B] focus:ring-2 focus:ring-[#1B3B2B]/15 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Estado de detección de la semana en el calendario aprobado */}
                  {workMode === 'calendario' && (
                    <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E2DFD5] space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[#1B3B2B]">
                          {matchedWeekContent
                            ? `✓ Semana ${weekNumber} encontrada en el calendario aprobado`
                            : `Semana ${weekNumber} aún no definida en el calendario cargado`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCalendarModalOpen(true)}
                          className="text-xs font-semibold text-[#1B3B2B] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Editar calendario completo
                        </button>
                      </div>

                      {matchedWeekContent ? (
                        <pre className="font-mono text-xs text-[#2E3B33] whitespace-pre-wrap leading-relaxed pt-1 border-t border-[#ECEAE2]">
                          {matchedWeekContent}
                        </pre>
                      ) : (
                        <p className="text-xs text-[#5A685F] leading-relaxed">
                          Pulsa «Editar calendario completo» para pegar el resto de semanas aprobadas. Si no está definida, la instrucción pedirá a la IA que proponga los temas antes de redactar.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Campos de temas — mostrar solo si el modo NO es "calendario" */}
              {workMode !== 'calendario' && (
                <div className="space-y-4 pt-1">
                  {workMode === 'temas' ? (
                    <>
                      <div>
                        <label
                          htmlFor="topic1"
                          className="block font-display text-sm font-semibold text-[#16211B] mb-1.5"
                        >
                          Tema del artículo 1 (lunes)
                        </label>
                        <textarea
                          id="topic1"
                          rows={3}
                          value={topic1}
                          onChange={(e) => setTopic1(e.target.value)}
                          placeholder="Ej.: Cómo funciona la ventilación mecánica de doble flujo en climas húmedos de la costa catalana y por qué evita condensaciones"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF9F6] border border-[#D5D2C6] text-sm text-[#16211B] placeholder:text-[#849188] focus:outline-none focus:border-[#1B3B2B] focus:ring-2 focus:ring-[#1B3B2B]/15 transition-colors resize-y"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="topic2"
                          className="block font-display text-sm font-semibold text-[#16211B] mb-1.5"
                        >
                          Tema del artículo 2 (jueves)
                        </label>
                        <textarea
                          id="topic2"
                          rows={3}
                          value={topic2}
                          onChange={(e) => setTopic2(e.target.value)}
                          placeholder="Ej.: Mantenimiento real y consumo eléctrico de un sistema VMC en una vivienda unifamiliar Passivhaus"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF9F6] border border-[#D5D2C6] text-sm text-[#16211B] placeholder:text-[#849188] focus:outline-none focus:border-[#1B3B2B] focus:ring-2 focus:ring-[#1B3B2B]/15 transition-colors resize-y"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label
                        htmlFor="singleTopic"
                        className="block font-display text-sm font-semibold text-[#16211B] mb-1.5"
                      >
                        Tema a desarrollar
                      </label>
                      <textarea
                        id="singleTopic"
                        rows={3}
                        value={singleTopic}
                        onChange={(e) => setSingleTopic(e.target.value)}
                        placeholder="Ej.: Qué comprobar antes de comprar una parcela en Cataluña para construir una casa pasiva (orientación solar, pendiente y normativa urbanística)"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF9F6] border border-[#D5D2C6] text-sm text-[#16211B] placeholder:text-[#849188] focus:outline-none focus:border-[#1B3B2B] focus:ring-2 focus:ring-[#1B3B2B]/15 transition-colors resize-y"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. Propuestas visuales */}
              <fieldset>
                <legend className="block font-display text-sm font-semibold text-[#16211B] mb-3">
                  Propuestas visuales
                </legend>
                <div className="space-y-2.5">
                  {[
                    {
                      id: 'ambas' as VisualMode,
                      label: 'Fotografía e infografía para cada publicación',
                    },
                    {
                      id: 'foto' as VisualMode,
                      label: 'Solo fotografía',
                    },
                    {
                      id: 'infografia' as VisualMode,
                      label: 'Solo infografía',
                    },
                  ].map((option) => {
                    const isSelected = visualMode === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3.5 p-3.5 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F2F6F3] border-[#1B3B2B] text-[#16211B]'
                            : 'bg-[#FAF9F6] border-[#E2DFD5] text-[#2E3B33] hover:border-[#B8C4BC]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="visualMode"
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setVisualMode(option.id)}
                          className="mt-1 h-4 w-4 accent-[#1B3B2B] shrink-0"
                        />
                        <span className="text-sm font-medium leading-snug">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* 5 & 6. Botones de acción */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* 5. Botón primario "Copiar instrucción" */}
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#1B3B2B] hover:bg-[#142D20] text-white font-display text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedInstruction ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>✓ Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar instrucción</span>
                    </>
                  )}
                </button>

                {/* 6. Botón secundario "Desarrollar con IA" */}
                <button
                  type="button"
                  onClick={handleDevelopWithAI}
                  disabled={isGenerating}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#EFECE4] hover:bg-[#E4E0D4] disabled:opacity-60 text-[#1B3B2B] border border-[#C9C5B6] font-display text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Desarrollando contenido...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Desarrollar con IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* RIGHT COLUMN — Vista previa & Resultado IA */}
          <div className="lg:col-span-6 space-y-6">
            {/* Panel "Instrucción lista para copiar" */}
            <section
              id="vista-previa"
              aria-labelledby="heading-vista-previa"
              className="bg-white border border-[#DFDDD4] rounded-xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2
                    id="heading-vista-previa"
                    className="font-display text-xl font-bold text-[#16211B]"
                  >
                    Instrucción lista para copiar
                  </h2>
                  <p className="text-xs text-[#5A685F] mt-0.5">
                    Actualización en tiempo real según los parámetros seleccionados
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyInstruction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#F2F6F3] text-[#1B3B2B] hover:bg-[#E4EDE7] border border-[#C8D8CE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedInstruction ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>✓ Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-lg bg-[#111C16] border border-[#1E3127] p-5 max-h-[380px] overflow-y-auto">
                <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-[#E7EFEA] whitespace-pre-wrap break-words">
                  {generatedInstruction}
                </pre>
              </div>
            </section>

            {/* Panel "Cómo utilizarla" */}
            <section
              id="como-utilizarla"
              aria-labelledby="heading-como-utilizarla"
              className="bg-white border border-[#DFDDD4] rounded-xl p-6 sm:p-8"
            >
              <h2
                id="heading-como-utilizarla"
                className="font-display text-lg font-bold text-[#16211B] mb-4"
              >
                Cómo utilizarla
              </h2>
              <ul className="space-y-3 text-sm text-[#2E3B33]">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[#1B3B2B] mt-0.5 tabular-nums shrink-0">
                    01.
                  </span>
                  <span className="leading-relaxed">
                    Cada semana: elige «calendario aprobado», introduce el número de semana y copia.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[#1B3B2B] mt-0.5 tabular-nums shrink-0">
                    02.
                  </span>
                  <span className="leading-relaxed">
                    Si decides los temas tú: elige «temas que yo indique» y escribe los dos títulos.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[#1B3B2B] mt-0.5 tabular-nums shrink-0">
                    03.
                  </span>
                  <span className="leading-relaxed">
                    Si surge una idea nueva: elige «un solo tema» para obtener solo el artículo y su Instagram.
                  </span>
                </li>
              </ul>
            </section>

            {/* Panel de respuesta generada por IA */}
            {(isGenerating || aiResponse || aiError) && (
              <section
                ref={aiResultRef}
                aria-labelledby="heading-resultado-ia"
                className="bg-white border border-[#DFDDD4] rounded-xl p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#ECEAE2]">
                  <div>
                    <h2
                      id="heading-resultado-ia"
                      className="font-display text-xl font-bold text-[#16211B]"
                    >
                      Contenido desarrollado con Gemini
                    </h2>
                    <p className="text-xs text-[#5A685F] mt-0.5">
                      Basado en el Superprompt Maestro Hausbec v2 y la instrucción semanal
                    </p>
                  </div>

                  {aiResponse && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewFormatted((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#F7F6F2] text-[#2E3B33] hover:bg-[#ECE9DF] border border-[#D5D2C6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {viewFormatted ? (
                          <>
                            <Code2 className="w-3.5 h-3.5" />
                            <span>Ver Markdown</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Vista formateada</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyAiResponse}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#F2F6F3] text-[#1B3B2B] hover:bg-[#E4EDE7] border border-[#C8D8CE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedResponse ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>✓ Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar respuesta</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#1B3B2B] text-white hover:bg-[#142D20] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar .md</span>
                      </button>
                    </div>
                  )}
                </div>

                {aiError && (
                  <div className="p-4 rounded-lg bg-[#FDF2F2] border border-[#F2C6C6] text-[#9B1C1C] text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Error al desarrollar el contenido</p>
                      <p className="text-xs leading-relaxed">{aiError}</p>
                    </div>
                  </div>
                )}

                {isGenerating && !aiResponse && !aiError && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-7 h-7 text-[#1B3B2B] animate-spin" />
                    <div className="space-y-1">
                      <p className="font-display text-sm font-semibold text-[#16211B]">
                        Redactando los bloques editoriales de Hausbec...
                      </p>
                      <p className="text-xs text-[#5A685F]">
                        Aplicando estructura SEO, respuesta directa GEO/AEO, propuestas visuales y control de calidad.
                      </p>
                    </div>
                  </div>
                )}

                {aiResponse && (
                  <div className="max-h-[680px] overflow-y-auto pr-1">
                    {viewFormatted ? (
                      <div className="p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DC]">
                        <FormattedMarkdown content={aiResponse} />
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[#111C16] border border-[#1E3127] p-5">
                        <pre className="font-mono text-xs leading-relaxed text-[#E7EFEA] whitespace-pre-wrap break-words">
                          {aiResponse}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#DFDDD4] bg-[#F2F0E8]">
        <div className="max-w-[1440px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5A685F]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#1B3B2B]" />
            <span>Hausbec · Construcción de viviendas de alta eficiencia energética en Cataluña</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Estándar Passivhaus</span>
            <span aria-hidden="true">·</span>
            <span>Rigor técnico Sección 11</span>
            <span aria-hidden="true">·</span>
            <span>Checklist GEO/AEO Bloque 6</span>
          </div>
        </div>
      </footer>

      {/* Modal para cargar o pegar el Calendario Editorial Aprobado */}
      {isCalendarModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-calendar-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-[#DFDDD4] rounded-xl max-w-3xl w-full p-6 sm:p-8 shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#ECEAE2]">
              <div>
                <h2
                  id="modal-calendar-title"
                  className="font-display text-lg font-bold text-[#16211B]"
                >
                  Calendario Editorial Aprobado de Hausbec
                </h2>
                <p className="text-xs text-[#5A685F] mt-1">
                  Pega aquí todas las semanas de tu calendario editorial con el formato <code className="font-mono">### Semana N</code> (como la Semana 45 ya incluida) o sube tu archivo <code className="font-mono">.md</code> / <code className="font-mono">.txt</code>. Al elegir el número de semana en el formulario, la app extraerá automáticamente el bloque exacto de esa semana.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="p-1.5 rounded-lg text-[#5A685F] hover:text-[#16211B] hover:bg-[#F2F0E8] transition-colors cursor-pointer"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={calendarFileInputRef}
                  type="file"
                  accept=".md,.txt,.csv,.json"
                  onChange={handleCalendarFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => calendarFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F2F6F3] text-[#1B3B2B] hover:bg-[#E4EDE7] border border-[#C8D8CE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo (.md, .txt, .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCalendarText(DEFAULT_CALENDAR_HAUSBEC)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#4A5850] hover:text-[#16211B] hover:bg-[#F2F0E8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar por defecto</span>
                </button>
              </div>

              {hasCalendarLoaded && (
                <button
                  type="button"
                  onClick={() => setCalendarText('')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#9B1C1C] hover:bg-[#FDF2F2] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar calendario</span>
                </button>
              )}
            </div>

            <div className="my-4 flex-1 overflow-hidden flex flex-col">
              <textarea
                value={calendarText}
                onChange={(e) => setCalendarText(e.target.value)}
                rows={14}
                placeholder={`### Semana 45 · Del 2 al 8 de noviembre\n\nBloque: la parcela y el coste real de construir...`}
                className="w-full flex-1 p-4 rounded-lg bg-[#111C16] text-[#E7EFEA] placeholder:text-[#6E8275] font-mono text-xs leading-relaxed border border-[#1E3127] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B] resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[#5A685F]">
                {hasCalendarLoaded
                  ? `Calendario activo (${calendarText.trim().length} caracteres guardados)`
                  : 'Sin calendario cargado'}
              </span>

              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-[#1B3B2B] hover:bg-[#142D20] text-white font-display text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Guardar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para revisar o personalizar el Superprompt Maestro Hausbec v2 */}
      {isSuperpromptModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-superprompt-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-[#DFDDD4] rounded-xl max-w-3xl w-full p-6 sm:p-8 shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#ECEAE2]">
              <div>
                <h2
                  id="modal-superprompt-title"
                  className="font-display text-lg font-bold text-[#16211B]"
                >
                  Superprompt Maestro Hausbec v2 (Instrucciones del sistema)
                </h2>
                <p className="text-xs text-[#5A685F] mt-1">
                  Este texto se envía como instrucciones del sistema a Gemini cuando pulsas «Desarrollar con IA».
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuperpromptModalOpen(false)}
                className="p-1.5 rounded-lg text-[#5A685F] hover:text-[#16211B] hover:bg-[#F2F0E8] transition-colors cursor-pointer"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-hidden flex flex-col">
              <textarea
                value={superpromptText}
                onChange={(e) => setSuperpromptText(e.target.value)}
                rows={16}
                className="w-full flex-1 p-4 rounded-lg bg-[#111C16] text-[#E7EFEA] font-mono text-xs leading-relaxed border border-[#1E3127] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B] resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSuperpromptText(DEFAULT_SUPERPROMPT_HAUSBEC_V2)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#4A5850] hover:text-[#16211B] hover:bg-[#F2F0E8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Superprompt oficial v2</span>
                </button>
                <a
                  href="/assets/aistudio/Superprompt_Maestro_Hausbec_SEO_Completo_v2_5d3c0a3c.md"
                  download="Superprompt_Maestro_Hausbec_SEO_Completo_v2.md"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#1B3B2B] hover:bg-[#F2F6F3] transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar archivo .md original</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setIsSuperpromptModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-[#1B3B2B] hover:bg-[#142D20] text-white font-display text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Guardar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
