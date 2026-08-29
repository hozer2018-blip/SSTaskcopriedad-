import React from 'react';
import * as Icons from 'lucide-react';

interface PlaceholderToolProps {
  title: string;
  iconName: keyof typeof Icons;
}

export default function PlaceholderTool({ title, iconName }: PlaceholderToolProps) {
  const Icon = Icons[iconName] as React.ElementType;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 rounded-lg">
            <Icon className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-slate-400 mt-1">Modulo en desarrollo</p>
          </div>
        </div>
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <Icon className="w-16 h-16 text-slate-200 mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Herramienta en construccion</h2>
          <p className="text-slate-500 max-w-md">
            El modulo de "{title}" estara disponible en la proxima actualizacion del sistema SG-SST.
          </p>
        </div>
      </div>
    </div>
  );
}
