import { Document, Packer, Table, TableRow, TableCell, Paragraph, WidthType } from "docx";
import * as fs from "fs";
const doc = new Document({
  sections: [{
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                children: [new Paragraph("Test")]
              })
            ]
          })
        ]
      })
    ]
  }]
});
Packer.toBuffer(doc).then(b => fs.writeFileSync('test_width.docx', b));
