#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import http from "node:http";
import { z } from "zod";

const SERVER_NAME = "jet3d-mcp";
const SERVER_VERSION = "1.1.0";
const JET3D_BASE_URL = "https://jet3d.pl";

// 16 active shapes in Jet3D catalog
export const CATALOG_SHAPES = [
  { id: "circle", name: "Okrągły (Circle)", category: "classic", description: "Klasyczny, uniwersalny kształt na chrzciny, komunie, wesela, urodziny i logo.", widthFactor: 0.80 },
  { id: "heart", name: "Serce (Heart)", category: "celebration", description: "Romantyczny kształt na wesela, Walentynki, Dzień Matki, wieczory panieńskie.", widthFactor: 0.72 },
  { id: "oval", name: "Owalny (Oval)", category: "classic", description: "Dostojny, retro styl herbatnika, idealny na dłuższe napisy i daty.", widthFactor: 0.92 },
  { id: "rounded_square", name: "Kwadrat z zaokrąglonymi rogami", category: "modern", description: "Nowoczesny, minimalistyczny kształt na herbatniki maślane i eventy firmowe.", widthFactor: 0.78 },
  { id: "cloud", name: "Chmurka (Cloud)", category: "kids", description: "Puszysta chmurka na baby shower, narodziny dziecka, metryczki i bajkowe ciasteczka.", widthFactor: 0.82 },
  { id: "flower", name: "Kwiatek (Flower)", category: "spring", description: "Wiosenne wypieki, Dzień Kobiet, letnie przyjęcia w ogrodzie.", widthFactor: 0.65 },
  { id: "star", name: "Gwiazdka (Star)", category: "celebration", description: "Święta Bożego Narodzenia, Nowy Rok, jubileusze i gwiazdkowe prezenty.", widthFactor: 0.52 },
  { id: "hexagon", name: "Heksagon (Hexagon)", category: "modern", description: "Geometryczny plaster miodu, trendy boho i nowoczesne kawiarniane herbatniki.", widthFactor: 0.76 },
  { id: "dog_bone", name: "Kostka psa (Dog Bone)", category: "pets", description: "Urocza kostka dla domowych ciasteczek dla psów lub miłośników czworonogów.", widthFactor: 0.85 },
  { id: "gingerbread_man", name: "Piernikowy Ludzik", category: "christmas", description: "Tradycyjny świąteczny ludzik piernikowy z miejscem na imię.", widthFactor: 0.60 },
  { id: "bunny", name: "Zajączek (Bunny)", category: "easter", description: "Słodki zajączek z uszkami na Wielkanoc i przyjęcia dziecięce.", widthFactor: 0.62 },
  { id: "egg", name: "Jajko Wielkanocne (Egg)", category: "easter", description: "Wielkanocna pisanka, znakomite proporcje do tłoczenia życzeń świątecznych.", widthFactor: 0.74 },
  { id: "baby_bodysuit", name: "Body Niemowlęce", category: "baby", description: "Ubranko niemowlęce z kołnierzykiem — hit na baby shower i powitanie maluszka.", widthFactor: 0.70 },
  { id: "baby_bib", name: "Śliniaczek (Baby Bib)", category: "baby", description: "Śliniaczek z kokardką na chrzest, narodziny i roczek.", widthFactor: 0.68 },
  { id: "baby_carriage", name: "Wózek Dziecięcy", category: "baby", description: "Stylizowany wózek głęboki na narodziny dziecka i chrzciny.", widthFactor: 0.65 },
  { id: "teddy_bear", name: "Miś (Teddy Bear)", category: "kids", description: "Cukierniczy miś z uszkami na roczek i przyjęcia urodzinowe najmłodszych.", widthFactor: 0.66 }
] as const;

export const SHAPE_IDS = [
  "circle", "heart", "oval", "rounded_square", "cloud", "flower", "star", "hexagon",
  "dog_bone", "gingerbread_man", "bunny", "egg", "baby_bodysuit", "baby_bib", "baby_carriage", "teddy_bear"
] as const;

export const FONTS = [
  { id: "script", name: "Pisana / Kaligraficzna (Script)", description: "Elegancka odręczna kaligrafia. Polecana na imiona, 'Sto Lat', 'Dziękujemy'.", maxCharsDefault: 12 },
  { id: "sans", name: "Bezszeryfowa (Sans-Serif)", description: "Nowoczesna, ultra-czytelna czcionka. Idealna na podtytuły, daty i drugą linię.", maxCharsDefault: 14 },
  { id: "serif", name: "Szeryfowa (Serif)", description: "Klasyczny, elegancki krój z szeryfami o tradycyjnym charakterze.", maxCharsDefault: 12 },
  { id: "slab", name: "Slab Serif", description: "Wyrazista, mocna czcionka z grubymi szeryfami.", maxCharsDefault: 10 },
  { id: "display", name: "Dekoracyjna (Display)", description: "Ozdobna czcionka nagłówkowa do krótkich, mocnych słów.", maxCharsDefault: 9 }
] as const;

export const FONT_IDS = ["script", "sans", "serif", "slab", "display"] as const;

// Pricing calculation based on active store rules
export function calculatePriceCents(diameterMm: number, orderType: "physical" | "digital"): { itemCents: number; shippingCents: number; totalCents: number } {
  if (orderType === "digital") {
    return { itemCents: 999, shippingCents: 0, totalCents: 999 };
  }

  let itemCents = 3490;
  if (diameterMm <= 70) itemCents = 3490;
  else if (diameterMm <= 80) itemCents = 3990;
  else if (diameterMm <= 90) itemCents = 4490;
  else if (diameterMm <= 100) itemCents = 4990;
  else itemCents = 5990;

  const shippingCents = 1699;
  return { itemCents, shippingCents, totalCents: itemCents + shippingCents };
}

export function formatPln(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} zł`;
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  // 1. Tool: list_shapes
  server.tool(
    "list_shapes",
    "Returns the complete catalog of active cookie cutter shapes available on Jet3D, including categories and safe printable text zones.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              count: CATALOG_SHAPES.length,
              shapes: CATALOG_SHAPES.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                description: s.description,
                safe_width_ratio: s.widthFactor
              }))
            }, null, 2)
          }
        ]
      };
    }
  );

  // 2. Tool: list_fonts
  server.tool(
    "list_fonts",
    "Returns supported typography font families, visual characteristics, and recommended character budgets per line.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              fonts: FONTS.map(f => ({
                id: f.id,
                name: f.name,
                description: f.description,
                recommended_max_chars_70mm: f.maxCharsDefault
              }))
            }, null, 2)
          }
        ]
      };
    }
  );

  // 3. Tool: get_pricing
  server.tool(
    "get_pricing",
    "Returns current official pricing tiers based on outer diameter (50-120 mm) and fulfillment type (physical 3D print or instant digital package).",
    {
      diameter_mm: z.number().int().min(50).max(120).default(70).describe("Outer diameter in millimeters (50 to 120 mm)"),
      order_type: z.enum(["physical", "digital"]).default("physical").describe("Order type: 'physical' (3D printed + shipped via InPost) or 'digital' (instant 3MF/STL package)")
    },
    async ({ diameter_mm, order_type }) => {
      const p = calculatePriceCents(diameter_mm, order_type);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              order_type,
              diameter_mm,
              product_price: formatPln(p.itemCents),
              product_price_pln: p.itemCents / 100,
              shipping_paczkomat: formatPln(p.shippingCents),
              shipping_paczkomat_pln: p.shippingCents / 100,
              total_price: formatPln(p.totalCents),
              total_price_pln: p.totalCents / 100,
              currency: "PLN",
              delivery: order_type === "physical" ? "InPost Paczkomat (24-48h dispatch)" : "Instant digital download"
            }, null, 2)
          }
        ]
      };
    }
  );

  // 4. Tool: check_text_fits
  server.tool(
    "check_text_fits",
    "Validates whether custom text lines fit inside the chosen cutter shape and diameter based on physical 3D stamp geometry.",
    {
      shape: z.enum(SHAPE_IDS).describe("Geometric shape ID (e.g. 'circle', 'heart', 'star', 'cloud')"),
      diameter_mm: z.number().int().min(50).max(120).default(70).describe("Outer diameter in millimeters (50 to 120 mm)"),
      line1: z.string().min(1).max(30).describe("First line of custom text (e.g. 'Sto Lat Aniu')"),
      line2: z.string().max(30).optional().describe("Second line of custom text (optional)"),
      line3: z.string().max(30).optional().describe("Third line of custom text (optional)"),
      font: z.enum(FONT_IDS).default("script").describe("Typography font style")
    },
    async ({ shape, diameter_mm, line1, line2, line3, font }) => {
      const shapeObj = CATALOG_SHAPES.find(s => s.id === shape) || CATALOG_SHAPES[0];
      const fontObj = FONTS.find(f => f.id === font) || FONTS[0];

      const effectiveWidthMm = diameter_mm * shapeObj.widthFactor;
      const rawLines = [line1, line2, line3].filter((l): l is string => Boolean(l && l.trim().length > 0));

      const scaleFactor = diameter_mm / 70.0;
      const budgetBase = fontObj.maxCharsDefault;

      const lineBudgets = rawLines.map((line, idx) => {
        const lineFactor = idx === 0 ? 1.0 : (idx === 1 ? 0.85 : 0.75);
        const maxChars = Math.max(4, Math.round(budgetBase * scaleFactor * lineFactor));
        const fits = line.length <= maxChars;
        return {
          line_index: idx + 1,
          text: line,
          length: line.length,
          max_recommended_length: maxChars,
          fits
        };
      });

      const allFit = lineBudgets.every(b => b.fits);
      const warnings: string[] = [];

      lineBudgets.forEach(b => {
        if (!b.fits) {
          warnings.push(`Linia ${b.line_index} („${b.text}”) przekracza zalecaną długość (${b.length} > ${b.max_recommended_length} znaków dla średnicy ${diameter_mm} mm).`);
        }
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              shape,
              diameter_mm,
              font,
              effective_stamp_width_mm: Math.round(effectiveWidthMm * 10) / 10,
              all_lines_fit: allFit,
              lines: lineBudgets,
              recommendation: allFit
                ? "Napis mieści się poprawnie na stemplu 3D."
                : `Sugerowane skrócenie tekstu lub zwiększenie średnicy foremki (np. do ${Math.min(120, diameter_mm + 10)} mm).`,
              warnings
            }, null, 2)
          }
        ]
      };
    }
  );

  // 5. Tool: create_customizer_url
  server.tool(
    "create_customizer_url",
    "Generates an interactive 3D WebGL preview link with pre-populated cutter dimensions and text lines.",
    {
      shape: z.enum(SHAPE_IDS).describe("Geometric shape ID"),
      diameter_mm: z.number().int().min(50).max(120).default(70).describe("Outer diameter in millimeters"),
      line1: z.string().min(1).max(30).describe("Primary custom text line"),
      line2: z.string().max(30).optional().describe("Second text line (optional)"),
      line3: z.string().max(30).optional().describe("Third text line (optional)"),
      font1: z.enum(FONT_IDS).default("script").describe("Font style for primary line")
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("shape", args.shape);
      params.set("diameter_mm", String(args.diameter_mm));
      params.set("line1", args.line1);
      if (args.line2) params.set("line2", args.line2);
      if (args.line3) params.set("line3", args.line3);
      params.set("font1", args.font1);

      const url = `${JET3D_BASE_URL}/customizer?${params.toString()}`;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              customizer_url: url,
              description: "Link do interaktywnego podglądu 3D. Użytkownik może obracać model, modyfikować parametry i oglądać wytłoczenie na żywo."
            }, null, 2)
          }
        ]
      };
    }
  );

  // 6. Tool: create_checkout_url
  server.tool(
    "create_checkout_url",
    "Generates a prefilled checkout URL for the human customer to review their custom cutter order, enter delivery details, actively accept statutory terms, and finalize payment via BLIK.",
    {
      shape: z.enum(SHAPE_IDS).describe("Geometric shape ID"),
      diameter_mm: z.number().int().min(50).max(120).default(70).describe("Outer diameter in millimeters (50 to 120 mm)"),
      text_line_1: z.string().min(1).max(30).describe("Primary custom text line"),
      text_line_2: z.string().max(30).optional().describe("Second text line (optional)"),
      text_line_3: z.string().max(30).optional().describe("Third text line (optional)"),
      font_line_1: z.enum(FONT_IDS).default("script").describe("Typography font style"),
      order_type: z.enum(["physical", "digital"]).default("physical").describe("Order type: 'physical' (3D printed + shipped via InPost) or 'digital' (instant 3MF/STL download)")
    },
    async (args) => {
      const pricing = calculatePriceCents(args.diameter_mm, args.order_type);

      const queryParams = new URLSearchParams();
      queryParams.set("shape", args.shape);
      queryParams.set("diameter_mm", String(args.diameter_mm));
      queryParams.set("order_type", args.order_type);
      queryParams.set("text_line_1", args.text_line_1);
      if (args.text_line_2) queryParams.set("text_line_2", args.text_line_2);
      if (args.text_line_3) queryParams.set("text_line_3", args.text_line_3);
      queryParams.set("font_line_1", args.font_line_1);

      // NOTICE: In compliance with EU Directive 2011/83 and Polish consumer rights law,
      // statutory consent checkboxes are NOT preselected in URL and require active customer action in the browser.
      const checkoutUrl = `${JET3D_BASE_URL}/checkout/new?${queryParams.toString()}`;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              checkout_url: checkoutUrl,
              pricing: {
                product: formatPln(pricing.itemCents),
                shipping: formatPln(pricing.shippingCents),
                total: formatPln(pricing.totalCents)
              },
              instructions_for_agent: "Podaj użytkownikowi link do koszyka. Poinformuj, że na stronie sprawdzi podgląd zamówienia, wpisze swoje dane dostawy (Paczkomat InPost), samodzielnie zaakceptuje regulamin i opłaci zamówienie kodem BLIK."
            }, null, 2)
          }
        ]
      };
    }
  );

  // 7. Tool: get_cutter_specifications
  server.tool(
    "get_cutter_specifications",
    "Returns official technical material specifications, food contact certifications (DoC/GMP), and care instructions for Jet3D cutters.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              product_type: "Dwuczęściowy zestaw cukierniczy (ostry wykrawacz obrysowy + stempel z głębokim reliefem 2.8 mm)",
              material: "100% pierwotny Food-Safe PLA (certyfikowany biopolimer pochodzenia roślinnego)",
              certifications: [
                "Rozporządzenie (WE) nr 1935/2004 w sprawie materiałów i wyrobów przeznaczonych do kontaktu z żywnością",
                "Rozporządzenie Komisji (UE) nr 10/2011 w sprawie materiałów z tworzyw sztucznych",
                "Rozporządzenie Komisji (WE) nr 2023/2006 (Dobra Praktyka Produkcyjna - GMP)",
                "Deklaracja Zgodności (DoC) potwierdzona badaniami migracji globalnej i specyficznej"
              ],
              washing_and_care: "Myć wyłącznie ręcznie w letniej wodzie (maks. 45°C) z dodatkiem łagodnego płynu do naczyń. BEZWZGLĘDNY ZAKAZ MYCIA W ZMYWARCE (temperatury >50°C powodują deformację termiczną biotworzywa).",
              production_location: "Gdańsk, Polska",
              turnaround_time: "Druk 3D na zamówienie w 24–48 godzin, wysyłka Paczkomatem InPost w całej Polsce"
            }, null, 2)
          }
        ]
      };
    }
  );

  // Resource: catalog
  server.resource(
    "catalog",
    new ResourceTemplate("jet3d://catalog", { list: undefined }),
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              manufacturer: "Jet3D - Tomasz Boyke",
              location: "Gdańsk, Poland",
              website: JET3D_BASE_URL,
              shapes: CATALOG_SHAPES,
              diameter_range_mm: { min: 50, max: 120, standard: 70 },
              fonts: FONTS,
              pricing: {
                physical_from_pln: 34.90,
                shipping_paczkomat_pln: 16.99,
                digital_files_pln: 9.99
              },
              payment_methods: ["BLIK", "Przelewy24"],
              certification: "Food Contact Material PLA (Regulation EC 1935/2004, GMP 2023/2006)"
            },
            null,
            2
          )
        }
      ]
    })
  );

  return server;
}

// DNS Rebinding and Origin validation
function isValidOrigin(originHeader: string | undefined): boolean {
  if (!originHeader) return true; // Native clients, CLI, cURL, Python, IDE agents have no origin
  try {
    const parsed = new URL(originHeader);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "jet3d.pl" ||
      host.endsWith(".jet3d.pl") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function main() {
  const isHttp = Boolean(
    process.env.PORT ||
    process.argv.includes("--sse") ||
    process.argv.includes("--http")
  );

  if (isHttp) {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "0.0.0.0";

    const MAX_SSE_SESSIONS = 30;
    const sseSessions = new Map<string, { transport: SSEServerTransport; server: McpServer; lastActive: number }>();

    // Cleanup idle SSE sessions every minute
    setInterval(() => {
      const now = Date.now();
      const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
      for (const [id, session] of sseSessions.entries()) {
        if (now - session.lastActive > IDLE_TIMEOUT_MS) {
          console.log(`[MCP] Evicting idle SSE session: ${id}`);
          session.transport.close().catch(() => {});
          session.server.close().catch(() => {});
          sseSessions.delete(id);
        }
      }
    }, 60000).unref();

    const httpServer = http.createServer(async (req, res) => {
      const origin = req.headers.origin;
      if (!isValidOrigin(origin)) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden: Origin not allowed" }));
        return;
      }

      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, mcp-session-id");
      res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const hostHeader = req.headers.host || "localhost";
      const url = new URL(req.url || "/", "http://" + hostHeader);

      // 1. Healthcheck for Kamal Proxy
      if (url.pathname === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          server: SERVER_NAME,
          version: SERVER_VERSION,
          activeSseSessions: sseSessions.size,
          endpoints: {
            streamable_http: "/mcp",
            deprecated_sse: "/sse"
          }
        }));
        return;
      }

      // 2. PRIMARY: Streamable HTTP endpoint (/mcp) per MCP 2025/2026 specs
      if (url.pathname === "/mcp") {
        const sessionServer = createMcpServer();
        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableDnsRebindingProtection: false // Handled above in isValidOrigin
          });

          await sessionServer.connect(transport);
          await transport.handleRequest(req, res);

          res.on("close", () => {
            transport.close().catch(() => {});
            sessionServer.close().catch(() => {});
          });
          return;
        } catch (error) {
          console.error("[MCP] Error in Streamable HTTP handler:", error);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }));
          }
          return;
        }
      }

      // 3. FALLBACK: Deprecated Server-Sent Events endpoint (/sse)
      if (url.pathname === "/sse" && req.method === "GET") {
        if (sseSessions.size >= MAX_SSE_SESSIONS) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: "Too many active SSE connections. Please migrate to the primary Streamable HTTP endpoint: POST /mcp"
          }));
          return;
        }

        console.warn("[MCP] Notice: Deprecated HTTP+SSE transport accessed. Client should migrate to /mcp (Streamable HTTP).");

        res.setHeader("X-Accel-Buffering", "no");
        res.setHeader("Cache-Control", "no-cache, no-transform");

        const transport = new SSEServerTransport("/message", res);
        const sessionServer = createMcpServer();
        const sessionId = transport.sessionId;

        sseSessions.set(sessionId, {
          transport,
          server: sessionServer,
          lastActive: Date.now()
        });

        res.on("close", () => {
          sseSessions.delete(sessionId);
          sessionServer.close().catch(() => {});
        });

        await sessionServer.connect(transport);
        return;
      }

      // 4. FALLBACK: Post message endpoint for deprecated SSE session
      if (url.pathname === "/message" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        const session = sessionId ? sseSessions.get(sessionId) : undefined;
        if (!session) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found or expired" }));
          return;
        }

        session.lastActive = Date.now();
        await session.transport.handlePostMessage(req, res);
        return;
      }

      // 5. Root metadata endpoint
      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          name: SERVER_NAME,
          version: SERVER_VERSION,
          description: "Jet3D Official Model Context Protocol (MCP) Server",
          transports: {
            primary: {
              type: "Streamable HTTP",
              endpoint: `${JET3D_BASE_URL.replace("https://", "https://mcp.")}/mcp`,
              specification: "MCP Streamable HTTP (2025/2026 revision)"
            },
            deprecated_fallback: {
              type: "HTTP+SSE",
              endpoint: `${JET3D_BASE_URL.replace("https://", "https://mcp.")}/sse`,
              status: "Deprecated, maintained for backward compatibility"
            }
          },
          website: JET3D_BASE_URL,
          tools: [
            "list_shapes",
            "list_fonts",
            "get_pricing",
            "check_text_fits",
            "create_customizer_url",
            "create_checkout_url",
            "get_cutter_specifications"
          ]
        }, null, 2));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });

    httpServer.listen(port, host, () => {
      console.log(`Jet3D MCP Server v${SERVER_VERSION} listening on http://${host}:${port}`);
      console.log(`- Primary Streamable HTTP: POST /mcp`);
      console.log(`- Deprecated SSE Fallback: GET /sse`);
      console.log(`- Health Check: GET /health`);
    });
  } else {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jet3D MCP Server running on stdio transport.");
  }
}

main().catch((error) => {
  console.error("Fatal error in Jet3D MCP Server:", error);
  process.exit(1);
});
