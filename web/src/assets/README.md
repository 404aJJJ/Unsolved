# Game assets

- `suspects/`: all six suspect profile images used on the Case Board.
- `case-documents/`: the five original supplied PNG scans used by the Case Files viewer.

Scans are rendered as complete, scrollable pages in the desktop's Case Viewer.
`src/content/caseImages.ts` maps each scan to its existing evidence ID:

| Display number | API ID | Scan |
| --- | --- | --- |
| 01 | 01 | incidentReport_01.png |
| 02 | 02 | interviewStatements_02.png |
| 03 | 04 | securityLogs_03.png |
| 04 | 05 | diamondExamReport_04.png |
| 05 | 06 | purchaseRecords_05.png |

Appraisal correspondence is available in Mail and is no longer a case file.
API IDs remain stable for existing unlock endpoints and saved progress.

The temporary “Open selected file (test bypass)” button previews a scan without
calling the unlock API or changing recovered records, attempts, or milestones.
