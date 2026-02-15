# Sistema de Exportación de Dashboard

## 📊 Funcionalidades Implementadas

El dashboard de SportMatch Admin ahora incluye un sistema completo de exportación con 4 opciones:

### 1. **Exportar a PDF** 📄
- Genera un informe profesional en formato PDF
- Incluye todos los KPIs básicos y avanzados
- Gráficos de reservas por día y horario
- Footer con fecha de generación y numeración de páginas

### 2. **Exportar a Word** 📝
- Documento .docx con formato profesional
- Tablas estructuradas con KPIs
- Compatible con Microsoft Word, Google Docs, LibreOffice

### 3. **Exportar a CSV** 📊
- Archivo compatible con Excel y Google Sheets
- Incluye BOM UTF-8 para correcta visualización en Excel
- Datos estructurados en filas y columnas

### 4. **Análisis con IA** 🤖 (Opcional)
- Genera un informe ejecutivo usando OpenAI GPT-4
- Análisis profesional con insights y recomendaciones
- Incluye: Resumen ejecutivo, fortalezas, oportunidades, estrategias

---

## 🚀 Cómo Usar

### Ubicación
Los botones de exportación están en la parte superior del dashboard, justo debajo del selector de período.

### Pasos:
1. **Selecciona el período** que deseas analizar (Mes, Trimestre, Semestre, Año, etc.)
2. **Haz clic** en el botón de exportación deseado
3. El archivo se descargará automáticamente

---

## ⚙️ Configuración (Solo para IA)

### Variables de Entorno

Para usar la función de **Análisis con IA**, necesitas configurar una API Key de OpenAI:

1. Copia el archivo `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Agrega tu API Key de OpenAI:
   ```env
   NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   ```

### Obtener API Key de OpenAI

1. Ve a [platform.openai.com](https://platform.openai.com/)
2. Regístrate o inicia sesión
3. Ve a **API Keys** en el menú
4. Haz clic en **Create new secret key**
5. Copia la key y pégala en `.env.local`

### Modelo Usado
- **Modelo**: gpt-4o-mini
- **Costo**: ~$0.15 por 1M tokens de entrada, $0.60 por 1M tokens de salida
- **Tokens por análisis**: ~500-1000 tokens (~$0.001 por análisis)

---

## 📦 Dependencias Instaladas

```json
{
  "jspdf": "^2.5.2",
  "jspdf-autotable": "^3.8.3",
  "docx": "^8.5.0",
  "file-saver": "^2.0.5",
  "openai": "^4.77.0"
}
```

---

## 🎨 Diseño de los Botones

Los botones siguen el diseño de referencia:
- **PDF**: Rojo (#EF4444)
- **Word**: Azul (#3B82F6)
- **CSV**: Verde (#10B981)
- **IA**: Morado (#A855F7)

Cada botón tiene:
- Icono representativo
- Texto descriptivo
- Estados hover y disabled
- Animaciones suaves

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE para Producción

La configuración actual usa `dangerouslyAllowBrowser: true` para OpenAI, lo cual es **solo para desarrollo**.

Para producción, debes:

1. **Crear un endpoint API en el backend**:
   ```typescript
   // app/api/analyze/route.ts
   import OpenAI from 'openai';
   import { NextResponse } from 'next/server';

   export async function POST(request: Request) {
     const { analysisData } = await request.json();
     
     const openai = new OpenAI({
       apiKey: process.env.OPENAI_API_KEY // Server-side only
     });

     const completion = await openai.chat.completions.create({
       // ... tu configuración
     });

     return NextResponse.json(completion.choices[0]);
   }
   ```

2. **Llamar desde el frontend**:
   ```typescript
   const response = await fetch('/api/analyze', {
     method: 'POST',
     body: JSON.stringify({ analysisData })
   });
   ```

---

## 📝 Formato de Archivos Generados

### Nombres de Archivo
Todos los archivos generados siguen el formato:
```
informe-kpis-[periodo]-[fecha].ext
```

Ejemplos:
- `informe-kpis-este-mes-2026-02-11.pdf`
- `informe-kpis-este-trimestre-2026-02-11.docx`
- `informe-kpis-este-año-2026-02-11.csv`

### Contenido Incluido

**PDF y Word**:
1. Título del informe
2. Período seleccionado y rango de fechas
3. Tabla de KPIs básicos
4. Tabla de KPIs avanzados
5. Gráficos de reservas
6. Footer con fecha de generación

**CSV**:
- Todas las métricas en formato tabular
- Compatible con Excel (UTF-8 BOM)
- Fácil de importar en hojas de cálculo

---

## 🐛 Resolución de Problemas

### Error: "Cannot find module 'jspdf'"
```bash
npm install jspdf jspdf-autotable docx file-saver openai
```

### Error: "API Key de OpenAI no configurada"
- Verifica que `.env.local` existe
- Verifica que la variable se llame `NEXT_PUBLIC_OPENAI_API_KEY`
- Reinicia el servidor de desarrollo

### El PDF se ve mal en Excel
- Usa el botón **CSV** en lugar de PDF para datos tabulares
- CSV está optimizado para Excel con UTF-8 BOM

### El análisis con IA no funciona
1. Verifica tu API Key
2. Verifica que tengas créditos en tu cuenta de OpenAI
3. Revisa la consola del navegador para errores detallados

---

## 🎯 Próximas Mejoras

- [ ] Agregar gráficos visuales (charts) en PDF
- [ ] Exportación programada por email
- [ ] Comparación entre múltiples períodos
- [ ] Exportación a Google Sheets directo
- [ ] Análisis con IA sin costo (modelo open-source local)

---

## 📞 Soporte

Si encuentras algún problema, revisa:
1. La consola del navegador para errores
2. Los logs del servidor Next.js
3. La documentación de cada librería

---

**¡Disfruta de tu nuevo sistema de exportación! 🎉**
