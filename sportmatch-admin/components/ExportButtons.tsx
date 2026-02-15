'use client';

import { useState } from 'react';
import { FileText, FileType, Download, Sparkles } from 'lucide-react';

interface ExportButtonsProps {
  periodLabel: string;
  dateRange: { start: Date; end: Date };
  basicKPIs: Array<{ name: string; value: string }>;
  advancedKPIs: Array<{ name: string; value: string; percentage?: string; change?: string }>;
  bookingsByDay: Array<{ day: string; count: number }>;
  bookingsByHour: Array<{ hour: string; count: number }>;
  totalRevenue: number;
  confirmedCount: number;
}

export default function ExportButtons({
  periodLabel,
  dateRange,
  basicKPIs,
  advancedKPIs,
  bookingsByDay,
  bookingsByHour,
  totalRevenue,
  confirmedCount,
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Exportar a PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const jsPDFModule = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.default;

      const doc = new jsPDF() as any;
      const pageWidth = doc.internal.pageSize.width;
      let yPosition = 20;

      // Título
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text('Informe de KPIs - Dashboard', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Período
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text(`Período: ${periodLabel}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      doc.text(
        `${dateRange.start.toLocaleDateString('es-CL')} - ${dateRange.end.toLocaleDateString('es-CL')}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 15;

      // KPIs Básicos
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('KPIs Básicos', 20, yPosition);
      yPosition += 8;

      autoTable.default(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: basicKPIs.map(kpi => [kpi.name, kpi.value]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // KPIs Avanzados
      doc.setFontSize(14);
      doc.text('KPIs Avanzados', 20, yPosition);
      yPosition += 8;

      autoTable.default(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor', 'Detalle']],
        body: advancedKPIs.map(kpi => [
          kpi.name,
          kpi.value,
          kpi.percentage || kpi.change || ''
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 20, right: 20 },
      });

      // Nueva página para gráficos
      doc.addPage();
      yPosition = 20;

      // Reservas por día
      doc.setFontSize(14);
      doc.text('Reservas por Día de la Semana', 20, yPosition);
      yPosition += 8;

      autoTable.default(doc, {
        startY: yPosition,
        head: [['Día', 'Cantidad']],
        body: bookingsByDay.map(item => [item.day, item.count.toString()]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Reservas por horario (top 10)
      doc.setFontSize(14);
      doc.text('Reservas por Horario (Top 10)', 20, yPosition);
      yPosition += 8;

      const topHours = bookingsByHour
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      autoTable.default(doc, {
        startY: yPosition,
        head: [['Horario', 'Cantidad']],
        body: topHours.map(item => [item.hour, item.count.toString()]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 20, right: 20 },
      });

      // Footer en todas las páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth - 30,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Generado el ${new Date().toLocaleDateString('es-CL')}`,
          20,
          doc.internal.pageSize.height - 10
        );
      }

      const fileName = `informe-kpis-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a Word
  const exportToWord = async () => {
    setIsExporting(true);
    try {
      const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType } = await import('docx');
      const { saveAs } = await import('file-saver');

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
              children: [new TextRun({ text: `Período: ${periodLabel}`, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `${dateRange.start.toLocaleDateString('es-CL')} - ${dateRange.end.toLocaleDateString('es-CL')}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "KPIs Básicos", heading: HeadingLevel.HEADING_1 }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })],
                    }),
                  ],
                }),
                ...basicKPIs.map(kpi => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: kpi.name })] }),
                    new TableCell({ children: [new Paragraph({ text: kpi.value })] }),
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
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Detalle", bold: true })] })],
                    }),
                  ],
                }),
                ...advancedKPIs.map(kpi => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: kpi.name })] }),
                    new TableCell({ children: [new Paragraph({ text: kpi.value })] }),
                    new TableCell({ children: [new Paragraph({ text: kpi.percentage || kpi.change || '' })] }),
                  ],
                })),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun({ text: `Generado el ${new Date().toLocaleDateString('es-CL')}`, italics: true, size: 20 })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      const fileName = `informe-kpis-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${
        new Date().toISOString().split('T')[0]
      }.docx`;
      saveAs(new Blob([buffer]), fileName);
    } catch (error) {
      console.error('Error al exportar Word:', error);
      alert('Error al generar el documento Word. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const csvData = [];

      csvData.push(['Informe de KPIs - Dashboard']);
      csvData.push([`Período: ${periodLabel}`]);
      csvData.push([`${dateRange.start.toLocaleDateString('es-CL')} - ${dateRange.end.toLocaleDateString('es-CL')}`]);
      csvData.push([]);

      csvData.push(['KPIs Básicos']);
      csvData.push(['Métrica', 'Valor']);
      basicKPIs.forEach(kpi => csvData.push([kpi.name, kpi.value]));
      csvData.push([]);

      csvData.push(['KPIs Avanzados']);
      csvData.push(['Métrica', 'Valor', 'Detalle']);
      advancedKPIs.forEach(kpi => csvData.push([kpi.name, kpi.value, kpi.percentage || kpi.change || '']));
      csvData.push([]);

      csvData.push(['Reservas por Día de la Semana']);
      csvData.push(['Día', 'Cantidad']);
      bookingsByDay.forEach(item => csvData.push([item.day, item.count.toString()]));
      csvData.push([]);

      csvData.push([`Generado el ${new Date().toLocaleDateString('es-CL')}`]);

      const csvContent = csvData.map(row =>
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `informe-kpis-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${
        new Date().toISOString().split('T')[0]
      }.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      alert('Error al generar el CSV. Por favor, intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Análisis con IA
  const generateAIAnalysis = async () => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      alert('La función de análisis con IA requiere configurar NEXT_PUBLIC_OPENAI_API_KEY en las variables de entorno.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // Solo para desarrollo
      });

      const prompt = `
Eres un experto analista de negocios especializado en centros deportivos. Analiza los siguientes KPIs y genera un informe ejecutivo profesional en español.

DATOS DEL PERÍODO: ${periodLabel} (${dateRange.start.toLocaleDateString('es-CL')} - ${dateRange.end.toLocaleDateString('es-CL')})

KPIs BÁSICOS:
${basicKPIs.map(k => `- ${k.name}: ${k.value}`).join('\n')}

KPIs AVANZADOS:
${advancedKPIs.map(k => `- ${k.name}: ${k.value} ${k.percentage || k.change || ''}`).join('\n')}

ESTADÍSTICAS ADICIONALES:
- Ingresos totales: $${totalRevenue.toLocaleString('es-CL')}
- Total reservas confirmadas: ${confirmedCount}

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

      // Mostrar análisis en modal o descargar como PDF
      const shouldDownload = confirm('¿Deseas descargar el análisis como PDF?\n\nPresiona OK para descargar o Cancelar para ver en pantalla.');
      
      if (shouldDownload) {
        await downloadAIAnalysisPDF(aiAnalysis);
      } else {
        alert(aiAnalysis);
      }
    } catch (error) {
      console.error('Error al generar análisis con IA:', error);
      alert('Error al generar el análisis. Verifica tu API Key de OpenAI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadAIAnalysisPDF = async (analysis: string) => {
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    doc.setFontSize(16);
    doc.text('Análisis con IA - Dashboard', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(analysis, maxWidth);
    doc.text(lines, margin, 35);

    doc.save(`analisis-ia-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
        <Download className="w-4 h-4" />
        Exportar:
      </span>
      
      <button
        onClick={exportToPDF}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <FileText className="w-4 h-4" />
        <span className="font-medium">PDF</span>
      </button>

      <button
        onClick={exportToWord}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <FileType className="w-4 h-4" />
        <span className="font-medium">Word</span>
      </button>

      <button
        onClick={exportToCSV}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span className="font-medium">CSV</span>
      </button>

      <button
        onClick={generateAIAnalysis}
        disabled={isAnalyzing}
        className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <Sparkles className="w-4 h-4" />
        <span className="font-medium">{isAnalyzing ? 'Analizando...' : 'IA'}</span>
      </button>
    </div>
  );
}
