/**
 * The 20 Local Government Areas (LGAs) of Lagos State, Nigeria.
 * Each Program Manager is assigned to exactly one LGA.
 */
export const LAGOS_LGAS = [
  "Agege",
  "Ajeromi-Ifelodun",
  "Alimosho",
  "Amuwo-Odofin",
  "Apapa",
  "Badagry",
  "Epe",
  "Eti-Osa",
  "Ibeju-Lekki",
  "Ifako-Ijaiye",
  "Ikeja",
  "Ikorodu",
  "Kosofe",
  "Lagos Island",
  "Lagos Mainland",
  "Mushin",
  "Ojo",
  "Oshodi-Isolo",
  "Shomolu",
  "Surulere",
] as const;

export type LagosLGA = (typeof LAGOS_LGAS)[number];

export const isValidLGA = (value: string | null | undefined): value is LagosLGA =>
  !!value && (LAGOS_LGAS as readonly string[]).includes(value);
