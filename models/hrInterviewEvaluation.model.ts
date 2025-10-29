import mongoose, { Schema, Document } from "mongoose";

export interface HRInterviewEvaluation extends Document {
  candidateId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId | null;
  assessmentId?: mongoose.Types.ObjectId | null;
  hrInterviewId: mongoose.Types.ObjectId;

  // Timeline
  startedAt: Date;
  endedAt?: Date;

  // Media/transcripts
  transcriptUrl?: string;
  audioUrl?: string;
  videoUrl?: string;

  // AI outputs
  aiSummary?: string;
  // NEW: Master Q1 questions array (basic data only, generated at start)
  q1Questions: {
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
  }[];
  // Track which chunks have been preprocessed (to avoid re-preprocessing on resume)
  preprocessedChunks: number[];

  // Asked questions array (detailed schema, grows during interview)
  // Contains Q1 questions after preprocessing + Q2 follow-ups + Q3 mood-triggered
  askedQuestions: {
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
    queueType: 'Q1' | 'Q2' | 'Q3';
    parentQuestionId?: string;
    askedAt?: Date;
    preprocessed: boolean;
    answer?: string;
    source_urls?: string[];
    audioUrl?: string;
    userAnswer?: string;
    evaluation?: {
      correctness: number;
      reason?: string;
      route_action?: string;
    };
  }[];
  aiScores?: { key: string; score: number }[];
  overallScore?: number;
  verdict?: 'strong-pass' | 'pass' | 'borderline' | 'no-hire';

  // Observations
  notes?: { authorId?: mongoose.Types.ObjectId; text: string; createdAt: Date }[];
  flags?: { type: string; severity: 'low' | 'medium' | 'high'; message: string; createdAt: Date }[];

  // Status tracking
  status: 'not_started' | 'in_progress' | 'completed';

  createdAt: Date;
  updatedAt: Date;
}

const HRInterviewEvaluationSchema: Schema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: 'candidate', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'jobopportunity' },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'assessment' },
  hrInterviewId: { type: Schema.Types.ObjectId, ref: 'hrinterview', required: true },

  startedAt: { type: Date, required: true },
  endedAt: { type: Date },

  transcriptUrl: { type: String },
  audioUrl: { type: String },
  videoUrl: { type: String },

  // Master Q1 questions array (basic data only)
  q1Questions: {
    type: [{
      id: { type: String, required: true },
      question: { type: String, required: true },
      category: { type: String, enum: ['technical', 'non-technical'], required: true },
      difficulty: { type: String },
    }],
    default: [],
    required: true
  },

  // Track preprocessed chunks
  preprocessedChunks: {
    type: [{ type: Number }],
    default: [],
    required: true
  },

  // Asked questions array (detailed schema)
  askedQuestions: {
    type: [{
      id: { type: String, required: true },
      question: { type: String, required: true },
      category: { type: String, enum: ['technical', 'non-technical'], required: true },
      difficulty: { type: String },
      queueType: { type: String, enum: ['Q1', 'Q2', 'Q3'], required: true },
      parentQuestionId: { type: String },
      askedAt: { type: Date },
      preprocessed: { type: Boolean, default: false },
      answer: { type: String },
      source_urls: [{ type: String }],
      audioUrl: { type: String },
      userAnswer: { type: String },
      evaluation: {
        correctness: { type: Number, min: 0, max: 100 },
        reason: { type: String },
        route_action: { type: String }
      }
    }],
    default: [],
    required: true
  },

  aiSummary: { type: String, maxlength: 20000 },
  aiScores: [{ key: { type: String }, score: { type: Number, min: 0, max: 100 } }],
  overallScore: { type: Number, min: 0, max: 100 },
  verdict: { type: String, enum: ['strong-pass', 'pass', 'borderline', 'no-hire'] },

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

  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' }
}, { timestamps: true });

HRInterviewEvaluationSchema.index({ candidateId: 1, hrInterviewId: 1 });
HRInterviewEvaluationSchema.index({ assessmentId: 1, startedAt: -1 });
HRInterviewEvaluationSchema.index({ jobId: 1 });

const HRInterviewEvaluationModel = (mongoose.models.hrinterviewevaluation as mongoose.Model<HRInterviewEvaluation>) ||
  mongoose.model<HRInterviewEvaluation>('hrinterviewevaluation', HRInterviewEvaluationSchema);

export default HRInterviewEvaluationModel;


