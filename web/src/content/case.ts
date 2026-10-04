// Player-facing content for case PB-062. Only files that are open at the start live here.
// Locked files (04-06), unlock answers and hints are served by the API after a correct unlock.

import type { Email, FileDoc, FileEntry, Suspect } from './types'

export const CASE = {
  id: 'PB-062',
  title: 'Unsolved.exe',
  premise:
    'The Aster Diamond has been stolen while held at Premier Bank in London ahead of an auction. Its disappearance is discovered the morning after an appraisal, and investigators have identified six people of interest. Examine the case records, unlock supplementary evidence, and determine who took the diamond and how.',
}

export const FILES: FileEntry[] = [
  { id: '01', number: '01', title: 'Incident Report', kind: 'Scanned report' },
  { id: '02', number: '02', title: 'Interviews', kind: 'Scanned statements' },
  {
    id: '04',
    number: '03',
    title: 'Security Logs',
    kind: 'Scanned security record',
    lock: { type: 'numeric', minigame: 'pin', prompt: "Enter access code." },
  },
  {
    id: '05',
    number: '04',
    title: 'Diamond Examination Report',
    kind: 'Scanned examination report',
    lock: { type: 'keyword', minigame: 'text', prompt: 'Enter password.' },
  },
  {
    id: '06',
    number: '05',
    title: 'Purchase Records',
    kind: 'Scanned purchase record',
    lock: {
      type: 'numeric',
      minigame: 'magnifier',
      prompt: 'Enter access code.',
    },
  },
]

export const SUSPECTS: Suspect[] = [
  { id: 'mw', name: 'Margaret Wood', age: 64, occupation: 'Receptionist', ref: 'MW-24', background: 'Has worked as a receptionist at Premier Bank for 24 years.' },
  { id: 'nb', name: 'Noah Brown', age: 33, occupation: 'Day Security Guard', ref: 'NB-07', background: 'Day security guard for seven years; previously a cashier at Tesco.' },
  { id: 'aw', name: 'Arthur Wilson', age: 29, occupation: 'Night Security Guard', ref: 'AW-02', background: 'Primary night guard for the past two years; previously a police officer.' },
  { id: 'bm', name: 'Bryant Moreland', age: 35, occupation: 'Unemployed', background: 'Streams for occasional income. Recently rejected after an interview for a banking job.' },
  { id: 'ow', name: 'Olivia Walker', age: 40, occupation: 'Janitor', ref: 'OW-06', background: 'Joined a little over six months ago. Coworkers speak highly of her.' },
  { id: 'lj', name: 'Lily Johnson', age: 24, occupation: 'Bank Clerk', ref: 'LJ-01', background: 'Recent university graduate, three months at the bank, with a strong track record.' },
]

export const EMAILS: Email[] = [
  {
    id: 'e1',
    from: 'Independent appraisal office',
    to: 'Margaret Wood',
    sent: 'Day 0, 11:10AM',
    subject: 'ENIGMA - Aster Diamond inspection',
    body: [
      'Please confirm Appraisal Room B for tomorrow afternoon. We will inspect the exposed stone, record its identifying features, and sign the report before leaving. No transfer off bank premises is scheduled.',
    ],
  },
  {
    id: 'e2',
    from: 'Margaret Wood',
    to: 'Lily Johnson; Noah Brown',
    sent: 'Day 0, 11:24AM',
    subject: 'Re: ENIGMA - Aster Diamond inspection',
    body: [
      'Room B is booked. Lily, please coordinate the diamond and custody paperwork. Noah, please attend the inspection and escort the appraiser out afterward. I will handle reception and visitor documentation.',
    ],
  },
  {
    id: 'e3',
    from: 'Visitor desk',
    to: 'Noah Brown; Margaret Wood',
    sent: 'Day 1, 3:45PM',
    subject: 'Appraiser visitor-pass assignment',
    body: [
      'Visitor role: Independent appraiser.',
      'Assigned pass: AP-7316.',
      'Inspection location: Appraisal Room B.',
      'NOTE: Visitor departure requires an escort and completed reception checkout.',
      'The audit archive index uses the numeric part of this visitor-pass reference.',
    ],
  },
  {
    id: 'e4',
    from: 'Independent appraisal office',
    to: 'Lily Johnson',
    sent: 'Day 1, 4:37PM',
    subject: 'ENIGMA - examination complete',
    body: [
      "Examination complete. The genuine Aster Diamond is present in the open presentation case as of 4:37PM. Its recorded inclusion matches the owner's prior certification. Lily Johnson remained present during examination and witnessed the final check. The appraiser will now depart with Noah Brown.",
      'Please print the custody form before securing the case. Do not mistake the custody receipt for a second authenticity examination.',
    ],
  },
]

const CHATS = {
  bryant: {
    title: 'Bryant Moreland → friend · three days before Day 1',
    msgs: [
      { from: 'Bryant', text: "Premier turned me down again. They'll regret passing on me." },
      { from: 'Friend', text: 'What does that mean?' },
      { from: 'Bryant', text: "When my channel takes off, I'm keeping my money somewhere else." },
    ],
  },
  olivia: {
    title: 'Olivia Walker ↔ Supervisor · Day 1',
    msgs: [
      { from: 'Olivia', time: '4:52PM', text: "Still signing for the cleaning supplies. I'll do Room B's corridor after five." },
      { from: 'Supervisor', time: '4:52PM', text: "Fine. Don't enter the appraisal room until the valuables team clears it." },
    ],
  },
  lily: {
    title: 'Lily Johnson ↔ Noah Brown · Day 1',
    msgs: [
      { from: 'Lily', time: '4:40PM', text: "Printing the custody form. Margaret's nearby; asked her to watch the room." },
      { from: 'Noah', time: '4:46PM', text: 'Visitor checked out. Coming back now.' },
    ],
  },
}

export const MESSAGE_THREADS = [
  { id: 'lily', with: 'Lily Johnson & Noah Brown', ...CHATS.lily },
  { id: 'olivia', with: 'Olivia Walker & Supervisor', ...CHATS.olivia },
  { id: 'bryant', with: 'Bryant Moreland & Friend', ...CHATS.bryant },
]

export const OPEN_DOCS: Record<'01' | '02', FileDoc> = {
  '01': {
    id: '01',
    heading: 'Initial Incident Report',
    sub: ['Premier Bank | Case PB-062 | Preliminary investigation', 'All times are London local time. Day 1 is the appraisal day; Day 2 is the discovery day.'],
    blocks: [
      { t: 'h', text: 'Discovery' },
      {
        t: 'p',
        text: 'At 9:15AM on Day 2, an auction representative examining the Aster Diamond identified the stone in its presentation case as an imitation. Premier Bank was storing the privately owned diamond ahead of an auction. The case had been deposited in the vault at 4:48PM on Day 1. The vault showed no forced entry or overnight alarm. The diamond\'s small presentation case has no individual opening sensor. The substitution time has not yet been established. Investigators must consider handling before the case entered the vault as well as overnight access.',
      },
      { t: 'h', text: 'Handling procedure' },
      {
        t: 'p',
        text: 'An independent appraiser inspected the diamond in Appraisal Room B on Day 1. Lily Johnson coordinated the handling; day guard Noah Brown provided security and visitor escort. Policy PB-17 requires the exposed stone to remain under the direct supervision of an authorized handler. Reception staff are not authorized diamond handlers. Lily and Noah signed the 4:48PM vault custody receipt. This certifies that the closed case was secured; it is not an authenticity test. Arthur Wilson took over overnight security at 6:00PM.',
      },
      { t: 'h', text: 'People of interest' },
      {
        t: 'rows',
        rows: [
          { k: 'Margaret Wood', v: 'Receptionist · 24 years of service · MW-24' },
          { k: 'Noah Brown', v: 'Day security guard · 7 years of service · NB-07' },
          { k: 'Arthur Wilson', v: 'Night security guard · 2 years of service · AW-02' },
          { k: 'Bryant Moreland', v: 'Rejected bank applicant and occasional streamer. A hostile message prompted investigators to interview him.' },
          { k: 'Olivia Walker', v: 'Cleaner · 6 months of service · OW-06' },
          { k: 'Lily Johnson', v: 'Bank clerk · Recent grad, 3 months of service · LJ-01' },
        ],
      },
      { t: 'note', text: 'Staff were selected because of their access or handling roles, not because suspicion establishes guilt.' },
      { t: 'h', text: 'Evidence archive' },
      { t: 'p', text: 'Three additional records are indexed in the investigation portal. Retrieve the supplementary records using the references below.' },
      {
        t: 'rows',
        rows: [
          { k: 'Access and Activity Audit', v: "Enter access code." },
          { k: 'Gem Examination Report', v: 'Enter password.' },
          { k: 'Supplementary Purchase Records', v: 'Enter access code. The mark is documented in the detailed gem report.' },
        ],
      },
    ],
  },
  '02': {
    id: '02',
    heading: 'Interviews and Message Extracts',
    sub: ['Case PB-062 · Statements collected on Day 2', 'These accounts are unverified unless supported by another record.'],
    blocks: [
      {
        t: 'statement',
        who: 'Margaret Wood',
        role: 'Receptionist',
        lines: [
          "I stayed at reception all afternoon. I never went into Appraisal Room B. I knew about the appointment because I arranged the visitor paperwork, but I don't handle valuables. After twenty-four years here, I'd hope people know they can trust me.",
        ],
      },
      {
        t: 'statement',
        who: 'Noah Brown',
        role: 'Day Security Guard',
        lines: [
          "The appraisal finished shortly before 4:38PM. I escorted the appraiser to reception and checked him out. A mismatch in the visitor paperwork kept us there until 4:46PM. Lily was responsible for the diamond while I escorted him. When I returned, the stone was in its case. We closed and sealed the case and took it to the vault. I didn't conduct another gem test.",
        ],
      },
      {
        t: 'statement',
        who: 'Arthur Wilson',
        role: 'Night Security Guard',
        lines: [
          'My shift began at 6PM. The case was already locked away when I arrived. I completed my scheduled patrols and recorded no overnight vault opening. Before work, I was on a bus across town. Check the records rather than assuming the night guard took it!',
        ],
      },
      {
        t: 'statement',
        who: 'Bryant Moreland',
        role: 'Rejected applicant',
        lines: ["I was angry about the rejection, but I didn't go to the bank that day. I was livestreaming at home all afternoon."],
      },
      { t: 'chat', ...CHATS.bryant },
      { t: 'note', text: 'The message supplied a reason to interview Bryant.' },
      {
        t: 'statement',
        who: 'Olivia Walker',
        role: 'Cleaner',
        lines: ['I was at the loading bay with the supply delivery until 5:00PM. I cleaned the appraisal corridor later. I never handled the diamond.'],
      },
      { t: 'chat', ...CHATS.olivia },
      {
        t: 'statement',
        who: 'Lily Johnson',
        role: 'Bank Clerk',
        lines: [
          "I was with the appraiser while he examined the stone. After Noah escorted him out, I needed to print the custody form. I left at 4:40PM and got back at 4:44PM. Margaret was the only colleague nearby, so I asked her to keep an eye on the room. I didn't see whether she went inside. She's been here longer than I've been alive; I trusted her. She'd never do anything close to this.",
          "I know reception staff aren't authorized handlers. I should have waited for Noah. When I returned, the stone looked the same. I closed the case and we secured it once Noah came back.",
        ],
      },
      { t: 'chat', ...CHATS.lily },
    ],
  },

}

import mw from '../assets/suspects/mw.webp'
import nb from '../assets/suspects/nb.webp'
import aw from '../assets/suspects/aw.webp'
import bm from '../assets/suspects/bm.webp'
import ow from '../assets/suspects/ow.webp'
import lj from '../assets/suspects/lj.webp'

export const SUSPECT_PHOTOS: Record<string, string> = { mw, nb, aw, bm, ow, lj }
