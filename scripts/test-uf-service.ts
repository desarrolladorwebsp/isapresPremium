import { fetchUfIndicator } from "../lib/uf-service";

async function main() {
  const indicator = await fetchUfIndicator({ force: true });
  console.log("UF obtenida:", indicator);
}

main().catch((error) => {
  console.error("test-uf-service falló:", error);
  process.exit(1);
});
