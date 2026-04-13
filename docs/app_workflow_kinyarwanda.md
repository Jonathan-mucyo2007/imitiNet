# ImitiNet: Uko App Ikora File ku File

Iyi nyandiko isobanura uko ImitiNet ikora kuva kuri frontend kugeza kuri backend, mu Kinyarwanda, mu buryo bwa real-life scenario.

## 1. Uko system itangira

### `fronted/src/main.jsx`
- Ni ho React app itangirira.
- Ipfukirana app muri:
  - `QueryClientProvider` kugira ngo React Query ibike data mu cache
  - `AuthProvider` kugira ngo login state iboneke hose
  - `BrowserRouter` kugira ngo routes zikore

### `fronted/src/App.jsx`
- Ni yo igenzura page zose.
- Icyemeza ko:
  - patient ajya kuri `/dashboard/patient`
  - patient ashobora no kujya kuri `/find-medicine`
  - pharmacy, insurer, receptionist, regulator buri wese ajya aho yemerewe

### `fronted/src/routes/ProtectedRoute.jsx`
- Igenzura niba user yinjiye.
- Igenzura niba `role` yemerewe route runaka.
- Niba atabyemerewe, imwohereza kuri `UnauthorizedPage`.

## 2. Uko login n'umutekano bikora

### `fronted/src/store/AuthContext.jsx`
- Ibika user winjiye.
- Iyo app ifunguye, ikora `GET /auth/me`.
- Iyo token iri muri `localStorage`, irifashishwa kugenzura user uri online.

### `fronted/src/services/api.js`
- Ni axios instance rusange.
- Buri request yongerwaho `Authorization: Bearer <token>`.

### `backend/src/middlewares/authMiddleware.js`
- `verifyToken` igenzura JWT.
- `requireRole` igenzura ko role yemerewe endpoint.
- Iyo token ari nzima, amakuru ya user ashyirwa muri `req.user`.

### `backend/src/controllers/authController.js`
- `register`: yandika user mushya muri database.
- `login`: ireba email/password, ikagarura JWT.
- `getMe`: igarura user details hashingiwe kuri `req.user.id`.

### `backend/src/routes/authRoutes.js`
- Ihuza endpoints za auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`

## 3. Patient portal nshya

### `fronted/src/pages/patient/PatientDashboard.jsx`
- Ni home nyamukuru ya patient.
- Ikora ibi:
  - ifata dashboard data kuri `/api/patient/dashboard`
  - isaba GPS location ya user
  - iyo hari active prescription, ikongera guhamagara `/api/inventory/nearby/active-prescription`
  - ikerekana digital insurance card
  - ikerekana retrieval code
  - ikerekana pharmacies 3 za hafi zifite umuti wandikiwe
  - ikerekana claim timeline

### `backend/src/controllers/patientDashboardController.js`
- Igenzura data ya patient hashingiwe kuri `req.user.id`.
- Igarura:
  - profile ya patient
  - active prescriptions
  - recent claims 5 ziheruka
- Ibituma app iba secure:
  - ntikoresha `patientId` iva kuri frontend
  - ikoresha user uri muri token gusa

### `backend/src/routes/patientDashboardRoutes.js`
- Ihuza `GET /api/patient/dashboard`.

## 4. Find Medicine nshya

### `fronted/src/pages/patient/FindMedicine.jsx`
- Ni page nshya ya geospatial medicine discovery.
- Ifite ibice 4:
  - prescription card iri hejuru
  - map ya OpenStreetMap
  - routing line iva aho user ari kugera kuri pharmacy yatoranyijwe
  - inventory list ifite `h-[500px]` na `overflow-y-auto`
- Ikoresha:
  - `react-leaflet` kuri map
  - OSRM public routing API ku murongo w'inzira
  - featured pharmacies modal

### `fronted/src/components/patient/PharmacyDetailsModal.jsx`
- Ni modal ifunguka iyo user akoze kuri `View Details`.
- Yerekana:
  - izina rya pharmacy
  - address
  - contact
  - operating hours
  - button ya `Get Directions`

### `backend/src/controllers/inventoryController.js`
- `searchInventory`:
  - ishaka imiti n'amafarumasiye
  - ishobora no gushyiraho distance hashingiwe kuri GPS
- `getNearbyPharmaciesForMedicine`:
  - ifata `medicineVariantId`, `lat`, `lng`
  - ikoresha geospatial lookup kugira ngo ibone pharmacies za hafi zifite stock
- `getNearbyPharmaciesForActivePrescription`:
  - ireba prescription ya patient winjiye
  - ifata medicine ya mbere muri prescription
  - igarura pharmacies 3 za hafi zifite iyo medicine

### `backend/src/routes/inventoryRoutes.js`
- Ihuza:
  - `GET /api/inventory/search`
  - `GET /api/inventory/nearby`
  - `GET /api/inventory/nearby/active-prescription`

## 5. Uko geospatial data ikora

### `backend/src/models/Pharmacy.js`
- `location` ibikwa nka GeoJSON Point.
- Hari `2dsphere index`.
- Ibi bituma `$geoNear` ikora neza muri MongoDB.

### `backend/src/models/Inventory.js`
- Ibika stock ya pharmacy ku rwego rwa `medicineVariant`.
- Ihuza `pharmacyId` na `medicineVariantId`.
- Ni yo ikoreshwa mu kumenya niba pharmacy ifite medicine kandi iri mu stock.

## 6. Prescription na claims flow

### `backend/src/models/Prescription.js`
- Ibika prescription yanditswe na doctor.
- Irimo:
  - patientId
  - prescribingDoctor
  - medications
  - originatingEmr
  - status

### `backend/src/controllers/prescriptionController.js`
- Pharmacy ishobora kureba prescription active ya patient.
- Igarura details z'imiti n'ibiciro byo muri inventory.

### `backend/src/models/Claim.js`
- Ibika claim yishyurwa na insurer.
- Ubu harimo na `patientId`, ibyo bikafasha patient dashboard kubona claim ze mu buryo bwizewe.

### `backend/src/controllers/claimsController.js`
- Igenzura coverage.
- Igenzura stock.
- Ikora claim.
- Igabanya inventory mu buryo bwa FIFO.
- Iyo claim yemejwe, patient history iragaragara kuri dashboard.

## 7. Uko data iva kuri seed

### `backend/src/scripts/seedDatabase.js`
- Irema:
  - pharmacies
  - medicine groups
  - medicine variants
  - inventory
  - users
  - prescriptions
  - claims
- Ni yo ituma demo environment iba ifite data ihagije.
- Ubu ifite:
  - pharmacies zifite coordinates
  - operating hours
  - claims zifite `patientId`

## 8. Real-life scenario

1. Aline yinjira muri app.
2. Token ye ibikwa muri browser.
3. Dashboard imwereka:
   - Muraho Aline
   - insurance card
   - retrieval code
   - pharmacies za hafi zifite umuti
4. Akoze `View on Map`, ajya kuri `Find Medicine`.
5. Map imwereka aho ari n'aho pharmacy iri.
6. OSRM ikamushushanyiriza inzira yo kuhagera.
7. Ashobora no gushaka indi miti hasi muri inventory list itembera imbere muri card.
8. Iyo ageze kuri pharmacy, claim ikorwa.
9. Claim igahita igaragara muri timeline ye kuri dashboard.

## 9. Icy'ingenzi ku mutekano

Mu bice bya patient byose, data isolation ikorwa na backend hashingiwe kuri:
- `req.user.id`

Ibi bivuze ko:
- patient abona claims ze gusa
- prescription ye gusa
- nearby active-prescription lookup ye gusa

Nta route ya patient ikwiye kwiringira `patientId` itanzwe na frontend.
