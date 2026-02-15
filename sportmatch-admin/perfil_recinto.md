# Guía para Implementar el Perfil del Recinto

Este documento describe la implementación de la sección "Perfil del Recinto" en CanchApp: vista de lectura, formulario de edición, subida de logo y relación con la base de datos.

---

## 1. RESUMEN DE LA SECCIÓN

El Perfil del Recinto permite al administrador:

1. **Ver** la información del recinto (nombre, ubicación, contacto, deportes)
2. **Editar** esos datos mediante un formulario
3. **Subir/cambiar** el logo del recinto (drag & drop o selección de archivo)

**Dos modos de la interfaz:**
- **Vista profesional**: Tarjetas con datos en solo lectura + botón "Editar Perfil"
- **Vista de edición**: Formulario completo con todos los campos editables

---

## 2. ESTRUCTURA DE ARCHIVOS

```
src/
├── components/
│   ├── Profile/
│   │   └── ProfileManager.tsx    # Componente principal (vista + edición)
│   ├── ProfileSetup.tsx          # Configuración inicial (primer registro)
│   └── ImageUpload.tsx           # Componente de subida de logo
├── hooks/
│   └── useProfile.ts             # CRUD del perfil
└── lib/
    └── imageUpload.ts            # uploadProfileImage, deleteProfileImage
```

---

## 3. RELACIÓN CON LA BASE DE DATOS

### 3.1 Tabla `profiles` (CanchApp)

| Columna | Tipo | Uso en Perfil |
|---------|------|---------------|
| id | uuid | PK (o user_id según esquema) |
| user_id | uuid | FK a auth.users, filtro |
| facility_name | text | Nombre del recinto |
| address | text | Dirección completa |
| contact_phone | text | Teléfono |
| contact_email | text | Correo de contacto |
| region | text | Región (ej: Libertador General Bernardo O'Higgins) |
| city | text | Ciudad (ej: Rancagua) |
| sports_types | text[] | Deportes disponibles (array) |
| logo_url | text | URL del logo (Supabase Storage) |
| is_profile_complete | boolean | Si el perfil está completo |

### 3.2 Adaptación para SportMatch (admin_users)

| profiles (CanchApp) | admin_users (SportMatch) |
|--------------------|--------------------------|
| user_id | user_id |
| facility_name | business_name |
| address | address |
| contact_phone | phone |
| contact_email | * desde auth.users |
| region | region_id → JOIN regions |
| city | city_id → JOIN cities |
| sports_types | * derivar de courts.sport_type o columna nueva |
| logo_url | * columna nueva o avatar_url |

**Email:** En SportMatch el email suele venir de `auth.users` vía `user_id`.

---

## 4. HOOK useProfile

### 4.1 Funciones

| Función | Uso |
|---------|-----|
| fetchProfile | Cargar perfil por user_id |
| createProfile | Crear perfil (ProfileSetup) |
| updateProfile | Actualizar datos del perfil |
| updateProfileImage | Subir logo y actualizar logo_url |
| removeProfileImage | Quitar logo y actualizar a null |

### 4.2 Consultas Supabase

**Obtener perfil:**
```javascript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

**Actualizar perfil:**
```javascript
const { data } = await supabase
  .from('profiles')
  .update(profileData)
  .eq('user_id', userId)
  .select()
  .single();
```

**Actualizar solo logo:**
```javascript
await supabase
  .from('profiles')
  .update({ logo_url: imageUrl })
  .eq('user_id', userId);
```

---

## 5. ESTRUCTURA DEL FORMULARIO (formData)

```typescript
const [formData, setFormData] = useState({
  facility_name: '',
  address: '',
  contact_phone: '',
  contact_email: '',
  region: '',
  city: '',
  sports_types: [] as string[],
  logo_url: null as string | null,
});
```

---

## 6. REGIONES Y CIUDADES (Chile)

Se usa un objeto estático `CHILE_REGIONS`:

```typescript
const CHILE_REGIONS: Record<string, string[]> = {
  'Arica y Parinacota': ['Arica', 'Putre', ...],
  "Libertador General Bernardo O'Higgins": ['Rancagua', 'Codegua', ...],
  // ...
};
```

- ** región** y **city** son dependientes: al cambiar región se resetea city.
- El `select` de ciudad usa `CHILE_REGIONS[formData.region]` para las opciones.

---

## 7. DEPORTES

### 7.1 Opciones predefinidas

```typescript
const SPORTS_OPTIONS = [
  'Fútbol', 'Fútbol 5', 'Fútbol 7', 'Padel', 'Tenis',
  'Básquet', 'Vóleibol', 'Hockey', 'Otros'
];
```

### 7.2 Lógica

- **Checkbox "Otros"**: Muestra campo para deporte personalizado.
- **Deportes personalizados**: Se añaden con input + botón "Agregar" o Enter.
- **Validación**: Al menos 1 deporte.
- **Eliminación**: Solo deportes personalizados se pueden quitar (X).

```typescript
const handleSportsToggle = (sport: string) => {
  if (sport === 'Otros') {
    setShowCustomSportInput(!showCustomSportInput);
    return;
  }
  setFormData(prev => ({
    ...prev,
    sports_types: prev.sports_types.includes(sport)
      ? prev.sports_types.filter(s => s !== sport)
      : [...prev.sports_types, sport]
  }));
};
```

---

## 8. SUBIDA DE LOGO (ImageUpload)

### 8.1 Componente ImageUpload

**Props:**
- `currentImageUrl`: URL actual del logo
- `userId`: para path único en Storage
- `onImageUploaded`: callback con la nueva URL
- `onImageRemoved`: callback al quitar imagen

**Comportamiento:**
- Drag & drop o clic para seleccionar
- Formatos: JPG, PNG, WebP
- Tamaño máximo: 5MB
- Preview circular y botón para eliminar

### 8.2 Integración con Supabase Storage

**Bucket:** `profile-images` (crear en Supabase si no existe)

**Path:** `profiles/{userId}_{timestamp}.{ext}`

**Funciones en imageUpload.ts:**
- `uploadProfileImage(file, userId)` → sube y devuelve URL pública
- `deleteProfileImage(imageUrl)` → borra el archivo en Storage
- `validateImageFile(file)` → comprueba tipo y tamaño

### 8.3 Storage en ProfileManager

En edición, al subir logo:
1. `handleImageUploaded` llama a `updateProfileImage(imageUrl)`
2. `updateProfileImage` elimina la imagen anterior (si hay) y actualiza `logo_url`
3. `formData` se actualiza con la nueva URL

---

## 9. VISTAS DEL ProfileManager

### 9.1 Vista profesional (solo lectura)

- Banner verde con logo, nombre y ubicación
- Tarjetas: Información de Contacto (email, teléfono, dirección)
- Deportes disponibles como tags verdes
- Bloque de Ubicación (ciudad + región)
- Botón "Editar Perfil"

### 9.2 Vista de edición (formulario)

- Logo con ImageUpload
- Nombre del recinto *
- Correo de contacto *
- Dirección completa *
- Región * (select)
- Ciudad * (select dependiente)
- Teléfono de contacto
- Deportes (checkboxes + personalizados)
- Botón "Guardar Cambios"
- Botón "Cancelar"

---

## 10. VALIDACIONES

```typescript
// Campos obligatorios
facility_name.trim()
contact_email.trim()
address.trim()
region
city
sports_types.length >= 1
```

---

## 11. ProfileSetup vs ProfileManager

| Aspecto | ProfileSetup | ProfileManager |
|---------|--------------|----------------|
| Cuándo se usa | Primer acceso, perfil incompleto | Una vez el perfil está completo |
| Acción | createProfile | updateProfile |
| Layout | Página centrada | Dentro del layout con Sidebar |
| Logo | Solo guarda en formData, se envía con createProfile | updateProfileImage al subir |

---

## 12. FLUJO EN App.tsx

```javascript
// Si el perfil no está completo
if (!profile?.is_profile_complete) {
  return <ProfileSetup userId={user.id} onProfileComplete={fetchProfile} />;
}

// Si está completo, mostrar layout con navegación
// En currentPage === 'profile':
return <ProfileManager userId={user.id} profile={profile} />;
```

---

## 13. ADAPTACIÓN PARA SPORTMATCH (admin_users)

### 13.1 Consultas

```javascript
// Obtener admin_user con region y city
const { data } = await supabase
  .from('admin_users')
  .select(`
    *,
    regions(name),
    cities(name)
  `)
  .eq('user_id', auth.uid())
  .single();
```

O usando IDs:
```javascript
.eq('user_id', auth.uid())
// Luego mapear region_id → regions.name, city_id → cities.name
```

### 13.2 Deportes disponibles

Si no tienes `sports_types` en admin_users:

**Opción A:** Derivar de canchas
```javascript
const { data: courts } = await supabase
  .from('courts')
  .select('sport_type')
  .eq('admin_id', auth.uid());
const sports = [...new Set(courts.map(c => c.sport_type))];
```

**Opción B:** Añadir columna `sports_offered text[]` en admin_users

### 13.3 Logo

- Crear bucket `admin-logos` o reutilizar uno existente
- Añadir columna `logo_url` en admin_users si no existe
- Adaptar `uploadProfileImage` para bucket y path adecuados

---

## 14. POLÍTICAS RLS NECESARIAS

```sql
-- profiles (CanchApp)
-- SELECT: usuario ve su propio perfil
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = user_id);

-- UPDATE: usuario actualiza su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- admin_users (SportMatch)
-- SELECT, UPDATE: admin ve/actualiza su propio registro
CREATE POLICY "Admin can manage own profile"
  ON admin_users FOR ALL USING (auth.uid() = user_id);
```

---

## 15. STORAGE (Supabase)

### 15.1 Crear bucket

En Supabase Dashboard → Storage:
- Crear bucket `profile-images` (o `admin-logos`)
- Políticas públicas de lectura si las URLs son públicas

### 15.2 Políticas de Storage

```sql
-- Permitir subir a usuarios autenticados (carpeta profiles/)
CREATE POLICY "Users can upload profile images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' 
  AND (storage.foldername(name))[1] = 'profiles'
);

-- Permitir actualizar/eliminar sus propias imágenes
-- (requiere lógica adicional según path)
```

---

## 16. CHECKLIST DE IMPLEMENTACIÓN

- [ ] Tabla profiles/admin_users con todos los campos
- [ ] Hook useProfile (o useAdminProfile) con create, update, updateImage, removeImage
- [ ] Componente ProfileManager con vista profesional y vista edición
- [ ] Objeto CHILE_REGIONS (o integración con countries/regions/cities)
- [ ] Componente ImageUpload
- [ ] imageUpload.ts: uploadProfileImage, deleteProfileImage, validateImageFile
- [ ] Bucket en Storage y políticas
- [ ] ProfileSetup para primer registro (opcional)
- [ ] Integrar en App con ruta/navegación

---

## 17. CÓDIGO MÍNIMO DEL ProfileManager

```tsx
export function ProfileManager({ userId, profile }) {
  const { updateProfile, updateProfileImage, removeProfileImage } = useProfile(userId);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(/* inicializar desde profile */);

  useEffect(() => {
    if (profile) setFormData({ ...profile });
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await updateProfile(formData);
    if (!error) setIsEditMode(false);
  };

  return isEditMode ? (
    <EditForm formData={formData} setFormData={setFormData} onSubmit={handleSubmit} />
  ) : (
    <ProfileView formData={formData} onEdit={() => setIsEditMode(true)} />
  );
}
```

---

*Guía basada en la implementación de CanchApp. Adaptar tablas (profiles vs admin_users) y campos según el esquema de cada proyecto.*
