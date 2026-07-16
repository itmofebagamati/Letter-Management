import React, { useState, useEffect, ReactNode, useRef } from "react";
import { X, FileDown, Printer, Copy, Check, ExternalLink, Loader2, FileText, Calendar, User, Building, Landmark } from "lucide-react";
import { LetterState, EmblemType } from "../types";
import { toNepaliNumerals } from "../presets";
import { generateDocxBlob } from "../docxGenerator";
import nepalEmblemUrl from "../../assets/nepal_emblem.svg";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Helper functions for OKLCH to RGB conversion
function oklchToRgb(l: number, c: number, h: number, alpha?: number): string {
  // Convert h to radians
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // Oklab to LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  // Non-linear to linear
  const l_linear = l_ * l_ * l_;
  const m_linear = m_ * m_ * m_;
  const s_linear = s_ * s_ * s_;

  // LMS to linear sRGB
  const r = +4.0767416621 * l_linear - 3.3077115913 * m_linear + 0.2309699292 * s_linear;
  const g = -1.2684380046 * l_linear + 2.6097574011 * m_linear - 0.3413193965 * s_linear;
  const b_val = -0.0041960863 * l_linear - 0.7034186147 * m_linear + 1.7076147010 * s_linear;

  // Linear sRGB to standard sRGB
  const toSRGB = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r255 = Math.round(toSRGB(r) * 255);
  const g255 = Math.round(toSRGB(g) * 255);
  const b255 = Math.round(toSRGB(b_val) * 255);

  if (alpha !== undefined) {
    return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
  }
  return `rgb(${r255}, ${g255}, ${b255})`;
}

function parseAndConvertOklch(match: string): string {
  const inner = match.substring(match.indexOf("(") + 1, match.lastIndexOf(")")).trim();
  const parts = inner.replace(/\//g, " ").split(/\s+/).filter(Boolean);
  if (parts.length < 3) {
    return "rgb(100, 116, 139)";
  }

  const l = parseFloat(parts[0]);
  const c = parseFloat(parts[1]);
  const h = parseFloat(parts[2]);
  
  let alpha: number | undefined;
  if (parts.length >= 4) {
    const aStr = parts[3];
    if (aStr.endsWith("%")) {
      alpha = parseFloat(aStr) / 100;
    } else {
      alpha = parseFloat(aStr);
    }
  }

  if (isNaN(l) || isNaN(c) || isNaN(h)) {
    return "rgb(100, 116, 139)";
  }

  return oklchToRgb(l, c, h, alpha);
}

const replaceOklchInStringGlobal = (str: string): string => {
  if (!str || typeof str !== "string" || !str.includes("oklch")) {
    return str;
  }
  return str.replace(/oklch\([^)]+\)/g, (match) => {
    try {
      return parseAndConvertOklch(match);
    } catch (e) {
      return "rgb(100, 116, 139)";
    }
  });
};

// Globally patch window.getComputedStyle to intercept oklch
if (typeof window !== "undefined" && !(window as any).__oklch_patched) {
  (window as any).__oklch_patched = true;
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt: Element, pseudoElt?: string) {
    const style = originalGetComputedStyle.call(this, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          if (prop === "getPropertyValue") {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              return replaceOklchInStringGlobal(val);
            };
          }
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === "string") {
            return replaceOklchInStringGlobal(val);
          }
          return val;
        }
        return Reflect.get(target, prop, receiver);
      }
    });
  };
}

interface LetterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: any; // The raw Firestore document log entry
  language: "ne" | "en";
  onLoadIntoEditor: (entry: any) => void;
}

// Re-implement the local formatting parser helpers for document preview
function parseHtmlTags(html: string, counter = { current: 0 }): ReactNode[] {
  if (!html) return [];

  const containerRegex = /<(b|i|u|red|blue|green|purple|orange|gray|center|right|justify)>([\s\S]*?)<\/\1>/i;
  const imgRegex = /<img\s+src="([^"]+)"(?:\s+width="([^"]+)")?\s*\/?>/i;
  const hrRegex = /<hr\s*\/?>/i;

  const matchContainer = html.match(containerRegex);
  const matchImg = html.match(imgRegex);
  const matchHr = html.match(hrRegex);

  let earliestMatch: { type: "container" | "img" | "hr"; index: number; matchObj: any } | null = null;

  if (matchContainer) {
    earliestMatch = { type: "container", index: matchContainer.index ?? 0, matchObj: matchContainer };
  }
  if (matchImg) {
    const idx = matchImg.index ?? 0;
    if (!earliestMatch || idx < earliestMatch.index) {
      earliestMatch = { type: "img", index: idx, matchObj: matchImg };
    }
  }
  if (matchHr) {
    const idx = matchHr.index ?? 0;
    if (!earliestMatch || idx < earliestMatch.index) {
      earliestMatch = { type: "hr", index: idx, matchObj: matchHr };
    }
  }

  if (!earliestMatch) {
    return [html];
  }

  const { type, index, matchObj } = earliestMatch;
  const outerText = matchObj[0];
  const before = html.substring(0, index);
  const after = html.substring(index + outerText.length);

  const results: ReactNode[] = [];

  if (before) {
    results.push(...parseHtmlTags(before, counter));
  }

  if (type === "container") {
    const tag = matchObj[1].toLowerCase();
    const innerText = matchObj[2];
    const innerContent = parseHtmlTags(innerText, counter);

    let className = "";
    if (tag === "b") className = "font-bold text-slate-900";
    else if (tag === "i") className = "italic text-slate-700";
    else if (tag === "u") className = "underline decoration-slate-400";
    else if (tag === "red") className = "text-red-600 font-semibold";
    else if (tag === "blue") className = "text-blue-600 font-semibold";
    else if (tag === "green") className = "text-emerald-600 font-semibold";
    else if (tag === "purple") className = "text-purple-600 font-semibold";
    else if (tag === "orange") className = "text-amber-600 font-semibold";
    else if (tag === "gray") className = "text-slate-500 font-medium";
    else if (tag === "center") className = "text-center block my-2";
    else if (tag === "right") className = "text-right block my-2";
    else if (tag === "justify") className = "text-justify block my-2";

    counter.current += 1;
    results.push(
      <span key={`tag-${tag}-${counter.current}`} className={className}>
        {innerContent}
      </span>
    );
  } else if (type === "img") {
    const src = matchObj[1];
    const width = matchObj[2] || "150";
    counter.current += 1;
    results.push(
      <img
        key={`img-${counter.current}`}
        src={src}
        alt="Inline Attachment"
        style={{ width: `${width}px` }}
        className="mx-auto my-3 object-contain rounded border border-slate-100 p-0.5"
      />
    );
  } else if (type === "hr") {
    counter.current += 1;
    results.push(
      <hr key={`hr-${counter.current}`} className="my-4 border-t border-slate-200" />
    );
  }

  if (after) {
    results.push(...parseHtmlTags(after, counter));
  }

  return results;
}

function parseInlineStyles(text: string): ReactNode[] {
  let normalized = text
    .replace(/\*\*([\s\S]*?)\*\*/g, "<b>$1</b>")
    .replace(/\*([\s\S]*?)\*/g, "<i>$1</i>")
    .replace(/__([\s\S]*?)__/g, "<u>$1</u>");

  return parseHtmlTags(normalized);
}

function renderFormattedContent(text: string): ReactNode[] {
  if (!text) return [];
  const paragraphs = text.split("\n\n");
  return paragraphs.map((pText, idx) => {
    if (!pText.trim()) return null;
    return (
      <p key={idx} className="whitespace-pre-wrap text-justify indent-8 md:indent-12 leading-relaxed mb-4">
        {parseInlineStyles(pText)}
      </p>
    );
  }).filter(Boolean) as ReactNode[];
}

// Nepal government emblem image/svg helper
function NepalEmblemSVG({ type, size = 80 }: { type: EmblemType; size?: number }) {
  if (type === "none") return null;

  return (
    <img
      src={nepalEmblemUrl}
      alt="Government of Nepal Emblem"
      width={size}
      height={size}
      className={size === 80 ? "w-20 h-20 mx-auto transition-transform hover:scale-105 duration-300 object-contain" : "w-80 h-80 mx-auto object-contain"}
    />
  );
}

// Local QR code generation helper
function QrCodeRenderer({ value, size = 80 }: { value: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(
      value,
      {
        width: size * 2,
        margin: 1,
        color: {
          dark: "#0f172a", // slate-900
          light: "#ffffff",
        },
      },
      (err, url) => {
        if (err) {
          console.error("Failed to generate QR code", err);
          return;
        }
        setQrUrl(url);
      }
    );
  }, [value, size]);

  if (!qrUrl) {
    return (
      <div 
        style={{ width: `${size}px`, height: `${size}px` }} 
        className="bg-slate-100 animate-pulse rounded" 
      />
    );
  }

  return (
    <img
      src={qrUrl}
      alt="Verification QR Code"
      width={size}
      height={size}
      className="object-contain"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

export function LetterPreviewModal({ isOpen, onClose, entry, language, onLoadIntoEditor }: LetterPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [state, setState] = useState<LetterState | null>(null);

  useEffect(() => {
    if (entry && entry.letterStateJson) {
      try {
        const parsed = JSON.parse(entry.letterStateJson);
        setState(parsed);
      } catch (e) {
        console.error("Failed to parse letterStateJson inside modal:", e);
        setState(null);
      }
    } else {
      setState(null);
    }
  }, [entry]);

  // Handle closing on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  // Fallback to parsed parameters if state failed to load
  const isNe = language === "ne";
  const letterData: Partial<LetterState> = state || {
    language: language,
    officeProvince: entry.sectionNameNe || entry.sectionNameEn || (isNe ? "बागमती प्रदेश सरकार" : "Bagamati Province Govt"),
    officeName: isNe ? "आर्थिक मामिला तथा योजना मन्त्रालय" : "Ministry of Economic Affairs & Planning",
    officeAddress: isNe ? "हेटौंडा, मकवानपुर" : "Hetauda, Makwanpur",
    letterNo: entry.letterNo || "---",
    dispatchNo: entry.chalaniNo || "---",
    dateBS: entry.dateBS || "---",
    dateAD: entry.dateAD || "---",
    recipientOffice: entry.recipient || "---",
    subject: entry.subject || "---",
    senderName: entry.sender || "---",
    body: "",
    emblemType: "nepal",
    showQrCode: false,
    showTapasil: false,
    tapasilItems: [],
  };

  const handleCopyText = () => {
    let fullText = "";
    if (letterData.subject) {
      fullText += `${isNe ? "विषय:" : "Subject:"} ${letterData.subject}\n\n`;
    }
    if (letterData.salutation) {
      fullText += `${letterData.salutation}\n\n`;
    }
    if (letterData.body) {
      // Remove basic HTML tag structures
      const cleanBody = letterData.body.replace(/<[^>]*>/g, "");
      fullText += `${cleanBody}\n\n`;
    }
    if (letterData.senderName) {
      fullText += `${letterData.senderName}\n`;
    }
    if (letterData.senderDesignation) {
      fullText += `${letterData.senderDesignation}\n`;
    }

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const replaceOklchInString = (str: string): string => {
    return replaceOklchInStringGlobal(str);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const sheet = document.getElementById("modal-a4-sheet");
      if (!sheet) {
        throw new Error("Modal preview sheet not found");
      }

      const originalWidth = sheet.style.width;
      const originalMinHeight = sheet.style.minHeight;
      const originalMaxWidth = sheet.style.maxWidth;
      const originalTransform = sheet.style.transform;
      const originalPadding = sheet.style.padding;
      const originalBoxShadow = sheet.style.boxShadow;
      const originalBorder = sheet.style.border;

      sheet.style.width = "794px";
      sheet.style.minHeight = "1123px";
      sheet.style.maxWidth = "none";
      sheet.style.transform = "none";
      sheet.style.padding = "34px 34px 34px 96px";
      sheet.style.boxShadow = "none";
      sheet.style.border = "none";

      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(sheet, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          let cssText = "";
          try {
            for (const sheetObj of Array.from(document.styleSheets)) {
              try {
                if (sheetObj.href && !sheetObj.href.startsWith(window.location.origin)) {
                  continue;
                }
                const rules = sheetObj.cssRules || sheetObj.rules;
                if (rules) {
                  for (const rule of Array.from(rules)) {
                    cssText += rule.cssText + "\n";
                  }
                }
              } catch (e) {
                // Ignore cross-origin error
              }
            }
          } catch (err) {
            console.error("Failed to read stylesheets:", err);
          }

          const sanitizedCss = replaceOklchInString(cssText);

          clonedDoc.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => {
            el.remove();
          });

          const newStyle = clonedDoc.createElement("style");
          newStyle.textContent = sanitizedCss;
          clonedDoc.head.appendChild(newStyle);

          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            const originalGetComputedStyle = clonedWindow.getComputedStyle;
            (clonedWindow as any).getComputedStyle = function (elt: any, pseudoElt: any) {
              const style = originalGetComputedStyle.call(this, elt, pseudoElt);
              return new Proxy(style, {
                get(target, prop, receiver) {
                  if (typeof prop === "string") {
                    if (prop === "getPropertyValue") {
                      return function(propertyName: string) {
                        const val = target.getPropertyValue(propertyName);
                        return replaceOklchInString(val);
                      };
                    }
                    const val = Reflect.get(target, prop, receiver);
                    if (typeof val === "string") {
                      return replaceOklchInString(val);
                    }
                    return val;
                  }
                  return Reflect.get(target, prop, receiver);
                }
              });
            };
          }

          clonedDoc.querySelectorAll("[style]").forEach((el) => {
            const htmlEl = el as HTMLElement;
            const styleAttr = htmlEl.getAttribute("style");
            if (styleAttr && styleAttr.includes("oklch")) {
              htmlEl.setAttribute("style", replaceOklchInString(styleAttr));
            }
          });
        }
      });

      sheet.style.width = originalWidth;
      sheet.style.minHeight = originalMinHeight;
      sheet.style.maxWidth = originalMaxWidth;
      sheet.style.transform = originalTransform;
      sheet.style.padding = originalPadding;
      sheet.style.boxShadow = originalBoxShadow;
      sheet.style.border = originalBorder;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      const cleanSubject = (letterData.subject || "document").replace(/[^\w\u0900-\u097F\s]/gi, "").trim();
      pdf.save(`Chalani_${entry.chalaniNo || "Ref"}_${cleanSubject || "Document"}.pdf`);
    } catch (err) {
      console.error("Failed to generate and download PDF inside modal", err);
      alert(isNe ? "पीडीएफ फाइल डाउनलोड गर्न असफल भयो।" : "Failed to download PDF file.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!state) {
      alert(isNe ? "चलानी दर्ता विवरण अपूर्ण छ, त्यसैले वर्ड निर्यात गर्न सकिएन।" : "Letter configuration state is incomplete; Word export unavailable.");
      return;
    }
    setIsDownloadingDocx(true);
    try {
      const blob = await generateDocxBlob(state, null);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanSubject = state.subject.replace(/[^\w\u0900-\u097F\s]/gi, "").trim();
      a.download = `${cleanSubject || "Document"}_Chalani_${entry.chalaniNo || "Ref"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate and download DOCX inside modal", err);
      alert(isNe ? "वर्ड फाइल डाउनलोड गर्न असफल भयो।" : "Failed to download Word file.");
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const handlePrintDocument = () => {
    const printContent = document.getElementById("modal-a4-sheet")?.innerHTML;
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) {
      alert(isNe ? "पपअप ब्लकरले प्रिन्ट विन्डो रोकेको छ।" : "Popup blocker prevented opening the print screen.");
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>${isNe ? "आधिकारिक सरकारी पत्र" : "Official Government Document"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Georgia&display=swap');
            body {
              font-family: ${letterData.language === "ne" ? "'Noto Sans Devanagari', sans-serif" : "'Georgia', serif"};
              background-color: white;
              color: black;
              margin: 0;
              padding: 0;
            }
            .print-page {
              width: 21cm;
              min-height: 29.7cm;
              padding: 2cm;
              box-sizing: border-box;
              position: relative;
              margin: 0 auto;
            }
            .text-red-600 { color: #dc2626 !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .border-red-100 { border-color: #fee2e2 !important; }
            .border-slate-200 { border-color: #e2e8f0 !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .font-bold { font-weight: bold !important; }
            .font-extrabold { font-weight: 800 !important; }
            .font-semibold { font-weight: 600 !important; }
            .text-xs { font-size: 12px !important; }
            .text-sm { font-size: 14px !important; }
            .text-lg { font-size: 18px !important; }
            .text-2xl { font-size: 24px !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .text-justify { text-align: justify !important; }
            .indent-12 { text-indent: 48px !important; }
            .indent-8 { text-indent: 32px !important; }
            .leading-relaxed { line-height: 1.625 !important; }
            .leading-normal { line-height: 1.5 !important; }
            .mt-1 { margin-top: 4px !important; }
            .mt-2 { margin-top: 8px !important; }
            .mt-4 { margin-top: 16px !important; }
            .mt-6 { margin-top: 24px !important; }
            .mt-12 { margin-top: 48px !important; }
            .mb-2 { margin-bottom: 8px !important; }
            .mb-3 { margin-bottom: 12px !important; }
            .mb-4 { margin-bottom: 16px !important; }
            .mb-6 { margin-bottom: 24px !important; }
            .w-full { width: 100% !important; }
            .grid { display: grid !important; }
            .grid-cols-2 { grid-template-cols: repeat(2, minmax(0, 1fr)) !important; }
            .border-b-2 { border-bottom-width: 2px !important; }
            .border-b { border-bottom-width: 1px !important; }
            .border-t { border-top-width: 1px !important; }
            .border { border-width: 1px !important; }
            .border-collapse { border-collapse: collapse !important; }
            .px-4 { padding-left: 16px !important; padding-right: 16px !important; }
            .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
            .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
            .flex { display: flex !important; }
            .justify-between { justify-content: space-between !important; }
            .items-end { align-items: flex-end !important; }
            .items-center { align-items: center !important; }
            .flex-col { flex-direction: column !important; }
            .w-20 { width: 80px !important; }
            .h-20 { height: 80px !important; }
            .w-64 { width: 256px !important; }
            .italic { font-style: italic !important; }
            .absolute { position: absolute !important; }
            .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
            .opacity-\\[0\\.03\\] { opacity: 0.03 !important; }
            .pointer-events-none { pointer-events: none !important; }
            .object-contain { object-fit: contain !important; }
            .justify-center { justify-content: center !important; }
            
            @media print {
              body { background: white; color: black; }
              .print-actions-warning { display: none; }
              @page { size: A4; margin: 0; }
            }
           style
        </head>
        <body>
          <div class="print-page">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Dialog Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col w-full max-w-6xl h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Topbar */}
        <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">
                  {isNe ? "चलानी दर्ता विवरण" : "Dispatch Log Details"}
                </span>
                <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {isNe ? `चलानी नं. ${entry.chalaniNo}` : `Ref No. ${entry.chalaniNo}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isNe 
                  ? `दर्ता मिति: ${entry.dateBS} (BS) | दर्ताकर्ता: ${entry.sender}` 
                  : `Dispatched: ${entry.dateAD} (AD) | Signed by: ${entry.sender}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Load Back into Editor Button */}
            <button
              onClick={() => {
                const label = isNe 
                  ? "के तपाईं यो पत्र विवरण मुख्य सम्पादन बोर्डमा लोड गर्न चाहनुहुन्छ? यसले तपाईंको हालको मस्यौदा प्रतिस्थापन गर्नेछ।" 
                  : "Are you sure you want to load this letter back into the editor board? This will replace your active draft.";
                if (confirm(label)) {
                  onLoadIntoEditor(entry);
                  onClose();
                }
              }}
              className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isNe ? "यस पत्रलाई सम्पादन बोर्डमा खोल्नुहोस्" : "Restore this letter configuration into the draft editor"}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isNe ? "बोर्डमा सम्पादन गर्नुहोस्" : "Edit / Open in Board"}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Metadata Panel (Quick Actions & Details Summary) */}
          <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto flex flex-col gap-6 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {isNe ? "कागजात विवरण" : "Document Summary"}
              </span>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">
                {entry.subject || (isNe ? "बिना विषयको पत्र" : "No Subject")}
              </h3>
            </div>

            {/* Quick Summary Grid */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isNe ? "दर्ता मिति" : "Dispatch Date"}
                    </p>
                    <p className="font-semibold text-slate-700 mt-0.5 font-sans">
                      {isNe ? entry.dateBS : entry.dateAD}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isNe ? "हस्ताक्षरकर्ता" : "Sender / Dispatched By"}
                    </p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {entry.sender}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isNe ? "पाउने कार्यालय" : "Recipient Authority"}
                    </p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {entry.recipient}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar inside Panel */}
            <div className="space-y-2.5 mt-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {isNe ? "निर्यात तथा प्रिन्ट" : "Export & Actions"}
              </span>

              <button
                onClick={handleCopyText}
                className="w-full px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-slate-400" />
                  {isNe ? "व्यहोरा कपी गर्नुहोस्" : "Copy Text Content"}
                </span>
                {copied && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:bg-red-400 justify-center"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>
                  {isDownloadingPdf 
                    ? (isNe ? "पीडीएफ लोड..." : "Generating...") 
                    : (isNe ? "पीडीएफ फाइल डाउनलोड" : "Download PDF File")
                  }
                </span>
              </button>

              <button
                onClick={handleDownloadDocx}
                disabled={isDownloadingDocx}
                className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:bg-slate-400 justify-center"
              >
                {isDownloadingDocx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                )}
                <span>
                  {isDownloadingDocx 
                    ? (isNe ? "वर्ड लोड..." : "Downloading...") 
                    : (isNe ? "वर्ड फाइल डाउनलोड (.docx)" : "Download MS Word (.docx)")
                  }
                </span>
              </button>

              <button
                onClick={handlePrintDocument}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 justify-center transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isNe ? "पत्र सिधै प्रिन्ट गर्नुहोस्" : "Direct Print Letter"}</span>
              </button>
            </div>
          </div>

          {/* Right A4 Document Preview Stage */}
          <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex flex-col items-center shadow-inner h-full">
            
            {/* A4 Sheet Rendering Container */}
            <div
              id="modal-a4-sheet"
              className="w-full max-w-[21cm] min-h-[29.7cm] bg-white text-slate-900 shadow-xl border border-slate-200 pt-[34px] pb-[34px] pl-[96px] pr-[34px] flex flex-col justify-between relative select-text mb-4"
              style={{ fontFamily: letterData.language === "ne" ? "Noto Sans Devanagari, sans-serif" : "Georgia, serif" }}
            >
              {/* Sheet Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                {letterData.emblemType === "custom" && letterData.customLogoUrl ? (
                  <img src={letterData.customLogoUrl} alt="Watermark" className="w-80 h-80 object-contain" />
                ) : (
                  <NepalEmblemSVG type={letterData.emblemType || "nepal"} size={320} />
                )}
              </div>

              <div className="flex flex-col flex-1">
                {/* 1. Header block */}
                <div className="relative mb-2 w-full flex flex-col">
                  {/* Left Logo Emblem */}
                  <div className="absolute left-0 top-0 w-16 h-16 flex items-start justify-start select-none">
                    {letterData.emblemType === "custom" && letterData.customLogoUrl ? (
                      <img src={letterData.customLogoUrl} alt="Office Logo" className="w-16 h-16 object-contain" />
                    ) : (
                      <NepalEmblemSVG type={letterData.emblemType || "nepal"} size={64} />
                    )}
                  </div>

                  {/* Center block */}
                  <div className="w-full flex flex-col items-center">
                    {letterData.officeProvince && (
                      <h3 className="text-red-600 text-xs font-bold tracking-wide">
                        {letterData.officeProvince}
                      </h3>
                    )}
                    {letterData.officeName && (
                      <h1 className="text-red-600 text-base md:text-xl font-extrabold tracking-tight mt-1">
                        {letterData.officeName}
                      </h1>
                    )}
                  </div>

                  {/* Department and Address Right */}
                  <div className="grid grid-cols-3 items-center w-full mt-1 px-2">
                    <div />
                    <div className="text-center">
                      {letterData.officeDepartment && (
                        <h2 className="text-red-600 text-xs font-semibold tracking-wide">
                          ({letterData.officeDepartment})
                        </h2>
                      )}
                    </div>
                    <div className="text-right">
                      {letterData.officeAddress && (
                        <div className="text-red-600 font-bold text-xs leading-none">
                          {letterData.officeAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Metadata details (Letter No, Dispatch No, Date) */}
                <div className="grid grid-cols-2 text-xs mt-2 mb-6 border-b border-red-100 pb-3 font-semibold">
                  <div className="space-y-1 text-left text-red-600 font-bold">
                    <p>
                      <span>{letterData.language === "ne" ? "पत्र संख्या:-" : "Letter No:-"}</span>{" "}
                      <span className="font-semibold text-slate-800">{letterData.letterNo}</span>
                    </p>
                    <p>
                      <span>{letterData.language === "ne" ? "चलानी नम्बर:-" : "Dispatch No:-"}</span>{" "}
                      <span className="font-semibold text-slate-800">{letterData.dispatchNo}</span>
                    </p>
                  </div>
                  <div className="text-right flex flex-col justify-end items-end text-red-600 font-bold">
                    <p>
                      <span>{letterData.language === "ne" ? "मिति:" : "Date:"}</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {letterData.language === "ne" ? letterData.dateBS : letterData.dateAD}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. Recipient Info block */}
                {(letterData.recipientDesignation || letterData.recipientOffice) && (
                  <div className="text-xs md:text-sm text-slate-950 font-bold mb-6 flex flex-col gap-0.5 leading-normal text-left">
                    {letterData.recipientDesignation && (
                      <div>
                        {letterData.recipientSalutation ? `${letterData.recipientSalutation} ` : ""}
                        {letterData.recipientDesignation},
                      </div>
                    )}
                    {letterData.recipientOffice && <div>{letterData.recipientOffice},</div>}
                    {letterData.recipientAddress && (
                      <div className="font-medium text-slate-500">{letterData.recipientAddress}.</div>
                    )}
                  </div>
                )}

                {/* 4. Letter Subject block */}
                {letterData.subject && (
                  <div className="text-center mb-6 mt-4">
                    <span className="border-b-2 border-slate-900 font-bold px-2 py-0.5 text-xs md:text-sm uppercase tracking-wide">
                      {letterData.language === "ne" ? `विषय: ${letterData.subject}` : `Subject: ${letterData.subject}`}
                    </span>
                  </div>
                )}

                {/* 5. Salutation */}
                {letterData.salutation && (
                  <div className="text-xs md:text-sm font-semibold text-slate-800 mb-4 text-left">
                    {letterData.salutation}
                  </div>
                )}

                {/* 6. Letter Main Body */}
                {letterData.body ? (
                  <div className="text-xs md:text-sm text-slate-800 font-serif">
                    {renderFormattedContent(letterData.body)}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-6">
                    {letterData.language === "ne" ? "[ पत्रको व्यहोरा खाली छ ]" : "[ Letter body is empty ]"}
                  </div>
                )}

                {/* 7. Tapasil Table Details block */}
                {letterData.showTapasil && letterData.tapasilItems && letterData.tapasilItems.length > 0 && (
                  <div className="mt-6 text-left">
                    <div className="text-xs md:text-sm font-bold text-slate-900 mb-2 font-sans uppercase tracking-wider text-[10px]">
                      {letterData.tapasilTitle || (letterData.language === "ne" ? "तपसिल विवरणहरू:" : "Details:")}
                    </div>

                    <table className="w-full border-collapse border border-slate-200 text-xs md:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-bold font-sans text-[10px] uppercase tracking-wider">
                          <th className="border border-slate-200 px-3 py-2 text-center w-12">
                            {letterData.language === "ne" ? "क्र.सं." : "S.N."}
                          </th>
                          <th className="border border-slate-200 px-4 py-2 text-left">
                            {letterData.language === "ne" ? "विवरण" : "Particulars"}
                          </th>
                          <th className="border border-slate-200 px-4 py-2 text-left">
                            {letterData.language === "ne" ? "कैफियत / विवरण थप" : "Remarks / Details"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {letterData.tapasilItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 font-serif">
                            <td className="border border-slate-200 px-3 py-2 text-center font-sans">
                              {letterData.language === "ne" ? toNepaliNumerals(index + 1) : index + 1}
                            </td>
                            <td className="border border-slate-200 px-4 py-2 text-slate-800">
                              {item.particular || <span className="text-slate-300 italic">--</span>}
                            </td>
                            <td className="border border-slate-200 px-4 py-2 text-slate-800">
                              {item.detail || <span className="text-slate-300 italic">--</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 8. Dual QR Code & Sign-off Footer area */}
              <div className="mt-12 flex justify-between items-end w-full">
                {/* Verification QR Code (Bottom Left) */}
                {letterData.showQrCode && letterData.qrCodeValue ? (
                  <div className="flex flex-col items-start text-left max-w-[200px]">
                    <div className="p-1.5 bg-white border border-slate-100 rounded-md shadow-xs">
                      <QrCodeRenderer value={letterData.qrCodeValue} size={70} />
                    </div>
                    {letterData.qrCodeLabel && (
                      <p className="text-[9px] leading-tight text-slate-500 font-medium mt-1.5 max-w-[160px]">
                        {letterData.qrCodeLabel}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Sign-off Block (Bottom Right) */}
                <div className="flex flex-col items-center text-center text-xs md:text-sm text-slate-800 w-64 border-t-0">
                  <div className="text-slate-400 font-medium mb-2 select-none">
                    ...........................................
                  </div>

                  {letterData.senderName && (
                    <p className="font-bold text-slate-900">{letterData.senderName}</p>
                  )}
                  {letterData.senderDesignation && (
                    <p className="text-xs italic text-slate-600 font-serif">{letterData.senderDesignation}</p>
                  )}
                </div>
              </div>

              {/* 9. Dynamic Office Absolute Footer */}
              <div className="absolute bottom-10 left-10 right-10">
                <div className="border-t border-red-600 w-full mb-3"></div>
                <p className="text-center text-[10px] text-red-600 font-semibold tracking-wide">
                  {letterData.language === "ne" ? (
                    <>
                      {letterData.footerPhone && `फोन नं. ${letterData.footerPhone}`}
                      {letterData.footerPhone && letterData.footerEmail && `, `}
                      {letterData.footerEmail && `ईमेलः ${letterData.footerEmail}`}
                      {(letterData.footerPhone || letterData.footerEmail) && letterData.footerWeb && `, `}
                      {letterData.footerWeb && `वेबसाईटः ${letterData.footerWeb}`}
                    </>
                  ) : (
                    <>
                      {letterData.footerPhone && `Phone No. ${letterData.footerPhone}`}
                      {letterData.footerPhone && letterData.footerEmail && ` | `}
                      {letterData.footerEmail && `Email: ${letterData.footerEmail}`}
                      {(letterData.footerPhone || letterData.footerEmail) && letterData.footerWeb && ` | `}
                      {letterData.footerWeb && `Website: ${letterData.footerWeb}`}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Print actions bottom warning warning */}
            <p className="text-[10px] text-slate-400 mt-2 font-sans font-medium">
              {isNe 
                ? "नोट: कागजातको लेआउट आधिकारिक A4 सरकारी ढाँचा अनुसार तयार गरिएको छ।" 
                : "Note: Document layout adheres to standard Government A4 sizing specifications."
              }
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
