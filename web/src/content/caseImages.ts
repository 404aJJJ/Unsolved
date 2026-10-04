import { apiUrl } from '../api/http'
import type { FileId } from './types'

// 01 and 02 are public, so Vercel (or any static host) serves them from web/public/evidence with its CDN.
// 04-06 are locked evidence: they must come from the API, which checks the player's unlock on every request.
// apiUrl() adds the Python server's URL when configured (and the dev-only mock switch).

// API IDs remain stable for saved progress; FILES supplies the displayed 01–05 numbering.
export const CASE_IMAGES: Record<FileId, { src: string; title: string; trimRightEdge?: boolean }> = {
  '01': { src: '/evidence/incidentReport_01.webp', title: 'Initial Incident Report' },
  '02': { src: '/evidence/interviewStatements_02.webp', title: 'Interviews' },
  '04': { src: apiUrl('/api/files/04/image'), title: 'Security Logs' },
  // These scans include an extra strip outside the 820 × 1060 paper on the right.
  '05': { src: apiUrl('/api/files/05/image'), title: 'Diamond Examination Report', trimRightEdge: true },
  '06': { src: apiUrl('/api/files/06/image'), title: 'Purchase Records', trimRightEdge: true },
}
