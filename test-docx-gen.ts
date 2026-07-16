import { generateDocxBlob } from "./src/docxGenerator";
import { LetterState } from "./src/types";
import * as fs from "fs";

const mockState: LetterState = {
  language: "ne",
  emblemType: "nepal",
  governmentName: "नेपाल सरकार",
  ministryName: "",
  departmentName: "",
  officeProvince: "बागमती प्रदेश सरकार",
  officeName: "वन तथा वातवारण मन्त्रालय",
  officeDepartment: "Section name",
  officeAddress: "Address",
  letterNo: "123",
  dispatchNo: "456",
  date: "2080-01-01",
  subject: "Test Subject",
  salutation: "Mahodaya",
  body: "This is a test body.",
  showTapasil: false,
  tapasilTitle: "",
  tapasilItems: [],
  senderName: "Sender",
  senderDesignation: "Designation",
  qrCodeValue: "123456",
  qrCodeLabel: "Scanned",
  footerPhone: "123",
  footerEmail: "test@test.com",
  footerWeb: "test.com"
};

generateDocxBlob(mockState, null).then(async (blob) => {
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync('test_generated.docx', buffer);
  console.log("Document generated");
}).catch(e => console.error(e));
