export interface DiagnosticData {
  has_payroll: boolean;
  direct_workers: number;
  arl_risk_level: number;
  outsourced_services: string[];
  has_height_work: boolean;
  has_electrical_substation: boolean;
  has_hazardous_chemicals: boolean;
  common_areas_sqm: number;
}

export interface ClassificationResult {
  normative_type: number;
  deliverables: string[];
}

/**
 * Motor de decision normativa SG-SST (v1)
 * Clasifica la copropiedad y define los entregables segun
 * Resolucion 0312 de 2019 y Decreto 1072 de 2015.
 * IMPORTANTE: Sin tildes por requerimientos tecnicos del sistema.
 */
export function calculateClassification(data: DiagnosticData): ClassificationResult {
  const { 
    has_payroll,
    direct_workers, 
    arl_risk_level, 
    has_height_work, 
    has_electrical_substation, 
    has_hazardous_chemicals 
  } = data;
  
  let normative_type = 1;
  const deliverables: string[] = [
    "Manual del SG-SST",
    "Matriz de Responsabilidades",
    "Matriz de Riesgos (IPEVR)"
  ];

  // Regla 1: 100% Tercerizada (Cero trabajadores directos o sin nomina)
  if (!has_payroll || direct_workers === 0) {
    normative_type = 1;
    deliverables.push("Manual de Contratistas", "Auditoria de Planillas", "Analisis de Trabajo Seguro (ATS)");
  } 
  // Regla 3: Compleja / Alto Riesgo
  else if (direct_workers >= 11 || arl_risk_level === 4 || arl_risk_level === 5) {
    normative_type = 3;
    deliverables.push("Ciclo Integral (Estandares)", "COPASST Paritario", "Plan de Emergencias");
  } 
  // Regla 2: Mixta / Pequena
  else {
    normative_type = 2;
    deliverables.push("Ciclo Basico (Estandares)", "Vigia SST", "Comite de Convivencia");
  }

  // Detonantes adicionales (Triggers)
  if (has_height_work) {
    deliverables.push("Proteccion contra Caidas");
  }
  if (has_electrical_substation) {
    deliverables.push("Riesgo Electrico (RETIE/LOTO)");
  }
  if (has_hazardous_chemicals) {
    deliverables.push("Gestion de Quimicos (SGA)");
  }

  return { normative_type, deliverables };
}
