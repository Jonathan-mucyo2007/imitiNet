const nidaFixtures = {
  "1199580012345678": {
    patient_name: "Aline Uwase",
    date_of_birth: "1995-08-14",
    gender: "Female",
    patient_photo:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='200' viewBox='0 0 160 200'><rect width='160' height='200' rx='24' fill='%23E2E8F0'/><circle cx='80' cy='68' r='28' fill='%2394A3B8'/><rect x='38' y='108' width='84' height='54' rx='18' fill='%23CBD5E1'/></svg>",
  },
  "1199600098765432": {
    patient_name: "Claude Niyomugabo",
    date_of_birth: "1996-02-21",
    gender: "Male",
    patient_photo:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='200' viewBox='0 0 160 200'><rect width='160' height='200' rx='24' fill='%23DBEAFE'/><circle cx='80' cy='66' r='28' fill='%2360A5FA'/><rect x='34' y='106' width='92' height='58' rx='18' fill='%2393C5FD'/></svg>",
  },
  "1199620011112222": {
    patient_name: "Vestine Mukamana",
    date_of_birth: "1998-06-02",
    gender: "Female",
    patient_photo:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='200' viewBox='0 0 160 200'><rect width='160' height='200' rx='24' fill='%23F8FAFC'/><circle cx='80' cy='68' r='28' fill='%23A78BFA'/><rect x='36' y='108' width='88' height='56' rx='18' fill='%23C4B5FD'/></svg>",
  },
};

export async function lookupNidaRecord(idNumber) {
  await new Promise((resolve) => setTimeout(resolve, 220));

  if (idNumber === "7777777777777777") {
    throw new Error("NIDA mock timeout");
  }

  const record = nidaFixtures[idNumber];
  if (!record) {
    return {
      success: false,
      source: "NIDA",
      message: "No patient found in the NIDA registry for the supplied ID.",
    };
  }

  return {
    success: true,
    source: "NIDA",
    conceptReference: "ID-RW-NIDA-16",
    data: record,
  };
}
