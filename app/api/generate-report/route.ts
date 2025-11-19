import { NextRequest, NextResponse } from 'next/server';
import { fetchCandidateEvaluationData } from '@/app/dashboard/employer/actions/report-generation-actions';
import { generateCandidateEvaluationPDF } from '@/utils/pdf-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, jobId } = body;

    if (!candidateId || !jobId) {
      return NextResponse.json(
        { error: 'candidateId and jobId are required' },
        { status: 400 }
      );
    }

    // Fetch candidate evaluation data
    const response = await fetchCandidateEvaluationData(candidateId, jobId);

    if (!response.success || !response.data) {
      return NextResponse.json(
        { error: response.message || 'Failed to fetch evaluation data' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdf = generateCandidateEvaluationPDF(response.data);
    const pdfBuffer = pdf.output('arraybuffer');

    // Create filename
    const candidateName = response.data.candidate.name.replace(/\s+/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${candidateName}_Evaluation_Report_${date}.pdf`;

    // Return PDF as blob
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
