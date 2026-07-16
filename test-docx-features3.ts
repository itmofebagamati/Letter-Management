import { Document, Packer, features } from "docx";
const doc = new Document({
  features: { updateFields: false },
  sections: [{ children: [] }]
});
console.log(doc);
