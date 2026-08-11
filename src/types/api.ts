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

// Shape returned by GET /oData/Tbserviciosview (one row per service leg).
export type TbservicioRecord = {
  OrdenServicio: number;
  OrdenPrestacion: string;
  CodigoServicio: number;
  NomCliente: string;
  TipoTrayecto: string;
  FechaServicio: string;
  HoraInicio: string;
  HoraFin: string;
  DireccionRecogida: string;
  LocalidadRecogida: string;
  TipoRecogida: string;
  DireccionDestino: string;
  LocalidadDestino: string;
  TipoDestino: string;
  NomEmpresa: string;
  Contrato: string;
  TarifaCodigoServicio: string;
  VehiculoRequerido: string;
  ValorTranslado: number;
  ValorConductor: number;
  ValorEmpresa: number;
  Copago: number;
  CuotaModeradora: number;
  Deducible: number | null;
  MotivoTranslado: string | null;
  TipoViaje: string;
  EstServicio: number;
  UnidadAsignada: string;
  UnidadAsignadaCodigo: number;
  Guia: string | null;
  FechaInicio: string | null;
  FechaFinal: string | null;
  Seguimiento: string | null;
  Rutinas: string | null;
  ObservacionesOrdenServicio: string | null;
  ComentariosCliente: string | null;
  ZonaServicio: string | null;
  ObservacionesServicio: string | null;
  Telefonos: string | null;
  Estado: number;
  Conductor: string | null;
};

// Shape returned by GET /oData/Tbservicios (raw table, no joins/view).
export type TbservicioRawRecord = {
  Orden: number;
  Codservicio: number;
  Cliente: number;
  Tipotrayecto: string;
  Localidadinicio: string | null;
  Localidaddestino: string | null;
  Hrecogida: string;
  Hllegada: string;
  Tipovehiculo: string;
  Servobservaciones: string | null;
  Servseguimiento: string | null;
  Servcomentarioscliente: string | null;
  Deducible: number | null;
  Valtraslado: number;
  Tipodir1: string;
  Lat1: string | null;
  Lat2: string | null;
  Lng1: string | null;
  Lng2: string | null;
  Dircli1: string;
  Estado: number;
  Dircli2: string;
  Tipodir2: string;
  Fecha: string;
  Tarforigen: string;
  Tarfdestino: string;
  Tarfvalconductor: number;
  Tarfvalempresa: number;
  Zonaservicio: string | null;
  Estservicio: number;
  UnidadAsignada: number;
  FechaInicio: string | null;
  Guia: string | null;
  Copago: number;
  FechaFinal: string | null;
};

// Shape returned by GET /oData/Tbclientes (used to resolve NomCliente/Contrato/telefonos).
export type TbclienteRecord = {
  Id: number;
  Tipodoc: string;
  Nodoc: string;
  Apellido1: string | null;
  Apellido2: string | null;
  Nombre1: string | null;
  Nombre2: string | null;
  Telefono: string | null;
  Celular1: string | null;
  Celular2: string | null;
  Contrato: string | null;
  Idconvenio: number | null;
};

// Shape returned by GET /oData/Tpconvenios (used to resolve the client's empresa).
export type TpconvenioRecord = {
  Id: number;
  Ncorto: string;
  Nlargo: string;
  Empresa: number;
};

// Shape returned by GET /oData/Tpempresas (used to resolve NomEmpresa).
export type TpempresaRecord = {
  Id: number;
  Nombre: string;
};
