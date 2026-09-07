# Jet3D Model Context Protocol (MCP) Server

[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-Server-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](Dockerfile)

Official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **[Jet3D.pl](https://jet3d.pl)** — custom 3D-printed confectionery cookie cutters and stamps manufactured on-demand in Poland.

This server enables AI assistants (**Claude Desktop**, **Cursor**, **Windsurf**, **Zed**, and autonomous AI agents) to:
- 🎨 **Design personalized 3D confectionery cutters & stamps** (8 geometric shapes, 5 typography styles, custom relief).
- 💰 **Calculate transparent pricing in PLN** (physical sets & instant digital 3MF/STL downloads).
- 📜 **Verify food-contact safety compliance** (EU FCM DoC, Regulation EC 1935/2004, GMP EC 2023/2006).
- 🚀 **Generate Instant BLIK Checkout links** with pre-filled delivery inputs (InPost Paczkomat, email, phone) and automatic BLIK input focus (`< 5 second checkout`).

---

## 🛠️ MCP Features

### 1. Tools

| Tool | Description |
| :--- | :--- |
| `create_custom_cutter_checkout` | Configures a personalized cutter (shape, diameter 50–120mm, text lines 1–3, typography font, recipient details) and generates an Instant BLIK checkout URL. |
| `get_cutter_specifications` | Returns official technical details: 2-piece set design (cutter + separate 2.8mm relief stamp), virgin food-safe PLA, washing instructions (hand wash max 45°C), production turnaround (24–48h). |
| `list_available_shapes_and_fonts` | Explains available shapes (`circle`, `heart`, `oval`, `rounded_square`, `cloud`, `flower`, `star`, `hexagon`) and typography fonts (`script`, `sans`, `serif`, `slab`, `display`) with occasion recommendations. |

### 2. Resources

| URI | Mime Type | Description |
| :--- | :--- | :--- |
| `jet3d://catalog` | `application/json` | Live catalog metadata, manufacturer information, supported shapes, fonts, and base pricing structures. |

### 3. Prompts

| Prompt | Description |
| :--- | :--- |
| `design_cookie_cutter` | Guided interactive interview flow to help a user create the perfect cookie cutter design for their wedding, birthday, christening, baby shower, or corporate event. |

---

## 🚀 Quick Start & Client Configuration

### Claude Desktop

Add this configuration to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

#### Option A: Run via NPX (Recommended)
```json
{
  "mcpServers": {
    "jet3d": {
      "command": "npx",
      "args": [
        "-y",
        "@toomus/jet3d-mcp"
      ]
    }
  }
}
```

#### Option B: Run via Local Clone
```json
{
  "mcpServers": {
    "jet3d": {
      "command": "node",
      "args": [
        "/path/to/jet3d-mcp/build/index.js"
      ]
    }
  }
}
```

#### Option C: Run via Docker
```json
{
  "mcpServers": {
    "jet3d": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "toomus/jet3d-mcp"
      ]
    }
  }
}
```

---

### Cursor IDE

Add the server to your project or user `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "jet3d": {
      "command": "npx -y @toomus/jet3d-mcp"
    }
  }
}
```

---

### Smithery.ai (1-Click Install)

To install Jet3D MCP for Claude Desktop automatically via [Smithery](https://smithery.ai/):

```bash
npx -y @smithery/cli install @toomus/jet3d-mcp --client claude
```

---

## 💡 How It Works (AI Agent Workflow)

1. **User asks AI assistant:**
   > *"Chcę zamówić foremkę do ciastek w kształcie serca z napisem 'Sto Lat Aniu!' na urodziny mojej siostry. Paczkomat KRA01M."*

2. **AI calls `create_custom_cutter_checkout`:**
   ```json
   {
     "shape": "heart",
     "diameter_mm": 70,
     "text_line_1": "Sto Lat Aniu!",
     "font_line_1": "script",
     "paczkomat_code": "KRA01M",
     "order_type": "physical"
   }
   ```

3. **AI responds with complete order breakdown and checkout link:**
   - **Produkt:** Foremka 2-częściowa (wykrawacz + stempel 2.8 mm) — 34,90 zł
   - **Atest:** Food-Contact PLA (certyfikat UE DoC/GMP)
   - **Dostawa:** Paczkomat InPost — 16,99 zł
   - **Razem:** 51,89 zł
   - **Link:** `https://jet3d.pl/checkout/new?shape=heart&diameter_mm=70&text_line_1=Sto+Lat+Aniu%21&font_line_1=script&paczkomat=KRA01M&...`

4. **Zero-Friction Checkout:**
   When the customer clicks the link:
   - 3D preview and delivery address are already populated.
   - The cursor automatically focuses on the 6-digit BLIK code input (`autofocus`).
   - The customer enters their BLIK code, taps confirm on their mobile banking app, and the order is placed in seconds!

---

## 📦 Development & Local Testing

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### Build & Run
```bash
# 1. Clone the repository
git clone https://github.com/toomus/jet3d-mcp.git
cd jet3d-mcp

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run build

# 4. Run via MCP Inspector for local debugging
npx @modelcontextprotocol/inspector node build/index.js
```

### Docker Build
```bash
docker build -t jet3d-mcp .
docker run -i --rm jet3d-mcp
```

---

## 🔒 Security & Food Contact Certification

- **Material:** 100% virgin Food-Safe PLA bioplastic.
- **Regulations:** Manufactured according to **Good Manufacturing Practice (GMP)** under Regulation (EC) No 2023/2006 and compliant with Framework Regulation (EC) No 1935/2004 and Commission Regulation (EU) No 10/2011.
- **Migration Limits:** Verified by accredited analytical testing (overall & specific migration limits).
- **Declaration of Compliance (DoC):** Available on request for confectioneries, bakeries, and culinary businesses.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

Copyright (c) Tomasz Boyke ([Jet3D.pl](https://jet3d.pl)).
