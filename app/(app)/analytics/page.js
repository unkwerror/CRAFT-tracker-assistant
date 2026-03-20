export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-display font-semibold mb-6">Аналитика</h1>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-craft-accent/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-craft-accent/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18M7 16l4-4 4 4 5-6" />
          </svg>
        </div>
        <h2 className="text-sm font-display font-medium text-white/70 mb-2">
          Раздел в разработке
        </h2>
        <p className="text-xs text-craft-muted max-w-xs">
          ECharts-визуализации, ML-скоринг, прогнозы и сегментация — Phase 3
        </p>
      </div>
    </div>
  );
}
