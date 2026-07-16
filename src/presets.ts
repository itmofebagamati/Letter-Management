import { PresetOffice } from "./types";

export const OFFICE_PRESETS: PresetOffice[] = [
  {
    id: "mofe_bagamati",
    name: "वन तथा वातावरण मन्त्रालय",
    nameEn: "Ministry of Forests and Environment",
    province: "बागमती प्रदेश सरकार",
    provinceEn: "Bagamati Province Government",
    department: "",
    departmentEn: "",
    address: "हेटौंडा, मकवानपुर",
    addressEn: "Hetauda, Makwanpur",
    emblemType: "province_bagamati",
    senderName: "हरिप्रसाद अधिकारी",
    senderDesignation: "शाखा अधिकृत (Section Officer)",
    recipientOffice: "प्रदेश कोष तथा लेखा नियन्त्रक कार्यालय",
    recipientAddress: "हेटौंडा, मकवानपुर"
  },
  {
    id: "mofaga_federal",
    name: "संघीय मामिला तथा सामान्य प्रशासन मन्त्रालय",
    nameEn: "Ministry of Federal Affairs and General Administration",
    province: "नेपाल सरकार",
    provinceEn: "Government of Nepal",
    department: "",
    departmentEn: "",
    address: "सिंहदरबार, काठमाडौं",
    addressEn: "Singhadurbar, Kathmandu",
    emblemType: "nepal",
    senderName: "रामचन्द्र पौडेल",
    senderDesignation: "उपसचिव (Deputy Secretary)",
    recipientOffice: "काठमाडौं महानगरपालिका",
    recipientAddress: "बागमती प्रदेश, काठमाडौं"
  },
  {
    id: "ward_local",
    name: "वडा नं. ३ को कार्यालय",
    nameEn: "Office of Ward No. 3",
    province: "हेटौंडा उपमहानगरपालिका",
    provinceEn: "Hetauda Sub-Metropolitan City",
    department: "",
    departmentEn: "",
    address: "बागमती प्रदेश, हेटौंडा",
    addressEn: "Bagamati Province, Hetauda",
    emblemType: "local",
    senderName: "श्याम बहादुर थापा",
    senderDesignation: "वडा अध्यक्ष (Ward Chairperson)",
    recipientOffice: "जिल्ला प्रशासन कार्यालय",
    recipientAddress: "मकवानपुर"
  },
  {
    id: "dao_district",
    name: "जिल्ला प्रशासन कार्यालय",
    nameEn: "District Administration Office",
    province: "गृह मन्त्रालय",
    provinceEn: "Ministry of Home Affairs",
    department: "",
    departmentEn: "",
    address: "बबरमहल, काठमाडौं",
    addressEn: "Babarmahal, Kathmandu",
    emblemType: "nepal",
    senderName: "कमल प्रसाद अर्याल",
    senderDesignation: "सहायक प्रमुख जिल्ला अधिकारी (Asst. CDO)",
    recipientOffice: "जिल्ला प्रहरी परिसर",
    recipientAddress: "टेकु, काठमाडौं"
  },
  {
    id: "custom",
    name: "",
    nameEn: "",
    province: "",
    provinceEn: "",
    department: "",
    departmentEn: "",
    address: "",
    addressEn: "",
    emblemType: "nepal",
    senderName: "",
    senderDesignation: "",
    recipientOffice: "",
    recipientAddress: ""
  }
];

// Helper to convert English numerals to Nepali numerals
export function toNepaliNumerals(numStr: string | number): string {
  const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(numStr)
    .split("")
    .map(char => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : nepaliDigits[digit];
    })
    .join("");
}

export function toEnglishNumerals(numStr: string | number): string {
  const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(numStr)
    .split("")
    .map(char => {
      const idx = nepaliDigits.indexOf(char);
      return idx !== -1 ? String(idx) : char;
    })
    .join("");
}

import NepaliDate from 'nepali-date-converter';

// Simple Nepali Date approximation based on current system time
export function getPrefilledNepaliDate(): { bsDate: string; adDate: string } {
  const today = new Date();
  const adDateStr = today.toISOString().split('T')[0];

  const bsDate = new NepaliDate(today);
  const bsDateStr = `${bsDate.getYear()}/${bsDate.getMonth() + 1}/${bsDate.getDate()}`;

  return {
    bsDate: toNepaliNumerals(bsDateStr),
    adDate: adDateStr
  };
}
