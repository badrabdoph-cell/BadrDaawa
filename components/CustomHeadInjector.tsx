import Script from "next/script";

function extractScripts(html: string): { src: string[]; inline: string[] } {
  const src: string[] = [];
  const inline: string[] = [];
  const srcRegex = /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  const inlineRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = srcRegex.exec(html)) !== null) src.push(match[1]);
  while ((match = inlineRegex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content && !srcRegex.test(match[0])) inline.push(content);
  }
  return { src, inline };
}

function removeScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

export function CustomHeadInjector({ html }: { html: string }) {
  if (!html?.trim()) return null;
  const { src, inline } = extractScripts(html);
  const nonScriptHtml = removeScripts(html);

  return (
    <>
      {src.map((url, i) => (
        <Script key={`ext-script-${i}`} src={url} strategy="beforeInteractive" />
      ))}
      {inline.map((code, i) => (
        <Script key={`inline-script-${i}`} id={`custom-inline-${i}`} strategy="beforeInteractive">
          {code}
        </Script>
      ))}
      {nonScriptHtml ? <div dangerouslySetInnerHTML={{ __html: nonScriptHtml }} style={{ display: "none" }} /> : null}
    </>
  );
}
