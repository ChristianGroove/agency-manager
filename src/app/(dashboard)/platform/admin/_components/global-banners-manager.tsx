"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Save, Trash2, Edit2, PlayCircle, Eye, X, Image as ImageIcon, LayoutTemplate, Palette, Globe, Target, Trash } from "lucide-react"

import { getGlobalBanners, upsertGlobalBanner, toggleBannerActive, deleteGlobalBanner } from "@/modules/core/admin/actions"
import { GlobalBannerConfig, GlobalDashboardBanner } from "@/modules/core/dashboard/components/global-dashboard-banner"

const ANIMATIONS = [
  {
    "label": "24 7 cliente soporte",
    "value": "/animations/24-7-customer-support-cartoon-illustration-2025-10-20-04-30-40-utc.json"
  },
  {
    "label": "Data presentation mujer explaining chart",
    "value": "/animations/animated-data-presentation-woman-explaining-chart-2025-10-20-06-25-36-utc.json"
  },
  {
    "label": "Hand holding clock for productivity",
    "value": "/animations/animated-hand-holding-clock-for-productivity-2025-10-20-06-18-36-utc.json"
  },
  {
    "label": "Oficina workspace desk with computer and b",
    "value": "/animations/animated-office-workspace-desk-with-computer-and-b-2025-10-20-06-00-41-utc.json"
  },
  {
    "label": "Work timing clock",
    "value": "/animations/animated-work-timing-clock-2025-10-20-06-08-30-utc.json"
  },
  {
    "label": "Beauty product on phone",
    "value": "/animations/beauty-product-on-phone-cartoon-animation-2025-10-20-02-26-52-utc.json"
  },
  {
    "label": "Big sale tag",
    "value": "/animations/big-sale-tag-animation-2025-10-20-04-33-47-utc.json"
  },
  {
    "label": "Niño dribbling basketball",
    "value": "/animations/boy-dribbling-basketball-animation-2025-10-20-06-26-42-utc.json"
  },
  {
    "label": "Niño leyendo a libro in a mobile phone",
    "value": "/animations/boy-reading-a-book-in-a-mobile-phone-cartoon-2025-10-20-04-34-46-utc.json"
  },
  {
    "label": "Niño watching a video for learning",
    "value": "/animations/boy-watching-a-video-for-learning-illustration-2025-10-20-06-01-34-utc.json"
  },
  {
    "label": "Niño with dog in wilderness",
    "value": "/animations/boy-with-dog-in-wilderness-illustration-2025-10-20-03-04-06-utc.json"
  },
  {
    "label": "Budget calculation with calculator and coins illus",
    "value": "/animations/budget-calculation-with-calculator-and-coins-illus-2025-10-20-04-28-16-utc.json"
  },
  {
    "label": "Budget management financial planning and task ch",
    "value": "/animations/budget-management-financial-planning-and-task-ch-2025-10-20-06-02-26-utc.json"
  },
  {
    "label": "Negocios goal achievement and target success",
    "value": "/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json"
  },
  {
    "label": "Negocios presentation with charts and data analysi",
    "value": "/animations/business-presentation-with-charts-and-data-analysi-2025-10-20-06-00-36-utc.json"
  },
  {
    "label": "Cancel order on mobile phone",
    "value": "/animations/cancel-order-on-mobile-phone-illustration-2025-10-21-01-41-09-utc.json"
  },
  {
    "label": "Advertising speaker",
    "value": "/animations/cartoon-advertising-speaker-illustration-2025-10-20-03-14-15-utc.json"
  },
  {
    "label": "Airplane",
    "value": "/animations/cartoon-airplane-animation-2025-10-20-02-23-50-utc.json"
  },
  {
    "label": "Beach chair and umbrella",
    "value": "/animations/cartoon-beach-chair-and-umbrella-illustration-2025-10-20-02-26-52-utc.json"
  },
  {
    "label": "Bike",
    "value": "/animations/cartoon-bike-illustration-2025-10-20-03-14-14-utc.json"
  },
  {
    "label": "Box with checkmark for package verificatio",
    "value": "/animations/cartoon-box-with-checkmark-for-package-verificatio-2025-10-20-02-17-47-utc.json"
  },
  {
    "label": "Niño receiving a heartfelt surprise gift",
    "value": "/animations/cartoon-boy-receiving-a-heartfelt-surprise-gift-2025-10-20-04-38-51-utc.json"
  },
  {
    "label": "Niño with books and school supplies illustr",
    "value": "/animations/cartoon-boy-with-books-and-school-supplies-illustr-2025-10-20-06-07-44-utc.json"
  },
  {
    "label": "Brain meditating for mental wellness",
    "value": "/animations/cartoon-brain-meditating-for-mental-wellness-2025-10-20-06-08-32-utc.json"
  },
  {
    "label": "Hamburguesa combo",
    "value": "/animations/cartoon-burger-combo-illustration-2025-10-20-04-32-44-utc.json"
  },
  {
    "label": "Hamburguesa",
    "value": "/animations/cartoon-burger-illustration-2025-10-20-05-59-08-utc.json"
  },
  {
    "label": "Calendar",
    "value": "/animations/cartoon-calendar-illustration-2025-10-20-02-24-50-utc.json"
  },
  {
    "label": "Canceled order",
    "value": "/animations/cartoon-canceled-order-illustration-2025-10-20-02-21-51-utc.json"
  },
  {
    "label": "Cargo ship with containers",
    "value": "/animations/cartoon-cargo-ship-with-containers-illustration-2025-10-20-01-47-10-utc.json"
  },
  {
    "label": "Cart confirmation on mobile phone",
    "value": "/animations/cartoon-cart-confirmation-on-mobile-phone-2025-10-20-03-06-09-utc.json"
  },
  {
    "label": "Character limpieza servicio",
    "value": "/animations/cartoon-character-cleaning-service-illustration-2025-10-20-04-38-50-utc.json"
  },
  {
    "label": "Character finding directions in the wilder",
    "value": "/animations/cartoon-character-finding-directions-in-the-wilder-2025-10-20-02-20-48-utc.json"
  },
  {
    "label": "Character comida entrega on foot illustrati",
    "value": "/animations/cartoon-character-food-delivery-on-foot-illustrati-2025-10-20-02-27-52-utc.json"
  },
  {
    "label": "Character moving into new home",
    "value": "/animations/cartoon-character-moving-into-new-home-2025-10-20-05-58-29-utc.json"
  },
  {
    "label": "Citrus drink",
    "value": "/animations/cartoon-citrus-drink-illustration-2025-10-20-04-28-24-utc.json"
  },
  {
    "label": "Limpieza cart with supplies",
    "value": "/animations/cartoon-cleaning-cart-with-supplies-illustration-2025-10-20-04-32-44-utc.json"
  },
  {
    "label": "Cocktail and soda duo",
    "value": "/animations/cartoon-cocktail-and-soda-duo-illustration-2025-10-20-06-01-37-utc.json"
  },
  {
    "label": "Compass in wilderness",
    "value": "/animations/cartoon-compass-in-wilderness-animation-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Construction site crane",
    "value": "/animations/cartoon-construction-site-crane-illustration-2025-10-20-04-32-49-utc.json"
  },
  {
    "label": "Content planning",
    "value": "/animations/cartoon-content-planning-illustration-2025-10-20-02-32-55-utc.json"
  },
  {
    "label": "Couple in romantic embrace",
    "value": "/animations/cartoon-couple-in-romantic-embrace-illustration-2025-10-20-05-59-25-utc.json"
  },
  {
    "label": "Courier delivering a package",
    "value": "/animations/cartoon-courier-delivering-a-package-animation-2025-10-20-04-33-47-utc.json"
  },
  {
    "label": "Cliente servicio representative",
    "value": "/animations/cartoon-customer-service-representative-animation-2025-10-20-03-06-09-utc.json"
  },
  {
    "label": "Cliente servicio representative contacting",
    "value": "/animations/cartoon-customer-service-representative-contacting-2025-10-20-06-00-34-utc.json"
  },
  {
    "label": "Cliente soporte equipo",
    "value": "/animations/cartoon-customer-support-team-illustration-2025-10-20-05-59-15-utc.json"
  },
  {
    "label": "Entrega niño on bicycle",
    "value": "/animations/cartoon-delivery-boy-on-bicycle-illustration-2025-10-20-02-27-52-utc.json"
  },
  {
    "label": "Entrega hombre walking home",
    "value": "/animations/cartoon-delivery-man-walking-home-illustration-2025-10-20-03-06-08-utc.json"
  },
  {
    "label": "Entrega truck with clock and location pin",
    "value": "/animations/cartoon-delivery-truck-with-clock-and-location-pin-2025-10-20-04-33-44-utc.json"
  },
  {
    "label": "Doctor checking patient",
    "value": "/animations/cartoon-doctor-checking-patient-illustration-2025-10-20-04-34-46-utc.json"
  },
  {
    "label": "Doctor holding clipboard with heart rate",
    "value": "/animations/cartoon-doctor-holding-clipboard-with-heart-rate-2025-10-20-04-28-16-utc.json"
  },
  {
    "label": "Doctor using a tablet",
    "value": "/animations/cartoon-doctor-using-a-tablet-illustration-2025-10-20-04-30-55-utc.json"
  },
  {
    "label": "Engagement metrics graph",
    "value": "/animations/cartoon-engagement-metrics-graph-illustration-2025-10-20-02-25-51-utc.json"
  },
  {
    "label": "Fashion stylist choosing clothes",
    "value": "/animations/cartoon-fashion-stylist-choosing-clothes-2025-10-20-01-54-38-utc.json"
  },
  {
    "label": "Flight ticket",
    "value": "/animations/cartoon-flight-ticket-illustration-2025-10-20-02-26-52-utc.json"
  },
  {
    "label": "Comida entrega on scooter character animati",
    "value": "/animations/cartoon-food-delivery-on-scooter-character-animati-2025-10-20-02-29-53-utc.json"
  },
  {
    "label": "Free offer label",
    "value": "/animations/cartoon-free-offer-label-illustration-2025-10-20-01-41-32-utc.json"
  },
  {
    "label": "French fries",
    "value": "/animations/cartoon-french-fries-illustration-2025-10-20-05-58-30-utc.json"
  },
  {
    "label": "Geometric compass",
    "value": "/animations/cartoon-geometric-compass-illustration-2025-10-20-05-59-14-utc.json"
  },
  {
    "label": "Niña giving a surprise gift to a niño",
    "value": "/animations/cartoon-girl-giving-a-surprise-gift-to-a-boy-2025-10-20-04-30-48-utc.json"
  },
  {
    "label": "Niña leyendo a libro",
    "value": "/animations/cartoon-girl-reading-a-book-illustration-2025-10-20-05-59-05-utc.json"
  },
  {
    "label": "Niña watching en línea education video on ph",
    "value": "/animations/cartoon-girl-watching-online-education-video-on-ph-2025-10-20-04-34-47-utc.json"
  },
  {
    "label": "Niña with love letter",
    "value": "/animations/cartoon-girl-with-love-letter-animation-2025-10-20-05-59-05-utc.json"
  },
  {
    "label": "Globe spinning",
    "value": "/animations/cartoon-globe-spinning-animation-2025-10-20-04-30-44-utc.json"
  },
  {
    "label": "Graduate niña throwing graduation cap",
    "value": "/animations/cartoon-graduate-girl-throwing-graduation-cap-2025-10-20-05-58-26-utc.json"
  },
  {
    "label": "Graduation caps",
    "value": "/animations/cartoon-graduation-caps-illustration-2025-10-20-04-30-42-utc.json"
  },
  {
    "label": "Green digital tarjeta",
    "value": "/animations/cartoon-green-digital-card-illustration-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Grocery basket with comida items illustratio",
    "value": "/animations/cartoon-grocery-basket-with-food-items-illustratio-2025-10-20-04-28-24-utc.json"
  },
  {
    "label": "Hand holding compass in wilderness illustr",
    "value": "/animations/cartoon-hand-holding-compass-in-wilderness-illustr-2025-10-20-04-30-40-utc.json"
  },
  {
    "label": "Hand holding thermometer",
    "value": "/animations/cartoon-hand-holding-thermometer-illustration-2025-10-20-05-58-25-utc.json"
  },
  {
    "label": "Hands reaching for hearts",
    "value": "/animations/cartoon-hands-reaching-for-hearts-2025-10-20-04-28-18-utc.json"
  },
  {
    "label": "Hands receiving a package",
    "value": "/animations/cartoon-hands-receiving-a-package-animation-2025-10-20-03-11-12-utc.json"
  },
  {
    "label": "Heart health  with hand",
    "value": "/animations/cartoon-heart-health-illustration-with-hand-2025-10-20-04-28-16-utc.json"
  },
  {
    "label": "Of a couple on wine date",
    "value": "/animations/cartoon-illustration-of-a-couple-on-wine-date-2025-10-20-04-32-49-utc.json"
  },
  {
    "label": "Of credit tarjeta and wallet",
    "value": "/animations/cartoon-illustration-of-credit-card-and-wallet-2025-10-20-03-13-12-utc.json"
  },
  {
    "label": "Of crypto wallet transfer",
    "value": "/animations/cartoon-illustration-of-crypto-wallet-transfer-2025-10-20-03-16-13-utc.json"
  },
  {
    "label": "Of mujer building brand block",
    "value": "/animations/cartoon-illustration-of-woman-building-brand-block-2025-10-20-02-26-52-utc.json"
  },
  {
    "label": "Luggage with hat",
    "value": "/animations/cartoon-luggage-with-hat-illustration-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Hombre announcing a job vacancy with megaphon",
    "value": "/animations/cartoon-man-announcing-a-job-vacancy-with-megaphon-2025-10-20-04-32-48-utc.json"
  },
  {
    "label": "Hombre delivering fast comida on scooter illust",
    "value": "/animations/cartoon-man-delivering-fast-food-on-scooter-illust-2025-10-20-03-16-13-utc.json"
  },
  {
    "label": "Hombre getting a haircut at the barber shop",
    "value": "/animations/cartoon-man-getting-a-haircut-at-the-barber-shop-2025-10-20-02-20-48-utc.json"
  },
  {
    "label": "Hombre relaxing in oficina chair",
    "value": "/animations/cartoon-man-relaxing-in-office-chair-2025-10-20-03-14-13-utc.json"
  },
  {
    "label": "Hombre vacuum limpieza the floor",
    "value": "/animations/cartoon-man-vacuum-cleaning-the-floor-illustration-2025-10-20-05-59-26-utc.json"
  },
  {
    "label": "Hombre trabajando at coffee shop",
    "value": "/animations/cartoon-man-working-at-coffee-shop-illustration-2025-10-20-05-59-33-utc.json"
  },
  {
    "label": "Hombre trabajando en escritorio",
    "value": "/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json"
  },
  {
    "label": "Mannequin with dress",
    "value": "/animations/cartoon-mannequin-with-dress-illustration-2025-10-20-01-43-33-utc.json"
  },
  {
    "label": "Map  in wilderness",
    "value": "/animations/cartoon-map-illustration-in-wilderness-2025-10-20-03-11-12-utc.json"
  },
  {
    "label": "Marketing target",
    "value": "/animations/cartoon-marketing-target-illustration-2025-10-20-02-32-54-utc.json"
  },
  {
    "label": "Médico consultation with doctor and patie",
    "value": "/animations/cartoon-medical-consultation-with-doctor-and-patie-2025-10-20-04-29-11-utc.json"
  },
  {
    "label": "Megaphone and mail",
    "value": "/animations/cartoon-megaphone-and-mail-illustration-2025-10-20-02-22-50-utc.json"
  },
  {
    "label": "Money transfer with mobile phone and credi",
    "value": "/animations/cartoon-money-transfer-with-mobile-phone-and-credi-2025-10-20-02-25-51-utc.json"
  },
  {
    "label": "Oficina supplies",
    "value": "/animations/cartoon-office-supplies-illustration-2025-10-20-05-59-35-utc.json"
  },
  {
    "label": "Pago invoice",
    "value": "/animations/cartoon-payment-invoice-illustration-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "People boarding at airport",
    "value": "/animations/cartoon-people-boarding-at-airport-illustration-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Premium box",
    "value": "/animations/cartoon-premium-box-illustration-2025-10-20-03-11-12-utc.json"
  },
  {
    "label": "Product return",
    "value": "/animations/cartoon-product-return-illustration-2025-10-20-02-19-48-utc.json"
  },
  {
    "label": "Road trip in the wilderness",
    "value": "/animations/cartoon-road-trip-in-the-wilderness-animation-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Scissors",
    "value": "/animations/cartoon-scissors-illustration-2025-10-20-06-01-30-utc.json"
  },
  {
    "label": "Comprando basket with gifts",
    "value": "/animations/cartoon-shopping-basket-with-gifts-illustration-2025-10-20-03-17-15-utc.json"
  },
  {
    "label": "Comprando cart full of comida",
    "value": "/animations/cartoon-shopping-cart-full-of-food-illustration-2025-10-20-05-58-25-utc.json"
  },
  {
    "label": "Camera",
    "value": "/animations/cartoon-style-camera-illustration-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Coffee bar",
    "value": "/animations/cartoon-style-coffee-bar-illustration-2025-10-20-05-58-25-utc.json"
  },
  {
    "label": "Cream tubes",
    "value": "/animations/cartoon-style-cream-tubes-illustration-2025-10-20-04-33-47-utc.json"
  },
  {
    "label": "Dna structure",
    "value": "/animations/cartoon-style-dna-structure-illustration-2025-10-20-04-32-46-utc.json"
  },
  {
    "label": "Financial tarjeta",
    "value": "/animations/cartoon-style-financial-card-illustration-2025-10-20-02-22-50-utc.json"
  },
  {
    "label": "Scooter",
    "value": "/animations/cartoon-style-scooter-illustration-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Task list",
    "value": "/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json"
  },
  {
    "label": "Tether coin",
    "value": "/animations/cartoon-tether-coin-illustration-2025-10-20-01-52-37-utc.json"
  },
  {
    "label": "Vacuum cleaner",
    "value": "/animations/cartoon-vacuum-cleaner-illustration-2025-10-20-04-28-11-utc.json"
  },
  {
    "label": "Washing machine",
    "value": "/animations/cartoon-washing-machine-illustration-2025-10-20-04-30-43-utc.json"
  },
  {
    "label": "Window limpieza servicio",
    "value": "/animations/cartoon-window-cleaning-service-illustration-2025-10-20-04-30-52-utc.json"
  },
  {
    "label": "Mujer applying face cream",
    "value": "/animations/cartoon-woman-applying-face-cream-animation-2025-10-20-02-02-41-utc.json"
  },
  {
    "label": "Mujer doing skincare routine",
    "value": "/animations/cartoon-woman-doing-skincare-routine-2025-10-20-03-06-09-utc.json"
  },
  {
    "label": "Caution wet floor sign",
    "value": "/animations/caution-wet-floor-sign-illustration-2025-10-20-04-28-19-utc.json"
  },
  {
    "label": "Clock  in",
    "value": "/animations/clock-animation-in-cartoon-style-2025-10-20-03-17-16-utc.json"
  },
  {
    "label": "Coffee cup and note",
    "value": "/animations/coffee-cup-and-note-illustration-2025-10-20-04-28-21-utc.json"
  },
  {
    "label": "Colorful comprando bags",
    "value": "/animations/colorful-shopping-bags-illustration-2025-10-20-05-59-17-utc.json"
  },
  {
    "label": "Comfortable leyendo with digital data overlay",
    "value": "/animations/comfortable-reading-with-digital-data-overlay-2025-10-20-06-18-32-utc.json"
  },
  {
    "label": "Confirm order",
    "value": "/animations/confirm-order-cartoon-illustration-2025-10-20-03-10-17-utc.json"
  },
  {
    "label": "Creative idea lightbulb",
    "value": "/animations/creative-idea-lightbulb-cartoon-illustration-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Creative equipo brainstorming session",
    "value": "/animations/creative-team-brainstorming-session-2025-10-20-06-25-38-utc.json"
  },
  {
    "label": "Cryptocurrency app interface",
    "value": "/animations/cryptocurrency-app-interface-illustration-2025-10-20-02-02-41-utc.json"
  },
  {
    "label": "Cliente servicio agent tracking a package",
    "value": "/animations/customer-service-agent-tracking-a-package-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Cliente soporte via smartphone",
    "value": "/animations/customer-support-via-smartphone-illustration-2025-10-20-04-38-50-utc.json"
  },
  {
    "label": "Cute store  with bright colors",
    "value": "/animations/cute-store-illustration-with-bright-colors-2025-10-20-05-59-20-utc.json"
  },
  {
    "label": "Defective order box",
    "value": "/animations/defective-order-box-cartoon-illustration-2025-10-20-01-55-39-utc (1).json"
  },
  {
    "label": "Defective order box",
    "value": "/animations/defective-order-box-cartoon-illustration-2025-10-20-01-55-39-utc.json"
  },
  {
    "label": "Entrega confirmation",
    "value": "/animations/delivery-confirmation-illustration-2025-10-20-06-00-27-utc (1).json"
  },
  {
    "label": "Entrega confirmation",
    "value": "/animations/delivery-confirmation-illustration-2025-10-20-06-00-27-utc.json"
  },
  {
    "label": "Dollar and euro currency exchange",
    "value": "/animations/dollar-and-euro-currency-exchange-illustration-2025-10-20-02-17-47-utc.json"
  },
  {
    "label": "Dynamic handstand challenge",
    "value": "/animations/dynamic-handstand-challenge-animation-2025-10-20-06-25-36-utc.json"
  },
  {
    "label": "Dynamic hoop acrobatics performer",
    "value": "/animations/dynamic-hoop-acrobatics-performer-animation-2025-10-20-06-25-39-utc.json"
  },
  {
    "label": "Excited mujer receiving a job offer",
    "value": "/animations/excited-woman-receiving-a-job-offer-illustration-2025-10-20-05-58-23-utc.json"
  },
  {
    "label": "File upload to cloud",
    "value": "/animations/file-upload-to-cloud-cartoon-animation-2025-10-20-03-17-15-utc.json"
  },
  {
    "label": "Global love and affection",
    "value": "/animations/global-love-and-affection-illustration-2025-10-20-04-28-08-utc.json"
  },
  {
    "label": "Graduation cap on stack of books",
    "value": "/animations/graduation-cap-on-stack-of-books-illustration-2025-10-20-04-28-19-utc.json"
  },
  {
    "label": "Hand holding crypto coins",
    "value": "/animations/hand-holding-crypto-coins-illustration-2025-10-20-04-12-35-utc.json"
  },
  {
    "label": "Hand holding hairdressing kit",
    "value": "/animations/hand-holding-hairdressing-kit-cartoon-style-2025-10-20-03-08-08-utc.json"
  },
  {
    "label": "Hands collaborating to build success word animatio",
    "value": "/animations/hands-collaborating-to-build-success-word-animatio-2025-10-20-06-26-39-utc.json"
  },
  {
    "label": "Hands holding a phone with a family picture",
    "value": "/animations/hands-holding-a-phone-with-a-family-picture-2025-10-20-04-28-29-utc.json"
  },
  {
    "label": "Handshake agreement  graphic",
    "value": "/animations/handshake-agreement-animated-graphic-2025-10-20-06-25-39-utc.json"
  },
  {
    "label": "Health and fitness essentials",
    "value": "/animations/health-and-fitness-essentials-animation-2025-10-20-06-08-31-utc.json"
  },
  {
    "label": "Heartfelt message  with hearts",
    "value": "/animations/heartfelt-message-animation-with-hearts-2025-10-20-04-36-48-utc.json"
  },
  {
    "label": "Hire me appeal",
    "value": "/animations/hire-me-appeal-cartoon-illustration-2025-10-20-04-32-47-utc.json"
  },
  {
    "label": "Home oficina workout with laptop",
    "value": "/animations/home-office-workout-with-laptop-2025-10-20-05-58-23-utc.json"
  },
  {
    "label": "Home repair servicio",
    "value": "/animations/home-repair-service-cartoon-illustration-2025-10-20-06-01-50-utc.json"
  },
  {
    "label": "Job offer  in",
    "value": "/animations/job-offer-illustration-in-cartoon-style-2025-10-20-04-30-49-utc.json"
  },
  {
    "label": "Job offer letter  in",
    "value": "/animations/job-offer-letter-illustration-in-cartoon-style-2025-10-20-04-28-26-utc.json"
  },
  {
    "label": "Join our equipo",
    "value": "/animations/join-our-team-illustration-2025-10-20-04-30-54-utc.json"
  },
  {
    "label": "Law libro",
    "value": "/animations/law-book-illustration-2025-10-20-05-59-30-utc.json"
  },
  {
    "label": "Learning symbols",
    "value": "/animations/learning-symbols-cartoon-illustration-2025-10-20-06-17-32-utc.json"
  },
  {
    "label": "Magnet marketing",
    "value": "/animations/magnet-marketing-cartoon-illustration-2025-10-20-03-25-21-utc.json"
  },
  {
    "label": "Hombre enjoying coffee with cupcake",
    "value": "/animations/man-enjoying-coffee-with-cupcake-illustration-2025-10-20-05-59-06-utc.json"
  },
  {
    "label": "Hombre comprando en línea using mobile device illustrati",
    "value": "/animations/man-shopping-online-using-mobile-device-illustrati-2025-10-20-04-30-49-utc.json"
  },
  {
    "label": "Marketing announcement",
    "value": "/animations/marketing-announcement-cartoon-style-animation-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Médico report",
    "value": "/animations/medical-report-cartoon-illustration-2025-10-20-04-36-48-utc.json"
  },
  {
    "label": "Mobile engagement",
    "value": "/animations/mobile-engagement-cartoon-illustration-2025-10-20-02-25-51-utc.json"
  },
  {
    "label": "Mobile grocery comprando and pago",
    "value": "/animations/mobile-grocery-shopping-and-payment-illustration-2025-10-20-05-59-34-utc.json"
  },
  {
    "label": "Mobile marketing   with smartph",
    "value": "/animations/mobile-marketing-cartoon-illustration-with-smartph-2025-10-20-03-11-12-utc.json"
  },
  {
    "label": "Oficina break leyendo hombre",
    "value": "/animations/office-break-reading-man-2025-10-20-06-26-40-utc (1).json"
  },
  {
    "label": "Oficina break leyendo hombre",
    "value": "/animations/office-break-reading-man-2025-10-20-06-26-40-utc.json"
  },
  {
    "label": "Oficina worker en escritorio",
    "value": "/animations/office-worker-at-desk-2025-10-20-06-00-34-utc.json"
  },
  {
    "label": "Oficina worker wearing mask en escritorio",
    "value": "/animations/office-worker-wearing-mask-at-desk-illustration-2025-10-20-02-58-14-utc.json"
  },
  {
    "label": "En línea clothing store comprando on tablet illustrat",
    "value": "/animations/online-clothing-store-shopping-on-tablet-illustrat-2025-10-20-04-36-48-utc.json"
  },
  {
    "label": "En línea course on smartphone screen",
    "value": "/animations/online-course-on-smartphone-screen-illustration-2025-10-20-04-38-51-utc.json"
  },
  {
    "label": "En línea fast comida order",
    "value": "/animations/online-fast-food-order-illustration-2025-10-20-06-01-38-utc.json"
  },
  {
    "label": "En línea grocery pago app",
    "value": "/animations/online-grocery-payment-app-illustration-2025-10-20-05-59-09-utc.json"
  },
  {
    "label": "En línea grocery store comprando on mobile app",
    "value": "/animations/online-grocery-store-shopping-on-mobile-app-2025-10-20-05-59-28-utc.json"
  },
  {
    "label": "En línea comprando cart with box",
    "value": "/animations/online-shopping-cart-with-box-illustration-2025-10-20-02-32-54-utc.json"
  },
  {
    "label": "En línea store  with pago tarjeta",
    "value": "/animations/online-store-illustration-with-payment-card-2025-10-20-06-01-27-utc.json"
  },
  {
    "label": "En línea vegetable market",
    "value": "/animations/online-vegetable-market-illustration-2025-10-20-04-29-10-utc.json"
  },
  {
    "label": "Order status",
    "value": "/animations/order-status-cartoon-illustration-2025-10-20-03-17-17-utc.json"
  },
  {
    "label": "Pago rejection",
    "value": "/animations/payment-rejection-illustration-2025-10-20-03-06-09-utc.json"
  },
  {
    "label": "Pago verification  with phone and c",
    "value": "/animations/payment-verification-illustration-with-phone-and-c-2025-10-20-03-11-10-utc.json"
  },
  {
    "label": "Piggy bank with coins",
    "value": "/animations/piggy-bank-with-coins-cartoon-illustration-2025-10-20-04-28-14-utc.json"
  },
  {
    "label": "Pin code",
    "value": "/animations/pin-code-animation-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Product box",
    "value": "/animations/product-box-cartoon-style-illustration-2025-10-20-03-14-16-utc.json"
  },
  {
    "label": "Rejected resume",
    "value": "/animations/rejected-resume-cartoon-illustration-2025-10-20-04-34-46-utc.json"
  },
  {
    "label": "Remote work global connectivity and productivity",
    "value": "/animations/remote-work-global-connectivity-and-productivity-2025-10-20-06-00-28-utc.json"
  },
  {
    "label": "Resume rejection",
    "value": "/animations/resume-rejection-cartoon-illustration-2025-10-20-05-58-21-utc.json"
  },
  {
    "label": "Secure financial app",
    "value": "/animations/secure-financial-app-illustration-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "September first  school day",
    "value": "/animations/september-first-cartoon-school-day-illustration-2025-10-20-04-32-45-utc.json"
  },
  {
    "label": "Comprando bags and box",
    "value": "/animations/shopping-bags-and-box-animation-2025-10-20-06-00-40-utc.json"
  },
  {
    "label": "Comprando cart with gifts",
    "value": "/animations/shopping-cart-with-gifts-illustration-2025-10-20-06-00-43-utc.json"
  },
  {
    "label": "Signing contract  in",
    "value": "/animations/signing-contract-illustration-in-cartoon-style-2025-10-20-04-33-46-utc.json"
  },
  {
    "label": "Special offer",
    "value": "/animations/special-offer-cartoon-illustration-2025-10-20-02-27-52-utc.json"
  },
  {
    "label": "Startup launch",
    "value": "/animations/startup-launch-cartoon-illustration-2025-10-20-03-17-17-utc.json"
  },
  {
    "label": "Stationary bike exercise",
    "value": "/animations/stationary-bike-exercise-animation-2025-10-20-06-25-36-utc.json"
  },
  {
    "label": "Students studying with books and tablets illustrat",
    "value": "/animations/students-studying-with-books-and-tablets-illustrat-2025-10-20-04-28-19-utc.json"
  },
  {
    "label": "Successful seo   with character",
    "value": "/animations/successful-seo-cartoon-illustration-with-character-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Target focus",
    "value": "/animations/target-focus-cartoon-illustration-2025-10-20-04-28-10-utc.json"
  },
  {
    "label": "Target idea bulb",
    "value": "/animations/target-idea-bulb-illustration-2025-10-20-03-15-58-utc.json"
  },
  {
    "label": "Equipo collaboration and presentation meeting",
    "value": "/animations/team-collaboration-and-presentation-meeting-2025-10-20-05-59-13-utc.json"
  },
  {
    "label": "Teamwork building resources letter tiles",
    "value": "/animations/teamwork-building-resources-letter-tiles-animation-2025-10-20-06-18-34-utc.json"
  },
  {
    "label": "Teamwork word building with diverse hands",
    "value": "/animations/teamwork-word-building-with-diverse-hands-2025-10-20-06-00-44-utc.json"
  },
  {
    "label": "Time for coffee break  icon",
    "value": "/animations/time-for-coffee-break-animated-icon-2025-10-20-06-00-36-utc.json"
  },
  {
    "label": "Viaje gear  in",
    "value": "/animations/travel-gear-illustration-in-cartoon-style-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Viaje guide  for adventure theme",
    "value": "/animations/travel-guide-illustration-for-adventure-theme-2025-10-20-03-17-15-utc.json"
  },
  {
    "label": "Viaje schedule",
    "value": "/animations/travel-schedule-cartoon-illustration-2025-10-20-02-21-50-utc.json"
  },
  {
    "label": "Twenty four seven en línea comprando",
    "value": "/animations/twenty-four-seven-online-shopping-illustration-2025-10-20-06-00-27-utc.json"
  },
  {
    "label": "Two colorful gift boxes",
    "value": "/animations/two-colorful-gift-boxes-illustration-2025-10-20-06-00-37-utc.json"
  },
  {
    "label": "Ufo abduction beam with alien pilot",
    "value": "/animations/ufo-abduction-beam-with-alien-pilot-2025-10-20-06-02-27-utc.json"
  },
  {
    "label": "Vacant oficina chair  in",
    "value": "/animations/vacant-office-chair-illustration-in-cartoon-style-2025-10-20-06-00-43-utc.json"
  },
  {
    "label": "Verified entrega",
    "value": "/animations/verified-delivery-illustration-2025-10-20-04-28-21-utc.json"
  },
  {
    "label": "Virtual market en línea comprando",
    "value": "/animations/virtual-market-online-shopping-animation-2025-10-20-06-26-38-utc.json"
  },
  {
    "label": "We are hiring  with  people",
    "value": "/animations/we-are-hiring-illustration-with-cartoon-people-2025-10-20-05-59-05-utc.json"
  },
  {
    "label": "Mujer adding items to en línea comprando cart animati",
    "value": "/animations/woman-adding-items-to-online-shopping-cart-animati-2025-10-20-06-07-44-utc.json"
  },
  {
    "label": "Mujer doing ball balance workout",
    "value": "/animations/woman-doing-ball-balance-workout-2025-10-20-06-00-38-utc.json"
  },
  {
    "label": "Mujer doing mat workout exercise",
    "value": "/animations/woman-doing-mat-workout-exercise-animation-2025-10-20-06-00-28-utc.json"
  },
  {
    "label": "Mujer drinking cocktail at cafe",
    "value": "/animations/woman-drinking-cocktail-at-cafe-animation-2025-10-20-03-06-07-utc.json"
  },
  {
    "label": "Mujer meditating in lotus position  illustr",
    "value": "/animations/woman-meditating-in-lotus-position-cartoon-illustr-2025-10-20-03-14-14-utc.json"
  },
  {
    "label": "Mujer comprando for groceries en línea",
    "value": "/animations/woman-shopping-for-groceries-online-2025-10-20-06-01-30-utc.json"
  },
  {
    "label": "Mujer comprando en línea via mobile app",
    "value": "/animations/woman-shopping-online-via-mobile-app-illustration-2025-10-20-06-02-30-utc.json"
  },
  {
    "label": "Mujer using hairspray in workplace",
    "value": "/animations/woman-using-hairspray-in-workplace-animation-2025-10-20-03-14-13-utc.json"
  },
  {
    "label": "Mujer with comprando cart full of comida",
    "value": "/animations/woman-with-shopping-cart-full-of-food-2025-10-20-05-59-35-utc.json"
  }
]

const DEFAULT_BANNER: GlobalBannerConfig = {
    space_type: 'all',
    title: 'Nuevo Banner',
    description: ['Ingresa tu primer mensaje dinámico'],
    cta_text: '',
    cta_url: '',
    media_type: 'json_lottie',
    media_url: '',
    layout_pos: 'right',
    theme: 'brand_primary',
    is_active: false
}

export function GlobalBannersManager() {
    const [banners, setBanners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // El banner que estamos editando en el formulario
    const [formData, setFormData] = useState<GlobalBannerConfig>(DEFAULT_BANNER)
    const [isPristine, setIsPristine] = useState(true)

    useEffect(() => {
        loadBanners()
    }, [])

    const loadBanners = async () => {
        setLoading(true)
        const data = await getGlobalBanners()
        setBanners(data)
        setLoading(false)
    }

    const handleSelectBanner = (bannerId: string) => {
        if (bannerId === "new") {
            setFormData(DEFAULT_BANNER)
            setIsPristine(false)
            return
        }
        const found = banners.find(b => b.id === bannerId)
        if (found) {
            let desc = found.description
            if (typeof desc === 'string') {
                desc = [desc]
            }
            setFormData({ ...found, description: desc || [''] })
            setIsPristine(false)
        }
    }

    const handleSave = async () => {
        if (!formData.title || !formData.space_type) {
            toast.error("El Título y Space Type son obligatorios")
            return
        }

        // Limpiar descripciones vacías
        const cleanDescriptions = (Array.isArray(formData.description) ? formData.description : [formData.description])
            .filter((d: string) => d.trim() !== "")

        if (cleanDescriptions.length === 0) {
            toast.error("Debes agregar al menos una línea de descripción")
            return
        }

        setSaving(true)
        const payload = {
            ...formData,
            description: cleanDescriptions
        }

        const res = await upsertGlobalBanner(payload)
        if (res.success) {
            toast.success("Banner guardado exitosamente")
            await loadBanners()
            // Recargar datos actualizados al form
            if ('data' in res && res.data) {
                setFormData({ ...(res.data as any), description: cleanDescriptions })
            }
        } else {
            toast.error(res.error || "Error al guardar el banner")
        }
        setSaving(false)
    }

    const handleToggleActive = async (banner: any) => {
        const res = await toggleBannerActive(banner.id, banner.space_type, !banner.is_active)
        if (res.success) {
            toast.success(`Banner ${!banner.is_active ? 'activado' : 'desactivado'}`)
            await loadBanners()
            if (formData.id === banner.id) {
                setFormData(prev => ({ ...prev, is_active: !banner.is_active }))
            }
        } else {
            toast.error("Error al actualizar estado")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este banner permanentemente?")) return
        const res = await deleteGlobalBanner(id)
        if (res.success) {
            toast.success("Banner eliminado")
            if (formData.id === id) setFormData(DEFAULT_BANNER)
            loadBanners()
        } else {
            toast.error("Error al eliminar")
        }
    }

    // Handlers para el array dinámico de Textos
    const addTip = () => {
        const currentTips = Array.isArray(formData.description) ? formData.description : [formData.description]
        setFormData({ ...formData, description: [...currentTips, ""] })
    }

    const updateTip = (index: number, value: string) => {
        const currentTips = Array.isArray(formData.description) ? [...formData.description] : [formData.description as string]
        currentTips[index] = value
        setFormData({ ...formData, description: currentTips })
    }

    const removeTip = (index: number) => {
        const currentTips = Array.isArray(formData.description) ? [...formData.description] : [formData.description as string]
        currentTips.splice(index, 1)
        if (currentTips.length === 0) currentTips.push("") // Mantener al menos 1
        setFormData({ ...formData, description: currentTips })
    }

    if (loading && banners.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const tipsArray = Array.isArray(formData.description) ? formData.description : [formData.description as string]

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Gestor de Banners Globales</h2>
                    <p className="text-muted-foreground text-sm">Escoge un banner para editar y previsualiza los cambios en tiempo real.</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select
                        value={formData.id || (isPristine ? "" : "new")}
                        onValueChange={handleSelectBanner}
                    >
                        <SelectTrigger className="w-full md:w-[280px]">
                            <SelectValue placeholder="Seleccionar un banner para editar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new" className="font-bold text-primary">
                                <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Crear Nuevo Banner</span>
                            </SelectItem>
                            {banners.map(b => (
                                <SelectItem key={b.id} value={b.id}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${b.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className="truncate">{b.title} ({b.space_type})</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {formData.id && (
                        <Button variant="outline" size="icon" className="text-red-500 hover:bg-red-50 border-red-200" onClick={() => handleDelete(formData.id!)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* COLUMNA IZQUIERDA: EDITOR (5 columnas) */}
                <div className="xl:col-span-5 flex flex-col gap-6">
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-slate-50 dark:bg-zinc-900 border-b pb-4">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Edit2 className="h-4 w-4 text-primary" />
                                    {formData.id ? 'Editando Banner' : 'Configuración de Nuevo Banner'}
                                </span>
                                {formData.id && (
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={() => handleToggleActive(formData)}
                                    />
                                )}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-0">
                            {/* SECCIÓN 1: IDENTIFICACIÓN */}
                            <div className="p-5 space-y-4 border-b">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Target className="h-3 w-3" /> Entorno y Red
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Título Principal</Label>
                                        <Input
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="font-semibold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Inyectar en (Space Type)</Label>
                                        <Select value={formData.space_type} onValueChange={(v) => setFormData({ ...formData, space_type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Global (Todos los Dashboards)</SelectItem>
                                                <SelectItem value="platform">Plataforma (Ej: Pixy Agency)</SelectItem>
                                                <SelectItem value="agency">Agency / B2B</SelectItem>
                                                <SelectItem value="resto">Restaurantes</SelectItem>
                                                <SelectItem value="cleaning">Limpieza y Servicios</SelectItem>
                                                <SelectItem value="reseller">Resellers</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">Nota: Solo puede haber un banner activo "agencia", "resto", etc a la vez.</p>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: TEXTOS DINÁMICOS */}
                            <div className="p-5 space-y-4 border-b bg-slate-50/50 dark:bg-black/10">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <LayoutTemplate className="h-3 w-3" /> Textos Animados (Fade-in)
                                </h3>
                                <p className="text-xs text-muted-foreground mb-2">Agrega líneas de texto que rotarán mágicamente cada 8 segundos.</p>

                                <div className="space-y-3">
                                    {tipsArray.map((tip, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Textarea
                                                value={tip}
                                                onChange={(e) => updateTip(idx, e.target.value)}
                                                placeholder={`Línea u oración (presiona Enter para salto de línea) ${idx + 1}...`}
                                                className="text-sm min-h-[60px]"
                                            />
                                            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => removeTip(idx)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addTip} className="w-full mt-2 border-dashed">
                                        <Plus className="h-3 w-3 mr-2" /> Agregar Nueva Línea de Texto
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Botón - Texto</Label>
                                        <Input
                                            placeholder="Opcional. Ej: Saber más"
                                            value={formData.cta_text || ''}
                                            onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Botón - URL</Label>
                                        <Input
                                            placeholder="https://..."
                                            value={formData.cta_url || ''}
                                            onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 3: MEDIA & UX */}
                            <div className="p-5 space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <ImageIcon className="h-3 w-3" /> Apariencia y Multimedia
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Tema (Variación de Fondo)</Label>
                                        <Select value={formData.theme} onValueChange={(v: any) => setFormData({ ...formData, theme: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="brand_primary">Marca Primario</SelectItem>
                                                <SelectItem value="brand_secondary">Marca Secundario</SelectItem>
                                                <SelectItem value="dark">Dark (Vidrio)</SelectItem>
                                                <SelectItem value="light">Light (Sólido)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Alineación de Media</Label>
                                        <Select value={formData.layout_pos} onValueChange={(v: any) => setFormData({ ...formData, layout_pos: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="right">A la Derecha</SelectItem>
                                                <SelectItem value="left">A la Izquierda</SelectItem>
                                                <SelectItem value="center">Imagen de Fondo (Marca de Agua)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Animación / Imagen</Label>
                                        <Select
                                            value={formData.media_type}
                                            onValueChange={(v) => {
                                                setFormData({ ...formData, media_type: v, media_url: '' })
                                            }}
                                        >
                                            <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="json_lottie">Lottie 3D (JSON)</SelectItem>
                                                <SelectItem value="image">URL de Imagen</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.media_type === 'json_lottie' ? (
                                        <Select
                                            value={ANIMATIONS.some(a => a.value === formData.media_url) ? formData.media_url : (formData.media_url ? "custom" : "")}
                                            onValueChange={(v) => {
                                                if (v !== "custom") {
                                                    setFormData({ ...formData, media_url: v })
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una animación Lottie de la biblioteca" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ANIMATIONS.map(anim => (
                                                    <SelectItem key={anim.value} value={anim.value}>{anim.label}</SelectItem>
                                                ))}
                                                <SelectItem value="custom" disabled className="text-muted-foreground italic">Cargado via campo customizado (abajo)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            placeholder="Pega la URL pública de la imagen (JPG, PNG, GIF)"
                                            value={formData.media_url || ''}
                                            onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50 dark:bg-zinc-900 border-t py-4 flex justify-between items-center rounded-b-xl">
                            {!formData.id && (
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active-new"
                                        checked={formData.is_active}
                                        onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                                    />
                                    <Label htmlFor="active-new" className="text-xs cursor-pointer">Publicar Inmediato</Label>
                                </div>
                            )}
                            <div className="flex-1 flex justify-end">
                                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Guardar Cambios
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                {/* COLUMNA DERECHA: PREVIEW (7 columnas), Fixed o Sticky para que siempe se vea */}
                <div className="xl:col-span-7 sticky top-6">
                    <Card className="border-0 shadow-none bg-transparent">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Globe className="h-4 w-4 text-brand-cyan" />
                                Renderización en Tiempo Real
                            </h3>
                            <Badge variant="outline" className="bg-white/50 dark:bg-black/50 backdrop-blur">
                                {formData.space_type?.toUpperCase() || 'ALL'}
                            </Badge>
                        </div>

                        <div className="bg-slate-100 dark:bg-black/20 p-2 sm:p-6 lg:p-10 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 shadow-inner min-h-[400px] flex items-center justify-center relative overflow-hidden">
                            {/* Revestimiento que marca que es un canvas simulado */}
                            <div className="absolute top-4 left-4 text-xs font-mono text-muted-foreground flex items-center gap-1 opacity-50 z-0">
                                <LayoutTemplate className="w-3 h-3" /> Dashboard Slot (Responsive Frame)
                            </div>

                            <div className="w-full max-w-5xl z-10 transition-all duration-300">
                                <GlobalDashboardBanner config={{ ...formData, is_active: true }} />
                            </div>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            Los colores `Brand Primary` y `Brand Secondary` se renderizan utilizando los códigos de color dinámicos injectados por la organización actualmente autenticada en su navegador.
                        </p>
                    </Card>
                </div>

            </div>
        </div>
    )
}
