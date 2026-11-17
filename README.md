# PharmaTrace UI

[🇪🇸 Español](README.es.md) · 🇬🇧 English

Web interface for [PharmaTrace](https://github.com/gastonhp1/PharmaTrace) on **Hyperledger Fabric**
(React + Vite + MUI). It only talks to the backend's REST API (`backend/` in the main repo); it never
connects to the Fabric network or handles identities. The backend is custodial: it signs every
operation with the identity of the organization that has to act (the batch owner, the recipient, the
regulator).

![Network overview: custody per organization, recalls and batches about to expire](docs/screenshots/inicio.png)

## What you can do

| Screen | Route | What it does |
| --- | --- | --- |
| Overview | `/` | How many batches each link of the chain holds, market recalls and batches about to expire |
| Batch formulary | `/batches/:batchId?` | Alphabetical index of every batch, filtered by text or state. Each batch opens its record: label, route, actions (dispatch, receive, dispense, recall), commercial terms and history |
| Register batch | `/register` | The manufacturer registers a batch (8–14 digit GTIN, expiry date) |
| Cargoes | `/cargo/:cargoId?` | Group several batches into a cargo, dispatch, receive or dissolve it |
| Cold chain | `/coldchain/:cargoId?` | IoT case verdict, last reading, events and a Merkle proof for each reading; operator setup |
| Notices | `/notifications` | What each org has to act on: recalls, a broken cold chain, batches in quarantine, shipments on their way |

The search box in the top bar finds batches by product, lot number, GTIN or ID from any screen.

The formulary: every batch on the network, sorted by product:

![Alphabetical batch index](docs/screenshots/lotes.png)

The record of a batch that went through the whole chain, with its transaction history:

![Record of a dispensed batch](docs/screenshots/lote.png)

Cargoes (batches move together) and the cold chain with the case's verdict:

![Cargo](docs/screenshots/cargamento.png)

![Compromised cold chain](docs/screenshots/cadena-de-frio.png)

On mobile and in dark mode (follows the system theme):

<img src="docs/screenshots/cadena-de-frio-mobile.png" alt="Cold chain on mobile, dark theme" width="300">

> Screenshots were taken against the real Express backend with a **simulated ledger** (the chaincode
> rules rewritten in JS) and demo data, not against a running Fabric network.

## Running it

```bash
npm install
cp .env.example .env     # and set VITE_API_URL if the API is not on :3001
npm run dev              # http://localhost:5173
```

With the Fabric network and the backend up (see `fabric/` and `backend/` in the main repo).

### API key

The backend requires the `x-api-key` header on every write (and to read commercial terms, which are
private). The UI **does not ship the key in the bundle**: you enter it at runtime with the key button
in the top bar and it lives only in that tab (`sessionStorage`). Without a key only writes fail, with
the message "La clave de API falta o es incorrecta" (the API key is missing or wrong).

### Variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API URL (defaults to `http://localhost:3001`). In the Docker image it is `/`: the API on the same origin, behind the ingress. |
| `VITE_API_KEY` | Optional, local development only: default value for the key. Every `VITE_*` value is visible in the bundle; leave it empty in real deployments. |

## Rules the UI follows

The chaincode enforces them; the UI only shows what makes sense and translates the errors.

- **Chain of custody:** Laboratory → Distributor → Pharmacy. Each dispatch goes to the next role and
  the batch stays *in transit* until the destination receives it. A batch in transit still shows up
  under whoever dispatched it.
- **Batch states:** Registered → In transit → At distributor → At pharmacy → Dispensed. A recall is
  signed by the regulator and is final; a recalled batch in transit still has to be received to close
  the transit.
- **Cargoes:** the batches in a cargo are dispatched and received together; a single batch of a cargo
  cannot move on its own. A cargo with a recalled batch cannot be dispatched: dissolve it and leave
  the batch out.
- **Dispensing:** the backend stores only the SHA-256 hash of the patient reference, never the value.
- **Commercial terms** (price, currency, quantity): kept in private data collections. Only the seller
  and buyer of each leg can read them; anyone can check whether some values match the public hash
  without seeing the real ones.
- **Units:** batches are registered with their units; the batch page splits them (a new batch with the same lot,
  linked to its parent), dispenses a few units at a time and lists the splits and the dispensations.
- **Quarantine:** batches that arrive in a cargo with a broken cold chain are `QUARANTINED`; the batch page
  shows why and lets the regulator release or recall them.
- **Cold chain:** the case signs each reading (P-256); readings are anchored in windows under a Merkle
  root. The verdict goes from *Monitoring* to *Compliant* or *Compromised* (broken seal, or more time
  out of range than the policy tolerates) and is final once monitoring is closed.

## Structure

```
src/
├── api.js              API client: errors as exceptions with Spanish messages
├── errorMessages.js    Translates chaincode and backend errors
├── apiKey.js           Runtime API key (sessionStorage)
├── domain.js           Organizations, states, possible actions and formatting
├── theme.js            Palette and typefaces (Source Serif 4 + IBM Plex, bundled, no external requests)
├── hooks/              useAction ({ loading, error, data }) and useCatalog (every batch on the network)
├── components/         Layout, GlobalSearch, RecordHeader, Section, CustodyStepper, BatchActions, ...
└── pages/              Dashboard, Batches, Register, Cargo, ColdChain
```

The interface itself is in Spanish.

## Scripts

`npm run dev` · `npm run build` · `npm run preview` · `npm run lint`

## Versions

- **v2** (this one): formulary-style redesign (a *vademécum*, the drug reference book). Alphabetical
  index, batch record laid out as a monograph, global search and an overview with recalls and
  expiries. Same API as v1.
- **v1**: first version on the Fabric REST API (commit `a57a287`).

## Testing status

The UI was tested end to end with Playwright (28 flows: index and search, full batch lifecycle, recall,
cargoes, private terms, cold chain, translated errors, API down, mobile) against the real Express backend with a
simulated ledger. It was **not** tested against a real Fabric network or the Go chaincode:
endorsement policies and MSP identities remain uncovered until the network is available.
