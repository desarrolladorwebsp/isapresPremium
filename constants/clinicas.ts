export type Clinica = {
  id: string;
  name: string;
  description: string;
  region: string;
  image: string;
  logo: string;
};

const BASE = "/images/clinicas";

export const CLINICAS: Clinica[] = [
  {
    id: "indisa",
    name: "Clínica Indisa",
    description:
      "Clínica privada ubicada en Providencia, conocida por su alta capacidad hospitalaria, urgencias y atención multidisciplinaria.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-indisa.jpeg`,
    logo: `${BASE}/logo-clinica-indisa.png`,
  },
  {
    id: "alemana",
    name: "Clínica Alemana",
    description:
      "Centro de salud privado de alta complejidad en Santiago, reconocido por su excelencia médica, tecnología avanzada y atención integral.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-alemana.jpg`,
    logo: `${BASE}/logo-clinica-alemana.png`,
  },
  {
    id: "santa-maria",
    name: "Clínica Santa María",
    description:
      "Clínica privada ubicada en Providencia, destacada por su servicio de urgencias, maternidad y diversas especialidades médicas.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-santa-maria.jpg`,
    logo: `${BASE}/logo-clinica-santa-maria.jpg`,
  },
  {
    id: "davila",
    name: "Clínica Dávila",
    description:
      "Institución de salud en Santiago con amplia cobertura en hospitalización, cirugía y consultas médicas de distintas especialidades.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-davila.jpg`,
    logo: `${BASE}/logo-clinica-davila.jpg`,
  },
  {
    id: "uc-christus",
    name: "Hospital UC Christus",
    description:
      "Hospital universitario ligado a la Pontificia Universidad Católica, que combina docencia, investigación y atención médica de primer nivel.",
    region: "Región Metropolitana",
    image: `${BASE}/hospital-uc-christus.jpg`,
    logo: `${BASE}/logo-hospital-uc-christus.webp`,
  },
  {
    id: "redsalud-vitacura",
    name: "RedSalud Vitacura",
    description:
      "Centro médico ambulatorio de la red RedSalud, enfocado en consultas, exámenes y procedimientos en un ambiente cercano.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-redsalud-vitacura.jpeg`,
    logo: `${BASE}/logo-redsalud-vitacura.png`,
  },
  {
    id: "redsalud-santiago",
    name: "RedSalud Santiago",
    description:
      "Clínica privada ubicada en el centro de Santiago, con servicios de hospitalización, urgencias y especialidades médicas.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-redsalud-santiago.jpeg`,
    logo: `${BASE}/logo-redsalud-santiago.jpeg`,
  },
  {
    id: "redsalud-providencia",
    name: "RedSalud Providencia",
    description:
      "Clínica de la red RedSalud que ofrece atención integral en consultas, cirugías y hospitalización en el sector oriente.",
    region: "Región Metropolitana",
    image: `${BASE}/clinica-redsalud-providencia.jpeg`,
    logo: `${BASE}/logo-redsalud-providencia.jpeg`,
  },
  {
    id: "alemana-temuco",
    name: "Clínica Alemana de Temuco",
    description:
      "Sede regional de Clínica Alemana, con servicios de alta complejidad y especialidades médicas en la Región de La Araucanía.",
    region: "Región Araucanía",
    image: `${BASE}/clinica-alemana-temuco.jpg`,
    logo: `${BASE}/logo-clinica-alemana-temuco.jpg`,
  },
  {
    id: "redsalud-temuco",
    name: "RedSalud Temuco",
    description:
      "Clínica regional de la red RedSalud, con enfoque en atención ambulatoria y hospitalaria para pacientes del sur del país.",
    region: "Región Araucanía",
    image: `${BASE}/clinica-redsalud-temuco.jpg`,
    logo: `${BASE}/logo-redsalud-temuco.jpeg`,
  },
  {
    id: "bupa-antofagasta",
    name: "Clínica Bupa Antofagasta",
    description:
      "Clínica privada en el norte de Chile, parte de la red Bupa, con amplia gama de especialidades y servicios médicos.",
    region: "Región Antofagasta",
    image: `${BASE}/clinica-bupa-antofagasta.jpg`,
    logo: `${BASE}/logo-clinica-bupa-antofagasta.jpg`,
  },
];
