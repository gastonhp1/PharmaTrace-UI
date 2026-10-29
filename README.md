# PharmaTrace UI

Interfaz web de [PharmaTrace](https://github.com/gastonhp1/PharmaTrace) sobre **Hyperledger Fabric**
(React + Vite + MUI). Habla únicamente con la API REST del backend (`backend/` del repo principal);
no se conecta a la red Fabric ni maneja identidades: el backend es custodial y firma cada operación
con la identidad de la organización que corresponde (el dueño del lote, quien lo recibe, el regulador).

![Inicio: organizaciones del consorcio y accesos](docs/screenshots/inicio.png)

## Qué se puede hacer

| Pantalla | Ruta | Qué hace |
| --- | --- | --- |
| Inicio | `/` | Organizaciones del consorcio, su rol y cuántos lotes tiene cada una |
| Lotes | `/batches/:batchId?` | Buscar un lote o listar los de una organización; despachar, recibir, dispensar, retirar; condiciones comerciales; historial en la cadena |
| Registrar lote | `/register` | Alta de un lote por el laboratorio (GTIN de 8 a 14 dígitos, vencimiento) |
| Cargamentos | `/cargo/:cargoId?` | Armar un cargamento con varios lotes, despacharlo, recibirlo o disolverlo |
| Cadena de frío | `/coldchain/:cargoId?` | Veredicto de la valija IoT, última lectura, eventos y prueba de Merkle de cada lectura; configuración del operador |

Trazabilidad de un lote que recorrió la cadena completa, con el historial de transacciones:

![Un lote dispensado y su historial](docs/screenshots/lote.png)

Lotes en poder de una organización, con alerta de vencimiento y lotes retirados:

![Lotes de una organización](docs/screenshots/lotes.png)

Cargamentos (los lotes se mueven juntos) y cadena de frío con el veredicto de la valija:

![Cargamento](docs/screenshots/cargamento.png)

![Cadena de frío comprometida](docs/screenshots/cadena-de-frio.png)

En el celular y con tema oscuro (se sigue el del sistema):

<img src="docs/screenshots/cadena-de-frio-mobile.png" alt="Cadena de frío en el celular, tema oscuro" width="300">

> Las capturas se sacaron contra el backend Express real con un **ledger simulado** (las reglas del
> chaincode reescritas en JS) y datos de demo; no contra una red Fabric levantada.

## Cómo corre

```bash
npm install
cp .env.example .env     # y ajustá VITE_API_URL si la API no está en :3001
npm run dev              # http://localhost:5173
```

Con la red Fabric y el backend levantados (ver `fabric/` y `backend/` en el repo principal).

### Clave de API

El backend exige el header `x-api-key` en toda escritura (y para leer condiciones comerciales,
que son privadas). El UI **no la lleva en el bundle**: se carga en runtime con el botón de la llave
del menú y vive solo en esa pestaña (`sessionStorage`). Sin clave, lo único que falla son las
escrituras, con el mensaje «La clave de API falta o es incorrecta».

### Variables (`.env`)

| Variable | Para qué |
| --- | --- |
| `VITE_API_URL` | URL de la API (por defecto `http://localhost:3001`). En la imagen Docker es `/`: la API en el mismo origen, detrás del ingress. |
| `VITE_API_KEY` | Opcional, solo desarrollo local: valor por defecto de la clave. Todo `VITE_*` queda visible en el bundle; en un deploy real dejalo vacío. |

## Reglas que el UI respeta

Las aplica el chaincode; el UI solo muestra lo que tiene sentido y traduce los errores.

- **Cadena de custodia:** Laboratorio → Droguería → Farmacia. Cada despacho va al siguiente rol y el
  lote queda *en tránsito* hasta que el destino lo recibe. Un lote en tránsito sigue figurando con
  quien lo despachó.
- **Estados del lote:** Registrado → En tránsito → En droguería → En farmacia → Dispensado. El
  retiro del mercado lo firma el regulador y es definitivo; un lote retirado en tránsito igual
  tiene que recibirse para cerrar el tránsito.
- **Cargamentos:** los lotes de un cargamento se despachan y reciben juntos; un lote suelto de un
  cargamento no se mueve solo. Un cargamento retirado no se despacha: se disuelve y se deja afuera
  el lote.
- **Dispensar:** el backend guarda solo el hash SHA-256 de la referencia del paciente, nunca el valor.
- **Condiciones comerciales** (precio, moneda, cantidad): viven en colecciones privadas. Solo las ven
  el vendedor y el comprador de cada tramo; cualquiera puede verificar si unos valores coinciden con
  el hash público sin ver los reales.
- **Cadena de frío:** la valija firma cada lectura (P-256); las lecturas se anclan en bloques con una
  raíz de Merkle. El veredicto pasa de *Monitoreando* a *Cumple* o *Comprometida* (precinto roto o
  más tiempo fuera de rango que el que tolera la política) y, al cerrar el monitoreo, es definitivo.

## Estructura

```
src/
├── api.js              Cliente de la API: errores como excepciones con mensaje en español
├── errorMessages.js    Traduce los errores del chaincode y del backend
├── apiKey.js           Clave de API en runtime (sessionStorage)
├── domain.js           Organizaciones, estados, acciones posibles y formatos
├── hooks/useAction.js  { loading, error, data } para cada llamada
├── components/         Layout, CustodyStepper, BatchActions, TermsPanel, BatchHistory, ...
└── pages/              Dashboard, Batches, Register, Cargo, ColdChain
```

## Scripts

`npm run dev` · `npm run build` · `npm run preview` · `npm run lint`

## Estado de las pruebas

El UI se probó de punta a punta con Playwright (29 flujos: ciclo completo de un lote, retiro,
cargamentos, condiciones privadas, cadena de frío, errores traducidos, API caída, móvil) contra el
backend Express real con un ledger simulado. **No** se probó contra una red Fabric real ni contra el
chaincode Go: las políticas de endorsement y las identidades MSP quedan sin cubrir hasta tener la red.
