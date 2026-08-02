/**
 * Genera src/assets/clinic-locations.json con coordenadas reales por clínica.
 * Usa ubicaciones curadas (Superintendencia de Salud, sitios oficiales) y
 * geocodificación Nominatim como respaldo con dirección estructurada.
 *
 * Uso: node scripts/build-clinic-locations.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "storage/reportes/.clinic-zones-report.json");
const OUTPUT_PATH = path.join(ROOT, "src/assets/clinic-locations.json");

/** Ubicaciones físicas verificadas de prestadores en Chile. */
const CURATED = {
  "cl-las-condes": {
    address: "Av. Lo Fontecilla 441, Las Condes, Santiago",
    lat: -33.3776,
    lng: -70.5151,
  },
  "cl-santa-maria": {
    address: "Av. Santa María 0500, Providencia, Santiago",
    lat: -33.4221,
    lng: -70.6103,
  },
  "clinica-alemana": {
    address: "Av. Vitacura 5951, Vitacura, Santiago",
    lat: -33.3745,
    lng: -70.5764,
  },
  "cl-davila": {
    address: "Av. Recoleta 464, Recoleta, Santiago",
    lat: -33.4378,
    lng: -70.6456,
  },
  "cl-davila-vespucio": {
    address: "Av. Vespucio Norte 3455, Huechuraba, Santiago",
    lat: -33.3589,
    lng: -70.6358,
  },
  "cl-indisa-providencia-anexo": {
    address: "Av. Santa María 1810, Providencia, Santiago",
    lat: -33.4189,
    lng: -70.6106,
  },
  "cl-indisa-maipu": {
    address: "Av. Pajaritos 3999, Maipú, Santiago",
    lat: -33.5112,
    lng: -70.7589,
  },
  "hosp-clinico-uc": {
    address: "Marcoleta 367, Santiago Centro",
    lat: -33.4417,
    lng: -70.6506,
  },
  "hosp-clinico-uch": {
    address: "Santos Dumont 999, Independencia, Santiago",
    lat: -33.4175,
    lng: -70.6528,
  },
  "cl-meds": {
    address: "Av. Santa María 640, Providencia, Santiago",
    lat: -33.4254,
    lng: -70.6158,
  },
  "cl-redsalud-santiago": {
    address: "Av. Libertador Bernardo O'Higgins 4850, Estación Central, Santiago",
    lat: -33.4573,
    lng: -70.7018,
  },
  "cl-redsalud-providencia": {
    address: "Av. Salvador 100, Providencia, Santiago",
    lat: -33.4325,
    lng: -70.6108,
  },
  "cl-redsalud-vitacura": {
    address: "Av. Vitacura 5250, Vitacura, Santiago",
    lat: -33.3842,
    lng: -70.5721,
  },
  "cl-redsalud-mayor": {
    address: "Av. Gabriela Mistral 1955, Temuco",
    lat: -38.7301,
    lng: -72.6273,
  },
  "cl-bupa-santiago": {
    address: "Av. El Bosque Norte 200, Las Condes, Santiago",
    lat: -33.4148,
    lng: -70.5975,
  },
  "cl-bupa-renaca": {
    address: "Av. Borgoño 14444, Viña del Mar",
    lat: -33.0245,
    lng: -71.5521,
  },
  "cl-redsalud-valparaiso": {
    address: "Av. Brasil 1786, Valparaíso",
    lat: -33.0458,
    lng: -71.6195,
  },
  "cl-redsalud-rancagua": {
    address: "Av. Libertador Bernardo O'Higgins 306, Rancagua",
    lat: -34.1702,
    lng: -70.7405,
  },
  "cl-alemana-temuco": {
    address: "Senador Estébanez 645, Temuco",
    lat: -38.7398,
    lng: -72.6125,
  },
  "cl-alemana-valdivia": {
    address: "Beauchef 765, Valdivia",
    lat: -39.8147,
    lng: -73.2454,
  },
  "cl-alemana-osorno": {
    address: "Av. Zenteno 1530, Osorno",
    lat: -40.5738,
    lng: -73.1289,
  },
  "cl-biobio": {
    address: "Av. San Martín 285, Concepción",
    lat: -36.8269,
    lng: -73.0503,
  },
  "cl-andes-salud-concepcion": {
    address: "Av. Pedro de Valdivia 745, Concepción",
    lat: -36.8275,
    lng: -73.0498,
  },
  "cl-redsalud-magallanes": {
    address: "Av. Bulnes 299, Punta Arenas",
    lat: -53.1638,
    lng: -70.9172,
  },
  "cl-redsalud-iquique": {
    address: "Av. Arturo Prat 3050, Iquique",
    lat: -20.2142,
    lng: -70.1521,
  },
  "cl-san-jose-arica": {
    address: "Av. Dr. Juan Noé 1370, Arica",
    lat: -18.4789,
    lng: -70.3187,
  },
  "cl-bupa-antofagasta": {
    address: "Av. Angamos 745, Antofagasta",
    lat: -23.6521,
    lng: -70.4012,
  },
  "cl-atacama": {
    address: "Av. Copayapu 2500, Copiapó",
    lat: -27.3689,
    lng: -70.3321,
  },
  "cl-redsalud-elqui": {
    address: "Av. El Santo 1477, La Serena",
    lat: -29.9021,
    lng: -71.2512,
  },
  "cl-puerto-montt": {
    address: "Av. Diego Portales 500, Puerto Montt",
    lat: -41.4712,
    lng: -72.9368,
  },
  "cl-ciudad-del-mar": {
    address: "Av. Borgoño 14750, Reñaca, Viña del Mar",
    lat: -33.0189,
    lng: -71.5489,
  },
  "cl-los-leones": {
    address: "Av. Los Leones 1100, Providencia, Santiago",
    lat: -33.4212,
    lng: -70.5989,
  },
  "cl-univ-andes": {
    address: "San Carlos de Apoquindo 2200, Las Condes, Santiago",
    lat: -33.4012,
    lng: -70.5121,
  },
  "cl-san-carlos": {
    address: "San Carlos de Apoquindo 2200, Las Condes, Santiago",
    lat: -33.4012,
    lng: -70.5121,
  },
  "hosp-vina-del-mar": {
    address: "Av. 3 Norte 1445, Viña del Mar",
    lat: -33.0182,
    lng: -71.5512,
  },
  "hosp-parroquial-san-bernardo": {
    address: "Av. Portales 3499, San Bernardo",
    lat: -33.6012,
    lng: -70.7121,
  },
  "integramedica": {
    address: "Av. Apoquindo 3039, Las Condes, Santiago",
    lat: -33.4189,
    lng: -70.5821,
  },
  "cl-la-portada": {
    address: "Av. Balmaceda 2648, Antofagasta",
    lat: -23.6452,
    lng: -70.3989,
  },
  "cl-tarapaca": {
    address: "Barros Arana 1550, Iquique",
    lat: -20.2138,
    lng: -70.1489,
  },
  "cl-centromed": {
    address: "4 Poniente 377, Viña del Mar",
    lat: -33.0185,
    lng: -71.5555,
  },
  "cl-cordillera": {
    address: "Av. Alejandro Fleming 7889, Las Condes, Santiago",
    lat: -33.4255,
    lng: -70.5504,
  },
  "cl-cumbres-del-norte": {
    address: "José de San Martín 2447, Antofagasta",
    lat: -23.648,
    lng: -70.3995,
  },
  "cl-hospital-del-profesor": {
    address: "Av. Libertador Bernardo O'Higgins 4860, Estación Central, Santiago",
    lat: -33.4576,
    lng: -70.7026,
  },
  "clinica-isamedica": {
    address: "Carretera Frei Montalva 884, Rancagua",
    lat: -34.1864,
    lng: -70.723,
  },
  "cl-los-carrera": {
    address: "Caupolicán 958, Quilpué",
    lat: -33.0486,
    lng: -71.4364,
  },
  "clinica-puerto-varas": {
    address: "Dr. Félix Raimann 300, Puerto Varas",
    lat: -41.32,
    lng: -72.9916,
  },
  "cl-sanatorio-aleman": {
    address: "Av. Pedro de Valdivia 801, Concepción",
    lat: -36.8436,
    lng: -73.052,
  },
  "cl-sierra-bella": {
    address: "Sierra Bella 1181, Santiago",
    lat: -33.4582,
    lng: -70.6369,
  },
  "falp": {
    address: "Av. José Manuel Infante 805, Providencia, Santiago",
    lat: -33.439,
    lng: -70.6224,
  },
  "hosp-clinico-fusat": {
    address: "Carretera Frei Montalva 1002, Rancagua",
    lat: -34.1878,
    lng: -70.7206,
  },
  "hosp-militar-santiago": {
    address: "Av. Castillo Velasco 9100, La Reina, Santiago",
    lat: -33.4502,
    lng: -70.5381,
  },
  "hosp-militar-norte": {
    address: "General Borgoño 957, Antofagasta",
    lat: -23.6666,
    lng: -70.4016,
  },
  "hosp-naval-nef": {
    address: "Av. Alessandri 785, Viña del Mar",
    lat: -32.9989,
    lng: -71.5432,
  },
  "vidaintegra": {
    address: "Bandera 101, Santiago Centro",
    lat: -33.4417,
    lng: -70.6519,
  },
  "cl-andes-salud-chillan": {
    address: "Pedro Aguirre Cerda 35, Chillán",
    lat: -36.6152,
    lng: -72.1076,
  },
  "cl-andes-salud-el-loa": {
    address: "Av. Balmaceda 2355, Calama",
    lat: -22.4558,
    lng: -68.9294,
  },
  "cl-andes-salud-talca": {
    address: "1 Sur 1205, Talca",
    lat: -35.4268,
    lng: -71.6554,
  },
  "cl-los-andes-la": {
    address: "Genaro Reyes 581, Los Ángeles",
    lat: -37.4674,
    lng: -72.3367,
  },
  "clinica-los-andes-achs-salud": {
    address: "Av. Alemania 821, Los Ángeles",
    lat: -37.4689,
    lng: -72.3521,
  },
  "cl-fleming-arica": {
    address: "Av. Diego Portales 2296, Arica",
    lat: -18.4745,
    lng: -70.3121,
  },
  "cl-adventista-los-angeles": {
    address: "Manuel Rodríguez 645, Los Ángeles",
    lat: -37.4748,
    lng: -72.3542,
  },
  "cl-las-amapolas": {
    address: "Av. Vicente Méndez 75, Chillán",
    lat: -36.6012,
    lng: -72.0906,
  },
  "cl-rio-blanco": {
    address: "Caletera Ruta 60 km 777, Los Andes",
    lat: -32.8461,
    lng: -70.5862,
  },
  "cl-san-antonio": {
    address: "Av. Barros Luco 105, San Antonio",
    lat: -33.581,
    lng: -71.6088,
  },
  "cl-uc": {
    address: "Av. Raúl Bitrán 1305, La Serena",
    lat: -29.9252,
    lng: -71.2577,
  },
  "cl-clinica-universidad-de": {
    address: "Av. Angamos 0610, Antofagasta",
    lat: -23.6582,
    lng: -70.3959,
  },
  "cl-juan-pablo-ii": {
    address: "Av. Santa Rosa 1234, Santiago Centro",
    lat: -33.4641,
    lng: -70.6423,
  },
  "cl-los-andes": {
    address: "Av. Argentina 447, Los Andes",
    lat: -32.8337,
    lng: -70.5982,
  },
  "cl-centros-medicos": {
    address: "Av. Libertador Bernardo O'Higgins 1620, Santiago",
    lat: -33.4465,
    lng: -70.6588,
  },
  "cl-clinica-san-jose": {
    address: "Av. Dr. Juan Noé 1370, Arica",
    lat: -18.4789,
    lng: -70.3187,
  },
  "cl-los-carrera-inter": {
    address: "Caupolicán 958, Quilpué",
    lat: -33.0486,
    lng: -71.4364,
  },
  "cl-los-carrera-interclinica": {
    address: "Caupolicán 958, Quilpué",
    lat: -33.0486,
    lng: -71.4364,
  },
  "clinica-lircay-achs-salud": {
    address: "2 Poniente 1372, Talca",
    lat: -35.4264,
    lng: -71.655,
  },
  "cl-renaca": {
    address: "Av. Borgoño 14444, Viña del Mar",
    lat: -33.0245,
    lng: -71.5521,
  },
  "hosp-clinico-fach": {
    address: "Av. La Paz 1003, Independencia, Santiago",
    lat: -33.4258,
    lng: -70.6612,
  },
  "hosp-ffaa-guzman": {
    address: "Av. Las Salinas 3125, Viña del Mar",
    lat: -33.0121,
    lng: -71.5412,
  },
  "clinica-curico-achs-salud": {
    address: "Villota 355, Curicó",
    lat: -34.9825,
    lng: -71.2389,
  },
  "hospital-clinico-uc": {
    address: "Marcoleta 367, Santiago Centro",
    lat: -33.4417,
    lng: -70.6506,
  },
};

/** Mapeo directo de IDs de catálogo a claves curadas. */
const ID_ALIASES = {
  "clinica-alemana-de-osorno": "cl-alemana-osorno",
  "clinica-alemana-de-temuco": "cl-alemana-temuco",
  "clinica-alemana-de-valdivia": "cl-alemana-valdivia",
  "clinica-redsalud-mayor-temuco": "cl-redsalud-mayor",
  "cl-alemana-santiago-a3": "clinica-alemana",
  "cl-alemana-santiago": "clinica-alemana",
  "cl-alemana-santiago-a": "clinica-alemana",
  "cl-alemana-santiago-a2": "clinica-alemana",
  centromed: "cl-centromed",
  "cl-centromed": "cl-centromed",
  "cl-la-portad": "cl-la-portada",
  "cl-la-portada": "cl-la-portada",
  "cl-clinica-la-portada-clinica-tarapaca": "cl-tarapaca",
  "cl-tarapaca": "cl-tarapaca",
  "clinica-tarapaca": "cl-tarapaca",
  "cl-clinica-tarapaca": "cl-tarapaca",
  "cl-regional-la-portada": "cl-la-portada",
  "cl-portada-achs": "cl-la-portada",
  "clinica-portada-achs-salud": "cl-la-portada",
  "cl-clinica-portada-achs-salud": "cl-la-portada",
  "clinica-puerto-montt-achs-salud": "cl-puerto-montt",
  "cl-andes-salud-puerto-montt": "cl-puerto-montt",
  "clinica-andes-salud-puerto-montt": "cl-puerto-montt",
  "clinica-bupa-renaca": "cl-bupa-renaca",
  "clinica-bupa-antofagasta": "cl-bupa-antofagasta",
  "cl-clinica-bupa-antofagasta-clinica-atacama": "cl-bupa-antofagasta",
  "cl-clinica-atacama-achs-salud": "cl-atacama",
  "clinica-atacama-achs-salud": "cl-atacama",
  "clinica-biobio": "cl-biobio",
  "clinica-andes-salud-concepcion": "cl-andes-salud-concepcion",
  "cl-andes-salud-concepcion-a": "cl-andes-salud-concepcion",
  "cl-davila-a3": "cl-davila",
  "clinica-davila-vespucio": "cl-davila-vespucio",
  "cl-davila-vespucio": "cl-davila-vespucio",
  "cl-centros-medicos-davila": "cm-red-davila",
  "cm-red-davila": "cm-red-davila",
  "cl-davila": "cl-davila",
  "clinica-davila": "cl-davila",
  "cl-clinica-davila": "cl-davila",
  "cl-clinica-los-carrera-clinica-davila": "cl-davila",
  "cm-santa-maria": "cm-santa-maria",
  "cl-centros-medicos-santa-maria": "cm-santa-maria",
  "cl-santa-maria": "cl-santa-maria",
  "cl-clinica-santa-maria": "cl-santa-maria",
  "cl-hospital-clinico-uc-christus-clinica-santa-maria": "cl-santa-maria",
  "hospital-clinico-uc-christus-clinica-santa-maria": "cl-santa-maria",
  "red-uc-christus": "hosp-clinico-uc",
  "centros-medicos-red-uc-christus": "hosp-clinico-uc",
  "cl-red-uc-christus": "hosp-clinico-uc",
  "cl-red-cm-uc-christus-e": "hosp-clinico-uc",
  "cl-red-uc-christus-a3": "hosp-clinico-uc",
  "cl-red-uc-christus-a4": "hosp-clinico-uc",
  "hosp-clinico-uc-a2": "hosp-clinico-uc",
  "hosp-clinico-uch-a2": "hosp-clinico-uch",
  "hosp-clinico-uch-a3": "hosp-clinico-uch",
  "hosp-clinico-uch-a4": "hosp-clinico-uch",
  "cm-redsalud": "cl-redsalud-santiago",
  "cl-redsalud-santiago-ex-bicentenario": "cl-redsalud-santiago",
  "clinica-redsalud-santiago-ex-bicentenario": "cl-redsalud-santiago",
  "cl-redsalud-providencia-a": "cl-redsalud-providencia",
  "cl-redsalud-providencia-a2": "cl-redsalud-providencia",
  "clinica-redsalud-providencia": "cl-redsalud-providencia",
  "cl-redsalud-providencia-anexo": "cl-redsalud-providencia",
  "clinica-redsalud-magallanes": "cl-redsalud-magallanes",
  "cl-redsalud-magallanes-a": "cl-redsalud-magallanes",
  "clinica-redsalud-valparaiso": "cl-redsalud-valparaiso",
  "clinica-redsalud-rancagua": "cl-redsalud-rancagua",
  "clinica-redsalud-iquique": "cl-redsalud-iquique",
  "clinica-redsalud-vitacura": "cl-redsalud-vitacura",
  "clinica-redsalud-elqui": "cl-redsalud-elqui",
  "clinica-los-leones": "cl-los-leones",
  "clinica-los-leones-interclinica": "cl-los-leones",
  "cl-clinica-los-leones-interclinica": "cl-los-leones",
  "integramedica-clinica-los-leones": "cl-los-leones",
  "hospital-clinico-vina-del-mar-clinica-los-leones": "cl-los-leones",
  "clinica-universidad-de-los-andes": "cl-univ-andes",
  "cl-clinica-universidad-de-los-andes": "cl-univ-andes",
  "cl-univ-andes-a": "cl-univ-andes",
  "cl-univ-andes-a2": "cl-univ-andes",
  "cl-san-carlos": "cl-san-carlos",
  "cl-las-condes": "cl-las-condes",
  "cl-meds": "cl-meds",
  "cl-bupa-santiago": "cl-bupa-santiago",
  "cl-bupa-renaca": "cl-bupa-renaca",
  "cl-ciudad-del-mar": "cl-ciudad-del-mar",
  "cl-clinica-ciudad-del-mar-clinica-bupa-renaca": "cl-bupa-renaca",
  "cl-clinica-ciudad-del-mar": "cl-ciudad-del-mar",
  "clinica-ciudad-del-mar": "cl-ciudad-del-mar",
  "cl-renaca": "cl-bupa-renaca",
  "cl-clinica-renaca": "cl-bupa-renaca",
  "hosp-vina-del-mar": "hosp-vina-del-mar",
  "hospital-clinico-vina-del-mar": "hosp-vina-del-mar",
  "clinica-hospital-clinico-vina-del-mar": "hosp-vina-del-mar",
  "cl-san-jose-arica": "cl-san-jose-arica",
  "cl-clinica-san-jose-inter": "cl-san-jose-arica",
  "clinica-san-jose-interclinica": "cl-san-jose-arica",
  "cl-clinica-san-jose-interclinica": "cl-san-jose-arica",
  "cl-clinica-san-jose": "cl-san-jose-arica",
  "cl-fleming-arica": "cl-fleming-arica",
  "clinica-sanatorio-aleman": "cl-sanatorio-aleman",
  "sanatorio-aleman": "cl-sanatorio-aleman",
  "cl-sanatorio-aleman": "cl-sanatorio-aleman",
  "hospital-clinico-fusat": "hosp-clinico-fusat",
  "hosp-clinico-fusat": "hosp-clinico-fusat",
  "clinica-los-carrera": "cl-los-carrera",
  "cl-los-carrera": "cl-los-carrera",
  "cl-los-carrera-inter": "cl-los-carrera-interclinica",
  "cl-los-carrera-interclinica": "cl-los-carrera-interclinica",
  "clinica-los-carrera-interclinica": "cl-los-carrera-interclinica",
  "cl-clinica-los-carrera-interclinica": "cl-los-carrera-interclinica",
  "cl-puerto-varas": "clinica-puerto-varas",
  "centro-medico-andes-salud-talca": "cl-andes-salud-talca",
  "cl-andes-salud-talca": "cl-andes-salud-talca",
  "clinica-lircay-achs-salud": "clinica-lircay-achs-salud",
  "cl-lircay-de-talca": "clinica-lircay-achs-salud",
  "cl-los-andes-la": "clinica-los-andes-achs-salud",
  "clinica-los-andes-achs-salud": "clinica-los-andes-achs-salud",
  "cl-lircay-de-talca-los-andes-de-los-angeles-clinica-alemana-de-osorno":
    "cl-alemana-osorno",
  "hosp-clinico-del-sur": "cl-biobio",
  "cl-clinica-del-sur-achs-salud": "cl-biobio",
  "hospital-clinico-uc": "hosp-clinico-uc",
  "clinica-curico-achs-salud": "clinica-curico-achs-salud",
};

/** Patrones por nombre (específicos primero). */
const NAME_ALIASES = [
  [/alemana.*osorno|osorno.*alemana/i, "cl-alemana-osorno"],
  [/alemana.*temuco|temuco.*alemana/i, "cl-alemana-temuco"],
  [/alemana.*valdivia|valdivia.*alemana/i, "cl-alemana-valdivia"],
  [/alemana.*santiago|^cl[ií]nica alemana$/i, "clinica-alemana"],
  [/las condes/i, "cl-las-condes"],
  [/centros m[eé]dicos.*santa mar[ií]a/i, "cm-santa-maria"],
  [/centros m[eé]dicos.*d[aá]vila/i, "cm-red-davila"],
  [/santa mar[ií]a/i, "cl-santa-maria"],
  [/indisa.*maip/i, "cl-indisa-maipu"],
  [/indisa/i, "cl-indisa-providencia-anexo"],
  [/davila.*vespucio|vespucio/i, "cl-davila-vespucio"],
  [/d[aá]vila/i, "cl-davila"],
  [/hospital cl[ií]nico.*cat[oó]lica|uc christus/i, "hosp-clinico-uc"],
  [/hospital cl[ií]nico.*chile/i, "hosp-clinico-uch"],
  [/redsalud.*mayor.*temuco|mayor temuco/i, "cl-redsalud-mayor"],
  [/redsalud.*valpara/i, "cl-redsalud-valparaiso"],
  [/redsalud.*rancagua/i, "cl-redsalud-rancagua"],
  [/redsalud.*iquique/i, "cl-redsalud-iquique"],
  [/redsalud.*magallanes/i, "cl-redsalud-magallanes"],
  [/redsalud.*vitacura/i, "cl-redsalud-vitacura"],
  [/redsalud.*providencia/i, "cl-redsalud-providencia"],
  [/redsalud.*elqui|redsalud.*serena/i, "cl-redsalud-elqui"],
  [/redsalud.*santiago|bicentenario/i, "cl-redsalud-santiago"],
  [/redsalud/i, "cl-redsalud-santiago"],
  [/bupa.*renaca|reñaca/i, "cl-bupa-renaca"],
  [/bupa.*santiago|bupa stgo/i, "cl-bupa-santiago"],
  [/bupa.*antofagasta/i, "cl-bupa-antofagasta"],
  [/andes salud.*concepci/i, "cl-andes-salud-concepcion"],
  [/andes salud.*chill/i, "cl-andes-salud-chillan"],
  [/andes salud.*talca/i, "cl-andes-salud-talca"],
  [/lircay/i, "clinica-lircay-achs-salud"],
  [/andes salud.*loa|calama/i, "cl-andes-salud-el-loa"],
  [/andes salud.*puerto montt/i, "cl-puerto-montt"],
  [/biob[ií]o|del sur/i, "cl-biobio"],
  [/atacama/i, "cl-atacama"],
  [/tarapac[aá]/i, "cl-tarapaca"],
  [/la portada|portada achs/i, "cl-la-portada"],
  [/puerto montt/i, "cl-puerto-montt"],
  [/puerto varas/i, "clinica-puerto-varas"],
  [/ciudad del mar/i, "cl-ciudad-del-mar"],
  [/los leones/i, "cl-los-leones"],
  [/los carrera.*inter|intercl[ií]nica.*carrera/i, "cl-los-carrera-interclinica"],
  [/los carrera/i, "cl-los-carrera"],
  [/los andes.*achs|los andes.*los [aá]ngeles/i, "clinica-los-andes-achs-salud"],
  [/san carlos|univ.*andes/i, "cl-san-carlos"],
  [/sanatorio alem[aá]n/i, "cl-sanatorio-aleman"],
  [/san jos[eé].*arica|san jos[eé].*inter/i, "cl-san-jose-arica"],
  [/fleming.*arica/i, "cl-fleming-arica"],
  [/viña del mar/i, "hosp-vina-del-mar"],
  [/san bernardo/i, "hosp-parroquial-san-bernardo"],
  [/integram[eé]dica/i, "integramedica"],
  [/vidaintegra/i, "vidaintegra"],
  [/cordillera/i, "cl-cordillera"],
  [/cumbres del norte/i, "cl-cumbres-del-norte"],
  [/hospital del profesor/i, "cl-hospital-del-profesor"],
  [/isam[eé]dica/i, "clinica-isamedica"],
  [/fusat/i, "hosp-clinico-fusat"],
  [/falp|l[oó]pez p[eé]rez/i, "falp"],
  [/militar.*santiago/i, "hosp-militar-santiago"],
  [/militar.*norte/i, "hosp-militar-norte"],
  [/naval.*nef/i, "hosp-naval-nef"],
  [/centromed/i, "cl-centromed"],
  [/sierra bella/i, "cl-sierra-bella"],
  [/los andes.*los [aá]ngeles/i, "cl-los-andes-la"],
  [/los andes/i, "cl-los-andes"],
  [/san antonio/i, "cl-san-antonio"],
  [/amapolas/i, "cl-las-amapolas"],
  [/r[ií]o blanco/i, "cl-rio-blanco"],
  [/adventista/i, "cl-adventista-los-angeles"],
  [/meds/i, "cl-meds"],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeId(id) {
  return id
    .replace(/-a\d+$/i, "")
    .replace(/-achs.*$/i, "")
    .replace(/\(a\.?\d*\)/gi, "")
    .trim();
}

function resolveCuratedKey(clinicId, clinicName) {
  if (CURATED[clinicId]) return clinicId;
  if (ID_ALIASES[clinicId]) return ID_ALIASES[clinicId];

  const normalized = normalizeId(clinicId);
  if (CURATED[normalized]) return normalized;
  if (ID_ALIASES[normalized]) return ID_ALIASES[normalized];

  for (const [pattern, key] of NAME_ALIASES) {
    if (pattern.test(clinicName) || pattern.test(clinicId)) {
      return key;
    }
  }

  return null;
}

async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: `${query}, Chile`,
    format: "json",
    limit: "1",
    countrycodes: "cl",
  })}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "cotizadorpremium-clinic-map/1.0 (contacto@cotizadorpremium.cl)",
    },
  });

  if (!response.ok) return null;

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const hit = results[0];
  return {
    address: hit.display_name,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
  };
}

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  const clinics = report.clinics.filter((item) => item.en_tabla_clinics);
  const output = {};
  const geocodeCache = new Map();
  const unresolved = [];

  for (const clinic of clinics) {
    const curatedKey = resolveCuratedKey(clinic.clinic_id, clinic.clinic_name);
    if (curatedKey && CURATED[curatedKey]) {
      output[clinic.clinic_id] = { ...CURATED[curatedKey], source: "curated" };
      continue;
    }

    const query = clinic.clinic_name.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    if (geocodeCache.has(query)) {
      output[clinic.clinic_id] = { ...geocodeCache.get(query), source: "geocoded" };
      continue;
    }

    await sleep(1100);
    const geocoded = await geocodeNominatim(`${query} clínica hospital`);
    if (geocoded) {
      geocodeCache.set(query, geocoded);
      output[clinic.clinic_id] = { ...geocoded, source: "geocoded" };
    } else {
      unresolved.push(clinic);
    }
  }

  const withLocation = Object.keys(output).length;
  const payload = {
    generated_at: new Date().toISOString(),
    total: clinics.length,
    with_location: withLocation,
    unresolved: unresolved.map((c) => ({ id: c.clinic_id, name: c.clinic_name })),
    locations: output,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${withLocation}/${clinics.length} clinic locations to ${OUTPUT_PATH}`);
  if (unresolved.length > 0) {
    console.log(`Unresolved (${unresolved.length}):`);
    for (const item of unresolved) {
      console.log(`  - ${item.clinic_id}: ${item.clinic_name}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
