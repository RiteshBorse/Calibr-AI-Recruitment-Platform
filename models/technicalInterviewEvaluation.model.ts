import mongoose, { Schema, Document } from "mongoose";

export interface TechnicalInterviewEvaluation extends Document {
  candidateId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId | null;
  assessmentId?: mongoose.Types.ObjectId | null;
  technicalInterviewId: mongoose.Types.ObjectId;

  // Status tracking
  status: 'in_progress' | 'completed';
  
  // Timeline
  startedAt: Date;
  endedAt?: Date;

  // Media/transcripts
  transcriptUrl?: string;
  audioUrl?: string;
  videoUrl?: string;

  // Video processing logs (Queue 0)
  videoLogs: {
    timestamp: Date;
    mood?: string;
    gesture?: string;
    objects?: string[];
    violationType?: string;
  }[];

  // NEW: Master Q1 questions array (basic data only, generated at start)
  // Used for dynamic chunking: chunk = Math.floor(index / 5)
  q1Questions: {
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
  }[];
  
  // Track which chunks have been preprocessed (to avoid re-preprocessing on resume)
  preprocessedChunks: number[];

  // NEW: Asked questions array (detailed schema, grows during interview)
  // Contains Q1 questions after preprocessing + Q2 follow-ups + Q3 mood-triggered
  askedQuestions: {
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
    queueType: 'Q1' | 'Q2' | 'Q3';  // Which queue this question belongs to
    parentQuestionId?: string;  // For Q2/Q3, links back to parent Q1
    askedAt?: Date;  // Timestamp for ordering (set when audio playback starts)
    preprocessed: boolean;  // Has preprocessing completed? (for non-technical: no answer/sources needed)
    
    // Preprocessing data (filled during chunk preprocessing)
    answer?: string;  // Ideal/correct answer (only for technical questions)
    source_urls?: string[];  // Source URLs (only for technical questions)
    audioUrl?: string;  // TTS audio URL from S3
    
    // User response data (filled after candidate answers)
    userAnswer?: string;  // Candidate's answer
    
    // Evaluation data (filled after AI analysis) - comprehensive evaluation result
    evaluation?: {
      correctness: number;  // 0-100 score
      reason: string;  // Explanation of scoring
      route_action: 'next_difficulty' | 'normal_flow' | 'followup';  // Next action (next_difficulty ≥50%, normal_flow 20-50%, followup <20%)
    };
  }[];

  // AI outputs
  aiSummary?: string;
  overallScore?: number; // 0-100
  verdict?: 'pass' | 'borderline' | 'fail';

  // Observations
  notes?: { authorId?: mongoose.Types.ObjectId; text: string; createdAt: Date }[];
  flags?: { type: string; severity: 'low' | 'medium' | 'high'; message: string; createdAt: Date }[];

  createdAt: Date;
  updatedAt: Date;
}

const TechnicalInterviewEvaluationSchema: Schema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: 'candidate', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'jobopportunity' },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'assessment' },
  technicalInterviewId: { type: Schema.Types.ObjectId, ref: 'technicalinterview', required: true },

  status: { 
    type: String, 
    enum: ['in_progress', 'completed'], 
    default: 'in_progress',
    required: true 
  },

  startedAt: { type: Date, required: true },
  endedAt: { type: Date },

  transcriptUrl: { type: String },
  audioUrl: { type: String },
  videoUrl: { type: String },

  // Video processing logs (Queue 0)
  videoLogs: {
    type: [{
      timestamp: { type: Date, required: true },
      mood: { type: String },
      gesture: { type: String },
      objects: [{ type: String }],
      violationType: { type: String },
    }],
    default: [],
    required: true
  },

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
  
  // Track preprocessed chunks (updated after each chunk completes)
  preprocessedChunks: {
    type: [{ type: Number }],
    default: [],
    required: true
  },

  // Asked questions array (detailed schema with preprocessing data)
  askedQuestions: {
    type: [{
      id: { type: String, required: true },
      question: { type: String, required: true },
      category: { type: String, enum: ['technical', 'non-technical'], required: true },
      difficulty: { type: String },
      queueType: { type: String, enum: ['Q1', 'Q2', 'Q3'], required: true },
      parentQuestionId: { type: String },  // Links Q2/Q3 to parent Q1
      askedAt: { type: Date },  // Optional - only set when audio playback starts
      preprocessed: { type: Boolean, default: false },
      
      // Preprocessing data
      answer: { type: String },  // Ideal answer
      source_urls: [{ type: String }],
      audioUrl: { type: String },  // S3 URL
      
      // User response data
      userAnswer: { type: String },
      
      // Evaluation data (comprehensive evaluation result)
      evaluation: {
        correctness: { type: Number, min: 0, max: 100 },
        reason: { type: String },
        route_action: { type: String, enum: ['next_difficulty', 'normal_flow', 'followup'] },
      },
    }],
    default: [],
    required: true
  },

  aiSummary: { type: String, maxlength: 20000 },
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
}, { timestamps: true });

TechnicalInterviewEvaluationSchema.index({ candidateId: 1, technicalInterviewId: 1 });
TechnicalInterviewEvaluationSchema.index({ assessmentId: 1, startedAt: -1 });
TechnicalInterviewEvaluationSchema.index({ jobId: 1 });

const TechnicalInterviewEvaluationModel = (mongoose.models.technicalinterviewevaluation as mongoose.Model<TechnicalInterviewEvaluation>) ||
  mongoose.model<TechnicalInterviewEvaluation>('technicalinterviewevaluation', TechnicalInterviewEvaluationSchema);

export default TechnicalInterviewEvaluationModel;


