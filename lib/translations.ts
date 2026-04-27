export const translations = {
  en: {
    // Core terms
    market: "Market",
    competitor: "Competitor",
    fee: "Fee",
    promo: "Promo",
    noData: "No data",

    // Header
    lastUpdate: "Last update",
    refresh: "Refresh",
    refreshing: "Refreshing…",

    // Sidebar
    marketsLabel: "Markets",
    allMarkets: "All Markets",
    activePromosLabel: "Active Promos",
    active: "Active",
    noActivePromosNav: "✅ No active promos",
    analysisLabel: "Analysis",
    promoInsights: "Promo Insights",

    // StatsCards
    marketsTracked: "Markets Tracked",
    competitors: "Competitors",
    productComparisons: "product comparisons",
    winning: "Winning",
    ofTrackedComparisons: "of tracked comparisons",
    activePromos: "Active Promos",
    noActivePromotions: "No active promotions",

    // PromoAlerts
    noActivePromosNow: "No active promotions at the moment.",

    // MarketTable column headers
    product: "Product",
    status: "Status",
    baseDelta: "Base ∆",
    promoImpact: "Promo Impact",
    promoDelta: "Promo ∆",

    // Monitor filters
    allCompetitors: "All Competitors",
    allProducts: "All Products",
    allStatuses: "All Statuses",
    allPromos: "All Promos",
    allPromoTypes: "All Promo Types",
    filterWinning: "Winning",
    filterLosing: "Losing",
    filterActivePromo: "Active Promo",
    filterNoPromo: "No Promo",
    clearFilters: "Clear filters",

    // Monitor section labels & legend
    activeCompetitorPromos: "Active Competitor Promotions",
    legendWinning: "Winning",
    legendLosing: "Losing",

    // Monitor loading / empty states
    loadingData: "Loading data…",
    noMatchFilters: "No products match the applied filters.",
    noMonitorData: "No data available in the Monitor sheet.",
    noDataCheckUrl: "No data available. Check the Google Sheet URL.",

    // Toast messages
    errorLoadMonitor: "Error loading monitor",
    errorLoadPromo: "Error loading Promo Raw",
    dataRefreshed: "Data updated",

    // Insights period tabs
    lastWeek: "Last week",
    last15Days: "Last 15 days",
    lastMonth: "Last month",
    allHistory: "All history",

    // Insights buttons
    reanalyze: "Re-analyze",

    // Insights loading / error
    loadingPromos: "Loading promo data…",
    errorLoadingPromoRaw: "Error loading Promo Raw",

    // Insights empty states
    noMatchPromos: "No promos match the applied filters.",
    noPromoRawData: "No data found in Promo Raw.",

    // Insights KPI cards
    promosRegistered: "Promos recorded",
    inAllHistory: "in all history",
    inLastWeek: "in the last week",
    activeCompetitors: "Active competitors",
    mostAttackedProduct: "Most targeted product",
    mostActiveMarket: "Most active market",

    // Insights weekly summary
    weeklyReport: "Weekly Intelligence Report",
    last7Days: "last 7 days",
    generatingWeeklyReport: "Generating weekly report…",
    executiveSummary: "Executive Summary",
    keyCompetitorMoves: "Key Competitor Moves",
    marketsUnderPressure: "Markets Under Pressure",
    targetUserHypothesis: "Target User Hypothesis",
    strategicIntentHypothesis: "Strategic Intent Hypothesis",
    implicationsForAirtm: "Implications for Airtm",
    recommendedActions: "Recommended Actions",
    dataLimitations: "Data Limitations",
    insufficientData: "Insufficient data.",

    // Insights AI cards
    analyzing: "Analyzing…",
    aiUnavailable: "AI analysis unavailable",
    productFocus: "Product Focus",
    strategicIntent: "Strategic Intent",
    targetUserProfile: "Target User Profile",
    strategyImplications: "Implications for Our Strategy",

    // Insights bar charts
    promosByProduct: "Promos by Product",
    promosByCompetitor: "Promos by Competitor",

    // Insights history table
    promoHistory: "Promotion History",
    date: "Date",
    description: "Description",
    promoType: "Promo Type",
    activeStatus: "Active",
    endedStatus: "Ended",

    // Parameterized strings (functions)
    comparisonsAvailable: (n: number) =>
      `${n} comparisons available — try adjusting the filters.`,
    inLastNDays: (n: number) => `in the last ${n} days`,
    times: (n: number) => `${n} times`,
    promoCount: (n: number) => `${n} promos`,
    recordCount: (n: number) => `${n} records`,
    promosAvailable: (n: number) =>
      `${n} promos available — try adjusting or removing a filter.`,
  },

  es: {
    // Core terms
    market: "Mercado",
    competitor: "Competidor",
    fee: "Comisión",
    promo: "Promoción",
    noData: "Sin datos",

    // Header
    lastUpdate: "Última actualización",
    refresh: "Actualizar",
    refreshing: "Actualizando…",

    // Sidebar
    marketsLabel: "Mercados",
    allMarkets: "Todos los mercados",
    activePromosLabel: "Promos activas",
    active: "Activas",
    noActivePromosNav: "✅ Sin promos activas",
    analysisLabel: "Análisis",
    promoInsights: "Insights de Promos",

    // StatsCards
    marketsTracked: "Mercados monitoreados",
    competitors: "Competidores",
    productComparisons: "comparaciones de producto",
    winning: "Ganando",
    ofTrackedComparisons: "de comparaciones rastreadas",
    activePromos: "Promos activas",
    noActivePromotions: "Sin promociones activas",

    // PromoAlerts
    noActivePromosNow: "No hay promociones activas en este momento.",

    // MarketTable column headers
    product: "Producto",
    status: "Estado",
    baseDelta: "∆ Base",
    promoImpact: "Impacto Promo",
    promoDelta: "∆ Promo",

    // Monitor filters
    allCompetitors: "Todos los competidores",
    allProducts: "Todos los productos",
    allStatuses: "Todos los estados",
    allPromos: "Todas las promos",
    allPromoTypes: "Todos los tipos de promo",
    filterWinning: "Ganando",
    filterLosing: "Perdiendo",
    filterActivePromo: "Promo activa",
    filterNoPromo: "Sin promo",
    clearFilters: "Limpiar filtros",

    // Monitor section labels & legend
    activeCompetitorPromos: "Promociones activas de competidores",
    legendWinning: "Ganando",
    legendLosing: "Perdiendo",

    // Monitor loading / empty states
    loadingData: "Cargando datos…",
    noMatchFilters: "No hay productos que coincidan con los filtros aplicados.",
    noMonitorData: "No hay datos disponibles en el sheet de Monitor.",
    noDataCheckUrl: "No hay datos disponibles. Verifica la URL del Google Sheet.",

    // Toast messages
    errorLoadMonitor: "Error al cargar monitor",
    errorLoadPromo: "Error al cargar Promo Raw",
    dataRefreshed: "Datos actualizados",

    // Insights period tabs
    lastWeek: "Última semana",
    last15Days: "Últimos 15 días",
    lastMonth: "Último mes",
    allHistory: "Todo el historial",

    // Insights buttons
    reanalyze: "Re-analizar",

    // Insights loading / error
    loadingPromos: "Cargando datos de promos…",
    errorLoadingPromoRaw: "Error al cargar Promo Raw",

    // Insights empty states
    noMatchPromos: "No hay promos que coincidan con los filtros aplicados.",
    noPromoRawData: "No se encontraron datos en Promo Raw.",

    // Insights KPI cards
    promosRegistered: "Promos registradas",
    inAllHistory: "en todo el historial",
    inLastWeek: "en la última semana",
    activeCompetitors: "Competidores activos",
    mostAttackedProduct: "Producto más atacado",
    mostActiveMarket: "Mercado más activo",

    // Insights weekly summary
    weeklyReport: "Weekly Intelligence Report",
    last7Days: "últimos 7 días",
    generatingWeeklyReport: "Generando reporte semanal…",
    executiveSummary: "Executive Summary",
    keyCompetitorMoves: "Key Competitor Moves",
    marketsUnderPressure: "Markets Under Pressure",
    targetUserHypothesis: "Target User Hypothesis",
    strategicIntentHypothesis: "Strategic Intent Hypothesis",
    implicationsForAirtm: "Implications for Airtm",
    recommendedActions: "Recommended Actions",
    dataLimitations: "Data Limitations",
    insufficientData: "Sin datos suficientes.",

    // Insights AI cards
    analyzing: "Analizando…",
    aiUnavailable: "AI analysis unavailable",
    productFocus: "Foco de Producto",
    strategicIntent: "Intención Estratégica",
    targetUserProfile: "Perfil de Usuario Objetivo",
    strategyImplications: "Implicaciones para Nuestra Estrategia",

    // Insights bar charts
    promosByProduct: "Promos por Producto",
    promosByCompetitor: "Promos por Competidor",

    // Insights history table
    promoHistory: "Historial de Promociones",
    date: "Fecha",
    description: "Descripción",
    promoType: "Tipo de Promo",
    activeStatus: "Activa",
    endedStatus: "Finalizada",

    // Parameterized strings (functions)
    comparisonsAvailable: (n: number) =>
      `${n} comparaciones disponibles — prueba ajustando los filtros.`,
    inLastNDays: (n: number) => `en los últimos ${n} días`,
    times: (n: number) => `${n} veces`,
    promoCount: (n: number) => `${n} promos`,
    recordCount: (n: number) => `${n} registros`,
    promosAvailable: (n: number) =>
      `${n} promos disponibles — prueba ajustando o eliminando algún filtro.`,
  },
};

export type Lang = keyof typeof translations;
export type Translation = (typeof translations)[Lang];
