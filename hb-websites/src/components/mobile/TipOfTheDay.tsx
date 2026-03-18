'use client';

import { useState, useEffect } from 'react';

interface TipOfTheDayProps {
  locale: string;
}

const LABELS: Record<string, Record<string, string>> = {
  title: { nl: 'TIP VAN DE DAG', en: 'TIP OF THE DAY', de: 'TIPP DES TAGES', es: 'CONSEJO DEL DÍA' },
};

export default function TipOfTheDay({ locale }: TipOfTheDayProps) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/holibot/daily-tip?language=${locale}`);
        const data = await res.json();
        // Backend returns tip as data.tip or data.data.tip or string
        const tipText = data?.tip || data?.data?.tip || data?.data?.text || data?.text || null;
        if (tipText && typeof tipText === 'string') {
          setTip(tipText);
        }
      } catch (err) {
        console.error('TipOfTheDay load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  if (loading) {
    return (
      <div className="mx-4 rounded-2xl p-4 md:hidden animate-pulse" style={{ backgroundColor: 'rgba(232,197,71,0.12)' }}>
        <div className="h-4 w-32 bg-yellow-200/50 rounded mb-2" />
        <div className="h-3 w-full bg-yellow-200/50 rounded mb-1" />
        <div className="h-3 w-3/4 bg-yellow-200/50 rounded" />
      </div>
    );
  }

  if (!tip) return null;

  return (
    <div
      className="mx-4 rounded-2xl p-4 md:hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(232,197,71,0.18), rgba(232,197,71,0.06))',
        border: '1px solid rgba(232,197,71,0.28)',
      }}
    >
      <p className="text-xs font-bold tracking-wider text-amber-700 mb-1.5">
        💡 {t('title')}
      </p>
      <p className="text-sm text-gray-800 leading-relaxed">{tip}</p>
    </div>
  );
}
