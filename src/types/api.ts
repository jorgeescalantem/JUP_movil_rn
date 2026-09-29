// Sanitized user profile returned by jup-api's POST /auth/login (see
// src/services/userAuth.ts) alongside the JWT. Never includes Contrasena/AndroidToken.
export type SanitizedMobilUser = {
  Id: number;
  Conductor: number;
  Email: string | null;
  Nodoc: string;
  Nombre: string | null;
  Placa: string | null;
  Username: string;
  Vehiculo: number;
};

// Payload for POST /oData/TbFirmas. Noorden/Cordenadasfirma are NOT NULL in the
// real database despite the OData metadata marking them nullable, so send ''
// instead of null when there's no value.
export type TbFirmaPayload = {
  Codservicio: number;
  Codorden: number;
  Noorden: string;
  Fechaserviciofirma: string;
  Horaserviciofirma: string;
  Placa: string;
  Conductor: number;
  Firma: string;
  Firmaguia: number | null;
  Cordenadasfirma: string;
  Favorito: boolean;
};

