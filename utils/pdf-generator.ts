import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CandidateReportData } from '../app/dashboard/employer/actions/report-generation-actions';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export function generateCandidateEvaluationPDF(data: CandidateReportData): jsPDF {
  const doc = new jsPDF();
  
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;

  // Helper function to add a new page if needed
  const checkAddPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Evaluation Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Generated date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  doc.setTextColor(0, 0, 0);

  // Section 1: Candidate Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Information', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Field', 'Value']],
    body: [
      ['Name', data.candidate.name],
      ['Email', data.candidate.email],
      ['Candidate ID', data.candidate.id]
    ],
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;
  checkAddPage();

  // Section 2: Job Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Information', margin, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Field', 'Value']],
    body: [
      ['Job Title', data.job.title],
      ['Position', data.job.position],
      ['Department', data.job.department],
      ...(data.job.company ? [['Company', data.job.company]] : [])
    ],
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;
  checkAddPage();

  // Section 3: Application Status
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Application Status', margin, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Round', 'Status']],
    body: [
      ['Application Date', new Date(data.application.applicationDate).toLocaleDateString()],
      ['Overall Status', data.application.status.toUpperCase()],
      ['Aptitude Round', data.application.rounds.aptitude.toUpperCase()],
      ['Coding Round', data.application.rounds.coding.toUpperCase()],
      ['Technical Interview', data.application.rounds.technicalInterview.toUpperCase()],
      ['HR Interview', data.application.rounds.hrInterview.toUpperCase()]
    ],
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;
  checkAddPage(40);

  // Section 4: Aptitude Evaluation
  if (data.aptitudeEvaluation) {
    const apt = data.aptitudeEvaluation;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Aptitude Evaluation', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Score', `${apt.score}/${apt.totalQuestions}`],
        ['Percentage', `${apt.percentage.toFixed(2)}%`],
        ['Passing Score', `${apt.passingScore}%`],
        ['Result', apt.passed ? 'PASSED' : 'FAILED'],
        ['Correct Answers', apt.correctCount.toString()],
        ['Incorrect Answers', apt.incorrectCount.toString()],
        ['Unattempted', apt.unattemptedCount.toString()],
        ['Time Taken', `${Math.floor(apt.timeTaken / 60)} min ${apt.timeTaken % 60} sec`],
        ['Status', apt.status.toUpperCase()],
        ['Submitted At', new Date(apt.submittedAt).toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
    checkAddPage(30);

    // Question-by-question breakdown
    if (apt.questionDetails && apt.questionDetails.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Question-by-Question Analysis', margin, yPosition);
      yPosition += 6;

      // Group questions by result
      const answeredQuestions = apt.questionDetails.filter(q => q.userAnswer !== undefined && q.userAnswer !== null);
      const unansweredQuestions = apt.questionDetails.filter(q => q.userAnswer === undefined || q.userAnswer === null);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      autoTable(doc, {
        startY: yPosition,
        head: [['Question ID', 'User Answer', 'Status']],
        body: apt.questionDetails.map(q => [
          `Q${q.questionId}`,
          q.userAnswer !== undefined && q.userAnswer !== null ? `Option ${q.userAnswer + 1}` : 'Not Answered',
          q.userAnswer !== undefined && q.userAnswer !== null ? 
            (apt.correctCount > 0 ? 'Answered' : 'Answered') : 'Unattempted'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        pageBreak: 'auto',
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;
      checkAddPage(30);
    }

    // Warning details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Warning Summary', margin, yPosition);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Warning Type', 'Count', 'Max Allowed', 'Exceeded']],
      body: [
        ['Tab Switch', apt.warnings.tabSwitch.count.toString(), apt.warnings.tabSwitch.maxAllowed.toString(), apt.warnings.tabSwitch.exceeded ? 'YES' : 'NO'],
        ['Fullscreen Exit', apt.warnings.fullscreen.count.toString(), apt.warnings.fullscreen.maxAllowed.toString(), apt.warnings.fullscreen.exceeded ? 'YES' : 'NO'],
        ['Audio Detection', apt.warnings.audio.count.toString(), apt.warnings.audio.maxAllowed.toString(), apt.warnings.audio.exceeded ? 'YES' : 'NO']
      ],
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    if (apt.terminatedDueToWarnings) {
      yPosition = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`⚠ Assessment terminated: ${apt.terminationReason || 'Excessive warnings'}`, margin, yPosition);
      doc.setTextColor(0, 0, 0);
    }

    yPosition = (doc as any).lastAutoTable.finalY + 15;
    checkAddPage(40);
  }

  // Section 5: Coding Evaluation
  if (data.codingEvaluation) {
    const coding = data.codingEvaluation;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Coding Evaluation', margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Programming Language', coding.language],
        ['Total Problems', coding.totalProblems.toString()],
        ['Problems Solved', coding.solvedProblems.toString()],
        ['Problems Attempted', coding.attemptedProblems.toString()],
        ['Submission Status', coding.isSubmitted ? 'SUBMITTED' : 'NOT SUBMITTED'],
        ['Time Remaining', `${Math.floor(coding.timeLeft / 60)} min ${coding.timeLeft % 60} sec`],
        ['Started At', new Date(coding.createdAt).toLocaleString()],
        ['Last Updated', new Date(coding.updatedAt).toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
    checkAddPage(30);

    if (coding.codeSubmissions.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Code Submissions Summary', margin, yPosition);
      yPosition += 6;

      autoTable(doc, {
        startY: yPosition,
        head: [['Problem ID', 'Language', 'Submitted At', 'Result']],
        body: coding.codeSubmissions.map(sub => [
          `Problem ${sub.problemId}`,
          sub.language,
          new Date(sub.timestamp).toLocaleString(),
          sub.passed ? 'PASSED' : 'FAILED'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
      checkAddPage(40);

      // Detailed code submissions
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Submitted Code Details', margin, yPosition);
      yPosition += 8;

      coding.codeSubmissions.forEach((sub, index) => {
        checkAddPage(50);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Problem ${sub.problemId} - ${sub.language}`, margin, yPosition);
        yPosition += 5;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Submitted: ${new Date(sub.timestamp).toLocaleString()} | Result: ${sub.passed ? 'PASSED' : 'FAILED'}`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 6;

        // Add code in a box
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(200, 200, 200);
        
        const codeLines = sub.code.split('\n');
        const maxCodeLines = 30; // Limit lines to prevent overflow
        const displayCode = codeLines.slice(0, maxCodeLines).join('\n');
        const codeTruncated = codeLines.length > maxCodeLines;
        
        const codeTextLines = doc.splitTextToSize(displayCode, contentWidth - 10);
        const codeBoxHeight = Math.min(codeTextLines.length * 4 + 6, 120);
        
        checkAddPage(codeBoxHeight + 10);
        
        doc.rect(margin, yPosition, contentWidth, codeBoxHeight, 'FD');
        
        doc.setFontSize(8);
        doc.setFont('courier', 'normal');
        let codeY = yPosition + 4;
        codeTextLines.slice(0, 25).forEach((line: string) => {
          if (codeY < yPosition + codeBoxHeight - 2) {
            doc.text(line, margin + 3, codeY);
            codeY += 4;
          }
        });

        if (codeTruncated) {
          doc.setFont('helvetica', 'italic');
          doc.text('... (code truncated)', margin + 3, codeY);
        }

        doc.setFont('helvetica', 'normal');
        yPosition += codeBoxHeight + 8;

        if (sub.results) {
          checkAddPage(15);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Test Results:', margin, yPosition);
          yPosition += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          const resultText = typeof sub.results === 'string' ? sub.results : JSON.stringify(sub.results, null, 2);
          const resultLines = doc.splitTextToSize(resultText, contentWidth - 10);
          resultLines.slice(0, 5).forEach((line: string) => {
            checkAddPage(4);
            doc.text(line, margin + 3, yPosition);
            yPosition += 4;
          });
          yPosition += 4;
        }

        yPosition += 5;
      });

      yPosition += 5;
      checkAddPage(40);
    }
  }

  // Section 6: Technical Interview Evaluation
  if (data.technicalInterviewEvaluation) {
    const tech = data.technicalInterviewEvaluation;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Interview Evaluation', margin, yPosition);
    yPosition += 8;

    const techBody: any[] = [
      ['Status', tech.status.toUpperCase()],
      ['Started At', new Date(tech.startedAt).toLocaleString()],
      ...(tech.endedAt ? [['Ended At', new Date(tech.endedAt).toLocaleString()]] : []),
      ['Total Questions Asked', tech.totalQuestions.toString()],
      ...(tech.overallScore !== undefined ? [['Overall Score', `${tech.overallScore}/100`]] : []),
      ...(tech.verdict ? [['Verdict', tech.verdict.toUpperCase()]] : [])
    ];

    if (tech.videoLogs) {
      techBody.push(['Video Logs', `${tech.videoLogs.totalLogs} logs (${tech.videoLogs.violations} violations)`]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: techBody,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
    checkAddPage(30);

    // AI Summary
    if (tech.aiSummary) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Summary', margin, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(tech.aiSummary, contentWidth);
      summaryLines.forEach((line: string) => {
        checkAddPage(6);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // Questions asked
    if (tech.askedQuestions.length > 0) {
      checkAddPage(30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Questions & Responses', margin, yPosition);
      yPosition += 6;

      tech.askedQuestions.forEach((q, index) => {
        checkAddPage(35);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(`Question ${index + 1}`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        // Question metadata
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Category: ${q.category} | Type: ${q.queueType}${q.difficulty ? ' | Difficulty: ' + q.difficulty : ''}`, margin + 3, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        // Question text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Q: ', margin + 3, yPosition);
        doc.setFont('helvetica', 'normal');
        const questionLines = doc.splitTextToSize(q.question, contentWidth - 10);
        let firstLine = true;
        questionLines.forEach((line: string) => {
          checkAddPage(5);
          if (firstLine) {
            doc.text(line, margin + 10, yPosition);
            firstLine = false;
          } else {
            doc.text(line, margin + 3, yPosition);
          }
          yPosition += 4;
        });
        yPosition += 2;

        // Candidate's answer
        if (q.userAnswer) {
          checkAddPage(15);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94);
          doc.text('A: ', margin + 3, yPosition);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          const answerLines = doc.splitTextToSize(q.userAnswer, contentWidth - 10);
          firstLine = true;
          answerLines.forEach((line: string) => {
            checkAddPage(5);
            if (firstLine) {
              doc.text(line, margin + 10, yPosition);
              firstLine = false;
            } else {
              doc.text(line, margin + 3, yPosition);
            }
            yPosition += 4;
          });
          yPosition += 3;
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('No answer provided', margin + 3, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 5;
        }

        // Evaluation
        if (q.evaluation) {
          checkAddPage(12);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          const scoreColor = q.evaluation.correctness >= 70 ? [34, 197, 94] : 
                           q.evaluation.correctness >= 40 ? [234, 179, 8] : [239, 68, 68];
          doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
          doc.text(`Score: ${q.evaluation.correctness}/100`, margin + 3, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 5;

          if (q.evaluation.reason) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const reasonLines = doc.splitTextToSize(`Evaluation: ${q.evaluation.reason}`, contentWidth - 10);
            reasonLines.forEach((line: string) => {
              checkAddPage(4);
              doc.text(line, margin + 3, yPosition);
              yPosition += 4;
            });
            doc.setTextColor(0, 0, 0);
          }
          yPosition += 3;
        }

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    checkAddPage(40);
  }

  // Section 7: HR Interview Evaluation
  if (data.hrInterviewEvaluation) {
    const hr = data.hrInterviewEvaluation;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HR Interview Evaluation', margin, yPosition);
    yPosition += 8;

    const hrBody: any[] = [
      ['Status', hr.status.toUpperCase()],
      ['Started At', new Date(hr.startedAt).toLocaleString()],
      ...(hr.endedAt ? [['Ended At', new Date(hr.endedAt).toLocaleString()]] : []),
      ['Total Questions Asked', hr.totalQuestions.toString()],
      ...(hr.overallScore !== undefined ? [['Overall Score', `${hr.overallScore}/100`]] : []),
      ...(hr.verdict ? [['Verdict', hr.verdict.toUpperCase()]] : [])
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: hrBody,
      theme: 'grid',
      headStyles: { fillColor: [236, 72, 153], textColor: 255 },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
    checkAddPage(30);

    // AI Scores
    if (hr.aiScores && hr.aiScores.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Assessment Scores', margin, yPosition);
      yPosition += 6;

      autoTable(doc, {
        startY: yPosition,
        head: [['Category', 'Score']],
        body: hr.aiScores.map(score => [score.key, `${score.score}/100`]),
        theme: 'striped',
        headStyles: { fillColor: [236, 72, 153], textColor: 255 },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // AI Summary
    if (hr.aiSummary) {
      checkAddPage(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Summary', margin, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(hr.aiSummary, contentWidth);
      summaryLines.forEach((line: string) => {
        checkAddPage(6);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // Questions asked
    if (hr.askedQuestions.length > 0) {
      checkAddPage(30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Questions & Responses', margin, yPosition);
      yPosition += 6;

      hr.askedQuestions.forEach((q, index) => {
        checkAddPage(35);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(236, 72, 153);
        doc.text(`Question ${index + 1}`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        // Question metadata
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Category: ${q.category} | Type: ${q.queueType}${q.difficulty ? ' | Difficulty: ' + q.difficulty : ''}`, margin + 3, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 5;

        // Question text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Q: ', margin + 3, yPosition);
        doc.setFont('helvetica', 'normal');
        const questionLines = doc.splitTextToSize(q.question, contentWidth - 10);
        let firstLine = true;
        questionLines.forEach((line: string) => {
          checkAddPage(5);
          if (firstLine) {
            doc.text(line, margin + 10, yPosition);
            firstLine = false;
          } else {
            doc.text(line, margin + 3, yPosition);
          }
          yPosition += 4;
        });
        yPosition += 2;

        // Candidate's answer
        if (q.userAnswer) {
          checkAddPage(15);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94);
          doc.text('A: ', margin + 3, yPosition);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          const answerLines = doc.splitTextToSize(q.userAnswer, contentWidth - 10);
          firstLine = true;
          answerLines.forEach((line: string) => {
            checkAddPage(5);
            if (firstLine) {
              doc.text(line, margin + 10, yPosition);
              firstLine = false;
            } else {
              doc.text(line, margin + 3, yPosition);
            }
            yPosition += 4;
          });
          yPosition += 3;
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('No answer provided', margin + 3, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 5;
        }

        // Evaluation
        if (q.evaluation) {
          checkAddPage(12);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          const scoreColor = q.evaluation.correctness >= 70 ? [34, 197, 94] : 
                           q.evaluation.correctness >= 40 ? [234, 179, 8] : [239, 68, 68];
          doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
          doc.text(`Score: ${q.evaluation.correctness}/100`, margin + 3, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 5;

          if (q.evaluation.reason) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const reasonLines = doc.splitTextToSize(`Evaluation: ${q.evaluation.reason}`, contentWidth - 10);
            reasonLines.forEach((line: string) => {
              checkAddPage(4);
              doc.text(line, margin + 3, yPosition);
              yPosition += 4;
            });
            doc.setTextColor(0, 0, 0);
          }
          yPosition += 3;
        }

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      });
    }
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} - Confidential Document`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
}
