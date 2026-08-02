/**
 * Human-friendly identifiers branded for Rex Health / Matmama.
 *
 * Client record ID  : RXM-260802-4821   (RXM + date + 4 digits)
 * System client ID  : REX-MM-2608-4821  (branded, easy to read over the phone)
 */

const digits = (n: number) => {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
};

const stamp = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { yy, mm, dd };
};

/** Branded, memorable system ID, e.g. REX-MM-2608-4821 */
export const generateSystemId = () => {
  const { yy, mm } = stamp();
  return `REX-MM-${yy}${mm}-${digits(4)}`;
};

/** Primary key for a client record, e.g. RXM-260802-4821 */
export const generateClientId = () => {
  const { yy, mm, dd } = stamp();
  // last 2 digits of the epoch second keep same-day collisions practically impossible
  const seq = String(Math.floor(Date.now() / 1000)).slice(-2);
  return `RXM-${yy}${mm}${dd}-${seq}${digits(2)}`;
};
