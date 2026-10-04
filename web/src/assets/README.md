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

The Case Files toolbar button is **Open** (or **Request access** for a locked file, which shows its lock). The old "test bypass" button was removed. Previews that skip a lock now exist only in the dev-server Test Lab and are ignored in production builds, and the server refuses `?preview=true` unless `UNSOLVED_TEST_PREVIEW=1`.
