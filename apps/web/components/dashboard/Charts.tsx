'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';

const PALETTE = ['#0052C9', '#FEB81B', '#2F855A', '#C53030', '#6B46C1', '#0E7490', '#D97706', '#1A202C'];

export function SpendByCarrierChart({ data }: { data: Array<{ carrier: string; spend: number }> }) {
  return (
    <div className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
      <h3 className="font-bold uppercase text-sm tracking-wide mb-3">Spend by Carrier</h3>
      {data.length === 0 ? (
        <EmptyState>No carrier data yet.</EmptyState>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="carrier" stroke="#1A202C" fontSize={11} />
            <YAxis stroke="#1A202C" fontSize={11} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={((v: number) => `$${v.toFixed(2)}`) as never} />
            <Bar dataKey="spend" fill="#0052C9" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function SpendByZoneChart({ data }: { data: Array<{ zone: number; spend: number; shipments: number }> }) {
  return (
    <div className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
      <h3 className="font-bold uppercase text-sm tracking-wide mb-3">Spend by Zone</h3>
      {data.length === 0 ? (
        <EmptyState>No zone data yet.</EmptyState>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="zone" stroke="#1A202C" fontSize={11} tickFormatter={(z) => `Z${z}`} />
            <YAxis stroke="#1A202C" fontSize={11} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={((v: number) => `$${v.toFixed(2)}`) as never} />
            <Bar dataKey="spend" fill="#FEB81B" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function SpendByDayChart({ data }: { data: Array<{ date: string; spend: number }> }) {
  return (
    <div className="border-2 rounded-xl p-4 bg-white col-span-2" style={{ borderColor: '#1A202C' }}>
      <h3 className="font-bold uppercase text-sm tracking-wide mb-3">Spend Over Time</h3>
      {data.length === 0 ? (
        <EmptyState>Upload shipments to see your spend trend.</EmptyState>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="2 2" stroke="#E2E8F0" />
            <XAxis dataKey="date" stroke="#1A202C" fontSize={11} />
            <YAxis stroke="#1A202C" fontSize={11} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={((v: number) => `$${v.toFixed(2)}`) as never} />
            <Line type="monotone" dataKey="spend" stroke="#0052C9" strokeWidth={2} dot={{ fill: '#0052C9', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function TopDestinationStatesChart({ data }: { data: Array<{ state: string; shipments: number }> }) {
  return (
    <div className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
      <h3 className="font-bold uppercase text-sm tracking-wide mb-3">Top Destination States</h3>
      {data.length === 0 ? (
        <EmptyState>No destinations yet.</EmptyState>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="shipments" nameKey="state" cx="50%" cy="50%" outerRadius={70} label={((e: { state: string }) => e.state) as never}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function TopOverchargeSkus({ data }: { data: Array<{ sku: string; overcharge: number; shipments: number }> }) {
  return (
    <div className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
      <h3 className="font-bold uppercase text-sm tracking-wide mb-3">SKUs Bleeding Cash</h3>
      {data.length === 0 ? (
        <EmptyState>No SKU data yet.</EmptyState>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase">
            <tr><th className="text-left pb-1">SKU</th><th className="text-right pb-1">Overcharge</th><th className="text-right pb-1">#</th></tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.sku} className="border-t">
                <td className="py-1 font-mono">{row.sku}</td>
                <td className="py-1 text-right text-red-700 font-semibold">${row.overcharge.toFixed(2)}</td>
                <td className="py-1 text-right text-gray-600">{row.shipments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center h-44 text-sm text-gray-400 italic">
      {children}
    </div>
  );
}
