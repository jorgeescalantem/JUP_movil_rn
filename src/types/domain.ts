export type Role = 'CONDUCTOR' | 'PROPIETARIO';

export type ServiceState =
  | 'ASIGNADA'
  | 'EN_TRANSITO'
  | 'TERMINADO'
  | 'COMPLETADO'
  | 'procesado';

export type Service = {
  numeroServicio: string;
  contrato: string;
  estado: ServiceState;
  fechaServicio: string;
  origenDireccion: string;
  origenLat: number;
  origenLng: number;
  destinoDireccion: string;
  destinoLat: number;
  destinoLng: number;
  clienteNombre: string;
  clienteDocumento: string;
  companiaNombre: string;
  zona: string;
  telefonos: string[];
  Guiacontrol: string | null;
  valor: number;
  copago: number;
};

export type SortKey = 'numeroServicio' | 'clienteNombre' | 'companiaNombre';