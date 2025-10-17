import mongoose, { Schema, Document } from "mongoose";

export interface TechnicalInterviewEvaluation extends Document {
  candidateId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId | null;
  assessmentId?: mongoose.Types.ObjectId | null;
  technicalInterviewId: mongoose.Types.ObjectId;

  // Timeline
  startedAt: Date;
  endedAt?: Date;

  // Media/transcripts
  transcriptUrl?: string;
  audioUrl?: string;
  videoUrl?: string;

  // QA entries captured during interview
  entries?: {
    question: string;
    correctAnswer?: string;
    userAnswer: string;
    correctness?: number; // 0-100
    askedAt: Date;
    // New fields for queue architecture
    question_text?: string; // Alias for question
    user_answer?: string; // Alias for userAnswer
    ideal_answer?: string; // Alias for correctAnswer
    correctness_score?: number; // Alias for correctness
    source_urls?: string[];
    question_type?: 'technical' | 'non-technical' | 'followup' | 'mood-triggered';
    queue_number?: 0 | 1 | 2 | 3;
    timestamp?: Date; // Alias for askedAt
    // Queue 0 specific fields
    mood_state?: string;
    violation_snapshot?: {
      violation_count: number;
      current_violations: string[];
    };
  }[];

  // AI outputs
  aiSummary?: string;
  aiScores?: { key: string; score: number }[]; // map to rubric categories
  overallScore?: number; // 0-100
  verdict?: 'pass' | 'borderline' | 'fail';

  // Observations
  notes?: { authorId?: mongoose.Types.ObjectId; text: string; createdAt: Date }[];
  flags?: { type: string; severity: 'low' | 'medium' | 'high'; message: string; createdAt: Date }[];

  // Runtime diagnostics
  diagnostics?: {
    averageLatencyMs?: number;
    disconnects?: number;
    bitrateKbps?: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const TechnicalInterviewEvaluationSchema: Schema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: 'candidate', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'jobopportunity' },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'assessment' },
  technicalInterviewId: { type: Schema.Types.ObjectId, ref: 'technicalinterview', required: true },

  startedAt: { type: Date, required: true },
  endedAt: { type: Date },

  transcriptUrl: { type: String },
  audioUrl: { type: String },
  videoUrl: { type: String },

  entries: [{
    question: { type: String, required: true },
    correctAnswer: { type: String },
    userAnswer: { type: String, required: true },
    correctness: { type: Number, min: 0, max: 100 },
    askedAt: { type: Date, default: Date.now },
    // New fields for queue architecture
    question_text: { type: String },
    user_answer: { type: String },
    ideal_answer: { type: String },
    correctness_score: { type: Number, min: 0, max: 100 },
    source_urls: [{ type: String }],
    question_type: { type: String, enum: ['technical', 'non-technical', 'followup', 'mood-triggered'] },
    queue_number: { type: Number, enum: [0, 1, 2, 3] },
    timestamp: { type: Date },
    // Queue 0 specific fields
    mood_state: { type: String },
    violation_snapshot: {
      violation_count: { type: Number, min: 0 },
      current_violations: [{ type: String }]
    }
  }],

  aiSummary: { type: String, maxlength: 20000 },
  aiScores: [{ key: { type: String }, score: { type: Number, min: 0, max: 100 } }],
  overallScore: { type: Number, min: 0, max: 100 },
  verdict: { type: String, enum: ['pass', 'borderline', 'fail'] },

  notes: [{
    authorId: { type: Schema.Types.ObjectId, ref: 'employer' },
    text: { type: String, maxlength: 10000 },
    createdAt: { type: Date, default: Date.now }
  }],
  flags: [{
    type: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  diagnostics: {
    averageLatencyMs: { type: Number, min: 0 },
    disconnects: { type: Number, min: 0 },
    bitrateKbps: { type: Number, min: 0 }
  }
}, { timestamps: true });

TechnicalInterviewEvaluationSchema.index({ candidateId: 1, technicalInterviewId: 1 });
TechnicalInterviewEvaluationSchema.index({ assessmentId: 1, startedAt: -1 });
TechnicalInterviewEvaluationSchema.index({ jobId: 1 });

const TechnicalInterviewEvaluationModel = (mongoose.models.technicalinterviewevaluation as mongoose.Model<TechnicalInterviewEvaluation>) ||
  mongoose.model<TechnicalInterviewEvaluation>('technicalinterviewevaluation', TechnicalInterviewEvaluationSchema);

export default TechnicalInterviewEvaluationModel;


