import {
  PUBLIC_API_BASE_PATH,
  PUBLIC_API_KEY_HEADER,
  PUBLIC_API_PLANS_PREVIEW_LIMIT,
  PUBLIC_API_VERSION,
} from "@/lib/public-api/constants";
import {
  getDeepLinkDocumentation,
  getSolicitarDeepLinkDocumentation,
} from "@/lib/deep-link/build-cotizador-url";

function resolveBaseUrl(request: Request): string {
  const configured = process.env.PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return `https://cotizador.cotizaloantes.cl${PUBLIC_API_BASE_PATH}`;
  }

  return `${protocol}://${host}${PUBLIC_API_BASE_PATH}`;
}

export function buildPublicApiAgentGuide(request: Request) {
  const baseUrl = resolveBaseUrl(request);

  return {
    api: {
      name: "Cotizador Isapres — API pública",
      version: PUBLIC_API_VERSION,
      base_url: baseUrl,
      status: "beta",
      description:
        "API para integradores y agentes de IA. Expone listado de planes y documentación de deep links para redirigir usuarios al cotizador web con parámetros en la URL.",
    },
    authentication: {
      required: true,
      methods: [
        {
          type: "bearer",
          header: "Authorization",
          format: "Bearer <PUBLIC_API_SECRET>",
          example: "Authorization: Bearer tu-clave-secreta",
        },
        {
          type: "api_key",
          header: PUBLIC_API_KEY_HEADER,
          format: "<PUBLIC_API_SECRET>",
          example: `${PUBLIC_API_KEY_HEADER}: tu-clave-secreta`,
        },
      ],
      notes: [
        "Toda solicitud a endpoints de datos debe incluir la clave secreta.",
        "La clave se configura en el servidor como PUBLIC_API_SECRET.",
        "No compartas la clave en repositorios públicos ni en el frontend del cliente.",
        "Ante 401 INVALID_API_SECRET o MISSING_API_SECRET, verifica la cabecera.",
      ],
    },
    endpoints: [
      {
        method: "GET",
        path: `${baseUrl}/docs`,
        summary: "Esta guía (autodocumentación para agentes e integradores)",
        auth_required: true,
      },
      {
        method: "GET",
        path: `${baseUrl}/plans`,
        summary: "Listado completo de planes de salud con coberturas",
        auth_required: true,
        response: {
          content_type: "application/json",
          shape: {
            data: "HealthPlan[]",
            meta: { total: "number", version: "string" },
          },
        },
      },
      {
        method: "GET",
        path: `${baseUrl}/plans/preview`,
        summary: `Vista previa de ${PUBLIC_API_PLANS_PREVIEW_LIMIT} planes (ligera, recomendada para integraciones)`,
        auth_required: true,
        response: {
          content_type: "application/json",
          shape: {
            data: "HealthPlanSummary[]",
            meta: {
              total: "number",
              limit: "number",
              offset: "number",
              version: "string",
            },
          },
          notes: [
            `Devuelve exactamente ${PUBLIC_API_PLANS_PREVIEW_LIMIT} planes ordenados por nombre.`,
            "Usa coverage_summary en lugar del array coverage completo para reducir el payload.",
            "Para el catálogo completo con coberturas por clínica, usa GET /plans.",
          ],
        },
      },
      {
        method: "POST",
        path: `${baseUrl}/cotizador/url`,
        summary:
          "Genera la URL de redirección al cotizador completo con criterios de búsqueda en query params",
        auth_required: true,
        request: {
          content_type: "application/json",
          shape: {
            agent: "string — agent key / embed key del socio (premium: ?agent=)",
            entidad: "string — alias legacy de agent",
            region: "string",
            edad: "number",
            sexo: "m | f (opcional, obsoleto)",
            ingreso: "string — CLP sin formato",
            cargas: "number[] — edades de cargas",
            q: "string — búsqueda por nombre/código/isapre",
            precioMin: "number — UF",
            precioMax: "number — UF",
            isapres: "string[]",
            zonas: "string[]",
            tipoPlan: "string[]",
            clinicaH: "string[] — clinic_id para cobertura hospitalaria",
            clinicaA: "string[] — clinic_id para cobertura ambulatoria",
            clinica: "string[] — legacy, misma lista en ambos tipos",
            coberturaH: "number",
            coberturaA: "number",
            orden: "price_asc | price_desc | coverage",
            moneda: "clp | uf",
            email: "string",
            auto: "boolean — default true",
            baseUrl: "string — URL base del cotizador (opcional)",
          },
        },
        response: {
          content_type: "application/json",
          shape: {
            data: {
              url: "string — URL completa para redirigir al usuario",
              agent: "string | null",
              has_quote_criteria: "boolean",
              instructions: "string",
            },
          },
        },
      },
      {
        method: "POST",
        path: `${baseUrl}/solicitar/url`,
        summary:
          "Genera la URL de redirección al cotizador para abrir el modal de solicitud de un plan",
        auth_required: true,
        request: {
          content_type: "application/json",
          required_fields: ["plan"],
          shape: {
            plan: "string — unique_code del plan (obligatorio)",
            entidad: "string — slug del aliado (ej. cotizaloantes)",
            vista: "solicitar | precio | overview (default: solicitar)",
            region: "string",
            edad: "number",
            sexo: "m | f (opcional, obsoleto — ya no requerido en la UI)",
            ingreso: "string — CLP sin formato",
            cargas: "number[] — edades de cargas",
            nombre: "string",
            rut: "string",
            email: "string",
            telefono: "string",
            auto: "boolean — búsqueda automática al cargar",
            baseUrl: "string — URL base del cotizador (opcional)",
          },
        },
        response: {
          content_type: "application/json",
          shape: {
            data: {
              url: "string — URL completa para redirigir al usuario",
              plan: "string",
              vista: "string",
              entidad: "string | null",
              has_quote_criteria: "boolean",
              has_contact_prefill: "boolean",
              instructions: "string",
            },
            meta: { endpoint: "string", version: "string" },
          },
        },
      },
      {
        method: "GET",
        path: `${baseUrl.replace(/\/api\/public\/v1$/, "")}/api/public/v1/ui/filters`,
        summary:
          "Guía de filtros del cotizador — zonas, tipos de plan y clínicas (sin autenticación)",
        auth_required: false,
        response: {
          content_type: "application/json",
          description:
            "Definición de zonas/sectores, tipos de plan, filtro de clínicas (clinicaH/clinicaA), lógica de filtrado, limpiar filtros, deep links y textos ui_help. Versión actual: 1.2.0.",
        },
      },
      {
        method: "GET",
        path: `${baseUrl.replace(/\/api\/public\/v1$/, "")}/api/public/v1/ui/plan-card`,
        summary:
          "Guía de estilos UI para cards de planes (sin autenticación — para diseño e integraciones visuales)",
        auth_required: false,
        query_params: {
          brand: "default | cotizalo-antes (default: cotizalo-antes)",
        },
        response: {
          content_type: "application/json",
          description:
            "Tokens de color, elevación (sombras/bordes/superficies), layout, tipografía, badges, botones y reglas do/dont para replicar PublicPlanCard. Versión actual: 1.1.0.",
        },
      },
    ],
    cotizador_deep_link: getDeepLinkDocumentation(
      process.env.PUBLIC_API_BASE_URL?.replace(/\/api\/public\/v1\/?$/, "") ??
        "https://cotizador.cotizaloantes.cl",
    ),
    solicitar_deep_link: getSolicitarDeepLinkDocumentation(
      process.env.PUBLIC_API_BASE_URL?.replace(/\/api\/public\/v1\/?$/, "") ??
        "https://cotizador.cotizaloantes.cl",
    ),
    health_plan_schema: {
      type: "object",
      required: [
        "isapre",
        "plan_name",
        "unique_code",
        "base_price_uf",
        "plan_type",
        "has_top",
        "coverage",
      ],
      properties: {
        isapre: { type: "string", description: "Nombre de la Isapre." },
        plan_name: { type: "string", description: "Nombre comercial del plan." },
        unique_code: {
          type: "string",
          description: "Identificador único del plan (PK).",
        },
        base_price_uf: {
          type: "number",
          description: "Precio base en UF (Unidad de Fomento).",
        },
        plan_type: {
          type: "string",
          enum: ["preferred", "free_choice", "closed"],
          description: "Modalidad del plan: preferente, libre elección o cerrado.",
        },
        has_top: {
          type: "boolean",
          description: "Indica si el plan incluye cobertura TOP (alineado a preferente).",
        },
        additional_notes: {
          type: "string",
          nullable: true,
          description: "Notas adicionales del plan.",
        },
        pdf_url: {
          type: "string",
          nullable: true,
          description:
            "URL del PDF cuando está disponible (puede ser absoluta o relativa). Descarga vía API próximamente.",
        },
        pdf_public_id: {
          type: "string",
          nullable: true,
          description: "Identificador interno del PDF en almacenamiento.",
        },
        coverage: {
          type: "array",
          description: "Coberturas por clínica/prestador.",
          items: {
            type: "object",
            properties: {
              clinic_id: { type: "string" },
              clinic_name: { type: "string" },
              percentage: { type: "integer", minimum: 0, maximum: 100 },
              type: {
                type: "string",
                enum: ["hospitalaria", "ambulatoria"],
              },
            },
          },
        },
      },
    },
    examples: {
      list_plans_curl: `curl -s "${baseUrl}/plans" \\
  -H "Authorization: Bearer $PUBLIC_API_SECRET"`,
      list_plans_fetch: `fetch("${baseUrl}/plans", {
  headers: { Authorization: "Bearer " + process.env.PUBLIC_API_SECRET }
})`,
      preview_plans_curl: `curl -s "${baseUrl}/plans/preview" \\
  -H "Authorization: Bearer $PUBLIC_API_SECRET"`,
      preview_plans_fetch: `fetch("${baseUrl}/plans/preview", {
  headers: { Authorization: "Bearer " + process.env.PUBLIC_API_SECRET }
})`,
      build_solicitar_url_curl: `curl -s -X POST "${baseUrl}/solicitar/url" \\
  -H "Authorization: Bearer $PUBLIC_API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entidad": "cotizaloantes",
    "plan": "CONSALUD-PLAN-EJEMPLO",
    "region": "rm",
    "edad": 34,
    "sexo": "m",
    "ingreso": "1500000",
    "nombre": "María González",
    "email": "maria@ejemplo.cl",
    "telefono": "+56912345678",
    "vista": "solicitar",
    "auto": true
  }'`,
      build_solicitar_url_fetch: `const response = await fetch("${baseUrl}/solicitar/url", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.PUBLIC_API_SECRET,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    entidad: "cotizaloantes",
    plan: "CONSALUD-PLAN-EJEMPLO",
    region: "rm",
    edad: 34,
    sexo: "m",
    ingreso: "1500000",
    nombre: "María González",
    email: "maria@ejemplo.cl",
    telefono: "+56912345678",
    vista: "solicitar",
    auto: true,
  }),
});
const { data } = await response.json();
window.location.href = data.url;`,
    },
    errors: [
      { status: 401, code: "MISSING_API_SECRET", message: "Falta la clave." },
      { status: 401, code: "INVALID_API_SECRET", message: "Clave incorrecta." },
      {
        status: 503,
        code: "PUBLIC_API_NOT_CONFIGURED",
        message: "PUBLIC_API_SECRET no configurada en el servidor.",
      },
    ],
    roadmap: [
      "GET /plans/{uniqueCode}/pdf — descarga de PDF con la misma autenticación.",
      "GET /plans/search — búsqueda paginada con filtros.",
    ],
    openapi: buildOpenApiDocument(baseUrl),
  } as const;
}

function buildOpenApiDocument(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Cotizador Isapres API",
      version: PUBLIC_API_VERSION,
      description:
        "API pública del cotizador de planes Isapre. Autenticación obligatoria con PUBLIC_API_SECRET. Para enviar usuarios al cotizador con datos prellenados, consulta el objeto cotizador_deep_link en GET /docs (no requiere API key).",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Valor de PUBLIC_API_SECRET",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: PUBLIC_API_KEY_HEADER,
          description: "Valor de PUBLIC_API_SECRET",
        },
      },
      schemas: {
        CoverageEntry: {
          type: "object",
          required: ["clinic_id", "clinic_name", "percentage", "type"],
          properties: {
            clinic_id: { type: "string" },
            clinic_name: { type: "string" },
            percentage: { type: "integer" },
            type: { type: "string", enum: ["hospitalaria", "ambulatoria"] },
          },
        },
        HealthPlan: {
          type: "object",
          required: [
            "isapre",
            "plan_name",
            "unique_code",
            "base_price_uf",
            "plan_type",
            "has_top",
            "coverage",
          ],
          properties: {
            isapre: { type: "string" },
            plan_name: { type: "string" },
            unique_code: { type: "string" },
            base_price_uf: { type: "number" },
            plan_type: { type: "string", enum: ["preferred", "free_choice", "closed"] },
            has_top: { type: "boolean" },
            additional_notes: { type: "string", nullable: true },
            pdf_url: { type: "string", nullable: true },
            pdf_public_id: { type: "string", nullable: true },
            coverage: {
              type: "array",
              items: { $ref: "#/components/schemas/CoverageEntry" },
            },
          },
        },
        PlansResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/HealthPlan" },
            },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer" },
                version: { type: "string" },
              },
            },
          },
        },
        PlanCoverageSummary: {
          type: "object",
          required: [
            "clinic_count",
            "hospital_percentages",
            "ambulatory_percentages",
            "hospital_avg",
            "ambulatory_avg",
          ],
          properties: {
            clinic_count: { type: "integer" },
            hospital_percentages: {
              type: "array",
              items: { type: "integer" },
            },
            ambulatory_percentages: {
              type: "array",
              items: { type: "integer" },
            },
            hospital_avg: { type: "number" },
            ambulatory_avg: { type: "number" },
          },
        },
        HealthPlanSummary: {
          type: "object",
          required: [
            "isapre",
            "plan_name",
            "unique_code",
            "base_price_uf",
            "plan_type",
            "has_top",
            "coverage_summary",
          ],
          properties: {
            isapre: { type: "string" },
            plan_name: { type: "string" },
            unique_code: { type: "string" },
            base_price_uf: { type: "number" },
            plan_type: { type: "string", enum: ["preferred", "free_choice", "closed"] },
            has_top: { type: "boolean" },
            additional_notes: { type: "string", nullable: true },
            pdf_url: { type: "string", nullable: true },
            pdf_public_id: { type: "string", nullable: true },
            coverage_summary: {
              $ref: "#/components/schemas/PlanCoverageSummary",
            },
          },
        },
        PlansPreviewResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/HealthPlanSummary" },
            },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer" },
                limit: { type: "integer" },
                offset: { type: "integer" },
                version: { type: "string" },
              },
            },
          },
        },
        BuildSolicitarUrlRequest: {
          type: "object",
          required: ["plan"],
          properties: {
            plan: {
              type: "string",
              description: "Código único del plan (unique_code).",
            },
            entidad: { type: "string" },
            vista: {
              type: "string",
              enum: [
                "solicitar",
                "request",
                "precio",
                "price",
                "overview",
                "general",
              ],
            },
            region: { type: "string" },
            edad: { type: "integer" },
            sexo: { type: "string", enum: ["m", "f"] },
            ingreso: { type: "string" },
            cargas: { type: "array", items: { type: "integer" } },
            nombre: { type: "string" },
            rut: { type: "string" },
            email: { type: "string", format: "email" },
            telefono: { type: "string" },
            auto: { type: "boolean" },
            baseUrl: { type: "string", format: "uri" },
          },
        },
        BuildSolicitarUrlResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: {
              type: "object",
              required: ["url", "plan", "vista", "instructions"],
              properties: {
                url: { type: "string", format: "uri" },
                plan: { type: "string" },
                vista: { type: "string" },
                entidad: { type: "string", nullable: true },
                has_quote_criteria: { type: "boolean" },
                has_contact_prefill: { type: "boolean" },
                instructions: { type: "string" },
              },
            },
            meta: {
              type: "object",
              properties: {
                endpoint: { type: "string" },
                version: { type: "string" },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    paths: {
      "/docs": {
        get: {
          operationId: "getPublicApiDocs",
          summary: "Guía y OpenAPI para agentes e integradores",
          responses: {
            "200": { description: "Documentación JSON" },
            "401": {
              description: "Clave ausente o inválida",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/plans": {
        get: {
          operationId: "listHealthPlans",
          summary: "Listar todos los planes de salud",
          responses: {
            "200": {
              description: "Listado de planes",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlansResponse" },
                },
              },
            },
            "401": {
              description: "Clave ausente o inválida",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/plans/preview": {
        get: {
          operationId: "previewHealthPlans",
          summary: `Vista previa de ${PUBLIC_API_PLANS_PREVIEW_LIMIT} planes (ligera)`,
          description:
            "Devuelve un subconjunto fijo de planes con coverage_summary en lugar del detalle por clínica. Recomendado para integraciones que no necesitan el catálogo completo.",
          responses: {
            "200": {
              description: "Vista previa de planes",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlansPreviewResponse" },
                },
              },
            },
            "401": {
              description: "Clave ausente o inválida",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/solicitar/url": {
        post: {
          operationId: "buildSolicitarUrl",
          summary: "Generar URL de redirección al modal de solicitud",
          description:
            "Construye la URL del cotizador para que el usuario continúe la solicitud de un plan. Usar desde el backend del sitio externo al hacer clic en «Solicitar».",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BuildSolicitarUrlRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "URL generada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BuildSolicitarUrlResponse" },
                },
              },
            },
            "400": {
              description: "Parámetros inválidos",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Clave ausente o inválida",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
  };
}
