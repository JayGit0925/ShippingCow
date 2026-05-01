'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

type Topology = { objects: Record<string, unknown> };
type Feature = { type: string; geometry: unknown; properties: { name: string } };

// State name → centroid lat/lng (subset of common dest states)
const STATE_CENTROID: Record<string, [number, number]> = {
  NY: [-74.5, 42.9], CA: [-119.4, 36.7], TX: [-99.9, 31.0], GA: [-83.4, 32.5],
  IL: [-89.4, 40.0], WA: [-120.7, 47.4], FL: [-81.5, 27.8], NJ: [-74.5, 40.2],
  PA: [-77.6, 40.9], OH: [-82.9, 40.4], NC: [-79.4, 35.6], MI: [-84.5, 44.3],
  Other: [-98.6, 39.8],
};

const ZIP3_TO_LATLNG: Record<string, [number, number]> = {
  '089': [-74.45, 40.49],  // NJ
  '917': [-117.65, 34.07], // CA
  '774': [-95.54, 29.62],  // TX
};

interface Props {
  warehouses: Array<{ name: string; zip: string; city: string | null; state: string | null }>;
  topStates: Array<{ state: string; shipments: number }>;
}

export function ZoningMap({ warehouses, topStates }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [usMap, setUsMap] = useState<Topology | null>(null);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then((r) => r.json())
      .then(setUsMap)
      .catch(() => setUsMap(null));
  }, []);

  useEffect(() => {
    if (!usMap || !ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const width = 900, height = 540;
    const proj = d3.geoAlbersUsa().scale(1100).translate([width / 2, height / 2]);
    const path = d3.geoPath(proj);

    const states = feature(usMap as never, usMap.objects.states as never) as unknown as { features: Feature[] };

    // States layer
    svg.append('g').selectAll('path')
      .data(states.features)
      .join('path')
      .attr('d', path as never)
      .attr('fill', '#F4F6FB')
      .attr('stroke', '#1A202C')
      .attr('stroke-width', 0.6);

    // Warehouses → barn icons
    const barnG = svg.append('g');
    warehouses.forEach((w) => {
      const ll = ZIP3_TO_LATLNG[w.zip.slice(0, 3)];
      if (!ll) return;
      const xy = proj(ll);
      if (!xy) return;
      const g = barnG.append('g').attr('transform', `translate(${xy[0]},${xy[1]})`);
      g.append('rect').attr('x', -10).attr('y', -10).attr('width', 20).attr('height', 16).attr('fill', '#C53030').attr('stroke', '#1A202C').attr('stroke-width', 1.5);
      g.append('polygon').attr('points', '-12,-10 0,-20 12,-10').attr('fill', '#1A202C');
      g.append('rect').attr('x', -3).attr('y', -2).attr('width', 6).attr('height', 8).attr('fill', '#1A202C');
      g.append('text').attr('y', 22).attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 'bold').attr('fill', '#1A202C').text(w.name);
    });

    // Cow herds — animate from each warehouse to top destination state
    const herdG = svg.append('g');
    const maxShipments = Math.max(...topStates.map((s) => s.shipments), 1);

    topStates.forEach((dest, idx) => {
      const destLL = STATE_CENTROID[dest.state];
      if (!destLL) return;
      const destXY = proj(destLL);
      if (!destXY) return;

      // Pick closest warehouse
      const warehouse = warehouses
        .map((w) => ({ w, ll: ZIP3_TO_LATLNG[w.zip.slice(0, 3)] }))
        .filter((x) => x.ll)
        .map(({ w, ll }) => {
          const xy = proj(ll!);
          const d = xy ? Math.hypot(xy[0] - destXY[0], xy[1] - destXY[1]) : Infinity;
          return { w, xy, d };
        })
        .sort((a, b) => a.d - b.d)[0];
      if (!warehouse?.xy) return;

      // Path
      svg.insert('path', 'g').attr('d', `M${warehouse.xy[0]},${warehouse.xy[1]} L${destXY[0]},${destXY[1]}`)
        .attr('stroke', '#0052C9').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('fill', 'none').attr('opacity', 0.4);

      // Cow size by herd size
      const cowSize = 6 + (dest.shipments / maxShipments) * 10;
      const cow = herdG.append('g')
        .attr('transform', `translate(${warehouse.xy[0]},${warehouse.xy[1]})`);
      cow.append('ellipse').attr('rx', cowSize).attr('ry', cowSize * 0.7).attr('fill', '#FEB81B').attr('stroke', '#1A202C').attr('stroke-width', 1.5);
      cow.append('circle').attr('cx', -cowSize - 2).attr('cy', -cowSize * 0.3).attr('r', cowSize * 0.5).attr('fill', '#FEB81B').attr('stroke', '#1A202C').attr('stroke-width', 1);

      // Label at destination
      svg.append('text').attr('x', destXY[0]).attr('y', destXY[1] - 6)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('font-weight', 'bold').attr('fill', '#1A202C')
        .text(`${dest.state} (${dest.shipments})`);

      // Animate
      const dur = 4000 + idx * 500;
      cow.transition().duration(dur).ease(d3.easeLinear)
        .attr('transform', `translate(${destXY[0]},${destXY[1]})`)
        .on('end', function repeat() {
          d3.select(this).attr('transform', `translate(${warehouse.xy![0]},${warehouse.xy![1]})`)
            .transition().duration(dur).ease(d3.easeLinear)
            .attr('transform', `translate(${destXY[0]},${destXY[1]})`)
            .on('end', repeat);
        });
    });
  }, [usMap, warehouses, topStates]);

  return (
    <div className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
      {!usMap && <div className="h-[540px] flex items-center justify-center text-gray-400">Loading map…</div>}
      <svg ref={ref} viewBox="0 0 900 540" className="w-full" style={{ display: usMap ? 'block' : 'none' }} />
      {topStates.length === 0 && usMap && (
        <p className="text-sm text-gray-500 text-center mt-2">Upload shipments to see herds.</p>
      )}
    </div>
  );
}
