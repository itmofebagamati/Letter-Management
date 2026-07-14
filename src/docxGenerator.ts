import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  UnderlineType,
  HeightRule
} from "docx";
import { LetterState } from "./types";

/**
 * Generates an MS Word Document (.docx) Blob from the LetterState
 */
export async function generateDocxBlob(state: LetterState, emblemArrayBuffer: ArrayBuffer | null): Promise<Blob> {
  const isNepali = state.language === "ne";

  // Create document elements list
  const docChildren: any[] = [];

  // 1. EMBLEM / LOGO & HEADER INFORMATION
  // Left column or Center. Let's do Center aligned for Nepalese official look.
  if (emblemArrayBuffer) {
    try {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: emblemArrayBuffer,
              transformation: {
                width: 70,
                height: 70,
              },
            } as any),
          ],
        })
      );
    } catch (e) {
      console.error("Failed to insert emblem image into docx", e);
    }
  } else {
    // Elegant text-based emblem placeholder if offline or failed
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "नेपाल सरकार",
            bold: true,
            color: "DC2626", // Red color for government theme
            size: 20,
            font: "Kalimati",
          }),
        ],
      })
    );
  }

  // Province/Federal Level Header
  if (state.officeProvince) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, before: 0 },
        children: [
          new TextRun({
            text: state.officeProvince,
            bold: true,
            size: 26, // 13 pt
            color: "DC2626", // Red
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // Office Name Header (largest, bold red)
  if (state.officeName) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: state.officeName,
            bold: true,
            size: 36, // 18 pt
            color: "DC2626", // Red
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // Department / Section
  if (state.officeDepartment) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: state.officeDepartment,
            bold: true,
            size: 24, // 12 pt
            color: "1E3A8A", // Dark Blue
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // Office Address
  if (state.officeAddress) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: state.officeAddress,
            size: 20, // 10 pt
            color: "111827", // Charcoal
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // 2. LETTER METADATA (Letter No., Dispatch/Ref No., Date)
  // We use a clean 1-row table with borders disabled to layout Left (Letter/Ref No) and Right (Date) perfectly
  docChildren.push(
    new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: {
                size: 50,
                type: WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: isNepali ? "पत्र संख्या: " : "Letter No: ",
                      bold: true,
                      size: 22,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                    new TextRun({
                      text: state.letterNo,
                      size: 22,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: isNepali ? "चलानी नं: " : "Ref No: ",
                      bold: true,
                      size: 22,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                    new TextRun({
                      text: state.dispatchNo,
                      size: 22,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: {
                size: 50,
                type: WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: isNepali ? "मिति: " : "Date: ",
                      bold: true,
                      size: 22,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                    new TextRun({
                      text: isNepali ? state.dateBS : state.dateAD,
                      size: 22,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Spacing
  docChildren.push(new Paragraph({ spacing: { after: 200 } }));

  // 3. RECIPIENT BLOCK
  if (state.recipientDesignation || state.recipientOffice) {
    const recLines: string[] = [];
    if (state.recipientSalutation && state.recipientDesignation) {
      recLines.push(`${state.recipientSalutation} ${state.recipientDesignation},`);
    } else if (state.recipientDesignation) {
      recLines.push(`${state.recipientDesignation},`);
    }
    
    if (state.recipientOffice) recLines.push(state.recipientOffice + ",");
    if (state.recipientAddress) recLines.push(state.recipientAddress + ".");

    recLines.forEach((line) => {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 22,
              font: isNepali ? "Kalimati" : "Times New Roman",
            }),
          ],
        })
      );
    });
    
    // Spacing
    docChildren.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // 4. SUBJECT BLOCK (Centered, bold, underlined, red/charcoal accent)
  if (state.subject) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180, before: 60 },
        children: [
          new TextRun({
            text: isNepali ? `विषय: ${state.subject}` : `Subject: ${state.subject}`,
            bold: true,
            underline: {
              type: UnderlineType.SINGLE,
              color: "000000",
            },
            size: 24, // 12pt
            color: "000000",
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // 5. SALUTATION (महोदय / Dear Sir)
  if (state.salutation) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: state.salutation,
            size: 22,
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // 6. LETTER BODY (Paragraphs, well justified, standard 1.15 line spacing)
  if (state.body) {
    const paragraphs = state.body.split("\n\n");
    paragraphs.forEach((pText) => {
      if (!pText.trim()) return;
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 120, line: 360 }, // Spacing after paragraph and 1.5 line height
          indent: { firstLine: 400 }, // Standard paragraph indent
          children: [
            new TextRun({
              text: pText,
              size: 22, // 11 pt
              font: isNepali ? "Kalimati" : "Times New Roman",
            }),
          ],
        })
      );
    });
  }

  // 7. TAPASIL / DETAILS BLOCK (if enabled)
  if (state.showTapasil && state.tapasilItems.length > 0) {
    // Add title (e.g. तपसिल:)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: state.tapasilTitle || (isNepali ? "तपसिल:" : "Details:"),
            bold: true,
            size: 22,
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );

    // Create a beautiful, bordered Word Table
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: isNepali ? "क्र.सं." : "S.N.",
                    bold: true,
                    size: 20,
                    font: isNepali ? "Kalimati" : "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: isNepali ? "विवरण" : "Particulars",
                    bold: true,
                    size: 20,
                    font: isNepali ? "Kalimati" : "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: isNepali ? "कैफियत / विवरण थप" : "Remarks / Details",
                    bold: true,
                    size: 20,
                    font: isNepali ? "Kalimati" : "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ];

    state.tapasilItems.forEach((item, index) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: String(index + 1),
                      size: 20,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.particular,
                      size: 20,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.detail,
                      size: 20,
                      font: isNepali ? "Kalimati" : "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 90, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        rows: tableRows,
      })
    );

    // Spacing
    docChildren.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // 8. SIGN-OFF BLOCK (Right aligned)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 60 },
      children: [
        new TextRun({
          text: isNepali ? "भवदीय," : "Sincerely yours,",
          size: 22,
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
      ],
    })
  );

  // Blank spacing for signature
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "...........................................",
          color: "D1D5DB",
          size: 22,
        }),
      ],
    })
  );

  // Sender details
  if (state.senderName) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: state.senderName,
            bold: true,
            size: 22,
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  if (state.senderDesignation) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: state.senderDesignation,
            size: 20,
            color: "4B5563",
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // Construct the full Word Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (72pt * 20 dxa = 1440 dxa)
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
