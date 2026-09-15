/**
 * Documents PDF : le livre complet et la fiche de résumé seule.
 */

import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { JSONContent } from "@tiptap/core";
import { extractOutline } from "@/lib/editor/document";
import { genreLabel } from "@/lib/labels";
import type { Genre, SummarySheet } from "@/lib/types";
import { renderBody, type PageRegistry } from "./content";
import type { BookFont } from "./fonts";

const INK = "#0B0E14";
const MUTED = "#6B7485";
const BLUE = "#1E40AF";
const RED = "#C1121F";

export type BookFormat = "A5" | "A4" | "ROMAN";

export const BOOK_FORMATS: { value: BookFormat; label: string; detail: string; size: [number, number] }[] = [
  { value: "A5", label: "Poche", detail: "A5 · 14,8 × 21 cm", size: [419.53, 595.28] },
  { value: "ROMAN", label: "Roman", detail: "15 × 23 cm", size: [425.2, 651.97] },
  { value: "A4", label: "A4", detail: "21 × 29,7 cm", size: [595.28, 841.89] },
];

export interface BookOptions {
  format: BookFormat;
  font: BookFont;
  fontSize: number;
  includeCover: boolean;
  includeSheet: boolean;
  includeToc: boolean;
}

export interface BookData {
  title: string;
  subtitle: string | null;
  author: string | null;
  genre: Genre;
  content: JSONContent | null;
  /** Image de couverture en data URL JPEG/PNG. */
  cover: string | null;
  sheet: SummarySheet | null;
}

/* ------------------------------------------------------------------ */
/*  Livre                                                              */
/* ------------------------------------------------------------------ */

export function BookDocument({
  data,
  options,
  registry,
  tocPages,
}: {
  data: BookData;
  options: BookOptions;
  /** Passe 1 : on relève les numéros de page des chapitres. */
  registry?: PageRegistry;
  /** Passe 2 : numéros relevés, injectés dans la table des matières. */
  tocPages?: PageRegistry;
}) {
  const fmt = BOOK_FORMATS.find((f) => f.value === options.format)!;
  const [w] = fmt.size;
  const margin = options.format === "A4" ? 72 : 54;
  const fs = options.fontSize;
  const verse = data.genre === "poeme";
  const outline = extractOutline(data.content).filter((h) => h.level <= 2);
  const showToc = options.includeToc && outline.length > 1;

  const pageStyle = {
    fontFamily: options.font,
    color: INK,
    fontSize: fs,
    paddingTop: margin,
    paddingBottom: margin + 10,
    paddingHorizontal: margin + (w > 500 ? 10 : 0),
  };

  return (
    <Document title={data.title} author={data.author ?? undefined} creator="Kalam" producer="Kalam" language="fr">
      {/* Couverture */}
      {options.includeCover && data.cover && (
        <Page size={fmt.size} style={{ padding: 0 }}>
          <Image src={data.cover} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Page>
      )}

      {/* Page de titre */}
      <Page size={fmt.size} style={{ ...pageStyle, justifyContent: "space-between" }}>
        <Text style={{ textAlign: "center", fontSize: fs * 0.95, letterSpacing: 2, color: MUTED, marginTop: fs * 2 }}>
          {(data.author ?? "").toUpperCase()}
        </Text>
        <View>
          <Text style={{ textAlign: "center", fontSize: fs * 2.8, lineHeight: 1.15 }}>{data.title}</Text>
          {data.subtitle && (
            <Text style={{ textAlign: "center", fontSize: fs * 1.2, fontStyle: "italic", color: MUTED, marginTop: fs }}>
              {data.subtitle}
            </Text>
          )}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: fs * 2 }}>
            <View style={{ width: 28, height: 0.8, backgroundColor: BLUE }} />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: RED, marginLeft: 5 }} />
          </View>
        </View>
        <Text style={{ textAlign: "center", fontSize: fs * 0.8, color: MUTED, marginBottom: fs }}>
          {genreLabel(data.genre)}
        </Text>
      </Page>

      {/* Fiche de résumé en ouverture */}
      {options.includeSheet && data.sheet && (
        <Page size={fmt.size} style={pageStyle} wrap>
          <SheetContent sheet={data.sheet} fontSize={fs} titleFont={options.font} bodyFont={options.font} compact />
        </Page>
      )}

      {/* Table des matières */}
      {showToc && (
        <Page size={fmt.size} style={pageStyle} wrap>
          <Text style={{ fontSize: fs * 1.6, marginTop: fs * 3, marginBottom: fs * 2.4, textAlign: "center" }}>
            Table des matières
          </Text>
          {outline.map((h) => (
            <View
              key={h.index}
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                marginBottom: fs * (h.level === 1 ? 0.7 : 0.35),
                paddingLeft: h.level === 2 ? fs * 1.4 : 0,
              }}
            >
              <Text style={{ fontSize: h.level === 1 ? fs : fs * 0.9, fontStyle: h.level === 2 ? "italic" : "normal", maxWidth: "85%" }}>
                {h.text}
              </Text>
              <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: "#C9CED6", borderStyle: "dotted", marginHorizontal: 6, marginBottom: 3 }} />
              <Text style={{ fontSize: fs * 0.9, color: MUTED }}>{tocPages?.[h.index] ?? "00"}</Text>
            </View>
          ))}
        </Page>
      )}

      {/* Corps du texte */}
      <Page size={fmt.size} style={pageStyle} wrap>
        {renderBody(data.content, { fontFamily: options.font, fontSize: fs, verse, ink: INK, muted: MUTED }, registry)}
        <Text
          fixed
          style={{ position: "absolute", bottom: margin / 2, left: 0, right: 0, textAlign: "center", fontSize: fs * 0.75, color: MUTED }}
          render={({ pageNumber }) => `${pageNumber}`}
        />
      </Page>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/*  Fiche de résumé                                                    */
/* ------------------------------------------------------------------ */

function Label({ children, font }: { children: string; font: string }) {
  return (
    <Text style={{ fontFamily: font, fontSize: 7.5, letterSpacing: 1.4, color: MUTED, marginBottom: 4, fontWeight: font === "Inter" ? 600 : 400 }}>
      {children.toUpperCase()}
    </Text>
  );
}

export function SheetContent({
  sheet,
  fontSize = 10.5,
  titleFont = "Playfair Display",
  bodyFont = "Lora",
  labelFont = "Inter",
  compact = false,
}: {
  sheet: SummarySheet;
  fontSize?: number;
  titleFont?: string;
  bodyFont?: string;
  labelFont?: string;
  compact?: boolean;
}) {
  const fs = fontSize;
  const label = compact ? bodyFont : labelFont;
  const quotes = (sheet.quotes ?? "").split("\n").map((q) => q.trim()).filter(Boolean);
  const facts = [
    ["Auteur", sheet.author],
    ["Genre / thème", sheet.theme],
    ["Mots", sheet.word_count?.toLocaleString("fr-FR").replace(/\s/g, " ")],
    ["Pages", sheet.page_count ? String(sheet.page_count) : null],
  ].filter(([, v]) => v) as [string, string][];

  const section = (title: string, body: React.ReactNode) => (
    <View style={{ marginTop: fs * 1.5 }} wrap={false}>
      <Label font={label}>{title}</Label>
      {body}
    </View>
  );

  return (
    <View style={{ fontFamily: bodyFont, color: INK }}>
      <Label font={label}>Fiche de résumé</Label>
      <Text style={{ fontFamily: titleFont, fontSize: fs * (compact ? 1.9 : 2.6), lineHeight: 1.15, marginTop: 2 }}>
        {sheet.title || "Sans titre"}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: fs * 0.9 }}>
        <View style={{ width: 36, height: 0.8, backgroundColor: BLUE }} />
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: RED, marginLeft: 5 }} />
      </View>

      {facts.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: fs * 1.4, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#DADDE3", paddingVertical: fs * 0.7 }}>
          {facts.map(([k, v]) => (
            <View key={k} style={{ width: compact ? "50%" : "25%", paddingVertical: 3 }}>
              <Text style={{ fontFamily: label, fontSize: 7, color: MUTED, letterSpacing: 1 }}>{k.toUpperCase()}</Text>
              <Text style={{ fontSize: fs * 0.95, marginTop: 2 }}>{v}</Text>
            </View>
          ))}
        </View>
      )}

      {sheet.short_summary &&
        section(
          "En bref",
          <Text style={{ fontFamily: titleFont, fontSize: fs * 1.3, fontStyle: "italic", lineHeight: 1.4 }}>
            {sheet.short_summary}
          </Text>,
        )}

      {sheet.long_summary && (
        <View style={{ marginTop: fs * 1.5 }}>
          <Label font={label}>Résumé</Label>
          <Text style={{ fontSize: fs, lineHeight: 1.6, textAlign: "justify" }}>{sheet.long_summary}</Text>
        </View>
      )}

      {sheet.characters && (
        <View style={{ marginTop: fs * 1.5 }}>
          <Label font={label}>Personnages & thèmes</Label>
          <Text style={{ fontSize: fs, lineHeight: 1.6 }}>{sheet.characters}</Text>
        </View>
      )}

      {quotes.length > 0 && (
        <View style={{ marginTop: fs * 1.5 }}>
          <Label font={label}>Citations</Label>
          {quotes.map((q, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: fs * 0.6 }} wrap={false}>
              <View style={{ width: 1.2, backgroundColor: RED, marginRight: fs * 0.8 }} />
              <Text style={{ flex: 1, fontSize: fs, fontStyle: "italic", lineHeight: 1.5 }}>{q}</Text>
            </View>
          ))}
        </View>
      )}

      {sheet.notes && (
        <View style={{ marginTop: fs * 1.5 }}>
          <Label font={label}>Notes personnelles</Label>
          <Text style={{ fontSize: fs, lineHeight: 1.6, color: "#3A404C" }}>{sheet.notes}</Text>
        </View>
      )}
    </View>
  );
}

export function SheetDocument({ sheet }: { sheet: SummarySheet }) {
  return (
    <Document title={`Fiche — ${sheet.title ?? ""}`} author={sheet.author ?? undefined} creator="Kalam" language="fr">
      <Page size="A4" style={{ paddingVertical: 64, paddingHorizontal: 68, fontFamily: "Lora" }} wrap>
        <SheetContent sheet={sheet} />
        <Text
          fixed
          style={{ position: "absolute", bottom: 32, left: 68, right: 68, fontFamily: "Inter", fontSize: 7, color: MUTED, letterSpacing: 1 }}
          render={({ pageNumber, totalPages }) => `KALAM${totalPages > 1 ? `   ·   ${pageNumber}/${totalPages}` : ""}`}
        />
      </Page>
    </Document>
  );
}
