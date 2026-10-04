import type { FileId } from './types'

// Use the Python server's URL when configured.
const API_URL = import.meta.env.VITE_API_URL ?? ''

// API IDs remain stable for saved progress; FILES supplies the displayed 01–05 numbering.
export const CASE_IMAGES: Record<FileId, { src: string; title: string; trimRightEdge?: boolean }> = {
  '01': { src: `${API_URL}/api/files/01/image`, title: 'Initial Incident Report' },
  '02': { src: `${API_URL}/api/files/02/image`, title: 'Interviews' },
  '04': { src: `${API_URL}/api/files/04/image`, title: 'Security Logs' },
  // These scans include an extra strip outside the 820 × 1060 paper on the right.
  '05': { src: `${API_URL}/api/files/05/image`, title: 'Diamond Examination Report', trimRightEdge: true },
  '06': { src: `${API_URL}/api/files/06/image`, title: 'Purchase Records', trimRightEdge: true },
}
