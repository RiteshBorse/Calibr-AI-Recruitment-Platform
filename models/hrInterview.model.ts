import mongoose, { Schema, Document } from "mongoose";

export interface HRInterview extends Document {
  // Candidate management (matching technical interview)
  candidateIds: mongoose.Types.ObjectId[]; // authorized candidates
  
  // Core configuration
  duration: number; // minutes
  mode: 'live' | 'async';
  language: string; // e.g., en-US
  difficulty: 'junior' | 'mid' | 'senior';
  focusAreas: string[]; // e.g., communication, leadership
  aiPrompt?: string; // seed instruction for AI interviewer
  recordingEnabled: boolean;
  consentRequired: boolean;

  // Conversation and pacing controls
  questionStyle: 'structured' | 'conversational';
  initialWarmupMinutes?: number;
  maxSilenceSeconds?: number;
  allowInterruptions: boolean;

  // Rubric configuration
  rubric: {
    passThreshold?: number; // 0-100
    categories: { key: string; label: string; weight: number }[]; // weight 0-100
  };

  // Scheduling
  scheduledDate?: Date;
  startTime?: string; // HH:MM 24h
  endTime?: string;   // HH:MM 24h

  // Optional linkage; evaluations are tracked in separate collections
  assessmentId: mongoose.Types.ObjectId | null;

  status: 'inactive' | 'active' | 'completed';
}

export const HRInterviewSchema: Schema = new Schema({
  candidateIds: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'candidates',
    default: [] 
  }],
  
  duration: { type: Number, min: 15, max: 240, required: true },
  mode: { type: String, enum: ['live', 'async'], default: 'live' },
  language: { type: String, default: 'en-US' },
  difficulty: { type: String, enum: ['junior', 'mid', 'senior'], default: 'mid' },
  focusAreas: [{ type: String, trim: true }],
  aiPrompt: { type: String, trim: true, maxlength: 4000 },
  recordingEnabled: { type: Boolean, default: true },
  consentRequired: { type: Boolean, default: true },
  questionStyle: { type: String, enum: ['structured', 'conversational'], default: 'structured' },
  initialWarmupMinutes: { type: Number, min: 0, max: 30, default: 0 },
  maxSilenceSeconds: { type: Number, min: 5, max: 120, default: 20 },
  allowInterruptions: { type: Boolean, default: true },
  rubric: {
    passThreshold: { type: Number, min: 0, max: 100, default: 60 },
    categories: [{
      key: { type: String, required: true },
      label: { type: String, required: true },
      weight: { type: Number, min: 0, max: 100, required: true }
    }]
  },

  scheduledDate: { type: Date },
  startTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  endTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },

  assessmentId: { type: Schema.Types.ObjectId, ref: 'assessment', default: null },

  status: { type: String, enum: ['inactive', 'active', 'completed'], default: 'inactive' }
}, {
  timestamps: true
});

HRInterviewSchema.index({ assessmentId: 1, scheduledDate: -1 });

const HRInterviewModel = (mongoose.models.hrinterview as mongoose.Model<HRInterview>) ||
                         mongoose.model<HRInterview>('hrinterview', HRInterviewSchema);

export default HRInterviewModel;


