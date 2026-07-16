import { Document, Packer } from "docx";
import * as fs from "fs";
const doc = new Document({
  features: { updateFields: false },
  sections: [{
    children: []
  }]
});
Packer.toBuffer(doc).then(b => {
    fs.writeFileSync('test_features.docx', b);
});
