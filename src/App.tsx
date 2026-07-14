import { useState, useEffect } from "react";
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
  FileText
} from "lucide-react";
import { LetterState, Language, PresetOffice, TapasilItem, EmblemType } from "./types";
import { OFFICE_PRESETS, toNepaliNumerals, getPrefilledNepaliDate } from "./presets";
import { generateDocxBlob } from "./docxGenerator";

// High-fidelity representational Nepal Government emblem SVG component
function NepalEmblemSVG({ type }: { type: EmblemType }) {
  if (type === "none") return null;

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-20 h-20 mx-auto transition-transform hover:scale-105 duration-300"
      aria-label="Government of Nepal Emblem"
    >
      {/* Outer Rhododendron garland representing Nepal's national flower */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3,3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a8a" strokeWidth="1.5" />
      
      {/* Mount Everest & Hill Base */}
      <path d="M 22 68 Q 36 38 50 48 Q 64 32 78 68 Z" fill="#f3f4f6" stroke="#1e3a8a" strokeWidth="1.5" />
      <path d="M 32 68 Q 44 42 52 56 Q 60 40 68 68 Z" fill="#e5e7eb" stroke="#1e3a8a" strokeWidth="1" />
      
      {/* Nepal Map Outline inside */}
      <path d="M 38 58 Q 42 56 46 57 Q 52 54 58 56 Q 62 55 64 58 Q 50 62 38 58 Z" fill="#f87171" opacity="0.8" />
      
      {/* Handshake symbolizing cooperation and federal integrity */}
      <g stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round">
        <path d="M 42 74 Q 46 72 50 74" fill="none" />
        <path d="M 50 74 Q 54 72 58 74" fill="none" />
        <circle cx="45" cy="74" r="2" fill="#1e3a8a" />
        <circle cx="55" cy="74" r="2" fill="#1e3a8a" />
      </g>
      
      {/* Rhododendron Garland Details */}
      <path d="M 18 50 C 18 35, 30 20, 50 20 C 70 20, 82 35, 82 50" fill="none" stroke="#dc2626" strokeWidth="3" opacity="0.3" />
      
      {/* National Flag of Nepal on left and right */}
      <path d="M 16 35 L 24 35 L 18 42 L 26 42 L 20 52 L 16 52 Z" fill="#dc2626" stroke="#1e3a8a" strokeWidth="0.75" />
      <path d="M 84 35 L 76 35 L 82 42 L 74 42 L 80 52 L 84 52 Z" fill="#dc2626" stroke="#1e3a8a" strokeWidth="0.75" />

      {/* Text inside emblem */}
      <text x="50" y="86" textAnchor="middle" fill="#dc2626" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
        {type === "province_bagamati" ? "बागमती प्रदेश" : type === "local" ? "स्थानीय सरकार" : "नेपाल सरकार"}
      </text>
      <text x="50" y="93" textAnchor="middle" fill="#1e3a8a" fontSize="4.5" fontWeight="semibold" fontFamily="sans-serif">
        जननी जन्मभूमिश्च स्वर्गादपि गरीयसी
      </text>
    </svg>
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
    officeDepartment: "प्रशासन तथा योजना शाखा",
    officeAddress: "हेटौंडा, मकवानपुर",
    emblemType: "province_bagamati",
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
    ]
  });

  // AI assistant loading and prompt states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLetterType, setAiLetterType] = useState("request");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Synchronize fields when language changes
  const handleLanguageChange = (lang: Language) => {
    setState((prev) => {
      const isNe = lang === "ne";
      const preset = OFFICE_PRESETS.find((p) => p.id === prev.presetId) || OFFICE_PRESETS[0];

      return {
        ...prev,
        language: lang,
        officeName: isNe ? preset.name : preset.nameEn,
        officeProvince: isNe ? preset.province : preset.provinceEn,
        officeDepartment: isNe ? preset.department : preset.departmentEn,
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
        tapasilTitle: isNe ? "तपसिल विवरणहरू:" : "Details List:"
      };
    });
  };

  // Synchronize fields when preset changes
  const handlePresetChange = (presetId: string) => {
    const preset = OFFICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setState((prev) => {
      const isNe = prev.language === "ne";
      return {
        ...prev,
        presetId,
        officeName: isNe ? preset.name : preset.nameEn,
        officeProvince: isNe ? preset.province : preset.provinceEn,
        officeDepartment: isNe ? preset.department : preset.departmentEn,
        officeAddress: isNe ? preset.address : preset.addressEn,
        emblemType: preset.emblemType,
        senderName: preset.senderName,
        senderDesignation: isNe ? "शाखा अधिकृत" : "Section Officer",
        recipientOffice: isNe ? preset.recipientOffice : preset.recipientOffice || "Concerned Authority",
        recipientAddress: isNe ? preset.recipientAddress : preset.recipientAddress || "Kathmandu, Nepal",
        recipientSalutation: isNe ? "श्री" : "The",
        salutation: isNe ? "महोदय," : "Dear Sir/Madam,"
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
          type: aiLetterType,
          language: state.language,
          officeName: state.officeName,
          senderRole: state.senderDesignation,
          recipientDetails: `${state.recipientSalutation} ${state.recipientDesignation}, ${state.recipientOffice}`,
          keyPoints: state.showTapasil ? "Please structure some specific line items for tapasil table if appropriate" : ""
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate content.");
      }

      const data = await response.json();

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
      // 1. Fetch emblem from Wikimedia to bundle into Word document
      let emblemBuffer: ArrayBuffer | null = null;
      try {
        const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Emblem_of_Nepal.svg/200px-Emblem_of_Nepal.svg.png";
        const res = await fetch(url);
        if (res.ok) {
          emblemBuffer = await res.arrayBuffer();
        }
      } catch (err) {
        console.warn("Could not fetch Wikimedia emblem, using standard text header fallback inside Word document", err);
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
            onClick={handleDownloadDocx}
            disabled={isDownloading}
            className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2 transition-colors disabled:bg-slate-400 cursor-pointer shadow-sm"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            {isDownloading ? (state.language === "ne" ? "डाउनलोड हुँदै..." : "Downloading...") : (state.language === "ne" ? "वर्ड (.docx) निर्यात" : "Export as MS Word (.docx)")}
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
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
                  <option value="none">{state.language === "ne" ? "छाप नराख्ने" : "No Emblem"}</option>
                </select>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {state.language === "ne" ? "शाखा / विभाग" : "Department / Section"}
                </label>
                <input
                  id="office-dept-input"
                  type="text"
                  value={state.officeDepartment}
                  onChange={(e) => setState({ ...state, officeDepartment: e.target.value })}
                  placeholder="प्रशासन महाशाखा"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
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
          </div>

          {/* Section 2: Administrative Details */}
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {state.language === "ne" ? "२. पत्र संख्या र दर्ता विवरण" : "2. Reference & Date Details"}
            </h3>

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
                <input
                  id="dispatch-no-input"
                  type="text"
                  value={state.dispatchNo}
                  onChange={(e) => setState({ ...state, dispatchNo: e.target.value })}
                  placeholder="४८२"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                />
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {state.language === "ne" ? "मुख्य विवरण (Body Text)" : "Main Letter Body"}
              </label>
              <textarea
                id="letter-body-textarea"
                rows={8}
                value={state.body}
                onChange={(e) => setState({ ...state, body: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all leading-relaxed"
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
                  {state.language === "ne" ? "पाठ कपी गर्नुहोस्" : "Copy Plain Text"}
                </>
              )}
            </button>
          </div>

          {/* Paper Sheet (Exact A4 Aspect Ratio) */}
          <div
            id="a4-sheet"
            className="w-full max-w-[21cm] min-h-[29.7cm] bg-white text-slate-900 shadow-2xl border border-slate-200 p-10 md:p-14 flex flex-col justify-between relative select-text mb-8"
            style={{ fontFamily: state.language === "ne" ? "Noto Sans Devanagari, sans-serif" : "Georgia, serif" }}
          >
            {/* Sheet Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
              <NepalEmblemSVG type={state.emblemType} />
            </div>

            <div className="flex flex-col flex-1">
              {/* 1. Letterhead Emblem & Title Row (Editorial side-by-side design) */}
              <div className="flex justify-between items-start mb-6">
                {/* Left Logo Emblem */}
                <div className="w-16 h-16 shrink-0 flex items-start justify-start">
                  {state.emblemType !== "none" ? (
                    <NepalEmblemSVG type={state.emblemType} />
                  ) : (
                    <div className="w-16 h-16"></div>
                  )}
                </div>

                {/* Center Text Column */}
                <div className="flex-1 text-center font-serif px-4 leading-tight">
                  {/* Province Government Header */}
                  {state.officeProvince && (
                    <h3 className="text-red-700 text-[11px] md:text-xs font-bold uppercase tracking-wider">
                      {state.officeProvince}
                    </h3>
                  )}

                  {/* Principal Office Name */}
                  {state.officeName && (
                    <h1 className="text-red-700 text-base md:text-xl font-bold tracking-tight mt-0.5 uppercase">
                      {state.officeName}
                    </h1>
                  )}

                  {/* Division / Department */}
                  {state.officeDepartment && (
                    <h2 className="text-blue-900 text-[11px] md:text-xs font-semibold tracking-wide mt-0.5">
                      {state.officeDepartment}
                    </h2>
                  )}

                  {/* Office Address */}
                  {state.officeAddress && (
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-sans tracking-wide">
                      {state.officeAddress}
                    </p>
                  )}
                </div>

                {/* Right Symmetric Space */}
                <div className="w-16 h-16 shrink-0"></div>
              </div>

              {/* Red/Blue Double Letterhead Line */}
              <div className="letter-header-border w-full mb-6"></div>

              {/* 2. Metadata Columns (Letter No, Dispatch No, Date) */}
              <div className="flex justify-between text-xs font-sans border-b border-slate-100 pb-2 mb-6">
                <div className="space-y-1 text-left">
                  <p><span className="font-semibold text-slate-700">{state.language === "ne" ? "पत्र संख्या:" : "Letter No:"}</span> <span className="font-normal">{state.letterNo}</span></p>
                  <p><span className="font-semibold text-slate-700">{state.language === "ne" ? "चलानी नं:" : "Ref No:"}</span> <span className="font-normal">{state.dispatchNo}</span></p>
                </div>
                <div className="text-right">
                  <p><span className="font-semibold text-slate-700">{state.language === "ne" ? "मिति:" : "Date:"}</span> <span className="font-normal">{state.language === "ne" ? state.dateBS : state.dateAD}</span></p>
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
                <div className="text-xs md:text-sm text-slate-800 leading-relaxed space-y-4 whitespace-pre-wrap text-justify indent-8 md:indent-12 font-serif">
                  {state.body}
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

            {/* 8. Sign-off Footer Area */}
            <div className="mt-12 flex flex-col items-end text-xs md:text-sm text-slate-800 self-end w-64 text-right">
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

            {/* 9. Dynamic Office Absolute Footer */}
            <div className="absolute bottom-8 left-10 right-10 flex justify-between border-t border-red-100 pt-4 text-[9px] text-slate-400 uppercase tracking-wider font-sans">
              <p>{getOfficeFooterDetails(state.presetId, state.language === "ne").phone}</p>
              <p>{getOfficeFooterDetails(state.presetId, state.language === "ne").email}</p>
              <p>{getOfficeFooterDetails(state.presetId, state.language === "ne").web}</p>
            </div>
          </div>
        </section>
      </main>

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
