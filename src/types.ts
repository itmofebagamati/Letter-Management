export type Language = "ne" | "en";

export type EmblemType = "nepal" | "province_bagamati" | "province_generic" | "local" | "none";

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
  officeAddress: string;
  emblemType: EmblemType;
  
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
