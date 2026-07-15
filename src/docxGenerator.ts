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
  HeightRule,
  Footer
} from "docx";
import { LetterState } from "./types";
import QRCode from "qrcode";

interface StyleState {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  color?: string;
}

function parseHtmlToRuns(html: string, parentStyles: StyleState, font: string, size: number): TextRun[] {
  if (!html) return [];

  const containerRegex = /<(b|i|u|red|blue|green|purple|orange|gray|center|right|justify)>([\s\S]*?)<\/\1>/i;
  const imgRegex = /<img\s+src="([^"]+)"(?:\s+width="([^"]+)")?\s*\/?>/i;
  const hrRegex = /<hr\s*\/?>/i;

  const matchContainer = html.match(containerRegex);
  const matchImg = html.match(imgRegex);
  const matchHr = html.match(hrRegex);

  let earliestMatch: { type: "container" | "img" | "hr"; index: number; matchObj: any } | null = null;

  if (matchContainer) {
    earliestMatch = { type: "container", index: matchContainer.index ?? 0, matchObj: matchContainer };
  }
  if (matchImg) {
    const idx = matchImg.index ?? 0;
    if (!earliestMatch || idx < earliestMatch.index) {
      earliestMatch = { type: "img", index: idx, matchObj: matchImg };
    }
  }
  if (matchHr) {
    const idx = matchHr.index ?? 0;
    if (!earliestMatch || idx < earliestMatch.index) {
      earliestMatch = { type: "hr", index: idx, matchObj: matchHr };
    }
  }

  if (!earliestMatch) {
    return [
      new TextRun({
        text: html,
        font,
        size,
        bold: parentStyles.bold || undefined,
        italics: parentStyles.italics || undefined,
        underline: parentStyles.underline ? { type: UnderlineType.SINGLE } : undefined,
        color: parentStyles.color || undefined,
      }),
    ];
  }

  const { type, index, matchObj } = earliestMatch;
  const outerText = matchObj[0];
  const before = html.substring(0, index);
  const after = html.substring(index + outerText.length);

  const runs: TextRun[] = [];

  if (before) {
    runs.push(...parseHtmlToRuns(before, parentStyles, font, size));
  }

  if (type === "container") {
    const tag = matchObj[1].toLowerCase();
    const innerText = matchObj[2];

    let tagColor = parentStyles.color;
    if (tag === "red") tagColor = "DC2626";
    else if (tag === "blue") tagColor = "2563EB";
    else if (tag === "green") tagColor = "10B981";
    else if (tag === "purple") tagColor = "7C3AED";
    else if (tag === "orange") tagColor = "F59E0B";
    else if (tag === "gray") tagColor = "6B7280";

    const currentStyles: StyleState = {
      ...parentStyles,
      bold: tag === "b" ? true : parentStyles.bold,
      italics: tag === "i" ? true : parentStyles.italics,
      underline: tag === "u" ? true : parentStyles.underline,
      color: tagColor,
    };

    runs.push(...parseHtmlToRuns(innerText, currentStyles, font, size));
  } else if (type === "img") {
    runs.push(
      new TextRun({
        text: " [तस्वीर / Image] ",
        font,
        size,
        italics: true,
        color: "4B5563",
      })
    );
  } else if (type === "hr") {
    runs.push(
      new TextRun({
        text: " ____________________________________ ",
        font,
        size,
        color: "D1D5DB",
      })
    );
  }

  if (after) {
    runs.push(...parseHtmlToRuns(after, parentStyles, font, size));
  }

  return runs;
}

function parseTextToRuns(text: string, isNepali: boolean, size: number = 22): TextRun[] {
  let normalized = text
    .replace(/\*\*([\s\S]*?)\*\*/g, "<b>$1</b>")
    .replace(/\*([\s\S]*?)\*/g, "<i>$1</i>")
    .replace(/__([\s\S]*?)__/g, "<u>$1</u>");

  const font = isNepali ? "Kalimati" : "Times New Roman";
  return parseHtmlToRuns(normalized, {}, font, size);
}

/**
 * Generates an MS Word Document (.docx) Blob from the LetterState
 */
export async function generateDocxBlob(state: LetterState, emblemArrayBuffer: ArrayBuffer | null): Promise<Blob> {
  const isNepali = state.language === "ne";

  // Create document elements list
  const docChildren: any[] = [];

  // 1. EMBLEM / LOGO & HEADER INFORMATION
  // Side-by-side header table layout: Left (Emblem), Center (Titles), Right (Address)
  const leftHeaderParagraphs: Paragraph[] = [];
  if (state.emblemType !== "none") {
    if (emblemArrayBuffer) {
      try {
        leftHeaderParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new ImageRun({
                data: emblemArrayBuffer,
                transformation: {
                  width: 55,
                  height: 55,
                },
              } as any),
            ],
          })
        );
      } catch (e) {
        console.error("Failed to insert emblem image into docx", e);
      }
    } else {
      leftHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: isNepali ? "नेपाल सरकार" : "Govt. of Nepal",
              bold: true,
              color: "DC2626", // Red
              size: 16,
              font: isNepali ? "Kalimati" : "Times New Roman",
            }),
          ],
        })
      );
    }
  } else {
    leftHeaderParagraphs.push(new Paragraph({}));
  }

  const centerHeaderParagraphs: Paragraph[] = [];
  if (state.officeProvince) {
    centerHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30, before: 0 },
        children: [
          new TextRun({
            text: state.officeProvince,
            bold: true,
            size: 24, // 12 pt
            color: "DC2626",
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }
  if (state.officeName) {
    centerHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: state.officeName,
            bold: true,
            size: 32, // 16 pt
            color: "DC2626",
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  const rightHeaderParagraphs: Paragraph[] = [new Paragraph({})];

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
                size: 15,
                type: WidthType.PERCENTAGE,
              },
              children: leftHeaderParagraphs,
            }),
            new TableCell({
              width: {
                size: 70,
                type: WidthType.PERCENTAGE,
              },
              children: centerHeaderParagraphs,
            }),
            new TableCell({
              width: {
                size: 15,
                type: WidthType.PERCENTAGE,
              },
              children: rightHeaderParagraphs,
            }),
          ],
        }),
      ],
    })
  );

  // Third Line Right: Office Address (e.g. हेटौंडा, नेपाल)
  if (state.officeAddress) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: state.officeAddress,
            bold: true,
            size: 22, // 11 pt
            color: "DC2626",
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // Followed by respective branch and section name (officeDepartment) centered below
  if (state.officeDepartment) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({
            text: state.officeDepartment,
            bold: true,
            size: 24, // 12 pt
            color: "DC2626",
            font: isNepali ? "Kalimati" : "Times New Roman",
          }),
        ],
      })
    );
  }

  // Spacing line below header
  docChildren.push(new Paragraph({ spacing: { after: 120 } }));

  // 2. LETTER METADATA (Letter No., Dispatch/Ref No., Date)
  // We use a clean 1-row table with borders disabled to layout Left (Letter No, Dispatch No) and Right (Date) perfectly
  const leftMetadataParagraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: isNepali ? "पत्र संख्या:- " : "Letter No:- ",
          bold: true,
          size: 22,
          color: "DC2626", // Red metadata labels
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
        new TextRun({
          text: state.letterNo,
          size: 22,
          color: "111827",
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: isNepali ? "चलानी नम्बर:- " : "Dispatch No:- ",
          bold: true,
          size: 22,
          color: "DC2626", // Red metadata labels
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
        new TextRun({
          text: state.dispatchNo,
          size: 22,
          color: "111827",
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
      ],
    }),
  ];

  const rightMetadataParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: isNepali ? "मिति: " : "Date: ",
          bold: true,
          size: 22,
          color: "DC2626",
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
        new TextRun({
          text: isNepali ? state.dateBS : state.dateAD,
          size: 22,
          color: "111827",
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
      ],
    })
  ];

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
              children: leftMetadataParagraphs,
            }),
            new TableCell({
              width: {
                size: 50,
                type: WidthType.PERCENTAGE,
              },
              children: rightMetadataParagraphs,
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

      let alignment: any = AlignmentType.LEFT;
      if (/<center>/i.test(pText)) {
        alignment = AlignmentType.CENTER;
      } else if (/<right>/i.test(pText)) {
        alignment = AlignmentType.RIGHT;
      } else if (/<justify>/i.test(pText)) {
        alignment = AlignmentType.JUSTIFIED;
      }

      docChildren.push(
        new Paragraph({
          alignment: alignment,
          spacing: { after: 120, line: 360 }, // Spacing after paragraph and 1.5 line height
          indent: alignment === AlignmentType.LEFT ? { firstLine: 400 } : undefined, // Standard paragraph indent only for left aligned
          children: parseTextToRuns(pText, isNepali, 22),
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

  // 8. SIGN-OFF & QR CODE BLOCK (Side-by-side borderless Table)
  let qrCodeArrayBuffer: ArrayBuffer | null = null;
  if (state.showQrCode && state.qrCodeValue) {
    try {
      const qrDataUrl = await QRCode.toDataURL(state.qrCodeValue, {
        width: 150,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      });
      const parts = qrDataUrl.split(';base64,');
      const raw = window.atob(parts[1] || parts[0]);
      const rawLength = raw.length;
      const array = new Uint8Array(new ArrayBuffer(rawLength));
      for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
      }
      qrCodeArrayBuffer = array.buffer;
    } catch (e) {
      console.error("Failed to generate QR code for docx", e);
    }
  }

  // Left Cell Children (QR Code & Label)
  const leftCellParagraphs: Paragraph[] = [];
  if (qrCodeArrayBuffer) {
    leftCellParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 60 },
        children: [
          new ImageRun({
            data: qrCodeArrayBuffer,
            transformation: {
              width: 60,
              height: 60,
            },
          } as any),
        ],
      })
    );
    if (state.qrCodeLabel) {
      leftCellParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: state.qrCodeLabel,
              size: 16, // 8 pt
              color: "4B5563",
              font: isNepali ? "Kalimati" : "Times New Roman",
            }),
          ],
        })
      );
    }
  } else {
    leftCellParagraphs.push(new Paragraph({}));
  }

  // Right Cell Children (Sign-off & Signature Lines)
  const rightCellParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: isNepali ? "भवदीय," : "Sincerely yours,",
          size: 22,
          font: isNepali ? "Kalimati" : "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "...........................................",
          color: "D1D5DB",
          size: 22,
        }),
      ],
    })
  ];

  if (state.senderName) {
    rightCellParagraphs.push(
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
    rightCellParagraphs.push(
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
              children: leftCellParagraphs,
            }),
            new TableCell({
              width: {
                size: 50,
                type: WidthType.PERCENTAGE,
              },
              children: rightCellParagraphs,
            }),
          ],
        }),
      ],
    })
  );

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
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 12, // 1.5 pt
                    color: "DC2626", // Solid Red footer border line
                    space: 8,
                  },
                },
                children: [
                  new TextRun({
                    text: isNepali 
                      ? `${state.footerPhone ? "फोन नं. " + state.footerPhone : ""}${state.footerPhone && state.footerEmail ? ", " : ""}${state.footerEmail ? "ईमेलः " + state.footerEmail : ""}${(state.footerPhone || state.footerEmail) && state.footerWeb ? ", " : ""}${state.footerWeb ? "वेबसाईटः " + state.footerWeb : ""}`
                      : `${state.footerPhone ? "Phone No. " + state.footerPhone : ""}${state.footerPhone && state.footerEmail ? " | " : ""}${state.footerEmail ? "Email: " + state.footerEmail : ""}${(state.footerPhone || state.footerEmail) && state.footerWeb ? " | " : ""}${state.footerWeb ? "Website: " + state.footerWeb : ""}`,
                    size: 18, // 9 pt
                    bold: true,
                    color: "DC2626", // Red footer text color
                    font: isNepali ? "Kalimati" : "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
