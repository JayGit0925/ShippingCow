import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createServerClient();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome to ShippingCow. Your analytics will appear here once you upload shipment data.
      </p>
      <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <div className="mx-auto max-w-lg">
          <h3 className="text-lg font-semibold text-gray-700">Connect your shipment data to see your audit</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload 90 days of shipment data and get a real cost audit in 90 seconds.
            We compare your current costs against ShippingCow&apos;s negotiated rates.
          </p>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left">
            <p className="text-xs font-medium text-gray-500 uppercase">Preview — what you&apos;ll see</p>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="rounded-md bg-white p-3 shadow-sm"><p className="text-xs text-gray-400">Annual savings</p><p className="text-xl font-bold text-gray-300">$—</p></div>
              <div className="rounded-md bg-white p-3 shadow-sm"><p className="text-xs text-gray-400">Dim overcharge</p><p className="text-xl font-bold text-gray-300">—%</p></div>
              <div className="rounded-md bg-white p-3 shadow-sm"><p className="text-xs text-gray-400">Avg zone</p><p className="text-xl font-bold text-gray-300">—</p></div>
            </div>
          </div>
          <button className="mt-6 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            style={{ backgroundColor: '#0052C9' }}>
            Upload shipment data
          </button>
        </div>
      </div>
    </div>
  );
}
