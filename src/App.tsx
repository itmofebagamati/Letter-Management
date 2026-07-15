import React, { useState, useEffect, ReactNode, useRef } from "react";
import {
  FileDown,
  RotateCcw,
  Sparkles,
  Languages,
  Plus,
  Trash,
  Check,
  Copy,
  Building,
  Calendar,
  User,
  MapPin,
  Layers,
  Loader2,
  FileText,
  History,
  Database,
  BookOpen,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Printer,
  Palette,
  Undo,
  Redo,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Eraser
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { LetterState, Language, PresetOffice, TapasilItem, EmblemType } from "./types";
import { OFFICE_PRESETS, toNepaliNumerals, getPrefilledNepaliDate } from "./presets";
import { generateDocxBlob } from "./docxGenerator";
import nepalEmblemUrl from "../assets/nepal_emblem.svg";
import { 
  getNextChalaniNumber, 
  logChalaniEntry, 
  fetchChalaniRegister, 
  setSectionCounter 
} from "./firebase";

// HTML & Markdown formatting parser helpers for document preview
function parseHtmlTags(html: string, counter = { current: 0 }): ReactNode[] {
  if (!html) return [];

  const containerRegex = /<(b|i|u|red|blue|green|purple|orange|gray|center|right|justify)>([\s\S]*?)<\/\1>/i;
  const imgRegex = /<img\s+src="([^"]+)"(?:\s+width="([^"]+)")?\s*\/?>/i;
  const hrRegex = /<hr\s*\/?>/i;

  const matchContainer = html.match(containerRegex);
  const matchImg = html.match(imgRegex);
  const matchHr = html.match(hrRegex);

  // Find the earliest matching tag to preserve sequential rendering order
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

    const elKey = `pht-${counter.current++}`;

    if (tag === "b") {
      results.push(<strong key={elKey} className="font-bold text-slate-900">{innerContent}</strong>);
    } else if (tag === "i") {
      results.push(<em key={elKey} className="italic text-slate-800">{innerContent}</em>);
    } else if (tag === "u") {
      results.push(<span key={elKey} className="underline decoration-slate-800 decoration-1 underline-offset-2">{innerContent}</span>);
    } else if (tag === "red") {
      results.push(<span key={elKey} className="text-red-600 font-medium">{innerContent}</span>);
    } else if (tag === "blue") {
      results.push(<span key={elKey} className="text-blue-600 font-medium">{innerContent}</span>);
    } else if (tag === "green") {
      results.push(<span key={elKey} className="text-emerald-600 font-medium">{innerContent}</span>);
    } else if (tag === "purple") {
      results.push(<span key={elKey} className="text-purple-600 font-medium">{innerContent}</span>);
    } else if (tag === "orange") {
      results.push(<span key={elKey} className="text-amber-600 font-medium">{innerContent}</span>);
    } else if (tag === "gray") {
      results.push(<span key={elKey} className="text-slate-500">{innerContent}</span>);
    } else if (tag === "center") {
      results.push(<div key={elKey} className="text-center my-1 w-full block">{innerContent}</div>);
    } else if (tag === "right") {
      results.push(<div key={elKey} className="text-right my-1 w-full block">{innerContent}</div>);
    } else if (tag === "justify") {
      results.push(<div key={elKey} className="text-justify my-1 w-full block leading-relaxed">{innerContent}</div>);
    }
  } else if (type === "img") {
    const src = matchObj[1];
    const widthVal = matchObj[2] || "150";
    const elKey = `pht-${counter.current++}`;
    results.push(
      <span key={elKey} className="my-2.5 flex flex-col items-center select-none">
        <img 
          src={src} 
          alt="Embedded Asset" 
          style={{ maxWidth: "100%", width: `${widthVal}px` }} 
          className="rounded border border-slate-200 shadow-sm object-contain"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  } else if (type === "hr") {
    const elKey = `pht-${counter.current++}`;
    results.push(<hr key={elKey} className="my-3 border-t border-slate-300 w-full" />);
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

// High-fidelity representational Nepal Government emblem SVG component
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

function QrCodeRenderer({ value, size = 80 }: { value: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(
      value,
      {
        width: size * 2, // high-fidelity super crisp print
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

export default function App() {
  const initialDates = getPrefilledNepaliDate();

  // Primary states
  const [state, setState] = useState<LetterState>({
    language: "ne",
    presetId: "mofe_bagamati", // Default to the user's Ministry of Economic Affairs & Planning, Bagamati Province
    officeProvince: "बागमती प्रदेश सरकार",
    officeName: "आर्थिक मामिला तथा योजना मन्त्रालय",
    officeDepartment: "",
    officeSection: "office",
    officeAddress: "हेटौंडा, मकवानपुर",
    emblemType: "province_bagamati",
    customLogoUrl: "",
    footerPhone: "+९७७-५७-५२७०१४",
    footerEmail: "mofe@bagamati.gov.np",
    footerWeb: "mofe.bagamati.gov.np",
    letterNo: "२०८२/०८३",
    dispatchNo: "४८२",
    dateBS: initialDates.bsDate,
    dateAD: initialDates.adDate,
    recipientSalutation: "श्री",
    recipientDesignation: "प्रमुख कोष नियन्त्रकज्यू",
    recipientOffice: "प्रदेश कोष तथा लेखा नियन्त्रक कार्यालय",
    recipientAddress: "हेटौंडा, बागमती प्रदेश",
    subject: "बजेट अख्तियारी तथा निकासा सम्बन्धमा।",
    salutation: "महोदय,",
    body: "प्रस्तुत विषयमा बागमती प्रदेश सरकारको स्वीकृत वार्षिक कार्यक्रम अनुसार यस आर्थिक मामिला तथा योजना मन्त्रालय अन्तर्गत सञ्चालन हुने डिजिटल शासकीय सुदृढीकरण तथा पूर्वाधार विकास कार्यक्रमका लागि विनियोजित बजेट तथा कार्यक्रम कार्यतालिका स्वीकृत भइसकेको ब्यहोरा अवगत नै छ।\n\nसो कार्यका लागि आवश्यक पहिलो चौमासिकको बजेट अख्तियारी दिई नियमानुसार आर्थिक निकासा उपलब्ध गराउनुहुन सादर अनुरोध गरिन्छ।",
    senderName: "हरिप्रसाद अधिकारी",
    senderDesignation: "शाखा अधिकृत",
    showTapasil: true,
    tapasilTitle: "तपसिल विवरणहरू:",
    tapasilItems: [
      { id: "1", particular: "डिजिटल प्रविधि पूर्वाधार र तालिम बजेट", detail: "रु १५,००,०००/-" },
      { id: "2", particular: "कार्यालय अटोमेसन सफ्टवेयर इजाजतपत्र", detail: "रु ५,००,०००/-" }
    ],
    showQrCode: true,
    qrCodeValue: "https://mofe.bagamati.gov.np/verify/482",
    qrCodeLabel: "यस पत्रको आधिकारिकता जाँच गर्न क्युआर कोड स्क्यान गर्नुहोस् ।"
  });

  // Rich Text Editor History Management for Undo/Redo
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastSavedBodyRef = useRef(state.body);

  const pushToHistory = (currentBody: string) => {
    if (currentBody !== lastSavedBodyRef.current) {
      setUndoStack((prev) => [...prev, lastSavedBodyRef.current]);
      setRedoStack([]); // Clear redo on any new action
      lastSavedBodyRef.current = currentBody;
    }
  };

  // Debounced save for live keyboard typing inside textarea
  useEffect(() => {
    const timer = setTimeout(() => {
      pushToHistory(state.body);
    }, 800);
    return () => clearTimeout(timer);
  }, [state.body]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevBody = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    
    setUndoStack(newUndoStack);
    setRedoStack((prev) => [...prev, state.body]);
    
    lastSavedBodyRef.current = prevBody;
    setState((prev) => ({ ...prev, body: prevBody }));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextBody = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, state.body]);
    setRedoStack(newRedoStack);

    lastSavedBodyRef.current = nextBody;
    setState((prev) => ({ ...prev, body: nextBody }));
  };

  // Insert image via base64 upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInsertImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      const textarea = document.getElementById("letter-body-textarea") as HTMLTextAreaElement;
      if (!textarea) return;

      const text = state.body;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const beforeText = text.substring(0, start);
      const afterText = text.substring(end);

      const imageTag = `<img src="${base64}" width="200"/>`;
      const updatedBody = `${beforeText}${imageTag}${afterText}`;

      // Push history immediately before applying change
      pushToHistory(text);

      setState((prev) => ({ ...prev, body: updatedBody }));
      
      // Clear file selection to allow selecting same file again
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // AI assistant loading and prompt states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLetterType, setAiLetterType] = useState("request");
  const [customLetterType, setCustomLetterType] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Office Section configurations
  const OFFICE_SECTIONS = [
    { id: "admin", nameNe: "प्रशासन शाखा", nameEn: "Administration Section" },
    { id: "it", nameNe: "सूचना प्रविधि शाखा", nameEn: "IT Section" },
    { id: "accounts", nameNe: "लेखा शाखा", nameEn: "Accounts Section" },
    { id: "planning", nameNe: "योजना तथा बजेट शाखा", nameEn: "Planning & Budget Section" },
    { id: "legal", nameNe: "कानून शाखा", nameEn: "Legal Section" },
    { id: "custom", nameNe: "अन्य शाखा / विभाग", nameEn: "Custom Section" }
  ];

  // Chalani Register & Auto Chalani States
  const [isAutoChalani, setIsAutoChalani] = useState(true);
  const [chalaniRegister, setChalaniRegister] = useState<any[]>([]);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isRegisteringNow, setIsRegisteringNow] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "register">("editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Bulk Generation States
  const [bulkRecipientsRaw, setBulkRecipientsRaw] = useState<string>(
    `श्री प्रमुख प्रशासकीय अधिकृत, बनेपा नगरपालिका, काभ्रे
श्री कार्यालय प्रमुख, जिल्ला प्रशासन कार्यालय, हेटौंडा
श्री सचिवज्यू, भौतिक पूर्वाधार विकास मन्त्रालय, हेटौंडा`
  );
  const [bulkFormat, setBulkFormat] = useState<"docx" | "pdf" | "both">("docx");
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgressCurrent, setBulkProgressCurrent] = useState(0);
  const [bulkProgressTotal, setBulkProgressTotal] = useState(0);
  const [bulkProgressMessage, setBulkProgressMessage] = useState("");

  // Synchronize fields when language changes
  const handleLanguageChange = (lang: Language) => {
    // Translate bulk generation default text if unchanged
    const oldNe = `श्री प्रमुख प्रशासकीय अधिकृत, बनेपा नगरपालिका, काभ्रे\nश्री कार्यालय प्रमुख, जिल्ला प्रशासन कार्यालय, हेटौंडा\nश्री सचिवज्यू, भौतिक पूर्वाधार विकास मन्त्रालय, हेटौंडा`;
    const oldEn = `Mr. Chief Administrative Officer, Banepa Municipality, Kavre\nThe District Head, District Administration Office, Hetauda\nThe Secretary, Ministry of Physical Infrastructure Development, Hetauda`;

    if (lang === "ne" && (bulkRecipientsRaw.trim() === oldEn.trim() || bulkRecipientsRaw.trim() === "")) {
      setBulkRecipientsRaw(oldNe);
    } else if (lang === "en" && (bulkRecipientsRaw.trim() === oldNe.trim() || bulkRecipientsRaw.trim() === "")) {
      setBulkRecipientsRaw(oldEn);
    }

    setState((prev) => {
      const isNe = lang === "ne";
      const preset = OFFICE_PRESETS.find((p) => p.id === prev.presetId) || OFFICE_PRESETS[0];

      let phone = prev.footerPhone;
      let email = prev.footerEmail;
      let web = prev.footerWeb;

      // Only reset standard preset footers if they haven't been manually altered too much
      if (prev.presetId === "mofe_bagamati") {
        phone = isNe ? "+९७७-५७-५२७०१४" : "+977-57-527014";
        email = "mofe@bagamati.gov.np";
        web = "mofe.bagamati.gov.np";
      } else if (prev.presetId === "mofaga_federal") {
        phone = isNe ? "+९७७-१-४२११६७३" : "+977-1-4211673";
        email = "info@mofaga.gov.np";
        web = "mofaga.gov.np";
      } else if (prev.presetId === "ward_local") {
        phone = isNe ? "+९७७-५७-५२०३१२" : "+977-57-520312";
        email = "ward3@hetaudamun.gov.np";
        web = "hetaudamun.gov.np";
      } else if (prev.presetId === "dao_district") {
        phone = isNe ? "+९७७-१-४२६२४५२" : "+977-1-4262452";
        email = "dao.kathmandu@moha.gov.np";
        web = "daokathmandu.moha.gov.np";
      }

      let dept = isNe ? preset.department : preset.departmentEn;
      if (prev.officeSection && prev.officeSection !== "none" && prev.officeSection !== "custom") {
        const matched = OFFICE_SECTIONS.find((sec) => sec.id === prev.officeSection);
        if (matched) {
          dept = isNe ? matched.nameNe : matched.nameEn;
        }
      } else if (prev.officeSection === "custom" || prev.officeDepartment) {
        dept = prev.officeDepartment;
      }

      return {
        ...prev,
        language: lang,
        officeName: isNe ? preset.name : preset.nameEn,
        officeProvince: isNe ? preset.province : preset.provinceEn,
        officeDepartment: dept,
        officeAddress: isNe ? preset.address : preset.addressEn,
        senderName: isNe ? preset.senderName.split(" (")[0] : preset.senderName,
        senderDesignation: isNe ? "शाखा अधिकृत" : "Section Officer",
        recipientOffice: isNe ? preset.recipientOffice : "Provincial Treasury and Accounts Controller Office",
        recipientAddress: isNe ? preset.recipientAddress : "Hetauda, Nepal",
        recipientSalutation: isNe ? "श्री" : "The",
        salutation: isNe ? "महोदय," : "Dear Sir/Madam,",
        subject: isNe ? "बजेट निकासा सम्बन्धमा।" : "Regarding Budget Allocation.",
        body: isNe 
          ? "प्रस्तुत विषयमा यस मन्त्रालयको स्वीकृत वार्षिक कार्यक्रम अनुसार विनियोजित बजेट निकासा गरी कार्य अगाडि बढाउन आवश्यक समन्वय गरिदिनुहुन सादर अनुरोध गरिन्छ।"
          : "In reference to the subject mentioned above, we kindly request your office to coordinate and release the approved budget allocation as per the annual plan.",
        tapasilTitle: isNe ? "तपसिल विवरणहरू:" : "Details List:",
        qrCodeLabel: isNe 
          ? "यस पत्रको आधिकारिकता जाँच गर्न क्युआर कोड स्क्यान गर्नुहोस् ।"
          : "Scan this QR code to verify the authenticity of this document.",
        footerPhone: phone,
        footerEmail: email,
        footerWeb: web
      };
    });
  };

  // Synchronize fields when preset changes
  const handlePresetChange = (presetId: string) => {
    const preset = OFFICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setState((prev) => {
      const isNe = prev.language === "ne";
      
      let phone = prev.footerPhone;
      let email = prev.footerEmail;
      let web = prev.footerWeb;

      if (presetId === "mofe_bagamati") {
        phone = isNe ? "+९७७-५७-५२७०१४" : "+977-57-527014";
        email = "mofe@bagamati.gov.np";
        web = "mofe.bagamati.gov.np";
      } else if (presetId === "mofaga_federal") {
        phone = isNe ? "+९७७-१-४२११६७३" : "+977-1-4211673";
        email = "info@mofaga.gov.np";
        web = "mofaga.gov.np";
      } else if (presetId === "ward_local") {
        phone = isNe ? "+९७७-५७-५२०३१२" : "+977-57-520312";
        email = "ward3@hetaudamun.gov.np";
        web = "hetaudamun.gov.np";
      } else if (presetId === "dao_district") {
        phone = isNe ? "+९७७-१-४२६२४५२" : "+977-1-4262452";
        email = "dao.kathmandu@moha.gov.np";
        web = "daokathmandu.moha.gov.np";
      }

      return {
        ...prev,
        presetId,
        officeName: isNe ? preset.name : preset.nameEn,
        officeProvince: isNe ? preset.province : preset.provinceEn,
        officeSection: "none",
        officeDepartment: isNe ? preset.department : preset.departmentEn,
        officeAddress: isNe ? preset.address : preset.addressEn,
        emblemType: preset.emblemType,
        senderName: preset.senderName,
        senderDesignation: isNe ? "शाखा अधिकृत" : "Section Officer",
        recipientOffice: isNe ? preset.recipientOffice : preset.recipientOffice || "Concerned Authority",
        recipientAddress: isNe ? preset.recipientAddress : preset.recipientAddress || "Kathmandu, Nepal",
        recipientSalutation: isNe ? "श्री" : "The",
        salutation: isNe ? "महोदय," : "Dear Sir/Madam,",
        footerPhone: phone,
        footerEmail: email,
        footerWeb: web
      };
    });
  };

  // Tapasil handlers
  const handleAddTapasil = () => {
    const newItem: TapasilItem = {
      id: Date.now().toString(),
      particular: "",
      detail: ""
    };
    setState((prev) => ({
      ...prev,
      tapasilItems: [...prev.tapasilItems, newItem]
    }));
  };

  const handleUpdateTapasil = (id: string, field: "particular" | "detail", value: string) => {
    setState((prev) => ({
      ...prev,
      tapasilItems: prev.tapasilItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveTapasil = (id: string) => {
    setState((prev) => ({
      ...prev,
      tapasilItems: prev.tapasilItems.filter((item) => item.id !== id)
    }));
  };

  // AI drafting logic via server-side /api/gemini/assist endpoint
  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) {
      setAiError(state.language === "ne" ? "कृपया एआईलाई पत्रको संक्षिप्त विवरण दिनुहोस्।" : "Please enter a brief topic/instructions for the AI.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiPrompt,
          type: aiLetterType === "custom" ? (customLetterType || "Custom") : aiLetterType,
          language: state.language,
          officeName: state.officeName,
          senderRole: state.senderDesignation,
          recipientDetails: `${state.recipientSalutation} ${state.recipientDesignation}, ${state.recipientOffice}`,
          keyPoints: state.showTapasil ? "Please structure some specific line items for tapasil table if appropriate" : ""
        })
      });

      if (!response.ok) {
        let errMsg = "Failed to generate content.";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {
          try {
            const rawText = await response.text();
            if (rawText.includes("<!DOCTYPE html>") || rawText.includes("<html") || rawText.startsWith("The page c")) {
              errMsg = state.language === "ne"
                ? `सर्भर त्रुटि (${response.status}): अनुरोधित एआई सेवा उपलब्ध छैन वा ठीकसँग कन्फिगर गरिएको छैन।`
                : `Server error (${response.status}): The AI service endpoint is not configured or unavailable.`;
            } else {
              errMsg = rawText.slice(0, 150) || errMsg;
            }
          } catch {
            errMsg = `Server error (${response.status})`;
          }
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(
          state.language === "ne"
            ? "सर्भरबाट अमान्य प्रतिक्रिया प्राप्त भयो (Invalid JSON Response)।"
            : "Received an invalid response format from the server."
        );
      }

      setState((prev) => ({
        ...prev,
        subject: data.subject || prev.subject,
        salutation: data.salutation || prev.salutation,
        body: data.body || prev.body
      }));

      // Clear the prompt on success
      setAiPrompt("");
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Something went wrong while connecting with Gemini AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // docx file downloader
  const handleDownloadDocx = async () => {
    setIsDownloading(true);
    try {
      // 1. Fetch emblem or parse custom uploaded logo to bundle into Word document
      let emblemBuffer: ArrayBuffer | null = null;
      if (state.emblemType === "custom" && state.customLogoUrl) {
        try {
          const base64Str = state.customLogoUrl;
          const parts = base64Str.split(';base64,');
          const raw = window.atob(parts[1] || parts[0]);
          const rawLength = raw.length;
          const array = new Uint8Array(new ArrayBuffer(rawLength));
          for (let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
          }
          emblemBuffer = array.buffer;
        } catch (err) {
          console.warn("Could not parse custom uploaded logo base64 for docx", err);
        }
      } else if (state.emblemType !== "none") {
        try {
          const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/120px-Emblem_of_Nepal.svg.png";
          const res = await fetch(url);
          if (res.ok) {
            emblemBuffer = await res.arrayBuffer();
          }
        } catch (err) {
          console.warn("Could not fetch Wikimedia emblem, using standard text header fallback inside Word document", err);
        }
      }

      // 2. Generate and download docx
      const docBlob = await generateDocxBlob(state, emblemBuffer);
      const docUrl = URL.createObjectURL(docBlob);
      
      const link = document.createElement("a");
      link.href = docUrl;
      const cleanSubject = state.subject.replace(/[^\w\u0900-\u097F\s]/gi, "").trim();
      link.download = `Government_Letter_${cleanSubject || "Nepal"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(docUrl);
    } catch (err) {
      console.error("Failed to generate and download MS Word document", err);
      alert(state.language === "ne" ? "वर्ड फाइल डाउनलोड गर्न असफल भयो।" : "Failed to download Word file.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to convert any native oklch() color codes to standard RGB/RGBA or Hex 
  // because html2canvas internal CSS parser crashes on oklch() colors.
  const replaceOklchInString = (str: string): string => {
    if (!str || typeof str !== "string" || !str.includes("oklch")) {
      return str;
    }

    return str.replace(/oklch\([^)]+\)/g, (match) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "rgba(0, 0, 0, 0)";
          ctx.fillStyle = match;
          const resolved = ctx.fillStyle;
          if (resolved && resolved !== "rgba(0, 0, 0, 0)" && resolved !== "#00000000") {
            return resolved;
          }
        }
      } catch (e) {
        console.warn("Failed to convert oklch:", match, e);
      }
      
      // Fallbacks if browser fails to translate the custom color space
      if (match.includes("0.9") || match.includes("0.8") || match.includes("0.95")) {
        return "rgb(248, 250, 252)"; // light background
      }
      if (match.includes("0.2") || match.includes("0.1") || match.includes("0.05")) {
        return "rgb(15, 23, 42)"; // dark text/background
      }
      return "rgb(100, 116, 139)"; // neutral gray fallback
    });
  };

  // Native Print / Print-to-PDF Generator
  const handlePrintDocument = () => {
    const sheet = document.getElementById("a4-sheet");
    if (!sheet) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(state.language === "ne" ? "कृपया प्रिन्ट विन्डो खोल्नको लागि पपअपहरू अनुमति दिनुहोस्।" : "Please allow popups to open the print dialog.");
      return;
    }

    // Gather and serialize all stylesheets to retain Tailwind & google font styles
    let stylesHtml = "";
    try {
      for (const sheetObj of Array.from(document.styleSheets)) {
        try {
          if (sheetObj.href && !sheetObj.href.startsWith(window.location.origin)) {
            continue;
          }
          const rules = sheetObj.cssRules || sheetObj.rules;
          if (rules) {
            stylesHtml += `<style>`;
            for (const rule of Array.from(rules)) {
              stylesHtml += rule.cssText + "\n";
            }
            stylesHtml += `</style>`;
          }
        } catch (e) {
          // Fallback to reading original style tags
        }
      }
    } catch (err) {
      console.warn("Could not read stylesheets for printing:", err);
    }

    // Include existing inline style tags
    document.querySelectorAll("style").forEach((st) => {
      stylesHtml += st.outerHTML;
    });

    // Write content with exact CSS overrides for pristine A4 layout inside browser print engine
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${state.subject || "Official Letter"}</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: white !important;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #a4-sheet {
              box-shadow: none !important;
              border: none !important;
              width: 210mm !important;
              min-height: 297mm !important;
              height: auto !important;
              margin: 0 !important;
              padding: 20mm !important;
              box-sizing: border-box !important;
            }
          </style>
        </head>
        <body>
          <div id="a4-sheet" style="${sheet.getAttribute("style") || ""}">
            ${sheet.innerHTML}
          </div>
          <script>
            window.addEventListener('DOMContentLoaded', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 600);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // PDF file downloader
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const sheet = document.getElementById("a4-sheet");
      if (!sheet) {
        throw new Error("Preview sheet not found");
      }

      // Save original inline styles to restore them later
      const originalWidth = sheet.style.width;
      const originalMinHeight = sheet.style.minHeight;
      const originalMaxWidth = sheet.style.maxWidth;
      const originalTransform = sheet.style.transform;
      const originalPadding = sheet.style.padding;
      const originalBoxShadow = sheet.style.boxShadow;
      const originalBorder = sheet.style.border;

      // Temporarily force exact desktop A4 print dimensions
      sheet.style.width = "794px"; // 21cm at 96 DPI
      sheet.style.minHeight = "1123px"; // 29.7cm at 96 DPI
      sheet.style.maxWidth = "none";
      sheet.style.transform = "none";
      sheet.style.padding = "32px 56px 40px 56px"; // 32px top, 56px left/right, 40px bottom (Exact margin specifications)
      sheet.style.boxShadow = "none";
      sheet.style.border = "none";

      // Allow browser layout engine to apply the forced dimensions
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Generate HTML canvas from the direct element
      const canvas = await html2canvas(sheet, {
        scale: 2.5, // 2.5x is optimal for high crispness and fast generation without memory overhead
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Extract and serialize all document stylesheets with oklch removed to prevent html2canvas parser crashes
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
                // skip cross-origin stylesheet errors
              }
            }
          } catch (err) {
            console.error("Failed to read stylesheets:", err);
          }

          // Replace all oklch values in the CSS text
          const sanitizedCss = replaceOklchInString(cssText);

          // Remove all existing style and link tags in clonedDoc to prevent secondary parsing crashes
          clonedDoc.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => {
            el.remove();
          });

          // Create and append a single, clean style tag with the sanitized CSS
          const newStyle = clonedDoc.createElement("style");
          newStyle.textContent = sanitizedCss;
          clonedDoc.head.appendChild(newStyle);

          // Proxy getComputedStyle on the cloned document's defaultView (window)
          // so any dynamically extracted styling returns fallback standard RGB instead of oklch
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

          // Sanitize inline style attributes in the cloned document
          clonedDoc.querySelectorAll("[style]").forEach((el) => {
            const htmlEl = el as HTMLElement;
            const styleAttr = htmlEl.getAttribute("style");
            if (styleAttr && styleAttr.includes("oklch")) {
              htmlEl.setAttribute("style", replaceOklchInString(styleAttr));
            }
          });
        }
      });

      // Restore original layout styles immediately
      sheet.style.width = originalWidth;
      sheet.style.minHeight = originalMinHeight;
      sheet.style.maxWidth = originalMaxWidth;
      sheet.style.transform = originalTransform;
      sheet.style.padding = originalPadding;
      sheet.style.boxShadow = originalBoxShadow;
      sheet.style.border = originalBorder;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const pdfWidth = 210; // A4 size in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

      const cleanSubject = state.subject.replace(/[^\w\u0900-\u097F\s]/gi, "").trim();
      pdf.save(`Government_Letter_${cleanSubject || "Nepal"}.pdf`);
    } catch (err) {
      console.error("Failed to generate and download PDF document", err);
      alert(state.language === "ne" ? "पीडीएफ फाइल डाउनलोड गर्न असफल भयो।" : "Failed to download PDF file.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // --- START CENTRAL CLOUD CHALANI IMPLEMENTATION ---
  
  // Real-time register loader
  const loadRegister = async () => {
    setIsRegisterLoading(true);
    try {
      const docs = await fetchChalaniRegister(100);
      setChalaniRegister(docs);
    } catch (err) {
      console.error("Failed to load Chalani register from Firestore:", err);
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // Run on mount to pre-populate register log
  useEffect(() => {
    loadRegister();
  }, []);

  // Atomic Cloud Issue & Official Register Dispatch Flow
  const handleRegisterAndDownload = async (format: "docx" | "pdf") => {
    setIsRegisteringNow(true);
    const originalTab = activeTab;
    try {
      const sectionId = "office";
      
      // 1. Atomically increment and reserve next running number in Firestore
      const nextNo = await getNextChalaniNumber(sectionId);
      
      // Convert to Nepali digits if letter is written in Nepali
      const formattedNo = state.language === "ne" ? toNepaliNumerals(nextNo) : String(nextNo);
      
      // Update QR verification URL value to point to this official generated reference key
      let updatedQrValue = state.qrCodeValue;
      if (state.showQrCode && state.qrCodeValue) {
        updatedQrValue = state.qrCodeValue
          .replace(/verify\/\w+/g, `verify/${formattedNo}`)
          .replace(/verify=\w+/g, `verify=${formattedNo}`)
          .replace(/letter\/\w+/g, `letter/${formattedNo}`)
          .replace(/letter=\w+/g, `letter=${formattedNo}`);
      }

      const updatedState = {
        ...state,
        dispatchNo: formattedNo,
        qrCodeValue: updatedQrValue
      };

      // Set state to update active render canvas
      setState(updatedState);
      
      // If we are downloading a PDF and the active tab is not the editor,
      // temporarily switch to "editor" so the #a4-sheet mounts in the DOM
      if (format === "pdf" && originalTab !== "editor") {
        setActiveTab("editor");
      }
      
      // Allow DOM repaint and canvas updates
      await new Promise(resolve => setTimeout(resolve, 350));

      // 2. Format recipient and sender text summary for easy tabular rendering in registry log
      const recipientString = [
        updatedState.recipientSalutation,
        updatedState.recipientDesignation,
        updatedState.recipientOffice,
        updatedState.recipientAddress
      ].filter(Boolean).join(", ");

      const senderString = [
        updatedState.senderName,
        updatedState.senderDesignation
      ].filter(Boolean).join(", ");

      // Save complete entry payload with full JSON snapshot so it is easily editable/re-downloadable
      await logChalaniEntry({
        chalaniNo: formattedNo,
        letterNo: updatedState.letterNo,
        sectionId: updatedState.officeSection || "none",
        sectionNameNe: updatedState.officeSection === "custom" ? updatedState.officeDepartment : (OFFICE_SECTIONS.find((s) => s.id === updatedState.officeSection)?.nameNe || ""),
        sectionNameEn: updatedState.officeSection === "custom" ? updatedState.officeDepartment : (OFFICE_SECTIONS.find((s) => s.id === updatedState.officeSection)?.nameEn || ""),
        recipient: recipientString,
        subject: updatedState.subject,
        dateBS: updatedState.dateBS,
        dateAD: updatedState.dateAD,
        sender: senderString,
        letterStateJson: JSON.stringify(updatedState)
      });

      // 3. Render and trigger native document download
      if (format === "docx") {
        let emblemBuffer: ArrayBuffer | null = null;
        if (state.emblemType === "custom" && state.customLogoUrl) {
          try {
            const base64Str = state.customLogoUrl;
            const parts = base64Str.split(';base64,');
            const raw = window.atob(parts[1] || parts[0]);
            const rawLength = raw.length;
            const array = new Uint8Array(new ArrayBuffer(rawLength));
            for (let i = 0; i < rawLength; i++) {
              array[i] = raw.charCodeAt(i);
            }
            emblemBuffer = array.buffer;
          } catch (err) {
            console.warn("Could not parse custom logo for registration download", err);
          }
        } else if (state.emblemType !== "none") {
          try {
            const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/120px-Emblem_of_Nepal.svg.png";
            const res = await fetch(url);
            if (res.ok) {
              emblemBuffer = await res.arrayBuffer();
            }
          } catch (err) {
            console.warn("Could not fetch standard logo for registration download", err);
          }
        }

        const blob = await generateDocxBlob(updatedState, emblemBuffer);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cleanSub = updatedState.subject.replace(/[^\w\u0900-\u097F\s]/gi, "").trim() || "Letter";
        a.download = `${cleanSub}_Chalani_${formattedNo}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const sheet = document.getElementById("a4-sheet");
        if (sheet) {
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
          sheet.style.padding = "32px 56px 40px 56px";
          sheet.style.boxShadow = "none";
          sheet.style.border = "none";

          await new Promise((resolve) => setTimeout(resolve, 150));

          const canvas = await html2canvas(sheet, {
            scale: 2.2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc) => {
              // Extract and serialize all document stylesheets with oklch removed to prevent html2canvas parser crashes
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
                    // skip cross-origin stylesheet errors
                  }
                }
              } catch (err) {
                console.error("Failed to read stylesheets:", err);
              }

              // Replace all oklch values in the CSS text
              const sanitizedCss = replaceOklchInString(cssText);

              // Remove all existing style and link tags in clonedDoc to prevent secondary parsing crashes
              clonedDoc.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => {
                el.remove();
              });

              // Create and append a single, clean style tag with the sanitized CSS
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

          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          const pdfWidth = 210;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [pdfWidth, pdfHeight],
          });

          pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
          const cleanSub = updatedState.subject.replace(/[^\w\u0900-\u097F\s]/gi, "").trim() || "Letter";
          pdf.save(`${cleanSub}_Chalani_${formattedNo}.pdf`);
        } else {
          throw new Error("Preview sheet element not found in DOM");
        }
      }

      // Reload register from cloud db
      await loadRegister();

      alert(
        state.language === "ne"
          ? `चलानी दर्ता सम्पन्न भयो! चलानी नम्बर: ${formattedNo}`
          : `Official registration complete! Ref Chalani No: ${formattedNo}`
      );

    } catch (err) {
      console.error("Cloud registration failed:", err);
      alert(state.language === "ne" ? "चलानी दर्ता गर्न सकिएन।" : "Failed to register Chalani in cloud.");
    } finally {
      if (originalTab !== "editor") {
        setActiveTab(originalTab);
      }
      setIsRegisteringNow(false);
    }
  };

  // Re-loads a registered draft back to active edit form
  const handleLoadFromRegister = (entry: any) => {
    try {
      const loadedState = JSON.parse(entry.letterStateJson);
      setState(loadedState);
      setActiveTab("editor");
      alert(
        state.language === "ne"
          ? `दर्ता नं. ${entry.chalaniNo} को पत्र विवरण सफलतापूर्वक सम्पादन बोर्डमा ल्याइयो!`
          : `Loaded details for Chalani No: ${entry.chalaniNo} to the editor board!`
      );
    } catch (err) {
      console.error("Could not parse letter state JSON:", err);
      alert(state.language === "ne" ? "विवरण खोल्न सकिएन।" : "Failed to parse saved letter state.");
    }
  };

  // Handle counter override reset
  const handleCounterOverride = async (sectionId: string, valueStr: string) => {
    const parsed = parseInt(valueStr, 10);
    if (isNaN(parsed) || parsed < 0) {
      alert(state.language === "ne" ? "कृपया सही सकारात्मक नम्बर हाल्नुहोस्।" : "Please enter a valid positive number.");
      return;
    }
    const label = state.language === "ne" ? "के तपाईं चलानी क्रम परिवर्तन गर्न चाहनुहुन्छ?" : "Are you sure you want to change the sequence number?";
    if (confirm(label)) {
      try {
        await setSectionCounter(sectionId, parsed);
        alert(state.language === "ne" ? "सफलतापूर्वक अद्यावधिक गरियो!" : "Counter updated successfully!");
        loadRegister();
      } catch (err) {
        console.error("Counter override error:", err);
      }
    }
  };

  // --- END CENTRAL CLOUD CHALANI IMPLEMENTATION ---

  // Clipboard copy handler
  const handleCopyText = () => {
    const isNe = state.language === "ne";
    const letterText = `
${state.officeProvince}
${state.officeName}
${state.officeDepartment}
${state.officeAddress}

पत्र संख्या: ${state.letterNo}
चलानी नं: ${state.dispatchNo}
मिति: ${isNe ? state.dateBS : state.dateAD}

${state.recipientSalutation} ${state.recipientDesignation}
${state.recipientOffice}
${state.recipientAddress}

विषय: ${state.subject}

${state.salutation}

${state.body}

${state.showTapasil ? `\n${state.tapasilTitle}\n` + state.tapasilItems.map((item, i) => `${i+1}. ${item.particular} - ${item.detail}`).join("\n") : ""}

ভবदीय,
...........................................
${state.senderName}
${state.senderDesignation}
    `;
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Bulk Letters Generator & ZIP Packager
  const handleBulkGenerate = async () => {
    const lines = bulkRecipientsRaw.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert(state.language === "ne" ? "कृपया कम्तिमा एक प्रापक विवरण प्रविष्ट गर्नुहोस्।" : "Please enter at least one recipient detail.");
      return;
    }

    setIsBulkGenerating(true);
    setBulkProgressTotal(lines.length);
    setBulkProgressCurrent(0);
    setBulkProgressMessage(state.language === "ne" ? "प्रक्रिया सुरु हुँदैछ..." : "Starting bulk process...");

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Fetch emblem or parse custom uploaded logo to bundle into Word documents (if docx or both selected)
      let emblemBuffer: ArrayBuffer | null = null;
      if (bulkFormat === "docx" || bulkFormat === "both") {
        if (state.emblemType === "custom" && state.customLogoUrl) {
          try {
            const base64Str = state.customLogoUrl;
            const parts = base64Str.split(';base64,');
            const raw = window.atob(parts[1] || parts[0]);
            const rawLength = raw.length;
            const array = new Uint8Array(new ArrayBuffer(rawLength));
            for (let i = 0; i < rawLength; i++) {
              array[i] = raw.charCodeAt(i);
            }
            emblemBuffer = array.buffer;
          } catch (err) {
            console.warn("Could not parse custom uploaded logo base64 for bulk docx", err);
          }
        } else if (state.emblemType !== "none") {
          try {
            const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/120px-Emblem_of_Nepal.svg.png";
            const res = await fetch(url);
            if (res.ok) {
              emblemBuffer = await res.arrayBuffer();
            }
          } catch (err) {
            console.warn("Could not fetch Wikimedia emblem for bulk, using standard text header fallback inside Word document", err);
          }
        }
      }

      // Save user's original state so we can restore it exactly at the end
      const originalState = { ...state };

      // Dispatch number parser & incrementer (handles both English and Nepali digits)
      const incrementDispatchNo = (startStr: string, index: number): string => {
        const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
        // Map any Nepali digits to English digits for mathematical addition
        const englishStr = startStr.split("").map(char => {
          const nepIndex = nepaliDigits.indexOf(char);
          return nepIndex !== -1 ? String(nepIndex) : char;
        }).join("");

        const num = parseInt(englishStr, 10);
        if (isNaN(num)) {
          return startStr; // Fallback to original string if not numerical
        }

        const nextNum = num + index;
        const hasNepaliDigits = startStr.split("").some(char => nepaliDigits.includes(char));

        if (hasNepaliDigits || state.language === "ne") {
          return toNepaliNumerals(nextNum);
        }
        return String(nextNum);
      };

      // Process recipients sequentially to support HTML canvas rendering for PDFs
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(",").map(p => p.trim());
        let salutation = "";
        let designation = "";
        let office = "";
        let address = "";

        if (parts.length === 1) {
          office = parts[0];
        } else if (parts.length === 2) {
          designation = parts[0];
          office = parts[1];
        } else if (parts.length === 3) {
          designation = parts[0];
          office = parts[1];
          address = parts[2];
        } else if (parts.length >= 4) {
          salutation = parts[0];
          designation = parts[1];
          office = parts[2];
          address = parts[3];
        }

        const currentDispatchNo = incrementDispatchNo(originalState.dispatchNo, i);

        // Map dynamic variables inside QR code values so they point to their respective dispatch keys
        let parsedQrCodeValue = originalState.qrCodeValue;
        if (originalState.showQrCode && originalState.qrCodeValue) {
          // Replace standard trailing reference numbers with the incremented dispatch number
          parsedQrCodeValue = originalState.qrCodeValue
            .replace(/verify\/\w+/g, `verify/${currentDispatchNo}`)
            .replace(/verify=\w+/g, `verify=${currentDispatchNo}`)
            .replace(/letter\/\w+/g, `letter/${currentDispatchNo}`)
            .replace(/letter=\w+/g, `letter=${currentDispatchNo}`);
        }

        const itemState: LetterState = {
          ...originalState,
          recipientSalutation: salutation || originalState.recipientSalutation || "",
          recipientDesignation: designation || originalState.recipientDesignation || "",
          recipientOffice: office || originalState.recipientOffice || "",
          recipientAddress: address || originalState.recipientAddress || "",
          dispatchNo: currentDispatchNo,
          qrCodeValue: parsedQrCodeValue
        };

        setBulkProgressCurrent(i + 1);
        setBulkProgressMessage(
          state.language === "ne"
            ? `सिर्जना गर्दैछ (${i + 1}/${lines.length}): ${itemState.recipientOffice || itemState.recipientDesignation}`
            : `Generating (${i + 1}/${lines.length}): ${itemState.recipientOffice || itemState.recipientDesignation}`
        );

        // Update the live react state so user gets direct live rendering visual updates in the preview frame
        setState(itemState);

        // Allow DOM layout engine to settle and paint the new text values
        await new Promise(resolve => setTimeout(resolve, 350));

        const sanitizedOffice = (itemState.recipientOffice || itemState.recipientDesignation || `Recipient_${i + 1}`)
          .replace(/[^\w\u0900-\u097F\s-]/gi, "")
          .trim()
          .replace(/\s+/g, "_");
        const filePrefix = `Letter_${i + 1}_${sanitizedOffice}`;

        // 1. Export as Word document (.docx)
        if (bulkFormat === "docx" || bulkFormat === "both") {
          const docBlob = await generateDocxBlob(itemState, emblemBuffer);
          zip.file(`${filePrefix}.docx`, docBlob);
        }

        // 2. Export as PDF document (.pdf) via html2canvas and jsPDF
        if (bulkFormat === "pdf" || bulkFormat === "both") {
          const sheet = document.getElementById("a4-sheet");
          if (sheet) {
            const originalWidth = sheet.style.width;
            const originalMinHeight = sheet.style.minHeight;
            const originalMaxWidth = sheet.style.maxWidth;
            const originalTransform = sheet.style.transform;
            const originalPadding = sheet.style.padding;
            const originalBoxShadow = sheet.style.boxShadow;
            const originalBorder = sheet.style.border;

            // Temporarily force exact desktop A4 dimensions for crisp PDF rendering
            sheet.style.width = "794px";
            sheet.style.minHeight = "1123px";
            sheet.style.maxWidth = "none";
            sheet.style.transform = "none";
            sheet.style.padding = "32px 56px 40px 56px";
            sheet.style.boxShadow = "none";
            sheet.style.border = "none";

            await new Promise((resolve) => setTimeout(resolve, 150));

            const canvas = await html2canvas(sheet, {
              scale: 2.2, // Optimal pixel balance for fast rendering and high print quality
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#ffffff",
              logging: false,
              scrollX: 0,
              scrollY: 0,
              onclone: (clonedDoc) => {
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

                clonedDoc.querySelectorAll("style").forEach((styleEl) => {
                  if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
                    styleEl.textContent = replaceOklchInString(styleEl.textContent);
                  }
                });

                clonedDoc.querySelectorAll("[style]").forEach((el) => {
                  const htmlEl = el as HTMLElement;
                  const styleAttr = htmlEl.getAttribute("style");
                  if (styleAttr && styleAttr.includes("oklch")) {
                    htmlEl.setAttribute("style", replaceOklchInString(styleAttr));
                  }
                });
              }
            });

            // Restore original style layout immediately
            sheet.style.width = originalWidth;
            sheet.style.minHeight = originalMinHeight;
            sheet.style.maxWidth = originalMaxWidth;
            sheet.style.transform = originalTransform;
            sheet.style.padding = originalPadding;
            sheet.style.boxShadow = originalBoxShadow;
            sheet.style.border = originalBorder;

            const imgData = canvas.toDataURL("image/jpeg", 0.92);
            const pdfWidth = 210; // A4 size in mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: [pdfWidth, pdfHeight],
            });

            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output("blob");
            zip.file(`${filePrefix}.pdf`, pdfBlob);
          }
        }
      }

      // Restore user's original viewport state
      setState(originalState);

      // Packing and saving the ZIP file
      setBulkProgressMessage(state.language === "ne" ? "जिप फाईल तयार हुँदैछ..." : "Packing ZIP file...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const cleanSubject = originalState.subject.replace(/[^\w\u0900-\u097F\s]/gi, "").trim();
      const zipName = `Bulk_Letters_${cleanSubject || "Government"}.zip`;

      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);

      setBulkProgressMessage(state.language === "ne" ? "थोक उत्पादन सफलतापूर्वक सम्पन्न भयो!" : "Bulk generation completed successfully!");
      setTimeout(() => {
        setIsBulkGenerating(false);
      }, 1500);

    } catch (err) {
      console.error("Bulk letters generation failed", err);
      alert(state.language === "ne" ? "थोक पत्र सिर्जना असफल भयो।" : "Failed to generate bulk letters.");
      setIsBulkGenerating(false);
    }
  };

  // Reset to default
  const handleReset = () => {
    if (confirm(state.language === "ne" ? "के तपाईं सबै विवरणहरू खाली गर्न चाहनुहुन्छ?" : "Are you sure you want to reset all fields?")) {
      handlePresetChange(state.presetId);
    }
  };

  // Helper to get office footer details for absolute sheet footer
  const getOfficeFooterDetails = (presetId: string, isNe: boolean) => {
    switch (presetId) {
      case "mofe_bagamati":
        return {
          phone: isNe ? "फोन: +९७७-५७-५२७०१४" : "Phone: +977-57-527014",
          email: "Email: mofe@bagamati.gov.np",
          web: "Website: mofe.bagamati.gov.np"
        };
      case "mofaga_federal":
        return {
          phone: isNe ? "फोन: +९७७-१-४२११६७३" : "Phone: +977-1-4211673",
          email: "Email: info@mofaga.gov.np",
          web: "Website: mofaga.gov.np"
        };
      case "ward_local":
        return {
          phone: isNe ? "फोन: +९७७-५७-५२०३१२" : "Phone: +977-57-520312",
          email: "Email: ward3@hetaudamun.gov.np",
          web: "Website: hetaudamun.gov.np"
        };
      case "dao_district":
        return {
          phone: isNe ? "फोन: +९७७-१-४२६२४५२" : "Phone: +977-1-4262452",
          email: "Email: dao.kathmandu@moha.gov.np",
          web: "Website: daokathmandu.moha.gov.np"
        };
      default:
        return {
          phone: isNe ? "फोन: +९७७-१-४२११०००" : "Phone: +977-1-4211000",
          email: "Email: info@nepal.gov.np",
          web: "Website: nepal.gov.np"
        };
    }
  };

  // Handle rich-text formatting tags wrapper for letter-body-textarea
  const handleFormatText = (tag: "b" | "i" | "u" | "red" | "blue" | "green" | "purple" | "orange" | "gray" | "center" | "right" | "justify" | "hr") => {
    const textarea = document.getElementById("letter-body-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = state.body || "";

    const selectedText = text.substring(start, end);
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    // Push history before modification
    pushToHistory(text);

    let formattedText = "";
    let cursorOffset = 0;

    if (tag === "hr") {
      const hrTag = "<hr/>";
      formattedText = `${beforeText}${hrTag}${afterText}`;
      cursorOffset = hrTag.length;
    } else {
      const openTag = `<${tag}>`;
      const closeTag = `</${tag}>`;
      formattedText = `${beforeText}${openTag}${selectedText}${closeTag}${afterText}`;
      cursorOffset = openTag.length + selectedText.length + closeTag.length;
    }

    setState((prev) => ({ ...prev, body: formattedText }));

    // Put focus back onto the textarea and preserve selection bounds
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 20);
  };

  return (
    <div id="app-root" className="h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <nav id="app-header" className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0 text-slate-900 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center shrink-0 shadow-sm">
            <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <span className="font-bold tracking-tight text-base md:text-lg text-slate-900 block md:inline">
              नेपाल सरकार <span className="font-normal text-slate-400 font-serif italic text-xs md:text-sm">DocEngine</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "editor"
                ? "bg-white text-red-700 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{state.language === "ne" ? "पत्र मस्यौदा बोर्ड (Editor)" : "Draft Editor"}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("register");
              loadRegister();
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "register"
                ? "bg-white text-red-700 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{state.language === "ne" ? "चलानी किताब (Central Log)" : "Dispatch Register"}</span>
            {chalaniRegister.length > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                {chalaniRegister.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              id="lang-ne-btn"
              onClick={() => handleLanguageChange("ne")}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                state.language === "ne"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              नेपाली
            </button>
            <button
              id="lang-en-btn"
              onClick={() => handleLanguageChange("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                state.language === "en"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              English
            </button>
          </div>

          <button
            id="reset-form-btn"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
          >
            {state.language === "ne" ? "रिसेट" : "Reset Fields"}
          </button>

          <button
            id="header-download-docx"
            onClick={isAutoChalani ? () => handleRegisterAndDownload("docx") : handleDownloadDocx}
            disabled={isDownloading || isRegisteringNow}
            className="px-4 py-2 bg-slate-900 text-white text-xs md:text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:bg-slate-400 cursor-pointer shadow-sm"
          >
            {isDownloading || (isAutoChalani && isRegisteringNow) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            {isDownloading || (isAutoChalani && isRegisteringNow) ? (state.language === "ne" ? "चलानी दर्ता..." : "Registering...") : (state.language === "ne" ? "वर्ड (.docx)" : "Word (.docx)")}
          </button>

          <button
            id="header-download-pdf"
            onClick={isAutoChalani ? () => handleRegisterAndDownload("pdf") : handleDownloadPdf}
            disabled={isDownloadingPdf || isRegisteringNow}
            className="px-4 py-2 bg-red-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-red-700 flex items-center gap-1.5 transition-colors disabled:bg-red-400 cursor-pointer shadow-sm"
          >
            {isDownloadingPdf || (isAutoChalani && isRegisteringNow) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {isDownloadingPdf || (isAutoChalani && isRegisteringNow) ? (state.language === "ne" ? "चलानी दर्ता..." : "Registering...") : (state.language === "ne" ? "पीडीएफ (.pdf)" : "PDF (.pdf)")}
          </button>

          <button
            id="header-print-btn"
            onClick={handlePrintDocument}
            className="px-4 py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            {state.language === "ne" ? "प्रिन्ट / PDF" : "Print / PDF"}
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      {activeTab === "editor" ? (
        <main id="app-body" className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar Controls */}
        <aside id="form-panel" className="w-full lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 flex flex-col gap-6 overflow-y-auto h-auto lg:h-full">
          {/* Preset Selector */}
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "कार्यालय ढाँचा रोज्नुहोस् (Presets)" : "Select Office Preset"}
            </h2>
            <select
              id="preset-select"
              value={state.presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none transition-all outline-none"
            >
              {OFFICE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {state.language === "ne" 
                    ? preset.name || "कस्टम कार्यालय थप्नुहोस्..." 
                    : preset.nameEn || "Custom Office..."}
                </option>
              ))}
            </select>
          </div>

          {/* Section 1: Government Office Information */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "१. सरकारी कार्यालय विवरण" : "1. Government Office Details"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "संघीय/प्रदेश सरकार ब्यानर" : "Government Banner"}
                </label>
                <input
                  id="office-province-input"
                  type="text"
                  value={state.officeProvince}
                  onChange={(e) => setState({ ...state, officeProvince: e.target.value })}
                  placeholder={state.language === "ne" ? "बागमती प्रदेश सरकार" : "Bagamati Province Government"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "निशाना छाप प्रकार" : "Emblem Type"}
                </label>
                <select
                  id="emblem-type-select"
                  value={state.emblemType}
                  onChange={(e) => setState({ ...state, emblemType: e.target.value as EmblemType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all outline-none"
                >
                  <option value="nepal">{state.language === "ne" ? "नेपाल सरकार (Federal)" : "Federal Emblem"}</option>
                  <option value="province_bagamati">{state.language === "ne" ? "बागमती प्रदेश (Bagamati)" : "Bagamati Province"}</option>
                  <option value="province_generic">{state.language === "ne" ? "प्रदेश सरकार (सामान्य)" : "Generic Province"}</option>
                  <option value="local">{state.language === "ne" ? "स्थानीय सरकार" : "Local Government"}</option>
                  <option value="custom">{state.language === "ne" ? "कार्यालय लोगो (Custom Logo)" : "Custom Office Logo"}</option>
                  <option value="none">{state.language === "ne" ? "छाप नराख्ने" : "No Emblem"}</option>
                </select>
              </div>
            </div>

            {/* Always visible integrated logo changer for supreme UX */}
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {state.language === "ne" ? "कार्यालयको लोगोसँग परिवर्तन गर्नुहोस" : "Change Office Logo / Emblem"}
              </label>
              
              <div className="flex items-center gap-3 mt-1.5">
                <div className="w-12 h-12 bg-white rounded-md border border-slate-200 flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
                  {state.emblemType === "custom" && state.customLogoUrl ? (
                    <img src={state.customLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : state.emblemType !== "none" ? (
                    <div className="w-10 h-10">
                      <NepalEmblemSVG type={state.emblemType} size={40} />
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">None</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {state.language === "ne" ? "नयाँ लोगो राख्नुहोस" : "Upload Image"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setState((prev) => ({ 
                                ...prev, 
                                emblemType: "custom", 
                                customLogoUrl: reader.result as string 
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {state.emblemType === "custom" && state.customLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setState((prev) => ({ ...prev, emblemType: "province_bagamati", customLogoUrl: "" }))}
                        className="px-2 py-1.5 bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors"
                      >
                        {state.language === "ne" ? "हटाउनुहोस्" : "Remove"}
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1.5 leading-tight">
                    {state.language === "ne" 
                      ? "आफ्नै कार्यालयको कुनै पनि लोगो/छाप अपलोड गर्नुहोस्, यसले स्वचालित रूपमा लोगो परिवर्तन गर्छ।" 
                      : "Upload any custom logo. This will automatically switch and display your custom logo."}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "मन्त्रालय / कार्यालयको नाम" : "Ministry / Office Name"}
              </label>
              <input
                id="office-name-input"
                type="text"
                value={state.officeName}
                onChange={(e) => setState({ ...state, officeName: e.target.value })}
                placeholder="आर्थिक मामिला तथा योजना मन्त्रालय"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-semibold text-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
              />
            </div>

            {/* Section / Branch Selector */}
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-md border border-slate-200/60">
              <label className="text-xs font-semibold text-slate-700 block">
                {state.language === "ne" ? "कार्यालयको शाखा / विभाग (लेटरहेडको लागि)" : "Office Section / Branch (For Letterhead)"}
              </label>
              <select
                id="office-section-select"
                value={state.officeSection || "none"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "none") {
                    setState((prev) => ({
                      ...prev,
                      officeSection: "none",
                      officeDepartment: ""
                    }));
                  } else if (val === "custom") {
                    setState((prev) => ({
                      ...prev,
                      officeSection: "custom",
                      officeDepartment: prev.officeDepartment || (state.language === "ne" ? "अन्य शाखा" : "Custom Section")
                    }));
                  } else {
                    const matched = OFFICE_SECTIONS.find((sec) => sec.id === val);
                    if (matched) {
                      setState((prev) => ({
                        ...prev,
                        officeSection: val,
                        officeDepartment: state.language === "ne" ? matched.nameNe : matched.nameEn
                      }));
                    }
                  }
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all outline-none"
              >
                <option value="none">{state.language === "ne" ? "शाखा नराख्ने (No Section)" : "No Section"}</option>
                {OFFICE_SECTIONS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {state.language === "ne" ? sec.nameNe : sec.nameEn}
                  </option>
                ))}
              </select>

              {/* Dynamic Section Override Input - shown whenever section is selected to allow fine tuning */}
              {state.officeSection && state.officeSection !== "none" && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/50">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {state.language === "ne" ? "शाखाको नाम (लेटरहेडमा देखिने रुप):" : "Section Name (As it appears on Letterhead):"}
                  </label>
                  <input
                    id="office-department-input"
                    type="text"
                    value={state.officeDepartment}
                    onChange={(e) => setState({ ...state, officeDepartment: e.target.value })}
                    placeholder={state.language === "ne" ? "प्रशासन शाखा" : "Administration Section"}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                    {state.language === "ne" 
                      ? "* यो शाखा चयनले चलानी दर्ता प्रणाली वा नम्बरिङलाई असर गर्दैन। चलानी सुरक्षित रूपमा मन्त्रालय/कार्यालय स्तरमा एकीकृत रहन्छ।"
                      : "* Changing the section only formats the letterhead. The central sequential Chalani numbering remains unified."}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "कार्यालयको ठेगाना" : "Office Address"}
              </label>
              <input
                id="office-address-input"
                type="text"
                value={state.officeAddress}
                onChange={(e) => setState({ ...state, officeAddress: e.target.value })}
                placeholder="हेटौंडा, नेपाल"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
              />
            </div>
          </div>

          {/* Section 2: Administrative Details */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "२. चलानी विवरण (Chalani Details)" : "2. Chalani Details"}
            </h3>

            {/* Auto Cloud Chalani Checkbox Option */}
            <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {state.language === "ne" ? "स्वचालित चलानी अद्यावधिक (Auto Cloud)" : "Automatic Cloud Chalani"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoChalani}
                    onChange={(e) => setIsAutoChalani(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                {state.language === "ne"
                  ? "सक्रिय हुँदा, केन्द्रीय डेटाबेसमा सुरक्षित र अद्वितीय चलानी नम्बर सिर्जना गरिन्छ।"
                  : "Guarantees a continuous, unique sequential number in the central database."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "पत्र संख्या (Letter No.)" : "Letter Number"}
                </label>
                <input
                  id="letter-no-input"
                  type="text"
                  value={state.letterNo}
                  onChange={(e) => setState({ ...state, letterNo: e.target.value })}
                  placeholder="२०८२/०८३"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "चलानी नम्बर (Ref No.)" : "Dispatch/Ref Number"}
                </label>
                {isAutoChalani ? (
                  <div className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-500 font-semibold select-none flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
                    <span>{state.language === "ne" ? "[स्वचालित नम्बर]" : "[Auto-Assigned]"}</span>
                  </div>
                ) : (
                  <input
                    id="dispatch-no-input"
                    type="text"
                    value={state.dispatchNo}
                    onChange={(e) => setState({ ...state, dispatchNo: e.target.value })}
                    placeholder="४८२"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "मिति (B.S. Date)" : "Date (A.D. / YYYY-MM-DD)"}
              </label>
              <input
                id="date-input"
                type="text"
                value={state.language === "ne" ? state.dateBS : state.dateAD}
                onChange={(e) => {
                  if (state.language === "ne") {
                    setState({ ...state, dateBS: e.target.value });
                  } else {
                    setState({ ...state, dateAD: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
              />
            </div>
          </div>

          {/* Section 3: Recipient Information */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "३. प्रापकको विवरण (Recipient)" : "3. Recipient Information"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "आदर शब्द" : "Salutation"}
                </label>
                <input
                  id="recipient-salutation-input"
                  type="text"
                  value={state.recipientSalutation}
                  onChange={(e) => setState({ ...state, recipientSalutation: e.target.value })}
                  placeholder="श्री / सुश्री"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "पद / दर्जा" : "Designation / Role"}
                </label>
                <input
                  id="recipient-designation-input"
                  type="text"
                  value={state.recipientDesignation}
                  onChange={(e) => setState({ ...state, recipientDesignation: e.target.value })}
                  placeholder="कार्यालय प्रमुख / सचिवज्यू"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "कार्यालयको नाम" : "Office Name"}
              </label>
              <input
                id="recipient-office-input"
                type="text"
                value={state.recipientOffice}
                onChange={(e) => setState({ ...state, recipientOffice: e.target.value })}
                placeholder="गृह मन्त्रालय"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "ठेगाना" : "Address"}
              </label>
              <input
                id="recipient-address-input"
                type="text"
                value={state.recipientAddress}
                onChange={(e) => setState({ ...state, recipientAddress: e.target.value })}
                placeholder="सिंहदरबार, काठमाडौं"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
              />
            </div>
          </div>

          {/* AI Smart Drafting Copilot */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  {state.language === "ne" ? "स्मार्ट एआई पत्र लेखक" : "AI Smart Drafting Copilot"}
                </h3>
                <span className="bg-red-50 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded border border-red-100 uppercase tracking-wider">
                  Gemini Active
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {state.language === "ne"
                  ? "विषय र बुँदाहरू दिनुहोस् र एआईले आधिकारिक नेपाल सरकारी ढाँचामा ड्राफ्ट तयार गरिदिनेछ।"
                  : "Describe what this letter is about and our Gemini model will draft a polished, fully formatted official letter."}
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "पत्रको विषयवस्तु वा निर्देशनहरू" : "Topic / Key Guidelines"}
                </label>
                <textarea
                  id="ai-prompt-textarea"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    state.language === "ne"
                      ? "उदा: सुचना प्रविधि विकासका लागि १ करोड निकासा गर्न बजेट अख्तियारीको अनुरोध पत्र..."
                      : "e.g., Requesting fund release for road repair works in ward no. 4 before the monsoon starts..."
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none transition-all"
                />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {state.language === "ne" ? "पत्रको प्रकृति" : "Letter Category"}
                    </label>
                    <select
                      id="ai-letter-type-select"
                      value={aiLetterType}
                      onChange={(e) => setAiLetterType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none transition-all outline-none"
                    >
                      <option value="request">{state.language === "ne" ? "अनुरोध पत्र (Request)" : "Request"}</option>
                      <option value="notice">{state.language === "ne" ? "आधिकारिक सूचना (Notice)" : "Notice"}</option>
                      <option value="decision">{state.language === "ne" ? "निर्णय/आदेश (Decision)" : "Decision"}</option>
                      <option value="recommendation">{state.language === "ne" ? "सिफारिस पत्र (Recommendation)" : "Recommendation"}</option>
                      <option value="circular">{state.language === "ne" ? "परिपत्र (Circular)" : "Circular"}</option>
                      <option value="invitation">{state.language === "ne" ? "निमन्त्रणा पत्र (Invitation)" : "Invitation"}</option>
                      <option value="clarification">{state.language === "ne" ? "स्पष्टीकरण पत्र (Clarification)" : "Clarification"}</option>
                      <option value="congratulations">{state.language === "ne" ? "बधाई तथा शुभकामना (Congratulation)" : "Congratulations"}</option>
                      <option value="transfer">{state.language === "ne" ? "सरुवा/काज पत्र (Transfer)" : "Employee Transfer"}</option>
                      <option value="nomination">{state.language === "ne" ? "मनोनयन पत्र (Nomination)" : "Nomination"}</option>
                      <option value="acknowledgement">{state.language === "ne" ? "प्राप्ति स्वीकार (Acknowledgement)" : "Acknowledgement"}</option>
                      <option value="custom">{state.language === "ne" ? "कस्टम श्रेणी... (Custom...)" : "Custom Category..."}</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      id="ai-generate-btn"
                      onClick={handleAiDraft}
                      disabled={isAiLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-1.5 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 disabled:bg-slate-400 transition-all shadow-sm cursor-pointer"
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {state.language === "ne" ? "लेख्दैछ..." : "Drafting..."}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-red-500" />
                          {state.language === "ne" ? "एआई ड्राफ्ट" : "Draft with AI"}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {aiLetterType === "custom" && (
                  <div className="space-y-1 bg-red-50/30 p-2.5 rounded border border-red-100/60">
                    <label className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">
                      {state.language === "ne" ? "कस्टम पत्र श्रेणी प्रविष्ट गर्नुहोस्" : "Enter Custom Letter Category"}
                    </label>
                    <input
                      id="custom-letter-type-input"
                      type="text"
                      value={customLetterType}
                      onChange={(e) => setCustomLetterType(e.target.value)}
                      placeholder={state.language === "ne" ? "उदा: गल्ती सुधार, करार सम्झौता" : "e.g., Error Correction, Contract Agreement"}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {aiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-md text-xs">
                  {aiError}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Content Editing */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "४. पत्रको मुख्य विषय र ब्यहोरा" : "4. Subject & Main Content"}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "विषय (Subject Line)" : "Subject Line"}
              </label>
              <input
                id="letter-subject-input"
                type="text"
                value={state.subject}
                onChange={(e) => setState({ ...state, subject: e.target.value })}
                placeholder="बजेट विनियोजन तथा अख्तियारी सम्बन्धमा।"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "सम्बोधन (Salutation)" : "Salutation Greeting"}
                </label>
                <input
                  id="letter-salutation-input"
                  type="text"
                  value={state.salutation}
                  onChange={(e) => setState({ ...state, salutation: e.target.value })}
                  placeholder="महोदय / महोदया,"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "पठाउनेको पद (Designation)" : "Sender's Designation"}
                </label>
                <input
                  id="sender-designation-input-2"
                  type="text"
                  value={state.senderDesignation}
                  onChange={(e) => setState({ ...state, senderDesignation: e.target.value })}
                  placeholder="शाखा अधिकृत"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "मुख्य विवरण (Body Text)" : "Main Letter Body"}
                </label>
                
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1 select-none flex-wrap">
                  {/* Undo / Redo */}
                  <button
                    type="button"
                    title={state.language === "ne" ? "पूर्वस्थिति (Undo)" : "Undo"}
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Undo className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={state.language === "ne" ? "पुनरावृत्ति (Redo)" : "Redo"}
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Redo className="w-3.5 h-3.5" />
                  </button>

                  {/* Divider */}
                  <div className="w-[1px] bg-slate-200 h-4 mx-0.5" />

                  {/* Formatting */}
                  <button
                    type="button"
                    title={state.language === "ne" ? "मोटो अक्षर (Bold)" : "Bold (Ctrl+B)"}
                    onClick={() => handleFormatText("b")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={state.language === "ne" ? "छड्के अक्षर (Italic)" : "Italic (Ctrl+I)"}
                    onClick={() => handleFormatText("i")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={state.language === "ne" ? "रेखाङ्कन (Underline)" : "Underline (Ctrl+U)"}
                    onClick={() => handleFormatText("u")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  {/* Divider */}
                  <div className="w-[1px] bg-slate-200 h-4 mx-0.5" />

                  {/* Alignments */}
                  <button
                    type="button"
                    title={state.language === "ne" ? "बीचमा (Center Align)" : "Center Align"}
                    onClick={() => handleFormatText("center")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={state.language === "ne" ? "दायाँ (Right Align)" : "Right Align"}
                    onClick={() => handleFormatText("right")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={state.language === "ne" ? "दुबै तर्फ मिलाउनुहोस् (Justified Align)" : "Justified Align"}
                    onClick={() => handleFormatText("justify")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>

                  {/* Divider */}
                  <div className="w-[1px] bg-slate-200 h-4 mx-0.5" />

                  {/* Insert Elements */}
                  <button
                    type="button"
                    title={state.language === "ne" ? "तस्वीर थप्नुहोस् (Insert Image)" : "Insert Image"}
                    onClick={handleInsertImageClick}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* Hidden Image File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    title={state.language === "ne" ? "तेर्सो रेखा (Horizontal Rule)" : "Horizontal Rule"}
                    onClick={() => handleFormatText("hr")}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Divider */}
                  <div className="w-[1px] bg-slate-200 h-4 mx-0.5" />

                  {/* Color Swatch Label / Icon */}
                  <div className="flex items-center gap-1 text-slate-400 pl-0.5" title={state.language === "ne" ? "अक्षर रङ्ग" : "Text Color"}>
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleFormatText("red")}
                      title={state.language === "ne" ? "रातो (Red)" : "Red"}
                      className="w-3.5 h-3.5 rounded-full bg-red-600 border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleFormatText("blue")}
                      title={state.language === "ne" ? "नीलो (Blue)" : "Blue"}
                      className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleFormatText("green")}
                      title={state.language === "ne" ? "हरियो (Green)" : "Green"}
                      className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleFormatText("purple")}
                      title={state.language === "ne" ? "बैजनी (Purple)" : "Purple"}
                      className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleFormatText("orange")}
                      title={state.language === "ne" ? "सुन्तला (Orange)" : "Orange"}
                      className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleFormatText("gray")}
                      title={state.language === "ne" ? "फुस्रो (Gray)" : "Gray"}
                      className="w-3.5 h-3.5 rounded-full bg-slate-500 border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <textarea
                id="letter-body-textarea"
                rows={8}
                value={state.body}
                onChange={(e) => setState({ ...state, body: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all leading-relaxed"
                placeholder={state.language === "ne" ? "यस मन्त्रालयको निर्णय बमोजिम..." : "As per the decision of the ministry..."}
              />
            </div>

            {/* Toggle Tapasil Section */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <input
                    id="tapasil-toggle-checkbox"
                    type="checkbox"
                    checked={state.showTapasil}
                    onChange={(e) => setState({ ...state, showTapasil: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                  />
                  {state.language === "ne" ? "तपसिल विवरण थप्नुहोस्" : "Include Details Table"}
                </label>
              </div>

              {state.showTapasil && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {state.language === "ne" ? "तपसिल शीर्षक" : "Details Section Header"}
                    </label>
                    <input
                      id="tapasil-title-input"
                      type="text"
                      value={state.tapasilTitle}
                      onChange={(e) => setState({ ...state, tapasilTitle: e.target.value })}
                      placeholder="तपसिल विवरणहरू:"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      {state.language === "ne" ? "बुँदा / विवरणहरूको सूची" : "Details List Items"}
                    </label>

                    {state.tapasilItems.map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-slate-400 w-4">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={item.particular}
                          onChange={(e) => handleUpdateTapasil(item.id, "particular", e.target.value)}
                          placeholder={state.language === "ne" ? "विवरण (जस्तै: कार्यक्रम बजेट)" : "Item Particular"}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                        />
                        <input
                          type="text"
                          value={item.detail}
                          onChange={(e) => handleUpdateTapasil(item.id, "detail", e.target.value)}
                          placeholder={state.language === "ne" ? "कैफियत (जस्तै: रु ५,००,०००)" : "Detail/Remark"}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTapasil(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          title="Remove row"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      id="add-tapasil-row-btn"
                      type="button"
                      onClick={handleAddTapasil}
                      className="mt-1 py-1.5 border border-dashed border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {state.language === "ne" ? "थप बुँदा थप्नुहोस्" : "Add Row"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Sender details */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "५. पठाउने व्यक्तिको विवरण (Sign-off)" : "5. Sender Signature Details"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "पठाउनेको नाम" : "Sender Name"}
                </label>
                <input
                  id="sender-name-input"
                  type="text"
                  value={state.senderName}
                  onChange={(e) => setState({ ...state, senderName: e.target.value })}
                  placeholder="हरिप्रसाद अधिकारी"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "सहि गर्ने ठाउँ / पद" : "Signature Title / Designation"}
                </label>
                <input
                  id="sender-designation-input"
                  type="text"
                  value={state.senderDesignation}
                  onChange={(e) => setState({ ...state, senderDesignation: e.target.value })}
                  placeholder="शाखा अधिकृत"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
              </div>
            </div>

            {/* Section 6: Office footer details */}
            <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {state.language === "ne" ? "६. कार्यालय फुटर विवरण (Admin Footer)" : "6. Office Footer Details (Admin)"}
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {state.language === "ne" ? "फोन नम्बर (Phone)" : "Phone Number"}
                  </label>
                  <input
                    id="footer-phone-input"
                    type="text"
                    value={state.footerPhone}
                    onChange={(e) => setState({ ...state, footerPhone: e.target.value })}
                    placeholder="+९७७-५७-५२७०१४"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {state.language === "ne" ? "इमेल (Email)" : "Email Address"}
                  </label>
                  <input
                    id="footer-email-input"
                    type="text"
                    value={state.footerEmail}
                    onChange={(e) => setState({ ...state, footerEmail: e.target.value })}
                    placeholder="mofe@bagamati.gov.np"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {state.language === "ne" ? "वेबसाइट (Website)" : "Website Link"}
                  </label>
                  <input
                    id="footer-web-input"
                    type="text"
                    value={state.footerWeb}
                    onChange={(e) => setState({ ...state, footerWeb: e.target.value })}
                    placeholder="mofe.bagamati.gov.np"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 7: QR Code Generator & Verification */}
            <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <input
                    id="qr-toggle-checkbox"
                    type="checkbox"
                    checked={state.showQrCode}
                    onChange={(e) => setState({ ...state, showQrCode: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                  />
                  {state.language === "ne" ? "७. क्युआर कोड प्रमाणीकरण (QR Verification)" : "7. QR Verification Generator"}
                </label>
              </div>

              {state.showQrCode && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {state.language === "ne" ? "क्युआर कोड लिङ्क/पाठ" : "QR Link / Value"}
                    </label>
                    <input
                      id="qr-value-input"
                      type="text"
                      value={state.qrCodeValue}
                      onChange={(e) => setState({ ...state, qrCodeValue: e.target.value })}
                      placeholder="https://verify.gov.np/letter/482"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {state.language === "ne" ? "क्युआर कोड विवरण / सन्देश" : "QR Explanatory Label"}
                    </label>
                    <textarea
                      id="qr-label-input"
                      rows={2}
                      value={state.qrCodeLabel}
                      onChange={(e) => setState({ ...state, qrCodeLabel: e.target.value })}
                      placeholder="यस पत्रको सत्यता जाँच गर्न स्क्यान गर्नुहोस् ।"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none transition-all leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 8: Bulk Document Generator */}
            <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                  {state.language === "ne" ? "८. थोक पत्र उत्पादन (Bulk Generate)" : "8. Bulk Document Generator"}
                </h3>
                <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                  ZIP Export
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {state.language === "ne"
                  ? "एक हरफमा एक प्रापक विवरण राख्नुहोस्। (आदरार्थी शब्द, पद, कार्यालयको नाम, ठेगाना) अल्पविरामद्वारा छुट्ट्याएर राख्नुहोस्।"
                  : "Enter one recipient detail per line (comma-separated): Salutation, Designation, Office Name, Address."}
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  {state.language === "ne" ? "प्रापकहरूको सूची (Recipients List)" : "Recipients List"}
                </label>
                <textarea
                  id="bulk-recipients-textarea"
                  rows={4}
                  value={bulkRecipientsRaw}
                  onChange={(e) => setBulkRecipientsRaw(e.target.value)}
                  placeholder={
                    state.language === "ne"
                      ? "श्री प्रमुख प्रशासकीय अधिकृत, बनेपा नगरपालिका, काभ्रे\nश्री कार्यालय प्रमुख, जिल्ला प्रशासन कार्यालय, हेटौंडा"
                      : "Mr. Chief Administrative Officer, Banepa Municipality, Kavre\nThe Office Head, District Administration Office, Hetauda"
                  }
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-md text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed transition-all"
                />
              </div>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  {state.language === "ne" ? "निर्यात ढाँचा (Export Format)" : "Export Format"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["docx", "pdf", "both"] as const).map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setBulkFormat(format)}
                      className={`py-1.5 px-2 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                        bulkFormat === format
                          ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {format === "docx"
                        ? "Word (.docx)"
                        : format === "pdf"
                        ? "PDF (.pdf)"
                        : "Both (ZIP)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active generation overlay / progress indicator */}
              {isBulkGenerating && (
                <div className="bg-red-50/50 border border-red-100 p-3 rounded-lg flex flex-col gap-2 animate-pulse">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-red-800">
                      {state.language === "ne" ? "पत्रहरू सिर्जना हुँदैछ..." : "Generating Letters..."}
                    </span>
                    <span className="font-bold text-slate-600">
                      {bulkProgressCurrent} / {bulkProgressTotal}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgressCurrent / bulkProgressTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-red-700/80 font-medium truncate">
                    {bulkProgressMessage}
                  </p>
                </div>
              )}

              {/* Bulk generate button */}
              <button
                id="bulk-generate-btn"
                type="button"
                onClick={handleBulkGenerate}
                disabled={isBulkGenerating}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md text-xs flex items-center justify-center gap-2 disabled:bg-slate-400 transition-all shadow-sm cursor-pointer"
              >
                {isBulkGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {state.language === "ne" ? "सिर्जना हुँदैछ..." : "Generating ZIP..."}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {state.language === "ne" ? "थोक पत्र डाउनलोड गर्नुहोस् (ZIP)" : "Bulk Generate & Download ZIP"}
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Note: This template follows the official <span className="font-semibold">Nepal Government Secretariat Guidelines</span> for standardized formatting.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Preview Pane (The A4 Document Viewport) */}
        <section id="preview-panel" className="flex-1 bg-slate-100 p-6 md:p-12 flex flex-col items-center overflow-y-auto h-full shadow-inner">
          {/* Subtle Preview Action Header */}
          <div className="flex items-center justify-between mb-4 w-full max-w-[21cm]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {state.language === "ne" ? "हस्ताक्षरयोग्य सरकारी दस्तावेज प्रिभ्यू" : "Official Government Document Preview"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="copy-text-btn"
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {state.language === "ne" ? "कपि भयो!" : "Copied!"}
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    {state.language === "ne" ? "पाठ कपी" : "Copy Text"}
                  </>
                )}
              </button>

              <button
                id="preview-download-pdf"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:bg-red-400"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                {isDownloadingPdf ? (state.language === "ne" ? "पीडीएफ लोड..." : "Generating...") : (state.language === "ne" ? "पीडीएफ निर्यात" : "Export PDF")}
              </button>

              <button
                id="preview-print-btn"
                onClick={handlePrintDocument}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                {state.language === "ne" ? "प्रिन्ट / PDF बचत" : "Print / Save PDF"}
              </button>

              <button
                id="preview-download-docx"
                onClick={handleDownloadDocx}
                disabled={isDownloading}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:bg-slate-400"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                )}
                {isDownloading ? (state.language === "ne" ? "वर्ड लोड..." : "Downloading...") : (state.language === "ne" ? "वर्ड निर्यात" : "Export Word")}
              </button>
            </div>
          </div>

          {/* Paper Sheet (Exact A4 Aspect Ratio) */}
          <div
            id="a4-sheet"
            className="w-full max-w-[21cm] min-h-[29.7cm] bg-white text-slate-900 shadow-2xl border border-slate-200 pt-6 md:pt-8 pb-10 px-10 md:px-14 flex flex-col justify-between relative select-text mb-8"
            style={{ fontFamily: state.language === "ne" ? "Noto Sans Devanagari, sans-serif" : "Georgia, serif" }}
          >
            {/* Sheet Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
              {state.emblemType === "custom" ? (
                state.customLogoUrl ? (
                  <img src={state.customLogoUrl} alt="Watermark" className="w-80 h-80 object-contain" />
                ) : null
              ) : (
                <NepalEmblemSVG type={state.emblemType} size={320} />
              )}
            </div>

            <div className="flex flex-col flex-1">
              {/* 1. Letterhead Header Block */}
              <div className="relative mb-2 w-full flex flex-col">
                {/* Left Logo Emblem (absolutely positioned to keep center text perfectly aligned, clickable for direct upload) */}
                <label className="absolute left-0 top-0 w-20 h-20 flex items-start justify-start cursor-pointer group select-none" title={state.language === "ne" ? "लोगो परिवर्तन गर्न क्लिक गर्नुहोस्" : "Click to change/upload logo"}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setState((prev) => ({ 
                            ...prev, 
                            emblemType: "custom", 
                            customLogoUrl: reader.result as string 
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="relative">
                    {state.emblemType === "custom" ? (
                      state.customLogoUrl ? (
                        <img src={state.customLogoUrl} alt="Office Logo" className="w-16 h-16 object-contain transition-all group-hover:brightness-95 group-hover:scale-105" />
                      ) : (
                        <div className="w-16 h-16 border border-dashed border-red-200 rounded flex items-center justify-center text-[9px] text-red-500 text-center font-sans font-semibold p-1 bg-red-50 group-hover:bg-red-100 transition-colors">
                          Upload Logo
                        </div>
                      )
                    ) : state.emblemType !== "none" ? (
                      <div className="transition-transform group-hover:scale-105">
                        <NepalEmblemSVG type={state.emblemType} />
                      </div>
                    ) : (
                      <div className="w-16 h-16 border border-dashed border-slate-200 rounded flex items-center justify-center text-[9px] text-slate-400 text-center font-sans">
                        No Logo
                      </div>
                    )}

                    {/* Direct overlay indicator */}
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                  </div>
                </label>

                {/* Center Block for First and Second lines */}
                <div className="w-full flex flex-col items-center">
                  {/* First Line Center: Province/Federal Government */}
                  {state.officeProvince && (
                    <h3 className="text-red-600 text-xs md:text-sm font-bold tracking-wide font-nepali">
                      {state.officeProvince}
                    </h3>
                  )}

                  {/* Second Line Center: Office/Ministry Name */}
                  {state.officeName && (
                    <h1 className="text-red-600 text-lg md:text-2xl font-extrabold tracking-tight mt-1 font-nepali">
                      {state.officeName}
                    </h1>
                  )}
                </div>

                {/* Third Line Right: Office Address */}
                {state.officeAddress && (
                  <div className="text-right w-full text-red-600 font-bold text-xs md:text-sm font-nepali leading-none -mt-1 md:-mt-2">
                    {state.officeAddress}
                  </div>
                )}

                {/* Followed by respective branch and section name */}
                {state.officeDepartment && (
                  <div className="text-center w-full mt-1">
                    <h2 className="text-red-600 text-xs md:text-sm font-semibold tracking-wide font-nepali">
                      {state.officeDepartment}
                    </h2>
                  </div>
                )}
              </div>

              {/* 2. Metadata Columns (Letter No, Dispatch No, Date) - styled like screenshot */}
              <div className="grid grid-cols-2 text-xs font-nepali mt-2 mb-6 border-b border-red-100 pb-3">
                <div className="space-y-1 text-left text-red-600 font-bold">
                  <p>
                    <span>{state.language === "ne" ? "पत्र संख्या:-" : "Letter No:-"}</span>{" "}
                    <span className="font-semibold text-slate-800">{state.letterNo}</span>
                  </p>
                  <p>
                    <span>{state.language === "ne" ? "चलानी नम्बर:-" : "Dispatch No:-"}</span>{" "}
                    <span className="font-semibold text-slate-800">{state.dispatchNo}</span>
                  </p>
                </div>
                <div className="text-right flex flex-col justify-end items-end text-red-600 font-bold">
                  <p>
                    <span>{state.language === "ne" ? "मिति:" : "Date:"}</span>{" "}
                    <span className="font-semibold text-slate-800">{state.language === "ne" ? state.dateBS : state.dateAD}</span>
                  </p>
                </div>
              </div>

              {/* 3. Recipient Information Block */}
              {(state.recipientDesignation || state.recipientOffice) && (
                <div className="text-xs md:text-sm text-slate-900 font-bold mb-6 flex flex-col gap-1 leading-normal text-left">
                  {state.recipientDesignation && (
                    <div>
                      {state.recipientSalutation ? `${state.recipientSalutation} ` : ""}
                      {state.recipientDesignation},
                    </div>
                  )}
                  {state.recipientOffice && <div>{state.recipientOffice},</div>}
                  {state.recipientAddress && (
                    <div className="font-medium text-slate-500">{state.recipientAddress}.</div>
                  )}
                </div>
              )}

              {/* 4. Letter Subject Block (Editorial underline design) */}
              {state.subject && (
                <div className="text-center mb-6 mt-4">
                  <span className="border-b-2 border-slate-900 font-bold px-2 py-0.5 text-xs md:text-sm uppercase tracking-wide">
                    {state.language === "ne" ? `विषय: ${state.subject}` : `Subject: ${state.subject}`}
                  </span>
                </div>
              )}

              {/* 5. Salutation */}
              {state.salutation && (
                <div className="text-xs md:text-sm font-semibold text-slate-800 mb-4 text-left">
                  {state.salutation}
                </div>
              )}

              {/* 6. Letter Main Body */}
              {state.body ? (
                <div className="text-xs md:text-sm text-slate-800 font-serif">
                  {renderFormattedContent(state.body)}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic text-center py-6">
                  {state.language === "ne" ? "[ पत्रको व्यहोरा खाली छ ]" : "[ Letter body is empty ]"}
                </div>
              )}

              {/* 7. Tapasil Table (Details Block) */}
              {state.showTapasil && state.tapasilItems.length > 0 && (
                <div className="mt-6 text-left">
                  <div className="text-xs md:text-sm font-bold text-slate-900 mb-2 font-sans uppercase tracking-wider text-[10px]">
                    {state.tapasilTitle || (state.language === "ne" ? "तपसिल विवरणहरू:" : "Details:")}
                  </div>

                  <table className="w-full border-collapse border border-slate-200 text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold font-sans text-[10px] uppercase tracking-wider">
                        <th className="border border-slate-200 px-3 py-2 text-center w-12">
                          {state.language === "ne" ? "क्र.सं." : "S.N."}
                        </th>
                        <th className="border border-slate-200 px-4 py-2 text-left">
                          {state.language === "ne" ? "विवरण" : "Particulars"}
                        </th>
                        <th className="border border-slate-200 px-4 py-2 text-left">
                          {state.language === "ne" ? "कैफियत / विवरण थप" : "Remarks / Details"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.tapasilItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 font-serif">
                          <td className="border border-slate-200 px-3 py-2 text-center font-sans">
                            {state.language === "ne" ? toNepaliNumerals(index + 1) : index + 1}
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

            {/* 8. Dual QR Code & Sign-off Footer Area */}
            <div className="mt-12 flex justify-between items-end w-full">
              {/* Verification QR Code (Bottom Left) */}
              {state.showQrCode && state.qrCodeValue ? (
                <div id="preview-qrcode-block" className="flex flex-col items-start text-left max-w-[200px]">
                  <div className="p-1.5 bg-white border border-slate-100 rounded-md shadow-xs">
                    <QrCodeRenderer value={state.qrCodeValue} size={76} />
                  </div>
                  {state.qrCodeLabel && (
                    <p className="text-[9px] md:text-[10px] leading-tight text-slate-500 font-medium font-nepali mt-2 max-w-[170px]">
                      {state.qrCodeLabel}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* Sign-off Block (Bottom Right) */}
              <div className="flex flex-col items-end text-xs md:text-sm text-slate-800 w-64 text-right">
                <div className="mb-10 font-serif">
                  {state.language === "ne" ? "भवदीय," : "Sincerely yours,"}
                </div>
                
                {/* Signature space */}
                <div className="w-40 border-b border-slate-300 mb-2 self-end"></div>

                {state.senderName && (
                  <p className="font-bold text-slate-900">{state.senderName}</p>
                )}
                {state.senderDesignation && (
                  <p className="text-xs italic text-slate-600 font-serif">{state.senderDesignation}</p>
                )}
              </div>
            </div>

            {/* 9. Dynamic Office Absolute Footer (Highly Polished Official Red Style) */}
            <div className="absolute bottom-10 left-10 right-10 font-nepali">
              <div className="border-t border-red-600 w-full mb-3"></div>
              <p className="text-center text-[10px] md:text-xs text-red-600 font-semibold tracking-wide">
                {state.language === "ne" ? (
                  <>
                    {state.footerPhone && `फोन नं. ${state.footerPhone}`}
                    {state.footerPhone && state.footerEmail && `, `}
                    {state.footerEmail && `ईमेलः ${state.footerEmail}`}
                    {(state.footerPhone || state.footerEmail) && state.footerWeb && `, `}
                    {state.footerWeb && `वेबसाईटः ${state.footerWeb}`}
                  </>
                ) : (
                  <>
                    {state.footerPhone && `Phone No. ${state.footerPhone}`}
                    {state.footerPhone && state.footerEmail && ` | `}
                    {state.footerEmail && `Email: ${state.footerEmail}`}
                    {(state.footerPhone || state.footerEmail) && state.footerWeb && ` | `}
                    {state.footerWeb && `Website: ${state.footerWeb}`}
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
      </main>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
          {/* Header Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {state.language === "ne" ? "कुल चलानी संख्या" : "Total Dispatches"}
                </span>
                <span className="text-2xl font-bold text-slate-900 leading-none font-sans">
                  {state.language === "ne" ? toNepaliNumerals(chalaniRegister.length) : chalaniRegister.length}
                </span>
              </div>
            </div>

            {/* Global Sequence Management Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 col-span-1 md:col-span-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    {state.language === "ne" ? "चलानी नम्बर क्रम व्यवस्थापन" : "Sequence Number Management"}
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-slate-700 block mt-0.5">
                    {state.language === "ne" ? "केन्द्रीय कार्यालयको अर्को चलानी नम्बर अद्यावधिक गर्नुहोस्" : "Update central office next dispatch serial number"}
                  </span>
                </div>
              </div>
              
              {/* Inline Next Sequence Override */}
              <div className="flex items-center gap-2 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-start">
                <span className="text-[10px] md:text-xs text-slate-500 font-sans">
                  {state.language === "ne" ? "अर्को चलानी क्रमः" : "Next sequence:"}
                </span>
                <input
                  type="number"
                  placeholder="Next No"
                  key={chalaniRegister.length} // Force reset when register length changes
                  defaultValue={chalaniRegister.length > 0 ? Math.max(...chalaniRegister.map(r => {
                    const parsed = parseInt(r.chalaniNo || "", 10);
                    return isNaN(parsed) ? 0 : parsed;
                  })) + 1 : 1}
                  onBlur={(e) => handleCounterOverride("office", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCounterOverride("office", (e.target as HTMLInputElement).value);
                    }
                  }}
                  className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-md text-sm text-center font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 font-sans"
                  title={state.language === "ne" ? "चलानी क्रम परिवर्तन गर्न यहाँ नयाँ नम्बर टाइप गरि बाहिर क्लिक गर्नुहोस" : "Change sequence value"}
                />
              </div>
            </div>
          </div>

          {/* Table list card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col flex-1 overflow-hidden min-h-[400px]">
            {/* Table Filters & Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-red-600" />
                  <span>{state.language === "ne" ? "केन्द्रीय कार्यालय चलानी किताब" : "Central Dispatch Register Log"}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {state.language === "ne"
                    ? "मन्त्रालयका विभिन्न शाखा प्रमुख र कर्मचारीहरूद्वारा सिर्जना गरिएका पत्रहरूको आधिकारिक अभिलेख"
                    : "Official registry records of dispatches processed by all section personnel simultaneously."}
                </p>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                <input
                  type="text"
                  placeholder={state.language === "ne" ? "विषय, चलानी नं. वा पाउने कार्यालय खोज्नुहोस्..." : "Search subject, ref, recipient..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none w-full md:w-64 bg-white font-sans"
                />

                <button
                  onClick={loadRegister}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer text-slate-700 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{state.language === "ne" ? "रिफ्रेस" : "Refresh"}</span>
                </button>
              </div>
            </div>

            {/* Extended Advanced Filters Bar */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/30 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
              {/* Left Side: Section and Date Range selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto flex-1">
                {/* Section filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {state.language === "ne" ? "शाखा फिल्टर" : "Filter by Section"}
                  </label>
                  <select
                    id="filter-section-dropdown"
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="all">{state.language === "ne" ? "सबै शाखाहरू (All Sections)" : "All Sections"}</option>
                    <option value="none">{state.language === "ne" ? "शाखा नभएका (No Section)" : "No Section"}</option>
                    {OFFICE_SECTIONS.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {state.language === "ne" ? sec.nameNe : sec.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {state.language === "ne" ? "सुरु मिति (A.D. / YYYY-MM-DD)" : "Start Date (A.D.)"}
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-sans text-slate-700"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {state.language === "ne" ? "अन्तिम मिति (A.D. / YYYY-MM-DD)" : "End Date (A.D.)"}
                  </label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-sans text-slate-700"
                  />
                </div>
              </div>

              {/* Right Side: Clear Filters */}
              {(filterSection !== "all" || filterStartDate !== "" || filterEndDate !== "") && (
                <div className="flex items-center gap-2 self-end xl:self-auto shrink-0 mt-2 xl:mt-0">
                  <button
                    onClick={() => {
                      setFilterSection("all");
                      setFilterStartDate("");
                      setFilterEndDate("");
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {state.language === "ne" ? "फिल्टरहरू हटाउनुहोस्" : "Clear Filters"}
                  </button>
                </div>
              )}
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-x-auto">
              {isRegisterLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                  <p className="text-xs font-medium font-sans">
                    {state.language === "ne" ? "डेटाबेसमा खोजिँदैछ..." : "Loading database entries..."}
                  </p>
                </div>
              ) : chalaniRegister.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                  <AlertCircle className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-semibold">
                    {state.language === "ne" ? "चलानी किताब खाली छ।" : "No dispatch entries found."}
                  </p>
                  <p className="text-[11px] font-sans">
                    {state.language === "ne" ? "अहिलेसम्म कुनै चलानी जारी गरिएको छैन।" : "Start drafting and register to issue your first chalani."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-24">{state.language === "ne" ? "चलानी नं." : "Ref No."}</th>
                      <th className="py-3.5 px-4 w-28">{state.language === "ne" ? "पत्र संख्या" : "Letter No."}</th>
                      <th className="py-3.5 px-4 w-32">{state.language === "ne" ? "दर्ता मिति" : "Date"}</th>
                      <th className="py-3.5 px-4 w-40">{state.language === "ne" ? "शाखा" : "Section"}</th>
                      <th className="py-3.5 px-4 max-w-xs">{state.language === "ne" ? "पाउने कार्यालय / व्यक्ति" : "Recipient Address"}</th>
                      <th className="py-3.5 px-4 max-w-sm">{state.language === "ne" ? "पत्रको विषय" : "Subject Title"}</th>
                      <th className="py-3.5 px-4 w-36">{state.language === "ne" ? "हस्ताक्षरकर्ता" : "Signed By"}</th>
                      <th className="py-3.5 px-4 text-right w-44">{state.language === "ne" ? "कार्यहरू" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                    {(() => {
                      const filteredList = chalaniRegister.filter((r) => {
                        // 1. Section Filter
                        if (filterSection !== "all") {
                          if (filterSection === "none") {
                            const sec = r.sectionId;
                            if (sec && sec !== "none" && sec !== "office") {
                              return false;
                            }
                          } else {
                            if (r.sectionId !== filterSection) {
                              return false;
                            }
                          }
                        }

                        // 2. Date Range Filter
                        if (filterStartDate !== "") {
                          if (!r.dateAD || r.dateAD < filterStartDate) {
                            return false;
                          }
                        }
                        if (filterEndDate !== "") {
                          if (!r.dateAD || r.dateAD > filterEndDate) {
                            return false;
                          }
                        }

                        // 3. Search Query Filter
                        if (searchQuery.trim() !== "") {
                          const query = searchQuery.toLowerCase();
                          const ch = (r.chalaniNo || "").toLowerCase();
                          const ln = (r.letterNo || "").toLowerCase();
                          const rec = (r.recipient || "").toLowerCase();
                          const sub = (r.subject || "").toLowerCase();
                          const sdr = (r.sender || "").toLowerCase();
                          const secNameNe = (r.sectionNameNe || "").toLowerCase();
                          const secNameEn = (r.sectionNameEn || "").toLowerCase();
                          return ch.includes(query) || ln.includes(query) || rec.includes(query) || sub.includes(query) || sdr.includes(query) || secNameNe.includes(query) || secNameEn.includes(query);
                        }
                        return true;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                              {state.language === "ne" ? "फिल्टर गरिएका सर्तहरूसँग मेल खाने कुनै पनि चलानी फेला परेन।" : "No matches found with selected filters."}
                            </td>
                          </tr>
                        );
                      }

                      return filteredList.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-center text-red-600 bg-red-50/30">
                            {entry.chalaniNo}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{entry.letterNo}</td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {state.language === "ne" ? entry.dateBS : entry.dateAD}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-600">
                            {entry.sectionNameNe || entry.sectionNameEn ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[10px] whitespace-nowrap">
                                {state.language === "ne" ? (entry.sectionNameNe || entry.sectionNameEn) : (entry.sectionNameEn || entry.sectionNameNe)}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">
                                {state.language === "ne" ? "केन्द्रीय" : "Central"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-600" title={entry.recipient}>
                            {entry.recipient}
                          </td>
                          <td className="py-3 px-4 max-w-sm truncate text-slate-900 font-semibold" title={entry.subject}>
                            {entry.subject}
                          </td>
                          <td className="py-3 px-4 text-slate-500 truncate" title={entry.sender}>
                            {entry.sender}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleLoadFromRegister(entry)}
                                className="px-2.5 py-1 bg-red-50 text-red-700 rounded border border-red-100 hover:bg-red-100 transition-colors cursor-pointer text-[10px] font-bold whitespace-nowrap"
                              >
                                {state.language === "ne" ? "बोर्डमा खोल्नुहोस्" : "Edit / Open"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <footer id="app-footer" className="h-8 bg-slate-900 text-slate-400 flex items-center px-6 text-[10px] justify-between uppercase tracking-widest shrink-0">
        <div className="flex gap-4">
          <span>Version 1.0.2-Stable</span>
          <span>{state.language === "ne" ? "सुरक्षित जडान" : "Secure Connection"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>{state.language === "ne" ? "स्थानीय लाइभ सिङ्क सक्रिय" : "Local Live Sync Active"}</span>
        </div>
      </footer>
    </div>
  );
}
