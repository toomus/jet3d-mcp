#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import http from "node:http";
import { z } from "zod";

const SERVER_NAME = "jet3d-mcp";
const SERVER_VERSION = "1.0.0";
const JET3D_BASE_URL = "https://jet3d.pl";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

// Helper for physical pricing
function calculatePriceCents(diameterMm: number, orderType: "physical" | "digital"): { itemCents: number; shippingCents: number; totalCents: number } {
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

function formatPln(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} zł`;
}

// 1. Tool: create_custom_cutter_checkout
server.tool(
  "create_custom_cutter_checkout",
  "Design a personalized 3D-printed cookie cutter and generate an Instant BLIK checkout URL for the customer to complete payment in seconds.",
  {
    shape: z.enum([
      "circle",
      "oval",
      "rounded_square",
      "heart",
      "cloud",
      "flower",
      "star",
      "hexagon"
    ]).describe("Geometric shape of the cookie cutter (e.g. 'heart', 'circle', 'flower')"),
    diameter_mm: z.number().int().min(50).max(120).default(70).describe("Outer diameter in millimeters (50 to 120 mm, default: 70)"),
    text_line_1: z.string().min(1).max(30).describe("First line of custom text (e.g. 'Sto Lat Aniu', 'Młoda Para')"),
    text_line_2: z.string().max(30).optional().describe("Second line of custom text (optional)"),
    text_line_3: z.string().max(30).optional().describe("Third line of custom text (optional)"),
    font_line_1: z.enum(["script", "sans", "serif", "slab", "display"]).default("script").describe("Font style for the primary text line"),
    font_size_line_1: z.enum(["sm", "md", "lg", "xl"]).default("md").describe("Font size for line 1"),
    customer_name: z.string().optional().describe("Customer recipient full name (e.g. 'Jan Kowalski')"),
    customer_email: z.string().email().optional().describe("Customer email for order confirmation and tracking"),
    customer_phone: z.string().optional().describe("Customer 9-digit Polish mobile phone for InPost SMS notification (e.g. '500-123-456')"),
    paczkomat_code: z.string().optional().describe("InPost Paczkomat box code (e.g. 'KRA01M', 'WAW22A')"),
    order_type: z.enum(["physical", "digital"]).default("physical").describe("Order type: 'physical' (3D printed + shipped) or 'digital' (instant 3MF/STL download)")
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
    queryParams.set("font_size_line_1", args.font_size_line_1);

    if (args.customer_name) queryParams.set("name", args.customer_name);
    if (args.customer_email) queryParams.set("email", args.customer_email);
    if (args.customer_phone) queryParams.set("phone", args.customer_phone);
    if (args.paczkomat_code) queryParams.set("paczkomat", args.paczkomat_code.trim().toUpperCase());

    // Pre-check customer consent for customized goods
    queryParams.set("accept_terms", "1");
    queryParams.set("accept_custom_no_return", "1");

    const checkoutUrl = `${JET3D_BASE_URL}/checkout/new?${queryParams.toString()}`;

    const textLines = [
      args.text_line_1,
      args.text_line_2,
      args.text_line_3
    ].filter(Boolean).join(" / ");

    return {
      content: [
        {
          type: "text",
          text: [
            `### 🍪 Jet3D — Skonfigurowana Foremka Cukiernicza 3D`,
            ``,
            `- **Kształt:** ${args.shape}`,
            `- **Średnica:** ${args.diameter_mm} mm`,
            `- **Wytłaczany napis:** „${textLines}”`,
            `- **Krój pisma:** ${args.font_line_1}`,
            `- **Typ zamówienia:** ${args.order_type === "digital" ? "Pliki 3D (.3MF / .STL)" : "Fizyczny zestaw 2-częściowy (Wykrawacz + Stempel)"}`,
            `- **Atest:** 100% certyfikowany Food-Safe PLA (atest DoC/GMP, bezpieczny dla żywności)`,
            ``,
            `#### Podsumowanie Cenowe:`,
            `- Produkt: **${formatPln(pricing.itemCents)}**`,
            args.order_type === "physical" ? `- Dostawa (Paczkomat InPost): **${formatPln(pricing.shippingCents)}**` : `- Dostawa: **0,00 zł (Download)**`,
            `- Razem do zapłaty: **${formatPln(pricing.totalCents)}**`,
            ``,
            `#### 🚀 Błyskawiczny Link do Koszyka (Instant BLIK Checkout):`,
            `👉 [Kliknij tutaj, aby dokończyć zamówienie i opłacić BLIKiem](${checkoutUrl})`,
            ``,
            `> **Instrukcja dla klienta:** Po kliknięciu w link strona załaduje się z gotowym podglądem 3D oraz uzupełnionymi danymi odbiorcy. Kursor automatycznie ustawi się w polu kodu BLIK. Wystarczy wpisać 6 cyfr z aplikacji bankowej i zatwierdzić transakcję w telefonie (zakup trwa poniżej 5 sekund).`
          ].join("\n")
        }
      ]
    };
  }
);

// 2. Tool: get_cutter_specifications
server.tool(
  "get_cutter_specifications",
  "Retrieve official technical, food safety (DoC/GMP), and material specifications for Jet3D cookie cutters and stamps.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: [
            `# Jet3D Product Specifications & Food Safety Compliance`,
            ``,
            `## Construction & Design`,
            `- **2-Piece Set:** Includes 1x sharp outline cookie cutter with wide pressing flange + 1x separate raised relief stamp (2.8mm relief height).`,
            `- **Shapes:** Circle, Oval, Rounded Square, Heart, Cloud, Flower, Star, Hexagon.`,
            `- **Dimensions:** Adjustable outer diameter from 50 mm to 120 mm.`,
            `- **Relief Height:** 2.8 mm deep embossing optimal for shortbread cookies, gingerbread, and fondant sugar paste.`,
            ``,
            `## Food Contact Material (FCM) & EU Compliance`,
            `- **Material:** 100% virgin Food-Safe PLA (bio-plastic derived from fermented plant starch).`,
            `- **Laboratory Tested:** Verified through overall and specific migration testing in an accredited testing laboratory.`,
            `- **EU Regulations:** Compliant with Regulation (EC) No 1935/2004, Commission Regulation (EU) No 10/2011, and Good Manufacturing Practice (GMP) Regulation (EC) No 2023/2006.`,
            `- **Declaration of Compliance (DoC):** Officially certified for direct contact with food and confectionery products.`,
            ``,
            `## Care & Maintenance Instructions`,
            `- **Washing:** Wash by hand only in lukewarm water (max 45°C / 113°F) using mild dish soap.`,
            `- **Caution:** DO NOT WASH IN DISHWASHERS. Temperatures exceeding 50°C cause thermal deformation of PLA bioplastic.`,
            ``,
            `## Production & Shipping`,
            `- **Turnaround:** 3D printed on demand in Gdańsk, Poland and dispatched within 24–48 hours.`,
            `- **Delivery:** InPost Paczkomat (16.99 PLN across Poland).`,
            `- **Digital Option:** Instant 3D project package (.3MF for Bambu Studio & .STL for any slicer) for 9.99 PLN.`
          ].join("\n")
        }
      ]
    };
  }
);

// 3. Tool: list_available_shapes_and_fonts
server.tool(
  "list_available_shapes_and_fonts",
  "List supported 3D shapes, typography font styles, and recommended occasions for personalized cutters.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: [
            `### Dostępne Kształty i Style Czcionek w Jet3D:`,
            ``,
            `#### Kształty Geometryczne (shapes):`,
            `- **circle (okrągły):** Uniwersalny klasyk, idealny na chrzest, komunię, urodziny i logo.`,
            `- **heart (serce):** Wesela, wieczory panieńskie, Walentynki, Dzień Matki/Ojca.`,
            `- **oval (owalny):** Elegancki retro styl, podłużne herbatniki, daty ślubu.`,
            `- **rounded_square (kwadrat z zaokrąglonymi rogami):** Nowoczesny, minimalistyczny, świetny na herbatniki maślane i eventy firmowe.`,
            `- **cloud (chmurka):** Baby shower, narodziny dziecka, bajkowe ciasteczka dla dzieci.`,
            `- **flower (kwiatek):** Wiosenne wypieki, Dzień Kobiet, letnie przyjęcia w ogrodzie.`,
            `- **star (gwiazdka):** Boże Narodzenie, Nowy Rok, jubileusze i gwiazdkowe prezenty.`,
            `- **hexagon (heksagon):** Geometryczny plaster miodu, nowoczesne trendy ślubne i kawiarniane.`,
            ``,
            `#### Style Czcionek (fonts):`,
            `- **script:** Elegancka kaligrafia pisana odręcznie (polecana na imiona i uroczystości).`,
            `- **sans:** Nowoczesny, czytelny bezszeryfowy krój (idealny na podtytuły, daty i drugą linię tekstu).`,
            `- **serif:** Dostojny krój szeryfowy w stylu tradycyjnym.`,
            `- **slab:** Wyrazisty krój o pogrubionych szeryfach.`,
            `- **display:** Dekoracyjny krój nagłówkowy do krótkich, mocnych haseł.`
          ].join("\n")
        }
      ]
    };
  }
);

// 4. Resource: catalog
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
            shapes: ["circle", "oval", "rounded_square", "heart", "cloud", "flower", "star", "hexagon"],
            diameter_range_mm: { min: 50, max: 120, standard: 70 },
            fonts: ["script", "sans", "serif", "slab", "display"],
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

// 5. Prompt: design_cookie_cutter
server.prompt(
  "design_cookie_cutter",
  "Interactive interview guide for designing a custom 3D cookie cutter for an event (wedding, birthday, baby shower, company).",
  {
    occasion: z.string().describe("The occasion (e.g. 'wedding', 'birthday', 'baby shower', 'christmas', 'corporate')")
  },
  async ({ occasion }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `I want to design a custom 3D-printed cookie cutter from Jet3D for: ${occasion}.`,
            ``,
            `Please help me choose:`,
            `1. The most fitting geometric shape (circle, heart, cloud, flower, star, rounded_square, hexagon).`,
            `2. The recommended diameter (standard is 70-80mm).`,
            `3. Up to 3 lines of custom embossed text (e.g. names, dates, wishes) and typography fonts.`,
            `4. Collect my delivery destination (InPost Paczkomat code, email, phone) and generate the Instant BLIK checkout URL.`
          ].join("\n")
        }
      }
    ]
  })
);

  return server;
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

    const sessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

    const httpServer = http.createServer(async (req, res) => {
      // CORS headers for web agents & external inspector clients
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

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
        res.end(JSON.stringify({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION, activeSessions: sessions.size }));
        return;
      }

      // 2. Server-Sent Events endpoint
      if (url.pathname === "/sse" && req.method === "GET") {
        const transport = new SSEServerTransport("/message", res);
        const sessionServer = createMcpServer();
        sessions.set(transport.sessionId, { transport, server: sessionServer });

        res.on("close", () => {
          sessions.delete(transport.sessionId);
          sessionServer.close().catch(() => {});
        });

        await sessionServer.connect(transport);
        return;
      }

      // 3. Post message endpoint for SSE session
      if (url.pathname === "/message" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        const session = sessionId ? sessions.get(sessionId) : undefined;
        if (!session) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found or expired" }));
          return;
        }
        await session.transport.handlePostMessage(req, res);
        return;
      }

      // 4. Root information endpoint
      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          name: SERVER_NAME,
          version: SERVER_VERSION,
          description: "Jet3D Remote Model Context Protocol (MCP) Server",
          endpoints: {
            health: "/health",
            sse: "/sse",
            message: "/message"
          },
          website: JET3D_BASE_URL,
          tools: [
            "create_custom_cutter_checkout",
            "get_cutter_specifications",
            "list_available_shapes_and_fonts"
          ]
        }, null, 2));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });

    httpServer.listen(port, host, () => {
      console.log("Jet3D MCP Server listening on http://" + host + ":" + port + " (SSE: /sse, Health: /health)");
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
