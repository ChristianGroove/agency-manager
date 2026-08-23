"use client"

import React, { useState, useEffect } from "react"
import {
  UniversalCatalogItem,
  CatalogClassification,
  CatalogGalleryImage,
  CatalogVariant,
  CatalogAttributeGroup,
  RealEstateOperationType,
  RealEstatePropertyType,
  RealEstateParkingType,
  StorefrontIndustryPreset,
} from "@/types/catalog"
import { ServiceCategory } from "@/modules/features/catalog/categories-actions"
import {
  createCatalogItemAction,
  updateCatalogItemAction,
} from "@/modules/features/catalog/actions"
import { MultiPhotoUploader } from "./multi-photo-uploader"
import { AICopywriterDialog } from "./ai-copywriter-dialog"
import { QRCodeDialog } from "./qr-code-dialog"
import { VariantMatrixManager } from "./variant-matrix-manager"
import { CategoryManagerDrawer } from "./category-manager-drawer"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Box,
  FileCode2,
  Briefcase,
  Repeat,
  Sparkles,
  QrCode,
  Layers,
  Save,
  Plus,
  Loader2,
  Tag,
  Globe,
  DollarSign,
  Package,
  Clock,
  ShieldCheck,
  Zap,
  Building2,
  Home,
  Car,
  Bike,
  Key,
  MapPin,
  Trees,
  Video,
  FileText,
  Check,
  X,
  Calculator,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface CatalogItemFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemToEdit?: UniversalCatalogItem | null
  categories?: ServiceCategory[]
  attributeGroups?: CatalogAttributeGroup[]
  onSuccess?: () => void
  spaceType?: string
  portalToken?: string | null
  organizationId?: string | null
  industryPreset?: StorefrontIndustryPreset | string
}

const CLASSIFICATIONS: Array<{
  id: CatalogClassification
  label: string
  icon: any
  desc: string
  color: string
}> = [
  {
    id: "service",
    label: "Servicio",
    icon: Briefcase,
    desc: "Consultorías, sesiones, entregables o servicios presenciales",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
  },
  {
    id: "physical",
    label: "Producto Físico",
    icon: Box,
    desc: "Bienes tangibles con inventario, peso y dimensiones",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
  },
  {
    id: "digital",
    label: "Producto Digital",
    icon: FileCode2,
    desc: "Descargables, licencias, cursos o accesos por enlace",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "subscription",
    label: "Suscripción",
    icon: Repeat,
    desc: "Membresías o servicios recurrentes periódicos",
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
  },
  {
    id: "real_estate",
    label: "Inmueble / Propiedad",
    icon: Building2,
    desc: "Apartamentos, casas, oficinas o lotes en venta o arriendo",
    color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800",
  },
]

const DEFAULT_COMMON_AREAS = [
  "Piscina",
  "Gimnasio",
  "Vigilancia 24/7",
  "Salón Social",
  "Zona BBQ",
  "Cancha Múltiple",
  "Cancha de Squash",
  "Cancha Sintética",
  "Parque Infantil",
  "Zona de Mascotas (Pet Friendly)",
  "Turco / Sauna",
  "Ascensor",
  "Coworking",
  "Sendero Peatonal",
  "Portería / Lobby",
  "Parqueadero de Visitantes",
  "Planta Eléctrica",
  "Zona Húmeda",
  "Vista Panorámica",
  "Balcón / Terraza",
  "Depósito / Cuarto Útil",
  "Circuito Cerrado TV",
]

const BADGE_OPTIONS = [
  "Destacado",
  "Novedad",
  "Pocas Unidades",
  "Descuento",
  "Más Vendido",
  "Recomendado",
]

const DEFAULT_EMPTY_ARRAY: any[] = []

export function CatalogItemFormSheet({
  open,
  onOpenChange,
  itemToEdit,
  categories = DEFAULT_EMPTY_ARRAY,
  attributeGroups = DEFAULT_EMPTY_ARRAY,
  onSuccess,
  spaceType = "agency",
  portalToken,
  organizationId,
  industryPreset,
}: CatalogItemFormSheetProps) {
  const [activeTab, setActiveTab] = useState<string>("general")
  const [isSaving, setIsSaving] = useState(false)

  // Dynamically compute default and ordered classifications based on Store Industry Preset or Active Item
  const defaultClassification: CatalogClassification = React.useMemo(() => {
    if (itemToEdit?.classification) return itemToEdit.classification
    if (industryPreset === "real_estate") return "real_estate"
    if (industryPreset === "physical_retail") return "physical"
    if (industryPreset === "digital_software") return "digital"
    if (industryPreset === "professional_services") return "service"
    if (spaceType === "resto") return "physical"
    return "service"
  }, [itemToEdit?.classification, industryPreset, spaceType])

  const orderedClassifications = React.useMemo(() => {
    let primaryId: CatalogClassification = "service"
    if (industryPreset === "real_estate" || itemToEdit?.classification === "real_estate") {
      primaryId = "real_estate"
    } else if (industryPreset === "physical_retail" || itemToEdit?.classification === "physical") {
      primaryId = "physical"
    } else if (industryPreset === "digital_software" || itemToEdit?.classification === "digital") {
      primaryId = "digital"
    } else if (industryPreset === "professional_services" || itemToEdit?.classification === "service") {
      primaryId = "service"
    } else if (itemToEdit?.classification === "subscription") {
      primaryId = "subscription"
    } else if (spaceType === "resto") {
      primaryId = "physical"
    }

    if (primaryId === "real_estate") {
      const order: CatalogClassification[] = ["real_estate", "service", "physical", "digital", "subscription"]
      return order.map((id) => CLASSIFICATIONS.find((c) => c.id === id)!).filter(Boolean)
    }
    if (primaryId === "physical") {
      const order: CatalogClassification[] = ["physical", "digital", "service", "subscription", "real_estate"]
      return order.map((id) => CLASSIFICATIONS.find((c) => c.id === id)!).filter(Boolean)
    }
    if (primaryId === "digital") {
      const order: CatalogClassification[] = ["digital", "subscription", "service", "physical", "real_estate"]
      return order.map((id) => CLASSIFICATIONS.find((c) => c.id === id)!).filter(Boolean)
    }
    if (primaryId === "subscription") {
      const order: CatalogClassification[] = ["subscription", "service", "digital", "physical", "real_estate"]
      return order.map((id) => CLASSIFICATIONS.find((c) => c.id === id)!).filter(Boolean)
    }
    const order: CatalogClassification[] = ["service", "physical", "digital", "subscription", "real_estate"]
    return order.map((id) => CLASSIFICATIONS.find((c) => c.id === id)!).filter(Boolean)
  }, [industryPreset, itemToEdit?.classification, spaceType])

  // Dialog triggers
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false)

  // Form Fields
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(categories[0]?.name || "General")
  const [basePrice, setBasePrice] = useState<number>(0)
  const [compareAtPrice, setCompareAtPrice] = useState<number | null>(null)
  const [classification, setClassification] = useState<CatalogClassification>(defaultClassification)
  const [videoUrl, setVideoUrl] = useState("")

  // Gallery
  const [galleryImages, setGalleryImages] = useState<CatalogGalleryImage[]>([])
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)

  // Physical & Stock Fields
  const [weightKg, setWeightKg] = useState<number>(0)
  const [lengthCm, setLengthCm] = useState<number>(0)
  const [widthCm, setWidthCm] = useState<number>(0)
  const [heightCm, setHeightCm] = useState<number>(0)
  const [shippingRequired, setShippingRequired] = useState(true)
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [trackInventory, setTrackInventory] = useState(false)
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(0)
  const [allowBackorders, setAllowBackorders] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5)
  const [bulkVariantStock, setBulkVariantStock] = useState("")
  const [bulkVariantTrack, setBulkVariantTrack] = useState(true)
  const [bulkVariantBackorders, setBulkVariantBackorders] = useState(false)

  // Digital Fields
  const [deliveryType, setDeliveryType] = useState<"download" | "license_key" | "access_link">("download")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [fileSizeMb, setFileSizeMb] = useState<number>(0)
  const [licenseType, setLicenseType] = useState<"single" | "team" | "enterprise" | "unlimited">("single")
  const [accessExpiryDays, setAccessExpiryDays] = useState<number>(0)

  // Service Fields
  const [pricingModel, setPricingModel] = useState<"fixed" | "hourly" | "daily" | "sq_meter" | "deliverable" | "custom">("fixed")
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [deliverablesInput, setDeliverablesInput] = useState("")
  const [slaHours, setSlaHours] = useState<number>(24)
  const [locationType, setLocationType] = useState<"remote" | "on_site" | "hybrid">("remote")

  // Subscription Fields
  const [billingFrequency, setBillingFrequency] = useState<"monthly" | "biweekly" | "quarterly" | "semiannual" | "yearly">("monthly")
  const [trialDays, setTrialDays] = useState<number>(0)
  const [setupFee, setSetupFee] = useState<number>(0)
  const [commitmentMonths, setCommitmentMonths] = useState<number>(0)
  const [autoRenew, setAutoRenew] = useState(true)

  // Real Estate Fields
  const [realEstateOperation, setRealEstateOperation] = useState<RealEstateOperationType>("sale")
  const [realEstatePropertyType, setRealEstatePropertyType] = useState<RealEstatePropertyType>("apartment")
  const [areaTotalM2, setAreaTotalM2] = useState<number>(0)
  const [areaBuiltM2, setAreaBuiltM2] = useState<number>(0)
  const [bedrooms, setBedrooms] = useState<number>(0)
  const [bathrooms, setBathrooms] = useState<number>(0)
  const [floorNumber, setFloorNumber] = useState<number>(0)
  const [stratum, setStratum] = useState<string>("4")
  const [adminFee, setAdminFee] = useState<number>(0)
  const [antiquity, setAntiquity] = useState<string>("1 a 5 años")
  const [kitchenType, setKitchenType] = useState<string>("integral")
  const [parkingCars, setParkingCars] = useState<number>(0)
  const [parkingMotorcycles, setParkingMotorcycles] = useState<number>(0)
  const [parkingType, setParkingType] = useState<RealEstateParkingType>("covered")
  const [city, setCity] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [address, setAddress] = useState("")
  const [hideExactAddress, setHideExactAddress] = useState(false)
  const [commonAreas, setCommonAreas] = useState<string[]>([])
  const [customCommonAreaInput, setCustomCommonAreaInput] = useState("")
  const [virtualTourUrl, setVirtualTourUrl] = useState("")
  const [brochurePdfUrl, setBrochurePdfUrl] = useState("")
  const [showMortgageCalculator, setShowMortgageCalculator] = useState(false)

  // Variants
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<CatalogVariant[]>([])

  // Store & Badges & SEO
  const [selectedBadges, setSelectedBadges] = useState<string[]>([])
  const [isVisibleInPortal, setIsVisibleInPortal] = useState(true)
  const [ctaType, setCtaType] = useState<"whatsapp" | "buy" | "info" | "quote" | "appointment" | "add_to_cart" | "cart" | "booking">("whatsapp")
  const [priceLabelType, setPriceLabelType] = useState<"price" | "base_price" | "from">("price")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [searchTagsInput, setSearchTagsInput] = useState("")

  const handleUpdateVariantInventory = (index: number, patch: Partial<CatalogVariant>) => {
    setVariants((prev) => {
      const next = [...prev]
      const curr = next[index]
      next[index] = {
        ...curr,
        ...patch,
        stock_quantity:
          patch.inventory_quantity !== undefined
            ? patch.inventory_quantity
            : patch.stock_quantity !== undefined
            ? patch.stock_quantity
            : curr.stock_quantity,
        inventory_quantity:
          patch.stock_quantity !== undefined
            ? patch.stock_quantity
            : patch.inventory_quantity !== undefined
            ? patch.inventory_quantity
            : curr.inventory_quantity,
        track_inventory:
          patch.track_stock !== undefined
            ? patch.track_stock
            : patch.track_inventory !== undefined
            ? patch.track_inventory
            : curr.track_inventory,
        track_stock:
          patch.track_inventory !== undefined
            ? patch.track_inventory
            : patch.track_stock !== undefined
            ? patch.track_stock
            : curr.track_stock,
      }
      return next
    })
  }

  const handleApplyBulkVariantStock = () => {
    const qty = parseInt(bulkVariantStock, 10)
    if (isNaN(qty)) {
      toast.error("Ingrese una cantidad entera válida para las variantes")
      return
    }
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        inventory_quantity: Math.max(0, qty),
        stock_quantity: Math.max(0, qty),
        track_inventory: bulkVariantTrack,
        track_stock: bulkVariantTrack,
        allow_backorders: bulkVariantBackorders,
      }))
    )
    toast.success(`Stock actualizado en ${variants.length} variantes`)
  }

  const handleToggleCommonArea = (area: string) => {
    setCommonAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const handleAddCustomCommonArea = () => {
    const trimmed = customCommonAreaInput.trim()
    if (!trimmed) return
    if (!commonAreas.includes(trimmed)) {
      setCommonAreas((prev) => [...prev, trimmed])
    }
    setCustomCommonAreaInput("")
  }

  // Load itemToEdit into state only when sheet opens or itemToEdit changes
  useEffect(() => {
    if (!open) return

    if (itemToEdit) {
      setName(itemToEdit.name || "")
      setDescription(itemToEdit.description || "")
      setCategory(itemToEdit.category || (categories[0]?.name || "General"))
      setBasePrice(itemToEdit.base_price || 0)
      setCompareAtPrice(itemToEdit.compare_at_price ?? null)
      setClassification(itemToEdit.classification || (itemToEdit.type === "recurring" ? "subscription" : itemToEdit.type === "product" ? "physical" : itemToEdit.type === "real_estate" ? "real_estate" : "service"))
      setVideoUrl(itemToEdit.video_url || "")

      const images = itemToEdit.gallery_images || itemToEdit.images || []
      setGalleryImages(images)
      setCoverImageUrl(itemToEdit.image_url || (images[0]?.url ?? null))

      // Physical & Inventory
      const phys = itemToEdit.physical_details || itemToEdit.classification_metadata?.physical
      setWeightKg(phys?.weight_kg || 0)
      setLengthCm(phys?.dimensions?.length || 0)
      setWidthCm(phys?.dimensions?.width || 0)
      setHeightCm(phys?.dimensions?.height || 0)
      setShippingRequired(phys?.shipping_required ?? true)
      setSku(itemToEdit.sku || "")
      setBarcode(itemToEdit.barcode || "")
      setTrackInventory(itemToEdit.track_inventory || itemToEdit.track_stock || false)
      setInventoryQuantity(itemToEdit.inventory_quantity ?? itemToEdit.stock_quantity ?? 0)
      setAllowBackorders(itemToEdit.allow_backorders || false)
      setLowStockThreshold(itemToEdit.low_stock_threshold ?? 5)

      // Digital
      const dig = itemToEdit.digital_details || itemToEdit.classification_metadata?.digital
      setDeliveryType(dig?.delivery_type || dig?.delivery_mode || "download")
      setDownloadUrl(dig?.download_url || "")
      setFileSizeMb(dig?.file_size_mb || 0)
      setLicenseType(dig?.license_type || "single")
      setAccessExpiryDays(dig?.access_expiry_days || 0)

      // Service
      const srv = itemToEdit.service_details || itemToEdit.classification_metadata?.service
      setPricingModel(srv?.pricing_model || "fixed")
      setDurationMinutes(srv?.duration_minutes || 60)
      setDeliverablesInput(srv?.deliverables ? srv.deliverables.join(", ") : "")
      setSlaHours(srv?.sla_hours || 24)
      setLocationType(srv?.location_type || "remote")

      // Subscription
      const sub = itemToEdit.subscription_details || itemToEdit.classification_metadata?.subscription
      setBillingFrequency(sub?.billing_frequency || (itemToEdit.frequency as any) || "monthly")
      setTrialDays(sub?.trial_days || 0)
      setSetupFee(sub?.setup_fee || 0)
      setCommitmentMonths(sub?.minimum_commitment_months || 0)
      setAutoRenew(sub?.auto_renew ?? true)

      // Real Estate
      const re = itemToEdit.real_estate_details || itemToEdit.classification_metadata?.real_estate
      setRealEstateOperation(re?.operation_type || "sale")
      setRealEstatePropertyType(re?.property_type || "apartment")
      setAreaTotalM2(re?.area_total_m2 || 0)
      setAreaBuiltM2(re?.area_built_m2 || 0)
      setBedrooms(re?.bedrooms || 0)
      setBathrooms(re?.bathrooms || 0)
      setFloorNumber(re?.floor_number || 0)
      setStratum(re?.stratum ? String(re.stratum) : "4")
      setAdminFee(re?.admin_fee || 0)
      setAntiquity(re?.antiquity || "1 a 5 años")
      setKitchenType(re?.kitchen_type || "integral")
      setParkingCars(re?.parking_cars || 0)
      setParkingMotorcycles(re?.parking_motorcycles || 0)
      setParkingType(re?.parking_type || "covered")
      setCity(re?.city || "")
      setNeighborhood(re?.neighborhood || "")
      setAddress(re?.address || "")
      setHideExactAddress(re?.hide_exact_address ?? false)
      setCommonAreas(Array.isArray(re?.common_areas) ? re.common_areas : [])
      setVirtualTourUrl(re?.virtual_tour_url || "")
      setBrochurePdfUrl(re?.brochure_pdf_url || "")
      setShowMortgageCalculator(Boolean(re?.show_mortgage_calculator))

      // Variants
      setHasVariants(itemToEdit.has_variants || (itemToEdit.variants && itemToEdit.variants.length > 0) || false)
      setVariants(itemToEdit.variants || [])

      // Badges & Store
      const rawBadges = itemToEdit.badges || []
      setSelectedBadges(
        rawBadges.map((b) => (typeof b === "string" ? b : (b as any).label || (b as any).type))
      )
      setIsVisibleInPortal(itemToEdit.is_visible_in_portal ?? true)
      setCtaType((itemToEdit.cta_type as any) || "whatsapp")
      setPriceLabelType(itemToEdit.price_label_type || "price")
      setSeoTitle(itemToEdit.seo_title || itemToEdit.seo_metadata?.meta_title || "")
      setSeoDescription(itemToEdit.seo_description || itemToEdit.seo_metadata?.meta_description || "")
      setSearchTagsInput(itemToEdit.seo_metadata?.search_tags ? itemToEdit.seo_metadata.search_tags.join(", ") : "")
    } else {
      // Reset defaults for Create
      setName("")
      setDescription("")
      setCategory(categories[0]?.name || "General")
      setBasePrice(0)
      setCompareAtPrice(null)
      setClassification(defaultClassification)
      setVideoUrl("")
      setGalleryImages([])
      setCoverImageUrl(null)
      setWeightKg(0)
      setLengthCm(0)
      setWidthCm(0)
      setHeightCm(0)
      setShippingRequired(true)
      setSku("")
      setBarcode("")
      setTrackInventory(false)
      setInventoryQuantity(0)
      setAllowBackorders(false)
      setLowStockThreshold(5)
      setBulkVariantStock("")
      setBulkVariantTrack(true)
      setBulkVariantBackorders(false)
      setDeliveryType("download")
      setDownloadUrl("")
      setFileSizeMb(0)
      setLicenseType("single")
      setAccessExpiryDays(0)
      setPricingModel("fixed")
      setDurationMinutes(60)
      setDeliverablesInput("")
      setSlaHours(24)
      setLocationType("remote")
      setBillingFrequency("monthly")
      setTrialDays(0)
      setSetupFee(0)
      setCommitmentMonths(0)
      setAutoRenew(true)
      // Real Estate Reset
      setRealEstateOperation("sale")
      setRealEstatePropertyType("apartment")
      setAreaTotalM2(0)
      setAreaBuiltM2(0)
      setBedrooms(0)
      setBathrooms(0)
      setFloorNumber(0)
      setStratum("4")
      setAdminFee(0)
      setAntiquity("1 a 5 años")
      setKitchenType("integral")
      setParkingCars(0)
      setParkingMotorcycles(0)
      setParkingType("covered")
      setCity("")
      setNeighborhood("")
      setAddress("")
      setHideExactAddress(false)
      setCommonAreas([])
      setCustomCommonAreaInput("")
      setVirtualTourUrl("")
      setBrochurePdfUrl("")
      setShowMortgageCalculator(false)
      setHasVariants(false)
      setVariants([])
      setSelectedBadges([])
      setIsVisibleInPortal(true)
      setCtaType("whatsapp")
      setPriceLabelType("price")
      setSeoTitle("")
      setSeoDescription("")
      setSearchTagsInput("")
      setActiveTab("general")
    }
  }, [open, itemToEdit?.id, itemToEdit?.updated_at])

  const handleApplyAiCopy = (copy: {
    name: string
    description: string
    features: string[]
    seo_title: string
    seo_description: string
    search_tags: string[]
  }) => {
    setName(copy.name)
    setDescription(copy.description)
    if (copy.features.length > 0) {
      setDeliverablesInput(copy.features.join(", "))
    }
    setSeoTitle(copy.seo_title)
    setSeoDescription(copy.seo_description)
    setSearchTagsInput(copy.search_tags.join(", "))
  }

  const handleToggleBadge = (badge: string) => {
    setSelectedBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    )
  }

  const handleSaveItem = async () => {
    if (!name.trim()) {
      toast.error("El nombre del producto/servicio es obligatorio")
      setActiveTab("general")
      return
    }

    if (basePrice < 0) {
      toast.error("El precio no puede ser negativo")
      return
    }

    setIsSaving(true)
    try {
      // Map classification to legacy 'type'
      const legacyType =
        classification === "physical"
          ? "product"
          : classification === "digital"
          ? "digital"
          : classification === "subscription"
          ? "recurring"
          : classification === "real_estate"
          ? "real_estate"
          : "one_off"

      const parsedDeliverables = deliverablesInput
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean)

      const parsedSearchTags = searchTagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      // Ensure cover photo is mirrored to image_url
      const coverPhoto = galleryImages.find((img) => img.is_cover) || galleryImages[0]
      const finalImageUrl = coverPhoto ? coverPhoto.url : coverImageUrl

      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        base_price: Number(basePrice) || 0,
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        classification,
        type: legacyType,
        frequency: classification === "subscription" ? billingFrequency : null,
        image_url: finalImageUrl,
        gallery_images: galleryImages,
        video_url: videoUrl.trim() || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        inventory_quantity: trackInventory ? Number(inventoryQuantity) : 0,
        stock_quantity: trackInventory ? Number(inventoryQuantity) : 0,
        track_inventory: trackInventory,
        allow_backorders: allowBackorders,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        has_variants: hasVariants,
        variants: hasVariants ? variants : [],
        badges: selectedBadges,
        is_visible_in_portal: isVisibleInPortal,
        cta_type: ctaType,
        price_label_type: priceLabelType,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        seo_metadata: {
          meta_title: seoTitle.trim() || name.trim(),
          meta_description: seoDescription.trim() || description.trim(),
          search_tags: parsedSearchTags,
          og_image_url: finalImageUrl,
        },
        physical_details:
          classification === "physical"
            ? {
                weight_kg: Number(weightKg) || 0,
                dimensions: {
                  length: Number(lengthCm) || 0,
                  width: Number(widthCm) || 0,
                  height: Number(heightCm) || 0,
                  unit: "cm",
                },
                shipping_required: shippingRequired,
              }
            : undefined,
        digital_details:
          classification === "digital"
            ? {
                delivery_type: deliveryType,
                delivery_mode: deliveryType,
                download_url: downloadUrl.trim() || undefined,
                file_size_mb: Number(fileSizeMb) || 0,
                license_type: licenseType,
                access_expiry_days: Number(accessExpiryDays) || 0,
              }
            : undefined,
        service_details:
          classification === "service"
            ? {
                pricing_model: pricingModel,
                duration_minutes: Number(durationMinutes) || 60,
                deliverables: parsedDeliverables,
                sla_hours: Number(slaHours) || 24,
                location_type: locationType,
              }
            : undefined,
        subscription_details:
          classification === "subscription"
            ? {
                billing_frequency: billingFrequency,
                trial_days: Number(trialDays) || 0,
                setup_fee: Number(setupFee) || 0,
                minimum_commitment_months: Number(commitmentMonths) || 0,
                auto_renew: autoRenew,
              }
            : undefined,
        real_estate_details:
          classification === "real_estate"
            ? {
                operation: realEstateOperation,
                operation_type: realEstateOperation,
                property_type: realEstatePropertyType,
                area_total_m2: Number(areaTotalM2) || 0,
                area_built_m2: Number(areaBuiltM2) || 0,
                bedrooms: Number(bedrooms) || 0,
                bathrooms: Number(bathrooms) || 0,
                floor_number: Number(floorNumber) || 0,
                stratum: stratum || "4",
                admin_fee: Number(adminFee) || 0,
                antiquity: antiquity || "1 a 5 años",
                kitchen_type: kitchenType || "integral",
                parking_cars: Number(parkingCars) || 0,
                parking_motorcycles: Number(parkingMotorcycles) || 0,
                parking_type: parkingType,
                city: city.trim() || undefined,
                neighborhood: neighborhood.trim() || undefined,
                address: address.trim() || undefined,
                hide_exact_address: hideExactAddress,
                common_areas: commonAreas,
                virtual_tour_url: virtualTourUrl.trim() || undefined,
                brochure_pdf_url: brochurePdfUrl.trim() || undefined,
                show_mortgage_calculator: showMortgageCalculator,
              }
            : undefined,
        classification_metadata: {
          physical: classification === "physical" ? {
            weight_kg: Number(weightKg) || 0,
            dimensions: {
              length: Number(lengthCm) || 0,
              width: Number(widthCm) || 0,
              height: Number(heightCm) || 0,
              unit: "cm",
            },
            shipping_required: shippingRequired,
          } : undefined,
          digital: classification === "digital" ? {
            delivery_type: deliveryType,
            delivery_mode: deliveryType,
            download_url: downloadUrl.trim() || undefined,
            file_size_mb: Number(fileSizeMb) || 0,
            license_type: licenseType,
            access_expiry_days: Number(accessExpiryDays) || 0,
          } : undefined,
          service: classification === "service" ? {
            pricing_model: pricingModel,
            duration_minutes: Number(durationMinutes) || 60,
            deliverables: parsedDeliverables,
            sla_hours: Number(slaHours) || 24,
            location_type: locationType,
          } : undefined,
          subscription: classification === "subscription" ? {
            billing_frequency: billingFrequency,
            trial_days: Number(trialDays) || 0,
            setup_fee: Number(setupFee) || 0,
            minimum_commitment_months: Number(commitmentMonths) || 0,
            auto_renew: autoRenew,
          } : undefined,
          real_estate: classification === "real_estate" ? {
            operation: realEstateOperation,
            operation_type: realEstateOperation,
            property_type: realEstatePropertyType,
            area_total_m2: Number(areaTotalM2) || 0,
            area_built_m2: Number(areaBuiltM2) || 0,
            bedrooms: Number(bedrooms) || 0,
            bathrooms: Number(bathrooms) || 0,
            floor_number: Number(floorNumber) || 0,
            stratum: stratum || "4",
            admin_fee: Number(adminFee) || 0,
            antiquity: antiquity || "1 a 5 años",
            parking_cars: Number(parkingCars) || 0,
            parking_motorcycles: Number(parkingMotorcycles) || 0,
            parking_type: parkingType,
            city: city.trim() || undefined,
            neighborhood: neighborhood.trim() || undefined,
            address: address.trim() || undefined,
            hide_exact_address: hideExactAddress,
            common_areas: commonAreas,
            virtual_tour_url: virtualTourUrl.trim() || undefined,
            brochure_pdf_url: brochurePdfUrl.trim() || undefined,
            show_mortgage_calculator: showMortgageCalculator,
          } : undefined,
        },
      }

      if (itemToEdit && itemToEdit.id) {
        const res = await updateCatalogItemAction(itemToEdit.id, payload)
        if (res.success) {
          toast.success("Producto / servicio actualizado exitosamente")
          onOpenChange(false)
          if (onSuccess) onSuccess()
        } else {
          toast.error(res.error || "Error al actualizar")
        }
      } else {
        const res = await createCatalogItemAction(payload)
        if (res.success) {
          toast.success("Producto / servicio creado exitosamente")
          onOpenChange(false)
          if (onSuccess) onSuccess()
        } else {
          toast.error(res.error || "Error al crear")
        }
      }
    } catch (err: any) {
      console.error("Save error:", err)
      toast.error(err.message || "Error al guardar el item")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-2xl lg:max-w-3xl w-full p-0 gap-0 border-none shadow-2xl rounded-l-3xl overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col"
        >
          {/* Top Header */}
          <SheetHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                  {itemToEdit ? `Editar: ${itemToEdit.name}` : "Nuevo Producto / Servicio"}
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-500">
                  Configura detalles comerciales, clasificación, variantes y SEO
                </SheetDescription>
              </div>

              {/* Quick AI & QR Actions */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAiOpen(true)}
                  className="rounded-xl border-brand-pink/30 hover:bg-brand-pink/10 text-brand-pink text-xs font-semibold gap-1.5 h-8"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Redactor IA
                </Button>
                {itemToEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQrOpen(true)}
                    className="rounded-xl text-xs font-semibold gap-1.5 h-8"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Código QR
                  </Button>
                )}
              </div>
            </div>

            {/* Classification Selector Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
              {orderedClassifications.map((c) => {
                const IconComp = c.icon
                const isSelected = classification === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClassification(c.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-2xl border text-left transition-all cursor-pointer",
                      isSelected
                        ? cn(c.color, "font-bold shadow-xs ring-1 ring-brand-pink/40")
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 shrink-0">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{c.label}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </SheetHeader>

          {/* Form Tabs Body */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-3 border-b border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-950">
              <TabsList className="grid grid-cols-5 h-10 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
                <TabsTrigger value="general" className="rounded-xl text-xs font-semibold">
                  General & Media
                </TabsTrigger>
                <TabsTrigger value="details" className="rounded-xl text-xs font-semibold">
                  Detalles & Specs
                </TabsTrigger>
                <TabsTrigger value="inventory" className="rounded-xl text-xs font-semibold">
                  Inventario & Stock
                </TabsTrigger>
                <TabsTrigger value="variants" className="rounded-xl text-xs font-semibold">
                  Variantes {hasVariants && `(${variants.length})`}
                </TabsTrigger>
                <TabsTrigger value="store" className="rounded-xl text-xs font-semibold">
                  Tienda & SEO
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: GENERAL & MULTIMEDIA */}
              <TabsContent value="general" className="space-y-5 m-0">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">
                    Nombre del Producto / Servicio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="ej. Paquete de Branding Premium, Zapatillas Runner Pro..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Categoría</Label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDrawerOpen(true)}
                        className="text-[10px] text-brand-pink font-semibold hover:underline"
                      >
                        + Nueva
                      </button>
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      {classification === "real_estate"
                        ? realEstateOperation === "rent"
                          ? "Canon Mensual (COP)"
                          : realEstateOperation === "temporary_rent"
                          ? "Tarifa Temporal (COP)"
                          : "Precio de Venta (COP)"
                        : "Precio Base (COP)"}
                    </Label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={basePrice || ""}
                      onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-500">Precio de Comparación (Antes)</Label>
                    <Input
                      type="number"
                      placeholder="75000"
                      value={compareAtPrice ?? ""}
                      onChange={(e) => setCompareAtPrice(e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Quick Real Estate Operation Selector in Tab 1 */}
                {classification === "real_estate" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                    <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      Tipo de Operación Inmobiliaria (Destacado en primera vista)
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRealEstateOperation("sale")}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          realEstateOperation === "sale"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        🏷️ En Venta
                      </button>
                      <button
                        type="button"
                        onClick={() => setRealEstateOperation("rent")}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          realEstateOperation === "rent"
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        🔑 En Arriendo
                      </button>
                      <button
                        type="button"
                        onClick={() => setRealEstateOperation("temporary_rent")}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          realEstateOperation === "temporary_rent"
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        🏖️ Arriendo Temporal
                      </button>
                    </div>
                  </div>
                )}

                {/* Multi-Photo Uploader */}
                <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10">
                  <MultiPhotoUploader
                    images={galleryImages}
                    onChange={setGalleryImages}
                    onCoverUrlChange={setCoverImageUrl}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">URL de Video (YouTube / Vimeo / MP4)</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Descripción Completa</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAiOpen(true)}
                      className="h-6 text-[11px] text-brand-pink hover:bg-brand-pink/10 px-2 rounded-lg gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Mejorar con IA
                    </Button>
                  </div>
                  <Textarea
                    rows={4}
                    placeholder="Describe los beneficios, características, materiales o proceso de entrega..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xs rounded-2xl"
                  />
                </div>
              </TabsContent>

              {/* TAB 2: CLASSIFICATION ADAPTIVE DETAILS */}
              <TabsContent value="details" className="space-y-5 m-0">
                {/* Physical Adaptive Fields */}
                {classification === "physical" && (
                  <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                      <Box className="h-4 w-4" />
                      Especificaciones de Producto Físico & Logística
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.5"
                          value={weightKg || ""}
                          onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Largo (cm)</Label>
                        <Input
                          type="number"
                          placeholder="20"
                          value={lengthCm || ""}
                          onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Ancho (cm)</Label>
                        <Input
                          type="number"
                          placeholder="15"
                          value={widthCm || ""}
                          onChange={(e) => setWidthCm(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Alto (cm)</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={heightCm || ""}
                          onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/10">
                      <span className="text-xs font-semibold">Requiere Envío / Despacho Físico</span>
                      <Switch checked={shippingRequired} onCheckedChange={setShippingRequired} />
                    </div>
                  </div>
                )}

                {/* Digital Adaptive Fields */}
                {classification === "digital" && (
                  <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <FileCode2 className="h-4 w-4" />
                      Entrega Digital & Licenciamiento
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Modo de Entrega</Label>
                        <Select value={deliveryType} onValueChange={(val: any) => setDeliveryType(val)}>
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="download">Descarga Directa (Archivo)</SelectItem>
                            <SelectItem value="license_key">Llave de Licencia (Serial)</SelectItem>
                            <SelectItem value="access_link">Enlace de Acceso Privado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Tipo de Licencia</Label>
                        <Select value={licenseType} onValueChange={(val: any) => setLicenseType(val)}>
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Uso Personal (1 Usuario)</SelectItem>
                            <SelectItem value="team">Equipo (Hasta 5 Usuarios)</SelectItem>
                            <SelectItem value="enterprise">Empresarial (Ilimitado)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">URL de Descarga o Acceso</Label>
                      <Input
                        placeholder="https://drive.google.com/... o https://app.pixy.agency/..."
                        value={downloadUrl}
                        onChange={(e) => setDownloadUrl(e.target.value)}
                        className="h-8 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Service Adaptive Fields */}
                {classification === "service" && (
                  <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                      <Briefcase className="h-4 w-4" />
                      Modelo de Servicio & Entregables
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Modelo de Cobro</Label>
                        <Select value={pricingModel} onValueChange={(val: any) => setPricingModel(val)}>
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Precio Fijo (Proyecto)</SelectItem>
                            <SelectItem value="hourly">Por Hora</SelectItem>
                            <SelectItem value="daily">Por Día</SelectItem>
                            <SelectItem value="deliverable">Por Entregable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Duración Estimada (Min)</Label>
                        <Input
                          type="number"
                          placeholder="60"
                          value={durationMinutes || ""}
                          onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Modalidad</Label>
                        <Select value={locationType} onValueChange={(val: any) => setLocationType(val)}>
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remote">100% Remoto</SelectItem>
                            <SelectItem value="on_site">Presencial</SelectItem>
                            <SelectItem value="hybrid">Híbrido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Entregables (Separados por coma)</Label>
                      <Input
                        placeholder="Diseño en Figma, Manual de Marca PDF, Archivos SVG"
                        value={deliverablesInput}
                        onChange={(e) => setDeliverablesInput(e.target.value)}
                        className="h-8 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Subscription Adaptive Fields */}
                {classification === "subscription" && (
                  <div className="p-5 rounded-3xl bg-purple-500/5 border border-purple-500/20 space-y-4">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                      <Repeat className="h-4 w-4" />
                      Frecuencia de Facturación & Compromiso
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Frecuencia de Cobro</Label>
                        <Select value={billingFrequency} onValueChange={(val: any) => setBillingFrequency(val)}>
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensual</SelectItem>
                            <SelectItem value="biweekly">Quincenal</SelectItem>
                            <SelectItem value="quarterly">Trimestral</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Días de Prueba Gratis</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={trialDays || ""}
                          onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Compromiso Mínimo (Meses)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={commitmentMonths || ""}
                          onChange={(e) => setCommitmentMonths(parseInt(e.target.value, 10) || 0)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-purple-500/10">
                      <span className="text-xs font-semibold">Renovación Automática</span>
                      <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                    </div>
                  </div>
                )}

                {/* Real Estate Adaptive Fields */}
                {classification === "real_estate" && (
                  <div className="space-y-4">
                    {/* A. Tipo de Negocio y Tipo de Inmueble */}
                    <div className="p-5 rounded-3xl bg-teal-500/5 border border-teal-500/20 space-y-4">
                      <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                        <Building2 className="h-4 w-4" />
                        Ficha Inmobiliaria & Modalidad de Operación
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Tipo de Operación</Label>
                          <Select value={realEstateOperation} onValueChange={(val: any) => setRealEstateOperation(val)}>
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sale">🏷️ En Venta (Compraventa)</SelectItem>
                              <SelectItem value="rent">🔑 En Arriendo (Mensual)</SelectItem>
                              <SelectItem value="temporary_rent">🏖️ Arriendo Temporal / Vacacional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Tipo de Propiedad</Label>
                          <Select value={realEstatePropertyType} onValueChange={(val: any) => setRealEstatePropertyType(val)}>
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apartment">🏢 Apartamento</SelectItem>
                              <SelectItem value="house">🏡 Casa</SelectItem>
                              <SelectItem value="studio">🛋️ Apartaestudio</SelectItem>
                              <SelectItem value="office">💼 Oficina</SelectItem>
                              <SelectItem value="commercial">🏬 Local Comercial</SelectItem>
                              <SelectItem value="warehouse">🏭 Bodega</SelectItem>
                              <SelectItem value="land">🌲 Lote / Terreno</SelectItem>
                              <SelectItem value="country_house">🚜 Finca / Casa Campestre</SelectItem>
                              <SelectItem value="medical_office">🩺 Consultorio Médico</SelectItem>
                              <SelectItem value="building">🏙️ Edificio Completo</SelectItem>
                              <SelectItem value="other">📦 Otro Inmueble</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* B. Dimensiones, Habitaciones, Baños y Estrato */}
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs">
                          <Home className="h-4 w-4 text-teal-600" />
                          Dimensiones, Distribución & Costos
                        </div>
                        {areaTotalM2 > 0 && basePrice > 0 && (
                          <Badge variant="outline" className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800">
                            💡 ${Math.round(basePrice / areaTotalM2).toLocaleString("es-CO")} COP / m²
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Área Total (m²)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="85"
                            value={areaTotalM2 || ""}
                            onChange={(e) => setAreaTotalM2(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Área Constr. (m²)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="78"
                            value={areaBuiltM2 || ""}
                            onChange={(e) => setAreaBuiltM2(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Habitaciones</Label>
                          <Input
                            type="number"
                            placeholder="3"
                            value={bedrooms || ""}
                            onChange={(e) => setBedrooms(parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Baños</Label>
                          <Input
                            type="number"
                            placeholder="2"
                            value={bathrooms || ""}
                            onChange={(e) => setBathrooms(parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Piso / Nivel</Label>
                          <Input
                            type="number"
                            placeholder="5"
                            value={floorNumber || ""}
                            onChange={(e) => setFloorNumber(parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Estrato</Label>
                          <Select value={stratum} onValueChange={setStratum}>
                            <SelectTrigger className="h-8 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Estrato 1</SelectItem>
                              <SelectItem value="2">Estrato 2</SelectItem>
                              <SelectItem value="3">Estrato 3</SelectItem>
                              <SelectItem value="4">Estrato 4</SelectItem>
                              <SelectItem value="5">Estrato 5</SelectItem>
                              <SelectItem value="6">Estrato 6</SelectItem>
                              <SelectItem value="Comercial">Comercial</SelectItem>
                              <SelectItem value="Rural">Rural</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Valor Administración (COP)</Label>
                          <Input
                            type="number"
                            placeholder="280000"
                            value={adminFee || ""}
                            onChange={(e) => setAdminFee(parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Antigüedad</Label>
                          <Select value={antiquity} onValueChange={setAntiquity}>
                            <SelectTrigger className="h-8 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A estrenar (Nuevo)">A estrenar (Nuevo)</SelectItem>
                              <SelectItem value="1 a 5 años">1 a 5 años</SelectItem>
                              <SelectItem value="5 a 10 años">5 a 10 años</SelectItem>
                              <SelectItem value="10 a 20 años">10 a 20 años</SelectItem>
                              <SelectItem value="Más de 20 años">Más de 20 años</SelectItem>
                              <SelectItem value="En construcción (Sobre planos)">En construcción (Sobre planos)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Tipo de Cocina</Label>
                          <Select value={kitchenType} onValueChange={setKitchenType}>
                            <SelectTrigger className="h-8 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="integral">🍳 Cocina Integral</SelectItem>
                              <SelectItem value="semi_integral">🥘 Cocina Semi-Integral</SelectItem>
                              <SelectItem value="americana">🍸 Cocina Americana / Abierta</SelectItem>
                              <SelectItem value="isla">🏝️ Cocina con Isla</SelectItem>
                              <SelectItem value="tradicional">🍲 Cocina Tradicional / Cerrada</SelectItem>
                              <SelectItem value="sin_cocina">🧱 Sin Cocina / Obra Gris</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* C. Parqueaderos Detallados (Carro, Moto, Cubierto/Intemperie) */}
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs">
                        <Car className="h-4 w-4 text-indigo-500" />
                        Parqueaderos & Estacionamiento (Carro & Moto)
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-zinc-400" />
                            Parqueaderos Carro
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="1"
                            value={parkingCars || ""}
                            onChange={(e) => setParkingCars(parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold flex items-center gap-1.5">
                            <Bike className="h-3.5 w-3.5 text-zinc-400" />
                            Parqueaderos Moto
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="1"
                            value={parkingMotorcycles || ""}
                            onChange={(e) => setParkingMotorcycles(parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Tipo de Parqueadero</Label>
                          <Select value={parkingType} onValueChange={(val: any) => setParkingType(val)}>
                            <SelectTrigger className="h-8 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="covered">🛡️ Cubierto / Techado</SelectItem>
                              <SelectItem value="uncovered">☀️ Descubierto / Intemperie</SelectItem>
                              <SelectItem value="mixed">🔄 Mixto (Cubierto + Intemperie)</SelectItem>
                              <SelectItem value="communal">👥 Comunal / Rotativo</SelectItem>
                              <SelectItem value="none">🚫 No tiene parqueadero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* D. Ubicación & Privacidad */}
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        Ubicación Geográfica & Privacidad
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Ciudad / Municipio</Label>
                          <Input
                            placeholder="ej. Medellín, Bogotá, Cali..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Barrio / Sector</Label>
                          <Input
                            placeholder="ej. El Poblado, Chapinero..."
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Dirección Exacta</Label>
                          <Input
                            placeholder="ej. Calle 10 # 43E-20"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="h-8 text-xs rounded-xl font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <div>
                          <span className="text-xs font-bold block">Ocultar dirección exacta en la tienda pública</span>
                          <span className="text-[11px] text-zinc-400">
                            Por seguridad, los clientes solo verán la Ciudad y el Barrio/Sector.
                          </span>
                        </div>
                        <Switch checked={hideExactAddress} onCheckedChange={setHideExactAddress} />
                      </div>
                    </div>

                    {/* E. Áreas Comunes (Spanish: "Áreas Comunes") */}
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs">
                          <Trees className="h-4 w-4 text-emerald-600" />
                          Áreas Comunes ({commonAreas.length} seleccionadas)
                        </div>
                        <span className="text-[11px] text-zinc-400">Haz clic para activar o desactivar</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_COMMON_AREAS.map((area) => {
                          const isSelected = commonAreas.includes(area)
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => handleToggleCommonArea(area)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5",
                                isSelected
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs"
                                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                              )}
                            >
                              {isSelected ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Plus className="h-3 w-3 text-zinc-400" />}
                              {area}
                            </button>
                          )
                        })}

                        {/* Custom common areas */}
                        {commonAreas
                          .filter((a) => !DEFAULT_COMMON_AREAS.includes(a))
                          .map((customArea) => (
                            <span
                              key={customArea}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs flex items-center gap-1.5"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              {customArea}
                              <button
                                type="button"
                                onClick={() => handleToggleCommonArea(customArea)}
                                className="hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                      </div>

                      {/* Add Custom Area Input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <Input
                          placeholder="Agregar otra área común personalizada (ej. Pista de Bolos)..."
                          value={customCommonAreaInput}
                          onChange={(e) => setCustomCommonAreaInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddCustomCommonArea()
                            }
                          }}
                          className="h-8 text-xs rounded-xl flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddCustomCommonArea}
                          className="h-8 text-xs rounded-xl px-3 font-semibold bg-zinc-800 text-white dark:bg-zinc-700"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Añadir
                        </Button>
                      </div>
                    </div>

                    {/* F. Recorridos 360° & Ficha Técnica PDF */}
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs">
                        <Video className="h-4 w-4 text-purple-500" />
                        Multimedia Avanzada & Documentación
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold flex items-center gap-1.5">
                            <Video className="h-3.5 w-3.5 text-purple-500" />
                            Recorrido Virtual 360° / Tour URL
                          </Label>
                          <Input
                            placeholder="https://my.matterport.com/show/?m=... o YouTube 360"
                            value={virtualTourUrl}
                            onChange={(e) => setVirtualTourUrl(e.target.value)}
                            className="h-8 text-xs rounded-xl font-mono text-[11px]"
                          />
                          <span className="text-[10px] text-zinc-400">Soporta Matterport, Kuula o YouTube</span>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                            Ficha Técnica / Brochure en PDF (URL)
                          </Label>
                          <Input
                            placeholder="https://.../ficha-tecnica-inmueble.pdf"
                            value={brochurePdfUrl}
                            onChange={(e) => setBrochurePdfUrl(e.target.value)}
                            className="h-8 text-xs rounded-xl font-mono text-[11px]"
                          />
                          <span className="text-[10px] text-zinc-400">Enlace directo para descarga de clientes</span>
                        </div>
                      </div>
                    </div>

                    {/* G. Herramientas Financieras (Simulador de Crédito) */}
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-xs">
                          <Calculator className="h-4 w-4 text-emerald-600" />
                          Activar Simulador de Crédito Hipotecario
                        </div>
                        <Switch
                          checked={showMortgageCalculator}
                          onCheckedChange={setShowMortgageCalculator}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Muestra un simulador financiero interactivo en la ficha pública para que los compradores puedan estimar su cuota mensual según el valor del inmueble, cuota inicial y plazo.
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual Badges Selector (Hidden for Real Estate) */}
                {classification !== "real_estate" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Etiquetas Visuales (Badges)</Label>
                    <div className="flex flex-wrap gap-2">
                      {BADGE_OPTIONS.map((badge) => {
                        const isSelected = selectedBadges.includes(badge)
                        return (
                          <button
                            key={badge}
                            type="button"
                            onClick={() => handleToggleBadge(badge)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                              isSelected
                                ? "bg-brand-pink text-white border-brand-pink shadow-xs"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                            )}
                          >
                            {badge}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: INVENTARIO & STOCK */}
              <TabsContent value="inventory" className="space-y-5 m-0">
                {/* Summary / Header Status Card */}
                <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-brand-pink/10 text-brand-pink shrink-0">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        Estado General de Inventario
                        {hasVariants ? (
                          <Badge variant="outline" className="text-[10px] bg-white dark:bg-zinc-800">
                            {variants.length} variantes
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {trackInventory ? (
                          hasVariants ? (
                            <>
                              Stock total acumulado en variantes:{" "}
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {variants.reduce(
                                  (acc, v) => acc + Number(v.inventory_quantity ?? v.stock_quantity ?? 0),
                                  0
                                )}{" "}
                                unidades
                              </span>
                            </>
                          ) : (
                            <>
                              Stock disponible para venta:{" "}
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {inventoryQuantity} unidades
                              </span>
                            </>
                          )
                        ) : (
                          "Control de inventario desactivado (Venta libre e ilimitada)"
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Status Badge */}
                  <div>
                    {!trackInventory ? (
                      <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold">
                        Sin Control de Stock
                      </Badge>
                    ) : hasVariants ? (
                      (() => {
                        const totalQty = variants.reduce(
                          (acc, v) => acc + Number(v.inventory_quantity ?? v.stock_quantity ?? 0),
                          0
                        )
                        if (totalQty <= 0 && !allowBackorders) {
                          return (
                            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-xs px-3 py-1 font-bold">
                              Agotado
                            </Badge>
                          )
                        }
                        if (totalQty <= 0 && allowBackorders) {
                          return (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs px-3 py-1 font-bold">
                              Disponible bajo pedido
                            </Badge>
                          )
                        }
                        if (totalQty <= lowStockThreshold) {
                          return (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs px-3 py-1 font-bold">
                              ¡Últimas {totalQty} unidades!
                            </Badge>
                          )
                        }
                        return (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 font-bold">
                            En Stock ({totalQty})
                          </Badge>
                        )
                      })()
                    ) : (
                      (() => {
                        if (inventoryQuantity <= 0 && !allowBackorders) {
                          return (
                            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-xs px-3 py-1 font-bold">
                              Agotado
                            </Badge>
                          )
                        }
                        if (inventoryQuantity <= 0 && allowBackorders) {
                          return (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs px-3 py-1 font-bold">
                              Disponible bajo pedido
                            </Badge>
                          )
                        }
                        if (inventoryQuantity <= lowStockThreshold) {
                          return (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs px-3 py-1 font-bold">
                              ¡Últimas {inventoryQuantity} unidades!
                            </Badge>
                          )
                        }
                        return (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 font-bold">
                            En Stock ({inventoryQuantity})
                          </Badge>
                        )
                      })()
                    )}
                  </div>
                </div>

                {/* Control Toggles */}
                <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-zinc-900 dark:text-white block cursor-pointer">
                        Controlar Inventario (Rastrear Existencias)
                      </Label>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Descuenta automáticamente existencias y previene sobreventas en la tienda pública.
                      </span>
                    </div>
                    <Switch checked={trackInventory} onCheckedChange={setTrackInventory} />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <Label className="text-xs font-bold text-zinc-900 dark:text-white block cursor-pointer">
                        Permitir Pedidos sin Stock / Bajo Pedido (Backorders)
                      </Label>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Los clientes podrán seguir ordenando con la insignia &ldquo;Disponible bajo pedido&rdquo; cuando el stock llegue a 0.
                      </span>
                    </div>
                    <Switch checked={allowBackorders} onCheckedChange={setAllowBackorders} />
                  </div>
                </div>

                {/* Threshold & Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Umbral de Stock Bajo</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="5"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                      className="h-9 text-xs rounded-xl"
                    />
                    <span className="text-[10px] text-zinc-400 block">
                      Insignia &ldquo;¡Últimas X unidades!&rdquo; si stock &le; {lowStockThreshold}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Código SKU</Label>
                    <Input
                      placeholder="PIX-PROD-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="h-9 text-xs font-mono rounded-xl"
                    />
                    <span className="text-[10px] text-zinc-400 block">Código interno de inventario</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Código de Barras (EAN/UPC)</Label>
                    <Input
                      placeholder="770000000000"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="h-9 text-xs font-mono rounded-xl"
                    />
                    <span className="text-[10px] text-zinc-400 block">Identificador de barras comercial</span>
                  </div>
                </div>

                {/* Simple Product Stock Stepper */}
                {!hasVariants && (
                  <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-900 dark:text-white">
                        Cantidad en Stock
                      </Label>
                      <span className="text-xs font-extrabold text-brand-pink">
                        {inventoryQuantity} unidades
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        disabled={!trackInventory}
                        placeholder="0"
                        value={inventoryQuantity}
                        onChange={(e) => setInventoryQuantity(parseInt(e.target.value, 10) || 0)}
                        className="h-10 text-sm font-bold rounded-xl max-w-[150px]"
                      />
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!trackInventory}
                          onClick={() => setInventoryQuantity((q) => Math.max(0, q + 5))}
                          className="h-9 text-xs rounded-xl"
                        >
                          +5
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!trackInventory}
                          onClick={() => setInventoryQuantity((q) => Math.max(0, q + 10))}
                          className="h-9 text-xs rounded-xl"
                        >
                          +10
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!trackInventory}
                          onClick={() => setInventoryQuantity((q) => Math.max(0, q + 50))}
                          className="h-9 text-xs rounded-xl"
                        >
                          +50
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!trackInventory}
                          onClick={() => setInventoryQuantity(0)}
                          className="h-9 text-xs text-zinc-400 hover:text-red-500 rounded-xl"
                        >
                          Poner en 0
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* When item has variants, show clean consolidated summary and shortcut to Tab 4 */}
                {hasVariants && (
                  <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-brand-pink" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">Control de Inventario por Variantes</span>
                      </div>
                      <Badge className="bg-brand-pink/10 text-brand-pink border-brand-pink/20 text-[10px] font-bold">
                        {variants.length} variantes
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Este producto utiliza variantes independientes. Puedes configurar el stock, SKU, código de barras y modo bajo pedido de cada combinación en la pestaña de <strong className="text-zinc-900 dark:text-white">Variantes</strong>.
                    </p>
                    <div className="pt-2 flex items-center justify-between">
                      <div className="text-xs text-zinc-600 dark:text-zinc-300">
                        Stock total acumulado:{" "}
                        <span className="font-extrabold text-zinc-900 dark:text-white">
                          {variants.reduce(
                            (acc, v) => acc + Number(v.inventory_quantity ?? v.stock_quantity ?? 0),
                            0
                          )}{" "}
                          unidades
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("variants")}
                        className="h-8 text-xs font-bold rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white shadow-xs cursor-pointer"
                      >
                        Ir a pestaña Variantes →
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: VARIANTS & ATTRIBUTES */}
              <TabsContent value="variants" className="space-y-5 m-0">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10">
                  <div>
                    <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                      Habilitar Variantes para este Producto
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Permite combinaciones de Color, Talla, Acabados con precios y stock individuales
                    </span>
                  </div>
                  <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
                </div>

                {hasVariants ? (
                  <VariantMatrixManager
                    itemId={itemToEdit?.id}
                    basePrice={basePrice}
                    skuPrefix={sku || "PROD"}
                    attributeGroups={attributeGroups}
                    variants={variants}
                    onChange={setVariants}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50">
                    <Layers className="h-10 w-10 text-zinc-400 mb-2" />
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Variantes desactivadas</p>
                    <p className="text-xs text-zinc-500 max-w-sm mb-4">
                      Activa el interruptor arriba para generar opciones combinadas con atributos globales.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setHasVariants(true)}
                      className="bg-brand-pink text-white text-xs rounded-xl font-bold"
                    >
                      Activar Variantes
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: STOREFRONT & SEO */}
              <TabsContent value="store" className="space-y-5 m-0">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10">
                  <div>
                    <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                      Visible en Portal Público
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Los clientes podrán ver y pedir este item en tu tienda
                    </span>
                  </div>
                  <Switch checked={isVisibleInPortal} onCheckedChange={setIsVisibleInPortal} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Acción Principal del Botón (CTA)</Label>
                    <Select value={ctaType} onValueChange={(val: any) => setCtaType(val)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">💬 WhatsApp (Pedir por Chat)</SelectItem>
                        <SelectItem value="cart">🛒 Carrito de Compras (Slide-Over Drawer)</SelectItem>
                        <SelectItem value="buy">💳 Compra Directa Online (Wompi / Tarjetas)</SelectItem>
                        <SelectItem value="quote">📋 Cotización Formal (1-Click CRM)</SelectItem>
                        <SelectItem value="booking">📅 Agendar Cita (Reserva de Horario)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Etiqueta de Precio</Label>
                    <Select value={priceLabelType} onValueChange={(val: any) => setPriceLabelType(val)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Precio Fijo ($XX.XXX)</SelectItem>
                        <SelectItem value="from">Desde ($XX.XXX)</SelectItem>
                        <SelectItem value="base_price">Precio Base</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SEO Metatags */}
                <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Optimización para Motores de Búsqueda (SEO)
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Título SEO (Meta Title)</Label>
                    <Input
                      placeholder="Título llamativo para Google (máx. 60 caracteres)"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Descripción SEO (Meta Description)</Label>
                    <Textarea
                      rows={2}
                      placeholder="Resumen atractivo para los resultados de búsqueda..."
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Etiquetas de Búsqueda (Tags separadas por coma)</Label>
                    <Input
                      placeholder="tienda, diseño, zapatos, bogotá"
                      value={searchTagsInput}
                      onChange={(e) => setSearchTagsInput(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer Save Button */}
          <SheetFooter className="p-4 sm:p-5 border-t border-zinc-100 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-row items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-10 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveItem}
              disabled={isSaving}
              className="bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold h-10 px-6 shadow-md gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {itemToEdit ? "Guardar Cambios" : "Crear Producto"}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* AI Copywriter Dialog */}
      <AICopywriterDialog
        open={isAiOpen}
        onOpenChange={setIsAiOpen}
        initialName={name}
        initialCategory={category}
        initialClassification={classification}
        initialDescription={description}
        onApplyCopy={handleApplyAiCopy}
      />

      {/* QR Code Dialog */}
      {itemToEdit && (
        <QRCodeDialog
          open={isQrOpen}
          onOpenChange={setIsQrOpen}
          item={itemToEdit}
          portalToken={portalToken}
          organizationId={organizationId}
        />
      )}

      {/* Category Manager Drawer shortcut */}
      <CategoryManagerDrawer
        open={isCategoryDrawerOpen}
        onOpenChange={setIsCategoryDrawerOpen}
      />
    </>
  )
}
