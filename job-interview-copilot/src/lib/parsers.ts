import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// Let Vite resolve the worker asset URL at build/dev time
// The `?url` import returns a URL string that pdf.js can fetch
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import type { ResumeData } from '../stores/resume';

GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

export async function parsePdf(file: File): Promise<ResumeData> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return extractResumeData(text);
}

export async function parseDocx(file: File): Promise<ResumeData> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return extractResumeData(value);
}

export function extractResumeData(rawText: string): ResumeData {
  const text = rawText.replace(/\s+/g, ' ').trim();

  const skillsMatch = /skills[:\-]?\s*(.+?)(education|experience|projects|work|$)/i.exec(text);
  const skills = skillsMatch ? skillsMatch[1].split(/[,;•\|]/).map((s) => s.trim()).filter(Boolean) : [];

  const experience: ResumeData['experience'] = [];
  const expRegex = /(at|@)\s*([A-Z][A-Za-z0-9& .-]+)\s*(?:as|\-|\–)?\s*([A-Za-z][A-Za-z0-9 &().\/-]+)?\s*(\d{4}\s*[–-]\s*(?:Present|\d{4}))?/g;
  let m: RegExpExecArray | null;
  while ((m = expRegex.exec(text))) {
    experience.push({ company: m[2]?.trim() || '', role: m[3]?.trim() || '', duration: m[4]?.trim() });
  }

  const education: ResumeData['education'] = [];
  const eduRegex = /(B\.?Sc\.?|B\.?Tech\.?|M\.?Sc\.?|M\.?Tech\.?|Bachelor|Master|Ph\.?D\.?)\s*[,\- ]\s*([A-Za-z &.-]+)\s*(?:at|from)?\s*([A-Z][A-Za-z0-9 &.-]+)?\s*(\d{4})?/gi;
  let e: RegExpExecArray | null;
  while ((e = eduRegex.exec(text))) {
    education.push({ degree: e[1]?.trim(), institution: (e[3] || e[2] || '').trim(), year: e[4] });
  }

  return { rawText: text, skills, experience, education };
}


