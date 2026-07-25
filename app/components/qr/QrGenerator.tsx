'use client';

import { useState } from 'react';
import { QrCode, Copy, Check, Download, ExternalLink } from 'lucide-react';

interface QrGeneratorProps {
  campaignId?: string;
  storeId?: string;
}

export default function QrGenerator({ campaignId, storeId }: QrGeneratorProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!storeId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          campaignId: campaignId || null,
          type: campaignId ? 'review' : 'website',
          label: label || `캠페인 ${campaignId ? `#${campaignId.slice(-6)}` : ''}`,
          targetUrl: campaignId ? `/ad?campaign=${campaignId}` : '/',
        }),
      });
      const json = await res.json();
      if (json.success) {
        const trackingUrl = `${window.location.origin}/qr/${json.data.id}`;
        setQrUrl(trackingUrl);
        setQrId(json.data.id);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (qrUrl) {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${qrId || 'code'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <QrCode size={18} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">QR 코드 생성</h3>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">라벨 (선택)</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="예: 강남점 광고 QR"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <button
        onClick={handleCreate}
        disabled={creating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
      >
        {creating ? '생성 중...' : <><QrCode size={16} /> QR 코드 생성</>}
      </button>

      {qrUrl && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-center rounded-xl bg-gray-50 p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`}
              alt="QR Code"
              className="h-36 w-36"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <input
              type="text"
              readOnly
              value={qrUrl}
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-600 outline-none"
            />
            <button onClick={handleCopy} className="shrink-0 rounded-md p-1.5 hover:bg-gray-200 transition-colors">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={14} /> SVG 다운로드
            </button>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink size={14} /> 미리보기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}