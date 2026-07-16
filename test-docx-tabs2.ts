import { Document, Packer, Paragraph, TextRun, TabStopType } from "docx";
import * as fs from "fs";
const doc = new Document({
  sections: [{
    children: [
      new Paragraph({
        children: [
            new TextRun({ text: "A\tB" })
        ]
      })
    ]
  }]
});
Packer.toBuffer(doc).then(b => {
    fs.writeFileSync('test.docx', b);
});
