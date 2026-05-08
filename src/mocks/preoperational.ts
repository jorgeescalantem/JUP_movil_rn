export type PreoperationalOption = 'SI' | 'NO' | 'NO_APLICA';

export type PreoperationalQuestion = {
  id: string;
  text: string;
};

export const preoperationalConfig = {
  vehicleName: 'CONTIGE',
  questions: [
    { id: 'motor_fugas', text: 'EL MOTOR PRESENTA FUGAS' },
    { id: 'correas_tension', text: 'ES ADECUADA LA TENSION DE LAS CORREAS' },
    { id: 'aceite_nivel', text: 'SON ADECUADOS LOS NIVELES DE ACEITE DE MOTOR' },
    { id: 'transmision_funciona', text: 'ES ADECUADO EL FUNCIONAMIENTO DE LA TRANSMISION' },
    { id: 'direccion_funciona', text: 'ES ADECUADO EL FUNCIONAMIENTO DE LA DIRECCION' },
    { id: 'frenos_funcionan', text: 'ES ADECUADO EL FUNCIONAMIENTO DE LOS FRENOS' },
    {
      id: 'emergencia_elementos',
      text: 'ES ADECUADO Y ESTAN COMPLETOS LOS ELEMENTOS DE EMERGENCIA BOTIQUIN Y EXTINTOR',
    },
    { id: 'orden_aseo', text: 'ES ADECUADO EL ORDEN Y ASEO DEL VEHICULO' },
    {
      id: 'documentos_legales',
      text: 'CUENTA CON TODOS LOS DOCUMENTOS LEGALES APLICABLES PARA OPERAR EL VEHICULO',
    },
    {
      id: 'falla_extra',
      text: 'EXISTE ALGUNA OTRA FALLA MECANICA Y/O ELECTRICA EN EL VEHICULO (DESCRIBALAS EN OBSERVACIONES)',
    },
  ] satisfies PreoperationalQuestion[],
};
