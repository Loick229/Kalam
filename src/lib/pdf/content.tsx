/**
 * Conversion d'un document Tiptap (JSON) en éléments react-pdf.
 */

import { Image, Text, View } from "@react-pdf/renderer";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";

export interface ContentStyle {
  fontFamily: string;
  fontSize: number;
  /** Poèmes : pas d'alinéa ni de justification. */
  verse: boolean;
  ink: string;
  muted: string;
}

type Style = Record<string, string | number>;

/** Registre (index de bloc → numéro de page) rempli pendant la mise en page. */
export type PageRegistry = Record<number, number>;

function inline(nodes: JSONContent[] | undefined, key = "i"): ReactNode[] {
  return (nodes ?? []).map((n, i) => {
    const k = `${key}-${i}`;
    if (n.type === "hardBreak") return "\n";
    if (n.type !== "text") return null;
    const style: Style = {};
    for (const m of n.marks ?? []) {
      if (m.type === "bold") style.fontWeight = 700;
      if (m.type === "italic") style.fontStyle = "italic";
      if (m.type === "underline") style.textDecoration = "underline";
      if (m.type === "strike") style.textDecoration = "line-through";
    }
    return Object.keys(style).length ? (
      <Text key={k} style={style}>
        {n.text}
      </Text>
    ) : (
      n.text
    );
  });
}

const alignOf = (n: JSONContent, fallback: string) => {
  const a = n.attrs?.textAlign as string | undefined;
  return a && a !== "left" ? a : fallback;
};

/**
 * Rend le corps du livre. Chaque chapitre (titre H1) commence sur une
 * nouvelle page ; les sauts de page manuels sont respectés.
 */
export function renderBody(doc: JSONContent | null, s: ContentStyle, registry?: PageRegistry): ReactNode[] {
  const blocks = doc?.content ?? [];
  const lineHeight = s.verse ? 1.55 : 1.5;
  const baseAlign = s.verse ? "left" : "justify";
  let previous: string | undefined;

  return blocks.map((n, index) => {
    const prev = previous;
    previous = n.type;
    const key = `b-${index}`;

    switch (n.type) {
      case "paragraph": {
        const empty = !(n.content ?? []).length;
        if (empty) return <View key={key} style={{ height: s.fontSize * (s.verse ? 1.2 : 0.6) }} />;
        const afterHeading = prev === "heading" || prev === "horizontalRule" || prev === "pageBreak" || !prev;
        return (
          <Text
            key={key}
            style={{
              fontSize: s.fontSize,
              lineHeight,
              textAlign: alignOf(n, baseAlign) as "left",
              // Convention typographique : alinéa, sauf après un titre ou une coupure.
              textIndent: s.verse || afterHeading || n.attrs?.textAlign === "center" ? 0 : s.fontSize * 1.4,
              marginBottom: s.verse ? s.fontSize * 0.35 : 0,
            }}
            orphans={2}
            widows={2}
          >
            {inline(n.content, key)}
          </Text>
        );
      }

      case "heading": {
        const level = (n.attrs?.level ?? 1) as number;
        const text = inline(n.content, key);
        const plain = (n.content ?? []).map((c) => c.text ?? "").join("");
        const record = registry
          ? ({ pageNumber }: { pageNumber: number }) => {
              registry[index] = pageNumber;
              return plain;
            }
          : undefined;

        if (level === 1) {
          return (
            <View key={key} break={index > 0} style={{ marginTop: s.fontSize * 5, marginBottom: s.fontSize * 2.4 }}>
              <View style={{ width: 24, height: 0.6, backgroundColor: s.muted, alignSelf: "center", marginBottom: s.fontSize * 1.2 }} />
              <Text
                style={{ fontSize: s.fontSize * 1.9, textAlign: "center", lineHeight: 1.2, fontWeight: 400 }}
                {...(record ? { render: record } : {})}
              >
                {record ? undefined : text}
              </Text>
            </View>
          );
        }
        return (
          <Text
            key={key}
            minPresenceAhead={s.fontSize * 4}
            style={{
              fontSize: level === 2 ? s.fontSize * 1.35 : s.fontSize * 1.1,
              fontStyle: level === 3 ? "italic" : "normal",
              textAlign: alignOf(n, "left") as "left",
              marginTop: s.fontSize * (level === 2 ? 1.8 : 1.3),
              marginBottom: s.fontSize * 0.7,
              lineHeight: 1.25,
            }}
            {...(record ? { render: record } : {})}
          >
            {record ? undefined : text}
          </Text>
        );
      }

      case "blockquote":
        return (
          <View
            key={key}
            wrap
            style={{ marginVertical: s.fontSize * 0.8, marginHorizontal: s.fontSize * 1.6 }}
          >
            {renderBody({ type: "doc", content: n.content }, { ...s, verse: true }).map((child, i) => (
              <View key={i} style={{ fontStyle: "italic" }}>
                {child}
              </View>
            ))}
          </View>
        );

      case "bulletList":
      case "orderedList":
        return (
          <View key={key} style={{ marginVertical: s.fontSize * 0.5, paddingLeft: s.fontSize * 0.6 }}>
            {(n.content ?? []).map((li, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: s.fontSize * 0.2 }}>
                <Text style={{ width: s.fontSize * 1.5, fontSize: s.fontSize, lineHeight }}>
                  {n.type === "orderedList" ? `${(n.attrs?.start ?? 1) + i}.` : "•"}
                </Text>
                <View style={{ flex: 1 }}>
                  {renderBody({ type: "doc", content: li.content }, { ...s, verse: true })}
                </View>
              </View>
            ))}
          </View>
        );

      case "horizontalRule":
        return (
          <Text
            key={key}
            style={{ textAlign: "center", fontSize: s.fontSize, color: s.muted, marginVertical: s.fontSize * 1.2, letterSpacing: 6 }}
          >
            * * *
          </Text>
        );

      case "pageBreak":
        return <View key={key} break />;

      case "textImage":
        return (
          <View key={key} wrap={false} style={{ alignItems: "center", marginVertical: s.fontSize * 1.2 }}>
            <Image src={n.attrs?.src as string} style={{ maxWidth: "100%", maxHeight: 360 }} />
          </View>
        );

      default:
        return null;
    }
  });
}
