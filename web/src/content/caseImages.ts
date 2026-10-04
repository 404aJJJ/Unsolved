import incident from '../assets/case-documents/incidentReport_01.png'
import interviews from '../assets/case-documents/interviewStatements_02.png'
import security from '../assets/case-documents/securityLogs_03.png'
import diamond from '../assets/case-documents/diamondExamReport_04.png'
import purchases from '../assets/case-documents/purchaseRecords_05.png'
import type { FileId } from './types'

// API IDs remain stable for saved progress; FILES supplies the displayed 01–05 numbering.
export const CASE_IMAGES: Record<FileId, { src: string; title: string; trimRightEdge?: boolean }> = {
  '01': { src: incident, title: 'Initial Incident Report' },
  '02': { src: interviews, title: 'Interviews' },
  '04': { src: security, title: 'Security Logs' },
  // These scans include an extra strip outside the 820 × 1060 paper on the right.
  '05': { src: diamond, title: 'Diamond Examination Report', trimRightEdge: true },
  '06': { src: purchases, title: 'Purchase Records', trimRightEdge: true },
}
