import { 
  Book, 
  ClipboardList, 
  AlertTriangle, 
  BookOpen, 
  FileCheck, 
  Shield, 
  HardHat, 
  Zap, 
  FlaskConical,
  Activity,
  ShieldAlert,
  Target
} from 'lucide-react';

export const TOOLS_LIST = [
  {
    id: 1,
    number: '1',
    title: '1. Manual SST',
    shortTitle: 'Manual SST',
    path: '/tools/manual-sst',
    icon: Book,
    status: 'Pendiente'
  },
  {
    id: 2,
    number: '2',
    title: '2. Matriz de Responsabilidades',
    shortTitle: 'Matriz de Responsabilidades',
    path: '/tools/matriz-responsabilidades',
    icon: ClipboardList,
    status: 'Pendiente'
  },
  {
    id: 3,
    number: '3',
    title: '3. Matriz IPEVR',
    shortTitle: 'Matriz IPEVR',
    path: '/tools/matriz-ipevr',
    icon: AlertTriangle,
    status: 'Pendiente'
  },
  {
    id: 4,
    number: '4',
    title: '4. Manual de Contratistas',
    shortTitle: 'Manual de Contratistas',
    path: '/tools/manual-contratistas',
    icon: BookOpen,
    status: 'Pendiente'
  },
  {
    id: 5,
    number: '5',
    title: '5. Auditoria de Planillas',
    shortTitle: 'Auditoria de Planillas',
    path: '/tools/auditoria-planillas',
    icon: FileCheck,
    status: 'Pendiente'
  },
  {
    id: 6,
    number: '6',
    title: '6. Auditoria de Examenes Medicos',
    shortTitle: 'Examenes Medicos',
    path: '/tools/auditoria-examenes',
    icon: Activity,
    status: 'Pendiente'
  },
  {
    id: 7,
    number: '7',
    title: '7. Gestion de ATS',
    shortTitle: 'Gestion de ATS',
    path: '/tools/gestion-ats',
    icon: Shield,
    status: 'Pendiente'
  },
  {
    id: 8,
    number: '8',
    title: '8. Centro Comando (Emergencias)',
    shortTitle: 'Centro Comando',
    path: '/tools/centro-comando',
    icon: ShieldAlert,
    status: 'Pendiente'
  },
  {
    id: 9,
    number: '9',
    title: '9. Proteccion contra Caidas',
    shortTitle: 'Proteccion contra Caidas',
    path: '/tools/proteccion-caidas',
    icon: HardHat,
    status: 'Pendiente'
  },
  {
    id: 10,
    number: '10',
    title: '10. Protocolos RETIE/LOTO',
    shortTitle: 'Protocolos RETIE/LOTO',
    path: '/tools/protocolos-retie-loto',
    icon: Zap,
    status: 'Pendiente'
  },
  {
    id: 11,
    number: '11',
    title: '11. Gestion de FDS (SGA)',
    shortTitle: 'Gestion de FDS (SGA)',
    path: '/tools/gestion-fds',
    icon: FlaskConical,
    status: 'Pendiente'
  },
  {
    id: 12,
    number: '12',
    title: '12. Inspecciones y Hallazgos',
    shortTitle: 'Inspecciones y Hallazgos',
    path: '/tools/inspecciones',
    icon: Target,
    status: 'Pendiente'
  }
];
