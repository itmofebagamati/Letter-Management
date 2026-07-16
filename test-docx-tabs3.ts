import { Document, Packer, Paragraph, TextRun, TabStopType, Tab } from "docx";
import * as fs from "fs";
const doc = new Document({
  sections: [{
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.CENTER, position: 2000 }],
        children: [
            new TextRun({ children: [new Tab()] }),
            new TextRun({ text: "Center Text" })
        ]
      })
    ]
  }]
});
Packer.toBuffer(doc).then(b => {
    fs.writeFileSync('test3.docx', b);
});
