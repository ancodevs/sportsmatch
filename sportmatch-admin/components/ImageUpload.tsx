'use client';

import { useState, useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ImageUploadProps {
  currentImageUrl: string | null;
  userId: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
}

export default function ImageUpload({
  currentImageUrl,
  userId,
  onImageUploaded,
  onImageRemoved,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Formato no válido. Solo se permiten JPG, PNG y WebP.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'El archivo es demasiado grande. Máximo 5MB.';
    }
    return null;
  };

  const uploadImage = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      
      // Eliminar imagen anterior si existe
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('admin-logos').remove([`profiles/${oldPath}`]);
        }
      }

      // Subir nueva imagen
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('admin-logos')
        .getPublicUrl(filePath);

      onImageUploaded(publicUrl);
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      alert(error.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadImage(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadImage(files[0]);
    }
  };

  const handleRemove = async () => {
    if (!confirm('¿Estás seguro de eliminar el logo?')) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('admin-logos').remove([`profiles/${oldPath}`]);
        }
      }

      onImageRemoved();
    } catch (error: any) {
      console.error('Error al eliminar imagen:', error);
      alert('Error al eliminar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Logo del Recinto
      </label>

      <div className="flex items-start gap-4">
        {/* Preview del logo */}
        <div className="flex-shrink-0">
          <div className="relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-200">
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-10 h-10 text-gray-400" />
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Área de drag & drop */}
        <div className="flex-1">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG o WebP (máx. 5MB)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Consejos */}
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <p>💡 Consejos:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Usa una imagen cuadrada para mejores resultados</li>
              <li>Asegúrate de que la imagen sea clara y profesional</li>
              <li>La imagen se redimensionará automáticamente</li>
            </ul>
          </div>

          {/* Botón para eliminar */}
          {currentImageUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              disabled={isUploading}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Eliminar logo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
