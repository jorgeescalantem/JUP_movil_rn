export type Role = 'CONDUCTOR' | 'PROPIETARIO';

// Real capability resolved from Tcconductores.Tipo after login (source of truth),
// as opposed to `Role` which is just the currently active drawer view.
export type RoleCapability = 'CONDUCTOR' | 'PROPIETARIO' | 'AMBOS';

export type OwnedVehicle = {
  codvehiculo: number;
  placa: string;
};

export type ServiceState =
  | 'ASIGNADA'
  | 'EN_TRANSITO'
  | 'TERMINADO'
  | 'COMPLETADO'
  | 'procesado';

export type Service = {
  numeroServicio: string;
  orden: number;
  contrato: string;
  estado: ServiceState;
  fechaServicio: string;
  HoraRecogida: string;
  HoraCita: string;
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