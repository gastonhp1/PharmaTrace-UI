// Traduce los errores de la API (siempre `{ "error": "<texto>" }`) a mensajes en español.
//
// Los textos vienen de dos lados: el chaincode (errores con código NOT_FOUND / FORBIDDEN /
// CONFLICT / INVALID, ver fabric/chaincode/pharmatrace/contract/*.go) y el backend (validación,
// autenticación, conexión con la red). Lo que no se reconoce se muestra tal cual llegó.

const ROLE = { manufacturer: "fabricante", distributor: "droguería", pharmacy: "farmacia", "": "sin rol" };
const role = (r) => ROLE[r] ?? r;

const STATE = {
    REGISTERED: "registrado",
    IN_TRANSIT: "en tránsito",
    IN_DISTRIBUTION: "en droguería",
    IN_PHARMACY: "en farmacia",
    DISPENSED: "dispensado",
    RECALLED: "retirado del mercado",
    OPEN: "abierto",
    DELIVERED: "entregado",
    DISSOLVED: "disuelto",
};
const state = (s) => STATE[s] ?? s;

// [patrón, (…grupos) => mensaje]. El orden importa: primero lo más específico.
const RULES = [
    // ---- lotes
    [/^batch (.+) does not exist$/, (id) => `El lote ${id} no existe.`],
    [/^batch (.+) already exists$/, (id) => `Ya existe un lote con el ID ${id}.`],
    [/^batch (.+) travels in cargo (.+): dispatch the cargo$/, (id, c) => `El lote ${id} viaja en el cargamento ${c}: hay que despachar el cargamento.`],
    [/^batch (.+) travels in cargo (.+): receive the cargo$/, (id, c) => `El lote ${id} viaja en el cargamento ${c}: hay que recibir el cargamento.`],
    [/^batch (.+) is already in transit to (.+)$/, (id, to) => `El lote ${id} ya está en tránsito hacia ${to}.`],
    [/^batch (.+) is in a pharmacy: it can only be dispensed$/, (id) => `El lote ${id} ya está en una farmacia: solo puede dispensarse.`],
    [/^a (\w+) can only dispatch to a (\w+), (.+) is a (\w*)$/, (from, to, msp, got) => `Un ${role(from)} solo puede despachar a una ${role(to)}, y ${msp} es ${role(got)}.`],
    [/^batch (.+) is not in transit to (.+)$/, (id, msp) => `El lote ${id} no está en tránsito hacia ${msp}.`],
    [/^batch (.+) is not in transit$/, (id) => `El lote ${id} no está en tránsito.`],
    [/^batch (.+) is (\w+), it has to be IN_PHARMACY to be dispensed$/, (id, s) => `El lote ${id} está ${state(s)}: tiene que estar en farmacia para dispensarlo.`],
    [/^batch (.+) is still in cargo (.+)$/, (id, c) => `El lote ${id} sigue dentro del cargamento ${c}.`],
    [/^batch (.+) belongs to (.+), not to (.+)$/, (id, owner, caller) => `El lote ${id} es de ${owner}, no de ${caller}.`],
    [/^batch (.+) is (\w+) and cannot change anymore$/, (id, s) => `El lote ${id} está ${state(s)} y ya no puede cambiar.`],
    [/^batch (.+) is (\w+) and cannot go in a cargo$/, (id, s) => `El lote ${id} está ${state(s)} y no puede ir en un cargamento.`],
    [/^batch (.+) is already in cargo (.+)$/, (id, c) => `El lote ${id} ya está en el cargamento ${c}.`],
    [/^batch (.+) is repeated$/, (id) => `El lote ${id} está repetido.`],
    [/^batch (.+) is already recalled$/, (id) => `El lote ${id} ya fue retirado del mercado.`],
    [/^batch (.+) was already dispensed$/, (id) => `El lote ${id} ya fue dispensado: no se puede retirar.`],
    [/^batch (.+) of cargo (.+) was recalled: dissolve the cargo and leave it out$/, (id, c) => `El lote ${id} del cargamento ${c} fue retirado: disolvé el cargamento y dejalo afuera.`],
    [/^a recall needs a reason$/, () => "Un retiro del mercado necesita un motivo."],
    [/^only the regulator \((.+)\) can do this, caller is (.+)$/, (reg, caller) => `Solo el regulador (${reg}) puede hacer esto; quien firmó fue ${caller}.`],
    [/^only a manufacturer can register batches, (.+) is "(.*)"$/, (msp, r) => `Solo un fabricante puede registrar lotes, y ${msp} es ${role(r)}.`],
    [/^invalid GTIN .*: 8 to 14 digits$/, () => "El GTIN tiene que tener entre 8 y 14 dígitos."],
    [/^invalid expiry date .*$/, () => "La fecha de vencimiento no es válida (formato AAAA-MM-DD)."],
    [/^product and lot are required$/, () => "El producto y el lote son obligatorios."],
    [/^invalid batch ID$/, () => "El ID del lote no es válido."],
    [/^patientRefHash has to be a sha256.*$/, () => "La referencia del paciente no es un hash SHA-256 válido."],

    // ---- cargamentos
    [/^cargo (.+) does not exist$/, (id) => `El cargamento ${id} no existe.`],
    [/^cargo (.+) already exists$/, (id) => `Ya existe un cargamento con el ID ${id}.`],
    [/^cargo (.+) is not in transit to (.+)$/, (id, msp) => `El cargamento ${id} no está en tránsito hacia ${msp}.`],
    [/^cargo (.+) is not in transit$/, (id) => `El cargamento ${id} no está en tránsito.`],
    [/^cargo (.+) belongs to (.+), not to (.+)$/, (id, owner, caller) => `El cargamento ${id} es de ${owner}, no de ${caller}.`],
    [/^a cargo needs between 1 and (\d+) batches, got (\d+)$/, (max, got) => `Un cargamento lleva entre 1 y ${max} lotes (se indicaron ${got}).`],
    [/^invalid cargo ID$/, () => "El ID del cargamento no es válido."],
    [/^cargo (.+) is (\w+)$/, (id, s) => `El cargamento ${id} está ${state(s)}.`],

    // ---- organizaciones
    [/^org (.+) is not registered$/, (msp) => `${msp} no está registrada en la red.`],
    [/^invalid MSP ID .*$/, () => "El MSP ID no es válido."],
    [/^invalid role .*$/, () => "El rol no es válido (fabricante, distribuidor o farmacia)."],

    // ---- condiciones comerciales
    [/^no terms for batch (.+) in (.+)$/, (id) => `No hay condiciones comerciales cargadas para el lote ${id} en ese tramo.`],
    [/^(.+) is not a member of (.+)$/, (msp) => `${msp} no participa de ese tramo: no puede leer las condiciones.`],
    [/^(.+) is not part of these terms$/, (msp) => `${msp} no es parte de estas condiciones: solo el vendedor y el comprador las ven.`],
    [/^the seller has to be the owner of the batch \((.+)\)$/, (msp) => `El vendedor tiene que ser el dueño del lote (${msp}).`],
    [/^a (\w+) sells to a (\w+), (.+) is "(.*)"$/, (from, to, msp, got) => `Un ${role(from)} le vende a una ${role(to)}, y ${msp} es ${role(got)}.`],
    [/^invalid leg .*$/, () => "El tramo no es válido."],
    [/^terms\.unitPrice .*$/, () => "El precio tiene que ser un decimal positivo, por ejemplo 1234.50."],
    [/^terms\.currency .*$/, () => "La moneda tiene que ser un código ISO de 3 letras en mayúsculas, por ejemplo ARS."],
    [/^terms\.quantity .*$/, () => "La cantidad tiene que ser positiva."],

    // ---- cadena de frío
    [/^device (.+) does not exist$/, (id) => `La valija ${id} no existe.`],
    [/^device (.+) already exists$/, (id) => `Ya existe una valija con el ID ${id}.`],
    [/^policy (.+) does not exist$/, (id) => `La política ${id} no existe.`],
    [/^policy (.+) already exists$/, (id) => `Ya existe una política con el ID ${id}. Las políticas no se modifican: creá otra.`],
    [/^cargo (.+) has no cold-chain monitoring$/, (id) => `El cargamento ${id} no tiene monitoreo de cadena de frío.`],
    [/^cargo (.+) is already monitored$/, (id) => `El cargamento ${id} ya tiene un monitoreo.`],
    [/^device (.+) is already monitoring cargo (.+)$/, (d, c) => `La valija ${d} ya está monitoreando el cargamento ${c}.`],
    [/^device (.+) is not operational.*$/, (d) => `La valija ${d} no está operativa (inactiva o con la calibración vencida).`],
    [/^calibration already expired$/, () => "La calibración ya está vencida."],
    [/^invalid temperature range: .*$/, () => "El rango de temperatura no es válido: el mínimo tiene que ser menor que el máximo."],
    [/^only the owner of cargo (.+) or an authorized gateway can monitor it$/, (c) => `Solo el dueño del cargamento ${c} o un gateway autorizado puede monitorearlo.`],
    [/^only the holder of cargo (.+) or an authorized gateway can close its monitoring$/, (c) => `Solo quien tiene el cargamento ${c} o un gateway autorizado puede cerrar su monitoreo.`],
    [/^the monitoring of cargo (.+) is closed$/, (c) => `El monitoreo del cargamento ${c} ya está cerrado.`],
    [/^Reading not found$/, () => "No existe una lectura con ese número."],
    [/^Reading is not anchored yet$/, () => "Esa lectura todavía no fue anclada en la blockchain."],
    [/^cargo (.+) has no anchor (\d+)$/, (c, i) => `El cargamento ${c} no tiene el anclaje ${i}.`],

    // ---- backend: validación, autenticación y conexión
    [/^batchIds must be a non-empty array of strings$/, () => "Indicá al menos un lote."],
    [/^pubKey must be 64 bytes in hex$/, () => "La clave pública tiene que ser de 64 bytes en hexadecimal (128 caracteres)."],
    [/^Missing or invalid (\w+)$/, (field) => `Falta el campo «${field}» o no es válido.`],
    [/^(\w+) must be an integer between .*$/, (field) => `El campo «${field}» tiene que ser un entero dentro del rango permitido.`],
    [/^Missing or invalid API key$/, () => "La clave de API falta o es incorrecta."],
    [/^API_KEY is not configured on the server.*$/, () => "El backend no tiene API_KEY configurada, así que rechaza las escrituras (para desarrollo local: AUTH_DISABLED=true)."],
    [/^No Fabric identity is configured for (.+)$/, (msp) => `El backend no tiene una identidad Fabric configurada para ${msp}.`],
    [/^Fabric identity (.+) not found under .*$/, (id) => `El backend no encontró los certificados de la identidad ${id}: ¿está levantada la red?`],
    [/^The Fabric network is not reachable$/, () => "El backend no llega a la red Fabric. ¿Están levantados los peers?"],
    [/^Another transaction changed the same data at the same time; retry$/, () => "Otra transacción modificó los mismos datos al mismo tiempo. Reintentá."],
    [/^Transaction (.+) was invalidated: (.+)$/, (tx, why) => `La transacción ${tx.slice(0, 10)}… fue invalidada por la red (${why}).`],
];

export function translateError(status, raw) {
    const text = String(raw ?? "").trim();
    for (const [pattern, build] of RULES) {
        const match = pattern.exec(text);
        if (match) return build(...match.slice(1));
    }
    if (text) return text;
    return status ? `Error ${status}` : "Error desconocido";
}
