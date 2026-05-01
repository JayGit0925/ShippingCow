import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

export default async function SiloPage() {
  const supabase = createServerClient();
  const { data: silos } = await supabase
    .from('silo_files')
    .select('id, filename, schema_type, row_count, generated_by_mooovy, uploaded_at')
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  const { count: shipmentCount } = await supabase
    .from('shipments').select('*', { count: 'exact', head: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Silo</h1>
          <p className="text-sm text-gray-600 mt-1">
            {(silos ?? []).length} canonical file{silos?.length === 1 ? '' : 's'} · {shipmentCount ?? 0} shipments total
          </p>
        </div>
        <Link href="/upload" className="bg-blue-600 text-white px-4 py-2 rounded font-medium">
          Upload more
        </Link>
      </div>

      {!silos || silos.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center text-gray-500 bg-white">
          <p className="text-lg">Silo is empty.</p>
          <p className="text-sm mt-2">
            Upload a CSV or XLSX of shipments to get started.{' '}
            <Link href="/upload" className="text-blue-600 underline">Upload now</Link>
          </p>
        </div>
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">File</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Rows</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {silos.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{s.filename}</td>
                  <td className="px-3 py-2 text-gray-600">{s.schema_type}</td>
                  <td className="px-3 py-2 text-right">{s.row_count}</td>
                  <td className="px-3 py-2 text-gray-600">{s.generated_by_mooovy ? 'Mooovy' : 'Direct'}</td>
                  <td className="px-3 py-2 text-gray-600">{new Date(s.uploaded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
