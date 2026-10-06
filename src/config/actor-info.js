// Direcciones de los actores de la cadena.
//
// `npm run deploy:all` (repo del backend) pisa este archivo con el mismo formato cuando
// `../PharmaTrace-UI` existe al lado. Si no, editá las direcciones a mano: tienen que ser las
// de las cuentas cuyas claves están en backend/.env (MANUFACTURER_KEY, DISTRIBUTOR_KEY, ...).
//
// Los valores de abajo son las cuentas públicas de `npx hardhat node`. Solo para desarrollo local.
// El UI solo usa `address`; si el generador agrega `balance`, se ignora.
export const ACTORS = {
  laboratory: { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
  distributor: { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
  warehouse: { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  pharmacy: { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
  patient: { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
};
