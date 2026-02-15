# Guía para Implementar las Exportaciones del Dashboard

Esta guía detalla cómo implementar las cuatro opciones de exportación del Dashboard: **PDF**, **Word**, **CSV** e **IA** (análisis con OpenAI). Incluye el prompt completo utilizado para la exportación con Inteligencia Artificial.

---

## 1. DEPENDENCIAS NPM

```bash
npm install jspdf jspdf-autotable docx file-saver openai
npm install -D @types/file-saver
```

| Paquete | Uso |
|---------|-----|
| jspdf | Generar PDFs |
| jspdf-autotable | Tablas en PDF |
| docx | Generar documentos Word (.docx) |
| file-saver | Descargar archivos (Blob) |
| openai | Cliente API de OpenAI (solo para exportación IA) |

---

## 2. ESTRUCTURA DE DATOS NECESARIA

Las funciones de exportación esperan objetos con esta estructura (adaptar según tu Dashboard):

```typescript
// KPIs básicos
const stats = [
  { name: string, value: string }
];

// KPIs avanzados
const advancedStats = [
  { name: string, value: string, subtitle?: string }
];

// Análisis por deportes (o categoría equivalente)
const sportBookings: Record<string, number> = { 'Fútbol': 50, 'Tenis': 30 };

// Metadata
const dateRange = {
  label: string,      // ej: "Este Mes"
  start: Date,
  end: Date
};

// Datos adicionales para cálculo
const confirmedBookings: Array<{ total_amount: number; courts?: { sport_type: string } }>;
const totalSportBookings: number;
```

---

## 3. EXPORTACIÓN PDF

### 3.1 Código

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const exportToPDF = async () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 50;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Informe de KPIs - Dashboard', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${dateRange.label}`, pageWidth / 2, 30, { align: 'center' });
  doc.text(`${dateRange.start.toLocaleDateString('es-ES')} - ${dateRange.end.toLocaleDateString('es-ES')}`, pageWidth / 2, 37, { align: 'center' });

  // KPIs Básicos
  doc.setFontSize(16);
  doc.text('KPIs Básicos', 20, yPosition);
  yPosition += 10;

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: stats.map(s => [s.name, s.value]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // KPIs Avanzados
  doc.setFontSize(16);
  doc.text('KPIs Avanzados', 20, yPosition);
  yPosition += 10;

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Métrica', 'Valor', 'Detalle']],
    body: advancedStats.map(s => [s.name, s.value, s.subtitle || '']),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 20, doc.internal.pageSize.height - 10);
  }

  const fileName = `informe-kpis-${dateRange.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
```

### 3.2 Import dinámico (lazy loading)

```typescript
const exportToPDF = async () => {
  const jsPDFModule = await import('jspdf');
  await import('jspdf-autotable');
  const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;
  const doc = new jsPDF();
  // ... resto del código
};
```

---

## 4. EXPORTACIÓN WORD

### 4.1 Código

```typescript
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const exportToWord = async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Informe de KPIs - Dashboard",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Período: ${dateRange.label}`, bold: true })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `${dateRange.start.toLocaleDateString('es-ES')} - ${dateRange.end.toLocaleDateString('es-ES')}`,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "KPIs Básicos", heading: HeadingLevel.HEADING_1 }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }),
              ],
            }),
            ...stats.map(stat => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: stat.name })] }),
                new TableCell({ children: [new Paragraph({ text: stat.value })] }),
              ],
            })),
          ],
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "KPIs Avanzados", heading: HeadingLevel.HEADING_1 }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Detalle", bold: true })] })] }),
              ],
            }),
            ...advancedStats.map(stat => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: stat.name })] }),
                new TableCell({ children: [new Paragraph({ text: stat.value })] }),
                new TableCell({ children: [new Paragraph({ text: stat.subtitle || '' })] }),
              ],
            })),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generado el ${new Date().toLocaleDateString('es-ES')}`, italics: true, size: 20 })],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `informe-kpis-${dateRange.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(new Blob([new Uint8Array(buffer)]), fileName);
};
```

---

## 5. EXPORTACIÓN CSV

### 5.1 Código (sin dependencias externas)

```typescript
const exportToCSV = () => {
  const csvData = [];
  
  csvData.push(['Informe de KPIs - Dashboard']);
  csvData.push([`Período: ${dateRange.label}`]);
  csvData.push([`${dateRange.start.toLocaleDateString('es-ES')} - ${dateRange.end.toLocaleDateString('es-ES')}`]);
  csvData.push([]);
  
  csvData.push(['KPIs Básicos']);
  csvData.push(['Métrica', 'Valor']);
  stats.forEach(stat => csvData.push([stat.name, stat.value]));
  csvData.push([]);
  
  csvData.push(['KPIs Avanzados']);
  csvData.push(['Métrica', 'Valor', 'Detalle']);
  advancedStats.forEach(stat => csvData.push([stat.name, stat.value, stat.subtitle || '']));
  csvData.push([]);
  
  if (Object.keys(sportBookings).length > 0) {
    csvData.push(['Análisis por Deportes']);
    csvData.push(['Deporte', 'Reservas', 'Porcentaje', 'Ingresos']);
    Object.entries(sportBookings)
      .sort(([,a], [,b]) => b - a)
      .forEach(([sport, count]) => {
        const pct = totalSportBookings > 0 ? (count / totalSportBookings) * 100 : 0;
        const revenue = confirmedBookings
          .filter(b => b.courts?.sport_type === sport)
          .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        csvData.push([sport, count.toString(), `${pct.toFixed(1)}%`, `$${revenue.toLocaleString()}`]);
      });
    csvData.push([]);
  }
  
  csvData.push([`Generado el ${new Date().toLocaleDateString('es-ES')}`]);
  
  const csvContent = csvData.map(row =>
    row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `informe-kpis-${dateRange.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
```

**Nota:** `\ufeff` es BOM para UTF-8, mejora la apertura en Excel.

---

## 6. EXPORTACIÓN CON IA (OpenAI)

### 6.1 Configuración

**Variable de entorno (.env):**
```
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 6.2 Prompt del sistema (System Message)

```
Eres un consultor experto en gestión de centros deportivos con más de 15 años de experiencia. Tu análisis debe ser preciso, actionable y orientado a resultados.
```

### 6.3 Prompt del usuario (User Message) - COMPLETO

```
Eres un experto analista de negocios especializado en centros deportivos. Analiza los siguientes KPIs y genera un informe ejecutivo profesional en español.

DATOS DEL PERÍODO: {period} ({dateRange})

KPIs BÁSICOS:
- {nombre}: {valor}
- {nombre}: {valor}
...

KPIs AVANZADOS:
- {nombre}: {valor} ({subtitle})
...

ANÁLISIS POR DEPORTES:
- {deporte}: {reservas} reservas ({porcentaje}%) - ${ingresos}
...

COMPARACIÓN CON PERÍODO ANTERIOR:
- Cambio en ingresos: {revenueChange}%
- Cambio en reservas: {bookingsChange}%

Por favor, genera un informe que incluya:

1. RESUMEN EJECUTIVO (2-3 párrafos)
2. ANÁLISIS DE RENDIMIENTO
   - Fortalezas identificadas
   - Áreas de oportunidad
3. INSIGHTS CLAVE
   - Tendencias importantes
   - Patrones de comportamiento
4. RECOMENDACIONES ESTRATÉGICAS
   - Acciones específicas para mejorar ingresos
   - Optimizaciones operativas
   - Estrategias de marketing
5. CONCLUSIONES Y PRÓXIMOS PASOS

Usa un tono profesional pero accesible. Incluye números específicos y porcentajes cuando sea relevante.
```

### 6.4 Código completo (generateAIAnalysis)

```typescript
import OpenAI from 'openai';

const generateAIAnalysis = async () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    alert('API Key de OpenAI no configurada. Agrega VITE_OPENAI_API_KEY a tu archivo .env');
    return;
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true  // En producción usar backend
  });

  const analysisData = {
    period: dateRange.label,
    dateRange: `${dateRange.start.toLocaleDateString('es-ES')} - ${dateRange.end.toLocaleDateString('es-ES')}`,
    basicKPIs: stats.map(s => ({ name: s.name, value: s.value })),
    advancedKPIs: advancedStats.map(s => ({ name: s.name, value: s.value, subtitle: s.subtitle })),
    sportsAnalysis: Object.entries(sportBookings)
      .sort(([,a], [,b]) => b - a)
      .map(([sport, count]) => {
        const pct = totalSportBookings > 0 ? (count / totalSportBookings) * 100 : 0;
        const revenue = confirmedBookings
          .filter(b => b.courts?.sport_type === sport)
          .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        return { sport, reservations: count, percentage: pct.toFixed(1), revenue };
      }),
    revenueChange: revenueChange.toFixed(1),
    bookingsChange: bookingsChange.toFixed(1)
  };

  const prompt = `
Eres un experto analista de negocios especializado en centros deportivos. Analiza los siguientes KPIs y genera un informe ejecutivo profesional en español.

DATOS DEL PERÍODO: ${analysisData.period} (${analysisData.dateRange})

KPIs BÁSICOS:
${analysisData.basicKPIs.map(k => `- ${k.name}: ${k.value}`).join('\n')}

KPIs AVANZADOS:
${analysisData.advancedKPIs.map(k => `- ${k.name}: ${k.value} ${k.subtitle ? `(${k.subtitle})` : ''}`).join('\n')}

ANÁLISIS POR DEPORTES:
${analysisData.sportsAnalysis.map(s => `- ${s.sport}: ${s.reservations} reservas (${s.percentage}%) - $${s.revenue.toLocaleString()}`).join('\n')}

COMPARACIÓN CON PERÍODO ANTERIOR:
- Cambio en ingresos: ${analysisData.revenueChange}%
- Cambio en reservas: ${analysisData.bookingsChange}%

Por favor, genera un informe que incluya:

1. RESUMEN EJECUTIVO (2-3 párrafos)
2. ANÁLISIS DE RENDIMIENTO
   - Fortalezas identificadas
   - Áreas de oportunidad
3. INSIGHTS CLAVE
   - Tendencias importantes
   - Patrones de comportamiento
4. RECOMENDACIONES ESTRATÉGICAS
   - Acciones específicas para mejorar ingresos
   - Optimizaciones operativas
   - Estrategias de marketing
5. CONCLUSIONES Y PRÓXIMOS PASOS

Usa un tono profesional pero accesible. Incluye números específicos y porcentajes cuando sea relevante.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Eres un consultor experto en gestión de centros deportivos con más de 15 años de experiencia. Tu análisis debe ser preciso, actionable y orientado a resultados."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  });

  const aiAnalysis = completion.choices[0]?.message?.content || 'No se pudo generar el análisis.';
  
  // Generar PDF con el análisis
  await exportAIPDF(aiAnalysis, analysisData);
};
```

### 6.5 Parámetros de la API OpenAI

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| model | gpt-4o-mini | Modelo económico y rápido |
| max_tokens | 2000 | Límite de respuesta |
| temperature | 0.7 | Creatividad (0–1) |

### 6.6 Seguridad en producción

**No exponer la API key en el frontend.** Implementar un endpoint backend:

```
Frontend → POST /api/analyze-kpis { analysisData } → Backend → OpenAI API → respuesta
```

El backend debe validar sesión y llamar a OpenAI con la key almacenada en servidor.

---

## 7. UI DE LOS BOTONES

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">Exportar:</span>
  <button onClick={exportToPDF} className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
    <FileText className="w-4 h-4" />
    PDF
  </button>
  <button onClick={exportToWord} className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
    <FileText className="w-4 h-4" />
    Word
  </button>
  <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
    <FileSpreadsheet className="w-4 h-4" />
    CSV
  </button>
  <button onClick={generateAIAnalysis} disabled={isGeneratingAI}
    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-50">
    {isGeneratingAI ? <Spinner /> : <Sparkles className="w-4 h-4" />}
    IA
  </button>
</div>
```

---

## 8. CHECKLIST DE IMPLEMENTACIÓN

- [ ] Instalar dependencias: jspdf, jspdf-autotable, docx, file-saver, openai
- [ ] Crear función exportToPDF
- [ ] Crear función exportToWord (con fallback a TXT si docx falla)
- [ ] Crear función exportToCSV
- [ ] Configurar VITE_OPENAI_API_KEY en .env
- [ ] Crear función generateAIAnalysis
- [ ] Crear función exportAIPDF (genera PDF con el texto de la IA)
- [ ] Añadir botones en la UI
- [ ] Manejar estado de carga (isGeneratingAI) para el botón IA
- [ ] (Producción) Mover llamada a OpenAI a un backend

---

## 9. FUNCIÓN exportAIPDF (para guardar análisis IA en PDF)

```typescript
const exportAIPDF = async (aiAnalysis: string, data: any) => {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  doc.setFontSize(18);
  doc.text('📊 INFORME INTELIGENTE DE KPIs', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Período: ${data.period}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text(data.dateRange, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  const lines = doc.splitTextToSize(aiAnalysis, maxWidth);
  for (let i = 0; i < lines.length; i++) {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(10);
    doc.text(lines[i], margin, yPosition);
    yPosition += 6;
  }

  const fileName = `informe-ia-kpis-${data.period.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
```

---

*Guía basada en la implementación de CanchApp. El prompt de IA puede adaptarse al dominio de tu aplicación (ej: clínicas, gimnasios, etc.).*
