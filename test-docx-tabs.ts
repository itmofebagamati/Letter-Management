import { Document, Packer, Paragraph, TextRun, TabStopType } from "docx";
import * as fs from "fs";

const doc = new Document({
  sections: [{
    children: [
      new Paragraph({
        tabStops: [
            { type: TabStopType.CENTER, position: 2000 },
        ],
        children: [
            new TextRun({ text: "\tTest" })
        ]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(b => console.log("OK")).catch(e => console.error(e));
