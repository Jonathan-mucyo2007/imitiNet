const ATC_CODE_BY_MEDICINE = {
  Paracetamol: "N02BE01",
  Ibuprofen: "M01AE01",
  Diclofenac: "M01AB05",
  Amoxicillin: "J01CA04",
  Doxycycline: "J01AA02",
  Azithromycin: "J01FA10",
  "Vitamin C": "A11GA01",
  Multivitamin: "A11AA04",
  Zinc: "A12CB01",
  Benylin: "R05DA20",
  Cetirizine: "R06AE07",
  Salbutamol: "R03AC02",
  Omeprazole: "A02BC01",
  ORS: "A07CA",
  Metronidazole: "P01AB01",
  Panadol: "N02BE01",
  "Cough Syrup": "R05FB02",
  "Folic Acid": "B03BB01",
  Ciprofloxacin: "J01MA02",
  Loperamide: "A07DA03",
};

export function buildInventoryMedicineName({ genericName, dosage, form }) {
  return [genericName, dosage, form].filter(Boolean).join(" ").trim();
}

export function buildNationalMedicineId({ genericName, sku }) {
  const atcCode = ATC_CODE_BY_MEDICINE[genericName];

  if (atcCode) {
    return `RW-ATC-${atcCode}`;
  }

  return `RW-LOCAL-${String(sku || genericName || "UNKNOWN")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()}`;
}
