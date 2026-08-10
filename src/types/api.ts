export type AuthLoginPayload = {
  user: string;
  pwd: string;
};

export type AuthLoginResponse = {
  user: string;
  userId: number;
  token: string;
  role: string;
  roleId: number;
  permisos: unknown[];
  expires: string;
};

// Shape returned by GET /oData/TusuarioMobil. `Contrasena` travels in
// plaintext from this legacy endpoint, so it must never leave the service
// layer (see `sanitizeMobilUser` in src/services/userAuth.ts).
export type TusuarioMobilRecord = {
  Id: number;
  Activa: boolean;
  AndroidToken: string | null;
  Conductor: number;
  Contrasena: string;
  Email: string;
  Estado: boolean;
  MobilKey: string | null;
  Nodoc: string;
  Nombre: string;
  OcultarTarifa: boolean;
  Placa: string;
  Preoperacional: string | null;
  Registro: string;
  Username: string;
  Vehiculo: number;
};

// Same record with the sensitive fields stripped. This is the only shape
// that should ever reach UI/state layers.
export type SanitizedMobilUser = Omit<TusuarioMobilRecord, 'Contrasena' | 'AndroidToken'>;

export type ODataListResponse<T> = {
  '@odata.count'?: number;
  value: T[];
};

// Shape returned by GET /oData/Tppreoperacion (checklist catalog).
export type TppreoperacionRecord = {
  Id: number;
  Concepto: string;
  Activo: boolean;
  Orden: number;
  Editar: boolean;
  Obligatorio: boolean;
};
