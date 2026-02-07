# Generar Assets de la Aplicación

Los assets (íconos, splash screen) han sido temporalmente deshabilitados en `app.json` para que puedas iniciar el desarrollo sin ellos.

## 🎨 Opciones para Generar Assets

### Opción 1: Usar un Generador Online (Rápido)

1. Ve a https://www.appicon.co/ o https://easyappicon.com/
2. Sube una imagen cuadrada (mínimo 1024x1024)
3. Descarga el paquete generado
4. Coloca los archivos en la carpeta `assets/`

### Opción 2: Crear Placeholders Simples

Puedes usar cualquier imagen cuadrada como placeholder:

```bash
# En la carpeta assets/, necesitas:
- icon.png (1024x1024 píxeles)
- splash.png (1284x2778 píxeles para iOS, o cualquier tamaño grande)
- adaptive-icon.png (1024x1024 píxeles, solo Android)
```

### Opción 3: Usar expo-asset-generator

```bash
npm install -g expo-asset-generator

# Coloca una imagen en assets/logo.png
expo-asset-generator -i assets/logo.png
```

### Opción 4: Crear con Figma/Canva (Profesional)

1. **Icon (1024x1024)**
   - Fondo de color sólido
   - Logo centrado (80% del espacio)
   - Exportar como PNG

2. **Splash Screen (1284x2778)**
   - Fondo de color de tu marca
   - Logo centrado
   - Exportar como PNG

3. **Adaptive Icon (1024x1024)**
   - Similar al icon pero considerando safe area
   - Android recorta en forma circular
   - Exportar como PNG

## 🔧 Habilitar Assets en app.json

Una vez que tengas los archivos, descomenta estas líneas en `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 🚀 Por Ahora

La app funcionará perfectamente sin assets personalizados. Expo usará íconos por defecto durante el desarrollo. Solo necesitarás assets personalizados cuando:

- Quieras instalar la app en un dispositivo real (no Expo Go)
- Hagas un build de producción
- Quieras que se vea profesional

## 📝 Notas

- Los assets no afectan la funcionalidad de la app
- Puedes desarrollar completamente sin ellos
- Solo son necesarios para builds de producción
- Expo Go mostrará el logo de Expo por defecto
