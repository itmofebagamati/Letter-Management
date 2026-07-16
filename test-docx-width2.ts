import { Document, Packer, Table, TableRow, TableCell, Paragraph, WidthType } from "docx";
import * as fs from "fs";
const doc = new Document({
  sections: [{
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [4981, 4981],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph("Test")]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph("Test2")]
              })
            ]
          })
        ]
      })
    ]
  }]
});
Packer.toBuffer(doc).then(b => fs.writeFileSync('test_width2.docx', b));
