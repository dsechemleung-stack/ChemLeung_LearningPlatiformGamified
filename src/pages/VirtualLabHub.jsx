import React from 'react';
import { ExternalLink, FlaskConical } from 'lucide-react';

export default function VirtualLabHub() {
  const labs = [
    {
      id: 'rate-factors',
      title: 'Rate Factors (Collision Theory)',
      description: 'Explore how temperature, concentration, surface area, volume/pressure, and catalyst affect rate.',
      href: '/virtualLab/rate-factors.html',
    },
    {
      id: 'syringevol',
      title: 'Gas Syringe Volume vs Time',
      description: 'Simulate Zn + HCl producing H₂ and collect gas in a syringe; plot volume against time.',
      href: '/virtualLab/syringevol.html',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow">
          <FlaskConical size={22} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Virtual Lab</h1>
          <p className="text-sm text-slate-600 font-semibold">Choose a lab to open (opens in a new tab).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {labs.map((lab) => (
          <a
            key={lab.id}
            href={lab.href}
            target="_blank"
            rel="noreferrer"
            className="group bg-white rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {lab.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1 leading-snug">{lab.description}</p>
              </div>
              <div className="flex-shrink-0 text-slate-400 group-hover:text-indigo-700 transition-colors">
                <ExternalLink size={18} />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
