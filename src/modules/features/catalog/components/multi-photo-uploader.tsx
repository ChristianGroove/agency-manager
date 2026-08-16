"use client"

import React, { useState, useRef, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CatalogGalleryImage } from "@/types/catalog"
import { uploadCatalogImage } from "@/modules/features/catalog/image-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  UploadCloud,
  Star,
  Trash2,
  GripVertical,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"
import { MAX_GALLERY_IMAGES } from "@/modules/features/catalog/schemas/catalog.schema"
export { MAX_GALLERY_IMAGES }

/**
 * Client-side canvas WebP compression utility
 */
async function compressImageToWebP(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    // If not an image or SVG, return original
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp"
            const compressedFile = new File([blob], newName, {
              type: "image/webp",
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          "image/webp",
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

interface SortablePhotoItemProps {
  image: CatalogGalleryImage
  index: number
  onSetCover: (id: string) => void
  onDelete: (id: string) => void
  onUpdateAlt: (id: string, alt: string) => void
  disabled?: boolean
}

function SortablePhotoItem({
  image,
  index,
  onSetCover,
  onDelete,
  onUpdateAlt,
  disabled = false,
}: SortablePhotoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled })

  const [altText, setAltText] = useState(image.alt_text || image.alt || "")
  const [altPopoverOpen, setAltPopoverOpen] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSaveAlt = () => {
    onUpdateAlt(image.id, altText)
    setAltPopoverOpen(false)
    toast.success("Texto alternativo guardado")
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden aspect-square flex flex-col justify-between shadow-xs transition-shadow hover:shadow-md",
        isDragging && "opacity-40 ring-2 ring-brand-pink z-50",
        image.is_cover && "ring-2 ring-amber-400 dark:ring-amber-500"
      )}
    >
      {/* Cover Image Background */}
      <img
        src={image.url}
        alt={image.alt_text || image.alt || `Foto ${index + 1}`}
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
      />

      {/* Gradient Overlay for controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top Badges & Drag Handle */}
      <div className="relative z-10 p-2 flex items-center justify-between w-full">
        {image.is_cover ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-sm">
            <Star className="h-3 w-3 fill-current" />
            Portada
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onSetCover(image.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 hover:bg-amber-500 text-white font-medium text-[10px] backdrop-blur-xs"
            title="Establecer como foto de portada"
          >
            <Star className="h-3 w-3" />
            Portada
          </button>
        )}

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded-lg bg-black/50 text-white hover:bg-black/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Action Bar */}
      <div className="relative z-10 p-2 flex items-center justify-between w-full opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Alt Text Popover */}
        <Popover open={altPopoverOpen} onOpenChange={setAltPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "p-1.5 rounded-lg text-white backdrop-blur-xs text-xs flex items-center gap-1",
                (image.alt_text || image.alt) ? "bg-brand-pink" : "bg-black/60 hover:bg-black/80"
              )}
              title="Editar texto alternativo (SEO)"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 rounded-2xl" side="top">
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Texto Alternativo (SEO)
              </span>
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descripción para lectores de pantalla..."
                className="h-8 text-xs rounded-xl"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAltPopoverOpen(false)}
                  className="h-7 text-xs rounded-lg px-2"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAlt}
                  className="h-7 text-xs rounded-lg px-3 bg-brand-pink text-white"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete Photo */}
        <button
          type="button"
          onClick={() => onDelete(image.id)}
          className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-xs transition-colors"
          title="Eliminar foto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export interface MultiPhotoUploaderProps {
  images: CatalogGalleryImage[]
  onChange: (images: CatalogGalleryImage[]) => void
  onCoverUrlChange?: (coverUrl: string | null) => void
  maxImages?: number
  disabled?: boolean
}

export function MultiPhotoUploader({
  images = [],
  onChange,
  onCoverUrlChange,
  maxImages = MAX_GALLERY_IMAGES,
  disabled = false,
}: MultiPhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const syncState = useCallback(
    (newImages: CatalogGalleryImage[]) => {
      // Ensure there is a cover image if list is non-empty
      if (newImages.length > 0) {
        const hasCover = newImages.some((img) => img.is_cover)
        if (!hasCover) {
          newImages[0] = { ...newImages[0], is_cover: true }
        }
      }

      // Re-index order_index
      const normalized = newImages.map((img, idx) => ({
        ...img,
        order_index: idx,
      }))

      onChange(normalized)

      if (onCoverUrlChange) {
        const cover = normalized.find((img) => img.is_cover) || normalized[0]
        onCoverUrlChange(cover ? cover.url : null)
      }
    },
    [onChange, onCoverUrlChange]
  )

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remainingSlots = maxImages - images.length
    if (remainingSlots <= 0) {
      toast.error(`Ya has alcanzado el límite máximo de ${maxImages} fotos`)
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setIsUploading(true)

    const uploadedNewImages: CatalogGalleryImage[] = []

    try {
      for (const file of filesToUpload) {
        // 1. Client-Side WebP Compression
        const optimizedFile = await compressImageToWebP(file, 1200, 1200, 0.8)

        // 2. Upload to Storage
        const formData = new FormData()
        formData.append("file", optimizedFile)

        const uploadRes = await uploadCatalogImage(formData)
        if (uploadRes && uploadRes.url) {
          const isFirstImage = images.length === 0 && uploadedNewImages.length === 0
          uploadedNewImages.push({
            id: `img-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            url: uploadRes.url,
            is_cover: isFirstImage,
            order_index: images.length + uploadedNewImages.length,
            alt_text: file.name.replace(/\.[^/.]+$/, ""),
            alt: file.name.replace(/\.[^/.]+$/, ""),
          })
        }
      }

      if (uploadedNewImages.length > 0) {
        const merged = [...images, ...uploadedNewImages]
        syncState(merged)
        toast.success(
          `${uploadedNewImages.length} imagen${uploadedNewImages.length > 1 ? "es" : ""} subida${uploadedNewImages.length > 1 ? "s" : ""} y comprimida${uploadedNewImages.length > 1 ? "s" : ""} a WebP`
        )
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      toast.error(err.message || "Error al subir imágenes")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((item) => item.id === active.id)
      const newIndex = images.findIndex((item) => item.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(images, oldIndex, newIndex)
        syncState(reordered)
      }
    }
  }

  const handleSetCover = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      is_cover: img.id === id,
    }))
    syncState(updated)
    toast.success("Foto de portada actualizada")
  }

  const handleDelete = (id: string) => {
    const updated = images.filter((img) => img.id !== id)
    syncState(updated)
    toast.success("Foto eliminada")
  }

  const handleUpdateAlt = (id: string, alt: string) => {
    const updated = images.map((img) =>
      img.id === id ? { ...img, alt_text: alt, alt } : img
    )
    syncState(updated)
  }

  const activeDraggingImage = images.find((img) => img.id === activeDragId)

  return (
    <div className="space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-brand-pink" />
          <span className="text-xs font-bold text-zinc-900 dark:text-white">
            Galería de Imágenes ({images.length}/{maxImages})
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">
          Arrastra para ordenar • Portada automática
        </span>
      </div>

      {/* Grid of Images & Uploader */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((img) => img.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <SortablePhotoItem
                key={img.id}
                image={img}
                index={idx}
                onSetCover={handleSetCover}
                onDelete={handleDelete}
                onUpdateAlt={handleUpdateAlt}
                disabled={disabled || isUploading}
              />
            ))}

            {/* Upload Button Box if slots available */}
            {images.length < maxImages && (
              <label
                className={cn(
                  "relative rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-brand-pink/60 dark:hover:border-brand-pink/60 bg-zinc-50/50 dark:bg-zinc-900/30 aspect-square flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all hover:bg-brand-pink/5 group",
                  isUploading && "pointer-events-none opacity-60",
                  disabled && "pointer-events-none opacity-50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  disabled={disabled || isUploading}
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="sr-only"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-pink" />
                    <span className="text-[10px] font-semibold text-zinc-500">
                      Comprimiendo...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-400 group-hover:text-brand-pink shadow-xs transition-colors">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-brand-pink transition-colors">
                      Subir Fotos
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      WebP Auto (Máx 1200px)
                    </span>
                  </div>
                )}
              </label>
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay with active preview */}
        <DragOverlay>
          {activeDraggingImage ? (
            <div className="rounded-2xl border-2 border-brand-pink bg-zinc-900 overflow-hidden aspect-square shadow-2xl scale-105">
              <img
                src={activeDraggingImage.url}
                alt="Arrastrando"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
