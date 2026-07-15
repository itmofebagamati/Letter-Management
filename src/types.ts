export type Language = "ne" | "en";

export type EmblemType = "nepal" | "province_bagamati" | "province_generic" | "local" | "custom" | "none";

export interface TapasilItem {
  id: string;
  particular: string;
  detail: string;
}

export interface LetterState {
  language: Language;
  presetId: string;
  
  // Office details
  officeName: string;
  officeProvince: string;
  officeDepartment: string;
  officeSection?: string;
  officeAddress: string;
  emblemType: EmblemType;
  customLogoUrl?: string;
  
  // Footer details (customizable by Admin)
  footerPhone: string;
  footerEmail: string;
  footerWeb: string;
  
  // Administrative metadata
  letterNo: string;
  dispatchNo: string;
  dateBS: string;
  dateAD: string;
  
  // Recipient details
  recipientSalutation: string;
  recipientDesignation: string;
  recipientOffice: string;
  recipientAddress: string;
  
  // Letter content
  subject: string;
  salutation: string;
  body: string;
  
  // Sender details
  senderName: string;
  senderDesignation: string;
  
  // Optional Tapasil (Details block)
  showTapasil: boolean;
  tapasilTitle: string; // e.g., "तपसिल:" or "Details:"
  tapasilItems: TapasilItem[];

  // Optional Verification QR Code
  showQrCode: boolean;
  qrCodeValue: string; // URL/text to encode
  qrCodeLabel: string; // Verification text label
}

export interface PresetOffice {
  id: string;
  name: string;
  nameEn: string;
  province: string;
  provinceEn: string;
  department: string;
  departmentEn: string;
  address: string;
  addressEn: string;
  emblemType: EmblemType;
  senderName: string;
  senderDesignation: string;
  recipientOffice: string;
  recipientAddress: string;
}
